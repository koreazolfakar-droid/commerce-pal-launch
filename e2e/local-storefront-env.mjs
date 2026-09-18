// Browser E2E must be deterministic and independent of Shopify and live Supabase data.
process.env.VITE_STOREFRONT_DATA_SOURCE = "local";
