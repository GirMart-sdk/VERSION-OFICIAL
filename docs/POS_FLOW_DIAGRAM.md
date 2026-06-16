# DIAGRAMA DE FLUJO — Sistema de Pagos POS

## 1. FLUJO GENERAL DE VENTA

```
┌─────────────────────────────────────────────────────────────┐
│                    PUNTO DE VENTA (POS)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │ PASO 1: Agregar Productos al Carrito               │
    │ ─────────────────────────────────────────────────── │
    │ • Búsqueda manual                                  │
    │ • Escaneo QR                                       │
    │ • Seleccionar talla/cantidad                       │
    └─────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │ PASO 2: Completar Info del Vendedor/Cliente        │
    │ ─────────────────────────────────────────────────── │
    │ • Nombre vendedor                                  │
    │ • Nombre cliente (opcional)                        │
    │ • Descuento (si aplica)                            │
    │ • Ver total                                        │
    └─────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │ PASO 3: Confirmar Venta ("✓ CONFIRMAR VENTA")      │
    │ ─────────────────────────────────────────────────── │
    │ • Se abre modal de pagos                           │
    └─────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │ PASO 4: Seleccionar Método de Pago                 │
    │ ─────────────────────────────────────────────────── │
    │ 💵 Efectivo      📱 Nequi       🏦 PSE             │
    │ 📱 Daviplata     💳 Débito      💳 Crédito         │
    │ 🔁 Transferencia                                   │
    └─────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼──────────────┐
                │             │              │ ...
                ▼             ▼              ▼
    ┌──────────────────┐    (Otros métodos)
    │   EFECTIVO       │
    │ ────────────────│
    │ • Monto          │
    │   entregado      │
    │ • Cambio         │
    │   (automático)   │
    └──────────────────┘
                │
                ...
                │
                ▼
    ┌─────────────────────────────────────────────────────┐
    │ PASO 5: Completar Formulario del Método            │
    │ ─────────────────────────────────────────────────── │
    │ (Varía según el método seleccionado)               │
    └─────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │ PASO 6: Completar Pago ("✓ COMPLETAR PAGO")        │
    │ ─────────────────────────────────────────────────── │
    │ • Validar campos                                   │
    │ • Capturar Metadatos (Ref, Voucher, Cambio)        │
    │ • Guardar en DB                                    │
    │ • Generar factura                                  │
    └─────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │ RESULTADO: Factura se abre para imprimir           │
    │ ─────────────────────────────────────────────────── │
    │ ✅ Venta registrada                                 │
    │ ✅ Cliente puede ver factura                        │
    │ ✅ Factura se imprime o guarda como PDF             │
    │ ✅ Carrito se limpia automáticamente                │
    └─────────────────────────────────────────────────────┘
```

---

## 2. ÁRBOL DE DECISIÓN — MÉTODOS DE PAGO

```
                    ¿Cómo pagará?
                          │
           ┌──────────────┼──────────────┐
           │              │              │
        FÍSICO          DIGITAL       TRANSFERENCIA
           │              │              │
    ┌──────┴──────┐       │              │
    │  EFECTIZO   │       │              │
    ├─────────────┤       │              │
    │Monto $  →   │      ┌┴───┬─────┐   │
    │Cambio auto  │      │    │     │   │
    └─────────────┘      │    │     │   │
                     NEQUI DAVI PSE  │   │
                         │    │  │   │   │
                     ┌───┴────┼──┤   │   │
                     │        │  │   │   │
                  TELF+REF  REF REF+BANCO
                               │   │
                          ┌────┴───┴───┐
                          │            │
                      TARJETA    TRANSFERENCIA
                      (DEB/CRE)
                          │
                       REF+NOMBRE
```

---

## 3. FLUJO DE DATOS — EFECTIVO

```
USUARIO:
  Ingresa monto entregado: $100.000

         ↓

SISTEMA:
  Total = $89.990
  Efectivo = $100.000
  Cambio = $100.000 - $89.990 = $10.010

         ↓

VALIDACIÓN:
  ✓ Monto ≥ Total?
  ✓ Cambio válido?

         ↓

BASE DE DATOS:
  {
    id: "POS12345678",
    method: "Efectivo",
    amount: 89.990,
    cash_received: 100.000,
    change: 10.010,
    timestamp: "2026-04-08T14:30:00Z"
  }

         ↓

FACTURA:
  "CAMBIO $10.010 DE $100.000"
```

