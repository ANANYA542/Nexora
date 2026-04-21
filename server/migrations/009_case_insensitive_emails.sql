
CREATE EXTENSION IF NOT EXISTS citext;
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id, email 
        FROM (
            SELECT id, email, 
                   ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY created_at ASC) as row_num
            FROM users
        ) t
        WHERE row_num > 1
    LOOP
        
        UPDATE users 
        SET email = LOWER(TRIM(email)) || '_duplicate_' || substr(id::text, 1, 4)
        WHERE id = r.id;
        
        RAISE NOTICE 'Renamed duplicate user account ID % (email: %) to avoid collision.', r.id, r.email;
    END LOOP;
END $$;


UPDATE users SET email = LOWER(TRIM(email));

ALTER TABLE users ALTER COLUMN email TYPE CITEXT;


CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
