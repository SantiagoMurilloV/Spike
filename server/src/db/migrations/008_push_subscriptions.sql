-- Push-notification subscriptions (Web Push / VAPID).
--
-- One row per subscription (a browser / device / installed PWA). We key on
-- the endpoint URL because that's what the browser sends back for
-- unsubscribe, and because the pair (auth, p256dh) is what web-push needs
-- to encrypt the payload.
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Optional link to a user. NULL means "anonymous spectator"; we keep
    -- those too so public fans can receive live-match notifications without
    -- having to sign up.
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    -- Useful for filtering (spectator vs judge topics) and for cleanup.
    role VARCHAR(20),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_role_idx ON push_subscriptions(role);
