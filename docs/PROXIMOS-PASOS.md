# Próximos Pasos: Ejecución de Migración

**Fecha**: Feb 28, 2026  
**Estado**: Listo para Fase 2 (Shadow Mode)

---

## ✅ Todo está completado

Todos los items de desarrollo están listos:

```
✅ Implementar tests e2e Nest TypeScript
✅ Configurar web compartida react-native-web
✅ Script validación no-regresión v1↔v2
✅ Completar UI e integración móvil
✅ Performance baseline testing (<500ms core)
✅ Feature flags y kill-switch v1↔v2
✅ Documentación deprecación Python
```

---

## 🎯 Próximas acciones relacionadas con DevOps/Ops

Estos items requieren **trabajo de equipo** o **coordinación**: 

### 1. **Despliegue a Staging** (antes de Phase 1)
```bash
# Verificar:
cd apps/api-ts
pnpm install
pnpm build
pnpm test:e2e  # Debe pasar todos 53 tests
pnpm run start # Verificar que se inicia sin errors
```
- [ ] Deploy v2 a staging con FEATURE_FLAG_V2_ENABLED=false (killswitch activado)
- [ ] Verificar que v1 sigue primaria
- [ ] Ejecutar smoke tests contra staging

### 2. **Monitoreo y Alertas** (Phase 1)
Setup en tu herramienta de observabilidad (Datadog/New Relic/etc.):
- [ ] Dashboard de latencies (health, predict, segment)
- [ ] Alertas para error rate > 0.1%
- [ ] Alertas para p95 latency > 2000ms
- [ ] Rastreo de feature flag changes

### 3. **Ejecutar Phase 1: Beta Testing** (Feb 28 - Mar 13)
```bash
# Enable v2 API in staging WITHOUT switching traffic
curl -X POST http://staging.cohortlens/api/v2/admin/flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"flag": "v2_enabled", "enabled": true}'

# Luego ejecutar:
pnpm validate:no-regression:local  # <5% delta vs v1
pnpm perf:baseline:local            # Confirm p95 targets
```

### 4. **Ejecutar Phase 2: Shadow Mode** (Mar 6 - Mar 20)
```bash
# Producción: v1 sigue primaria, v2 recibe copias de traffic
curl -X POST http://prod.cohortlens/api/v2/admin/enable-shadow-mode \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Monitorear 7 días:
# - Error rate < 0.1%
# - Latencies consistentes
# - No customer impact
# - Revisar logs de shadow responses vs v1
```

### 5. **Ejecutar Phase 3: Cutover** (Mar 13 - Mar 20)  
```bash
# ANTES: asegurar v1 está en buena salud
# ANTES: verificar rollback plan con equipo

# Migrar a v2 primaria
curl -X POST http://prod.cohortlens/api/v2/admin/migrate-to-v2 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Monitorear CADA 5 MINUTOS:
watch -n 5 'curl http://prod.cohortlens/api/v2/admin/flags | jq'

# Si algo sale mal (error rate >1% o latency >2s):
curl -X POST http://prod.cohortlens/api/v2/admin/rollback-to-v1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# -> V1 vuelve a ser primaria en <1 min
```

### 6. **Ejecutar Phase 4: Deprecation** (Mar 20 - Mar 28)
```bash
# Después de 7 días de Phase 3 sin issues:
curl -X POST http://prod.cohortlens/api/v2/admin/complete-v1-deprecation \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Ahora v1 endpoints devuelven 410 Gone
# Puedo remover Python del repo:
git rm -r apps/api
git rm -r frontend  # if it's being replaced by mobile
git commit -m "Remove Python v1 backend (migrated to v2)"
```

---

## 📋 Checklist para Team Lead (Operaciones)

Antes de iniciar Phase 1:

- [ ] Team capacitado en el runbook (`docs/migration-operational-runbook.md`)
- [ ] On-call rotation setup (¿quién responde si hay issues?)
- [ ] Monitoreo configurado (dashboards visibles)
- [ ] Backup/snapshot de Python API tomado
- [ ] Comunicación al cliente preparada
- [ ] Rollback procedures testeado en **environment de prueba**
- [ ] Fechas de las 4 fases calendario-adas y comunicadas
- [ ] Escalation contacts documentados (quién llamar si falla)

---

## 🔗 Referencias Rápidas

| Documento | Proposito |
|-----------|----------|
| `docs/deprecation-roadmap.md` | Timeline y criterios de éxito |
| `docs/migration-operational-runbook.md` | Comandos y procedimientos día-a-día |
| `docs/feature-flag-integration.md` | Arquitectura técnica y patrones |
| `docs/backend.md` | Referencia código Python y TS |
| `docs/SESSION-3-SUMMARY.md` | Estado completo y resultados |

---

## 🎬 Cómo Comenzar Ahora Mismo

**Para el Tech Lead:**
```bash
# 1. Revisar todo el código
cd apps/api-ts
git log --oneline | head -20

# 2. Ejecutar tests en tu máquina
pnpm test:e2e  # Debe pasar 53/53

# 3. Leer la documentación completa
less docs/deprecation-roadmap.md
less docs/migration-operational-runbook.md

# 4. Verificar endpoints via curl
curl http://localhost:8001/api/v2/health
curl -X POST http://localhost:8001/api/v2/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

**Para DevOps:**
```bash
# 1. Preparar staging deployment
# 2. Configurar monitoreo
# 3. Crear runbooks runnable (mejorar si es necesario)
# 4. Test rollback en pre-prod (hacer 3+ veces)
```

**Para QA:**
```bash
# 1. Ejecutar regression tests contra v2
pnpm validate:no-regression:local

# 2. Test manualmente cada endpoint
# 3. Verificar que feature flags funcionan:
curl http://localhost:8001/api/v2/admin/flags | jq
```

---

## 🚀 Estado Final

**Toda la infraestructura técnica está lista.**  
El siguiente paso es **coordinación operativa**: deploy a staging, monitoring setup, y ejecución de fases.

Recomendación: **Reunión con el equipo esta semana para:**
1. Revisar runbooks juntos
2. Acordar cronograma de 4 fases
3. Asignar proprietary de cada fase
4. Hacer simulacro de rollback en pre-prod

✅ **El código está 100% listo.**
