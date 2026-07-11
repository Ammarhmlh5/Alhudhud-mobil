-- AlHudhud Connect - Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor to set up all tables.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  auth_provider TEXT DEFAULT 'email',
  google_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONNECTORS
-- ============================================================
CREATE TABLE IF NOT EXISTS connectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform_type TEXT NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'REST',
  endpoint_url TEXT NOT NULL,
  http_method TEXT DEFAULT 'POST',
  headers JSONB DEFAULT '{}',
  auth_type TEXT DEFAULT 'NONE',
  auth_config JSONB DEFAULT '{}',
  data_mapping JSONB,
  is_active BOOLEAN DEFAULT true,
  last_status TEXT DEFAULT 'UNKNOWN',
  sync_interval INTEGER,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WEBHOOK EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id UUID REFERENCES connectors(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  headers JSONB,
  body TEXT,
  source_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connector_id UUID REFERENCES connectors(id) ON DELETE SET NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ============================================================
-- SYNC QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  row_id TEXT,
  operation TEXT NOT NULL,
  data JSONB,
  status TEXT DEFAULT 'PENDING',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MIGRATIONS TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS _migrations (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_connectors_user_id ON connectors(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_connector_id ON webhook_events(connector_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_message_logs_user_id ON message_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_connector_id ON message_logs(connector_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_status ON message_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- ============================================================
-- RPC FUNCTION: exec_sql (used by gateway adapter for JOINs)
-- ============================================================
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS SETOF json AS $$
BEGIN
  RETURN QUERY EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEED: Admin user (password: AlHudhud@Admin#2024)
-- ============================================================
INSERT INTO users (id, email, name, password, role, is_active, auth_provider)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@alhudhud.com',
  'Admin',
  '$2a$12$LJ3m4ys3Lz0YBNOURq0y5OjCfMJM1aHqN1XVh5Z6gR5bS7dD1eG3e',
  'admin',
  true,
  'email'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO subscriptions (user_id, plan, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'business', 'active')
ON CONFLICT (user_id) DO NOTHING;
