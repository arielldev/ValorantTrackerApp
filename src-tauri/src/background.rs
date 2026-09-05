use std::path::Path;

use serde::Serialize;

use crate::auth;
use crate::content::Catalog;
use crate::error::AppResult;
use crate::models::{Settings, SkinOffer, Store};
use crate::resolve::{self, OwnedSets};
use crate::riot::{item_type, RiotClient, RiotHeaders, USER_AGENT};
use crate::vault::Vault;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    Daily,
    Rotation,
}

impl Mode {
    #[cfg_attr(not(target_os = "android"), allow(dead_code))]
    pub fn parse(s: &str) -> Mode {
        if s == "rotation" {
            Mode::Rotation
        } else {
            Mode::Daily
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Notice {
    pub kind: String,
    pub title: String,
    pub body: String,
    pub lines: Vec<String>,
    pub image: Option<String>,
}

#[cfg_attr(not(target_os = "android"), allow(dead_code))]
pub struct Outcome {
    pub store: Store,
    pub cookies: String,
    pub notices: Vec<Notice>,
}

pub async fn fetch_owned(client: &RiotClient<'_>, puuid: &str) -> AppResult<OwnedSets> {
    let (levels, chromas, buddies, sprays, cards, titles) = tokio::try_join!(
        client.entitlements(puuid, item_type::SKIN_LEVEL),
        client.entitlements(puuid, item_type::SKIN_CHROMA),
        client.entitlements(puuid, item_type::BUDDY),
        client.entitlements(puuid, item_type::SPRAY),
        client.entitlements(puuid, item_type::CARD),
        client.entitlements(puuid, item_type::TITLE),
    )?;
    Ok(OwnedSets {
        levels: levels.into_iter().collect(),
        chromas: chromas.into_iter().collect(),
        buddies: buddies.into_iter().collect(),
        sprays: sprays.into_iter().collect(),
        cards: cards.into_iter().collect(),
        titles: titles.into_iter().collect(),
        fetched_at: chrono::Utc::now().timestamp(),
    })
}

#[cfg_attr(not(target_os = "android"), allow(dead_code))]
pub async fn run(data_dir: &Path, cookies: &str, key: [u8; 32], mode: Mode) -> AppResult<Outcome> {
    let http = reqwest::Client::builder().user_agent(USER_AGENT).timeout(std::time::Duration::from_secs(60)).build()?;

    let (tokens, jar) = auth::reauth_with_cookies(cookies).await?;
    let session = auth::complete(&http, tokens).await?;

    let mut catalog = Catalog::new(data_dir.join("catalog"));
    catalog.ensure(&http).await?;
    let cat = catalog.get()?;

    let mut vault = Vault::new(data_dir.join("vault.bin"));
    vault.open(key)?;

    let headers = RiotHeaders {
        access_token: session.access_token.clone(),
        entitlements: session.entitlements.clone(),
        client_version: cat.client_version.clone(),
    };
    let client = RiotClient::new(&http, headers, &session.shard);
    let sf = client.storefront(&session.puuid, vault.data.settings.storefront_v3).await?;
    let owned = fetch_owned(&client, &session.puuid).await?;
    if vault.data.cached_prices.is_empty() {
        if let Ok(offers) = client.offers().await {
            vault.data.cached_prices = offers.price_map();
        }
    }

    let store = resolve::store(&sf, cat, &owned, &vault.wishlist_set(), chrono::Utc::now().timestamp());
    vault.record_store(&store, &owned);
    vault.data.cached_store = Some(store.clone());
    vault.data.cached_owned = Some(owned);
    vault.data.player = Some(session.player.clone());
    let notices = notices(&store, &vault.data.settings, &mut vault.data.seen_bundles, mode);
    vault.save()?;

    Ok(Outcome { store, cookies: jar, notices })
}

fn vp(n: u32) -> String {
    let s = n.to_string();
    let mut out = String::new();
    for (i, c) in s.chars().enumerate() {
        if i > 0 && (s.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(c);
    }
    out
}

fn rank(o: &SkinOffer) -> u32 {
    o.tier.as_ref().map(|t| t.rank).unwrap_or(0)
}

fn line(o: &SkinOffer) -> String {
    let tier = o.tier.as_ref().map(|t| t.name.as_str()).unwrap_or("—");
    let star = if o.wishlisted && !o.owned { "★ " } else { "" };
    format!("{star}{tier} · {} · {} VP", o.name, vp(o.price_vp))
}

pub fn notices(store: &Store, settings: &Settings, seen_bundles: &mut Vec<String>, mode: Mode) -> Vec<Notice> {
    let mut out = Vec::new();

    let mut daily: Vec<&SkinOffer> = store.daily.iter().collect();
    daily.sort_by(|a, b| rank(b).cmp(&rank(a)).then(b.price_vp.cmp(&a.price_vp)));
    let hits: Vec<&SkinOffer> = daily
        .iter()
        .copied()
        .chain(store.night_market.iter().flat_map(|n| n.offers.iter()))
        .filter(|o| o.wishlisted && !o.owned)
        .collect();

    let wants_hits = match mode {
        Mode::Daily => settings.notify_daily || settings.notify_wishlist,
        Mode::Rotation => settings.notify_wishlist,
    };
    if wants_hits {
        for o in hits.iter().take(3) {
            let in_night = store.night_market.as_ref().map(|n| n.offers.iter().any(|x| x.skin_uuid == o.skin_uuid)).unwrap_or(false);
            let tier = o.tier.as_ref().map(|t| t.name.as_str()).unwrap_or("—");
            out.push(Notice {
                kind: "wishlist".into(),
                title: format!("★ {} in your {}", o.name, if in_night { "Night Market" } else { "shop" }),
                body: match o.original_price_vp {
                    Some(orig) if orig > o.price_vp => format!("{tier} · {} VP (was {}) · −{}%", vp(o.price_vp), vp(orig), o.discount_percent.unwrap_or(0)),
                    _ => format!("{tier} · {} VP · gone at the next rotation", vp(o.price_vp)),
                },
                lines: Vec::new(),
                image: o.image.clone(),
            });
        }
    }

    if mode == Mode::Daily && settings.notify_daily && !daily.is_empty() {
        let title = match hits.len() {
            0 => "Today's shop".to_string(),
            1 => format!("★ {} is in today's shop", hits[0].name),
            n => format!("★ {n} wishlist skins in today's shop"),
        };
        out.push(Notice {
            kind: "daily".into(),
            title,
            body: daily.iter().map(|o| o.name.clone()).collect::<Vec<_>>().join(" · "),
            lines: daily.iter().map(|o| line(o)).collect(),
            image: None,
        });
    }

    let first_run = seen_bundles.is_empty();
    if settings.notify_bundles && !first_run {
        for b in &store.bundles {
            if seen_bundles.contains(&b.uuid) {
                continue;
            }
            let starred: Vec<&str> = b
                .items
                .iter()
                .filter(|i| i.wishlisted && !i.owned)
                .map(|i| i.name.as_str())
                .collect();
            let mut body = format!("{} VP · {} items", vp(b.price_vp), b.items.len());
            if b.items_total_vp > b.price_vp {
                body.push_str(&format!(" · worth {} VP", vp(b.items_total_vp)));
            }
            if !starred.is_empty() {
                body.push_str(&format!(" · ★ includes {}", starred.join(", ")));
            }
            out.push(Notice { kind: "bundle".into(), title: format!("New bundle: {}", b.name), body, lines: Vec::new(), image: b.image.clone() });
        }
    }
    *seen_bundles = store.bundles.iter().map(|b| b.uuid.clone()).collect();

    out
}
