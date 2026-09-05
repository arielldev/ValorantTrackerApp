use std::collections::HashMap;

use serde::{de::DeserializeOwned, Deserialize, Serialize};

use crate::error::{AppError, AppResult};

pub const USER_AGENT: &str = "ValoStore/0.1 (view-only store viewer)";

pub const CLIENT_PLATFORM: &str = "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9";

pub const VP_ID: &str = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";
pub const RP_ID: &str = "e59aa87c-4cbf-517a-5983-6e81511be9b7";
pub const KC_ID: &str = "85ca954a-41f2-ce94-9b45-8ca3dd39a00d";

pub mod item_type {
    pub const SKIN_LEVEL: &str = "e7c63390-eda7-46e0-bb7a-a6abdacd2433";
    pub const SKIN_CHROMA: &str = "3ad1b2b2-acdb-4524-852f-954a76ddae0a";
    pub const BUDDY: &str = "dd3bf334-87f3-40bd-b043-682a57a8dc3a";
    pub const SPRAY: &str = "d5f120f8-ff8c-4aac-92ea-f2b5acbe9475";
    pub const CARD: &str = "3f296c07-64c3-494c-923b-fe692a4fa1bd";
    pub const TITLE: &str = "de7caa6b-adf7-4588-bbd1-143831e786c6";
}

#[derive(Clone)]
pub struct RiotHeaders {
    pub access_token: String,
    pub entitlements: String,
    pub client_version: String,
}

pub struct RiotClient<'a> {
    http: &'a reqwest::Client,
    headers: RiotHeaders,
    shard: String,
}

impl<'a> RiotClient<'a> {
    pub fn new(http: &'a reqwest::Client, headers: RiotHeaders, shard: &str) -> Self {
        Self { http, headers, shard: shard.to_string() }
    }

    fn pd(&self, path: &str) -> String {
        format!("https://pd.{}.a.pvp.net/{}", self.shard, path)
    }

    fn signed(&self, rb: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        rb.bearer_auth(&self.headers.access_token)
            .header("X-Riot-Entitlements-JWT", &self.headers.entitlements)
            .header("X-Riot-ClientVersion", &self.headers.client_version)
            .header("X-Riot-ClientPlatform", CLIENT_PLATFORM)
    }

