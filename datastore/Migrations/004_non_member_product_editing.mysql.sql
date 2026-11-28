-- Apply once after 003. Back up first and resolve invalid legacy rows before applying.
SELECT id FROM showcase.non_member_products WHERE inventory < 0 OR price <= 0;
ALTER TABLE showcase.non_member_products
    MODIFY price DECIMAL(12,2) NOT NULL,
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN version INT NOT NULL DEFAULT 1,
    ADD CONSTRAINT chk_non_member_product_inventory CHECK (inventory >= 0),
    ADD CONSTRAINT chk_non_member_product_price CHECK (price > 0);
ALTER TABLE showcase.events ADD COLUMN non_member_products_version INT NOT NULL DEFAULT 1;
