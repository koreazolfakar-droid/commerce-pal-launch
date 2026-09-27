mod auth;
mod config;
mod db;
mod error;
mod routes;
mod state;

use std::{sync::Arc, time::Duration};

use axum::{
    Router,
    body::Body,
    extract::MatchedPath,
    http::{Method, Request, Response, header},
    routing::get,
};
use config::{AppEnv, Config};
use state::AppState;
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    limit::RequestBodyLimitLayer,
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    trace::TraceLayer,
};
use tracing::Span;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let config = Config::from_env()?;
    let filter = EnvFilter::try_new(&config.rust_log)?;
    if config.app_env == AppEnv::Production {
        tracing_subscriber::fmt()
            .json()
            .with_env_filter(filter)
            .init();
    } else {
        tracing_subscriber::fmt().with_env_filter(filter).init();
    }

    let address = (config.host, config.port);
    let db = db::connect(&config).await.map_err(|_| {
        tracing::error!("database connection failed at startup");
        "database connection failed at startup"
    })?;
    db::ping(&db).await.map_err(|_| {
        tracing::error!("database validation failed at startup");
        "database validation failed at startup"
    })?;
    let allowed_origins = config
        .allowed_origins
        .iter()
        .map(|origin| origin.parse())
        .collect::<Result<Vec<_>, _>>()?;
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(allowed_origins))
        .allow_methods([Method::GET])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]);
    let state = AppState {
        db: db.clone(),
        config: Arc::new(config),
    };
    let app = Router::new()
        .route("/health", get(routes::health::health))
        .fallback(|| async { error::ApiError::NotFound })
        .with_state(state)
        .layer(PropagateRequestIdLayer::x_request_id())
        .layer(TraceLayer::new_for_http()
            .make_span_with(|request: &Request<Body>| {
                let route = request.extensions().get::<MatchedPath>()
                    .map(MatchedPath::as_str).unwrap_or("unmatched");
                let request_id = request.headers().get("x-request-id")
                    .and_then(|value| value.to_str().ok()).unwrap_or("missing");
                tracing::info_span!("http_request", method = %request.method(), route, request_id)
            })
            .on_response(|response: &Response<Body>, latency: Duration, _: &Span| {
                tracing::info!(status = response.status().as_u16(), latency_ms = latency.as_millis(), "request completed");
            }))
        .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid))
        .layer(RequestBodyLimitLayer::new(1024 * 1024))
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(address).await?;
    tracing::info!(host = %address.0, port = address.1, "space-call-api started");
    let result = axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await;
    db.close().await;
    tracing::info!("space-call-api stopped");
    result?;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        if let Err(error) = tokio::signal::ctrl_c().await {
            tracing::error!(%error, "failed to listen for Ctrl-C");
            std::future::pending::<()>().await;
        }
    };
    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut signal) => {
                signal.recv().await;
            }
            Err(error) => {
                tracing::error!(%error, "failed to listen for SIGTERM");
                std::future::pending::<()>().await;
            }
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
    tracing::info!("shutdown requested");
}
