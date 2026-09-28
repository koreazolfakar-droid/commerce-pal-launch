use axum::{Json, extract::State, http::StatusCode};
use serde::Serialize;
use tokio::time::timeout;

use crate::{db, state::AppState};

#[derive(Serialize)]
pub struct HealthResponse {
    status: &'static str,
    service: &'static str,
    database: &'static str,
}

pub async fn health(State(state): State<AppState>) -> (StatusCode, Json<HealthResponse>) {
    match timeout(state.config.database_timeout(), db::ping(&state.db)).await {
        Ok(Ok(())) => (
            StatusCode::OK,
            Json(HealthResponse {
                status: "ok",
                service: "space-call-api",
                database: "healthy",
            }),
        ),
        _ => {
            tracing::warn!("health check failed: database unavailable");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(HealthResponse {
                    status: "degraded",
                    service: "space-call-api",
                    database: "unhealthy",
                }),
            )
        }
    }
}
