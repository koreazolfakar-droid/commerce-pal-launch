use reqwest::Client;
use sqlx::PgPool;

use crate::config::AppConfig;

#[derive(Clone)]
pub struct AppState {
    pub db: Option<PgPool>,
    pub http: Client,
    pub supabase_url: String,
    pub supabase_publishable_key: String,
}

impl AppState {
    pub fn new(db: Option<PgPool>, config: &AppConfig) -> Self {
        Self {
            db,
            http: Client::new(),
            supabase_url: config.supabase_url.clone(),
            supabase_publishable_key: config.supabase_publishable_key.clone(),
        }
    }
}
