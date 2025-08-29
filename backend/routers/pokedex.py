from fastapi import APIRouter, HTTPException, Query, Header
from typing import Optional, Dict
from sqlalchemy import text
from db import engine_dwh

router = APIRouter(prefix="/pokedex", tags=["pokedex"])

# ----- Langues gérées -----
VALID_LANGS = {"en", "fr", "es"}

def pick_lang(lang: Optional[str], accept_language: Optional[str]) -> str:
    """
    Langue par défaut = FR. Si non fournie, tente de lire Accept-Language.
    """
    if lang and lang.lower() in VALID_LANGS:
        return lang.lower()
    if accept_language:
        for token in accept_language.split(","):
            code = token.strip().split(";")[0].split("-")[0].lower()
            if code in VALID_LANGS:
                return code
    return "fr"

def coalesce(expr_prefix: str, lang: str) -> str:
    """
    Pour les tables qui possèdent une colonne 'base' + multilang (ex: dim_pokemon.name, dim_item.name, dim_move.name).
    Retourne: COALESCE(prefix_lang, prefix_en, prefix)
    """
    return f"COALESCE({expr_prefix}_{lang}, {expr_prefix}_en, {expr_prefix})"

def coalesce_species(prefix: str, lang: str) -> str:
    """
    Pour les champs SANS colonne 'base' (ex: pokemon_species.genus/flavor, dim_move.effect).
    Retourne la meilleure dispo selon la langue souhaitée, puis les autres en fallback.
    """
    order = [lang] + [x for x in ("en", "fr", "es") if x != lang]
    return "COALESCE(" + ", ".join(f"{prefix}_{l}" for l in order) + ")"

def sprite_front_hd_alias() -> str:
    """
    Alias d'image front pour la liste : HD prioritaire (official > home > default).
    """
    return "COALESCE(sprite_official_front, sprite_home_front, sprite_front)"


# -------------------------------------------------------------------
# LISTE POKÉDEX (HD par défaut)
# -------------------------------------------------------------------
@router.get("/pokemon")
def list_pokemon(
    search: Optional[str] = Query(None, alias="q"),
    type_: Optional[str] = Query(None, alias="type"),
    generation: Optional[str] = Query(None, alias="gen"),
    legendary: Optional[bool] = Query(None, alias="leg"),
    page: int = 1,
    page_size: int = 30,
    lang: Optional[str] = None,
    accept_language: Optional[str] = Header(None),
):
    if page < 1 or page_size < 1 or page_size > 200:
        raise HTTPException(400, "Invalid pagination")
    lang = pick_lang(lang, accept_language)

    name_expr = coalesce("name", lang)
    where, params = [], {}
    if search:
        where.append(f"LOWER({name_expr}) LIKE :q")
        params["q"] = f"%{search.lower()}%"
    if type_:
        where.append("(type1 = :t OR type2 = :t)")
        params["t"] = type_.lower()
    if generation:
        where.append("generation = :g")
        params["g"] = str(generation)
    if legendary is not None:
        where.append("is_legendary = :leg")
        params["leg"] = legendary

    sql_base = f"""
        SELECT
          pokedex_number,
          {name_expr} AS name,
          type1, NULLIF(type2,'') AS type2,
          total_stats, is_legendary, generation,
          {sprite_front_hd_alias()} AS sprite_front
        FROM dim_pokemon
    """
    sql_count = "SELECT COUNT(1) FROM dim_pokemon"
    if where:
        filt = " WHERE " + " AND ".join(where)
        sql_base += filt
        sql_count += filt

    offset = (page - 1) * page_size
    sql_base += " ORDER BY pokedex_number LIMIT :l OFFSET :o"
    params.update({"l": page_size, "o": offset})

    with engine_dwh.begin() as conn:
        total = conn.execute(text(sql_count), params).scalar()
        rows = conn.execute(text(sql_base), params).mappings().all()

    return {"total": total, "page": page, "page_size": page_size, "results": rows}


