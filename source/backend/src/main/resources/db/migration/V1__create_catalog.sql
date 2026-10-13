CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    active BOOLEAN NOT NULL,
    category VARCHAR(255),
    description TEXT,
    image_url VARCHAR(255),
    material VARCHAR(255),
    name VARCHAR(255),
    price NUMERIC(19, 2),
    slug VARCHAR(255)
);

CREATE TABLE product_variants (
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(255) NOT NULL,
    color VARCHAR(255),
    size VARCHAR(255),
    stock INTEGER NOT NULL,
    CONSTRAINT uq_product_variant_sku UNIQUE (sku)
);
