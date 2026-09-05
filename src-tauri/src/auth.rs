use std::collections::BTreeMap;

use serde::Deserialize;

use crate::error::{AppError, AppResult};
use crate::models::Player;
use crate::riot::USER_AGENT;

pub const AUTHORIZE_URL: &str = "https://auth.riotgames.com/authorize?client_id=play-valorant-web-prod&redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&response_type=token%20id_token&nonce=1&scope=account%20openid";

pub const REDIRECT_PREFIX: &str = "https://playvalorant.com/opt_in";

const ENTITLEMENTS_URL: &str = "https://entitlements.auth.riotgames.com/api/token/v1";
const USERINFO_URL: &str = "https://auth.riotgames.com/userinfo";
const GEO_URL: &str = "https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant";

const EXPIRY_MARGIN: i64 = 120;

#[derive(Debug, Clone)]
pub struct Tokens {
    pub access_token: String,
    pub id_token: String,
    pub expires_in: i64,
}

#[derive(Debug, Clone)]
pub struct Session {
    pub access_token: String,
    pub id_token: String,
    pub entitlements: String,
    pub puuid: String,
    pub shard: String,
    pub player: Player,
    pub expires_at: i64,
}

impl Session {
    pub fn is_expired(&self, now: i64) -> bool {
        now + EXPIRY_MARGIN >= self.expires_at
    }
}

#[derive(Default)]
pub struct AuthState {
    pub session: Option<Session>,

    pub prices: Option<std::collections::HashMap<String, u32>>,
    pub client_version: Option<String>,
}

pub fn parse_redirect(url: &str) -> Option<Tokens> {
    let fragment = url.split_once('#')?.1;
    let mut access = None;
    let mut id = None;
    let mut expires = 3600;
    for pair in fragment.split('&') {
        let (k, v) = pair.split_once('=')?;
        match k {
            "access_token" => access = Some(v.to_string()),
            "id_token" => id = Some(v.to_string()),
            "expires_in" => expires = v.parse().unwrap_or(3600),
            _ => {}
        }
    }
    Some(Tokens { access_token: access?, id_token: id?, expires_in: expires })
}

pub async fn reauth_with_cookies(cookies: &str) -> AppResult<(Tokens, String)> {
    let client = reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .redirect(reqwest::redirect::Policy::none())
        .build()?;

    let res = client.get(AUTHORIZE_URL).header(reqwest::header::COOKIE, cookies).send().await?;

    let mut jar = parse_cookie_header(cookies);
    for sc in res.headers().get_all(reqwest::header::SET_COOKIE) {
        if let Ok(s) = sc.to_str() {
            if let Some((name, value)) = s.split(';').next().and_then(|kv| kv.split_once('=')) {
                jar.insert(name.trim().to_string(), value.trim().to_string());
            }
        }
    }

    let location = res
        .headers()
        .get(reqwest::header::LOCATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default()
        .to_string();

    match parse_redirect(&location) {
        Some(tokens) if location.starts_with(REDIRECT_PREFIX) => Ok((tokens, serialize_cookie_jar(&jar))),
        _ => Err(AppError::SessionExpired),
    }
}

fn parse_cookie_header(cookies: &str) -> BTreeMap<String, String> {
    cookies
        .split(';')
        .filter_map(|kv| kv.split_once('='))
        .map(|(k, v)| (k.trim().to_string(), v.trim().to_string()))
        .collect()
}

fn serialize_cookie_jar(jar: &BTreeMap<String, String>) -> String {
    jar.iter().map(|(k, v)| format!("{k}={v}")).collect::<Vec<_>>().join("; ")
}

pub async fn complete(http: &reqwest::Client, tokens: Tokens) -> AppResult<Session> {
    let entitlements = fetch_entitlements(http, &tokens.access_token).await?;
    let info = fetch_userinfo(http, &tokens.access_token).await?;
    let shard = fetch_shard(http, &tokens.access_token, &tokens.id_token).await?;

    let player = Player {
        game_name: info.acct.game_name.unwrap_or_default(),
        tag_line: info.acct.tag_line.unwrap_or_default(),
        region: region_label(&shard),
    };

    Ok(Session {
        access_token: tokens.access_token,
        id_token: tokens.id_token,
        entitlements,
        puuid: info.sub,
        shard,
        player,
        expires_at: chrono::Utc::now().timestamp() + tokens.expires_in,
    })
}

async fn fetch_entitlements(http: &reqwest::Client, access: &str) -> AppResult<String> {
    #[derive(Deserialize)]
    struct R {
        entitlements_token: String,
    }
    let r: R = http
        .post(ENTITLEMENTS_URL)
        .bearer_auth(access)
        .json(&serde_json::json!({}))
        .send()
        .await?
        .error_for_status()
        .map_err(|_| AppError::SessionExpired)?
        .json()
        .await?;
    Ok(r.entitlements_token)
}

#[derive(Deserialize)]
struct UserInfo {
    sub: String,
    #[serde(default)]
    acct: Acct,
}

#[derive(Deserialize, Default)]
struct Acct {
    #[serde(default)]
    game_name: Option<String>,
    #[serde(default)]
    tag_line: Option<String>,
}

async fn fetch_userinfo(http: &reqwest::Client, access: &str) -> AppResult<UserInfo> {
    Ok(http
        .get(USERINFO_URL)
        .bearer_auth(access)
        .send()
        .await?
        .error_for_status()
        .map_err(|_| AppError::SessionExpired)?
        .json()
        .await?)
}

async fn fetch_shard(http: &reqwest::Client, access: &str, id_token: &str) -> AppResult<String> {
    #[derive(Deserialize)]
    struct Geo {
        affinities: Affinities,
    }
    #[derive(Deserialize)]
    struct Affinities {
        live: String,
    }
    let g: Geo = http
        .put(GEO_URL)
        .bearer_auth(access)
        .json(&serde_json::json!({ "id_token": id_token }))
        .send()
        .await?
        .error_for_status()
        .map_err(|e| AppError::Riot(format!("geo: {e}")))?
        .json()
        .await?;
    Ok(g.affinities.live)
}

pub fn region_label(shard: &str) -> String {
    match shard {
        "eu" => "EU",
        "na" => "NA",
        "ap" => "AP",
        "kr" => "KR",
        "br" => "BR",
        "latam" => "LATAM",
        "pbe" => "PBE",
        other => return other.to_uppercase(),
    }
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_redirect_fragment() {
        let t = parse_redirect("https://playvalorant.com/opt_in#access_token=abc&scope=openid&id_token=def&token_type=Bearer&expires_in=3600").unwrap();
        assert_eq!(t.access_token, "abc");
        assert_eq!(t.id_token, "def");
        assert_eq!(t.expires_in, 3600);
    }

    #[test]
    fn cookie_roundtrip() {
        let jar = parse_cookie_header("ssid=1; clid=eu");
        assert_eq!(serialize_cookie_jar(&jar), "clid=eu; ssid=1");
    }
}
