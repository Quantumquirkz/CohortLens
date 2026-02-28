-- Baseline migration compatible with deployment/init_neon.sql
CREATE TABLE IF NOT EXISTS api_usage (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  month_key VARCHAR(7) NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 0,
  last_called_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, month_key)
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE,
  tenant_id VARCHAR(100),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) UNIQUE NOT NULL,
  gender VARCHAR(20),
  age INTEGER,
  annual_income NUMERIC(12,2) NOT NULL,
  spending_score INTEGER,
  profession VARCHAR(100),
  work_experience INTEGER,
  family_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  predicted_spending NUMERIC(10,2) NOT NULL,
  model_version VARCHAR(50),
  features_snapshot TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS segments (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  cluster INTEGER NOT NULL,
  model_version VARCHAR(50),
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
