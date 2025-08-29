#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Initialisation du Data Warehouse Pokémon (POKE-DWH) — version multilang + shiny + HD sprites

Étapes :
1) dim_pokemon (CSV Kaggle + enrichissements + sprites normal+shiny + HD) + name_{en,fr,es}
2) dim_move (name_{en,fr,es}, effect_{en,fr,es}) + bridge_pokemon_move
3) dim_item (name_{en,fr,es}, effect_{en,fr,es}) + sprites
4) dim_nature
5) pokemon_species (flavor_{en,fr,es}, genus_{en,fr,es} + métadonnées)
6) evolution_edges
7) pokemon_move_learnset
8) type_chart (+ dim_type multilang)
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

# Aligné avec app.py qui monte /media -> "datalake"
FS_MEDIA_ROOT = Path("datalake")             # système de fichiers
URL_MEDIA_ROOT = "/media"                    # URL exposée par FastAPI
SPRITE_DIR = FS_MEDIA_ROOT / "sprites"       # datalake/sprites
(SPRITE_DIR / "pokemon").mkdir(parents=True, exist_ok=True)
(SPRITE_DIR / "items").mkdir(parents=True, exist_ok=True)
# HD folders
(SPRITE_DIR / "hd" / "official").mkdir(parents=True, exist_ok=True)
(SPRITE_DIR / "hd" / "home").mkdir(parents=True, exist_ok=True)

LANGS = ["en", "fr", "es"]

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

def _fs_and_url(subpath: str) -> tuple[Path, str]:
    """Retourne (chemin_fichier_FS, url_path) pour un sous-chemin relatif dans datalake."""
    fs_path = FS_MEDIA_ROOT / subpath
    url_path = f"{URL_MEDIA_ROOT}/{subpath.replace('\\\\', '/')}"
    return fs_path, url_path

def download_binary(url: str | None, outpath: Path) -> None:
    try:
        if url and not outpath.exists():
            r = requests.get(url, timeout=60)
            if r.status_code == 200:
                outpath.parent.mkdir(parents=True, exist_ok=True)
                with open(outpath, "wb") as f:
                    f.write(r.content)
    except Exception as e:
        print(f"⚠️  Téléchargement manqué {url}: {e}")

def get_loaded_dex_list(limit=None):
    """Liste des pokedex_number présents (ORDRE ASC)."""
    with engine.begin() as conn:
        rows = conn.execute(text("SELECT pokedex_number FROM dim_pokemon ORDER BY pokedex_number ASC")).fetchall()
    dex = [r[0] for r in rows]
    return dex[:limit] if (limit and limit > 0) else dex

def _pick_localized(entries: list[dict], key_text: str = "name") -> dict:
    """Transforme une liste d'objets PokeAPI localisés en dict {lang: value}."""
    out = {}
    for e in entries or []:
        lang = ((e.get("language") or {}).get("name") or "").lower()
        if lang in LANGS:
            out[lang] = e.get(key_text)
    return out

def _species_names(spec: dict) -> dict:
    return _pick_localized(spec.get("names") or [], key_text="name")

def _species_genera(spec: dict) -> dict:
    return _pick_localized(spec.get("genera") or [], key_text="genus")

def _species_flavors(spec: dict) -> dict:
    return _pick_localized(spec.get("flavor_text_entries") or [], key_text="flavor_text")

def _move_names(move: dict) -> dict:
    return _pick_localized(move.get("names") or [], key_text="name")

def _move_effects(move: dict) -> dict:
    return _pick_localized(move.get("effect_entries") or [], key_text="effect")

def _item_names(item: dict) -> dict:
    return _pick_localized(item.get("names") or [], key_text="name")

def _item_effects(item: dict) -> dict:
    return _pick_localized(item.get("effect_entries") or [], key_text="effect")

def _type_names(typ: dict) -> dict:
    return _pick_localized(typ.get("names") or [], key_text="name")

