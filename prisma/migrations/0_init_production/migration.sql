-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "old_price" DECIMAL(12,2),
    "cost" DECIMAL(12,2) DEFAULT 0,
    "category" VARCHAR(50),
    "image" TEXT,
    "badge" VARCHAR(50),
    "badge_type" VARCHAR(50),
    "sku" VARCHAR(100),
    "description" TEXT,
    "on_sale" BOOLEAN DEFAULT false,
    "promo_price" DECIMAL(12,2),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "product_id" VARCHAR(50) NOT NULL,
    "size" VARCHAR(10) NOT NULL,
    "quantity" INTEGER DEFAULT 0,
    "barcode" VARCHAR(100),
    "min_stock" INTEGER DEFAULT 2,
    "location" VARCHAR(100),
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("product_id","size")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "channel" VARCHAR(50),
    "vendor" VARCHAR(100),
    "client" VARCHAR(255),
    "method" VARCHAR(50),
    "subtotal" DECIMAL(12,2) DEFAULT 0,
    "discount" DECIMAL(12,2) DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "payment_method" VARCHAR(50),
    "payment_status" VARCHAR(50) DEFAULT 'completed',
    "customer_email" VARCHAR(255),
    "customer_phone" VARCHAR(20),
    "shipping_address" TEXT,
    "shipping_carrier" VARCHAR(100),
    "reference_number" VARCHAR(100),
    "payment_details" JSONB,
    "items" TEXT,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" SERIAL NOT NULL,
    "sale_id" VARCHAR(50) NOT NULL,
    "product_id" VARCHAR(50),
    "product_name" VARCHAR(255) NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "size" VARCHAR(10),

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" SERIAL NOT NULL,
    "sale_id" VARCHAR(50) NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" VARCHAR(50) NOT NULL,
    "sale_id" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) DEFAULT 'PENDIENTE',
    "shipping_method" VARCHAR(100),
    "shipping_address" TEXT,
    "shipping_cost" DECIMAL(12,2) DEFAULT 0,
    "tracking_number" VARCHAR(100),
    "customer_email" VARCHAR(255),
    "customer_phone" VARCHAR(20),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" VARCHAR(50) NOT NULL,
    "category" VARCHAR(100),
    "concept" VARCHAR(255),
    "detail" TEXT,
    "method" VARCHAR(50) DEFAULT 'Efectivo',
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" VARCHAR(50) NOT NULL,
    "opened_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(6),
    "opened_by" VARCHAR(100) NOT NULL,
    "closed_by" VARCHAR(100),
    "initial_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "theoretical_sales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "theoretical_expenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "real_balance" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "name" VARCHAR(255),
    "phone" VARCHAR(20),
    "country" VARCHAR(50) DEFAULT 'CO',
    "total_spent" DECIMAL(12,2) DEFAULT 0,
    "total_orders" INTEGER DEFAULT 0,
    "last_purchase" TIMESTAMP(6),
    "vip_status" VARCHAR(50) DEFAULT 'regular',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorder_rules" (
    "id" VARCHAR(50) NOT NULL,
    "product_id" VARCHAR(50) NOT NULL,
    "min_stock" INTEGER NOT NULL,
    "qty_to_order" INTEGER NOT NULL,
    "reorder_cost" DECIMAL(12,2) DEFAULT 0,
    "enabled" INTEGER DEFAULT 1,

    CONSTRAINT "reorder_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_forecast" (
    "id" VARCHAR(50) NOT NULL,
    "product_id" VARCHAR(50) NOT NULL,
    "predicted_qty" INTEGER,
    "confidence_score" DECIMAL(5,2),
    "trend" VARCHAR(20),
    "last_updated" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demand_forecast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "idx_products_category" ON "products"("category");

-- CreateIndex
CREATE INDEX "idx_products_sku" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_barcode_key" ON "inventory"("barcode");

-- CreateIndex
CREATE INDEX "idx_inventory_product" ON "inventory"("product_id");

-- CreateIndex
CREATE INDEX "idx_sales_timestamp" ON "sales"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_email_key" ON "customer_profiles"("email");

-- CreateIndex
CREATE INDEX "idx_customer_email" ON "customer_profiles"("email");

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "demand_forecast" ADD CONSTRAINT "demand_forecast_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