# -------------------------------------------------------------------
# DÉTAIL POKÉMON (tous les sprites + textes localisés)
# -------------------------------------------------------------------
@router.get("/pokemon/{dex}")
def pokemon_detail(
    dex: int,
    lang: Optional[str] = None,
    accept_language: Optional[str] = Header(None),
):
    lang = pick_lang(lang, accept_language)
    name_expr   = coalesce("dp.name", lang)
    genus_expr  = coalesce_species("ps.genus", lang)     # pas de ps.genus "base"
    flavor_expr = coalesce_species("ps.flavor", lang)    # pas de ps.flavor "base"

    with engine_dwh.begin() as conn:
        # Pokémon + species (on récupère aussi flavor_fr/en pour le front existant)
        p = conn.execute(
            text(f"""
                SELECT
                  dp.pokedex_number,
                  {name_expr} AS name,
                  dp.type1, NULLIF(dp.type2,'') AS type2,
                  dp.hp, dp.attack, dp.defense, dp.sp_attack, dp.sp_defense, dp.speed, dp.total_stats,
                  dp.sprite_front, dp.sprite_back,
                  dp.sprite_front_shiny, dp.sprite_back_shiny,
                  dp.sprite_official_front, dp.sprite_official_front_shiny,
                  dp.sprite_home_front, dp.sprite_home_front_shiny,
                  dp.is_legendary, dp.generation,
                  {genus_expr}  AS genus,
                  {flavor_expr} AS flavor_text,
                  ps.flavor_fr, ps.flavor_en
                FROM dim_pokemon dp
                LEFT JOIN pokemon_species ps ON ps.pokedex_number = dp.pokedex_number
                WHERE dp.pokedex_number = :d
            """),
            {"d": dex}
        ).mappings().first()
        if not p:
            raise HTTPException(404, "Pokémon not found")

        # Moves localisés (nom + effet). NOTE: dim_move.effect_* SANS colonne "effect"
        m_name        = coalesce("m.name", lang)                # ici 'name' a une colonne base -> coalesce()
        m_effect_only = coalesce_species("m.effect", lang)      # ici SANS base -> coalesce_species()
        moves = conn.execute(
            text(f"""
                SELECT
                  m.move_id,
                  {m_name}   AS name,
                  m.name     AS slug,
                  m.type, m.power, m.accuracy, m.pp, m.priority, m.damage_class,
                  {m_effect_only} AS effect
                FROM bridge_pokemon_move b
                JOIN dim_move m ON m.name = b.move_name
                WHERE b.pokedex_number = :d
                ORDER BY {m_name}
            """),
            {"d": dex}
        ).mappings().all()

        # Learnsets
        learnsets = conn.execute(
            text("""
                SELECT move_name AS move, learn_method, level_learned_at, version_group, generation
                FROM pokemon_move_learnset
                WHERE pokedex_number=:d
                ORDER BY version_group, learn_method, level_learned_at NULLS LAST, move_name
            """),
            {"d": dex}
        ).mappings().all()

        # Matchups
        matchups = conn.execute(
            text("SELECT * FROM pokemon_type_matchups WHERE pokedex_number=:d"),
            {"d": dex}
        ).mappings().first()

    # Assemblage (donne TOUTES les variantes de sprites au front)
    sprites: Dict[str, Optional[str]] = {
        "front":                p["sprite_front"],
        "back":                 p["sprite_back"],
        "front_shiny":          p["sprite_front_shiny"],
        "back_shiny":           p["sprite_back_shiny"],
        "official_front":       p["sprite_official_front"],
        "official_front_shiny": p["sprite_official_front_shiny"],
        "home_front":           p["sprite_home_front"],
        "home_front_shiny":     p["sprite_home_front_shiny"],
    }
    detail = {
        "dex": p["pokedex_number"],
        "name": p["name"],
        "types": [p["type1"]] + ([p["type2"]] if p["type2"] else []),
        "stats": {
            "hp": p["hp"], "atk": p["attack"], "def": p["defense"],
            "spa": p["sp_attack"], "spd": p["sp_defense"], "spe": p["speed"],
            "total": p["total_stats"],
        },
        "sprites": sprites,
        "species": {
            "genus": p["genus"],
            "flavor": p["flavor_text"],
            "flavor_fr": p["flavor_fr"],
            "flavor_en": p["flavor_en"],
        },
        "matchups": {k: v for k, v in dict(matchups or {}).items() if k.startswith("vs_")},
        "moves": [dict(m) for m in moves],
        "learnsets": [dict(l) for l in learnsets],
    }
    return detail