# ======================================================
# 1) dim_pokemon (HD + multilang)
# ======================================================
def build_dim_pokemon(csv_path, limit=None):
    df = pd.read_csv(csv_path)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    rename_map = {
        "sp_atk": "sp_attack",
        "sp_def": "sp_defense",
        "legendary": "is_legendary",
    }
    df = df.rename(columns={k:v for k,v in rename_map.items() if k in df.columns})

    needed = ["pokedex_number","name","type1","type2","hp","attack","defense",
              "sp_attack","sp_defense","speed","is_legendary","generation"]
    missing = [c for c in needed if c not in df.columns]
    if missing:
        raise ValueError(f"Colonnes manquantes dans le CSV: {missing}")

    df["total_stats"] = df[["hp","attack","defense","sp_attack","sp_defense","speed"]].sum(axis=1)
    df["primary_type"] = df["type1"]
    df["is_legendary"] = df["is_legendary"].astype(bool)
    df["generation"] = df["generation"].astype(str)
    df["type2"] = df["type2"].fillna("")

    if limit and limit > 0:
        df = df.sort_values("pokedex_number").head(limit).copy()

    names_en, names_fr, names_es = [], [], []
    front_urls, back_urls = [], []
    front_shiny_urls, back_shiny_urls = [], []
    off_front_urls, off_front_shiny_urls = [], []
    home_front_urls, home_front_shiny_urls = [], []

    for dex in tqdm(df["pokedex_number"], desc="Pokémon (names + sprites + HD)"):
        poke = http_get(f"{POKEAPI}/pokemon/{dex}")
        species = http_get(f"{POKEAPI}/pokemon-species/{dex}")

        # Localized names via species
        nm = _species_names(species)
        names_en.append(nm.get("en"))
        names_fr.append(nm.get("fr"))
        names_es.append(nm.get("es"))

        # Sprites (default + shiny)
        sprites = (poke.get("sprites") or {})
        front = sprites.get("front_default")
        back = sprites.get("back_default")
        front_shiny = sprites.get("front_shiny")
        back_shiny = sprites.get("back_shiny")

        fs_front, url_front = _fs_and_url(f"sprites/pokemon/{dex}_front.png")
        fs_back, url_back = _fs_and_url(f"sprites/pokemon/{dex}_back.png")
        fs_front_s, url_front_s = _fs_and_url(f"sprites/pokemon/{dex}_front_shiny.png")
        fs_back_s, url_back_s = _fs_and_url(f"sprites/pokemon/{dex}_back_shiny.png")

        download_binary(front, fs_front)
        download_binary(back, fs_back)
        download_binary(front_shiny, fs_front_s)
        download_binary(back_shiny, fs_back_s)

        front_urls.append(url_front); back_urls.append(url_back)
        front_shiny_urls.append(url_front_s); back_shiny_urls.append(url_back_s)

        # HD: official-artwork + home
        other = sprites.get("other") or {}
        official = other.get("official-artwork") or {}
        home = other.get("home") or {}

        off_front = official.get("front_default")
        off_front_shiny = official.get("front_shiny")
        home_front = home.get("front_default")
        home_front_shiny = home.get("front_shiny")

        fs_off_f, url_off_f = _fs_and_url(f"sprites/hd/official/{dex}_front.png")
        fs_off_fs, url_off_fs = _fs_and_url(f"sprites/hd/official/{dex}_front_shiny.png")
        fs_home_f, url_home_f = _fs_and_url(f"sprites/hd/home/{dex}_front.png")
        fs_home_fs, url_home_fs = _fs_and_url(f"sprites/hd/home/{dex}_front_shiny.png")

        download_binary(off_front, fs_off_f)
        download_binary(off_front_shiny, fs_off_fs)
        download_binary(home_front, fs_home_f)
        download_binary(home_front_shiny, fs_home_fs)

        off_front_urls.append(url_off_f)
        off_front_shiny_urls.append(url_off_fs)
        home_front_urls.append(url_home_f)
        home_front_shiny_urls.append(url_home_fs)

    df["name_en"], df["name_fr"], df["name_es"] = names_en, names_fr, names_es
    df["sprite_front"], df["sprite_back"] = front_urls, back_urls
    df["sprite_front_shiny"], df["sprite_back_shiny"] = front_shiny_urls, back_shiny_urls
    df["sprite_official_front"], df["sprite_official_front_shiny"] = off_front_urls, off_front_shiny_urls
    df["sprite_home_front"], df["sprite_home_front_shiny"] = home_front_urls, home_front_shiny_urls

    reset_table("dim_pokemon")
    save_df(df[[
        "pokedex_number","name","name_en","name_fr","name_es",
        "type1","type2","hp","attack","defense",
        "sp_attack","sp_defense","speed","total_stats","is_legendary",
        "generation","primary_type",
        "sprite_front","sprite_back","sprite_front_shiny","sprite_back_shiny",
        "sprite_official_front","sprite_official_front_shiny",
        "sprite_home_front","sprite_home_front_shiny",
    ]], "dim_pokemon")

