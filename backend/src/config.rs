use std::{env, net::SocketAddr, num::ParseIntError};

use thiserror::Error;

const DEFAULT_BIND_ADDR: &str = "0.0.0.0:8080";
const DEFAULT_DATABASE_MAX_CONNECTIONS: u32 = 5;
const DEFAULT_DATABASE_ACQUIRE_TIMEOUT_SECONDS: u64 = 5;

#[derive(Clone)]
pub struct AppConfig {
    pub bind_addr: SocketAddr,
    pub database_url: Option<String>,
    pub database_max_connections: u32,
    pub database_acquire_timeout_seconds: u64,
    pub supabase_url: String,
    pub supabase_publishable_key: String,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        let database_url = env::var("DATABASE_URL")
            .ok()
            .filter(|value| !value.trim().is_empty());

        if let Some(database_url) = database_url.as_deref() {
            validate_database_url(database_url)?;
        }

        let supabase_url =
            env::var("SUPABASE_URL").map_err(|_| ConfigError::Missing("SUPABASE_URL"))?;
        validate_supabase_url(&supabase_url)?;

        let supabase_publishable_key = env::var("SUPABASE_PUBLISHABLE_KEY")
            .map_err(|_| ConfigError::Missing("SUPABASE_PUBLISHABLE_KEY"))?;
        if supabase_publishable_key.trim().is_empty() {
            return Err(ConfigError::Empty("SUPABASE_PUBLISHABLE_KEY"));
        }

        let bind_addr_value = env::var("BIND_ADDR").unwrap_or_else(|_| {
            env::var("PORT")
                .map(|port| format!("0.0.0.0:{port}"))
                .unwrap_or_else(|_| DEFAULT_BIND_ADDR.to_owned())
        });
        let bind_addr =
            bind_addr_value
                .parse()
                .map_err(|source| ConfigError::InvalidBindAddress {
                    value: bind_addr_value,
                    source,
                })?;

        let database_max_connections =
            parse_positive_u32("DATABASE_MAX_CONNECTIONS", DEFAULT_DATABASE_MAX_CONNECTIONS)?;

        let database_acquire_timeout_seconds = parse_positive_u64(
            "DATABASE_ACQUIRE_TIMEOUT_SECONDS",
            DEFAULT_DATABASE_ACQUIRE_TIMEOUT_SECONDS,
        )?;

        Ok(Self {
            bind_addr,
            database_url,
            database_max_connections,
            database_acquire_timeout_seconds,
            supabase_url: supabase_url.trim_end_matches('/').to_owned(),
            supabase_publishable_key,
        })
    }
}

fn parse_positive_u32(name: &'static str, default: u32) -> Result<u32, ConfigError> {
    let Ok(raw) = env::var(name) else {
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

    let ssl_modes: Vec<&str> = normalized
        .split_once('?')
        .map(|(_, query)| {
            query
                .split('&')
                .filter_map(|parameter| {
                    let (key, value) = parameter.split_once('=')?;
                    (key == "sslmode").then_some(value)
                })
                .collect()
        })
        .unwrap_or_default();

    if ssl_modes.len() != 1 {
        return Err(ConfigError::DatabaseTlsRequired);
    }

    if !matches!(ssl_modes[0], "require" | "verify-ca" | "verify-full") {
        return Err(ConfigError::DatabaseTlsRequired);
    }

    Ok(())
}

fn validate_supabase_url(value: &str) -> Result<(), ConfigError> {
    let normalized = value.to_ascii_lowercase();
    if !normalized.starts_with("https://") || normalized.contains('@') {
        return Err(ConfigError::InvalidSupabaseUrl);
    }
    Ok(())
}

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("missing required environment variable {0}")]
    Missing(&'static str),

    #[error("{0} must not be empty")]
    Empty(&'static str),

    #[error("SUPABASE_URL must be an HTTPS origin without embedded credentials")]
    InvalidSupabaseUrl,

    #[error("BIND_ADDR/PORT is invalid: {value}")]
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

    #[error(
        "DATABASE_URL must explicitly require TLS with sslmode=require, verify-ca, or verify-full"
    )]
    DatabaseTlsRequired,
}

#[cfg(test)]
mod tests {
    use super::{ConfigError, validate_database_url};

    #[test]
    fn accepts_explicit_secure_postgres_ssl_modes() {
        for mode in ["require", "verify-ca", "verify-full"] {
            let url =
                format!("postgresql://user:password@db.example.com:5432/postgres?sslmode={mode}");
            assert!(validate_database_url(&url).is_ok());
        }
    }

    #[test]
    fn rejects_missing_or_insecure_ssl_modes() {
        for url in [
            "postgresql://user:password@db.example.com:5432/postgres",
            "postgresql://user:password@db.example.com:5432/postgres?sslmode=disable",
            "postgresql://user:password@db.example.com:5432/postgres?sslmode=prefer",
            "postgresql://user:password@db.example.com:5432/postgres?sslmode=requirement",
            "postgresql://user:password@db.example.com:5432/postgres?sslmode=require&sslmode=disable",
            "postgresql://user:password@db.example.com:5432/postgres?sslmode=disable&sslmode=require",
        ] {
            assert!(matches!(
                validate_database_url(url),
                Err(ConfigError::DatabaseTlsRequired)
            ));
        }
    }

    #[test]
    fn rejects_non_postgres_schemes() {
        assert!(matches!(
            validate_database_url("https://example.com?sslmode=require"),
            Err(ConfigError::InvalidDatabaseUrlScheme)
        ));
    }
}
