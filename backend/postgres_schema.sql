
-- WINNER STORE v3.5 - SCHEMA COMPLETO POSTGRESQL

-- 1. Tabla de Productos
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    old_price DECIMAL(12,2),
    cost DECIMAL(12,2) DEFAULT 0,
    category VARCHAR(50),
    image TEXT,
    badge VARCHAR(50),
    badge_type VARCHAR(50),
    sku VARCHAR(100) UNIQUE,
    description TEXT,
    on_sale BOOLEAN DEFAULT false,
    promo_price DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Inventario (Stock por Talla)
CREATE TABLE IF NOT EXISTS inventory (
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size VARCHAR(10) NOT NULL,
    quantity INTEGER DEFAULT 0, -- Renombrado para consistencia con Prisma
    barcode VARCHAR(100) UNIQUE, -- Para lector de códigos de barras
    min_stock INTEGER DEFAULT 2, -- Alerta de bajo stock por talla
    location VARCHAR(100), -- Bodega, Vitrina, Estante A1, etc.
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, size)
);

-- 3. Tabla de Ventas
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(50) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    channel VARCHAR(50),
    vendor VARCHAR(100),
    client VARCHAR(255),
    method VARCHAR(50),
    subtotal DECIMAL(12,2) DEFAULT 0,
    discount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'completed',
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    shipping_address TEXT,
    shipping_carrier VARCHAR(100),
    reference_number VARCHAR(100),
    payment_details JSONB, -- Columna crítica para v3.0
    items TEXT -- Resumen en JSON string para compatibilidad
);

-- 4. Items de Venta (Detalle)
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id VARCHAR(50) NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    size VARCHAR(10)
);

-- 5. Perfiles de Clientes (VIP)
CREATE TABLE IF NOT EXISTS customer_profiles (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    phone VARCHAR(20),
    country VARCHAR(50) DEFAULT 'CO',
    total_spent DECIMAL(12,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    last_purchase TIMESTAMP,
    vip_status VARCHAR(50) DEFAULT 'regular',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Reglas de Reorden Automático
CREATE TABLE IF NOT EXISTS reorder_rules (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    min_stock INTEGER NOT NULL,
    qty_to_order INTEGER NOT NULL,
    reorder_cost DECIMAL(12,2) DEFAULT 0,
    enabled INTEGER DEFAULT 1
);

-- 7. Predicciones de Demanda
CREATE TABLE IF NOT EXISTS demand_forecast (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    predicted_qty INTEGER,
    confidence_score DECIMAL(5,2),
    trend VARCHAR(20),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_email ON customer_profiles(email);

-- Datos iniciales obligatorios para el POS
INSERT INTO customer_profiles (id, email, name, vip_status) 
VALUES ('CUST-PUBLIC', 'mostrador@winner.store', 'Cliente Mostrador', 'regular') ON CONFLICT DO NOTHING;