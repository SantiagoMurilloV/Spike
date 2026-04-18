-- Agrega ubicación opcional por cancha
-- Almacena un objeto JSON { "Nombre de la cancha": "Dirección/ubicación" }
-- para no romper el campo courts existente (TEXT[])

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS court_locations JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN tournaments.court_locations IS
  'Mapa de { nombreCancha: ubicación } para cada cancha listada en courts[]';
