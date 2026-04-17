
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(500);


ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR' NOT NULL;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS converted_amount NUMERIC(12, 2);


UPDATE transactions 
SET converted_amount = amount 
WHERE converted_amount IS NULL;


ALTER TABLE transactions 
ALTER COLUMN converted_amount SET NOT NULL;
