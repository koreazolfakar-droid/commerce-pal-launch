use axum::{
    http::{header::AUTHORIZATION, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::warn;

use crate::state::AppState;

#[derive(Debug, Deserialize)]
struct SupabaseUser {
    id: String,
    email: Option<String>,
    phone: Option<String>,
    role: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MeResponse {
    id: String,
    email: Option<String>,
    phone: Option<String>,
    role: Option<String>,
}

pub async fn me(
    axum::extract::State(state): axum::extract::State<AppState>,
    headers: HeaderMap,
) -> Result<Json<MeResponse>, AuthError> {
    let token = bearer_token(&headers)?;
    let user = verify_with_supabase(&state, token).await?;

    Ok(Json(MeResponse {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
    }))
}

fn bearer_token(headers: &HeaderMap) -> Result<&str, AuthError> {
    let value = headers
        .get(AUTHORIZATION)
        .ok_or(AuthError::MissingBearer)?
        .to_str()
        .map_err(|_| AuthError::InvalidBearer)?;

    let token = value
        .strip_prefix("Bearer ")
        .ok_or(AuthError::InvalidBearer)?
        .trim();

    if token.is_empty() || token.chars().any(char::is_whitespace) {
        return Err(AuthError::InvalidBearer);
    }

    Ok(token)
}

async fn verify_with_supabase(state: &AppState, token: &str) -> Result<SupabaseUser, AuthError> {
    let url = format!("{}/auth/v1/user", state.supabase_url);

    let response = state
        .http
        .get(url)
        .header("apikey", &state.supabase_publishable_key)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|error| {
            warn!(%error, "Supabase Auth verification request failed");
            AuthError::AuthUnavailable
        })?;

    if response.status() == reqwest::StatusCode::UNAUTHORIZED
        || response.status() == reqwest::StatusCode::FORBIDDEN
    {
        return Err(AuthError::InvalidToken);
    }

    if !response.status().is_success() {
        warn!(status = %response.status(), "Supabase Auth verification returned an unexpected status");
        return Err(AuthError::AuthUnavailable);
    }

    response.json::<SupabaseUser>().await.map_err(|error| {
        warn!(%error, "Supabase Auth returned an invalid user payload");
        AuthError::AuthUnavailable
    })
}

#[derive(Debug)]
pub enum AuthError {
    MissingBearer,
    InvalidBearer,
    InvalidToken,
    AuthUnavailable,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, code) = match self {
            Self::MissingBearer | Self::InvalidBearer | Self::InvalidToken => {
                (StatusCode::UNAUTHORIZED, "unauthorized")
            }
            Self::AuthUnavailable => (StatusCode::SERVICE_UNAVAILABLE, "auth_unavailable"),
        };

        (status, Json(AuthErrorBody { error: code })).into_response()
    }
}

#[derive(Serialize)]
struct AuthErrorBody {
    error: &'static str,
}

#[cfg(test)]
mod tests {
    use super::{bearer_token, AuthError};
    use axum::http::{header::AUTHORIZATION, HeaderMap, HeaderValue};

    #[test]
    fn extracts_bearer_token() {
        let mut headers = HeaderMap::new();
        headers.insert(AUTHORIZATION, HeaderValue::from_static("Bearer abc.def.ghi"));
        assert_eq!(bearer_token(&headers).unwrap(), "abc.def.ghi");
    }

    #[test]
    fn rejects_missing_or_malformed_bearer_token() {
        let headers = HeaderMap::new();
        assert!(matches!(bearer_token(&headers), Err(AuthError::MissingBearer)));

        let mut headers = HeaderMap::new();
        headers.insert(AUTHORIZATION, HeaderValue::from_static("Basic abc"));
        assert!(matches!(bearer_token(&headers), Err(AuthError::InvalidBearer)));
    }
}
