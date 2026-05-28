/*
  Warnings:

  - Added the required column `updated_at` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "customer_profiles" ADD COLUMN     "total_orders" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customer_email" TEXT,
ADD COLUMN     "customer_phone" TEXT,
ADD COLUMN     "shipping_address" TEXT,
ADD COLUMN     "shipping_cost" DOUBLE PRECISION,
ADD COLUMN     "shipping_method" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_options" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "shipping_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorder_rules" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "min_stock" INTEGER NOT NULL,
    "qty_to_order" INTEGER NOT NULL,
    "reorder_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "reorder_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_forecast" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "predicted_qty" INTEGER NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "trend" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demand_forecast_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_forecast" ADD CONSTRAINT "demand_forecast_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
