CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  institution VARCHAR(200),
  balance NUMERIC(14, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name VARCHAR(200) NOT NULL,
  aliases TEXT[],
  category_id UUID REFERENCES categories(id),
  merchant_type VARCHAR(50),
  logo_url VARCHAR(500),
  metadata JSONB,
  UNIQUE(canonical_name)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES merchants(id),
  name VARCHAR(200) NOT NULL,
  amount NUMERIC(12, 2),
  frequency VARCHAR(20),
  next_billing_date DATE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  confidence NUMERIC(3, 2)
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  target_amount NUMERIC(14, 2) NOT NULL,
  current_amount NUMERIC(14, 2) DEFAULT 0,
  deadline DATE,
  priority VARCHAR(20) DEFAULT 'medium',
  category VARCHAR(50),
  auto_save_amount NUMERIC(12, 2),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  platform VARCHAR(100),
  invested_amount NUMERIC(14, 2),
  current_value NUMERIC(14, 2),
  units NUMERIC(14, 6),
  last_updated TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  components JSONB NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingestion_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  raw_content TEXT,
  parsed_data JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  transaction_id UUID REFERENCES transactions(id),
  confidence NUMERIC(3, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
