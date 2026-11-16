use std::time::Duration;

use sqlx::{PgPool, postgres::PgPoolOptions};
use thiserror::Error;
use tokio::time::timeout;

use crate::config::AppConfig;

const READINESS_TIMEOUT: Duration = Duration::from_secs(3);

pub async fn connect(config: &AppConfig) -> Result<Option<PgPool>, sqlx::Error> {
    let Some(database_url) = config.database_url.as_deref() else {
        return Ok(None);
    };

    PgPoolOptions::new()
        .max_connections(config.database_max_connections)
        .acquire_timeout(Duration::from_secs(config.database_acquire_timeout_seconds))
        .connect(database_url)
        .await
        .map(Some)
}

pub async fn ping(pool: &PgPool) -> Result<(), PingError> {
    let query = sqlx::query_scalar::<_, i32>("SELECT 1").fetch_one(pool);
    let value = timeout(READINESS_TIMEOUT, query)
        .await
        .map_err(|_| PingError::Timeout)??;

    if value == 1 {
        Ok(())
    } else {
        Err(PingError::UnexpectedValue)
    }
}

#[derive(Debug, Error)]
pub enum PingError {
    #[error("database readiness probe timed out")]
    Timeout,

    #[error("database readiness probe returned an unexpected value")]
    UnexpectedValue,

    #[error("database readiness probe failed")]
    Database(#[from] sqlx::Error),
}
