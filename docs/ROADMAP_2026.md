# CohortLens - Roadmap 2026

## Decisión de arquitectura: Neon DB (sin AWS)

CohortLens migra a **Neon DB** (PostgreSQL serverless) como base de datos principal. No se utiliza AWS para persistencia ni infraestructura de datos.

### Justificación

- **Neon DB:** PostgreSQL serverless, escalable, con free tier generoso.
- **Sin vendor lock-in AWS:** Hosting en Railway, Render o Fly.io.
- **Compatibilidad:** PostgreSQL estándar, amplio ecosistema de herramientas.

### Stack tecnológico

| Área | Tecnología |
|------|------------|
| Base de datos | Neon DB (PostgreSQL serverless) |
| ORM/DB driver | SQLAlchemy 2.0 + asyncpg |
| Hosting API | Railway / Render / Fly.io |
| Pagos | Stripe |
| Web3 | IPFS, Polygon/Solana, DIDs |
| ML avanzado | AutoGluon/H2O, PyTorch, SHAP |
| Auth | OAuth2 + JWT |
| Frontend | Streamlit / Dash / Superset |

---

## Fases del roadmap

### Fase 1: Investigación y planificación (1 mes)
- Documentar arquitectura y esquema de datos.
- Definir criterios de aceptación por fase.

### Fase 2: Integración Web3 y blockchain (2 meses)
- IPFS/Filecoin para almacenamiento descentralizado.
- DIDs y Verifiable Credentials para consentimiento.
- Tokenización y mercado de datos (MVP).

### Fase 3: Mejoras en IA y Data Science (3 meses)
- Modelos avanzados: AutoGluon, LSTM/Transformer.
- IA generativa y RAG para recomendaciones.
- SHAP/LIME para explicabilidad.

### Fase 4: Modernización de arquitectura (2 meses)
- Migración CSV a Neon DB.
- GraphQL + OAuth2/JWT.
- Despliegue sin AWS.

### Fase 5: Experiencia de usuario (1 mes)
- Dashboard profesional (Plotly).
- Reportes personalizables.
- Chatbot de soporte.

### Fase 6: Lanzamiento y monetización (1 mes)
- Modelo SaaS con Stripe.
- Webhooks e integraciones.

---

## Criterios de aceptación por fase

### Fase 1
- docs/ROADMAP_2026.md creado
- docs/DB_SCHEMA.md con esquema completo
- Matriz de decisiones técnicas documentada

### Fase 4 (Neon DB)
- DATA_SOURCE=neon permite cargar desde Neon
- Script de migración CSV a Neon funcional
- Tablas customers, segments, predictions, audit_log creadas

### Fase 4.3 (APIs y Auth)
- Endpoint GraphQL operativo
- JWT válido para endpoints protegidos

### Fase 3 (IA)
- AutoGluon o LSTM disponible en config
- Endpoint /recommendations/natural con RAG
- Endpoint /predict-spending/{id}/explain con SHAP

### Fase 2 (Web3)
- IPFS almacena reportes; CID en Neon
- Tablas user_consents, verifiable_credentials
- Flujo básico de tokenización

### Fase 5 (UX)
- Reportes con métricas seleccionables
- Plotly en dashboard donde proceda

### Fase 6 (Monetización)
- Tabla subscriptions en Neon
- Integración Stripe básica
- docs/API.md con endpoints públicos vs premium
