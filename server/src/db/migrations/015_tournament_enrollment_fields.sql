-- Fase 1 de "captain credentials por equipo".
--
-- Agrega dos campos configurables al torneo:
--   · enrollment_deadline — fecha límite para que los capitanes de equipo
--     puedan seguir editando su plantel. Después de esta fecha, las
--     credenciales quedan deshabilitadas (enforcement viene en fase 3).
--     NULL significa "sin límite".
--   · players_per_team — cantidad recomendada de jugador@s por equipo
--     (default 12, mínimo 1). El panel del capitán mostrará un contador
--     "8 / 12 jugadores" usando este cupo.
--
-- Ambos son NULLABLE para no romper torneos pre-existentes — ya están
-- backfill-ed con DEFAULT 12 para players_per_team.

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS enrollment_deadline DATE;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS players_per_team INT DEFAULT 12;
