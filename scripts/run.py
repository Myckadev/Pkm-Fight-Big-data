#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Initialisation du Data Warehouse Pokémon (POKE-DWH)

Étapes :
1) dim_pokemon (CSV Kaggle + enrichissements + sprites)
2) dim_move + bridge_pokemon_move
3) dim_item (+ sprites)
4) dim_nature
5) pokemon_species
6) evolution_edges (parcours dynamique)
7) pokemon_move_learnset
8) type_chart
9) pokemon_type_matchups
"""

import os
import argparse
from pathlib import Path

import pandas as pd
import requests
from sqlalchemy import create_engine, text
from tqdm import tqdm

# ======================================================
# Config DB
# ======================================================
DB_URL = (
    f"postgresql://{os.getenv('DB_USER','dwh_user')}:"
    f"{os.getenv('DB_PASSWORD','dwh_pass')}@"
    f"{os.getenv('DB_HOST','postgres-dwh')}:"
    f"{os.getenv('DB_PORT','5432')}/"
    f"{os.getenv('DB_NAME','poke_dwh')}"
)
engine = create_engine(DB_URL)

POKEAPI = "https://pokeapi.co/api/v2"
ALL_TYPES = [
    "normal","fire","water","electric","grass","ice","fighting","poison","ground",
    "flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"
]

SPRITE_DIR = Path("datalake/sprites")
(SPRITE_DIR / "pokemon").mkdir(parents=True, exist_ok=True)
(SPRITE_DIR / "items").mkdir(parents=True, exist_ok=True)

# ======================================================
# Helpers
# ======================================================
def http_get(url):
    r = requests.get(url, timeout=45)
    if r.status_code == 200:
        return r.json()
    raise RuntimeError(f"Erreur HTTP {r.status_code}: {url}")

def save_df(df: pd.DataFrame, table: str, if_exists="append"):
    if not df.empty:
        df.to_sql(table, engine, if_exists=if_exists, index=False)
        print(f"✅ {len(df)} lignes insérées dans {table}")

def reset_table(table: str):
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {table} CASCADE;"))

def download_sprite(url, outpath: Path):
    try:
        if url and not outpath.exists():
            r = requests.get(url, timeout=45)
            if r.status_code == 200:
                outpath.parent.mkdir(parents=True, exist_ok=True)
                with open(outpath, "wb") as f:
                    f.write(r.content)
    except Exception as e:
        print(f"⚠️ Sprite manquant {url}: {e}")

def get_loaded_dex_list(limit=None):
    """Retourne la liste des pokedex_number présents dans dim_pokemon, triés.
       Si limit est fourni, tronque à limit."""
    with engine.begin() as conn:
        rows = conn.execute(text("SELECT pokedex_number FROM dim_pokemon ORDER BY pokedex_number ASC")).fetchall()
    dex = [r[0] for r in rows]
    return dex[:limit] if (limit and limit > 0) else dex

# ======================================================
# 1) dim_pokemon
# ======================================================
def build_dim_pokemon(csv_path, limit=None):
    df = pd.read_csv(csv_path)
    # normalisation colonnes Kaggle
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    # Harmonisation noms attendus
    # Cas fréquents Kaggle : "sp_atk" / "sp_def" → déjà "sp_attack"/"sp_defense" chez toi
    rename_map = {
        "sp_atk": "sp_attack",
        "sp_def": "sp_defense",
        "legendary": "is_legendary"
    }
    df = df.rename(columns={k:v for k,v in rename_map.items() if k in df.columns})

    # colonnes indispensables
    needed = ["pokedex_number","name","type1","type2","hp","attack","defense",
              "sp_attack","sp_defense","speed","is_legendary","generation"]
    missing = [c for c in needed if c not in df.columns]
    if missing:
        raise ValueError(f"Colonnes manquantes dans le CSV: {missing}")

    # enrichissements
    df["total_stats"] = df[["hp","attack","defense","sp_attack","sp_defense","speed"]].sum(axis=1)
    df["primary_type"] = df["type1"]
    df["is_legendary"] = df["is_legendary"].astype(bool)
    df["generation"] = df["generation"].astype(str)
    df["type2"] = df["type2"].fillna("")

    # Si limit fourni → on borne le set inséré dès la source CSV
    if limit and limit > 0:
        df = df.sort_values("pokedex_number").head(limit).copy()

    # Sprites front/back pour les Pokémon retenus
    sprites = []
    for dex in tqdm(df["pokedex_number"], desc="Sprites Pokémon"):
        data = http_get(f"{POKEAPI}/pokemon/{dex}")
        front = data.get("sprites", {}).get("front_default")
        back = data.get("sprites", {}).get("back_default")
        front_file = SPRITE_DIR / "pokemon" / f"{dex}_front.png"
        back_file = SPRITE_DIR / "pokemon" / f"{dex}_back.png"
        download_sprite(front, front_file)
        download_sprite(back, back_file)
        sprites.append({"pokedex_number": dex, "sprite_front": str(front_file), "sprite_back": str(back_file)})

    sprite_df = pd.DataFrame(sprites)
    df = df.merge(sprite_df, on="pokedex_number", how="left")

    reset_table("dim_pokemon")
    save_df(df[[
        "pokedex_number","name","type1","type2","hp","attack","defense",
        "sp_attack","sp_defense","speed","total_stats","is_legendary",
        "generation","primary_type","sprite_front","sprite_back"
    ]], "dim_pokemon")

# ======================================================
# 2) Moves + Bridge
# ======================================================
def build_moves(limit=None):
    reset_table("dim_move")
    reset_table("bridge_pokemon_move")
    move_seen = set()
    move_rows, bridge_rows = [], []

    dex_list = get_loaded_dex_list(limit)
    for dex in tqdm(dex_list, desc="Pokémon moves"):
        data = http_get(f"{POKEAPI}/pokemon/{dex}")
        for m in data.get("moves", []):
            mv = m["move"]
            # bridge → move_name (FK sur dim_move.name)
            bridge_rows.append({"pokedex_number": dex, "move_name": mv["name"]})
            # dim_move → une ligne par move unique
            if mv["name"] not in move_seen:
                mdet = http_get(mv["url"])
                move_rows.append({
                    "move_id": mdet["id"],
                    "name": mdet["name"],
                    "type": mdet["type"]["name"],
                    "power": mdet.get("power"),
                    "accuracy": mdet.get("accuracy"),
                    "pp": mdet.get("pp"),
                    "priority": mdet.get("priority"),
                    "damage_class": mdet["damage_class"]["name"],
                    "effect": next((e["effect"] for e in mdet.get("effect_entries", []) if e["language"]["name"]=="en"), None)
                })
                move_seen.add(mv["name"])

    save_df(pd.DataFrame(move_rows), "dim_move")
    save_df(pd.DataFrame(bridge_rows), "bridge_pokemon_move")

# ======================================================
# 3) Items (+ sprites) via listing dynamique
# ======================================================
def build_items():
    reset_table("dim_item")
    rows = []
    # Liste complète des items
    listing = http_get(f"{POKEAPI}/item?limit=100000")
    item_urls = [it["url"] for it in listing.get("results", [])]

    for url in tqdm(item_urls, desc="Items"):
        try:
            data = http_get(url)
            sprite = data.get("sprites", {}).get("default")
            sprite_file = SPRITE_DIR / "items" / f"{data['id']}.png"
            download_sprite(sprite, sprite_file)
            rows.append({
                "item_id": data["id"],
                "name": data["name"],
                "category": data.get("category",{}).get("name"),
                "cost": data.get("cost"),
                "effect": data.get("effect_entries",[{}])[0].get("effect"),
                "sprite_url": str(sprite_file),
                "is_competitive_core": (data.get("category",{}).get("name") in ["held-items","choice","berries"])
            })
        except Exception:
            continue

    save_df(pd.DataFrame(rows), "dim_item")

# ======================================================
# 4) Natures (liste courte ; complétez si besoin des 25)
# ======================================================
def build_natures():
    reset_table("dim_nature")
    natures = [
        {"name":"adamant","up":"attack","down":"sp_attack"},
        {"name":"modest","up":"sp_attack","down":"attack"},
        {"name":"jolly","up":"speed","down":"sp_attack"},
        {"name":"timid","up":"speed","down":"attack"},
        {"name":"bold","up":"defense","down":"attack"},
        # Ajoutez les autres si nécessaire (25 au total)
    ]
    save_df(pd.DataFrame(natures), "dim_nature")

# ======================================================
# 5) Species
# ======================================================
def build_species(limit=None):
    reset_table("pokemon_species")
    rows = []
    dex_list = get_loaded_dex_list(limit)

    for dex in tqdm(dex_list, desc="Species"):
        data = http_get(f"{POKEAPI}/pokemon-species/{dex}")
        rows.append({
            "pokedex_number": dex,
            "is_legendary": data.get("is_legendary", False),
            "is_mythical": data.get("is_mythical", False),
            "is_baby": data.get("is_baby", False),
            "base_happiness": data.get("base_happiness"),
            "capture_rate": data.get("capture_rate"),
            "color": data.get("color",{}).get("name") if data.get("color") else None,
            "shape": data.get("shape",{}).get("name") if data.get("shape") else None,
            "growth_rate": data.get("growth_rate",{}).get("name") if data.get("growth_rate") else None,
            "habitat": data.get("habitat",{}).get("name") if data.get("habitat") else None,
            "generation": data.get("generation",{}).get("name") if data.get("generation") else None,
            "egg_groups": ",".join([eg["name"] for eg in data.get("egg_groups", [])]),
            "flavor_en": next((f["flavor_text"] for f in data.get("flavor_text_entries", []) if f["language"]["name"]=="en"), None),
            "flavor_fr": next((f["flavor_text"] for f in data.get("flavor_text_entries", []) if f["language"]["name"]=="fr"), None),
        })
    save_df(pd.DataFrame(rows), "pokemon_species")

# ======================================================
# 6) Evolutions (parcours dynamique)
# ======================================================
def build_evolutions():
    reset_table("evolution_edges")
    rows = []

    def safe_name(obj):
        return obj.get("name") if isinstance(obj, dict) and obj else None

    # Récupère toutes les chains via listing (pas de magic number)
    try:
        listing = http_get(f"{POKEAPI}/evolution-chain?limit=100000")
        chain_urls = [it["url"] for it in listing.get("results", [])]
    except Exception:
        chain_urls = []

    for url in tqdm(chain_urls, desc="Evolutions"):
        try:
            data = http_get(url)
        except Exception:
            continue

        def parse_node(node):
            from_name = node["species"]["name"]
            for evo in node.get("evolves_to", []):
                details = (evo.get("evolution_details") or [{}])[0]
                rows.append({
                    "from_name": from_name,
                    "to_name": evo["species"]["name"],
                    "min_level": details.get("min_level"),
                    "trigger": safe_name(details.get("trigger")),
                    "item": safe_name(details.get("item")),
                    "time_of_day": details.get("time_of_day"),
                    "min_happiness": details.get("min_happiness"),
                    "min_beauty": details.get("min_beauty"),
                    "min_affection": details.get("min_affection"),
                    "held_item": safe_name(details.get("held_item")),
                    "known_move_type": safe_name(details.get("known_move_type")),
                    "location": safe_name(details.get("location")),
                    "gender": details.get("gender"),
                })
                parse_node(evo)

        parse_node(data["chain"])

    save_df(pd.DataFrame(rows), "evolution_edges")

# ======================================================
# 7) Learnsets
# ======================================================
def build_learnsets(limit=None):
    reset_table("pokemon_move_learnset")
    rows = []
    dex_list = get_loaded_dex_list(limit)

    for dex in tqdm(dex_list, desc="Learnsets"):
        data = http_get(f"{POKEAPI}/pokemon/{dex}")
        for m in data.get("moves", []):
            for v in m.get("version_group_details", []):
                rows.append({
                    "pokedex_number": dex,
                    "move_name": m["move"]["name"],
                    "level_learned_at": v.get("level_learned_at"),
                    "learn_method": v.get("move_learn_method",{}).get("name"),
                    "version_group": v.get("version_group",{}).get("name"),
                    "generation": None
                })
    save_df(pd.DataFrame(rows), "pokemon_move_learnset")

# ======================================================
# 8) Type chart
# ======================================================
def build_type_chart():
    reset_table("type_chart")
    rows = []
    for t in ALL_TYPES:
        data = http_get(f"{POKEAPI}/type/{t}")
        rels = data.get("damage_relations", {})
        for rel, mult in [("double_damage_to",2),("half_damage_to",0.5),("no_damage_to",0)]:
            for d in rels.get(rel, []):
                rows.append({"attacking": t, "defending": d["name"], "multiplier": mult})
        # Pour compléter les couples manquants (multiplier 1.0), on pourrait générer le cross-product,
        # mais pour notre usage matchups on gère l'absence en assumant 1.0 côté calcul.
    save_df(pd.DataFrame(rows), "type_chart")

# ======================================================
# 9) Pokémon matchups
# ======================================================
def build_matchups():
    reset_table("pokemon_type_matchups")
    chart = pd.read_sql("SELECT * FROM type_chart", engine)
    rows = []
    df_pkm = pd.read_sql("SELECT pokedex_number,type1,type2 FROM dim_pokemon ORDER BY pokedex_number", engine)

    for _, r in tqdm(df_pkm.iterrows(), total=len(df_pkm), desc="Matchups"):
        mults = {}
        for atk in ALL_TYPES:
            sub1 = chart[(chart.attacking==atk)&(chart.defending==r.type1)]
            m1 = sub1["multiplier"].iloc[0] if not sub1.empty else 1.0
            m2 = 1.0
            if r.type2:
                sub2 = chart[(chart.attacking==atk)&(chart.defending==r.type2)]
                m2 = sub2["multiplier"].iloc[0] if not sub2.empty else 1.0
            mults[f"vs_{atk}"] = float(m1) * float(m2)
        rows.append({"pokedex_number": r.pokedex_number, "type1": r.type1, "type2": r.type2 or "", **mults})
    save_df(pd.DataFrame(rows), "pokemon_type_matchups")

# ======================================================
# Main
# ======================================================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Chemin vers le CSV Kaggle Pokémon")
    parser.add_argument("--limit", type=int, help="Limiter le nombre de Pokémon (optionnel)")
    args = parser.parse_args()

    print("==> 1) dim_pokemon")
    build_dim_pokemon(args.csv, limit=args.limit)

    print("==> 2) dim_move + bridge")
    build_moves(limit=args.limit)

    print("==> 3) dim_item")
    build_items()

    print("==> 4) dim_nature")
    build_natures()

    print("==> 5) species")
    build_species(limit=args.limit)

    print("==> 6) evolutions")
    build_evolutions()

    print("==> 7) learnsets")
    build_learnsets(limit=args.limit)

    print("==> 8) type chart")
    build_type_chart()

    print("==> 9) matchups")
    build_matchups()

    print("✅ Initialisation DWH terminée avec succès")

if __name__ == "__main__":
    main()
