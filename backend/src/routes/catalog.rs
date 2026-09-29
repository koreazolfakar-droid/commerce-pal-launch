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

#[derive(Debug, Deserialize)]
pub struct ProductListQuery {
    limit: Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct PublicProduct {
    id: String,
    title: String,
    title_ar: Option<String>,
    handle: String,
    description: String,
    description_ar: Option<String>,
    brand_id: Option<String>,
    category_id: Option<String>,
    product_type: Option<String>,
    currency: String,
    base_price: String,
    compare_at_price: Option<String>,
    stock_quantity: i32,
    track_inventory: bool,
    allow_backorder: bool,
    featured: bool,
    best_seller: bool,
    specifications: serde_json::Value,
}

pub async fn list_products(
    State(state): State<AppState>,
    Query(query): Query<ProductListQuery>,
) -> Result<Json<Vec<PublicProduct>>, CatalogError> {
    let limit = query.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);

    let products = sqlx::query_as::<_, PublicProduct>(
        r#"
        SELECT
            id::text AS id,
            title,
            title_ar,
            handle,
            description,
            description_ar,
            brand_id::text AS brand_id,
            category_id::text AS category_id,
            product_type,
            currency,
            base_price::text AS base_price,
            compare_at_price::text AS compare_at_price,
            stock_quantity,
            track_inventory,
            allow_backorder,
            featured,
            best_seller,
            specifications
        FROM public.store_products
        WHERE status = 'active'
          AND (published_at IS NULL OR published_at <= now())
        ORDER BY sort_order ASC, created_at DESC
        LIMIT $1
        "#,
    )
    .bind(limit)
    .fetch_all(&state.db)
    .await
    .map_err(|error| {
        warn!(%error, "public catalog query failed");
        CatalogError::Unavailable
    })?;

    Ok(Json(products))
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
