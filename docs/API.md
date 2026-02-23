# CohortLens - API

## REST API

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- GraphQL Playground: http://localhost:8000/graphql

---

## Endpoints públicos (sin autenticación)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/v1/health | Health check |
| POST | /api/v1/consent/register | Registrar consentimiento (SSI) |
| GET | /api/v1/consent/{customer_id} | Estado de consentimientos |

---

## Endpoints premium (requieren autenticación y respetan límites del plan)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/v1/token | Obtener JWT (OAuth2 password flow) |
| POST | /api/v1/predict-spending | Predicción de gasto por cliente |
| POST | /api/v1/segment | Segmentación por lotes |
| GET | /api/v1/predict-spending/explain | Explicación SHAP (parámetros en query) |
| GET | /api/v1/predict-spending/{customer_id}/explain | Explicación SHAP por ID de cliente |
| POST | /api/v1/recommendations/natural | Recomendaciones en lenguaje natural (RAG) |

Para endpoints protegidos, enviar header: `Authorization: Bearer <token>`.

### Límites por plan (suscripción en Neon)

Los endpoints premium anteriores están sujetos a **max_api_calls_per_month** según el plan del tenant (JWT `sub` = tenant_id). Si se supera el límite, la API responde **429 Too Many Requests**.

| Plan | max_api_calls_per_month | max_customers |
|------|-------------------------|---------------|
| basic | 10 000 | 1 000 |
| professional | 100 000 | 10 000 |
| enterprise | Ilimitado | Ilimitado |

Sin suscripción en Neon se permite uso ilimitado (modo desarrollo).

---

## Autenticación (OAuth2/JWT)

```bash
# Obtener token
curl -X POST http://localhost:8000/api/v1/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin"

# Usar token
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/...
```

---

## GraphQL

- **Query:** `health`, `customers(limit: Int)`
- **Mutation:** `predictSpending(customer: CustomerInput)`

Ejemplo:
```graphql
query { customers(limit: 10) { customer_id age annual_income } }
mutation { predictSpending(customer: { age: 30, annual_income: 70000, work_experience: 5, family_size: 3 }) { predicted_spending } }
```

---

## Webhooks

| Endpoint | Descripción |
|----------|-------------|
| POST | /api/v1/webhooks/stripe | Eventos de Stripe (suscripciones) |

Configurar en Stripe Dashboard la URL y `STRIPE_WEBHOOK_SECRET` en .env.

---

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| DATA_SOURCE | csv \| neon |
| NEON_DATABASE_URL | URL de Neon DB |
| JWT_SECRET | Secreto para JWT |
| OPENAI_API_KEY | Para RAG con OpenAI |
| STRIPE_WEBHOOK_SECRET | Secreto de webhook Stripe |
