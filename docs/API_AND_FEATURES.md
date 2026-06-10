# API_AND_FEATURES.md

# 🔌 API REST Y CARACTERÍSTICAS -WINNER STORE v3.5 (Prisma Edition)

**Documentación completa de APIs, características, métodos de pago y troubleshooting**

---

## 📋 TABLA DE CONTENIDOS

1. [Características Principales](#características-principales)
2. [API REST (30+ Endpoints)](#api-rest-30-endpoints)
3. [Métodos de Pago (Guía Completa)](#métodos-de-pago-guía-completa)
4. [Base de Datos](#base-de-datos)
5. [Troubleshooting](#troubleshooting)

---

## ✨ CARACTERÍSTICAS PRINCIPALES

### 🛍️ TIENDA ONLINE COMPLETA

**Frontend Responsivo:**

- Catálogo dinámico de productos con filtros de talla
- Búsqueda y filtros activos
- Carrito persistente (LocalStorage)
- Interfaz intuitiva (móvil, tablet, desktop)
- Checkout premium con animaciones "fly-to-cart"
- Confirmación de pago y envío de factura por email
- **Notificaciones automáticas por Email (Actor Directo)**
- Preparado para WhatsApp API (sin redirección)

**Funcionalidades:**

- ✅ Ver productos (25+ precargados)
- ✅ Buscar por nombre/categoría
- ✅ Filtrar por precio/talla
- ✅ Agregar/quitar de carrito
- ✅ Checkout en 3 pasos
- ✅ Múltiples métodos de pago (simulados, listos para integración real)
- ✅ Confirmación automática por email
- ✅ Historial de compras

---

### 👨‍💼 PANEL ADMINISTRATIVO

**Dashboard Principal (Rediseño Neón con ApexCharts):**

- **Layout GRID dinámico:** KPIs, gráficas de ventas, actividad en vivo, heatmap.
- **KPIs inteligentes:** Iconos, sparklines (mini-gráficas de tendencia) y glow suave.
- **Gráficas avanzadas:** Uso de ApexCharts con gradients, glassmorphism, animaciones y tooltips modernos.
- **Actividad en vivo:** Panel lateral con notificaciones de nuevas ventas en tiempo real.
- **Heatmap de horarios de venta:** Identifica las horas de mayor actividad para optimizar operaciones.
- Ventas hoy/mes/año
- Productos más vendidos
- Clientes nuevos
- Ingresos totales
- Estado del inventario

**Secciones Admin:**

1. **Productos**
   - Listar todos
   - Crear nuevo
   - Editar producto
   - Eliminar producto
   - Ver inventario por talla (con talla "U" para accesorios)
   - Marcar como oferta/badge

2. **Ventas**
   - Registrar venta
   - Ver historial completo
   - **Gestión de logística y despacho (estados de envío, tracking)**
   - Filtrar por período
   - Buscar por cliente
   - Detalles de cada venta
   - Método de pago usado

3. **Inventario**
   - Stock actual por talla
   - Alerts de bajo stock
   - **Carga masiva inteligente de inventario (CSV compatible con Treinta)**
   - Predicción de demanda
   - Movimientos de inventario
   - Exportar reporte

4. **Clientes**
   - Listado de clientes
   - Datos de contacto
   - Historial de compras
   - Total gastado
   - Últimas órdenes

5. **Estadísticas**
   - **Conversión dinámica**
   - **Gráficas de rendimiento con ApexCharts**
   - **Actividad en vivo**
   - Gráficas de tendencia
   - Top 10 productos
   - Ventas por canal (online/física)
   - Análisis de demanda
   - Reportes personalizados
   - Exportar a CSV

6. **Configuración**
   - Cambiar contraseña
   - Datos de tienda
   - Métodos de pago
   - **Configuración de notificaciones por Email (Actor Directo)**
   - Usuarios admin

---

### 💳 MÉTODOS DE PAGO SOPORTADOS

Ver sección "Métodos de Pago (Guía Completa)" más abajo.
**Checkout premium estilo Apple/Shopify.**

En resumen:

- ✅ **Pasarela Wompi (Bancolombia):** Unificada para Tarjetas, PSE y Nequi.
- ✅ **Pago Contra Entrega (COD):** Gestión manual para entregas físicas.

---

### 🚀 CARACTERÍSTICAS TÉCNICAS

- ✅ API REST con 30+ endpoints
- ✅ Autenticación JWT
- ✅ Validación de datos
- ✅ Error handling global
- ✅ **Nodemailer para envío de emails (Actor Directo)**
- ✅ Logging estructurado
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ PostgreSQL (Prisma ORM)
- ✅ Respaldos automáticos

---

## 🔌 API REST (30+ ENDPOINTS)

### Autenticación (Headers Requeridos)

```bash
# Para tienda (endpoints públicos):
curl -H "x-api-key: dev-api-key" http://localhost:3000/api/products

# Para admin (endpoints protegidos):
curl -H "Authorization: Bearer {token}" http://localhost:3000/api/sales
```

### 📦 PRODUCTOS (6 endpoints)

#### GET /api/products

Listar todos los productos

**Respuesta:**

```json
[
  {
    "id": "PRD001",
    "name": "Polo Vintage",
    "price": 45000,
    "cost": 15000,
    "category": "Polos",
    "image": "polos/001.jpg",
    "badge": "popular",
    "description": "Polo de algodón 100%",
    "stock_status": "available",
    "created_at": "2026-01-15T10:30:00Z"
  }
]
```

#### GET /api/products/:id

Obtener detalle de un producto

**Parámetros:**

- `id` (string): ID del producto

**Respuesta:**

```json
{
  "id": "PRD001",
  "name": "Polo Vintage",
  "price": 45000,
  "inventory": [
    { "size": "XS", "quantity": 10 },
    { "size": "S", "quantity": 15 },
    ...
  ]
}
```

#### POST /api/products

Crear nuevo producto (admin)

**Headers:**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**

```json
{
  "name": "Nueva Polo",
  "price": 50000,
  "cost": 18000,
  "category": "Polos",
  "image": "url",
  "description": "Descripción",
  "badge": "new"
}
```

#### PUT /api/products/:id

Editar producto (admin)

**Headers:**

```
Authorization: Bearer {token}
```

**Body:** (mismo que POST)

#### DELETE /api/products/:id

Eliminar producto (admin)

#### GET /api/products/search?q=

Buscar productos

**Parámetros:**

- `q` (string): término de búsqueda

---

### 🛒 VENTAS (5 endpoints)

#### GET /api/sales

Listar todas las ventas

**Query params opcionales:**

- `channel`: 'online' o 'physica'
- `period`: 'today', 'week', 'month', 'year'
- `limit`: número de resultados

**Respuesta:**

```json
[
  {
    "id": "SAL001",
    "customer_name": "Juan Pérez",
    "customer_email": "juan@email.com",
    "total_amount": 95000,
    "payment_method": "tarjeta",
    "payment_status": "completed",
    "items": [{ "product_id": "PRD001", "size": "M", "quantity": 2 }],
    "created_at": "2026-04-06T14:30:00Z"
  }
]
```

#### POST /api/sales

Registrar nueva venta

**Body:**

```json
{
  "customer_name": "Juan Pérez",
  "customer_email": "juan@email.com",
  "customer_phone": "+573001234567",
  "items": [
    {
      "product_id": "PRD001",
      "size": "M",
      "quantity": 2,
      "unit_price": 45000
    }
  ],
  "total_amount": 90000,
  "payment_method": "tarjeta",
  "payment_status": "pending",
  "shipping_address": "Calle 1 #1-1, Bogotá"
}
```

#### GET /api/sales/:id

Obtener detalle de venta

#### GET /api/sales/customer/:email

Obtener ventas de un cliente

#### GET /api/sales/period/:period

Ventas del período

**Períodos:** today, week, month, year

---

### 💳 PAGOS (3 endpoints)

#### POST /api/payments

Registrar un pago

**Body:**

```json
{
  "reference_number": "WIN-ORDER-12345",
  "customer_email": "juan@email.com",
  "payment_method": "tarjeta",
  "amount": 95000,
  "payment_details": {
    "card_last_digits": "4242",
    "bank": "Bancolombia"
  }
}
```

**Respuesta:**

```json
{
  "id": "PAY001",
  "reference_number": "WIN-ORDER-12345",
  "status": "completed",
  "message": "Pago registrado correctamente"
}
```

#### GET /api/payments/:reference

Consultar estado de pago

**Respuesta:**

```json
{
  "reference_number": "WIN-ORDER-12345",
  "status": "completed",
  "amount": 95000,
  "payment_method": "tarjeta",
  "created_at": "2026-04-06T14:30:00Z"
}
```

#### GET /api/payments/customer/:email

Historial de pagos de cliente

---

### 📊 INVENTARIO (4 endpoints)

#### GET /api/inventory

Ver inventario completo

**Respuesta:**

```json
[
  {
    "product_id": "PRD001",
    "product_name": "Polo Vintage",
    "inventory": [
      { "size": "XS", "quantity": 10, "reorder_level": 5 },
      { "size": "S", "quantity": 3, "reorder_level": 5 },
      { "size": "M", "quantity": 15, "reorder_level": 5 }
    ]
  }
]
```

#### PUT /api/inventory/:id

Actualizar stock

**Body:**

```json
{
  "size": "M",
  "quantity": 20
}
```

#### GET /api/inventory/low-stock

Productos con bajo stock

#### POST /api/inventory/reorder

Crear orden de reabastecimiento automática

---

### 📈 ESTADÍSTICAS (5 endpoints)

#### GET /api/stats

Dashboard data completo

**Respuesta:**

```json
{
  "sales_today": 5,
  "revenue_today": 425000,
  "total_customers": 342,
  "pending_orders": 8,
  "top_products": [...],
  "sales_by_month": [...]
}
```

#### GET /api/stats/top-products

Top 10 productos más vendidos

#### GET /api/stats/sales-by-channel

Ventas por canal (online vs física)

#### GET /api/stats/forecast

Predicción de demanda (ML simple)

#### GET /api/stats/export/csv

Exportar reporte a CSV

---

### 🔐 AUTENTICACIÓN (3 endpoints)

#### POST /api/auth/login

Login administrativo

**Body:**

```json
{
  "username": "admin",
  "password": "winner2026"
}
```

**Respuesta:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 604800000,
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

#### POST /api/auth/refresh

Renovar token JWT

**Headers:**

```
Authorization: Bearer {token}
```

#### POST /api/auth/logout

Cerrar sesión

---

### 🧠 INTELIGENCIA Y CLIENTES (Nuevos)

#### GET /api/analytics/summary

Resumen ejecutivo de ingresos y unidades.

#### GET /api/customers/vip

Lista de clientes con mayor volumen de compra.

#### POST /api/demand-forecast/calculate

Ejecuta el algoritmo de predicción basado en historial.

#### GET /api/reorder-check

Verifica qué productos están por debajo del mínimo.

---

## 💳 MÉTODOS DE PAGO - GUÍA COMPLETA

### 1️⃣ TARJETA DE CRÉDITO

**Datos Requeridos:**

- Número de tarjeta (16 dígitos)
- Fecha de expiración (MM/YY)
- CVV (3 dígitos)
- Nombre titular
- Documento

**Validaciones Implementadas:**
✅ Detección automática de marca (Visa, MC, AMEX, Discover)
✅ Validación de número (Luhn algorithm)
✅ Validación CVV
✅ Formato automático
✅ Error en tiempo real

**Marcas Soportadas:**

- Visa: Comienza con 4
- MasterCard: Comienza con 5
- American Express: Comienza con 3
- Discover: Comienza con 6

**Ejemplo de Flujo:**

```javascript
// Frontend
selectPaymentMethod('tarjeta');
// Muestra formulario de tarjeta

// Validación automática en tiempo real
formatCardNumber();    // Agrega espacios
formatExpiry();        // Formato MM/YY
formatCVV();          // Solo números
detectCardBrand();    // Visa, MC, etc

// Envío al backend
POST /api/payments {
  payment_method: 'tarjeta',
  card_last_digits: '4242',
  amount: 95000,
  customer_email: 'cliente@email.com'
}

// Backend verifica y registra
```

**Seguridad:**
⚠️ Nunca se almacena número de tarjeta completo
⚠️ Solo se guarda últimos 4 dígitos
⚠️ Validación en servidor

---

### 2️⃣ PSE (PAGOS SEGUROS ELECTRÓNICOS)

**Datos Requeridos:**

- Banco (dropdown selector)
- Tipo de documento (CC, CE, NIT, Pasaporte)
- Número de documento

**Bancos Soportados:**

- Banco de Bogotá
- Banco Colpatria
- Banco de Occidente
- Santander
- Scotiabank
- BBVA
- Banco AV Villas
- Itaú
- Banco Caja Social
- Otros

**Validaciones:**
✅ Selección obligatoria de banco
✅ Tipo de documento validado
✅ Documento con formato correcto
✅ Validación en tiempo real

**Ejemplo de Flujo:**

```javascript
selectPaymentMethod('pse');
// Muestra formulario PSE con dropdown de bancos

// Seleccionar banco
selectBank('banco-bogota');

// Tipo documento
selectDocumentType('cc');

// Ingresar documento
// Validación: 5-15 caracteres numéricos

// Envío
POST /api/payments {
  payment_method: 'pse',
  bank: 'banco-bogota',
  document_type: 'cc',
  document_number: '1234567890'
}
```

**Próximo paso (cuando integres gateway real):**

- Redirigir a portal PSE
- Autenticación bancaria
- Confirmación de transacción
- Webhook de resultado

---

### 3️⃣ NEQUI

**Datos Requeridos:**

- Teléfono celular Colombia
- Nombre titular

**Validaciones:**
✅ Formato: +57 3XX XXX XXXX
✅ Solo números válidos
✅ Longitud correcta
✅ Validación en tiempo real

**Ejemplo de Flujo:**

```javascript
selectPaymentMethod('nequi');
// Muestra formulario Nequi

// Ingresar teléfono
formatPhone(); // Formato automático: +57 3XX XXX XXXX

// Nombre
// Campo de texto simple

// Envío
POST /api/payments {
  payment_method: 'nequi',
  phone_number: '+573001234567',
  customer_name: 'Juan Pérez'
}
```

\*\*Integración Nequi (cuando sea):

- API de Nequi para transferencias
- Notificaciones automáticas
- Confirmación en segundos

---

### 4️⃣ DAVIPLATA

**Datos Requeridos:**

- Teléfono celular Colombia
- Nombre titular

**Validaciones:**
✅ Formato: +57 3XX XXX XXXX
✅ Solo números válidos
✅ Validación en tiempo real

**Ejemplo de Flujo:**

```javascript
selectPaymentMethod('daviplata');
// Muestra formulario Daviplata (igual a Nequi)

// Mismo formato de teléfono
// Validación idéntica a Nequi

// Envío
POST /api/payments {
  payment_method: 'daviplata',
  phone_number: '+573001234567',
  customer_name: 'Juan Pérez'
}
```

---

### 5️⃣ EFECTIVO (CONTRA ENTREGA)

**Datos Requeridos:**

- Tipo de entrega (Entrega / Recogida)
- Referencia de entrega

**Tipos de Entrega:**

- Entrega a domicilio
- Recogida en tienda
- Recogida en punto Servientrega
- Recogida en punto 4-72

**Validaciones:**
✅ Selección de tipo obligatoria
✅ Referencia con formato válido
✅ Dirección a domicilio si aplica

**Ejemplo de Flujo:**

```javascript
selectPaymentMethod('efectivo');
// Muestra formulario Efectivo

// Seleccionar tipo entrega
selectDeliveryType('domicilio');
// Muestra campos adicionales para domicilio

// Referencia
// Text field para numero referencia

// Envío
POST /api/payments {
  payment_method: 'efectivo',
  delivery_type: 'domicilio',
  delivery_reference: 'Calle 1 #1-1',
  customer_address: 'Bogotá, Colombia'
}
```

**Flujo Físico:**

1. Cliente llega a tienda
2. Elige efectivo como pago
3. Sistema genera número de referencia
4. Cliente paga en caja
5. Se registra en sistema
6. Se entrega producto

---

## 🗄️ BASE DE DATOS

### Tablas Principales

#### 1. products

```sql
CREATE TABLE products (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  price           REAL NOT NULL,
  cost            REAL DEFAULT 0,
  category        TEXT,
  image           TEXT,
  badge           TEXT,
  description     TEXT,
  stock_status    TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Índices:**

- id (PK)
- category
- created_at

---

#### 2. inventory

```sql
CREATE TABLE inventory (
  id              TEXT PRIMARY KEY,
  product_id      TEXT NOT NULL,
  size            TEXT,
  quantity        INTEGER,
  reorder_level   INTEGER DEFAULT 5,
  last_updated    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

---

#### 3. sales

```sql
CREATE TABLE sales (
  id                  TEXT PRIMARY KEY,
  customer_name       TEXT NOT NULL,
  customer_email      TEXT,
  customer_phone      TEXT,
  total_amount        REAL NOT NULL,
  payment_method      TEXT,
  payment_status      TEXT DEFAULT 'pending',
  shipping_address    TEXT,
  reference_number    TEXT UNIQUE,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Índices:**

- id (PK)
- customer_email
- reference_number
- created_at

---

#### 4. sale_items

```sql
CREATE TABLE sale_items (
  id              TEXT PRIMARY KEY,
  sale_id         TEXT NOT NULL,
  product_id      TEXT NOT NULL,
  size            TEXT,
  quantity        INTEGER,
  unit_price      REAL,
  discount        REAL DEFAULT 0,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

---

#### 5. customer_profiles

```sql
CREATE TABLE customer_profiles (
  id              TEXT PRIMARY KEY,
  email           TEXT UNIQUE,
  phone           TEXT,
  name            TEXT,
  document        TEXT,
  last_purchase   DATETIME,
  total_spent     REAL DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

#### 6-8. Más tablas

```sql
-- orders
CREATE TABLE orders (
  id                  TEXT PRIMARY KEY,
  sale_id             TEXT NOT NULL,
  status              TEXT DEFAULT 'pending',
  tracking_number     TEXT,
  estimated_delivery  DATE,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- reorder_rules
-- demand_forecast
-- (con estructura similar)
```

### Queries Ejemplo

```sql
-- Top 10 productos más vendidos
SELECT p.id, p.name, SUM(si.quantity) as sold
FROM sale_items si
JOIN products p ON si.product_id = p.id
GROUP BY si.product_id
ORDER BY sold DESC
LIMIT 10;

-- Ventas por mes
SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as revenue
FROM sales
WHERE created_at >= date('now', '-30 days')
GROUP BY DATE(created_at);

-- Bajo stock
SELECT p.id, p.name, SUM(i.quantity) as stock
FROM inventory i
JOIN products p ON i.product_id = p.id
WHERE i.quantity < i.reorder_level
GROUP BY i.product_id;
```

---

## 🐛 TROUBLESHOOTING

### PROBLEMAS DE INSTALACIÓN

#### Q: "npm install no funciona"

**A:**

```bash
# Limpiar cache
npm cache clean --force

# Reinstalar
rm -rf node_modules package-lock.json
npm install

# Si sigue fallando, reinstalar Node.js
```

#### Q: "Cannot find module 'express'"

**A:**

```bash
# Instalar módulos específicos
npm install express cors body-parser sqlite3 pg jsonwebtoken dotenv

# O reinstalar todo
npm install
```

---

### PROBLEMAS DE BASE DE DATOS

#### Q: "Database locked" error

**A:**

```bash
# Eliminar BD corrupta
rm backend/winner_store.db

# Reinicializar
npm run seed
npm start
```

#### Q: "Cannot connect to PostgreSQL"

**A:**

```bash
# Verificar que PostgreSQL está corriendo
psql -U postgres

# Si no funciona, reinstalar
# https://www.postgresql.org/download

# Verificar credenciales en .env
# DATABASE_URL debe ser correcto
```

#### Q: "Foreign key constraint failed"

**A:**

```bash
# En SQLite, habilitar foreign keys:
PRAGMA foreign_keys = ON;

# Esto está habilitado automáticamente en el código
```

---

### PROBLEMAS DE API

#### Q: "API Key inválido" [401]

**A:**

```bash
# Verificar header:
curl -H "x-api-key: dev-api-key" http://localhost:3000/api/products

# Cambiar API_KEY en .env si es necesario
API_KEY=tu_nueva_clave
```

#### Q: "CORS blocked"

**A:**

```env
# Agregar tu dominio en .env
ALLOWED_ORIGINS=http://localhost:3000,https://tudominio.com

# O permitir todos (NO RECOMENDADO en producción)
ALLOWED_ORIGINS=*
```

#### Q: "JWT token expired" [401]

**A:**

```bash
# Token expira cada 7 días
# Usar endpoint para renovar:
POST /api/auth/refresh {
  "token": "tu_token_expirado"
}

# Obtendrás nuevo token válido
```

---

### PROBLEMAS DE TIENDA

#### Q: "Carrito vacío al recargar página"

**A:**

```javascript
// Verificar que LocalStorage está habilitado
// En navegador, F12 → Application → LocalStorage
// Buscar clave "carrito" o "cart"

// Si usa navegación privada, LocalStorage no funciona
// Usar navegación normal
```

#### Q: "Pagos no se registran"

**A:**

```bash
# Verificar BD tiene tabla sales:
sqlite3 backend/winner_store.db "SELECT * FROM sales;"

# Si no existe, ejecutar:
npm run seed

# Revisar logs:
npm start
# Ver errores en consola
```

#### Q: "Admin panel no carga"

**A:**

```bash
# Limpiar caché del navegador:
# Ctrl+Shift+Del (o Cmd+Shift+Del en Mac)
# Seleccionar "Clear browsing data"

# Reintentar login:
admin / TU_PASSWORD_EN_ENV

# Revisar consola del navegador (F12)
# Buscar errores en Network tab
```

---

### PROBLEMAS DE SEGURIDAD

#### Q: "Contraseña admin no funciona"

**A:**

```bash
# Cambiar credenciales en .env
ADMIN_PASSWORD=nueva_contraseña

# Reiniciar servidor
npm start
```

#### Q: "JWT_SECRET expuesto"

**A:**

```bash
# Generar nuevo secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Actualizar en .env
JWT_SECRET=el_valor_nuevo

# Todos los tokens antiguos serán inválidos
# (usuarios necesitarán login nuevo)
```

---

### PROBLEMAS DE PERFORMANCE

#### Q: "API muy lenta"

**A:**

```bash
# Verificar índices de BD:
sqlite3 backend/winner_store.db ".indices"

# Actualizar estadísticas (SQLite):
ANALYZE;

# Si usas PostgreSQL:
ANALYZE;
VACUUM;

# Revisar logs de query time
```

#### Q: "Página carga lentamente"

**A:**

```bash
# Verificar network en DevTools (F12)
# Buscar recursos grandes

# Comprimir imágenes
# Minificar JS/CSS (opcional)

# Habilitar caching:
# Revisar headers de cache en server.js
```

---

### SOLUCIÓN DE PROBLEMAS LOCALES

#### Q: "Base de datos corrupta o no se crea"

**A:**

```bash
# Resetear la base de datos
npm run clean
npm run seed
```

#### Q: "Puerto 3000 ya está en uso"

**A:**

```bash
# Cambiar puerto en .env
PORT=3001
npm start
```

---

### SOPORTE Y DEBUG

#### Habilitar Mode Debug

```bash
# Máximo detalle en logs
LOG_LEVEL=debug
npm start

# Ver todas las queries de BD
# Revisar console.log() en backend/server.js
```

#### Verificar Conectividad

```bash
# API funciona?
curl -v http://localhost:3000/api/products

# BD funciona?
sqlite3 backend/winner_store.db ".tables"

# Port disponible?
netstat -ano | findstr :3000
```

#### Logs Útiles

```bash
# Ver errores importantes
npm start 2>&1 | grep "error\|Error\|ERROR"

# Ver todos los requests
# Agregar en server.js:
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

---

## 📞 SOPORTE FINAL

**Si aún tienes problemas:**

1. **Reactivar servidor sin caché:**

   ```bash
   npm start --no-cache
   ```

2. **Reset completo:**

   ```bash
   npm run reset
   ```

3. **Revisar archivo de logs completo** (si existe)

4. **Consultar documentación de dependencias:**
   - Express: https://expressjs.com
   - SQLite3: https://github.com/mapbox/node-sqlite3
   - PostgreSQL: https://node-postgres.com
   - JWT: https://github.com/auth0/node-jsonwebtoken

5. **Búscalo en GitHub Issues** de dependencias

---

_Última actualización: 6 de Abril, 2026_
_Versión: 2.0.0_
