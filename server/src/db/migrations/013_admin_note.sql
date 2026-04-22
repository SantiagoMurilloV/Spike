-- Super-admin's private note on any user. Free text, never shown to
-- anyone other than super_admin. Useful as a memory aid ("cliente del
-- Cup Sub-14", "contraseña basada en su año de nacimiento") so
-- platform owners can stop trying to memorize which password they
-- assigned to which account — without us having to store passwords
-- in any reversible form.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_note TEXT;
