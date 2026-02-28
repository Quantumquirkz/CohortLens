-- Migration: Add feature_flags table for persistent feature flag storage
-- This replaces the in-memory flag storage in FeatureFlagService

CREATE TABLE IF NOT EXISTS "feature_flags" (
    "id"         SERIAL PRIMARY KEY,
    "name"       VARCHAR(100) NOT NULL UNIQUE,
    "enabled"    BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Seed default flag values (all disabled by default; enable via admin API or env vars)
INSERT INTO "feature_flags" ("name", "enabled") VALUES
    ('v2_primary',         false),
    ('v2_enabled',         false),
    ('v1_deprecated',      false),
    ('migration_logging',  false),
    ('shadow_mode',        false)
ON CONFLICT ("name") DO NOTHING;
