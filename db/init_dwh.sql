CREATE TABLE IF NOT EXISTS dim_pokemon (
    pokedex_number INT PRIMARY KEY,
    name VARCHAR(100),
    name_en  VARCHAR(100),
    name_fr VARCHAR(100),
    name_es VARCHAR(100),
    type1 VARCHAR(20) NOT NULL,
    type2 VARCHAR(20) DEFAULT '',
    primary_type VARCHAR(20),
    hp INT NOT NULL,
    attack INT NOT NULL,
    defense INT NOT NULL,
    sp_attack INT NOT NULL,
    sp_defense INT NOT NULL,
    speed INT NOT NULL,
    total_stats INT NOT NULL,
    is_legendary BOOLEAN NOT NULL DEFAULT FALSE,
    generation VARCHAR(10) NOT NULL,
    sprite_front TEXT,
    sprite_back TEXT,
    sprite_front_shiny TEXT,
    sprite_back_shiny TEXT,
    sprite_official_front TEXT,
    sprite_official_front_shiny TEXT,
    sprite_home_front TEXT,
    sprite_home_front_shiny TEXT
);

CREATE INDEX IF NOT EXISTS idx_dim_pokemon_name_en ON dim_pokemon(name_en);
CREATE INDEX IF NOT EXISTS idx_dim_pokemon_name_fr ON dim_pokemon(name_fr);
CREATE INDEX IF NOT EXISTS idx_dim_pokemon_name_es ON dim_pokemon(name_es);
CREATE INDEX IF NOT EXISTS idx_dim_pokemon_types  ON dim_pokemon(type1, type2);
CREATE INDEX IF NOT EXISTS idx_dim_pokemon_gen    ON dim_pokemon(generation);
CREATE INDEX IF NOT EXISTS idx_dim_pokemon_stats  ON dim_pokemon(hp, attack, defense, sp_attack, sp_defense, speed);


CREATE TABLE IF NOT EXISTS dim_move (
    move_id       INT PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    type          VARCHAR(20) NOT NULL,
    power         INT,
    accuracy      INT,
    pp            INT,
    priority      INT,
    damage_class  VARCHAR(30),
    name_en       VARCHAR(150),
    name_fr       VARCHAR(150),
    name_es       VARCHAR(150),
    effect_en     TEXT,
    effect_fr     TEXT,
    effect_es     TEXT
);

CREATE INDEX IF NOT EXISTS idx_dim_move_name ON dim_move(name);
CREATE INDEX IF NOT EXISTS idx_dim_move_type ON dim_move(type);


CREATE TABLE IF NOT EXISTS bridge_pokemon_move (
    pokedex_number INT NOT NULL,
    move_name      VARCHAR(150) NOT NULL,
    PRIMARY KEY (pokedex_number, move_name)
);

CREATE INDEX IF NOT EXISTS idx_bridge_move_poke ON bridge_pokemon_move(pokedex_number);
CREATE INDEX IF NOT EXISTS idx_bridge_move_name ON bridge_pokemon_move(move_name);

CREATE TABLE IF NOT EXISTS dim_item (
    item_id             INT PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    category            VARCHAR(80),
    cost                INT,
    effect              TEXT,
    sprite_url          TEXT,
    is_competitive_core BOOLEAN DEFAULT FALSE,
    name_en             VARCHAR(150),
    name_fr             VARCHAR(150),
    name_es             VARCHAR(150),
    effect_en           TEXT,
    effect_fr           TEXT,
    effect_es           TEXT
);

CREATE INDEX IF NOT EXISTS idx_dim_item_name     ON dim_item(name);
CREATE INDEX IF NOT EXISTS idx_dim_item_category ON dim_item(category);


CREATE TABLE IF NOT EXISTS dim_nature (
    name  VARCHAR(50) PRIMARY KEY,
    up    VARCHAR(30),
    down  VARCHAR(30)
);


