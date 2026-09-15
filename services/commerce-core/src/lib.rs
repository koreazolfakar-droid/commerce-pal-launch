mod product;
mod shopify;

use serde::Serialize;
use worker::{event, Context, Env, Request, Response, Result, Router};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    version: &'static str,
}

fn health() -> Result<Response> {
    Response::from_json(&HealthResponse {
        status: "ok",
        service: "space-call-commerce-core",
        version: env!("CARGO_PKG_VERSION"),
    })
}

#[event(fetch)]
pub async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    Router::new()
        .get("/health", |_req, _ctx| health())
        .get_async("/products/:handle", |_req, ctx| async move {
            let handle = ctx.param("handle").cloned().unwrap_or_default();
            shopify::product_by_handle(handle, ctx).await
        })
        .run(req, env)
        .await
}
