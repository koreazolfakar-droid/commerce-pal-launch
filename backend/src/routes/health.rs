use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use tracing::warn;

use crate::{db, state::AppState};

const SERVICE_NAME: &str = "space-call-backend";

#[derive(Serialize)]
pub struct HealthResponse {
    status: &'static str,
    service: &'static str,
    database: &'static str,
    supabase: &'static str,
}

pub async fn liveness() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(HealthResponse {
            status: "ok",
            service: SERVICE_NAME,
            database: "unchecked",
            supabase: "unchecked",
        }),
    )
}

pub async fn readiness(State(state): State<AppState>) -> impl IntoResponse {
    if let Some(pool) = state.db.as_ref() {
        return match db::ping(pool).await {
            Ok(()) => (
                StatusCode::OK,
                Json(HealthResponse {
                    status: "ready",
                    service: SERVICE_NAME,
                    database: "ok",
                    supabase: "unchecked",
                }),
            ),
            Err(error) => {
                warn!(error = %error, "database readiness probe failed");

                (
                    StatusCode::SERVICE_UNAVAILABLE,
                    Json(HealthResponse {
                        status: "not_ready",
                        service: SERVICE_NAME,
                        database: "unavailable",
                        supabase: "unchecked",
                    }),
                )
            }
        };
    }

    match supabase_readiness(&state).await {
        Ok(()) => (
            StatusCode::OK,
            Json(HealthResponse {
                status: "ready",
                service: SERVICE_NAME,
                database: "not_configured",
                supabase: "ok",
            }),
        ),
        Err(()) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(HealthResponse {
                status: "not_ready",
                service: SERVICE_NAME,
                database: "not_configured",
                supabase: "unavailable",
            }),
        ),
    }
}

async fn supabase_readiness(state: &AppState) -> Result<(), ()> {
    let url = format!("{}/rest/v1/store_products", state.supabase_url);

    let response = state
        .http
        .get(url)
        .header("apikey", &state.supabase_publishable_key)
        .query(&[("select", "id"), ("limit", "1")])
        .send()
        .await
        .map_err(|error| {
            warn!(%error, "Supabase readiness request failed");
        })?;

    if response.status().is_success() {
        Ok(())
    } else {
        warn!(status = %response.status(), "Supabase readiness returned an unexpected status");
        Err(())
    }
}