# -------------------------------------------------------------------
# LISTE DES MOVES (localisé)
# -------------------------------------------------------------------
@router.get("/moves")
def list_moves(
    search: Optional[str] = None,
    type_: Optional[str] = Query(None, alias="type"),
    damage_class: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    lang: Optional[str] = None,
    accept_language: Optional[str] = Header(None),
):
    if page < 1 or page_size < 1 or page_size > 200:
        raise HTTPException(400, "Invalid pagination")
    lang = pick_lang(lang, accept_language)
    name_expr        = coalesce("name", lang)             # a une colonne base
    effect_expr_only = coalesce_species("effect", lang)   # SANS colonne base

    sql = f"""
      SELECT move_id,
             {name_expr}   AS name,
             name          AS slug,
             type, power, accuracy, pp, priority, damage_class,
             {effect_expr_only} AS effect
      FROM dim_move
    """
    params, where = {}, []
    if search:
        where.append(f"LOWER({name_expr}) LIKE :q")
        params["q"] = f"%{search.lower()}%"
    if type_:
        where.append("type = :t"); params["t"] = type_.lower()
    if damage_class:
        where.append("damage_class = :dc"); params["dc"] = damage_class.lower()
    if where:
        sql += " WHERE " + " AND ".join(where)
    count_sql = "SELECT COUNT(1) FROM (" + sql + ") x"
    sql += " ORDER BY " + name_expr + " LIMIT :l OFFSET :o"
    params.update({"l": page_size, "o": (page-1)*page_size})
    with engine_dwh.begin() as conn:
        total = conn.execute(text(count_sql), params).scalar()
        rows = conn.execute(text(sql), params).mappings().all()
    return {"total": total, "page": page, "page_size": page_size, "results": rows}


# -------------------------------------------------------------------
# LISTE DES ITEMS (localisé)
# -------------------------------------------------------------------
@router.get("/items")
def list_items(
    search: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    lang: Optional[str] = None,
    accept_language: Optional[str] = Header(None),
):
    if page < 1 or page_size < 1 or page_size > 200:
        raise HTTPException(400, "Invalid pagination")
    lang = pick_lang(lang, accept_language)
    name_expr   = coalesce("name", lang)             # dim_item a 'name' base
    effect_expr = coalesce("effect", lang)           # dim_item a 'effect' base

    sql = f"""
      SELECT item_id,
             {name_expr}   AS name,
             name          AS slug,
             category, cost,
             {effect_expr} AS effect,
             sprite_url,
             is_competitive_core
      FROM dim_item
    """
    params, where = {}, []
    if search:
        where.append(f"LOWER({name_expr}) LIKE :q")
        params["q"] = f"%{search.lower()}%"
    if category:
        where.append("category = :c"); params["c"] = category
    if where:
        sql += " WHERE " + " AND ".join(where)
    count_sql = "SELECT COUNT(1) FROM (" + sql + ") x"
    sql += " ORDER BY " + name_expr + " LIMIT :l OFFSET :o"
    params.update({"l": page_size, "o": (page-1)*page_size})
    with engine_dwh.begin() as conn:
        total = conn.execute(text(count_sql), params).scalar()
        rows = conn.execute(text(sql), params).mappings().all()
    return {"total": total, "page": page, "page_size": page_size, "results": rows}


# -------------------------------------------------------------------
# TYPE CHART (pour le hook front)
# -------------------------------------------------------------------
@router.get("/type-chart")
def type_chart():
    with engine_dwh.begin() as conn:
        rows = conn.execute(
            text("SELECT attacking, defending, multiplier FROM type_chart ORDER BY attacking, defending")
        ).mappings().all()
    return [dict(r) for r in rows]


# -------------------------------------------------------------------
# LISTE DES TYPES (localisé) — utile pour filtres/puces
# -------------------------------------------------------------------
@router.get("/types")
def list_types(
    lang: Optional[str] = None,
    accept_language: Optional[str] = Header(None),
):
    lang = pick_lang(lang, accept_language)
    name_expr = coalesce("name", lang)  # dim_type possède name + name_{en,fr,es}
    with engine_dwh.begin() as conn:
        rows = conn.execute(
            text(f"""
                SELECT type_id, name AS slug, {name_expr} AS name
                FROM dim_type
                ORDER BY type_id
            """)
        ).mappings().all()
    return [dict(r) for r in rows]