# ======================================================
# 2) Moves + Bridge (multilang)
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
            bridge_rows.append({"pokedex_number": dex, "move_name": mv["name"]})
            if mv["name"] not in move_seen:
                mdet = http_get(mv["url"])
                names = _move_names(mdet)
                effects = _move_effects(mdet)
                move_rows.append({
                    "move_id": mdet["id"],
                    "name": mdet["name"],
                    "type": (mdet.get("type") or {}).get("name"),
                    "power": mdet.get("power"),
                    "accuracy": mdet.get("accuracy"),
                    "pp": mdet.get("pp"),
                    "priority": mdet.get("priority"),
                    "damage_class": (mdet.get("damage_class") or {}).get("name"),
                    "name_en": names.get("en"), "name_fr": names.get("fr"), "name_es": names.get("es"),
                    "effect_en": effects.get("en"), "effect_fr": effects.get("fr"), "effect_es": effects.get("es"),
                })
                move_seen.add(mv["name"])

    save_df(pd.DataFrame(move_rows), "dim_move")

    # dedup bridge just in case API repeats entries
    bridge_df = pd.DataFrame(bridge_rows)
    if not bridge_df.empty:
        bridge_df = bridge_df.drop_duplicates(subset=["pokedex_number","move_name"], keep="first")
    save_df(bridge_df, "bridge_pokemon_move")

# ======================================================
# 3) Items (+ sprites, multilang)
# ======================================================
def build_items():
    reset_table("dim_item")
    rows = []
    listing = http_get(f"{POKEAPI}/item?limit=100000")
    item_urls = [it["url"] for it in listing.get("results", [])]

    for url in tqdm(item_urls, desc="Items"):
        try:
            data = http_get(url)
            sprite = (data.get("sprites") or {}).get("default")
            fs_item, url_item = _fs_and_url(f"sprites/items/{data['id']}.png")
            download_binary(sprite, fs_item)

            names = _item_names(data)
            effects = _item_effects(data)

            rows.append({
                "item_id": data["id"],
                "name": data["name"],
                "category": (data.get("category") or {}).get("name"),
                "cost": data.get("cost"),
                "effect": effects.get("en"),
                "sprite_url": url_item,
                "is_competitive_core": ((data.get("category") or {}).get("name") in ["held-items","choice","berries"]),
                "name_en": names.get("en"), "name_fr": names.get("fr"), "name_es": names.get("es"),
                "effect_en": effects.get("en"), "effect_fr": effects.get("fr"), "effect_es": effects.get("es"),
            })
        except Exception:
            continue

    save_df(pd.DataFrame(rows), "dim_item")

# ======================================================
# 4) Natures
# ======================================================
def build_natures():
    reset_table("dim_nature")
    natures = [
        {"name":"adamant","up":"attack","down":"sp_attack"},
        {"name":"modest","up":"sp_attack","down":"attack"},
        {"name":"jolly","up":"speed","down":"sp_attack"},
        {"name":"timid","up":"speed","down":"attack"},
        {"name":"bold","up":"defense","down":"attack"},
    ]
    save_df(pd.DataFrame(natures), "dim_nature")

