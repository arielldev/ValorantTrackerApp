use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use rand::RngCore;
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};
use crate::models::{Player, Settings, Store, Wallet};
use crate::resolve::{shop_date, OwnedSets};

const NONCE_LEN: usize = 12;
const MAGIC: &[u8; 4] = b"VSV1";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WishEntry {
    pub skin_uuid: String,
    pub added_at: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistorySkin {
    pub level_uuid: String,
    pub price_vp: u32,
    pub owned_at_fetch: bool,
    pub purchased: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryDayRaw {
    pub date: String,
    pub fetched_at: i64,
    pub skins: Vec<HistorySkin>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct VaultData {
    pub install_date: String,
    pub player: Option<Player>,
    pub wishlist: Vec<WishEntry>,
    pub history: Vec<HistoryDayRaw>,
    pub cached_store: Option<Store>,
    pub cached_wallet: Option<Wallet>,
    pub cached_owned: Option<OwnedSets>,
    pub cached_prices: HashMap<String, u32>,
    pub seen_bundles: Vec<String>,
    pub settings: Settings,
}

pub struct Vault {
    path: PathBuf,
    key: Option<[u8; 32]>,
    pub data: VaultData,
}

fn today() -> String {
    chrono::Utc::now().format("%Y-%m-%d").to_string()
}

impl Vault {
    pub fn new(path: PathBuf) -> Self {
        Self { path, key: None, data: VaultData::default() }
    }

    pub fn is_open(&self) -> bool {
        self.key.is_some()
    }

    pub fn open(&mut self, key: [u8; 32]) -> AppResult<()> {
        self.key = Some(key);
        match std::fs::read(&self.path) {
            Ok(bytes) => match decrypt(&key, &bytes).and_then(|pt| serde_json::from_slice::<VaultData>(&pt).map_err(|e| AppError::Storage(e.to_string()))) {
                Ok(data) => self.data = data,
                Err(e) => {
                    log::error!("vault unreadable, starting fresh: {e}");
                    self.data = VaultData { install_date: today(), ..Default::default() };
                    self.save()?;
                }
            },
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                self.data = VaultData { install_date: today(), ..Default::default() };
                self.save()?;
            }
            Err(e) => return Err(e.into()),
        }
        if self.data.install_date.is_empty() {
            self.data.install_date = today();
        }
        Ok(())
    }

    pub fn save(&self) -> AppResult<()> {
        let key = self.key.ok_or_else(|| AppError::Storage("vault not open".into()))?;
        let plaintext = serde_json::to_vec(&self.data).map_err(|e| AppError::Storage(e.to_string()))?;
        let bytes = encrypt(&key, &plaintext)?;
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let tmp = self.path.with_extension("tmp");
        std::fs::write(&tmp, bytes)?;
        std::fs::rename(&tmp, &self.path)?;
        Ok(())
    }

    pub fn wipe(&mut self) -> AppResult<()> {
        let _ = std::fs::remove_file(&self.path);
        let _ = std::fs::remove_file(self.path.with_extension("tmp"));
        self.data = VaultData { install_date: today(), ..Default::default() };
        if self.key.is_some() {
            self.save()?;
        }
        Ok(())
    }

    pub fn wishlist_set(&self) -> HashSet<String> {
        self.data.wishlist.iter().map(|w| w.skin_uuid.clone()).collect()
    }

    pub fn record_store(&mut self, store: &Store, owned: &OwnedSets) {
        if self.data.seen_bundles.is_empty() {
            self.data.seen_bundles = store.bundles.iter().map(|b| b.uuid.clone()).collect();
        }
        let date = shop_date(store.daily_expires_at).format("%Y-%m-%d").to_string();
        if !self.data.history.iter().any(|d| d.date == date) && !store.daily.is_empty() {
            self.data.history.push(HistoryDayRaw {
                date,
                fetched_at: store.fetched_at,
                skins: store
                    .daily
                    .iter()
                    .map(|o| HistorySkin { level_uuid: o.level_uuid.clone(), price_vp: o.price_vp, owned_at_fetch: o.owned, purchased: false })
                    .collect(),
            });
        }
        for day in &mut self.data.history {
            for s in &mut day.skins {
                if !s.owned_at_fetch && !s.purchased && owned.levels.contains(&s.level_uuid) {
                    s.purchased = true;
                }
            }
        }
    }

    pub fn sync_wishlist_flags(&mut self) {
        let wish = self.wishlist_set();
        if let Some(st) = &mut self.data.cached_store {
            for o in &mut st.daily {
                o.wishlisted = wish.contains(&o.skin_uuid);
            }
            if let Some(nm) = &mut st.night_market {
                for o in &mut nm.offers {
                    o.wishlisted = wish.contains(&o.skin_uuid);
                }
            }
        }
    }
}

fn encrypt(key: &[u8; 32], plaintext: &[u8]) -> AppResult<Vec<u8>> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let mut nonce = [0u8; NONCE_LEN];
    rand::rngs::OsRng.fill_bytes(&mut nonce);
    let ct = cipher.encrypt(Nonce::from_slice(&nonce), plaintext).map_err(|_| AppError::Storage("encrypt failed".into()))?;
    let mut out = Vec::with_capacity(MAGIC.len() + NONCE_LEN + ct.len());
    out.extend_from_slice(MAGIC);
    out.extend_from_slice(&nonce);
    out.extend_from_slice(&ct);
    Ok(out)
}

fn decrypt(key: &[u8; 32], bytes: &[u8]) -> AppResult<Vec<u8>> {
    if bytes.len() < MAGIC.len() + NONCE_LEN || &bytes[..MAGIC.len()] != MAGIC {
        return Err(AppError::Storage("bad vault header".into()));
    }
    let nonce = &bytes[MAGIC.len()..MAGIC.len() + NONCE_LEN];
    let ct = &bytes[MAGIC.len() + NONCE_LEN..];
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    cipher.decrypt(Nonce::from_slice(nonce), ct).map_err(|_| AppError::Storage("decrypt failed".into()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        let key = [7u8; 32];
        let ct = encrypt(&key, b"hello").unwrap();
        assert_eq!(decrypt(&key, &ct).unwrap(), b"hello");
        assert!(decrypt(&[8u8; 32], &ct).is_err());
    }
}
