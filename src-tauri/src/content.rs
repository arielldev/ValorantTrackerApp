use std::collections::HashMap;
use std::path::PathBuf;

use serde::Deserialize;

use crate::error::{AppError, AppResult};
use crate::models::{ItemKind, Tier};
use crate::riot::item_type;

const BASE: &str = "https://valorant-api.com/v1";
const TTL_SECS: i64 = 12 * 3600;

pub static CATALOG_PROGRESS: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
pub static CATALOG_FETCHING: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
pub const CATALOG_FILES: usize = 10;

const FILES: [&str; 10] = ["version", "weapons", "contenttiers", "bundles", "buddies", "sprays", "playercards", "playertitles", "contracts", "themes"];

#[derive(Clone, Debug)]
pub struct Level {
    pub uuid: String,
    pub name: String,
    pub image: Option<String>,
    pub video: Option<String>,
}

#[derive(Clone, Debug)]
pub struct Chroma {
    pub uuid: String,
    pub name: String,
    pub image: Option<String>,
    pub full_render: Option<String>,
    pub swatch: Option<String>,
    pub video: Option<String>,
}

#[derive(Clone, Debug)]
pub struct Skin {
    pub uuid: String,
    pub name: String,
    pub weapon: String,
    pub weapon_uuid: String,
    pub theme_uuid: Option<String>,
    pub line: String,
    pub tier_uuid: Option<String>,
    pub display_icon: Option<String>,
    pub levels: Vec<Level>,
    pub chromas: Vec<Chroma>,
}

impl Skin {
    pub fn base_level(&self) -> Option<&Level> {
        self.levels.first()
    }
    pub fn image(&self) -> Option<String> {
        self.chromas
            .first()
            .and_then(|c| c.full_render.clone())
            .or_else(|| self.levels.first().and_then(|l| l.image.clone()))
            .or_else(|| self.display_icon.clone())
            .or_else(|| self.chromas.iter().find_map(|c| c.full_render.clone()))
            .or_else(|| self.levels.iter().find_map(|l| l.image.clone()))
            .or_else(|| self.chromas.iter().find_map(|c| c.image.clone()))
    }
    pub fn video(&self) -> Option<String> {
        self.levels
            .first()
            .and_then(|l| l.video.clone())
            .or_else(|| self.chromas.first().and_then(|c| c.video.clone()))
            .or_else(|| self.levels.iter().find_map(|l| l.video.clone()))
            .or_else(|| self.chromas.iter().find_map(|c| c.video.clone()))
    }
}

#[derive(Clone, Debug)]
pub struct WeaponInfo {
    pub uuid: String,
    pub name: String,
    pub category: String,
    pub image: Option<String>,
    pub order: usize,
}

#[derive(Clone, Debug)]
pub struct ContractReward {
    pub contract: String,
    pub free: bool,
}

#[derive(Clone, Debug)]
pub struct Simple {
    pub uuid: String,
    pub name: String,
    pub image: Option<String>,
    pub theme_uuid: Option<String>,
}

pub struct Loaded {
    pub client_version: String,
    pub fetched_at: i64,
    pub skins: HashMap<String, Skin>,
    pub weapons: Vec<WeaponInfo>,
    pub level_to_skin: HashMap<String, String>,
    pub chroma_to_skin: HashMap<String, String>,
    pub tiers: HashMap<String, Tier>,
    pub bundles: HashMap<String, Simple>,
    pub buddies: HashMap<String, Simple>,
    pub sprays: HashMap<String, Simple>,
    pub cards: HashMap<String, Simple>,
    pub titles: HashMap<String, Simple>,
    pub contract_rewards: HashMap<String, ContractReward>,
    pub themes: HashMap<String, String>,
}

impl Loaded {
    pub fn tier(&self, uuid: Option<&str>) -> Option<Tier> {
        uuid.and_then(|u| self.tiers.get(u)).cloned()
    }

    pub fn skin_by_level(&self, level_uuid: &str) -> Option<&Skin> {
        self.level_to_skin.get(level_uuid).and_then(|s| self.skins.get(s))
    }

