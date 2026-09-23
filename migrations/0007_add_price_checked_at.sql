-- Tracks when each product's price was last verified against a live source
-- (see lib/geminiPrice.js) - NULL/older than a week means the on-demand
-- price refresh (app/api/phone/[slug]/price) should re-check it next time
-- someone views the product.
ALTER TABLE products ADD COLUMN price_checked_at TIMESTAMPTZ;
