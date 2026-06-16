"use strict";

const { prisma } = require("../database");

/**
 * Servicio encargado de la lógica de negocio del inventario.
 * Centraliza operaciones complejas de Prisma.
 */
const InventoryService = {
  /**
   * Realiza una actualización masiva de stock dentro de una transacción.
   * @param {Array} updates - Lista de objetos { sku/id, size, qty }
   */
  async bulkUpdate(updates) {
    return await prisma.$transaction(
      async (tx) => {
        const results = [];
        for (const item of updates) {
          const product = await tx.product.findFirst({
            where: { OR: [{ id: item.id }, { sku: item.sku }] },
            select: { id: true } // Quick Win: Solo traemos el ID para mejorar rendimiento
          });

          if (!product) continue;

          const updatedEntry = await tx.inventory.upsert({
            where: {
              productId_size: { productId: product.id, size: item.size },
            },
            update: { quantity: item.qty },
            create: {
              productId: product.id,
              size: item.size,
              quantity: item.qty,
            },
          });
          results.push(updatedEntry);
        }
        return results;
      },
      { timeout: 30000 }
    );
  }
};

module.exports = InventoryService;