    pub fn skin_by_chroma(&self, chroma_uuid: &str) -> Option<&Skin> {
        self.chroma_to_skin.get(chroma_uuid).and_then(|s| self.skins.get(s))
    }

    pub fn weapon(&self, uuid: &str) -> Option<&WeaponInfo> {
        self.weapons.iter().find(|w| w.uuid == uuid)
    }

    pub fn lookup(&self, item_type_id: &str, item_id: &str) -> Option<(ItemKind, String, Option<String>)> {
        match item_type_id {
            item_type::SKIN_LEVEL => {
                let skin = self.skin_by_level(item_id)?;
                let level = skin.levels.iter().find(|l| l.uuid == item_id)?;
                let name = if level.name.is_empty() { skin.name.clone() } else { level.name.clone() };
                Some((ItemKind::Skin, name, level.image.clone().or_else(|| skin.image())))
            }
            item_type::SKIN_CHROMA => {
                let skin = self.skin_by_chroma(item_id)?;
                let chroma = skin.chromas.iter().find(|c| c.uuid == item_id)?;
                Some((ItemKind::Chroma, chroma.name.clone(), chroma.full_render.clone().or_else(|| chroma.image.clone())))
            }
            item_type::BUDDY => self.buddies.get(item_id).map(|s| (ItemKind::Buddy, s.name.clone(), s.image.clone())),
            item_type::SPRAY => self.sprays.get(item_id).map(|s| (ItemKind::Spray, s.name.clone(), s.image.clone())),
            item_type::CARD => self.cards.get(item_id).map(|s| (ItemKind::Card, s.name.clone(), s.image.clone())),
            item_type::TITLE => self.titles.get(item_id).map(|s| (ItemKind::Title, s.name.clone(), s.image.clone())),
            _ => None,
        }
    }
}

pub struct Catalog {
    dir: PathBuf,
    loaded: Option<Loaded>,
}

impl Catalog {
    pub fn new(dir: PathBuf) -> Self {
        Self { dir, loaded: None }
    }

    pub fn get(&self) -> AppResult<&Loaded> {
        self.loaded.as_ref().ok_or_else(|| AppError::Content("not loaded".into()))
    }

    pub fn is_loaded(&self) -> bool {
        self.loaded.is_some()
    }

    fn is_fresh(&self, now: i64) -> bool {
        self.loaded.as_ref().map(|l| now - l.fetched_at < TTL_SECS).unwrap_or(false)
    }

    pub fn load_cached(&mut self) -> bool {
        if self.loaded.is_none() {
            if let Ok(l) = self.load_from_disk() {
                self.loaded = Some(l);
            }
        }
        self.loaded.is_some()
    }

    pub fn needs_refresh(&self) -> bool {
        !self.is_fresh(chrono::Utc::now().timestamp())
    }

    pub fn dir(&self) -> PathBuf {
        self.dir.clone()
    }

    pub fn set_loaded(&mut self, loaded: Loaded) {
        self.loaded = Some(loaded);
    }

    pub async fn fetch_standalone(dir: PathBuf) -> AppResult<Loaded> {
        let cat = Catalog::new(dir);
        cat.fetch(&reqwest::Client::new(), chrono::Utc::now().timestamp()).await
    }

    pub async fn ensure(&mut self, http: &reqwest::Client) -> AppResult<()> {
        let now = chrono::Utc::now().timestamp();
        if self.load_cached() && self.is_fresh(now) {
            return Ok(());
        }
        match self.fetch(http, now).await {
            Ok(l) => {
                self.loaded = Some(l);
                Ok(())
            }
            Err(e) if self.loaded.is_some() => {
                log::warn!("catalog refresh failed, using stale copy: {e}");
                Ok(())
            }
            Err(e) => Err(e),
        }
    }

    async fn fetch(&self, _http: &reqwest::Client, now: i64) -> AppResult<Loaded> {
        CATALOG_FETCHING.store(true, std::sync::atomic::Ordering::Relaxed);
        CATALOG_PROGRESS.store(0, std::sync::atomic::Ordering::Relaxed);
        let result = self.fetch_inner(now).await;
        CATALOG_FETCHING.store(false, std::sync::atomic::Ordering::Relaxed);
        result
    }

