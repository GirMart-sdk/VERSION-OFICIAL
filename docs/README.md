# WINNER_v3.5

# 🏆 WINNER STORE v3.5 — Enterprise E-commerce & POS

![Version](https://img.shields.io/badge/version-3.5-brightgreen)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D18.0.0-blue)
![Prisma](https://img.shields.io/badge/prisma-6.19.3-blueviolet)
![Database](https://img.shields.io/badge/database-PostgreSQL-blue)
![License](https://img.shields.io/badge/license-Proprietary-red)

**Winner Store** es una plataforma integral de comercio electrónico y Punto de Venta (POS) diseñada específicamente para marcas de ropa _streetwear_ en el mercado colombiano. Esta versión 3.5 migra la arquitectura a un entorno relacional robusto con PostgreSQL y automatiza procesos críticos de logística y finanzas.

---

## 🚀 Características Principales

### 📦 Gestión de Inventario de Vanguardia

- **Arquitectura Relacional**: Motor impulsado por Prisma 6+ para transacciones atómicas y seguras.
- **Control por Tallas**: Lógica diferenciada para Ropa (XS-XXL), Calzado (34-46) y Accesorios (Talla Única).
- **Barcoding**: Generación y escaneo de etiquetas Code 128 / EAN-13 integradas.
- **Carga Masiva**: Importación inteligente de stock vía CSV compatible con software contable local.

### 🛒 Punto de Venta (POS) High-Performance

- **Interfaz Neón**: UI optimizada para máxima velocidad en tiendas físicas.
- **Buscador Multicriterio**: Filtrado instantáneo por nombre, SKU o código de barras.
- **Gestión de Apartados**: Sistema de créditos y abonos parciales (Layaway) con seguimiento de saldos.
- **Impresión Térmica**: Generación nativa de tickets de venta optimizados para 58mm/80mm.

### 💳 Pasarela de Pagos & Seguridad

- **Integración Wompi**: Flujo unificado para Tarjetas de Crédito, PSE y Nequi.
- **Sello de Integridad**: Implementación de HMAC-SHA256 para prevenir alteraciones en los montos de pago.
- **Webhooks Automatizados**: Sincronización en tiempo real de estados de pago APPROVED/DECLINED.
- **Seguridad JWT**: Autenticación administrativa protegida por tokens de sesión y cookies seguras.

### 📊 Analítica y Gastos (Goper)

- **Dashboard Ejecutivo**: KPIs dinámicos con ApexCharts (Ventas hoy, ticket promedio, conversión).
- **Módulo de Gastos**: Control de egresos operativos (Arriendo, marketing, servicios) con categorización inteligente.
- **Predicción de Demanda**: Algoritmos simples de proyección basados en el historial de ventas.

### 📱 WhatsApp Communication Center

- **Notificaciones Directas**: Envío de comprobantes, números de guía y recordatorios de pago vía WhatsApp API.
- **Logística Pro**: Gestión de estados de envío (Despachado, En camino, Entregado) con generación de etiquetas.

---

## 🛠️ Stack Tecnológico

- **Backend**: Node.js + Express.js (v5.x)
- **ORM**: Prisma Client (PostgreSQL)
- **Seguridad**: JWT (JsonWebToken) + Crypto (Scrypt) + Helmet.js
- **Imagen**: Sharp (Optimización WebP a 1200px)
- **Frontend**: JavaScript Vanilla + CSS3 (Glossy Dark Theme)
- **Gráficos**: ApexCharts + Chart.js
- **Correos**: Nodemailer (SMTP nativo)

---

## ⚙️ Configuración del Entorno

Para iniciar el proyecto, asegúrate de tener las siguientes variables en tu archivo `.env`:

```env
DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/dezpy_v01"
JWT_SECRET="tu_secreto_super_seguro"
API_KEY="tu-api-key-de-produccion"
WOMPI_PUBLIC_KEY="pub_prod_XXX"
WOMPI_INTEGRITY_SECRET="prod_integrity_XXX"
FRONTEND_URL="http://localhost:3000"
```

---

## 🏃 Instalación y Ejecución

1. **Instalar dependencias**:

   ```bash
   npm install
   ```

2. **Sincronizar Base de Datos**:

   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Iniciar Servidor**:
   Usa el script automatizado para Windows:
   ```bash
   .\start-local.bat
   ```
   O vía npm:
   ```bash
   npm start
   ```

---

## 📄 Documentación Adicional

| Documento           | Descripción                                   |
| ------------------- | --------------------------------------------- |
| TECHNICAL_SPECS.md  | Detalles de implementación de Wompi y Prisma. |
| API_AND_FEATURES.md | Catálogo de los 40+ endpoints de la API.      |
| REPORTE_FINAL.md    | Resumen del estado operativo v3.5.            |

---

## ⚖️ Licencia

Propiedad de **GirMart-SDK**. Todos los derechos reservados. El uso de esta plataforma está sujeto a los términos del contrato de licencia comercial de Winner Store.

---

🚀 _Winner Store: Liderando la cultura urbana a través de la tecnología._

```

### Recomendaciones para tu GitHub:
1. **Archivo en la raíz**: Aunque lo guardé en la carpeta `docs`, te recomiendo copiarlo también a la raíz de `C:\DEZPY_v01\README.md`. GitHub prioriza el archivo que está en la raíz para mostrarlo como portada del proyecto.
2. **Emojis y Formato**: He incluido *badges* (insignias) al principio que dan una apariencia muy profesional y técnica de inmediato.

<!--
[PROMPT_SUGGESTION]Crea un archivo .gitignore profesional para que no subamos carpetas basura como node_modules o archivos .env al repositorio.[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Genera una guía de contribución CONTRIBUTING.md para explicar a otros desarrolladores cómo proponer cambios en esta versión 3.5.[/PROMPT_SUGGESTION]
```
