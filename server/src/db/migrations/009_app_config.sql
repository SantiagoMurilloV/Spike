-- Key/value store for config the server needs to persist across restarts
-- but that doesn't warrant its own table (VAPID keys, feature flags, etc.).
-- Using a single flat table lets us add new config entries without a new
-- migration each time.
CREATE TABLE IF NOT EXISTS app_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
