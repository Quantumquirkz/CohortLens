-- CohortLens - Initial schema for Neon DB
-- Run manually if not using Python create_schema()

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) UNIQUE NOT NULL,
    gender VARCHAR(20),
    age INTEGER CHECK (age >= 18 AND age <= 100),
    annual_income NUMERIC(12,2) NOT NULL,
    spending_score INTEGER CHECK (spending_score >= 0 AND spending_score <= 100),
    profession VARCHAR(100),
    work_experience INTEGER CHECK (work_experience >= 0),
    family_size INTEGER CHECK (family_size > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

CREATE TABLE IF NOT EXISTS segments (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    cluster INTEGER NOT NULL,
    model_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_segments_customer_id ON segments(customer_id);
CREATE INDEX IF NOT EXISTS idx_segments_cluster ON segments(cluster);
CREATE INDEX IF NOT EXISTS idx_segments_created_at ON segments(created_at);

CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    predicted_spending NUMERIC(10,2) NOT NULL,
    model_version VARCHAR(50),
    features_snapshot TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_customer_id ON predictions(customer_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    action VARCHAR(20),
    old_values TEXT,
    new_values TEXT,
    user_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS user_consents (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL,
    verifiable_credential_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_customer_id ON user_consents(customer_id);

CREATE TABLE IF NOT EXISTS verifiable_credentials (
    id SERIAL PRIMARY KEY,
    did VARCHAR(255) NOT NULL,
    credential_type VARCHAR(100),
    payload TEXT,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ipfs_artifacts (
    id SERIAL PRIMARY KEY,
    cid VARCHAR(100) UNIQUE NOT NULL,
    artifact_type VARCHAR(50),
    metadata TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    plan VARCHAR(50) NOT NULL,
    stripe_subscription_id VARCHAR(255),
    limits TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);
