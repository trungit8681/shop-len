CREATE TABLE shop_settings (
    id SMALLINT PRIMARY KEY,
    shop_name VARCHAR(80) NOT NULL,
    shipping_fee NUMERIC(14, 0) NOT NULL,
    CONSTRAINT ck_shop_settings_fee CHECK (shipping_fee >= 0)
);

INSERT INTO shop_settings (id, shop_name, shipping_fee) VALUES (1, 'Cuti Mango', 0);
