use std::collections::{HashMap, HashSet};

use chrono::{Datelike, NaiveDate, TimeZone, Utc};
use serde::{Deserialize, Serialize};

use crate::content::Loaded;
use crate::models::*;
use crate::riot::{self, item_type, BundleRaw, Storefront};
use crate::vault::{HistoryDayRaw, WishEntry};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct OwnedSets {
    pub levels: HashSet<String>,
    pub chromas: HashSet<String>,
    pub buddies: HashSet<String>,
    pub sprays: HashSet<String>,
    pub cards: HashSet<String>,
    pub titles: HashSet<String>,
    pub fetched_at: i64,
}

impl OwnedSets {
    pub fn has(&self, kind: ItemKind, id: &str) -> bool {
        match kind {
            ItemKind::Skin => self.levels.contains(id),
            ItemKind::Chroma => self.chromas.contains(id),
            ItemKind::Buddy => self.buddies.contains(id),
            ItemKind::Spray => self.sprays.contains(id),
            ItemKind::Card => self.cards.contains(id),
            ItemKind::Title => self.titles.contains(id),
            ItemKind::Other => false,
        }
    }

    pub fn owns_skin(&self, skin: &crate::content::Skin) -> bool {
        skin.base_level().map(|l| self.levels.contains(&l.uuid)).unwrap_or(false)
    }
}

pub fn shop_date(expires_at: i64) -> NaiveDate {
    Utc.timestamp_opt(expires_at - 1, 0).single().unwrap_or_else(Utc::now).date_naive()
}

pub fn skin_offer(
    cat: &Loaded,
    level_uuid: &str,
    price_vp: u32,
    original_price_vp: Option<u32>,
    discount_percent: Option<u32>,
    owned: &OwnedSets,
    wish: &HashSet<String>,
) -> Option<SkinOffer> {
    let skin = cat.skin_by_level(level_uuid)?;
    Some(SkinOffer {
        level_uuid: level_uuid.to_string(),
        skin_uuid: skin.uuid.clone(),
        name: skin.name.clone(),
        weapon: skin.weapon.clone(),
        line: skin.line.clone(),
        image: skin.image(),
        video: skin.video(),
        tier: cat.tier(skin.tier_uuid.as_deref()),
        price_vp,
        original_price_vp,
        discount_percent,
        owned: owned.levels.contains(level_uuid) || owned.owns_skin(skin),
        wishlisted: wish.contains(&skin.uuid),
    })
}

fn bundle(raw: &BundleRaw, cat: &Loaded, owned: &OwnedSets, wish: &HashSet<String>, now: i64) -> Bundle {
    let info = cat.bundles.get(&raw.data_asset_id);
    let items: Vec<BundleItem> = raw
        .items
        .iter()
        .filter_map(|it| {
            let (kind, name, image) = cat.lookup(&it.item.item_type_id, &it.item.item_id)?;
            Some(BundleItem {
                uuid: it.item.item_id.clone(),
                kind,
                name,
                image,
                base_price_vp: it.base_price,
                price_vp: it.discounted_price,
                owned: owned.has(kind, &it.item.item_id),
                wishlisted: cat.level_to_skin.get(&it.item.item_id).map(|s| wish.contains(s)).unwrap_or(false),
                skin_uuid: cat.level_to_skin.get(&it.item.item_id).or_else(|| cat.chroma_to_skin.get(&it.item.item_id)).cloned(),
            })
        })
        .collect();
    let items_total_vp = raw
        .total_base_cost
        .as_ref()
        .and_then(|m| m.get(riot::VP_ID).copied())
        .unwrap_or_else(|| items.iter().map(|i| i.base_price_vp).sum());
    let price_vp = raw
        .total_discounted_cost
        .as_ref()
        .and_then(|m| m.get(riot::VP_ID).copied())
        .unwrap_or_else(|| items.iter().map(|i| i.price_vp).sum());
    let owned_count = items.iter().filter(|i| i.owned).count() as u32;
    let full_price_vp = price_vp;
    let price_vp = if owned_count > 0 { items.iter().filter(|i| !i.owned).map(|i| i.price_vp).sum() } else { price_vp };
    Bundle {
        uuid: raw.data_asset_id.clone(),
        name: info.map(|b| b.name.clone()).unwrap_or_else(|| "Bundle".into()),
        image: info.and_then(|b| b.image.clone()),
        price_vp,
        full_price_vp,
        items_total_vp,
        owned_count,
        items,
        expires_at: now + raw.duration_remaining_in_seconds,
    }
}

