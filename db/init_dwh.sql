-- ======================
-- Table des Pokémon
-- ======================
CREATE TABLE IF NOT EXISTS dim_pokemon (
    pokedex_number INT PRIMARY KEY,
    name VARCHAR(100),
    type1 VARCHAR(50),
    type2 VARCHAR(50),
    hp INT,
    attack INT,
    defense INT,
    sp_attack INT,
    sp_defense INT,
    speed INT,
    total_stats INT,
    is_legendary BOOLEAN,
    generation VARCHAR(20),
    primary_type VARCHAR(50),
    sprite_front TEXT,
    sprite_back TEXT
);

-- ======================
-- Table des attaques (moves)
-- ======================
CREATE TABLE IF NOT EXISTS dim_move (
    move_id INT PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    type VARCHAR(50),
    power INT,
    accuracy INT,
    pp INT,
    priority INT,
    damage_class VARCHAR(50),
    effect TEXT
);

-- ======================
-- Bridge Pokémon <-> Moves
-- ======================
CREATE TABLE IF NOT EXISTS bridge_pokemon_move (
    id SERIAL PRIMARY KEY,
    pokedex_number INT REFERENCES dim_pokemon(pokedex_number),
    move_name VARCHAR(100) REFERENCES dim_move(name)
);

-- ======================
-- Objets (items)
-- ======================
CREATE TABLE IF NOT EXISTS dim_item (
    item_id INT PRIMARY KEY,
    name VARCHAR(100),
    category VARCHAR(100),
    cost INT,
    effect TEXT,
    sprite_url TEXT,
    is_competitive_core BOOLEAN
);

-- ======================
-- Natures
-- ======================
CREATE TABLE IF NOT EXISTS dim_nature (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE,
    up VARCHAR(50),
    down VARCHAR(50)
);

-- ======================
-- Espèces Pokémon (species)
-- ======================
CREATE TABLE IF NOT EXISTS pokemon_species (
    pokedex_number INT PRIMARY KEY,
    is_legendary BOOLEAN,
    is_mythical BOOLEAN,
    is_baby BOOLEAN,
    base_happiness INT,
    capture_rate INT,
    color VARCHAR(50),
    shape VARCHAR(50),
    growth_rate VARCHAR(50),
    habitat VARCHAR(50),
    generation VARCHAR(50),
    egg_groups TEXT,
    flavor_en TEXT,
    flavor_fr TEXT
);

-- ======================
-- Évolutions (graphe aplati)
-- ======================
CREATE TABLE IF NOT EXISTS evolution_edges (
    id SERIAL PRIMARY KEY,
    from_name VARCHAR(100),
    to_name VARCHAR(100),
    min_level INT,
    trigger VARCHAR(50),
    item VARCHAR(50),
    time_of_day VARCHAR(20),
    min_happiness INT,
    min_beauty INT,
    min_affection INT,
    held_item VARCHAR(50),
    known_move_type VARCHAR(50),
    location VARCHAR(50),
    gender INT
);

-- ======================
-- Learnsets (niveau/méthode)
-- ======================
CREATE TABLE IF NOT EXISTS pokemon_move_learnset (
    id SERIAL PRIMARY KEY,
    pokedex_number INT REFERENCES dim_pokemon(pokedex_number),
    move_name VARCHAR(100),
    level_learned_at INT,
    learn_method VARCHAR(50),
    version_group VARCHAR(50),
    generation INT
);

-- ======================
-- Type chart (attaque -> défense)
-- ======================
CREATE TABLE IF NOT EXISTS type_chart (
    attacking VARCHAR(50),
    defending VARCHAR(50),
    multiplier FLOAT,
    PRIMARY KEY (attacking, defending)
);

-- ======================
-- Résistances/faiblesses d’un Pokémon
-- ======================
CREATE TABLE IF NOT EXISTS pokemon_type_matchups (
    pokedex_number INT PRIMARY KEY,
    type1 VARCHAR(50),
    type2 VARCHAR(50),
    vs_normal FLOAT,
    vs_fire FLOAT,
    vs_water FLOAT,
    vs_electric FLOAT,
    vs_grass FLOAT,
    vs_ice FLOAT,
    vs_fighting FLOAT,
    vs_poison FLOAT,
    vs_ground FLOAT,
    vs_flying FLOAT,
    vs_psychic FLOAT,
    vs_bug FLOAT,
    vs_rock FLOAT,
    vs_ghost FLOAT,
    vs_dragon FLOAT,
    vs_dark FLOAT,
    vs_steel FLOAT,
    vs_fairy FLOAT
);
