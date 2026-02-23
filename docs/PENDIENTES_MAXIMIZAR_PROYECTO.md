# Lista de pendientes para potenciar y completar CohortLens al máximo

Lista priorizada de mejoras y tareas pendientes para llevar el proyecto a un estado de producción completo y maximizar valor.

---

## 1. Base de datos y arquitectura

- **SQLAlchemy async (asyncpg)**  
  El roadmap indica SQLAlchemy 2.0 + asyncpg. Actualmente el acceso a Neon es síncrono (`create_engine`). Migrar a `create_async_engine` y sesiones async para mejor concurrencia en la API.

- **Uso real de `audit_log`**  
  La tabla existe en el esquema pero no se escribe en operaciones CRUD. Implementar registro de auditoría en: altas/actualizaciones de `customers`, cambios en `user_consents`, y (opcional) accesos sensibles.

- **Persistir segmentos y predicciones en Neon**  
  Hoy los modelos se cargan en memoria y no se guardan en `segments` ni `predictions`. Añadir escritura en Neon al segmentar y al predecir (con `model_version` y `features_snapshot` donde aplique).

- **Particionado por tiempo**  
  Para tablas de alto volumen (`audit_log`, `predictions`), implementar particionado por `created_at` (p. ej. por mes) según [DB_SCHEMA.md](DB_SCHEMA.md).

- **Referencia FK en `segments`**  
  En `init_neon.sql`, `segments.customer_id` no tiene `REFERENCES customers(customer_id)`. Añadir la FK para integridad referencial.

---

## 2. Autenticación y autorización

- **Multi-tenant en JWT**  
  Incluir `tenant_id` (o equivalente) en el token además de `sub`, y usarlo de forma consistente en límites y filtros de datos.

- **Gestión de usuarios real**  
  Sustituir el usuario por defecto (admin/admin) por registro y login contra Neon: tabla `users` (id, email, password_hash, tenant_id, role) y flujos OAuth2 completos.

- **Protección de GraphQL**  
  Aplicar `require_auth` o `require_premium` a las operaciones GraphQL (queries/mutations sensibles) para alinearlas con la REST API.

- **Refresh tokens**  
  Implementar refresh token (y rotación) para no depender solo del access token de corta duración.

---

## 3. Monetización y Stripe

- **Flujo de checkout**  
  Página o endpoint que genere un link de Stripe Checkout (o Payment Link) para suscribirse por plan (basic/professional/enterprise) y asociar `metadata.tenant_id` y `metadata.plan`.

- **Persistencia de uso en Neon**  
  El contador de `max_api_calls_per_month` es in-memory y se pierde al reiniciar. Guardar uso por tenant/mes en Neon (p. ej. tabla `api_usage`) y leer de ahí para aplicar límites.

- **Límite `max_customers`**  
  Aplicar el límite del plan al cargar datos o al migrar: rechazar o advertir si el número de clientes supera `max_customers` del tenant.

- **Webhook Stripe: más eventos**  
  Manejar más eventos (p. ej. `invoice.paid`, `customer.subscription.trial_will_end`) y actualizar estado de suscripción o notificaciones.

---

## 4. IA y Data Science

- **LSTM/Transformer real**  
  Sustituir el stub de `lstm` en [prediction.py](../src/cohort_lens/features/prediction.py) por un modelo real (secuencias temporales o tabular con PyTorch), con entrenamiento y serialización del modelo.

- **LIME como alternativa a SHAP**  
  Roadmap menciona SHAP/LIME. Añadir opción en config y endpoint para explicabilidad con LIME cuando SHAP no sea adecuado.

- **RAG con embeddings propios**  
  Mejorar el RAG de recomendaciones: indexar segmentos/insights en un vector store (p. ej. embeddings en Neon con pgvector o FAISS) y recuperar por similitud antes de llamar al LLM.

- **Data drift real**  
  Implementar detección de drift en [drift.py](../src/cohort_lens/data/drift.py): comparar distribución actual vs baseline (PSI, KS, etc.) y exponer métricas o alertas.

- **Reentrenamiento y versionado de modelos**  
  Pipeline para reentrenar segmentación y predicción, guardar artefactos (joblib/ONNX) con versión y persistir `model_version` en `segments`/`predictions`.

---

## 5. Web3 y descentralización

- **DIDs y Verifiable Credentials**  
  Integrar emisión/verificación de VCs vinculadas a consentimientos: escribir en `verifiable_credentials` y opcionalmente enlazar con `user_consents.verifiable_credential_id`.

- **Tokenización real (Polygon/Solana)**  
  En [tokens.py](../src/cohort_lens/web3/tokens.py), `compute_reward_tokens` y `get_wallet_balance` son placeholders. Conectar con wallet/contrato para recompensas y saldo real.

- **Mercado de datos (MVP)**  
  Flujo mínimo de “oferta de datos” con consentimiento: listar conjuntos disponibles, permisos y (opcional) precios o incentivos en tokens.