pub fn store(sf: &Storefront, cat: &Loaded, owned: &OwnedSets, wish: &HashSet<String>, now: i64) -> Store {
    let mut daily = Vec::new();
    let mut daily_expires_at = now;
    if let Some(panel) = &sf.skins_panel_layout {
        daily_expires_at = now + panel.single_item_offers_remaining_duration_in_seconds;
        if panel.single_item_store_offers.is_empty() {
            for id in &panel.single_item_offers {
                if let Some(o) = skin_offer(cat, id, 0, None, None, owned, wish) {
                    daily.push(o);
                }
            }
        } else {
            for offer in &panel.single_item_store_offers {
                if let Some(r) = offer.first_reward() {
                    if let Some(o) = skin_offer(cat, &r.item_id, offer.vp(), None, None, owned, wish) {
                        daily.push(o);
                    }
                }
            }
        }
    }

    let mut bundles = Vec::new();
    if let Some(fb) = &sf.featured_bundle {
        if fb.bundles.is_empty() {
            if let Some(b) = &fb.bundle {
                bundles.push(bundle(b, cat, owned, wish, now));
            }
        } else {
            for b in &fb.bundles {
                bundles.push(bundle(b, cat, owned, wish, now));
            }
        }
    }

    let night_market = sf.bonus_store.as_ref().and_then(|bs| {
        if bs.bonus_store_offers.is_empty() {
            return None;
        }
        let offers = bs
            .bonus_store_offers
            .iter()
            .filter_map(|bo| {
                let r = bo.offer.first_reward()?;
                let original = bo.offer.vp();
                let price = bo.discount_costs.get(riot::VP_ID).copied().unwrap_or(original);
                skin_offer(cat, &r.item_id, price, Some(original), Some(bo.discount_percent), owned, wish)
            })
            .collect();
        Some(NightMarket { offers, expires_at: now + bs.bonus_store_remaining_duration_in_seconds })
    });

    let mut accessories = Vec::new();
    let mut accessories_expire_at = now;
    if let Some(acc) = &sf.accessory_store {
        accessories_expire_at = now + acc.accessory_store_remaining_duration_in_seconds;
        for ao in &acc.accessory_store_offers {
            let Some(r) = ao.offer.first_reward() else { continue };
            let Some((kind, name, image)) = cat.lookup(&r.item_type_id, &r.item_id) else { continue };
            accessories.push(Accessory {
                uuid: r.item_id.clone(),
                kind,
                name,
                image,
                price_kc: ao.offer.kc(),
                owned: owned.has(kind, &r.item_id),
            });
        }
    }

    Store { fetched_at: now, daily, daily_expires_at, bundles, night_market, accessories, accessories_expire_at, offline: false }
}

pub fn tier_fallback_price(tier: Option<&Tier>) -> u32 {
    let name = tier.map(|t| t.name.to_ascii_lowercase()).unwrap_or_default();
    if name.contains("select") {
        875
    } else if name.contains("deluxe") {
        1275
    } else if name.contains("premium") {
        1775
    } else if name.contains("exclusive") {
        2175
    } else if name.contains("ultra") {
        2475
    } else {
        match tier.map(|t| t.rank) {
            Some(0) => 875,
            Some(1) => 1275,
            Some(2) => 1775,
            Some(3) => 2175,
            Some(4) => 2475,
            _ => 0,
        }
    }
}

