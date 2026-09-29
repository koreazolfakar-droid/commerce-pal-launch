mod config;
mod db;
mod routes;
mod state;

use std::io;

use axum::{
    http::{header, HeaderValue, Method},
    routing::get,
    Router,
};
use config::{AppConfig, ConfigError};
use state::AppState;
use thiserror::Error;
use tokio::net::TcpListener;
use tower_http::{
    catch_panic::CatchPanicLayer,
    cors::{AllowOrigin, CorsLayer},
    trace::TraceLayer,
};
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), StartupError> {
    init_tracing();

    let config = AppConfig::from_env()?;
    let bind_addr = config.bind_addr;

    info!(%bind_addr, "starting Space Call backend");

    let pool = db::connect(&config).await?;

    if let Some(pool) = pool.as_ref() {
        db::ping(pool).await?;
        info!("database connection established");
    } else {
        warn!("DATABASE_URL is not configured; using Supabase REST fallback for read-only catalog access");
    }

    let state = AppState::new(pool, &config);

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list([
            HeaderValue::from_static("https://www.spacecallapp.store"),
            HeaderValue::from_static("https://app.spacecallapp.store"),
        ]))
        .allow_methods([Method::GET, Method::HEAD, Method::OPTIONS])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]);

    let app = Router::new()
        .route("/health", get(routes::health::liveness))
        .route("/ready", get(routes::health::readiness))
        .route("/api/me", get(routes::auth::me))
        .route("/api/catalog/products", get(routes::catalog::list_products))
        .route("/api/catalog/cards", get(routes::catalog::list_cards))
        .with_state(state)
        .layer(cors)
        .layer(CatchPanicLayer::new())
        .layer(TraceLayer::new_for_http());

    let listener = TcpListener::bind(bind_addr)
        .await
        .map_err(|source| StartupError::Bind {
            address: bind_addr.to_string(),
            source,
        })?;

    info!(%bind_addr, "Space Call backend listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .map_err(StartupError::Serve)
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        EnvFilter::new("space_call_backend=info,tower_http=info")
    });

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .json()
        .with_current_span(false)
        .init();
}

async fn shutdown_signal() {
    let ctrl_c = async {
        if let Err(error) = tokio::signal::ctrl_c().await {
            error!(%error, "failed to install Ctrl+C handler");
        }
    };

    #[cfg(unix)]
    {
        use tokio::signal::unix::{signal, SignalKind};

        let terminate = async {
            match signal(SignalKind::terminate()) {
                Ok(mut stream) => {
                    stream.recv().await;
                }
                Err(error) => {
                    error!(%error, "failed to install SIGTERM handler");
                    std::future::pending::<()>().await;
                }
            }
        };

        tokio::select! {
            () = ctrl_c => {},
            () = terminate => {},
        }
    }

    #[cfg(not(unix))]
    ctrl_c.await;

    info!("shutdown signal received");
}

#[derive(Debug, Error)]
enum StartupError {
    #[error(transparent)]
    Config(#[from] ConfigError),

    #[error("database connection failed")]
    Database(#[from] sqlx::Error),

    #[error("database startup readiness check failed")]
    Readiness(#[from] db::PingError),

    #[error("failed to bind backend listener at {address}")]
    Bind {
        address: String,
        #[source]
        source: io::Error,
    },

    #[error("backend server failed")]
    Serve(#[source] io::Error),
}
