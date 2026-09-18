-- Adds release_year so manually-imported products (and any future re-import
-- of bot-published ones) can record the model's actual release year, which
-- until now was only used transiently for validation and never persisted.
ALTER TABLE products ADD COLUMN release_year INTEGER;