#[cfg(test)]
mod price_tests {
    use super::*;

    fn tier(name: &str, rank: u32) -> Tier {
        Tier { uuid: String::new(), name: name.into(), rank, color: String::new(), icon: None }
    }

    #[test]
    fn fallback_matches_display_names() {
        assert_eq!(tier_fallback_price(Some(&tier("Select Edition", 0))), 875);
        assert_eq!(tier_fallback_price(Some(&tier("Deluxe Edition", 1))), 1275);
        assert_eq!(tier_fallback_price(Some(&tier("Premium Edition", 2))), 1775);
        assert_eq!(tier_fallback_price(Some(&tier("Exclusive Edition", 3))), 2175);
        assert_eq!(tier_fallback_price(Some(&tier("Ultra Edition", 4))), 2475);
        assert_eq!(tier_fallback_price(Some(&tier("???", 3))), 2175);
        assert_eq!(tier_fallback_price(None), 0);
    }
}

pub fn collection(cat: &Loaded, owned: &OwnedSets, prices: &HashMap<String, u32>, fetched_at: i64, offline: bool) -> Collection {
    let mut battlepasses: Vec<String> = Vec::new();
    let mut store_skins = 0;
    let mut battlepass_skins = 0;
    let mut free_skins = 0;
    let mut lines: Vec<SkinLine> = cat
        .skins
        .values()
        .filter_map(|s| {
            let base = s.base_level()?;
            let mut items: Vec<CollectionItem> = s
                .levels
                .iter()
                .enumerate()
                .map(|(i, l)| CollectionItem {
                    uuid: l.uuid.clone(),
                    kind: ItemKind::Skin,
                    name: if l.name.is_empty() { format!("Level {}", i + 1) } else { l.name.clone() },
                    image: l.image.clone(),
                    swatch: None,
                    video: l.video.clone(),
                    owned: owned.levels.contains(&l.uuid) || (i == 0 && owned.owns_skin(s)),
                })
                .collect();
            items.extend(s.chromas.iter().skip(1).map(|c| CollectionItem {
                uuid: c.uuid.clone(),
                kind: ItemKind::Chroma,
                name: c.name.clone(),
                image: c.full_render.clone().or_else(|| c.image.clone()),
                swatch: c.swatch.clone(),
                video: c.video.clone(),
                owned: owned.chromas.contains(&c.uuid),
            }));
            let owned_count = items.iter().filter(|i| i.owned).count() as u32;
            if owned_count == 0 {
                return None;
            }
            let tier = cat.tier(s.tier_uuid.as_deref());
            let reward = cat.contract_rewards.get(&base.uuid);
            let offer_price = prices.get(&base.uuid).copied();
            let (source, contract, value_vp) = match (offer_price, reward) {
                (Some(p), _) if p > 0 => ("store", None, p),
                (_, Some(r)) if r.free => ("free", Some(r.contract.clone()), 0),
                (_, Some(r)) => ("battlepass", Some(r.contract.clone()), 0),
                (_, None) if tier.is_some() => ("store", None, tier_fallback_price(tier.as_ref())),
                _ => ("free", None, 0),
            };
            if s.name.starts_with("Standard") || s.line == s.name && tier.is_none() && reward.is_none() {
                return None;
            }
            if owned.owns_skin(s) {
                match source {
                    "store" => store_skins += 1,
                    "battlepass" => {
                        battlepass_skins += 1;
                        if let Some(c) = &contract {
                            if !battlepasses.contains(c) {
                                battlepasses.push(c.clone());
                            }
                        }
                    }
                    _ => free_skins += 1,
                }
            }
            Some(SkinLine {
                skin_uuid: s.uuid.clone(),
                name: s.name.clone(),
                weapon: s.weapon.clone(),
                line: s.line.clone(),
                tier,
                image: s.image(),
                owned: owned_count,
                total: items.len() as u32,
                value_vp: if owned.owns_skin(s) { value_vp } else { 0 },
                wishlisted: false,
                source: source.to_string(),
                contract,
                items,
            })
        })
        .collect();
    lines.sort_by(|a, b| a.name.cmp(&b.name));
    battlepasses.sort();
    let spend = spend_estimate(cat, owned, prices, &lines, battlepasses.len() as u32);
    Collection {
        total_owned: lines.iter().filter(|l| l.owned > 0).count() as u32,
        total_value_vp: lines.iter().map(|l| l.value_vp).sum(),
        spend,
        store_skins,
        battlepass_skins,
        free_skins,
        battlepasses,
        lines,
        fetched_at,
        offline,
    }
}

