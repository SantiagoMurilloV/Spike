-- Migration 007: store images as base64 data URLs in TEXT columns.
--
-- Context: Railway's default filesystem is ephemeral, so the
-- /uploads/logos disk path we used to write multer files to was wiped on
-- every redeploy. Uploaded team logos / tournament covers disappeared
-- shortly after they were saved. Moving the raw image into the DB as a
-- `data:image/...;base64,...` string makes every upload survive deploys
-- and — as a side effect — removes the single biggest cross-origin /
-- rewrite gotcha from the setup.
--
-- VARCHAR(500) was enough for a file path but not for a base64 payload:
-- a 500 KB JPEG becomes ~700 KB encoded. Widen the columns to TEXT
-- (effectively unlimited — Postgres auto-TOASTs them).

ALTER TABLE teams
  ALTER COLUMN logo TYPE TEXT;

ALTER TABLE tournaments
  ALTER COLUMN logo TYPE TEXT;

ALTER TABLE tournaments
  ALTER COLUMN cover_image TYPE TEXT;