CREATE TABLE IF NOT EXISTS pokemon_species (
    pokedex_number INT PRIMARY KEY,
    is_legendary   BOOLEAN DEFAULT FALSE,
    is_mythical    BOOLEAN DEFAULT FALSE,
    is_baby        BOOLEAN DEFAULT FALSE,
    base_happiness INT,
    capture_rate   INT,
    color          VARCHAR(30),
    shape          VARCHAR(30),
    growth_rate    VARCHAR(50),
    habitat        VARCHAR(50),
    generation     VARCHAR(50),
    egg_groups     TEXT,
    flavor_en      TEXT,
    flavor_fr      TEXT,
    flavor_es      TEXT,
    genus_en       TEXT,
    genus_fr       TEXT,
    genus_es       TEXT
);

CREATE TABLE IF NOT EXISTS evolution_edges (
    from_name        VARCHAR(100) NOT NULL,
    to_name          VARCHAR(100) NOT NULL,
    min_level        INT,
    trigger          VARCHAR(60),
    item             VARCHAR(100),
    time_of_day      VARCHAR(20),
    min_happiness    INT,
    min_beauty       INT,
    min_affection    INT,
    held_item        VARCHAR(100),
    known_move_type  VARCHAR(30),
    location         VARCHAR(100),
    gender           INT,
    PRIMARY KEY (from_name, to_name)
);

CREATE INDEX IF NOT EXISTS idx_evo_from ON evolution_edges(from_name);
CREATE INDEX IF NOT EXISTS idx_evo_to   ON evolution_edges(to_name);

CREATE TABLE IF NOT EXISTS pokemon_move_learnset (
    pokedex_number   INT NOT NULL,
    move_name        VARCHAR(150) NOT NULL,  -- slug du move
    level_learned_at INT,
    learn_method     VARCHAR(80),
    version_group    VARCHAR(80),
    generation       VARCHAR(20),
    PRIMARY KEY (pokedex_number, move_name, learn_method, version_group)
);

CREATE INDEX IF NOT EXISTS idx_learnset_poke ON pokemon_move_learnset(pokedex_number);
CREATE INDEX IF NOT EXISTS idx_learnset_mv   ON pokemon_move_learnset(move_name);

CREATE TABLE IF NOT EXISTS type_chart (
    attacking  VARCHAR(20) NOT NULL,
    defending  VARCHAR(20) NOT NULL,
    multiplier NUMERIC(4,2) NOT NULL,
    PRIMARY KEY (attacking, defending)
);


CREATE TABLE IF NOT EXISTS dim_type (
    type_id  INT PRIMARY KEY,
    name     VARCHAR(50),
    name_en  VARCHAR(50),
    name_fr  VARCHAR(50),
    name_es  VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS pokemon_type_matchups (
    pokedex_number INT PRIMARY KEY,
    type1          VARCHAR(20) NOT NULL,
    type2          VARCHAR(20) DEFAULT '',
    vs_normal   NUMERIC(4,2) NOT NULL,
    vs_fire     NUMERIC(4,2) NOT NULL,
    vs_water    NUMERIC(4,2) NOT NULL,
    vs_electric NUMERIC(4,2) NOT NULL,
    vs_grass    NUMERIC(4,2) NOT NULL,
    vs_ice      NUMERIC(4,2) NOT NULL,
    vs_fighting NUMERIC(4,2) NOT NULL,
    vs_poison   NUMERIC(4,2) NOT NULL,
    vs_ground   NUMERIC(4,2) NOT NULL,
    vs_flying   NUMERIC(4,2) NOT NULL,
    vs_psychic  NUMERIC(4,2) NOT NULL,
    vs_bug      NUMERIC(4,2) NOT NULL,
    vs_rock     NUMERIC(4,2) NOT NULL,
    vs_ghost    NUMERIC(4,2) NOT NULL,
    vs_dragon   NUMERIC(4,2) NOT NULL,
    vs_dark     NUMERIC(4,2) NOT NULL,
    vs_steel    NUMERIC(4,2) NOT NULL,
    vs_fairy    NUMERIC(4,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matchups_types ON pokemon_type_matchups(type1, type2);
