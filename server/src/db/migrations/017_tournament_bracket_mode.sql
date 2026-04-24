-- Tournament-level "tipo de cruces de eliminatoria" flag.
--
-- Drives the post-groups bracket flow on the admin side:
--   · 'manual'     → admin defines crossings manually via the drag-pairs
--                    modal (single bracket, no Oro/Plata tier).
--   · 'divisions'  → crossings auto-generated VNL-style from the current
--                    standings table. Produces Oro (1°/2° of each group)
--                    + Plata (3°/4°) brackets in a single click.
--
-- Default 'manual' keeps existing tournaments behaving exactly as before
-- this migration landed. New tournaments let the admin pick in the
-- create-form dropdown.

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS bracket_mode VARCHAR(20) DEFAULT 'manual';
