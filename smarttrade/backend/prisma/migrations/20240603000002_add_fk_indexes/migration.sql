-- Missing FK indexes — PostgreSQL does not auto-index foreign key columns.
-- Without these, every join/filter on these columns is a sequential scan.

-- Products by category (category listing page — critical hot path)
CREATE INDEX IF NOT EXISTS "Product_category_id_idx" ON "Product" ("category_id");

-- Order line items (order detail page — every order load hits this)
CREATE INDEX IF NOT EXISTS "OrderItem_order_id_idx"   ON "OrderItem" ("order_id");
CREATE INDEX IF NOT EXISTS "OrderItem_product_id_idx" ON "OrderItem" ("product_id");

-- Passkey lookup by user (biometric login critical path)
CREATE INDEX IF NOT EXISTS "WebAuthnCredential_user_id_idx" ON "WebAuthnCredential" ("user_id");

-- Password reset tokens by user
CREATE INDEX IF NOT EXISTS "PasswordResetToken_user_id_idx" ON "PasswordResetToken" ("user_id");
