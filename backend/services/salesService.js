"use strict";

const { prisma } = require("../database");
const mailer = require("../../emails/mailer");

/**
 * Servicio para gestionar el ciclo de vida de una venta.
 * Implementa el patrón Service Layer para separar la lógica de negocio de las rutas.
 */
const SalesService = {
  /**
   * Registra una venta completa: Crea el registro, asocia ítems,
   * descuenta stock y envía confirmación por email.
   * @param {Object} saleData - Datos de la venta provenientes del frontend/webhook.
   */
  async createSale(saleData) {
    return await prisma.$transaction(async (tx) => {
      // Calcular pago inicial para persistir en el registro de la venta
      const isCompleted = saleData.payment_status === "completed";
      const initialPayment = isCompleted ? Number(saleData.total) : Number(saleData.payment_details?.abonoAmount || 0);

      // 1. Crear el registro principal de la venta
      const sale = await tx.sale.create({
        data: {
          id: saleData.id,
          customerName: saleData.client || "Mostrador",
          customerEmail: saleData.customer_email,
          customerPhone: saleData.customer_phone,
          totalAmount: saleData.total,
          paymentMethod: saleData.payment_method,
          paymentStatus: saleData.payment_status || "completed",
          shippingAddress: saleData.shipping_address,
          shippingCarrier: saleData.shipping_carrier,
          channel: saleData.channel || "online",
          vendor: saleData.vendor || "Admin",
          payment_details: saleData.payment_details,
        },
      });

      // 1.5 REGISTRO DE PAGO (Vital para que el Arqueo de Caja sume la venta)
      if (initialPayment > 0) {
        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            amount: initialPayment,
            method: saleData.payment_method || "Efectivo",
            notes: isCompleted ? "Pago total registrado" : "Abono inicial de separado",
          },
        });
      }

      // 2. Procesar ítems y actualizar stock en tiempo real
      for (const item of saleData.items) {
        // Validar existencia y stock suficiente antes de descontar
        const invEntry = await tx.inventory.findUnique({
          where: {
            productId_size: { productId: item.id, size: item.size },
          },
        });

        if (!invEntry || (invEntry.quantity || 0) < item.qty) {
          throw new Error(`Stock insuficiente para ${item.name} (${item.size}). Disponible: ${invEntry?.quantity || 0}`);
        }

        // Registrar el ítem vendido
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.id,
            product_name: item.name,
            quantity: item.qty,
            unitPrice: item.price,
            size: item.size,
          },
        });

        // Descontar existencias del modelo Inventory (Lógica Crítica)
        await tx.inventory.update({
          where: {
            productId_size: {
              productId: item.id,
              size: item.size,
            },
          },
          data: {
            quantity: {
              decrement: item.qty,
            },
          },
        });
      }

      // 3. Disparar notificación por email (Actor Directo)
      // No bloqueamos el retorno de la función si el envío de correo falla
      if (sale.customerEmail && mailer && mailer.sendSaleEmail) {
        mailer.sendSaleEmail(sale).catch((err) =>
          console.error("📧 [SalesService] Error en notificación:", err.message)
        );
      }

      return sale;
    });
  },

  /**
   * Registra un nuevo abono a una venta existente.
   * Resuelve el error de concatenación asegurando que los valores sean numéricos.
   * @param {string} saleId - ID de la venta.
   * @param {Object} paymentData - Datos del pago { amount, method, notes }.
   */
  async addPayment(saleId, paymentData) {
    return await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ 
        where: { id: saleId },
        include: { salePayments: true }
      });
      if (!sale) throw new Error("Venta no encontrada");

      // CORRECCIÓN CRÍTICA: Convertir a Number para evitar que "70000" + 30000 resulte en "7000030000"
      const amountToAdd = Number(paymentData.amount);
      // Calculamos el total pagado sumando los registros de la relación
      const currentPaid = sale.salePayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const nuevoTotalPagado = currentPaid + amountToAdd;

      // 1. Actualizar el estado en la tabla de Ventas (totalPaid no existe en DB)
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          // Si el total pagado alcanza o supera el monto de la venta, marcar como completado
          paymentStatus: nuevoTotalPagado >= Number(sale.totalAmount) ? "completed" : "partial"
        }
      });

      // 2. Crear el registro histórico en la tabla de pagos individuales
      await tx.salePayment.create({
        data: {
          saleId: sale.id,
          amount: amountToAdd,
          method: paymentData.method || "Efectivo",
          notes: paymentData.notes || "Abono registrado desde el panel administrativo",
        },
      });

      return updatedSale;
    });
  },

  /**
   * Obtiene todas las ventas con filtros opcionales
   * @param {Object} query - Objeto con parámetros de query (limit, offset, etc)
   */
  async getAllSales(query = {}) {
    const { limit = 50, offset = 0 } = query;
    
    return await prisma.sale.findMany({
      skip: parseInt(offset),
      take: parseInt(limit),
      include: {
        items: true,
        salePayments: true,
        orders: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
};

module.exports = SalesService;