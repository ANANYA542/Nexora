
ALTER TABLE categories
  ADD CONSTRAINT categories_id_type_key UNIQUE (id, type);


ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS fk_transactions_category_type;

ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_category_type
  FOREIGN KEY (category_id, type)
  REFERENCES categories (id, type)
  ON UPDATE CASCADE
  ON DELETE CASCADE;


DROP INDEX IF EXISTS idx_transactions_user_id_date;

CREATE INDEX IF NOT EXISTS idx_transactions_dashboard
  ON transactions (user_id, date, type) INCLUDE (amount, category_id);


CREATE INDEX IF NOT EXISTS idx_transactions_list_pagination
  ON transactions (user_id, date DESC, created_at DESC);


CREATE INDEX IF NOT EXISTS idx_categories_user_id
  ON categories (user_id);
