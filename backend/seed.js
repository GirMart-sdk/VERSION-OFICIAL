const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando siembra de datos (Seed) en PostgreSQL...");

  // 1. Limpiar datos previos para evitar duplicados
  await prisma.saleItem.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customerProfile.deleteMany();

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
      id: "P026",
      sku: "WIN-P026",
      name: "Nike Air Jordan Retro",
      price: 450000,
      cost: 280000,
      category: "calzado",
      image: "jordan.jpg",
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
      image: "gorra.jpg",
      description: "Accesorio esencial para el outfit.",
      stockStatus: "In Stock",
    },
  ];

  for (const pData of initialProducts) {
    const product = await prisma.product.create({ data: pData });

    // 3. Generación automática de inventario según categoría
    if (pData.category === "Ropa") {
      const tallasRopa = ["S", "M", "L", "XL"];
      for (const size of tallasRopa) {
        await prisma.inventory.create({
          data: { productId: product.id, size, quantity: 15 },
        });
      }
    } else if (pData.category === "calzado") {
      const tallasCalzado = ["38", "39", "40", "41", "42"];
      for (const size of tallasCalzado) {
        await prisma.inventory.create({
          data: { productId: product.id, size, quantity: 5 },
        });
      }
    } else {
      // Accesorios no suelen tener talla
      await prisma.inventory.create({
        data: { productId: product.id, size: null, quantity: 50 },
      });
    }
  }

  console.log("✅ Base de Datos PostgreSQL poblada con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error en el Seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
