CREATE TABLE product_styles (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    image_url VARCHAR(2048) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO product_styles (product_id, name, image_url)
SELECT id, 'Mặc định', COALESCE(image_url, '')
FROM products;

ALTER TABLE product_variants ADD COLUMN style_id BIGINT;

UPDATE product_variants variant
SET style_id = style.id
FROM product_styles style
WHERE style.product_id = variant.product_id;

ALTER TABLE product_variants
    ALTER COLUMN style_id SET NOT NULL,
    ADD CONSTRAINT fk_product_variants_style FOREIGN KEY (style_id) REFERENCES product_styles(id);

ALTER TABLE order_items ADD COLUMN style_name VARCHAR(120) NOT NULL DEFAULT 'Mặc định';
