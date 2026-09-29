use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::warn;

use crate::state::AppState;

const DEFAULT_LIMIT: i64 = 24;
const MAX_LIMIT: i64 = 100;
const PUBLIC_PRODUCT_SELECT: &str = "id,title,description,description_html,handle,brand_id,category_id,product_type,specifications,created_at,updated_at,seo_title,seo_description,tags,base_price,compare_at_price,currency,track_inventory,allow_backorder,stock_quantity,best_seller,sort_order";

#[derive(Debug, Deserialize)]
pub struct ProductListQuery {
    limit: Option<i64>,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct PublicProduct {
    id: String,
    title: String,
    description: String,
    description_html: Option<String>,
    handle: String,
    brand_id: Option<String>,
    category_id: Option<String>,
    product_type: Option<String>,
    specifications: serde_json::Value,
    created_at: String,
    updated_at: String,
    seo_title: Option<String>,
    seo_description: Option<String>,
    tags: Vec<String>,
    base_price: serde_json::Value,
    compare_at_price: Option<serde_json::Value>,
    currency: String,
    track_inventory: bool,
    allow_backorder: bool,
    stock_quantity: i32,
    best_seller: bool,
    sort_order: i32,
}

pub async fn list_products(
    State(state): State<AppState>,
    Query(query): Query<ProductListQuery>,
) -> Result<Json<Vec<PublicProduct>>, CatalogError> {
    let limit = query.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);

    let products = if let Some(pool) = state.db.as_ref() {
        query_postgres(pool, limit).await?
    } else {
        query_supabase(&state, limit).await?
    };

    Ok(Json(products))
}

async fn query_postgres(
    pool: &sqlx::PgPool,
    limit: i64,
) -> Result<Vec<PublicProduct>, CatalogError> {
    sqlx::query_as::<_, PublicProduct>(
        r#"
        SELECT
            id::text AS id,
            title,
            description,
            description_html,
            handle,
            brand_id::text AS brand_id,
            category_id::text AS category_id,
            product_type,
            specifications,
            created_at::text AS created_at,
            updated_at::text AS updated_at,
            seo_title,
            seo_description,
            tags,
            to_jsonb(base_price) AS base_price,
            CASE
                WHEN compare_at_price IS NULL THEN NULL
                ELSE to_jsonb(compare_at_price)
            END AS compare_at_price,
            currency,
            track_inventory,
            allow_backorder,
            stock_quantity,
            best_seller,
            sort_order
        FROM public.store_products
        WHERE status = 'active'
          AND (published_at IS NULL OR published_at <= now())
        ORDER BY sort_order ASC, created_at DESC
        LIMIT $1
        "#,
    )
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|error| {
        warn!(%error, "Postgres public catalog query failed");
        CatalogError::Unavailable
    })
}

async fn query_supabase(
    state: &AppState,
    limit: i64,
) -> Result<Vec<PublicProduct>, CatalogError> {
    let url = format!("{}/rest/v1/store_products", state.supabase_url);
    let limit = limit.to_string();

    let response = state
        .http
        .get(url)
        .header("apikey", &state.supabase_publishable_key)
        .query(&[
            ("select", PUBLIC_PRODUCT_SELECT),
            ("order", "sort_order.asc,created_at.desc"),
            ("limit", limit.as_str()),
        ])
        .send()
        .await
        .map_err(|error| {
            warn!(%error, "Supabase public catalog request failed");
            CatalogError::Unavailable
        })?;

    if !response.status().is_success() {
        warn!(status = %response.status(), "Supabase public catalog returned an unexpected status");
        return Err(CatalogError::Unavailable);
    }

    response.json::<Vec<PublicProduct>>().await.map_err(|error| {
        warn!(%error, "Supabase public catalog returned an invalid payload");
        CatalogError::Unavailable
    })
}

#[derive(Debug)]
pub enum CatalogError {
    Unavailable,
}

impl IntoResponse for CatalogError {
    fn into_response(self) -> Response {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(CatalogErrorBody {
                error: "catalog_unavailable",
            }),
        )
            .into_response()
    }
}

#[derive(Serialize)]
struct CatalogErrorBody {
    error: &'static str,
}
