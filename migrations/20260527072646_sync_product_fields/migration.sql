/*
  Warnings:

  - You are about to drop the column `quantity` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `oldPrice` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[product_id,size]` on the table `inventory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sku]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "quantity",
ADD COLUMN     "qty" INTEGER;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "oldPrice",
ADD COLUMN     "badge_type" TEXT,
ADD COLUMN     "old_price" DOUBLE PRECISION,
ADD COLUMN     "on_sale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promo_price" DOUBLE PRECISION,
ADD COLUMN     "sku" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "inventory_product_id_size_key" ON "inventory"("product_id", "size");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
