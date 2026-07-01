"use strict";

const { prisma } = require("../database");
const logger = require("../utils/logger");

const AIService = {
  /**
   * Ejecuta el análisis predictivo de demanda basado en histórico de ventas.
   * Calcula la velocidad de ventas y actualiza DemandForecast y ReorderRules.
   */
  async runDemandForecast() {
    try {
      logger.info("🤖 [AI Service] Iniciando análisis de predicción de demanda...");
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 1. Obtener ventas recientes por producto
      const recentSales = await prisma.saleItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        where: {
          sale: {
            createdAt: { gte: sevenDaysAgo },
            paymentStatus: { in: ["completed", "partial"] }
          }
        }
      });

      // 2. Procesar cada producto
      for (const item of recentSales) {
        if (!item.productId) continue;

        const qtySold = item._sum.quantity || 0;
        const dailyVelocity = qtySold / 7;
        
        // Predicción a 14 días
        const predictedQty = Math.ceil(dailyVelocity * 14);
        
        let trend = "ESTABLE";
        if (dailyVelocity > 2) trend = "ALTA";
        if (dailyVelocity < 0.5) trend = "BAJA";

        // Confianza estadística básica
        const confidenceScore = qtySold > 10 ? 0.9 : 0.6;

        // Actualizar o crear forecast
        await prisma.demandForecast.upsert({
          where: { id: `FCAST-${item.productId}` },
          update: {
            predictedQty,
            trend,
            confidenceScore,
            lastUpdated: new Date()
          },
          create: {
            id: `FCAST-${item.productId}`,
            productId: item.productId,
            predictedQty,
            trend,
            confidenceScore
          }
        });

        // 3. Generar regla de reabastecimiento sugerida (ReorderRule)
        // Si la demanda supera el stock actual, sugerir reorden
        const currentStockAgg = await prisma.inventory.aggregate({
          _sum: { quantity: true },
          where: { productId: item.productId }
        });
        
        const currentStock = currentStockAgg._sum.quantity || 0;
        
        if (predictedQty > currentStock) {
          const qtyToOrder = predictedQty - currentStock;
          const minStock = Math.ceil(dailyVelocity * 3); // 3 días de colchón de seguridad

          await prisma.reorderRule.upsert({
            where: { id: `RULE-${item.productId}` },
            update: {
              minStock,
              qtyToOrder
            },
            create: {
              id: `RULE-${item.productId}`,
              productId: item.productId,
              minStock,
              qtyToOrder,
              enabled: 1
            }
          });
        }
      }

      logger.info("✅ [AI Service] Predicción de demanda completada.");
    } catch (err) {
      logger.error(`❌ [AI Service] Error en predicción: ${err.message}`);
    }
  }
};

module.exports = AIService;
