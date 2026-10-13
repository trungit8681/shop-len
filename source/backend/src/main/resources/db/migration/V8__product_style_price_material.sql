ALTER TABLE product_styles
    ADD COLUMN price NUMERIC(19, 2) NOT NULL DEFAULT 0,
    ADD COLUMN material VARCHAR(255) NOT NULL DEFAULT '';

UPDATE product_styles style
SET price = product.price,
    material = COALESCE(product.material, '')
FROM products product
WHERE product.id = style.product_id;
