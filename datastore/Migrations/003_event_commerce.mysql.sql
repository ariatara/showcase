-- Apply once after 002. Back up first; do not apply to a live database as a test.
-- Resolve invalid legacy inventory/prices before the ALTER; never silently change them.
SELECT id FROM showcase.member_products WHERE inventory < 0 OR price <= 0;
ALTER TABLE showcase.member_products
    MODIFY price DECIMAL(12,2) NOT NULL,
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN version INT NOT NULL DEFAULT 1,
    ADD CONSTRAINT chk_product_inventory CHECK (inventory >= 0),
    ADD CONSTRAINT chk_product_price CHECK (price > 0);
ALTER TABLE showcase.events ADD COLUMN products_version INT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS showcase.commerce_carts (
    id INT AUTO_INCREMENT PRIMARY KEY, account_id INT NOT NULL UNIQUE, version INT NOT NULL DEFAULT 0,
    FOREIGN KEY (account_id) REFERENCES showcase.accounts(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS showcase.commerce_cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY, cart_id INT NOT NULL, product_id INT NOT NULL, member_id INT NOT NULL,
    quantity INT NOT NULL, version INT NOT NULL DEFAULT 1, product_version INT NOT NULL,
    UNIQUE(cart_id,product_id,member_id), CHECK(quantity BETWEEN 1 AND 99),
    FOREIGN KEY(cart_id) REFERENCES showcase.commerce_carts(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES showcase.member_products(id),
    FOREIGN KEY(member_id) REFERENCES showcase.members(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS showcase.commerce_coupons (
    id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    kind VARCHAR(16) NOT NULL, amount BIGINT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at DATETIME NULL, ends_at DATETIME NULL, max_uses INT NULL, per_account INT NULL,
    version INT NOT NULL DEFAULT 1,
    CHECK(kind IN ('percent','fixed')), CHECK(amount > 0),
    CHECK(kind <> 'percent' OR amount <= 10000),
    CHECK(max_uses IS NULL OR max_uses > 0), CHECK(per_account IS NULL OR per_account > 0),
    CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS showcase.commerce_settings (
    id INT PRIMARY KEY, fee_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    fee_basis_points INT NOT NULL DEFAULT 0, fee_fixed_cents BIGINT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1, CHECK(id = 1),
    CHECK(fee_basis_points BETWEEN 0 AND 10000), CHECK(fee_fixed_cents BETWEEN 0 AND 100000000)
) ENGINE=InnoDB;
INSERT IGNORE INTO showcase.commerce_settings(id) VALUES(1);
CREATE TABLE IF NOT EXISTS showcase.commerce_orders (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY, account_id INT NOT NULL,
    cart_version INT NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'creating_payment',
    subtotal_cents BIGINT NOT NULL, discount_cents BIGINT NOT NULL, fee_cents BIGINT NOT NULL, total_cents BIGINT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD', pricing JSON NOT NULL, coupon_id INT NULL,
    idempotency_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, payload_hash CHAR(64) NOT NULL,
    paypal_order_id VARCHAR(64) NULL UNIQUE, capture_id VARCHAR(64) NULL UNIQUE, approval_url TEXT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), expires_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE(account_id,idempotency_key), INDEX(status,expires_at),
    FOREIGN KEY(account_id) REFERENCES showcase.accounts(id), FOREIGN KEY(coupon_id) REFERENCES showcase.commerce_coupons(id),
    CHECK(currency = 'USD'), CHECK(subtotal_cents > 0 AND discount_cents >= 0 AND fee_cents >= 0),
    CHECK(status IN ('creating_payment','awaiting_approval','capture_in_progress','payment_pending','paid','cancelled','expired','failed','reconciliation_required','refunded','reversed')),
    CHECK(total_cents > 0 AND total_cents = subtotal_cents - discount_cents + fee_cents)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS showcase.commerce_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY, order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    product_id INT NOT NULL, event_id INT NOT NULL, member_id INT NOT NULL,
    cart_item_id INT NOT NULL, cart_item_version INT NOT NULL, product_version INT NOT NULL,
    quantity INT NOT NULL, unit_cents BIGINT NOT NULL, snapshot JSON NOT NULL,
    INDEX(cart_item_id),
    FOREIGN KEY(order_id) REFERENCES showcase.commerce_orders(id), FOREIGN KEY(product_id) REFERENCES showcase.member_products(id),
    FOREIGN KEY(event_id) REFERENCES showcase.events(id), FOREIGN KEY(member_id) REFERENCES showcase.members(id),
    CHECK(quantity BETWEEN 1 AND 99), CHECK(unit_cents > 0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS showcase.commerce_reservations (
    order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, product_id INT NOT NULL,
    quantity INT NOT NULL, state VARCHAR(16) NOT NULL DEFAULT 'active',
    PRIMARY KEY(order_id,product_id), INDEX(product_id,state), CHECK(quantity > 0),
    CHECK(state IN ('active','consumed','released')),
    FOREIGN KEY(order_id) REFERENCES showcase.commerce_orders(id), FOREIGN KEY(product_id) REFERENCES showcase.member_products(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS showcase.commerce_coupon_redemptions (
    order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY, coupon_id INT NOT NULL, account_id INT NOT NULL,
    state VARCHAR(16) NOT NULL DEFAULT 'reserved', INDEX(coupon_id,state,account_id),
    CHECK(state IN ('reserved','consumed','released')),
    FOREIGN KEY(order_id) REFERENCES showcase.commerce_orders(id), FOREIGN KEY(coupon_id) REFERENCES showcase.commerce_coupons(id),
    FOREIGN KEY(account_id) REFERENCES showcase.accounts(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS showcase.commerce_payment_events (
    id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    order_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL, event_type VARCHAR(100) NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE, received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES showcase.commerce_orders(id)
) ENGINE=InnoDB;
-- Rollback: disable new checkout creation and reconcile pending payments.
-- Do not drop orders, restore delete/reinsert product saves, or erase reservation/history data.
