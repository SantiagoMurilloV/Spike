-- Tournaments can now carry an explicit list of categories (divisions),
-- using the same canonical category labels as the app. The admin picks one or
-- more on the tournament form and the enrolment UI filters the team
-- dropdown down to teams whose `category` matches one of the listed
-- values. NULL / empty array means "no filter — any team can be
-- enrolled", preserving the legacy behaviour for existing tournaments.
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
