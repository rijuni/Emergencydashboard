-- Migration: Convert 'casualty_incharge' role to 'admin'
-- Run this script once against the `casualty_dashboard` database.
-- Recommended: run from mysql CLI or a safe admin client.
-- Examples:
-- 1) Using mysql CLI:
--    mysql -u <user> -p casualty_dashboard < migrate_roles.sql
-- 2) From within MySQL client (execute the file):
--    SOURCE /path/to/migrate_roles.sql;

-- Option A: Preferred (temporarily disables safe-updates for the session)
SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;
UPDATE users SET role = 'admin' WHERE role = 'casualty_incharge';
SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;

-- Option B: Alternative (works without changing session settings)
-- Uncomment and use if Option A is not allowed in your environment.
-- UPDATE users
-- SET role = 'admin'
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id FROM users WHERE role = 'casualty_incharge'
--   ) AS tmp
-- );

-- Verify
-- SELECT id, username, full_name, role FROM users WHERE role = 'admin' ORDER BY id;