- **IPFS: Pinata/Infura**  
  Documentar y soportar IPFS vía Pinata o Infura además del nodo local, para reportes y artefactos en entorno cloud.

---

## 6. API y desarrolladores

- **API de reportes**  
  Endpoint (p. ej. `POST /api/v1/reports/generate`) que genere el reporte ejecutivo (métricas/figuras seleccionables), opcionalmente suba a IPFS y devuelva URL o CID.

- **GraphQL: más operaciones**  
  Añadir queries (segmentos, predicciones, consentimientos) y mutations (registro de consentimiento, generación de reporte) para paridad con REST.

- **Versionado de API**  
  Estrategia clara de versionado (v1 en path ya existe); documentar política de deprecación y cambios breaking.

- **Rate limiting por IP**  
  Además de límites por plan, limitar peticiones por IP para evitar abuso en endpoints públicos (health, consent).

- **OpenAPI: ejemplos y descripciones**  
  Completar esquemas OpenAPI con ejemplos y descripciones para mejorar UX en Swagger/ReDoc.

---

## 7. Experiencia de usuario (UX)

- **Chatbot de soporte**  
  Roadmap Fase 5: chatbot (p. ej. RAG sobre docs/API) para soporte y onboarding.

- **Dashboard: auth y multi-tenant**  
  Conectar el dashboard (Streamlit) con login (JWT o session) y filtrar datos por tenant.

- **Reportes en PDF**  
  Config ya tiene `format: html | pdf`. Implementar generación PDF (WeasyPrint ya en requirements) y opción de descarga.

- **Reportes programables**  
  Permitir programar reportes (cron o cola) por tenant y envío por email o guardado en IPFS/Neon.

- **Selector de métricas/figuras en UI**  
  En el dashboard o en una página de “generar reporte”, permitir elegir métricas y figuras antes de generar (ya soportado en backend).

---

## 8. Testing y calidad

- **Tests de API (REST y GraphQL)**  
  Tests con TestClient de FastAPI para endpoints críticos: auth, predict, segment, explain, consent, webhook Stripe (con mock).

- **Tests con Neon (integración)**  
  Tests que usen una BD de prueba (Neon branch o SQLite para CI) para loader, migración, subscriptions y consent.

- **Tests de carga**  
  Script o suite (Locust/k6) para validar rendimiento bajo carga (predict, segment, health).

- **Cobertura mínima**  
  Objetivo de cobertura (p. ej. >80%) y ejecución en CI; cubrir especialmente auth, subscriptions, prediction y consent.

---

## 9. DevOps y despliegue

- **CI/CD**  
  Pipeline (GitHub Actions o similar): lint, tests, build de imagen Docker y deploy a Railway/Render/Fly.io.

- **Secrets y configuración**  
  Uso de variables de entorno o vault en producción; nunca secrets en repo; documentar todas las variables en [DEPLOYMENT.md](DEPLOYMENT.md) y [.env.example](../.env.example).

- **Health check avanzado**  
  Endpoint `/api/v1/health` que compruebe conexión a Neon y (opcional) a IPFS; útil para orquestadores y monitoreo.

- **Logging estructurado**  
  Logs en JSON con nivel, request_id y tenant_id para agregación (Datadog, CloudWatch, etc.).

- **Métricas y observabilidad**  
  Exponer métricas (Prometheus/OpenMetrics) o integración con APM para latencia, errores y uso por endpoint/tenant.

---

## 10. Documentación y producto

- **Guía de onboarding**  
  Documento o flujo: registro, primer login, carga de datos (CSV o Neon), primer reporte y uso de la API.

- **Changelog y releases**  
  Mantener CHANGELOG.md y etiquetar versiones (semver) para despliegues y comunicar novedades.

- **Arquitectura actualizada**  
  Si existe [ARCHITECTURE.md](ARCHITECTURE.md), actualizarlo con Neon, auth, Stripe, IPFS y flujos de datos actuales.

- **Política de privacidad y términos**  
  Para SaaS público: textos de privacidad, consentimiento y términos de uso; enlazarlos desde el dashboard o la app.

---

## Priorización sugerida (orden de impacto)

| Prioridad | Área              | Acciones clave |
|----------|-------------------|----------------|
| Alta     | Monetización      | Persistir uso en Neon; checkout Stripe; límite max_customers |
| Alta     | Auth              | Usuarios en Neon; tenant_id en JWT; proteger GraphQL |
| Alta     | Testing           | Tests API (REST + auth); tests integración Neon |
| Media    | Base de datos     | Audit log real; persistir segments/predictions; async opcional |
| Media    | API               | Endpoint generación reportes; rate limit por IP |
| Media    | IA                | Data drift real; reentrenamiento y versionado |
| Baja     | Web3              | DIDs/VC; tokenización real; mercado datos MVP |
| Baja     | UX                | Chatbot; dashboard con auth; reportes PDF y programables |
| Baja     | DevOps            | CI/CD; health avanzado; logging estructurado |

---

*Documento generado a partir del estado del proyecto y [ROADMAP_2026.md](ROADMAP_2026.md). Actualizar según avances.*
