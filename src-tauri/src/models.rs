use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Player {
    pub game_name: String,
    pub tag_line: String,

    pub region: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Tier {
    pub uuid: String,
    pub name: String,
    pub rank: u32,

    pub color: String,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ItemKind {
    Skin,
    Chroma,
    Buddy,
    Spray,
    Card,
    Title,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkinOffer {

    pub level_uuid: String,
    pub skin_uuid: String,

    pub name: String,

    pub weapon: String,

    pub line: String,
    pub image: Option<String>,
    pub video: Option<String>,
    pub tier: Option<Tier>,
    pub price_vp: u32,
    pub original_price_vp: Option<u32>,
    pub discount_percent: Option<u32>,
    pub owned: bool,
    pub wishlisted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleItem {
    pub uuid: String,
    pub kind: ItemKind,
    pub name: String,
    pub image: Option<String>,
    pub base_price_vp: u32,
    pub price_vp: u32,
    pub owned: bool,
    pub wishlisted: bool,
    pub skin_uuid: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bundle {
    pub uuid: String,
    pub name: String,
    pub image: Option<String>,
    pub price_vp: u32,
    pub full_price_vp: u32,
    pub items_total_vp: u32,
    pub owned_count: u32,
    pub items: Vec<BundleItem>,

    pub expires_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Accessory {
    pub uuid: String,
    pub kind: ItemKind,
    pub name: String,
    pub image: Option<String>,
    pub price_kc: u32,
    pub owned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NightMarket {
    pub offers: Vec<SkinOffer>,
    pub expires_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Store {
    pub fetched_at: i64,
    pub daily: Vec<SkinOffer>,
    pub daily_expires_at: i64,
    pub bundles: Vec<Bundle>,
    pub night_market: Option<NightMarket>,
    pub accessories: Vec<Accessory>,
    pub accessories_expire_at: i64,

    pub offline: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Wallet {
    pub vp: u32,
    pub rp: u32,
    pub kc: u32,
    pub fetched_at: i64,
    pub offline: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionItem {
    pub uuid: String,
    pub kind: ItemKind,
    pub name: String,
    pub image: Option<String>,
    pub swatch: Option<String>,
    pub video: Option<String>,
    pub owned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkinLine {
    pub skin_uuid: String,
    pub name: String,
    pub weapon: String,
    pub line: String,
    pub tier: Option<Tier>,
    pub image: Option<String>,
    pub owned: u32,
    pub total: u32,
    pub value_vp: u32,
    pub wishlisted: bool,
    pub source: String,
    pub contract: Option<String>,
    pub items: Vec<CollectionItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpendBundle {
    pub theme_uuid: String,
    pub name: String,
    pub image: Option<String>,
    pub owned_items: u32,
    pub total_items: u32,
    pub owned_skins: u32,
    pub total_skins: u32,
    pub as_bundle: bool,
    pub estimated_vp: u32,
    pub list_vp: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SpendEstimate {
    pub total_vp: u32,
    pub bundles_vp: u32,
    pub singles_vp: u32,
    pub battlepass_vp: u32,
    pub saved_vp: u32,
    pub bundles: Vec<SpendBundle>,
    pub singles: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub total_owned: u32,
    pub total_value_vp: u32,
    pub spend: SpendEstimate,
    pub store_skins: u32,
    pub battlepass_skins: u32,
    pub free_skins: u32,
    pub battlepasses: Vec<String>,
    pub lines: Vec<SkinLine>,
    pub fetched_at: i64,
    pub offline: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub level_uuid: String,
    pub skin_uuid: String,
    pub name: String,
    pub weapon: String,
    pub line: String,
    pub image: Option<String>,
    pub tier: Option<Tier>,
    pub price_vp: u32,
    pub owned_at_fetch: bool,
    pub purchased: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryDay {

    pub date: String,
    pub fetched_at: i64,
    pub skins: Vec<HistoryEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct History {
    pub install_date: String,
    pub days: Vec<HistoryDay>,
    pub vp_spent_month: u32,
    pub vp_spent_all: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum WishState {
    InShop,
    NightMarket { price_vp: u32, discount_percent: u32 },
    InBundle { bundle: String },
    LastSeen { days: i64 },
    NeverSeen,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WishlistItem {
    pub skin_uuid: String,
    pub level_uuid: String,
    pub name: String,
    pub weapon: String,
    pub line: String,
    pub image: Option<String>,
    pub tier: Option<Tier>,
    pub price_vp: Option<u32>,
    pub state: WishState,
    pub owned: bool,
    pub added_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Wishlist {
    pub items: Vec<WishlistItem>,
    pub total_vp: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    pub currency: String,
    pub notify_daily: bool,
    pub notify_hour: u8,
    pub notify_minute: u8,
    pub notify_wishlist: bool,
    pub notify_bundles: bool,
    pub storefront_v3: bool,
    pub sounds: bool,
    pub haptics: bool,
    pub autostart: bool,
    pub close_to_tray: bool,
}

impl Default for Settings {
    fn default() -> Self {
        let rotation = chrono::Utc::now().date_naive().and_hms_opt(0, 0, 0).map(|t| t.and_utc().with_timezone(&chrono::Local).time());
        let (h, m) = rotation.map(|t| (chrono::Timelike::hour(&t) as u8, chrono::Timelike::minute(&t) as u8)).unwrap_or((0, 0));
        Self {
            currency: "EUR".into(),
            notify_daily: false,
            notify_hour: h,
            notify_minute: m,
            notify_wishlist: true,
            notify_bundles: true,
            storefront_v3: false,
            sounds: true,
            haptics: true,
            autostart: false,
            close_to_tray: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub player: Option<Player>,
    pub signed_in: bool,
    pub offline: bool,
    pub install_date: String,
    pub app_version: String,
    pub disabled_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkinDetail {
    pub skin_uuid: String,
    pub name: String,
    pub weapon: String,
    pub line: String,
    pub tier: Option<Tier>,
    pub image: Option<String>,
    pub video: Option<String>,
    pub price_vp: Option<u32>,
    pub owned: bool,
    pub wishlisted: bool,
    pub levels: Vec<CollectionItem>,
    pub chromas: Vec<CollectionItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Weapon {
    pub uuid: String,
    pub name: String,
    pub category: String,
    pub image: Option<String>,
    pub owned_skins: u32,
    pub total_skins: u32,
    pub wishlisted_skins: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeaponSkins {
    pub weapon: Weapon,
    pub lines: Vec<SkinLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogStatus {
    pub state: String,
    pub progress: u32,
    pub total: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Check {
    pub name: String,
    pub ok: bool,
    pub detail: String,
    pub ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostics {
    pub data_dir: String,
    pub vault_open: bool,
    pub signed_in: bool,
    pub shard: Option<String>,
    pub catalog: CatalogStatus,
    pub cached_store: bool,
    pub checks: Vec<Check>,
}
