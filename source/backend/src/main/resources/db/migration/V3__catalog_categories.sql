CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO categories (name, display_order)
SELECT DISTINCT category, ROW_NUMBER() OVER (ORDER BY category)
FROM products
WHERE category IS NOT NULL AND category <> ''
ON CONFLICT (name) DO NOTHING;
