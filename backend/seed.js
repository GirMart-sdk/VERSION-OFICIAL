const path = require("path");
const fs = require("fs");
const { scryptSync } = require("crypto");

// 1. CARGA ROBUSTA DE CONFIGURACIÓN (Igual que server.js)
const isProdMode = process.env.NODE_ENV === "production";
let envPath = path.resolve(
  __dirname,
  "..",
  isProdMode ? ".env.production" : ".env",
);

if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, "..", ".env");
}

require("dotenv").config({ path: envPath });
console.log(`[Seed] Cargando variables desde: ${path.basename(envPath)}`);

// 2. Verificamos que DATABASE_URL esté presente antes de requerir database.js.
if (!process.env.DATABASE_URL) {
  console.error(
    "❌ [Seed] ERROR: DATABASE_URL no está definida en el entorno.",
  );
  console.error(
    "   Asegúrate de que el archivo .env existe en la raíz y tiene el formato correcto.",
  );
  process.exit(1);
}

// Importamos la instancia. Si el adaptador manual no expone 'user',
// intentamos usar la instancia interna del cliente.
let prisma = require("./database");

// Verificación de seguridad: si prisma.user no existe, el adaptador manual está incompleto.
const prismaInstance = prisma.user ? prisma : prisma.prisma || prisma;
const db = prisma.user ? prisma : prismaInstance;

const HASH_SALT = process.env.HASH_SALT || "winner_secure_salt_2026";

async function main() {
  console.log("🌱 Iniciando siembra de datos (Seed) en PostgreSQL...");

  // 1. Crear o actualizar usuario administrador inicial
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "winner2026";
  const adminEmail = process.env.EMAIL_USER; // Usamos el mismo correo del sistema para el admin

  // Generar hash de la contraseña
  const passwordHash = scryptSync(adminPass, HASH_SALT, 64).toString("hex");

  // Usamos upsert para asegurar que el admin tenga el email correcto incluso si ya existía
  await db.user.upsert({
    where: { username: adminUser },
    update: {
      email: adminEmail,
      password: passwordHash,
      active: true,
    },
    create: {
      username: adminUser,
      email: adminEmail,
      password: passwordHash,
      role: "admin",
      active: true,
    },
  });
  console.log(
    `👤 Usuario administrador sincronizado: ${adminUser} (${adminEmail || "sin email"})`,
  );

  // 2. Definición de productos iniciales (Muestra representativa de los 26)
  const initialProducts = [
    {
      id: "P001",
      sku: "WIN-P001",
      name: "Camiseta Streetwear Oversize",
      price: 85000,
      cost: 35000,
      category: "Camisetas Caballero",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=500",
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
      category: "Hoodies Dama",
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
      category: "Joggers Caballero",
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
      category: "Conjuntos Dama",
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
    // 1. Limpieza de datos: Extraemos solo lo que el modelo Product de Prisma/Postgres reconoce.
    // Eliminamos 'stockStatus' y cualquier otro campo extra.
    const { stockStatus, ...cleanData } = pData;

    const product = await db.product.upsert({
      where: { id: cleanData.id },
      update: {
        sku: cleanData.sku,
        name: cleanData.name,
        price: cleanData.price,
        cost: cleanData.cost || 0,
        image: cleanData.image,
        badge: cleanData.badge || null,
        description: cleanData.description || null,
      },
      create: {
        ...cleanData,
        cost: cleanData.cost || 0,
        category: cleanData.category,
        badge: cleanData.badge || null,
        description: cleanData.description || null,
      },
    });

    // 3. GENERACIÓN INTELIGENTE DE INVENTARIO Y LIMPIEZA DE DUPLICADOS
    const c = pData.category.toLowerCase();
    const isNumericBottom =
      (c.includes("pantal") ||
        c.includes("jean") ||
        c.includes("jogger") ||
        c.includes("cargo") ||
        c.includes("bermuda")) &&
      !c.includes("legging") &&
      !c.includes("conjunto");

    const isLetterSize =
      c.includes("ropa") ||
      c.includes("camiseta") ||
      c.includes("hoodie") ||
      c.includes("legging") ||
      c.includes("conjunto") ||
      c.includes("set") ||
      c.includes("top") ||
      c.includes("buso") ||
      c.includes("sudadera") ||
      c.includes("chaqueta") ||
      c.includes("camisa") ||
      c.includes("oversize");

    let validSizes = [];

    if (isNumericBottom) {
      validSizes =
        c.includes("dama") || c.includes("mujer")
          ? ["6", "8", "10", "12", "14"]
          : ["30", "32", "34", "36"];

      for (const size of validSizes) {
        const barcode = `770${product.id.replace(/\D/g, "")}${size}`;
        await db.inventory.upsert({
          where: { productId_size: { productId: product.id, size } },
          update: {},
          create: {
            productId: product.id,
            size,
            quantity: 12,
            barcode,
            minStock: 2,
          },
        });
      }
    } else if (isLetterSize) {
      validSizes = ["S", "M", "L", "XL"];
      for (const size of validSizes) {
        const barcode = `770${product.id.replace(/\D/g, "")}${size.charCodeAt(0)}`;
        await db.inventory.upsert({
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
      validSizes = ["38", "39", "40", "41", "42"];
      for (const size of validSizes) {
        const barcode = `880${product.id.replace(/\D/g, "")}${size}`;
        await db.inventory.upsert({
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
      validSizes = ["U"];
      const barcode = `990${product.id.replace(/\D/g, "")}`;
      await db.inventory.upsert({
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

    // --- VALIDACIÓN DE DUPLICADOS: Limpiar tallas que ya no corresponden ---
    // Si el producto tenía tallas viejas (ej. cambió de Ropa a Calzado), las borramos.
    await db.inventory.deleteMany({
      where: {
        productId: product.id,
        size: { notIn: validSizes },
      },
    });
  }

  // 4. Generar una venta de prueba para el historial
  const sampleSaleId = "SALE-SEED-001";
  const existingSale = await db.sale.findUnique({
    where: { id: sampleSaleId },
  });

  if (!existingSale) {
    console.log("📝 Generando venta de prueba...");
    await db.sale.create({
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
              productId: "P004",
              product_name: "Set Legging + Top W",
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
              notes: "Pago inicial completo (Seed)",
            },
          ],
        },
        orders: {
          create: [
            {
              id: "ORD-SEED-001",
              status: "ENTREGADO",
              shippingMethod: "Recogida local",
              shippingAddress: "Tienda Principal",
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
    await db.prisma.$disconnect(); // Usar la instancia real de PrismaClient
  });
