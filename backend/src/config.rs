use std::{env, net::IpAddr, time::Duration};

use thiserror::Error;
use url::Url;

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum AppEnv {
    Development,
    Production,
}

pub struct Config {
    pub app_env: AppEnv,
    pub host: IpAddr,
    pub port: u16,
    pub database_url: String,
    pub database_max_connections: u32,
    pub allowed_origins: Vec<String>,
    pub rust_log: String,
}

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("missing required environment variable: {0}")]
    Missing(&'static str),
    #[error("invalid environment variable: {0}")]
    Invalid(&'static str),
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let app_env = match required("APP_ENV")?.as_str() {
            "development" => AppEnv::Development,
            "production" => AppEnv::Production,
            _ => return Err(ConfigError::Invalid("APP_ENV")),
        };
        let host = required("HOST")?
            .parse()
            .map_err(|_| ConfigError::Invalid("HOST (must be an IP address)"))?;
        let port = required("PORT")?
            .parse::<u16>()
            .ok()
            .filter(|p| *p != 0)
            .ok_or(ConfigError::Invalid("PORT"))?;
        let database_url = required("DATABASE_URL")?;
        validate_database_url(&database_url, app_env)?;
        let database_max_connections = env::var("DATABASE_MAX_CONNECTIONS")
            .unwrap_or_else(|_| "5".to_owned())
            .parse::<u32>()
            .ok()
            .filter(|n| (1..=20).contains(n))
            .ok_or(ConfigError::Invalid("DATABASE_MAX_CONNECTIONS (1-20)"))?;

        let supabase_url = Url::parse(&required("SUPABASE_URL")?)
            .map_err(|_| ConfigError::Invalid("SUPABASE_URL"))?;
        if supabase_url.scheme() != "https"
            || supabase_url.host_str().is_none()
            || !supabase_url.username().is_empty()
            || supabase_url.password().is_some()
            || supabase_url.query().is_some()
            || supabase_url.fragment().is_some()
        {
            return Err(ConfigError::Invalid("SUPABASE_URL"));
        }
        // Validate the phase-2 inputs now. The service does not consume either
        // credential in phase 1, so there is no reason to retain them in state.
        required("SUPABASE_ANON_KEY")?;
        let rust_log = required("RUST_LOG")?;
        let allowed_origins = parse_origins(&required("ALLOWED_ORIGINS")?, app_env)?;
        Ok(Self {
            app_env,
            host,
            port,
            database_url,
            database_max_connections,
            allowed_origins,
            rust_log,
        })
    }

    pub fn database_timeout(&self) -> Duration {
        Duration::from_secs(5)
    }
}

fn validate_database_url(value: &str, app_env: AppEnv) -> Result<(), ConfigError> {
    let url = Url::parse(value).map_err(|_| ConfigError::Invalid("DATABASE_URL"))?;
    if !matches!(url.scheme(), "postgres" | "postgresql") || url.host_str().is_none() {
        return Err(ConfigError::Invalid("DATABASE_URL"));
    }
    let ssl_modes: Vec<_> = url
        .query_pairs()
        .filter(|(key, _)| key == "sslmode")
        .map(|(_, value)| value.into_owned())
        .collect();
    if app_env == AppEnv::Production
        && (ssl_modes.len() != 1
            || !matches!(
                ssl_modes[0].as_str(),
                "require" | "verify-ca" | "verify-full"
            ))
    {
        return Err(ConfigError::Invalid(
            "DATABASE_URL (TLS required in production)",
        ));
    }
    Ok(())
}

fn required(name: &'static str) -> Result<String, ConfigError> {
    env::var(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .ok_or(ConfigError::Missing(name))
}

fn parse_origins(value: &str, app_env: AppEnv) -> Result<Vec<String>, ConfigError> {
    let origins: Vec<String> = value.split(',').map(str::trim).map(str::to_owned).collect();
    if origins.is_empty()
        || origins.iter().any(|origin| {
            let Ok(url) = Url::parse(origin) else {
                return true;
            };
            let loopback = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
            !matches!(url.scheme(), "http" | "https")
                || (app_env == AppEnv::Production && (url.scheme() != "https" || loopback))
                || (url.scheme() == "http" && !loopback)
                || url.host_str().is_none()
                || url.username() != ""
                || url.password().is_some()
                || url.path() != "/"
                || url.query().is_some()
                || url.fragment().is_some()
                || url.origin().ascii_serialization() != *origin
        })
    {
        return Err(ConfigError::Invalid("ALLOWED_ORIGINS"));
    }
    Ok(origins)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn production_rejects_insecure_and_wildcard_origins() {
        assert!(parse_origins("*", AppEnv::Production).is_err());
        assert!(parse_origins("http://spacecallapp.store", AppEnv::Production).is_err());
        assert!(parse_origins("https://spacecallapp.store", AppEnv::Production).is_ok());
        assert!(parse_origins("https://spacecallapp.store/other", AppEnv::Production).is_err());
    }

    #[test]
    fn development_allows_local_http_only() {
        assert!(parse_origins("http://localhost:5173", AppEnv::Development).is_ok());
        assert!(parse_origins("http://elsewhere.test", AppEnv::Development).is_err());
    }

    #[test]
    fn production_requires_database_tls() {
        assert!(validate_database_url("postgresql://db.example/test", AppEnv::Production).is_err());
        assert!(
            validate_database_url(
                "postgresql://db.example/test?sslmode=require",
                AppEnv::Production
            )
            .is_ok()
        );
        assert!(
            validate_database_url(
                "postgresql://db.example/test?sslmode=require&sslmode=disable",
                AppEnv::Production
            )
            .is_err()
        );
    }
}
