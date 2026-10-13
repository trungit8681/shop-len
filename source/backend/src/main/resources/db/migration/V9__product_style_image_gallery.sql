CREATE TABLE product_style_images (
    style_id BIGINT NOT NULL REFERENCES product_styles(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL,
    image_url VARCHAR(2048) NOT NULL,
    PRIMARY KEY (style_id, display_order)
);

INSERT INTO product_style_images (style_id, display_order, image_url)
SELECT id, 0, image_url
FROM product_styles;
