# 🏆 WINNER STORE - Streetwear POS & E-commerce v3.5

Bienvenido a la plataforma definitiva para la gestión de tiendas de ropa urbana en Colombia. **Winner Store** combina un potente punto de venta (POS) físico con una tienda online integrada, todo bajo una arquitectura moderna, segura y optimizada para el rendimiento local.

## 🚀 Características de Vanguardia

- **Core Tecnológico:** Backend en Node.js impulsado por **Prisma ORM** y **PostgreSQL**.
- **Tienda Online 2.0:** Checkout fluido con integración oficial de **Wompi (Bancolombia)** y soporte para pagos Contra Entrega (COD).
- **Punto de Venta (POS):** Interfaz táctil, impresión de tickets térmicos y gestión de apartados (Layaway) con abonos parciales.
- **Procesamiento de Imágenes:** Optimización automática a formato **WebP** mediante **Sharp**, garantizando tiempos de carga ínfimos.
- **Seguridad Avanzada:** Autenticación mediante **JWT**, protección de API Keys y hashing de contraseñas con **Scrypt**.
- **WhatsApp Center:** Sistema de notificaciones centralizado para enviar tickets, guías de envío y recordatorios de cobro.
- **Analytics:** Panel de control con KPIs en tiempo real y gráficas interactivas mediante **ApexCharts**.

## 🛠️ Requisitos Previos

1.  **Node.js** (v16 o superior).
2.  **PostgreSQL** (Instalado y con una base de datos creada, ej: `winner_db`).
3.  **NPM** (Incluido con Node.js).

## 📦 Instalación Rápida

1.  **Clonar/Extraer:** Asegúrate de estar en la carpeta `c:\DEZPY_v01`.
2.  **Configurar Entorno:** Crea un archivo `.env` basado en el siguiente ejemplo:
    ```env
    PORT=3000
    DATABASE_URL="postgresql://usuario:password@localhost:5432/winner_db?schema=public"
    JWT_SECRET="tu_secreto_aleatorio"
    ADMIN_SALT="tu_salt_aleatorio"
    ADMIN_PASSWORD="winner2026"
    API_KEY="dev-api-key"
    WOMPI_PUBLIC_KEY="pub_test_..."
    WOMPI_INTEGRITY_SECRET="test_integrity_..."
    ```
3.  **Instalar y Preparar:**
    ```bash
    npm install
    npx prisma generate
    npx prisma db push
    node backend/seed.js
    ```

## 🏁 Inicio del Sistema

Puedes usar el iniciador automático:

- Doble clic en `start-local.bat`.

O mediante comandos:

```bash
npm start
```

Acceso al Panel: `http://192.168.1.8:3000/admin-panel.html`
Acceso a la Tienda: `http://192.168.1.8:3000`

## 📂 Estructura del Proyecto

- `/backend`: Lógica del servidor, controladores y configuración de base de datos.
- `/prisma`: Esquema de datos y migraciones.
- `/uploads`: Almacenamiento físico de imágenes optimizadas.
- `/emails`: Plantillas para notificaciones transaccionales.
- `app.js / pos.js / inventory.js`: Módulos principales del frontend.

## 🔒 Seguridad y Privacidad

El sistema está diseñado para funcionar en entornos locales seguros. Las imágenes se procesan localmente para evitar dependencias de terceros (como Cloudflare o S3), manteniendo el control total de los datos en tu infraestructura.

---

**Desarrollado por GirMart-SDK**  
_Winner Store — Estilo de vida urbano, tecnología de vanguardia._
