use serde::{Deserialize, Serialize};

pub const MAX_PRODUCT_HANDLE_LEN: usize = 128;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProductHandleError {
    Empty,
    TooLong,
    InvalidCharacters,
    InvalidBoundary,
}

pub fn validate_product_handle(raw: &str) -> Result<&str, ProductHandleError> {
    let handle = raw.trim();
    if handle.is_empty() {
        return Err(ProductHandleError::Empty);
    }
    if handle.len() > MAX_PRODUCT_HANDLE_LEN {
        return Err(ProductHandleError::TooLong);
    }
    if handle.starts_with('-') || handle.ends_with('-') {
        return Err(ProductHandleError::InvalidBoundary);
    }
    if !handle
        .bytes()
        .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
    {
        return Err(ProductHandleError::InvalidCharacters);
    }
    Ok(handle)
}

pub fn valid_shopify_domain(domain: &str) -> bool {
    let domain = domain.trim();
    !domain.is_empty()
        && domain.len() <= 253
        && domain.ends_with(".myshopify.com")
        && !domain.contains('/')
        && !domain.contains(':')
        && domain.bytes().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-' || byte == b'.'
        })
}

pub fn valid_shopify_api_version(version: &str) -> bool {
    let bytes = version.as_bytes();
    bytes.len() == 7
        && bytes[0..4].iter().all(u8::is_ascii_digit)
        && bytes[4] == b'-'
        && bytes[5..7].iter().all(u8::is_ascii_digit)
        && matches!(&version[5..7], "01" | "04" | "07" | "10")
}

#[derive(Debug, Deserialize)]
pub struct GraphQlResponse {
    pub data: Option<ProductData>,
    #[serde(default)]
    pub errors: Vec<GraphQlError>,
}

#[derive(Debug, Deserialize)]
pub struct GraphQlError {
    #[allow(dead_code)]
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct ProductData {
    pub product: Option<Product>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Product {
    pub id: String,
    pub title: String,
    pub handle: String,
    pub vendor: Option<String>,
    pub product_type: Option<String>,
    pub available_for_sale: bool,
    pub price_range: PriceRange,
    pub images: ImageConnection,
    pub variants: VariantConnection,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PriceRange {
    pub min_variant_price: Money,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Money {
    pub amount: String,
    pub currency_code: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct ImageConnection {
    pub edges: Vec<ImageEdge>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct ImageEdge {
    pub node: ProductImage,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProductImage {
    pub url: String,
    pub alt_text: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct VariantConnection {
    pub edges: Vec<VariantEdge>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct VariantEdge {
    pub node: ProductVariant,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProductVariant {
    pub id: String,
    pub title: String,
    pub available_for_sale: bool,
    pub price: Money,
    pub selected_options: Vec<SelectedOption>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct SelectedOption {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProductPayloadError {
    InvalidJson,
    GraphQl,
    MissingData,
    NotFound,
}

pub fn parse_product_payload(payload: &str) -> Result<Product, ProductPayloadError> {
    let response: GraphQlResponse =
        serde_json::from_str(payload).map_err(|_| ProductPayloadError::InvalidJson)?;
    if !response.errors.is_empty() {
        return Err(ProductPayloadError::GraphQl);
    }
    response
        .data
        .ok_or(ProductPayloadError::MissingData)?
        .product
        .ok_or(ProductPayloadError::NotFound)
}

#[cfg(test)]
mod tests {
    use super::*;

    const PRODUCT_JSON: &str = r#"{
      "data": {
        "product": {
          "id": "gid://shopify/Product/1",
          "title": "iPhone Test",
          "handle": "iphone-test",
          "vendor": "Apple",
          "productType": "Phones",
          "availableForSale": true,
          "priceRange": {"minVariantPrice": {"amount": "999.00", "currencyCode": "USD"}},
          "images": {"edges": [{"node": {"url": "https://cdn.shopify.com/test.jpg", "altText": "iPhone"}}]},
          "variants": {"edges": [{"node": {
            "id": "gid://shopify/ProductVariant/1",
            "title": "Default Title",
            "availableForSale": true,
            "price": {"amount": "999.00", "currencyCode": "USD"},
            "selectedOptions": [{"name": "Title", "value": "Default Title"}]
          }}]}
        }
      }
    }"#;

    #[test]
    fn accepts_normal_shopify_handles() {
        assert_eq!(
            validate_product_handle("iphone-18-pro"),
            Ok("iphone-18-pro")
        );
        assert_eq!(validate_product_handle("poco-f7"), Ok("poco-f7"));
    }

    #[test]
    fn rejects_empty_or_unsafe_handles() {
        assert_eq!(validate_product_handle(""), Err(ProductHandleError::Empty));
        assert_eq!(
            validate_product_handle("../admin"),
            Err(ProductHandleError::InvalidCharacters)
        );
        assert_eq!(
            validate_product_handle("iphone/variant"),
            Err(ProductHandleError::InvalidCharacters)
        );
        assert_eq!(
            validate_product_handle("-iphone"),
            Err(ProductHandleError::InvalidBoundary)
        );
    }

    #[test]
    fn validates_shopify_configuration_values() {
        assert!(valid_shopify_domain("dj6qeq-j9.myshopify.com"));
        assert!(!valid_shopify_domain("example.com"));
        assert!(!valid_shopify_domain("dj6qeq-j9.myshopify.com/evil"));
        assert!(valid_shopify_api_version("2026-07"));
        assert!(!valid_shopify_api_version("2026-08"));
    }

    #[test]
    fn parses_a_valid_product_response() {
        let product = parse_product_payload(PRODUCT_JSON).expect("valid product response");
        assert_eq!(product.handle, "iphone-test");
        assert_eq!(product.price_range.min_variant_price.amount, "999.00");
        assert_eq!(product.variants.edges.len(), 1);
    }

    #[test]
    fn maps_missing_product_to_not_found() {
        let payload = r#"{"data":{"product":null}}"#;
        assert_eq!(
            parse_product_payload(payload),
            Err(ProductPayloadError::NotFound)
        );
    }

    #[test]
    fn rejects_graphql_and_malformed_payloads() {
        let graphql_error = r#"{"data":null,"errors":[{"message":"upstream failure"}]}"#;
        assert_eq!(
            parse_product_payload(graphql_error),
            Err(ProductPayloadError::GraphQl)
        );
        assert_eq!(
            parse_product_payload("not-json"),
            Err(ProductPayloadError::InvalidJson)
        );
    }
}