pub fn history(days: &[HistoryDayRaw], cat: &Loaded, install_date: &str, now: i64) -> History {
    let this_month = Utc.timestamp_opt(now, 0).single().unwrap_or_else(Utc::now);
    let month_prefix = format!("{:04}-{:02}", this_month.year(), this_month.month());
    let mut vp_spent_month = 0;
    let mut vp_spent_all = 0;
    let mut out = Vec::with_capacity(days.len());
    for d in days {
        let skins = d
            .skins
            .iter()
            .filter_map(|s| {
                let skin = cat.skin_by_level(&s.level_uuid)?;
                if s.purchased {
                    vp_spent_all += s.price_vp;
                    if d.date.starts_with(&month_prefix) {
                        vp_spent_month += s.price_vp;
                    }
                }
                Some(HistoryEntry {
                    level_uuid: s.level_uuid.clone(),
                    skin_uuid: skin.uuid.clone(),
                    name: skin.name.clone(),
                    weapon: skin.weapon.clone(),
                    line: skin.line.clone(),
                    image: skin.image(),
                    tier: cat.tier(skin.tier_uuid.as_deref()),
                    price_vp: s.price_vp,
                    owned_at_fetch: s.owned_at_fetch,
                    purchased: s.purchased,
                })
            })
            .collect();
        out.push(HistoryDay { date: d.date.clone(), fetched_at: d.fetched_at, skins });
    }
    out.sort_by(|a, b| b.date.cmp(&a.date));
    History { install_date: install_date.to_string(), days: out, vp_spent_month, vp_spent_all }
}

pub fn wishlist(
    entries: &[WishEntry],
    cat: &Loaded,
    owned: &OwnedSets,
    store: Option<&Store>,
    days: &[HistoryDayRaw],
    prices: &HashMap<String, u32>,
    today: NaiveDate,
) -> Wishlist {
    let mut items: Vec<WishlistItem> = entries
        .iter()
        .filter_map(|e| {
            let skin = cat.skins.get(&e.skin_uuid)?;
            let base = skin.base_level()?;
            let mut price_vp = prices.get(&base.uuid).copied();
            let mut state = WishState::NeverSeen;

            if let Some(st) = store {
                if let Some(o) = st.daily.iter().find(|o| o.skin_uuid == skin.uuid) {
                    price_vp = Some(o.price_vp);
                    state = WishState::InShop;
                } else if let Some(o) = st.night_market.as_ref().and_then(|nm| nm.offers.iter().find(|o| o.skin_uuid == skin.uuid)) {
                    price_vp = Some(o.price_vp);
                    state = WishState::NightMarket { price_vp: o.price_vp, discount_percent: o.discount_percent.unwrap_or(0) };
                } else if let Some(b) = st.bundles.iter().find(|b| {
                    b.items.iter().any(|i| i.kind == ItemKind::Skin && cat.level_to_skin.get(&i.uuid) == Some(&skin.uuid))
                }) {
                    state = WishState::InBundle { bundle: b.name.clone() };
                }
            }

            if matches!(state, WishState::NeverSeen) {
                let last = days
                    .iter()
                    .filter(|d| d.skins.iter().any(|s| cat.level_to_skin.get(&s.level_uuid) == Some(&skin.uuid)))
                    .filter_map(|d| NaiveDate::parse_from_str(&d.date, "%Y-%m-%d").ok())
                    .max();
                if let Some(date) = last {
                    state = WishState::LastSeen { days: (today - date).num_days().max(0) };
                }
            }

            Some(WishlistItem {
                skin_uuid: skin.uuid.clone(),
                level_uuid: base.uuid.clone(),
                name: skin.name.clone(),
                weapon: skin.weapon.clone(),
                line: skin.line.clone(),
                image: skin.image(),
                tier: cat.tier(skin.tier_uuid.as_deref()),
                price_vp,
                state,
                owned: owned.owns_skin(skin),
                added_at: e.added_at,
            })
        })
        .collect();

    fn rank(s: &WishState) -> (u8, i64) {
        match s {
            WishState::InShop => (0, 0),
            WishState::NightMarket { .. } => (1, 0),
            WishState::InBundle { .. } => (2, 0),
            WishState::LastSeen { days } => (3, *days),
            WishState::NeverSeen => (4, 0),
        }
    }
    items.sort_by(|a, b| rank(&a.state).cmp(&rank(&b.state)).then(b.added_at.cmp(&a.added_at)));
    let total_vp = items.iter().filter(|i| !i.owned).filter_map(|i| i.price_vp).sum();
    Wishlist { items, total_vp }
}

