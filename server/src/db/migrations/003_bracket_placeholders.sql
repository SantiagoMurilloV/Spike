-- Agregar columnas para guardar los placeholders de posiciones en los partidos de eliminación directa
ALTER TABLE bracket_matches
ADD COLUMN team1_placeholder VARCHAR(50),
ADD COLUMN team2_placeholder VARCHAR(50);
