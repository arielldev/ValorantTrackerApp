use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Not signed in")]
    NotSignedIn,
    #[error("Sign-in was cancelled")]
    LoginCancelled,
    #[error("Session expired. Please sign in again.")]
    SessionExpired,
    #[error("You are offline")]
    Offline,
    #[error("{0}")]
    Disabled(String),
    #[error("Riot returned an unexpected response ({0})")]
    Riot(String),
    #[error("Content catalog unavailable ({0})")]
    Content(String),
    #[error("Storage error ({0})")]
    Storage(String),
    #[error("{0}")]
    Other(String),
}

pub type AppResult<T> = Result<T, AppError>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorPayload {
    kind: &'static str,
    message: String,
}

impl AppError {
    pub fn kind(&self) -> &'static str {
        match self {
            AppError::NotSignedIn => "not_signed_in",
            AppError::LoginCancelled => "login_cancelled",
            AppError::SessionExpired => "session_expired",
            AppError::Offline => "offline",
            AppError::Disabled(_) => "disabled",
            AppError::Riot(_) => "riot",
            AppError::Content(_) => "content",
            AppError::Storage(_) => "storage",
            AppError::Other(_) => "other",
        }
    }
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        ErrorPayload { kind: self.kind(), message: self.to_string() }.serialize(s)
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        if e.is_connect() || e.is_timeout() || e.is_request() {
            AppError::Offline
        } else {
            AppError::Riot(e.to_string())
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Riot(format!("bad json: {e}"))
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Storage(e.to_string())
    }
}

impl From<tauri::Error> for AppError {
    fn from(e: tauri::Error) -> Self {
        AppError::Other(e.to_string())
    }
}

impl From<tauri_plugin_valorant_auth::Error> for AppError {
    fn from(e: tauri_plugin_valorant_auth::Error) -> Self {
        match e {
            tauri_plugin_valorant_auth::Error::Cancelled => AppError::LoginCancelled,
            other => AppError::Other(other.to_string()),
        }
    }
}
