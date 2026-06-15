"use strict";

const { prisma } = require("../database");

/**
 * Servicio para cálculos estadísticos y analíticos.
 * Optimizado con Prisma select para alto rendimiento en el Dashboard.
 */
const StatsService = {
  /**
   * Obtiene los KPIs principales para el Dashboard.
   */
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtro para excluir ventas canceladas
    const statsWhere = { 
      deletedAt: null,
      NOT: { orders: { some: { status: "CANCELADO" } } } 
    };

    const [totalSales, totalRevenueAgg, salesToday, revenueTodayAgg] =
      await Promise.all([
        prisma.sale.count({ where: statsWhere }),
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          where: statsWhere,
        }),
        prisma.sale.count({
          where: { ...statsWhere, createdAt: { gte: today } },
        }),
        prisma.sale.aggregate({
          _sum: { totalAmount: true },
          where: { ...statsWhere, createdAt: { gte: today } },
        }),
      ]);

    const totalRevenue = Number(totalRevenueAgg._sum.totalAmount || 0);
    const revenueToday = Number(revenueTodayAgg._sum.totalAmount || 0);

    return {
      totalSales,
      totalRevenue,
      salesToday,
      revenueToday,
      avgTicket: totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0,
    };
  },

  /**
   * Obtiene el ranking de productos más vendidos.
   */
  async getTopProducts(limit = 5) {
    const topProducts = await prisma.saleItem.groupBy({
      by: ["productId", "product_name"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    return topProducts.map((item) => ({
      name: item.product_name,
      qty_sold: item._sum.quantity || 0,
    }));
  },

  /**
   * Alertas de bajo inventario con selección de campos optimizada.
   */
  async getLowStockAlerts(threshold = 5) {
    return await prisma.inventory.findMany({
      where: { quantity: { lte: threshold } },
      select: {
        size: true,
        quantity: true,
        product: { select: { id: true, name: true, sku: true } }
      }
    });
  }
};

module.exports = StatsService;