pub fn skin_detail(cat: &Loaded, skin_uuid: &str, owned: &OwnedSets, wish: &HashSet<String>, prices: &HashMap<String, u32>) -> Option<SkinDetail> {
    let skin = cat.skins.get(skin_uuid)?;
    let levels = skin
        .levels
        .iter()
        .enumerate()
        .map(|(i, l)| CollectionItem {
            uuid: l.uuid.clone(),
            kind: ItemKind::Skin,
            name: if l.name.is_empty() { format!("Level {}", i + 1) } else { l.name.clone() },
            image: l.image.clone(),
            swatch: None,
            video: l.video.clone(),
            owned: owned.levels.contains(&l.uuid) || (i == 0 && owned.owns_skin(skin)),
        })
        .collect();
    let chromas = skin
        .chromas
        .iter()
        .enumerate()
        .map(|(i, c)| CollectionItem {
            uuid: c.uuid.clone(),
            kind: ItemKind::Chroma,
            name: c.name.clone(),
            image: c.full_render.clone().or_else(|| c.image.clone()),
            swatch: c.swatch.clone(),
            video: c.video.clone(),
            owned: owned.chromas.contains(&c.uuid) || (i == 0 && owned.owns_skin(skin)),
        })
        .collect();
    Some(SkinDetail {
        skin_uuid: skin.uuid.clone(),
        name: skin.name.clone(),
        weapon: skin.weapon.clone(),
        line: skin.line.clone(),
        tier: cat.tier(skin.tier_uuid.as_deref()),
        image: skin.image(),
        video: skin.video(),
        price_vp: skin.base_level().and_then(|l| prices.get(&l.uuid)).copied(),
        owned: owned.owns_skin(skin),
        wishlisted: wish.contains(&skin.uuid),
        levels,
        chromas,
    })
}

#[allow(dead_code)]
pub fn item_type_for(kind: ItemKind) -> &'static str {
    match kind {
        ItemKind::Skin => item_type::SKIN_LEVEL,
        ItemKind::Chroma => item_type::SKIN_CHROMA,
        ItemKind::Buddy => item_type::BUDDY,
        ItemKind::Spray => item_type::SPRAY,
        ItemKind::Card => item_type::CARD,
        ItemKind::Title => item_type::TITLE,
        ItemKind::Other => "",
    }
}

