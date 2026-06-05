const path = require("path");
const fs = require("fs");
// 1. Carga inteligente de configuración (prioriza .env.production)
const prodEnv = path.resolve(__dirname, "..", ".env");
const envPath = fs.existsSync(prodEnv)
  ? prodEnv
  : path.resolve(__dirname, "..", ".env");
require("dotenv").config({ path: envPath });

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando siembra de datos (Seed) en PostgreSQL...");

  // 1. Ya no borramos los datos existentes para proteger los productos que subas manualmente.

  // 2. Definición de productos iniciales (Muestra representativa de los 26)
  const initialProducts = [
    {
      id: "P001",
      sku: "WIN-P001",
      name: "Camiseta Streetwear Oversize",
      price: 85000,
      cost: 35000,
      category: "Ropa",
      image: "camiseta-oversize.jpg",
      badge: "Nuevo",
      description: "Camiseta 100% algodón, estilo urbano premium.",
      stockStatus: "In Stock",
    },
    {
      id: "P002",
      sku: "WIN-P002",
      name: "Hoodie Crop Urbano",
      price: 95000,
      cost: 40000,
      category: "Ropa",
      image:
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
      badge: "Top Ventas",
      description: "Hoodie corto estilo industrial para mujer.",
      stockStatus: "In Stock",
    },
    {
      id: "P003",
      sku: "WIN-P003",
      name: "Jogger Cargo Premium",
      price: 115000,
      cost: 55000,
      category: "Ropa",
      image:
        "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500",
      badge: "Oferta",
      description: "Pantalón técnico con múltiples bolsillos.",
      stockStatus: "In Stock",
    },
    {
      id: "P004",
      sku: "WIN-P004",
      name: "Set Legging + Top W",
      price: 130000,
      cost: 65000,
      category: "Ropa",
      image:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500",
      badge: "Nuevo",
      description: "Conjunto deportivo de alto rendimiento.",
      stockStatus: "In Stock",
    },
    {
      id: "P026",
      sku: "WIN-P026",
      name: "Nike Air Jordan Retro",
      price: 450000,
      cost: 280000,
      category: "calzado",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500",
      badge: "Popular",
      description: "Calzado icónico para coleccionistas.",
      stockStatus: "In Stock",
    },
    {
      id: "A001",
      sku: "WIN-A001",
      name: "Gorra Snapback Black",
      price: 45000,
      cost: 15000,
      category: "Accesorios",
      image:
        "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500",
      description: "Accesorio esencial para el outfit.",
      stockStatus: "In Stock",
    },
    {
      id: "A002",
      sku: "WIN-A002",
      name: "Mochila Táctica Urbana",
      price: 125000,
      cost: 60000,
      category: "Accesorios",
      image:
        "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500",
      badge: "Limitado",
      description: "Capacidad de 20L, resistente al agua.",
      stockStatus: "In Stock",
    },
  ];

  for (const pData of initialProducts) {
    // Usamos upsert: Si el ID existe, actualiza los datos básicos. Si no, lo crea.
    const product = await prisma.product.upsert({
      where: { id: pData.id },
      update: {
        sku: pData.sku,
        name: pData.name,
        price: pData.price,
        category: pData.category,
        image: pData.image,
      },
      create: pData,
    });

    // 3. Generación automática de inventario según categoría
    if (pData.category === "Ropa") {
      const tallasRopa = ["S", "M", "L", "XL"];
      for (const size of tallasRopa) {
        const barcode = `770${product.id.replace(/\D/g, "")}${size.charCodeAt(0)}`;
        await prisma.inventory.upsert({
          where: { productId_size: { productId: product.id, size } },
          update: {}, // No sobreescribimos la cantidad si ya existe para no perder cambios manuales
          create: {
            productId: product.id,
            size,
            quantity: 15,
            barcode,
            minStock: 3,
          },
        });
      }
    } else if (pData.category === "calzado") {
      const tallasCalzado = ["38", "39", "40", "41", "42"];
      for (const size of tallasCalzado) {
        const barcode = `880${product.id.replace(/\D/g, "")}${size}`;
        await prisma.inventory.upsert({
          where: { productId_size: { productId: product.id, size } },
          update: {},
          create: {
            productId: product.id,
            size,
            quantity: 5,
            barcode,
            minStock: 1,
          },
        });
      }
    } else {
      // Accesorios no suelen tener talla
      const barcode = `990${product.id.replace(/\D/g, "")}`;
      await prisma.inventory.upsert({
        where: { productId_size: { productId: product.id, size: "U" } },
        update: {},
        create: {
          productId: product.id,
          size: "U",
          quantity: 100,
          barcode,
          minStock: 5,
        },
      });
    }
  }

  // 4. Generar una venta de prueba para el historial
  const sampleSaleId = "SALE-SEED-001";
  const existingSale = await prisma.sale.findUnique({
    where: { id: sampleSaleId },
  });

  if (!existingSale) {
    console.log("📝 Generando venta de prueba...");
    await prisma.sale.create({
      data: {
        id: sampleSaleId,
        customerName: "Cliente de Prueba",
        customerEmail: "prueba@winner.com",
        customerPhone: "573000000000",
        totalAmount: 130000,
        paymentMethod: "Efectivo",
        paymentStatus: "completed",
        referenceNumber: "REF-SEED-001",
        items: {
          create: [
            {
              productId: "P004", // Set Legging + Top W
              size: "M",
              quantity: 1,
              unitPrice: 130000,
            },
          ],
        },
        salePayments: {
          create: [
            {
              amount: 130000,
              method: "Efectivo",
              notes: "Pago inicial completo (Seed Data)",
            },
          ],
        },
        orders: {
          create: [
            {
              status: "ENTREGADO",
              shippingMethod: "Recogida en tienda",
              shippingCost: 0,
              customerEmail: "prueba@winner.com",
              customerPhone: "573000000000",
              shippingAddress: "Sede Principal Bogotá",
            },
          ],
        },
      },
    });
    console.log("✅ Venta de prueba creada.");
  }

  console.log("✅ Base de Datos PostgreSQL sincronizada con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error en el Seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
