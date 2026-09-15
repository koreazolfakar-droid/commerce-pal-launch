use serde::Serialize;
use wasm_bindgen::JsValue;
use worker::{
    Fetch, Headers, Method, Request, RequestInit, Response, Result, RouteContext,
};

use crate::product::{
    parse_product_payload, valid_shopify_api_version, valid_shopify_domain,
    validate_product_handle, Product, ProductPayloadError,
};

const PRODUCT_QUERY: &str = r#"
query SpaceCallProduct($handle: String!) {
  product(handle: $handle) {
    id
    title
    handle
    vendor
    productType
    availableForSale
    priceRange {
      minVariantPrice { amount currencyCode }
    }
    images(first: 1) {
      edges { node { url altText } }
    }
    variants(first: 1) {
      edges {
        node {
          id
          title
          availableForSale
          price { amount currencyCode }
          selectedOptions { name value }
        }
      }
    }
  }
}
"#;

#[derive(Serialize)]
struct ProductVariables<'a> {
    handle: &'a str,
}

#[derive(Serialize)]
struct StorefrontRequest<'a> {
    query: &'static str,
    variables: ProductVariables<'a>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProductResponse {
    ok: bool,
    source: &'static str,
    product: Product,
}

#[derive(Serialize)]
struct ErrorResponse {
    ok: bool,
    error: ApiError,
}

#[derive(Serialize)]
struct ApiError {
    code: &'static str,
    message: &'static str,
}

fn json_response<T: Serialize>(body: &T, status: u16) -> Result<Response> {
    let mut response = Response::from_json(body)?.with_status(status);
    response.headers_mut().set("Cache-Control", "no-store")?;
    response
        .headers_mut()
        .set("X-Content-Type-Options", "nosniff")?;
    Ok(response)
}

fn api_error(status: u16, code: &'static str, message: &'static str) -> Result<Response> {
    json_response(
        &ErrorResponse {
            ok: false,
            error: ApiError { code, message },
        },
        status,
    )
}

fn public_config(ctx: &RouteContext<()>, name: &str) -> Option<String> {
    ctx.var(name)
        .ok()
        .map(|value| value.to_string())
        .filter(|value| !value.trim().is_empty())
}

fn storefront_token(ctx: &RouteContext<()>) -> Option<String> {
    ctx.secret("SHOPIFY_STOREFRONT_TOKEN")
        .ok()
        .map(|value| value.to_string())
        .filter(|value| !value.trim().is_empty())
}

pub async fn product_by_handle(raw_handle: String, ctx: RouteContext<()>) -> Result<Response> {
    let handle = match validate_product_handle(&raw_handle) {
        Ok(handle) => handle.to_string(),
        Err(_) => {
            return api_error(
                400,
                "invalid_product_handle",
                "The product handle is invalid.",
            )
        }
    };

    let Some(domain) = public_config(&ctx, "SHOPIFY_STORE_DOMAIN") else {
        return api_error(
            500,
            "commerce_core_not_configured",
            "Commerce Core is not configured.",
        );
    };
    let Some(api_version) = public_config(&ctx, "SHOPIFY_API_VERSION") else {
        return api_error(
            500,
            "commerce_core_not_configured",
            "Commerce Core is not configured.",
        );
    };
    let Some(token) = storefront_token(&ctx) else {
        return api_error(
            500,
            "commerce_core_not_configured",
            "Commerce Core is not configured.",
        );
    };

    if !valid_shopify_domain(&domain) || !valid_shopify_api_version(&api_version) {
        return api_error(
            500,
            "commerce_core_invalid_config",
            "Commerce Core configuration is invalid.",
        );
    }

    let storefront_url = format!("https://{domain}/api/{api_version}/graphql.json");
    let body = serde_json::to_string(&StorefrontRequest {
        query: PRODUCT_QUERY,
        variables: ProductVariables { handle: &handle },
    })
    .map_err(|_| worker::Error::RustError("failed to encode Shopify request".into()))?;

    let headers = Headers::new();
    headers.set("Content-Type", "application/json; charset=utf-8")?;
    headers.set("Accept", "application/json")?;
    headers.set("Cache-Control", "no-store")?;
    headers.set("X-Shopify-Storefront-Access-Token", &token)?;

    let mut init = RequestInit::new();
    init.with_method(Method::Post)
        .with_headers(headers)
        .with_body(Some(JsValue::from_str(&body)));

    let outbound = match Request::new_with_init(&storefront_url, &init) {
        Ok(request) => request,
        Err(_) => {
            return api_error(
                500,
                "commerce_core_request_error",
                "Commerce Core could not prepare the Shopify request.",
            )
        }
    };

    let mut upstream = match Fetch::Request(outbound).send().await {
        Ok(response) => response,
        Err(_) => {
            return api_error(
                502,
                "shopify_unreachable",
                "Shopify is temporarily unreachable.",
            )
        }
    };

    if upstream.status_code() != 200 {
        return api_error(
            502,
            "shopify_upstream_error",
            "Shopify returned an upstream error.",
        );
    }

    let payload = match upstream.text().await {
        Ok(payload) => payload,
        Err(_) => {
            return api_error(
                502,
                "shopify_invalid_response",
                "Shopify returned an unreadable response.",
            )
        }
    };

    match parse_product_payload(&payload) {
        Ok(product) => json_response(
            &ProductResponse {
                ok: true,
                source: "shopify",
                product,
            },
            200,
        ),
        Err(ProductPayloadError::NotFound) => {
            api_error(404, "product_not_found", "The product was not found.")
        }
        Err(
            ProductPayloadError::GraphQl
            | ProductPayloadError::InvalidJson
            | ProductPayloadError::MissingData,
        ) => api_error(
            502,
            "shopify_invalid_response",
            "Shopify returned an invalid product response.",
        ),
    }
}