fn skin_line(cat: &Loaded, s: &crate::content::Skin, owned: &OwnedSets, wish: &HashSet<String>, prices: &HashMap<String, u32>) -> SkinLine {
    let mut items: Vec<CollectionItem> = s
        .levels
        .iter()
        .enumerate()
        .map(|(i, l)| CollectionItem {
            uuid: l.uuid.clone(),
            kind: ItemKind::Skin,
            name: if l.name.is_empty() { format!("Level {}", i + 1) } else { l.name.clone() },
            image: l.image.clone(),
            swatch: None,
            video: l.video.clone(),
            owned: owned.levels.contains(&l.uuid) || (i == 0 && owned.owns_skin(s)),
        })
        .collect();
    items.extend(s.chromas.iter().skip(1).map(|c| CollectionItem {
        uuid: c.uuid.clone(),
        kind: ItemKind::Chroma,
        name: c.name.clone(),
        image: c.full_render.clone().or_else(|| c.image.clone()),
        swatch: c.swatch.clone(),
        video: c.video.clone(),
        owned: owned.chromas.contains(&c.uuid),
    }));
    let owned_count = items.iter().filter(|i| i.owned).count() as u32;
    SkinLine {
        skin_uuid: s.uuid.clone(),
        name: s.name.clone(),
        weapon: s.weapon.clone(),
        line: s.line.clone(),
        tier: cat.tier(s.tier_uuid.as_deref()),
        image: s.image(),
        owned: owned_count,
        total: items.len() as u32,
        value_vp: s.base_level().and_then(|l| prices.get(&l.uuid)).copied().unwrap_or_else(|| tier_fallback_price(cat.tier(s.tier_uuid.as_deref()).as_ref())),
        wishlisted: wish.contains(&s.uuid),
        source: String::new(),
        contract: None,
        items,
    }
}

pub fn weapons(cat: &Loaded, owned: &OwnedSets, wish: &HashSet<String>) -> Vec<Weapon> {
    cat.weapons
        .iter()
        .map(|w| {
            let skins: Vec<&crate::content::Skin> = cat.skins.values().filter(|s| s.weapon_uuid == w.uuid && s.tier_uuid.is_some()).collect();
            Weapon {
                uuid: w.uuid.clone(),
                name: w.name.clone(),
                category: w.category.clone(),
                image: w.image.clone(),
                owned_skins: skins.iter().filter(|s| owned.owns_skin(s)).count() as u32,
                total_skins: skins.len() as u32,
                wishlisted_skins: skins.iter().filter(|s| wish.contains(&s.uuid)).count() as u32,
            }
        })
        .collect()
}

pub fn weapon_skins(cat: &Loaded, weapon_uuid: &str, owned: &OwnedSets, wish: &HashSet<String>, prices: &HashMap<String, u32>) -> Option<WeaponSkins> {
    let weapon = weapons(cat, owned, wish).into_iter().find(|w| w.uuid == weapon_uuid)?;
    let mut lines: Vec<SkinLine> = cat
        .skins
        .values()
        .filter(|s| s.weapon_uuid == weapon_uuid && s.tier_uuid.is_some())
        .map(|s| skin_line(cat, s, owned, wish, prices))
        .collect();
    lines.sort_by(|a, b| {
        let ra = a.tier.as_ref().map(|t| t.rank).unwrap_or(0);
        let rb = b.tier.as_ref().map(|t| t.rank).unwrap_or(0);
        rb.cmp(&ra).then(a.name.cmp(&b.name))
    });
    Some(WeaponSkins { weapon, lines })
}

#[derive(Default)]
struct ThemeTally {
    skins_total: u32,
    skins_owned: u32,
    skins_owned_vp: u32,
    skins_total_vp: u32,
    acc_total: u32,
    acc_owned: u32,
}

fn entry<'a>(m: &'a mut HashMap<String, ThemeTally>, k: &str) -> &'a mut ThemeTally {
    m.entry(k.to_string()).or_default()
}

