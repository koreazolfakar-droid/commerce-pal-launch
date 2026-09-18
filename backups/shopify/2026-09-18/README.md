# Space Call Restore Point — 2026-09-18

This branch is a disaster-recovery snapshot for the Space Call storefront.

## Code
- Safe code restore branch: `backup-spacecall-2026-09-18`
- Shopify data snapshot branch: `backup-spacecall-2026-09-18-shopify`

## Shopify snapshot
- Products: 161
- Collections: 60
- Product snapshot files: 9
- Collection snapshot files: 12

The snapshot includes product/variant data, pricing, inventory references and available quantities, media URLs, metafields, collection rules, manual collection membership, collection SEO, and collection metafields.

## Restore safety rules
1. Do not blindly restore orders or customers.
2. Do not reset inventory if legitimate sales occurred after the snapshot; compare first.
3. Restore only Shopify resources that were damaged or unintentionally changed.
4. API tokens/secrets are intentionally not stored here.
5. Restore code and Shopify data separately so a frontend rollback never overwrites newer business transactions.
