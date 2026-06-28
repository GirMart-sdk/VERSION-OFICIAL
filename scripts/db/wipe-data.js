const { prisma } = require("./database");

async function resetDashboard() {
  console.log("🧹 Iniciando limpieza de datos transaccionales...");
  
  try {
    // El orden importa por las claves foráneas (FK)
    await prisma.order.deleteMany();
    await prisma.salePayment.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.cashSession.deleteMany();
    await prisma.customerProfile.deleteMany();
    
    // Opcional: Resetear inventario a 0 (si quieres cargar stock real)
    // await prisma.inventory.updateMany({ data: { quantity: 0 } });

    console.log("✅ Dashboard en ceros. Todo listo para pruebas reales.");
  } catch (err) {
    console.error("❌ Error durante la limpieza:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetDashboard();