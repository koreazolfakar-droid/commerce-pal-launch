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
const MAX_LIMIT: i64 = 500;
const PUBLIC_PRODUCT_SELECT: &str = "id,title,title_ar,handle,description,description_ar,description_html,brand_id,category_id,product_type,currency,base_price,compare_at_price,stock_quantity,track_inventory,allow_backorder,featured,best_seller,specifications,created_at,updated_at,seo_title,seo_description,tags,sort_order";
const PUBLIC_CARD_SELECT: &str = "id,title,handle,brand_id,product_type,currency,base_price,compare_at_price,stock_quantity,track_inventory,allow_backorder,created_at,updated_at,tags,brand:cms_brands!store_products_brand_id_fkey(id,name,slug),variants:store_product_variants(id,title,price,compare_at_price,is_active,track_inventory,allow_backorder,stock_quantity,sku,barcode,image_url,options,sort_order),images:store_product_images(url,alt_text,is_primary,sort_order)";

#[derive(Debug, Deserialize)]
pub struct ProductListQuery {
    limit: Option<i64>,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct PublicProduct {
    id: String,
    title: String,
    title_ar: Option<String>,
    handle: String,
    description: String,
    description_ar: Option<String>,
    description_html: Option<String>,
    brand_id: Option<String>,
    category_id: Option<String>,
    product_type: Option<String>,
    currency: String,
    base_price: serde_json::Value,
    compare_at_price: Option<serde_json::Value>,
    stock_quantity: i32,
    track_inventory: bool,
    allow_backorder: bool,
    featured: bool,
    best_seller: bool,
    specifications: serde_json::Value,
    created_at: String,
    updated_at: String,
    seo_title: Option<String>,
    seo_description: Option<String>,
    tags: Vec<String>,
    sort_order: i32,
}


#[derive(Debug, Deserialize, Serialize)]
pub struct PublicCatalogCard {
    id: String,
    title: String,
    handle: String,
    brand_id: Option<String>,
    product_type: Option<String>,
    currency: String,
    base_price: serde_json::Value,
    compare_at_price: Option<serde_json::Value>,
    stock_quantity: i32,
    track_inventory: bool,
    allow_backorder: bool,
    created_at: String,
    updated_at: String,
    tags: Vec<String>,
    brand: Option<PublicCatalogBrand>,
    variants: Vec<PublicCatalogVariant>,
    images: Vec<PublicCatalogImage>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PublicCatalogBrand {
    id: String,
    name: String,
    slug: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PublicCatalogVariant {
    id: String,
    title: String,
    price: serde_json::Value,
    compare_at_price: Option<serde_json::Value>,
    is_active: bool,
    track_inventory: bool,
    allow_backorder: bool,
    stock_quantity: i32,
    sku: Option<String>,
    barcode: Option<String>,
    image_url: Option<String>,
    options: serde_json::Value,
    sort_order: i32,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PublicCatalogImage {
    url: String,
    alt_text: Option<String>,
    is_primary: bool,
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


pub async fn list_cards(
    State(state): State<AppState>,
    Query(query): Query<ProductListQuery>,
) -> Result<Json<Vec<PublicCatalogCard>>, CatalogError> {
    let limit = query.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, DEFAULT_LIMIT);
    let url = format!("{}/rest/v1/store_products", state.supabase_url);
    let limit = limit.to_string();

    let response = state
        .http
        .get(url)
        .header("apikey", &state.supabase_publishable_key)
        .query(&[
            ("select", PUBLIC_CARD_SELECT),
            ("order", "sort_order.asc,created_at.desc"),
            ("variants.is_active", "eq.true"),
            ("variants.order", "sort_order.asc"),
            ("images.order", "is_primary.desc,sort_order.asc"),
            ("limit", limit.as_str()),
        ])
        .send()
        .await
        .map_err(|error| {
            warn!(%error, "Supabase catalog card request failed");
            CatalogError::Unavailable
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        warn!(%status, body = %body, "Supabase catalog card returned an unexpected status");
        return Err(CatalogError::Unavailable);
    }

    response
        .json::<Vec<PublicCatalogCard>>()
        .await
        .map(Json)
        .map_err(|error| {
            warn!(%error, "Supabase catalog card returned an invalid payload");
            CatalogError::Unavailable
        })
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
            title_ar,
            handle,
            description,
            description_ar,
            description_html,
            brand_id::text AS brand_id,
            category_id::text AS category_id,
            product_type,
            currency,
            to_jsonb(base_price) AS base_price,
            CASE
                WHEN compare_at_price IS NULL THEN NULL
                ELSE to_jsonb(compare_at_price)
            END AS compare_at_price,
            stock_quantity,
            track_inventory,
            allow_backorder,
            featured,
            best_seller,
            specifications,
            created_at::text AS created_at,
            updated_at::text AS updated_at,
            seo_title,
            seo_description,
            tags,
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