    async fn send<T: DeserializeOwned>(&self, rb: reqwest::RequestBuilder) -> AppResult<T> {
        let res = self.signed(rb).send().await?;
        let status = res.status();
        if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
            return Err(AppError::SessionExpired);
        }
        if !status.is_success() {
            return Err(AppError::Riot(format!("HTTP {}", status.as_u16())));
        }
        let text = res.text().await?;
        serde_json::from_str(&text).map_err(|e| AppError::Riot(format!("parse: {e}")))
    }

    async fn storefront_v3(&self, puuid: &str) -> AppResult<Storefront> {
        self.send(self.http.post(self.pd(&format!("store/v3/storefront/{puuid}"))).json(&serde_json::json!({}))).await
    }

    async fn storefront_v2(&self, puuid: &str) -> AppResult<Storefront> {
        self.send(self.http.get(self.pd(&format!("store/v2/storefront/{puuid}")))).await
    }

    pub async fn storefront(&self, puuid: &str, prefer_v2: bool) -> AppResult<Storefront> {
        let first = if prefer_v2 { self.storefront_v2(puuid).await } else { self.storefront_v3(puuid).await };
        match first {
            Ok(sf) => Ok(sf),
            Err(AppError::Riot(msg)) if msg.starts_with("HTTP 4") => {
                log::warn!("storefront {} failed ({msg}); trying the other version", if prefer_v2 { "v2" } else { "v3" });
                if prefer_v2 { self.storefront_v3(puuid).await } else { self.storefront_v2(puuid).await }
            }
            Err(e) => Err(e),
        }
    }

    pub async fn wallet(&self, puuid: &str) -> AppResult<WalletRaw> {
        self.send(self.http.get(self.pd(&format!("store/v1/wallet/{puuid}")))).await
    }

    pub async fn entitlements(&self, puuid: &str, item_type_id: &str) -> AppResult<Vec<String>> {
        let raw: EntitlementsRaw =
            self.send(self.http.get(self.pd(&format!("store/v1/entitlements/{puuid}/{item_type_id}")))).await?;
        Ok(raw.entitlements.into_iter().map(|e| e.item_id).collect())
    }

    pub async fn offers(&self) -> AppResult<OffersRaw> {
        self.send(self.http.get(self.pd("store/v1/offers/"))).await
    }
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct Storefront {
    #[serde(default)]
    pub featured_bundle: Option<FeaturedBundle>,
    #[serde(default)]
    pub skins_panel_layout: Option<SkinsPanel>,
    #[serde(default)]
    pub bonus_store: Option<BonusStore>,
    #[serde(default)]
    pub accessory_store: Option<AccessoryStore>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct FeaturedBundle {
    #[serde(default)]
    pub bundle: Option<BundleRaw>,
    #[serde(default)]
    pub bundles: Vec<BundleRaw>,
    #[serde(default)]
    pub bundle_remaining_duration_in_seconds: i64,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct BundleRaw {
    #[serde(rename = "ID", default)]
    pub id: String,
    #[serde(rename = "DataAssetID", default)]
    pub data_asset_id: String,
    #[serde(default)]
    pub items: Vec<BundleItemRaw>,
    #[serde(default)]
    pub duration_remaining_in_seconds: i64,
    #[serde(default)]
    pub total_base_cost: Option<HashMap<String, u32>>,
    #[serde(default)]
    pub total_discounted_cost: Option<HashMap<String, u32>>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct BundleItemRaw {
    #[serde(default)]
    pub item: ItemRef,
    #[serde(default)]
    pub base_price: u32,
    #[serde(default)]
    pub discounted_price: u32,
    #[serde(default)]
    pub discount_percent: f64,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct ItemRef {
    #[serde(rename = "ItemTypeID", default)]
    pub item_type_id: String,
    #[serde(rename = "ItemID", default)]
    pub item_id: String,
    #[serde(rename = "Amount", default)]
    pub amount: u32,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct SkinsPanel {
    #[serde(default)]
    pub single_item_offers: Vec<String>,
    #[serde(default)]
    pub single_item_store_offers: Vec<Offer>,
    #[serde(default)]
    pub single_item_offers_remaining_duration_in_seconds: i64,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct Offer {
    #[serde(rename = "OfferID", default)]
    pub offer_id: String,
    #[serde(default)]
    pub cost: HashMap<String, u32>,
    #[serde(default)]
    pub rewards: Vec<Reward>,
}

impl Offer {
    pub fn vp(&self) -> u32 {
        self.cost.get(VP_ID).copied().unwrap_or(0)
    }
    pub fn kc(&self) -> u32 {
        self.cost.get(KC_ID).copied().unwrap_or(0)
    }
    pub fn first_reward(&self) -> Option<&Reward> {
        self.rewards.first()
    }
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct Reward {
    #[serde(rename = "ItemTypeID", default)]
    pub item_type_id: String,
    #[serde(rename = "ItemID", default)]
    pub item_id: String,
    #[serde(rename = "Quantity", default)]
    pub quantity: u32,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct BonusStore {
    #[serde(default)]
    pub bonus_store_offers: Vec<BonusOffer>,
    #[serde(default)]
    pub bonus_store_remaining_duration_in_seconds: i64,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct BonusOffer {
    #[serde(rename = "BonusOfferID", default)]
    pub id: String,
    #[serde(default)]
    pub offer: Offer,
    #[serde(default)]
    pub discount_percent: u32,
    #[serde(default)]
    pub discount_costs: HashMap<String, u32>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct AccessoryStore {
    #[serde(default)]
    pub accessory_store_offers: Vec<AccessoryOffer>,
    #[serde(default)]
    pub accessory_store_remaining_duration_in_seconds: i64,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct AccessoryOffer {
    #[serde(default)]
    pub offer: Offer,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct WalletRaw {
    #[serde(default)]
    pub balances: HashMap<String, u32>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct EntitlementsRaw {
    #[serde(default)]
    entitlements: Vec<EntitlementRaw>,
}

#[derive(Debug, Clone, Default, Deserialize)]
struct EntitlementRaw {
    #[serde(rename = "ItemID", default)]
    item_id: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct OffersRaw {
    #[serde(default)]
    pub offers: Vec<Offer>,
}

impl OffersRaw {

    pub fn price_map(&self) -> HashMap<String, u32> {
        self.offers
            .iter()
            .filter_map(|o| o.first_reward().map(|r| (r.item_id.clone(), o.vp())))
            .filter(|(_, vp)| *vp > 0)
            .collect()
    }
}