fn spend_estimate(cat: &Loaded, owned: &OwnedSets, prices: &HashMap<String, u32>, lines: &[SkinLine], passes: u32) -> SpendEstimate {
    let mut themes: HashMap<String, ThemeTally> = HashMap::new();
    let store_lines: HashMap<&str, &SkinLine> = lines.iter().filter(|l| l.source == "store").map(|l| (l.skin_uuid.as_str(), l)).collect();
    for s in cat.skins.values() {
        let Some(theme) = s.theme_uuid.as_deref() else { continue };
        if s.tier_uuid.is_none() {
            continue;
        }
        let price = s.base_level().and_then(|l| prices.get(&l.uuid)).copied().unwrap_or_else(|| tier_fallback_price(cat.tier(s.tier_uuid.as_deref()).as_ref()));
        if price == 0 {
            continue;
        }
        let t = entry(&mut themes, theme);
        t.skins_total += 1;
        t.skins_total_vp += price;
        if owned.owns_skin(s) && store_lines.contains_key(s.uuid.as_str()) {
            t.skins_owned += 1;
            t.skins_owned_vp += price;
        }
    }
    let mut seen_buddies: HashMap<String, (bool, String)> = HashMap::new();
    for b in cat.buddies.values() {
        if let Some(theme) = &b.theme_uuid {
            let e = seen_buddies.entry(b.name.clone()).or_insert((false, theme.clone()));
            if owned.buddies.contains(&b.uuid) {
                e.0 = true;
            }
        }
    }
    for (_, (has, theme)) in seen_buddies {
        let t = entry(&mut themes, &theme);
        t.acc_total += 1;
        if has {
            t.acc_owned += 1;
        }
    }
    for (map, set) in [(&cat.sprays, &owned.sprays), (&cat.cards, &owned.cards)] {
        for item in map.values() {
            if let Some(theme) = &item.theme_uuid {
                let t = entry(&mut themes, theme);
                t.acc_total += 1;
                if set.contains(&item.uuid) {
                    t.acc_owned += 1;
                }
            }
        }
    }
    let mut bundles = Vec::new();
    let mut bundles_vp = 0;
    let mut singles_vp = 0;
    let mut singles = 0;
    let mut saved_vp = 0;
    for (uuid, t) in themes {
        if t.skins_owned == 0 {
            continue;
        }
        let name = cat.themes.get(&uuid).cloned().unwrap_or_else(|| "Unknown collection".into());
        let image = cat.bundles.values().find(|b| b.name.eq_ignore_ascii_case(&name)).and_then(|b| b.image.clone());
        let total_items = t.skins_total + t.acc_total;
        let owned_items = t.skins_owned + t.acc_owned;
        let as_bundle = t.skins_total >= 3 && t.skins_owned == t.skins_total && (t.acc_total == 0 || t.acc_owned * 100 >= t.acc_total * 60);
        if as_bundle {
            let bundle_vp = (t.skins_total_vp as f64 * 0.8).round() as u32;
            bundles_vp += bundle_vp;
            saved_vp += t.skins_total_vp.saturating_sub(bundle_vp);
            bundles.push(SpendBundle {
                theme_uuid: uuid,
                name,
                image,
                owned_items,
                total_items,
                owned_skins: t.skins_owned,
                total_skins: t.skins_total,
                as_bundle: true,
                estimated_vp: bundle_vp,
                list_vp: t.skins_total_vp,
            });
        } else {
            singles_vp += t.skins_owned_vp;
            singles += t.skins_owned;
            if t.skins_owned >= 2 {
                bundles.push(SpendBundle {
                    theme_uuid: uuid,
                    name,
                    image,
                    owned_items,
                    total_items,
                    owned_skins: t.skins_owned,
                    total_skins: t.skins_total,
                    as_bundle: false,
                    estimated_vp: t.skins_owned_vp,
                    list_vp: t.skins_owned_vp,
                });
            }
        }
    }
    bundles.sort_by(|a, b| b.estimated_vp.cmp(&a.estimated_vp).then(a.name.cmp(&b.name)));
    let battlepass_vp = passes * 1000;
    SpendEstimate {
        total_vp: bundles_vp + singles_vp + battlepass_vp,
        bundles_vp,
        singles_vp,
        battlepass_vp,
        saved_vp,
        bundles,
        singles,
    }
}
