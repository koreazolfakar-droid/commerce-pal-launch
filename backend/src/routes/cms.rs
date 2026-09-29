use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use serde_json::Value;
use tracing::warn;

use crate::state::AppState;

pub async fn public_cms(
    State(state): State<AppState>,
) -> Result<Json<Value>, CmsError> {
    let url = format!("{}/functions/v1/public-cms", state.supabase_url);

    let response = state
        .http
        .get(url)
        .header("apikey", &state.supabase_publishable_key)
        .header("accept", "application/json")
        .send()
        .await
        .map_err(|error| {
            warn!(%error, "Supabase public-cms request failed");
            CmsError::Unavailable
        })?;

    if !response.status().is_success() {
        warn!(status = %response.status(), "Supabase public-cms returned an unexpected status");
        return Err(CmsError::Unavailable);
    }

    response.json::<Value>().await.map(Json).map_err(|error| {
        warn!(%error, "Supabase public-cms returned invalid JSON");
        CmsError::Unavailable
    })
}

#[derive(Debug)]
pub enum CmsError {
    Unavailable,
}

impl IntoResponse for CmsError {
    fn into_response(self) -> Response {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(CmsErrorBody {
                error: "cms_unavailable",
            }),
        )
            .into_response()
    }
}

#[derive(Serialize)]
struct CmsErrorBody {
    error: &'static str,
}