    async fn fetch_inner(&self, now: i64) -> AppResult<Loaded> {
        let http = reqwest::Client::builder()
            .user_agent(crate::riot::USER_AGENT)
            .connect_timeout(std::time::Duration::from_secs(20))
            .build()?;
        let mut raws = HashMap::new();
        for name in FILES {
            let url = format!("{BASE}/{name}");
            let text = tokio::time::timeout(std::time::Duration::from_secs(240), async {
                http.get(&url)
                    .send()
                    .await?
                    .error_for_status()
                    .map_err(|e| AppError::Content(format!("{name}: {e}")))?
                    .text()
                    .await
                    .map_err(AppError::from)
            })
            .await
            .map_err(|_| AppError::Content(format!("{name}: download timed out")))??;
            log::info!("catalog: {name} {} KB", text.len() / 1024);
            CATALOG_PROGRESS.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            raws.insert(name, text);
        }
        let loaded = build(&raws, now)?;
        std::fs::create_dir_all(&self.dir)?;
        for (name, text) in &raws {
            std::fs::write(self.dir.join(format!("{name}.json")), text)?;
        }
        std::fs::write(self.dir.join("meta.json"), serde_json::json!({ "fetchedAt": now }).to_string())?;
        Ok(loaded)
    }

    fn load_from_disk(&self) -> AppResult<Loaded> {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Meta {
            fetched_at: i64,
        }
        let meta: Meta = serde_json::from_str(&std::fs::read_to_string(self.dir.join("meta.json"))?)?;
        let mut raws = HashMap::new();
        for name in FILES {
            raws.insert(name, std::fs::read_to_string(self.dir.join(format!("{name}.json")))?);
        }
        build(&raws, meta.fetched_at)
    }

    pub fn wipe(&self) {
        let _ = std::fs::remove_dir_all(&self.dir);
    }
}

