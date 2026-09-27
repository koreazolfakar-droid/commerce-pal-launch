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
}

pub async fn liveness() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(HealthResponse {
            status: "ok",
            service: SERVICE_NAME,
            database: "unchecked",
        }),
    )
}

pub async fn readiness(State(state): State<AppState>) -> impl IntoResponse {
    match db::ping(&state.db).await {
        Ok(()) => (
            StatusCode::OK,
            Json(HealthResponse {
                status: "ready",
                service: SERVICE_NAME,
                database: "ok",
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
                }),
            )
        }
    }
}
