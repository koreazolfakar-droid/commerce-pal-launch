use std::env;

use image::GenericImageView;
use serde::Deserialize;
use tokio::time::{sleep, Duration};
use tracing::{info, warn};

use crate::state::AppState;

const TOP_PRODUCT_LIMIT: usize = 24;
const THUMBNAIL_EDGE: u32 = 480;
const MAX_SOURCE_BYTES: u64 = 20 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES: usize = 1024 * 1024;

#[derive(Debug, Deserialize)]
struct ProductIdRow {
    id: String,
}

#[derive(Debug, Deserialize)]
struct ProductImageRow {
    id: String,
    product_id: String,
    url: String,
}

pub fn spawn_if_enabled(state: AppState) {
    let token = env::var("THUMBNAIL_BACKFILL_TOKEN")
        .ok()
        .filter(|value| !value.trim().is_empty());

    let Some(token) = token else {
        return;
    };

    tokio::spawn(async move {
        sleep(Duration::from_secs(10)).await;

        match run(&state, token.trim()).await {
            Ok((processed, source_bytes, thumbnail_bytes)) => {
                info!(
                    processed,
                    source_bytes,
                    thumbnail_bytes,
                    saved_bytes = source_bytes.saturating_sub(thumbnail_bytes),
                    "product thumbnail backfill completed"
                );
            }
            Err(error) => {
                warn!(%error, "product thumbnail backfill failed");
            }
        }
    });
}

async fn run(state: &AppState, token: &str) -> Result<(usize, u64, u64), String> {
    let products_url = format!("{}/rest/v1/store_products", state.supabase_url);
    let product_response = state
        .http
        .get(products_url)
        .header("apikey", &state.supabase_publishable_key)
        .query(&[
            ("select", "id"),
            ("status", "eq.active"),
            ("order", "sort_order.asc,created_at.desc"),
            ("limit", "24"),
        ])
        .send()
        .await
        .map_err(|error| format!("product query failed: {error}"))?;

    if !product_response.status().is_success() {
        return Err(format!(
            "product query returned HTTP {}",
            product_response.status()
        ));
    }

    let products = product_response
        .json::<Vec<ProductIdRow>>()
        .await
        .map_err(|error| format!("product payload invalid: {error}"))?;

    let product_ids = products
        .into_iter()
        .take(TOP_PRODUCT_LIMIT)
        .map(|row| row.id)
        .collect::<Vec<_>>();

    if product_ids.is_empty() {
        return Ok((0, 0, 0));
    }

    let images_url = format!("{}/rest/v1/store_product_images", state.supabase_url);
    let product_filter = format!("in.({})", product_ids.join(","));
    let image_response = state
        .http
        .get(images_url)
        .header("apikey", &state.supabase_publishable_key)
        .query(&[
            ("select", "id,product_id,url"),
            ("product_id", product_filter.as_str()),
            ("is_primary", "eq.true"),
            ("thumbnail_url", "is.null"),
            ("limit", "24"),
        ])
        .send()
        .await
        .map_err(|error| format!("image query failed: {error}"))?;

    if !image_response.status().is_success() {
        return Err(format!(
            "image query returned HTTP {}",
            image_response.status()
        ));
    }

    let images = image_response
        .json::<Vec<ProductImageRow>>()
        .await
        .map_err(|error| format!("image payload invalid: {error}"))?;

    let commit_url = format!(
        "{}/functions/v1/commit-product-thumbnail-backfill",
        state.supabase_url
    );

    let mut processed = 0usize;
    let mut total_source_bytes = 0u64;
    let mut total_thumbnail_bytes = 0u64;

    for row in images {
        let source_response = state
            .http
            .get(&row.url)
            .send()
            .await
            .map_err(|error| format!("source download failed for {}: {error}", row.id))?;

        if !source_response.status().is_success() {
            return Err(format!(
                "source download returned HTTP {} for {}",
                source_response.status(),
                row.id
            ));
        }

        if source_response
            .content_length()
            .is_some_and(|size| size > MAX_SOURCE_BYTES)
        {
            return Err(format!("source image too large for {}", row.id));
        }

        let source = source_response
            .bytes()
            .await
            .map_err(|error| format!("source body failed for {}: {error}", row.id))?;

        if source.is_empty() || source.len() as u64 > MAX_SOURCE_BYTES {
            return Err(format!("source image size invalid for {}", row.id));
        }

        let decoded = image::load_from_memory(&source)
            .map_err(|error| format!("decode failed for {}: {error}", row.id))?;
        let (width, height) = decoded.dimensions();
        let resized = if width > THUMBNAIL_EDGE || height > THUMBNAIL_EDGE {
            decoded.resize(
                THUMBNAIL_EDGE,
                THUMBNAIL_EDGE,
                image::imageops::FilterType::Lanczos3,
            )
        } else {
            decoded
        };

        let encoder = webp::Encoder::from_image(&resized)
            .map_err(|error| format!("WebP encoder rejected {}: {error}", row.id))?;
        let encoded = encoder.encode(76.0);
        let thumbnail = encoded.to_vec();

        if thumbnail.is_empty() || thumbnail.len() > MAX_THUMBNAIL_BYTES {
            return Err(format!("thumbnail size invalid for {}", row.id));
        }

        let commit_response = state
            .http
            .post(&commit_url)
            .header("x-backfill-token", token)
            .header("x-image-id", &row.id)
            .header("x-product-id", &row.product_id)
            .header("content-type", "image/webp")
            .body(thumbnail.clone())
            .send()
            .await
            .map_err(|error| format!("thumbnail commit failed for {}: {error}", row.id))?;

        if !commit_response.status().is_success() {
            let status = commit_response.status();
            let body = commit_response.text().await.unwrap_or_default();
            return Err(format!(
                "thumbnail commit returned HTTP {status} for {}: {body}",
                row.id
            ));
        }

        total_source_bytes += source.len() as u64;
        total_thumbnail_bytes += thumbnail.len() as u64;
        processed += 1;

        info!(
            image_id = %row.id,
            product_id = %row.product_id,
            source_bytes = source.len(),
            thumbnail_bytes = thumbnail.len(),
            "product thumbnail backfilled"
        );
    }

    Ok((processed, total_source_bytes, total_thumbnail_bytes))
}