---

## 4. FLUJO DE DATOS — NEQUI/DAVIPLATA

```
USUARIO:
  Ingresa teléfono: +57 312 1234567
  Ingresa referencia: 123456789

         ↓

VALIDACIÓN:
  ✓ Teléfono con formato?
  ✓ Referencia válida?

         ↓

BASE DE DATOS:
  {
    id: "POS12345678",
    method: "Nequi",
    amount: 89.990,
    phone: "+57 312 1234567",
    reference: "123456789",
    timestamp: "2026-04-08T14:30:00Z"
  }

         ↓

FACTURA:
  "REFERENCIA NEQUI: 123456789"
  "TELÉFONO: +57 312 1234567"
```

---

## 5. FLUJO DE FACTURA

```
PAGO CONFIRMADO
         │
         ▼
    HTML FACTURA
    ├─ Encabezado (Logo WINNER)
    ├─ Número único
    ├─ Fecha/Hora
    ├─ Información vendedor/cliente
    ├─ Tabla de productos
    │  ├─ Nombre
    │  ├─ Cantidad
    │  ├─ Precio unitario
    │  └─ Subtotal
    ├─ Totales
    │  ├─ Subtotal
    │  ├─ Descuentos
    │  └─ TOTAL
    ├─ Método de pago
    └─ Pie (Datos de contacto)
         │
         ▼
    VENTANA PRINT
    ├─ iframe con HTML
    ├─ CSS print-friendly
    └─ Auto-trigger print dialog
         │
         ▼
    USUARIO:
    ├─ Imprime (Ctrl+P)
    ├─ Guarda como PDF
    └─ O cierra sin imprimir
```

---

## 6. PERSISTENCIA DE DATOS

```
VENTA COMPLETADA
         │
    ┌────┴────┐
    │          │
 SERVIDOR   CLIENTE
    │          │
API POST   LOCAL STORAGE
/api/sales    winner_sales
    │          │
    ├──────────┴─────────┐
                         │
                    SI FALLA SERVER
                    USA LOCAL COPY
                         │
                    DESPUÉS SINCRONIZA
```

---

## 7. ESTADOS DEL MODAL

```
ESTADO 1: SELECCIONAR MÉTODO
┌─────────────────────────────────────┐
│  Selecciona el método de pago       │
├─────────────────────────────────────┤
│  [💵]  [📱]  [💳]  [🏦]            │
│ EFEC  NEQ   DEB   PSE              │
│                                    │
│ [Botones: Cancelar]                │
└─────────────────────────────────────┘

         ↓ (Usuario selecciona método)

ESTADO 2: LLENAR FORMULARIO
┌─────────────────────────────────────┐
│  Información del método             │
├─────────────────────────────────────┤
│  Total: $89.990                     │
│                                    │
│  [Campo específico del método]      │
│                                    │
│ [← Atrás] [Cancelar] [Completar]  │
└─────────────────────────────────────┘

         ↓ (Usuario confirma)

ESTADO 3: PROCESAR
├─ Validar datos
├─ Guardar en BD
├─ Generar factura
└─ Abrir print

         ↓

ESTADO 4: FINALIZADO
└─ Factura impresa
└─ Modal cerrado
└─ Carrito limpiado
```

---

## 8. INTEGRACIONES

```
┌─────────────────────────────────────┐
│         SISTEMA POS v2              │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────────────────┐   │
│  │  Almacenamiento Local        │   │
│  │  ────────────────────────    │   │
│  │  • localStorage (venta)      │   │
│  │  • sessionStorage (temp)     │   │
│  └──────────────────────────────┘   │
│           ↑                          │
│           │ Sincronización auto     │
│           ↓                          │
│  ┌──────────────────────────────┐   │
│  │  API REST Backend            │   │
│  │  ────────────────────────    │   │
│  │  POST /api/sales             │   │
│  │  GET /api/sales              │   │
│  │  DELETE /api/sales/:id       │   │
│  └──────────────────────────────┘   │
│           ↑                          │
│           │ Base de datos           │
│           ↓                          │
│  ┌──────────────────────────────┐   │
│  │  SQLite / PostgreSQL         │   │
│  │  ────────────────────────    │   │
│  │  Tabla: sales                │   │
│  │  Columnas: método, total,... │   │
│  └──────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

---

**Diagrama actualizado:** 8 de abril de 2026
