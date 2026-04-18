

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN DEFAULT FALSE;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS anomaly_reason TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_anomaly
  ON transactions(user_id, is_anomaly, date DESC)
  WHERE is_anomaly = TRUE;
