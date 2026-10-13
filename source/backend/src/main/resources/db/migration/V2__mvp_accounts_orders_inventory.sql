ALTER TABLE product_variants ADD COLUMN id BIGSERIAL;
ALTER TABLE product_variants ADD CONSTRAINT pk_product_variants PRIMARY KEY (id);
ALTER TABLE product_variants ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 5;

CREATE TABLE app_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(30),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_app_users_role CHECK (role IN ('ADMIN', 'CUSTOMER'))
);

CREATE TABLE customer_addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id),
    recipient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    province VARCHAR(150) NOT NULL,
    district VARCHAR(150) NOT NULL,
    ward VARCHAR(150) NOT NULL,
    address_line VARCHAR(500) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_code VARCHAR(30) NOT NULL UNIQUE,
    user_id BIGINT REFERENCES app_users(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(30) NOT NULL,
    province VARCHAR(150) NOT NULL,
    district VARCHAR(150) NOT NULL,
    ward VARCHAR(150) NOT NULL,
    address_line VARCHAR(500) NOT NULL,
    note TEXT,
    status VARCHAR(40) NOT NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'COD',
    subtotal NUMERIC(19,2) NOT NULL,
    shipping_fee NUMERIC(19,2) NOT NULL DEFAULT 0,
    total NUMERIC(19,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL,
    sku VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    color VARCHAR(255) NOT NULL,
    size VARCHAR(255) NOT NULL,
    unit_price NUMERIC(19,2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(19,2) NOT NULL
);

CREATE TABLE order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(40),
    to_status VARCHAR(40) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    sku VARCHAR(255) NOT NULL,
    quantity_delta INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL,
    reference_code VARCHAR(50),
    actor VARCHAR(255) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX ix_orders_phone_code ON orders(order_code, customer_phone);
CREATE INDEX ix_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX ix_inventory_sku_created ON inventory_movements(sku, created_at DESC);
CREATE INDEX ix_status_history_order_created ON order_status_history(order_id, created_at DESC);