#[derive(Deserialize)]
struct Envelope<T> {
    data: T,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct VersionRaw {
    riot_client_version: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WeaponRaw {
    uuid: String,
    #[serde(default)]
    display_name: Option<String>,
    #[serde(default)]
    category: Option<String>,
    #[serde(default)]
    display_icon: Option<String>,
    #[serde(default)]
    kill_stream_icon: Option<String>,
    #[serde(default)]
    skins: Vec<SkinRaw>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SkinRaw {
    uuid: String,
    #[serde(default)]
    display_name: Option<String>,
    #[serde(default)]
    theme_uuid: Option<String>,
    #[serde(default)]
    content_tier_uuid: Option<String>,
    #[serde(default)]
    display_icon: Option<String>,
    #[serde(default)]
    chromas: Vec<ChromaRaw>,
    #[serde(default)]
    levels: Vec<LevelRaw>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChromaRaw {
    uuid: String,
    #[serde(default)]
    display_name: Option<String>,
    #[serde(default)]
    display_icon: Option<String>,
    #[serde(default)]
    full_render: Option<String>,
    #[serde(default)]
    swatch: Option<String>,
    #[serde(default)]
    streamed_video: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LevelRaw {
    uuid: String,
    #[serde(default)]
    display_name: Option<String>,
    #[serde(default)]
    display_icon: Option<String>,
    #[serde(default)]
    streamed_video: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TierRaw {
    uuid: String,
    #[serde(default)]
    display_name: Option<String>,
    #[serde(default)]
    rank: u32,
    #[serde(default)]
    highlight_color: Option<String>,
    #[serde(default)]
    display_icon: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SimpleRaw {
    uuid: String,
    #[serde(default)]
    display_name: Option<String>,
    #[serde(default)]
    theme_uuid: Option<String>,
    #[serde(default)]
    display_icon: Option<String>,
    #[serde(default)]
    full_transparent_icon: Option<String>,
    #[serde(default)]
    large_art: Option<String>,
    #[serde(default)]
    levels: Vec<BuddyLevelRaw>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContractRaw {
    #[serde(default)]
    display_name: Option<String>,
    #[serde(default)]
    content: Option<ContractContentRaw>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContractContentRaw {
    #[serde(default)]
    chapters: Vec<ChapterRaw>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChapterRaw {
    #[serde(default)]
    levels: Vec<ChapterLevelRaw>,
    #[serde(default)]
    free_rewards: Option<Vec<RewardRaw>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChapterLevelRaw {
    #[serde(default)]
    reward: Option<RewardRaw>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RewardRaw {
    #[serde(default)]
    uuid: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BuddyLevelRaw {
    uuid: String,
    #[serde(default)]
    display_icon: Option<String>,
}

fn parse<T: serde::de::DeserializeOwned>(raws: &HashMap<&str, String>, name: &str) -> AppResult<T> {
    let text = raws.get(name).ok_or_else(|| AppError::Content(format!("missing {name}")))?;
    let env: Envelope<T> = serde_json::from_str(text).map_err(|e| AppError::Content(format!("{name}: {e}")))?;
    Ok(env.data)
}

fn hex_color(raw: Option<&str>) -> String {
    match raw {
        Some(h) if h.len() >= 6 => format!("#{}", h[..6].to_uppercase()),
        _ => "#8E897E".into(),
    }
}

fn split_line(name: &str, weapon: &str) -> String {
    let lower = name.to_lowercase();
    let w = weapon.to_lowercase();
    if lower.ends_with(&w) && name.len() > weapon.len() {
        name[..name.len() - weapon.len()].trim().to_string()
    } else {
        name.to_string()
    }
}

fn category_order(category: &str) -> usize {
    match category.rsplit("::").next().unwrap_or(category) {
        "Sidearm" => 0,
        "SMG" => 1,
        "Shotgun" => 2,
        "Rifle" => 3,
        "Sniper" => 4,
        "Heavy" => 5,
        "Melee" => 6,
        _ => 7,
    }
}

fn build(raws: &HashMap<&str, String>, fetched_at: i64) -> AppResult<Loaded> {
    let version: VersionRaw = parse(raws, "version")?;
    let weapons_raw: Vec<WeaponRaw> = parse(raws, "weapons")?;
    let tiers_raw: Vec<TierRaw> = parse(raws, "contenttiers")?;
    let bundles_raw: Vec<SimpleRaw> = parse(raws, "bundles")?;
    let buddies_raw: Vec<SimpleRaw> = parse(raws, "buddies")?;
    let sprays_raw: Vec<SimpleRaw> = parse(raws, "sprays")?;
    let cards_raw: Vec<SimpleRaw> = parse(raws, "playercards")?;
    let titles_raw: Vec<SimpleRaw> = parse(raws, "playertitles")?;
    let contracts_raw: Vec<ContractRaw> = parse(raws, "contracts").unwrap_or_default();
    let themes_raw: Vec<SimpleRaw> = parse(raws, "themes").unwrap_or_default();
    let themes: HashMap<String, String> = themes_raw.into_iter().map(|t| (t.uuid, t.display_name.unwrap_or_default())).collect();
    let mut contract_rewards = HashMap::new();
    for c in contracts_raw {
        let name = c.display_name.unwrap_or_default();
        if let Some(content) = c.content {
            for ch in content.chapters {
                for l in ch.levels {
                    if let Some(r) = l.reward {
                        contract_rewards.insert(r.uuid, ContractReward { contract: name.clone(), free: false });
                    }
                }
                for r in ch.free_rewards.unwrap_or_default() {
                    contract_rewards.insert(r.uuid, ContractReward { contract: name.clone(), free: true });
                }
            }
        }
    }

    let mut skins = HashMap::new();
    let mut weapons = Vec::new();
    let mut level_to_skin = HashMap::new();
    let mut chroma_to_skin = HashMap::new();

    for w in weapons_raw {
        let weapon = w.display_name.unwrap_or_default();
        let category = w.category.unwrap_or_default().rsplit("::").next().unwrap_or_default().to_string();
        weapons.push(WeaponInfo {
            uuid: w.uuid.clone(),
            name: weapon.clone(),
            order: category_order(&category),
            category,
            image: w.kill_stream_icon.or(w.display_icon),
        });
        for s in w.skins {
            let name = s.display_name.unwrap_or_default();
            let levels: Vec<Level> = s
                .levels
                .into_iter()
                .map(|l| {
                    level_to_skin.insert(l.uuid.clone(), s.uuid.clone());
                    Level { uuid: l.uuid, name: l.display_name.unwrap_or_default(), image: l.display_icon, video: l.streamed_video }
                })
                .collect();
            let chromas: Vec<Chroma> = s
                .chromas
                .into_iter()
                .map(|c| {
                    chroma_to_skin.insert(c.uuid.clone(), s.uuid.clone());
                    Chroma {
                        uuid: c.uuid,
                        name: c.display_name.unwrap_or_default(),
                        image: c.display_icon,
                        full_render: c.full_render,
                        swatch: c.swatch,
                        video: c.streamed_video,
                    }
                })
                .collect();
            skins.insert(
                s.uuid.clone(),
                Skin {
                    uuid: s.uuid,
                    line: split_line(&name, &weapon),
                    name,
                    weapon: weapon.clone(),
                    weapon_uuid: w.uuid.clone(),
                    theme_uuid: s.theme_uuid,
                    tier_uuid: s.content_tier_uuid,
                    display_icon: s.display_icon,
                    levels,
                    chromas,
                },
            );
        }
    }
    weapons.sort_by(|a, b| a.order.cmp(&b.order).then(a.name.cmp(&b.name)));

    let tiers = tiers_raw
        .into_iter()
        .map(|t| {
            (
                t.uuid.clone(),
                Tier {
                    uuid: t.uuid,
                    name: t.display_name.unwrap_or_default(),
                    rank: t.rank,
                    color: hex_color(t.highlight_color.as_deref()),
                    icon: t.display_icon,
                },
            )
        })
        .collect();

    let simple = |v: Vec<SimpleRaw>| -> HashMap<String, Simple> {
        v.into_iter()
            .map(|s| {
                (
                    s.uuid.clone(),
                    Simple {
                        uuid: s.uuid,
                        name: s.display_name.unwrap_or_default(),
                        image: s.display_icon.or(s.full_transparent_icon).or(s.large_art),
                        theme_uuid: s.theme_uuid,
                    },
                )
            })
            .collect()
    };

    let mut buddies = HashMap::new();
    for b in buddies_raw {
        let name = b.display_name.clone().unwrap_or_default();
        for l in b.levels {
            buddies.insert(
                l.uuid.clone(),
                Simple { uuid: l.uuid, name: name.clone(), image: l.display_icon.or_else(|| b.display_icon.clone()), theme_uuid: b.theme_uuid.clone() },
            );
        }
    }

    Ok(Loaded {
        client_version: version.riot_client_version,
        fetched_at,
        skins,
        weapons,
        level_to_skin,
        chroma_to_skin,
        tiers,
        bundles: simple(bundles_raw),
        buddies,
        sprays: simple(sprays_raw),
        cards: simple(cards_raw),
        titles: simple(titles_raw),
        contract_rewards,
        themes,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn line_strips_weapon() {
        assert_eq!(split_line("Prime Vandal", "Vandal"), "Prime");
        assert_eq!(split_line("Prime Karambit", "Melee"), "Prime Karambit");
        assert_eq!(split_line("Vandal", "Vandal"), "Vandal");
    }

    #[test]
    fn color_from_rgba() {
        assert_eq!(hex_color(Some("5a9fe2ff")), "#5A9FE2");
        assert_eq!(hex_color(None), "#8E897E");
    }

    #[test]
    fn categories_sort_by_role() {
        assert!(category_order("EEquippableCategory::Sidearm") < category_order("EEquippableCategory::Rifle"));
        assert_eq!(category_order("Melee"), 6);
    }
}
