# 🤝 Guía de Contribución - Winner Store v3.5

¡Bienvenido al equipo de desarrollo! Para mantener la integridad de **Winner Store**, por favor sigue estas directrices al proponer cambios.

## 🚀 Proceso de Desarrollo

1. **Sincronización**: Antes de empezar, asegúrate de tener la última versión de la rama `main`.
2. **Ramas**: Crea una rama para tu tarea: `git checkout -b feature/nombre-mejora` o `git checkout -b fix/descripcion-error`.
3. **Base de Datos**: Si modificas `schema.prisma`, genera la migración correspondiente usando `npx prisma migrate dev --name descripcion`.
4. **Pruebas Locales**: Verifica que el servidor inicie correctamente usando `start-local.bat`.

## 📝 Estándares de Commits

Usamos una versión simplificada de Commits Convencionales:

- `feat:` Una nueva característica.
- `fix:` Corrección de un error.
- `docs:` Cambios solo en la documentación.
- `refactor:` Cambio en el código que no corrige un error ni añade una característica.

## 🛠️ Tecnologías Clave

- **Prisma ORM**: Toda interacción con la DB debe ser a través de los modelos definidos en el esquema.
- **Express v5**: Manejo de rutas y middleware de última generación.
- **Vanilla JS**: Para mantener el rendimiento, evitamos frameworks pesados en el frontend.

---

_Winner Store: Liderando la cultura urbana a través de la tecnología._
