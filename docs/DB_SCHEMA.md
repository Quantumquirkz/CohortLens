# CohortLens - Esquema de base de datos (Neon DB)

Esquema PostgreSQL para Neon DB. Compatible con particionado por tiempo nativo (sin TimescaleDB).

## Tablas principales

### customers

Almacena los datos de clientes del CRM.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | SERIAL | PRIMARY KEY |
| customer_id | VARCHAR(50) | UNIQUE NOT NULL |
| gender | VARCHAR(20) | |
| age | INTEGER | CHECK (age >= 18 AND age <= 100) |
| annual_income | NUMERIC(12,2) | NOT NULL |
| spending_score | INTEGER | CHECK (spending_score >= 0 AND spending_score <= 100) |
| profession | VARCHAR(100) | |
| work_experience | INTEGER | CHECK (work_experience >= 0) |
| family_size | INTEGER | CHECK (family_size > 0) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |
| deleted_at | TIMESTAMPTZ | NULL (soft delete para GDPR) |

Índices: `idx_customers_customer_id`, `idx_customers_created_at`

### segments

Asignación de clientes a clusters de segmentación.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | SERIAL | PRIMARY KEY |
| customer_id | VARCHAR(50) | REFERENCES customers(customer_id) |
| cluster | INTEGER | NOT NULL |
| model_version | VARCHAR(50) | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

Índices: `idx_segments_customer_id`, `idx_segments_cluster`, `idx_segments_created_at`

### predictions

Predicciones de gasto por cliente.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | SERIAL | PRIMARY KEY |
| customer_id | VARCHAR(50) | NOT NULL |
| predicted_spending | NUMERIC(10,2) | NOT NULL |
| model_version | VARCHAR(50) | |
| features_snapshot | JSONB | (opcional) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

Índices: `idx_predictions_customer_id`, `idx_predictions_created_at`

### audit_log

Trazabilidad para GDPR y cumplimiento.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | SERIAL | PRIMARY KEY |
| table_name | VARCHAR(100) | NOT NULL |
| record_id | VARCHAR(100) | |
| action | VARCHAR(20) | (INSERT, UPDATE, DELETE) |
| old_values | JSONB | |
| new_values | JSONB | |
| user_id | VARCHAR(100) | |
| ip_address | INET | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

Índices: `idx_audit_log_table_record`, `idx_audit_log_created_at`

### user_consents (Fase 2 - Web3/SSI)

Registro de consentimientos explícitos.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | SERIAL | PRIMARY KEY |
| customer_id | VARCHAR(50) | NOT NULL |
| consent_type | VARCHAR(100) | (data_share, marketing, analytics) |
| granted | BOOLEAN | NOT NULL |
| verifiable_credential_id | VARCHAR(255) | (DID/VC ref) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

Índices: `idx_user_consents_customer_id`, `idx_user_consents_consent_type`

### verifiable_credentials (Fase 2)

Almacén de credenciales verificables (SSI).

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | SERIAL | PRIMARY KEY |
| did | VARCHAR(255) | NOT NULL |
| credential_type | VARCHAR(100) | |
| payload | JSONB | |
| revoked | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### subscriptions (Fase 6 - SaaS)

Planes de suscripción por tenant/usuario.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | SERIAL | PRIMARY KEY |
| tenant_id | VARCHAR(100) | NOT NULL |
| plan | VARCHAR(50) | (basic, professional, enterprise) |
| stripe_subscription_id | VARCHAR(255) | |
| limits | JSONB | (max_customers, max_api_calls) |
| starts_at | TIMESTAMPTZ | |
| ends_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

Índices: `idx_subscriptions_tenant_id`, `idx_subscriptions_plan`

### ipfs_artifacts (Fase 2 - IPFS)

Referencias a objetos almacenados en IPFS.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | SERIAL | PRIMARY KEY |
| cid | VARCHAR(100) | UNIQUE NOT NULL |
| artifact_type | VARCHAR(50) | (report, dataset) |
| metadata | JSONB | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

## Particionado por tiempo (opcional)

Para `audit_log` y `predictions` con alto volumen, usar particionado nativo:

```sql
-- Ejemplo: audit_log particionado por mes
CREATE TABLE audit_log (
  ...
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_log_2026_01 PARTITION OF audit_log
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

## TimescaleDB

Neon DB tiene soporte limitado de extensiones. Si TimescaleDB no está disponible, usar particionado nativo de PostgreSQL o agregaciones con window functions.
