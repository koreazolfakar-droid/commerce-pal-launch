use std::{env, net::SocketAddr, num::ParseIntError};

use thiserror::Error;

const DEFAULT_BIND_ADDR: &str = "0.0.0.0:8080";
const DEFAULT_DATABASE_MAX_CONNECTIONS: u32 = 5;
const DEFAULT_DATABASE_ACQUIRE_TIMEOUT_SECONDS: u64 = 5;

#[derive(Clone)]
pub struct AppConfig {
    pub bind_addr: SocketAddr,
    pub database_url: String,
    pub database_max_connections: u32,
    pub database_acquire_timeout_seconds: u64,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        let database_url =
            env::var("DATABASE_URL").map_err(|_| ConfigError::Missing("DATABASE_URL"))?;
        validate_database_url(&database_url)?;

        let bind_addr_value =
            env::var("BIND_ADDR").unwrap_or_else(|_| DEFAULT_BIND_ADDR.to_owned());
        let bind_addr =
            bind_addr_value
                .parse()
                .map_err(|source| ConfigError::InvalidBindAddress {
                    value: bind_addr_value,
                    source,
                })?;

        let database_max_connections = parse_positive_u32(
            "DATABASE_MAX_CONNECTIONS",
            DEFAULT_DATABASE_MAX_CONNECTIONS,
        )?;

        let database_acquire_timeout_seconds = parse_positive_u64(
            "DATABASE_ACQUIRE_TIMEOUT_SECONDS",
            DEFAULT_DATABASE_ACQUIRE_TIMEOUT_SECONDS,
        )?;

        Ok(Self {
            bind_addr,
            database_url,
            database_max_connections,
            database_acquire_timeout_seconds,
        })
    }
}

fn parse_positive_u32(name: &'static str, default: u32) -> Result<u32, ConfigError> {
    let Some(raw) = env::var(name).ok() else {
        return Ok(default);
    };

    let value = raw
        .parse::<u32>()
        .map_err(|source| ConfigError::InvalidPositiveInteger {
            name,
            value: raw.clone(),
            source,
        })?;

    if value == 0 {
        return Err(ConfigError::ZeroNotAllowed { name });
    }

    Ok(value)
}

fn parse_positive_u64(name: &'static str, default: u64) -> Result<u64, ConfigError> {
    let Some(raw) = env::var(name).ok() else {
        return Ok(default);
    };

    let value = raw
        .parse::<u64>()
        .map_err(|source| ConfigError::InvalidPositiveInteger {
            name,
            value: raw.clone(),
            source,
        })?;

    if value == 0 {
        return Err(ConfigError::ZeroNotAllowed { name });
    }

    Ok(value)
}

fn validate_database_url(database_url: &str) -> Result<(), ConfigError> {
    let normalized = database_url.to_ascii_lowercase();

    if !(normalized.starts_with("postgres://") || normalized.starts_with("postgresql://")) {
        return Err(ConfigError::InvalidDatabaseUrlScheme);
    }

    let secure_ssl_mode = [
        "sslmode=require",
        "sslmode=verify-ca",
        "sslmode=verify-full",
    ]
    .iter()
    .any(|mode| normalized.contains(mode));

    if !secure_ssl_mode {
        return Err(ConfigError::DatabaseTlsRequired);
    }

    Ok(())
}

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("missing required environment variable {0}")]
    Missing(&'static str),

    #[error("BIND_ADDR is invalid: {value}")]
    InvalidBindAddress {
        value: String,
        #[source]
        source: std::net::AddrParseError,
    },

    #[error("{name} must be a positive integer, got {value}")]
    InvalidPositiveInteger {
        name: &'static str,
        value: String,
        #[source]
        source: ParseIntError,
    },

    #[error("{name} must be greater than zero")]
    ZeroNotAllowed { name: &'static str },

    #[error("DATABASE_URL must use the postgres:// or postgresql:// scheme")]
    InvalidDatabaseUrlScheme,

    #[error("DATABASE_URL must explicitly require TLS with sslmode=require, verify-ca, or verify-full")]
    DatabaseTlsRequired,
}
