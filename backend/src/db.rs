use std::time::Duration;

use sqlx::{postgres::PgPoolOptions, PgPool};

use crate::config::AppConfig;

pub async fn connect(config: &AppConfig) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(config.database_max_connections)
        .acquire_timeout(Duration::from_secs(
            config.database_acquire_timeout_seconds,
        ))
        .connect(&config.database_url)
        .await
}

pub async fn ping(pool: &PgPool) -> Result<(), sqlx::Error> {
    let value = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(pool)
        .await?;

    if value == 1 {
        Ok(())
    } else {
        Err(sqlx::Error::Protocol(
            "database readiness probe returned an unexpected value".to_owned(),
        ))
    }
}
