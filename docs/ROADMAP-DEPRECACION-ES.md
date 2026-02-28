# Plan de Desactivación: Backend Python → Migración a TypeScript/NestJS

Este documento describe el cronograma y las acciones operativas para
retirar la API original en Python (FastAPI) y reemplazarla por la nueva
implementación en TypeScript/NestJS.

**Cronograma:** 4 semanas (Objetivo: 28 de marzo de 2026)
**Estado actual:** Fase 1 (Pruebas Beta) – iniciado 28 de febrero de 2026

---

## Fases de migración

### Fase 1: Pruebas Beta (Semana 1-2)

- `V2_ENABLED=true`
- `V2_PRIMARY=false` (v1 sigue primaria)
- `V1_DEPRECATED=false`

La API v2 está disponible en `/api/v2/*` junto a la v1. Se realizan pruebas
internas, validaciones y mediciones de rendimiento. Las pruebas de no regresión
se ejecutan diariamente. El cliente no experimenta ningún cambio.

### Fase 2: Modo Sombra (Semana 2-3)

- `SHADOW_MODE=true`
- `V2_PRIMARY=false`
- `V2_ENABLED=true`
- `MIGRATION_LOGGING=true`

El tráfico real sigue yendo a v1, pero v2 recibe copias silenciosas de las
peticiones para comparar respuestas y métricas. Éxito: errores <0.1% durante 7
días seguidos.

### Fase 3: Corte (Semana 3-4)

- `V2_PRIMARY=true`
- `V1_DEPRECATED=false`

Todas las peticiones van a v2 mientras v1 permanece disponible para un
eventual retroceso. Se vigilan tasas de error y latencias; triggers de rollback
incluyen >1% errores o p95 >2 s.

### Fase 4: Deprecación de Python (Semana 4+)

- `V2_PRIMARY=true`
- `V1_DEPRECATED=true`

Los endpoints de v1 devuelven `410 Gone` con un aviso de deprecación y el
backend Python puede ser eliminado del repositorio.


## APIs de administración relevantes

```bash
curl http://localhost:8001/api/v2/admin/flags
curl -X POST http://localhost:8001/api/v2/admin/migrate-to-v2 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
curl -X POST http://localhost:8001/api/v2/admin/rollback-to-v1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
curl -X POST http://localhost:8001/api/v2/admin/enable-shadow-mode \
  -H "Authorization: Bearer $ADMIN_TOKEN"
curl -X POST http://localhost:8001/api/v2/admin/complete-v1-deprecation \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Contiene las mismas explicaciones que el documento en inglés, pero en
español para facilitar la comunicación con colaboradores hispanohablantes.

---

*Este archivo es una traducción y resumen del `deprecation-roadmap.md` original.*
