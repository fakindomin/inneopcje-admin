-- InnaOpcja.pl — initial schema (phones-only MVP)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES categories(id)
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  normalized_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  brand_recognition TEXT NOT NULL CHECK (brand_recognition IN ('mainstream', 'niche')),
  verdict TEXT,
  score NUMERIC(3, 1) CHECK (score >= 1 AND score <= 10),
  summary TEXT,
  pros JSONB NOT NULL DEFAULT '[]'::jsonb,
  cons JSONB NOT NULL DEFAULT '[]'::jsonb,
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_tier TEXT CHECK (price_tier IN ('budzetowy', 'sredni', 'premium')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_category_id_idx ON products (category_id);
CREATE INDEX products_status_idx ON products (status);
CREATE INDEX products_normalized_name_trgm_idx ON products USING gin (normalized_name gin_trgm_ops);

CREATE TABLE product_alternatives (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alternative_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  comparison_angle TEXT NOT NULL CHECK (comparison_angle IN ('tansza', 'niszowa_marka', 'wyzsza_jakosc')),
  reason TEXT,
  CONSTRAINT product_alternatives_no_self_ref CHECK (product_id <> alternative_product_id),
  CONSTRAINT product_alternatives_unique_angle UNIQUE (product_id, alternative_product_id, comparison_angle)
);

CREATE INDEX product_alternatives_product_id_idx ON product_alternatives (product_id);

CREATE TABLE search_logs (
  id SERIAL PRIMARY KEY,
  raw_query TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
