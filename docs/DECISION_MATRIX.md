# Matriz de decisiones técnicas - CohortLens 2026

## Base de datos

| Decisión | Opción elegida | Alternativas descartadas | Razón |
|----------|----------------|--------------------------|-------|
| Base de datos principal | **Neon DB** (PostgreSQL serverless) | AWS RDS, MongoDB, Cassandra | Sin AWS; PostgreSQL estándar; free tier; escalabilidad serverless |
| ORM/Driver | **SQLAlchemy 2.0 + asyncpg** | Django ORM, raw asyncpg | Compatibilidad con FastAPI async; flexibilidad |
| TimescaleDB | **Particionado nativo PostgreSQL** | TimescaleDB | Neon soporta extensiones limitadas; particionado nativo suficiente |

## Autenticación

| Decisión | Opción elegida | Alternativas descartadas | Razón |
|----------|----------------|--------------------------|-------|
| Auth API | **OAuth2 + JWT** | API keys simples, Auth0 managed | Control total; estándar OAuth2; python-jose o authlib |
| Identidad Web3 | **DIDs (W3C) + Verifiable Credentials** | Cuentas on-chain solamente | Cumplimiento; consentimiento explícito |

## Cloud / Hosting

| Decisión | Opción elegida | Alternativas descartadas | Razón |
|----------|----------------|--------------------------|-------|
| Base de datos | **Neon DB** | AWS RDS, Supabase | Usuario especificó Neon; sin AWS |
| Hosting API | **Railway / Render / Fly.io** | AWS Lambda, GCP, Azure | Sin AWS; sencillez de despliegue |
| Almacenamiento objetos | **Cloudflare R2 o MinIO** | S3 | Alternativas a AWS S3 para artefactos/modelos |

## Machine Learning

| Decisión | Opción elegida | Alternativas descartadas | Razón |
|----------|----------------|--------------------------|-------|
| AutoML | **AutoGluon** | H2O.ai, MLflow | Menor complejidad; buen rendimiento out-of-the-box |
| Explicabilidad | **SHAP** | LIME | Mayor adopción; interpretabilidad global y local |
| LLM/RAG | **OpenAI/Anthropic + LangChain** | Modelos locales (Llama) | Balance coste/calidad; RAG más maduro |

## Web3

| Decisión | Opción elegida | Alternativas descartadas | Razón |
|----------|----------------|--------------------------|-------|
| Blockchain | **Polygon** | Ethereum mainnet, Solana | Coste de gas menor; compatibilidad EVM |
| Almacenamiento descentralizado | **IPFS** | Filecoin directamente | IPFS para acceso; Filecoin opcional para persistencia |

## Monetización

| Decisión | Opción elegida | Alternativas descartadas | Razón |
|----------|----------------|--------------------------|-------|
| Pagos | **Stripe** | PayPal, Crypto | Integración más sencilla; soporte suscripciones |
