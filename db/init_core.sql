-- Base CORE pour auth & favoris (teambuilder/combat viendront plus tard)

CREATE TABLE IF NOT EXISTS users (
     id SERIAL PRIMARY KEY,
     email TEXT NOT NULL UNIQUE,
     handle TEXT UNIQUE,
     password_hash TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pokedex_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, pokedex_number)
);

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_fav_dex ON favorites(pokedex_number);
