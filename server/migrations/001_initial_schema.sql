
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE IF NOT EXISTS categories (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name    VARCHAR(100) NOT NULL,
  type    VARCHAR(10)  NOT NULL CHECK (type IN ('income', 'expense')),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);


CREATE UNIQUE INDEX IF NOT EXISTS categories_name_type_user_unique
  ON categories (name, type, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID));


CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  type        VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount <> 0),  -- zero amount disallowed
  description TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_transactions_user_id          ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id      ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date             ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type             ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id_date     ON transactions(user_id, date);


CREATE TABLE IF NOT EXISTS budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES categories(id),
  limit_amount NUMERIC(12, 2) NOT NULL CHECK (limit_amount > 0),
  month        SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         SMALLINT NOT NULL CHECK (year >= 2000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id, month, year)
);


INSERT INTO categories (id, name, type, user_id) VALUES
  (gen_random_uuid(), 'Salary',         'income',  NULL),
  (gen_random_uuid(), 'Freelance',      'income',  NULL),
  (gen_random_uuid(), 'Investment',     'income',  NULL),
  (gen_random_uuid(), 'Other Income',   'income',  NULL),
  (gen_random_uuid(), 'Food',           'expense', NULL),
  (gen_random_uuid(), 'Transport',      'expense', NULL),
  (gen_random_uuid(), 'Utilities',      'expense', NULL),
  (gen_random_uuid(), 'Rent',           'expense', NULL),
  (gen_random_uuid(), 'Entertainment',  'expense', NULL),
  (gen_random_uuid(), 'Healthcare',     'expense', NULL),
  (gen_random_uuid(), 'Shopping',       'expense', NULL),
  (gen_random_uuid(), 'Other Expense',  'expense', NULL)
ON CONFLICT DO NOTHING;
