# 📖 Especificaciones Técnicas - Winner Store v3.5

Este documento detalla la implementación técnica de los módulos críticos actualizados.

## 🐘 Prisma & PostgreSQL

Se utiliza **Prisma** como capa de acceso a datos para garantizar transacciones atómicas.

- **Ventas:** Cada venta (`Sale`) se registra mediante un `$transaction` que valida el stock en la tabla `Inventory` antes de confirmar, evitando sobreventas.
- **Abonos:** Los apartados físicos se gestionan en la relación `SalePayment`, permitiendo múltiples ingresos de dinero para una misma referencia.

## 💳 Integración de Wompi

El sistema implementa el **Sello de Integridad** (HMAC-SHA256) para asegurar que los montos no sean alterados en el cliente.

- **Flujo:** El backend genera el hash usando `reference`, `amountInCents`, `currency` y el `integrity_secret`.
- **Campo:** El hash se envía al Web Widget de Wompi estrictamente bajo el nombre de propiedad `integrity`.
- **Webhook:** Ubicado en `/api/webhooks/wompi`, procesa eventos `transaction.updated` para sincronizar automáticamente el estado de la venta y registrar el ingreso contable en la base de datos.

## 🖼️ Gestión de Medios (Storage)

Se ha eliminado la dependencia de servicios externos de almacenamiento.

1.  **Captura:** El frontend utiliza `Cropper.js` para forzar un aspect-ratio 1:1.
2.  **Envío:** La imagen recortada se envía al servidor como Base64.
3.  **Procesamiento:** El servidor utiliza `Sharp` para:
    - Redimensionar a un máximo de 1200px.
    - Convertir a formato **WebP** (calidad 80).
    - Almacenar en la carpeta física `/uploads`.

## 📈 Analytics y Dashboard

El dashboard realiza agregaciones directas en la base de datos mediante Prisma:

- **Revenue:** Calcula el total recibido sumando ventas completadas y abonos parciales.
- **Top Products:** Agrupa por `productId` en la tabla `SaleItem` para identificar tendencias de venta.
- **Stock Crítico:** Filtro dinámico que detecta productos con menos de 5 unidades totales en todas sus tallas.

## 📱 WhatsApp Center

El módulo `messaging.js` genera URLs dinámicas usando la API `wa.me`.

- **Formatos:** Incluye plantillas predefinidas para envío de comprobantes de pago (PDF generado por el backend), confirmación de despacho con número de guía y recordatorios de pago para créditos locales.

## ⚙️ Configuración de Puertos

El servidor cuenta con una función de **Auto-Incremento de Puerto**. Si el puerto `3000` está ocupado, buscará automáticamente el `3001` y así sucesivamente, notificando el cambio en la consola para evitar colisiones con otros servicios locales.

<<<<<<< HEAD
## 🚀 Automatización y Resiliencia

### Lógica de Scripts (.bat)
Todos los scripts de mantenimiento residen en `/scripts`. Implementan la lógica de navegación superior `cd /d "%~dp0.."` para asegurar que los comandos de Node y Prisma se ejecuten siempre en la raíz del proyecto, independientemente de dónde se invoque el script.

### Health Check System
El endpoint `/api/health` realiza una consulta `SELECT 1` nativa via Prisma. Esto permite que el script `check-status.bat` valide no solo que el servidor responde, sino que la conexión a la base de datos PostgreSQL está activa.

### Sistema de Alertas Blindado
El script de respaldo (`backup-db.bat`) integra PowerShell para dos funciones críticas:
1. **Fecha Universal:** Genera timestamps independientes de la configuración regional de Windows.
2. **Alertas Visuales:** En caso de error (Exit Code != 0), dispara un `System.Windows.MessageBox` que bloquea la atención del usuario para informar sobre el fallo del respaldo, garantizando la integridad de la data.

### Gestión de Procesos (PM2)
Se utiliza PM2 con el módulo `pm2-logrotate` configurado a 10MB por archivo y 7 días de retención, evitando que los archivos de log saturen el disco duro del equipo de la tienda.

---

_Documentación técnica actualizada al 12 de junio de 2026._
=======
---

_Documentación técnica actualizada al 4 de junio de 2026._
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
