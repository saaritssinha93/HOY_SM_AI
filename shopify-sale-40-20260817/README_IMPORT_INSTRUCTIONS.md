# Shopify 40% sale import

Generated from `products_export_1-2.csv`. The original download was not modified.

## Safe result

- Active variants receiving a lower sale price: 118
- Excluded variants left unchanged: 15 across 12 products
- Draft variants left unchanged: 22
- Existing deeper discounts preserved without raising prices: 2
- Pricing anomalies held for manual review: 1
- Formula: positive existing Compare-at Price × 60%; otherwise current Variant Price × 60%
- Guardrail: an existing lower selling price is never increased
- Import scope: only the 118 changed product handles are included; excluded and review products are absent
- The import contains only product/variant identity and the two price columns
- Inventory quantity, SKU, images, descriptions, tags, status, cost, and metafield columns are omitted so Shopify preserves them

## Import

1. In Shopify Admin, go to Products → Import.
2. Upload `products_40_percent_off_IMPORT.csv`.
3. Select **Overwrite products with matching handles**.
4. Review the Shopify preview carefully, then start the import.
5. Verify an eligible product, an Ocean Whisper product, a Rakhi Hamper, and Mystery Jars before publishing theme changes.

## Items deliberately not changed

- `sea-haven-bracelet`: Price ₹6,501 and Compare-at Price ₹750 conflict; review the intended original price manually.
- `celeste-hex-bangle`: current ₹275 is lower than calculated ₹300; ₹275 preserved.
- `bloom-sutra-1`: current ₹250 is lower than calculated ₹330; ₹250 preserved.
- All 22 draft products remain unchanged.

Source SHA-256: `de1daf31cfb344835c202303f63b7dfeb2d479bb2966e34ad76fa0d8b045d29c`
Import SHA-256: `b86e450b5bb1b6cf313328fab0271db7cca88d4fe2af128d29d1fcb430ffa0f8`
