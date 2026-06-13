-- Migration: add optional display_name to staff master
ALTER TABLE staff
  ADD COLUMN display_name VARCHAR(255) NULL;

-- After running, restart server so queries can return the new column.
