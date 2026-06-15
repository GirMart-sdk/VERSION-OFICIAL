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
      // 0. INTEGRIDAD: Recalcular total desde la DB para evitar manipulación en el frontend
      let serverCalculatedTotal = 0;
      for (const item of saleData.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId || item.id },
          select: { price: true, name: true }
        });
        
        if (!product) throw new Error(`Producto no encontrado: ${item.name}`);
        serverCalculatedTotal += Number(product.price) * item.qty;
      }

      // Validar contra el total enviado (permitiendo margen de error de redondeo de 1 peso)
      const diff = Math.abs(serverCalculatedTotal - (saleData.total || 0));
      if (diff > 1) {
        throw new Error("VIOLACIÓN DE INTEGRIDAD: El monto de la orden no coincide con los precios actuales.");
      }

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
      // Si la venta está completada, registramos el total. Si es separado, el abono inicial.
      const isCompleted = saleData.payment_status === "completed";
      const initialPayment = isCompleted ? Number(saleData.total) : Number(saleData.payment_details?.abonoAmount || 0);

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
};

module.exports = SalesService;