# ======================================================
# 5) Species (multilang flavor + genus)
# ======================================================
def build_species(limit=None):
    reset_table("pokemon_species")
    rows = []
    dex_list = get_loaded_dex_list(limit)

    for dex in tqdm(dex_list, desc="Species"):
        data = http_get(f"{POKEAPI}/pokemon-species/{dex}")
        flavors = _species_flavors(data)
        genera = _species_genera(data)
        rows.append({
            "pokedex_number": dex,
            "is_legendary": data.get("is_legendary", False),
            "is_mythical": data.get("is_mythical", False),
            "is_baby": data.get("is_baby", False),
            "base_happiness": data.get("base_happiness"),
            "capture_rate": data.get("capture_rate"),
            "color": (data.get("color") or {}).get("name") if data.get("color") else None,
            "shape": (data.get("shape") or {}).get("name") if data.get("shape") else None,
            "growth_rate": (data.get("growth_rate") or {}).get("name") if data.get("growth_rate") else None,
            "habitat": (data.get("habitat") or {}).get("name") if data.get("habitat") else None,
            "generation": (data.get("generation") or {}).get("name") if data.get("generation") else None,
            "egg_groups": ",".join([eg["name"] for eg in data.get("egg_groups", [])]),
            "flavor_en": flavors.get("en"), "flavor_fr": flavors.get("fr"), "flavor_es": flavors.get("es"),
            "genus_en": genera.get("en"), "genus_fr": genera.get("fr"), "genus_es": genera.get("es"),
        })
    save_df(pd.DataFrame(rows), "pokemon_species")

# ======================================================
# 6) Evolutions
# ======================================================
def build_evolutions():
    reset_table("evolution_edges")
    rows = []

    def safe_name(obj):
        return obj.get("name") if isinstance(obj, dict) and obj else None

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
                    "learn_method": (v.get("move_learn_method") or {}).get("name"),
                    "version_group": (v.get("version_group") or {}).get("name"),
                    "generation": None
                })
    df = pd.DataFrame(rows)
    if not df.empty:
        # Harmonise et déduplique sur la PK composite
        for col in ["move_name", "learn_method", "version_group"]:
            df[col] = df[col].fillna("").astype(str).str.strip()
        df = df.drop_duplicates(subset=["pokedex_number","move_name","learn_method","version_group"], keep="first")
        save_df(df, "pokemon_move_learnset")
    else:
        print("⚠️  Aucun learnset à insérer (df vide)")

# ======================================================
# 8) Type chart (+ dim_type multilang)
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
    save_df(pd.DataFrame(rows), "type_chart")

    # dim_type multilang
    try:
        reset_table("dim_type")
        t_rows = []
        listing = http_get(f"{POKEAPI}/type?limit=100").get("results", [])
        for it in listing:
            td = http_get(it["url"])
            names = _type_names(td)
            t_rows.append({
                "type_id": td.get("id"),
                "name": td.get("name"),
                "name_en": names.get("en"), "name_fr": names.get("fr"), "name_es": names.get("es"),
            })
        save_df(pd.DataFrame(t_rows), "dim_type")
    except Exception as e:
        print(f"⚠️  dim_type non mis à jour: {e}")

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

    print("==> 1) dim_pokemon (multilang + shiny + HD)")
    build_dim_pokemon(args.csv, limit=args.limit)

    print("==> 2) dim_move + bridge (multilang)")
    build_moves(limit=args.limit)

    print("==> 3) dim_item (multilang)")
    build_items()

    print("==> 4) dim_nature")
    build_natures()

    print("==> 5) species (multilang)")
    build_species(limit=args.limit)

    print("==> 6) evolutions")
    build_evolutions()

    print("==> 7) learnsets")
    build_learnsets(limit=args.limit)

    print("==> 8) type chart (+ dim_type multilang)")
    build_type_chart()

    print("==> 9) matchups")
    build_matchups()

    print("✅ Initialisation DWH multilang + shiny + HD terminée avec succès")


if __name__ == "__main__":
    main()
