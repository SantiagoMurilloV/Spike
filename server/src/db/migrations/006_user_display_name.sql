-- Add optional display_name to users so judges can have a friendly label
-- in the admin's judge list without rewriting their username.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS display_name VARCHAR(120);
