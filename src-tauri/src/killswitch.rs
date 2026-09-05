use std::time::Duration;

use serde::Deserialize;

pub const STATUS_URL: &str = "https://raw.githubusercontent.com/valostore/status/main/status.json";

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Status {
    pub disabled: bool,
    pub message: Option<String>,
    pub min_version: Option<String>,
}

impl Status {
    pub fn blocking_message(&self, app_version: &str) -> Option<String> {
        if self.disabled {
            return Some(self.message.clone().unwrap_or_else(|| "Store fetching is temporarily disabled.".into()));
        }
        if let Some(min) = &self.min_version {
            if version_lt(app_version, min) {
                return Some(format!("Please update ValoStore (requires {min})."));
            }
        }
        None
    }
}

fn version_lt(a: &str, b: &str) -> bool {
    let parse = |s: &str| s.split('.').map(|p| p.parse::<u32>().unwrap_or(0)).collect::<Vec<_>>();
    parse(a) < parse(b)
}

pub async fn check(http: &reqwest::Client) -> Status {
    let res = http.get(STATUS_URL).timeout(Duration::from_secs(5)).send().await;
    match res {
        Ok(r) if r.status().is_success() => r.json::<Status>().await.unwrap_or_default(),
        Ok(r) => {
            log::debug!("kill switch fetch returned {}", r.status());
            Status::default()
        }
        Err(e) => {
            log::debug!("kill switch fetch failed: {e}");
            Status::default()
        }
    }
}
