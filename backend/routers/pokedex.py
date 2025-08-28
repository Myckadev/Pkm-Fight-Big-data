from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from sqlalchemy import text

from ..db import engine_dwh
from ..schemas import PokemonListResponse, PokemonListItem, PokemonDetail

router = APIRouter(prefix="/pokedex", tags=["pokedex"])

# ---------- Helpers ----------
def _apply_filters_sql(base: str, params: dict) -> tuple[str, dict]:
    where = []
    if q := params.get("search"):
        where.append("(LOWER(name) LIKE :q)")
        params["q"] = f"%{q.lower()}%"
    if t := params.get("type"):
        where.append("(type1 = :t OR type2 = :t)")
        params["t"] = t.lower()
    if g := params.get("generation"):
        where.append("generation = :g")
        params["g"] = str(g)
    if params.get("legendary") is not None:
        where.append("is_legendary = :leg")
    if where:
        base += " WHERE " + " AND ".join(where)
    return base, params

# ---------- List ----------
@router.get("/pokemon", response_model=PokemonListResponse)
def list_pokemon(
    search: Optional[str] = None,
    type: Optional[str] = Query(None, alias="type"),
    generation: Optional[str] = None,
    legendary: Optional[bool] = None,
    page: int = 1,
    page_size: int = 30
):
    if page < 1 or page_size < 1 or page_size > 200:
        raise HTTPException(400, "Invalid pagination")

    params = {"search": search, "type": type, "generation": generation, "legendary": legendary}
    base_sql = "SELECT pokedex_number, name, type1, NULLIF(type2,'') as type2, total_stats, is_legendary, generation, sprite_front FROM dim_pokemon"
    count_sql = "SELECT COUNT(1) FROM dim_pokemon"
    base_sql, p = _apply_filters_sql(base_sql, params.copy())
    count_sql, pc = _apply_filters_sql(count_sql, params.copy())

    offset = (page - 1) * page_size
    base_sql += " ORDER BY pokedex_number LIMIT :limit OFFSET :offset"
    p.update({"limit": page_size, "offset": offset})

    with engine_dwh.begin() as conn:
        total = conn.execute(text(count_sql), pc).scalar()
        rows = conn.execute(text(base_sql), p).mappings().all()

    items = [PokemonListItem(**row) for row in rows]
    return {"total": total, "page": page, "page_size": page_size, "results": items}

# ---------- Detail ----------
@router.get("/pokemon/{dex}", response_model=PokemonDetail)
def pokemon_detail(dex: int):
    with engine_dwh.begin() as conn:
        p = conn.execute(text("""
            SELECT pokedex_number, name, type1, NULLIF(type2,'') as type2,
                   hp, attack, defense, sp_attack, sp_defense, speed, total_stats,
                   sprite_front, sprite_back, is_legendary, generation
            FROM dim_pokemon WHERE pokedex_number = :d
        """), {"d": dex}).mappings().first()
        if not p:
            raise HTTPException(404, "Pokémon not found")

        species = conn.execute(text("""
            SELECT is_legendary, is_mythical, is_baby, base_happiness, capture_rate,
                   color, shape, growth_rate, habitat, generation as species_generation,
                   egg_groups, flavor_en, flavor_fr
            FROM pokemon_species WHERE pokedex_number=:d
        """), {"d": dex}).mappings().first()

        matchups = conn.execute(text("""
            SELECT * FROM pokemon_type_matchups WHERE pokedex_number=:d
        """), {"d": dex}).mappings().first()

        moves = conn.execute(text("""
            SELECT dm.name, dm.type, dm.power, dm.accuracy, dm.pp, dm.priority, dm.damage_class, dm.effect
            FROM bridge_pokemon_move bpm
            JOIN dim_move dm ON dm.name = bpm.move_name
            WHERE bpm.pokedex_number = :d
            ORDER BY dm.name
        """), {"d": dex}).mappings().all()

        learnsets = conn.execute(text("""
            SELECT move_name as move, learn_method, level_learned_at, version_group, generation
            FROM pokemon_move_learnset
            WHERE pokedex_number=:d
            ORDER BY version_group, learn_method, level_learned_at NULLS LAST, move_name
        """), {"d": dex}).mappings().all()

        # evolutions: construire une "famille" à partir des edges
        # on récupère le nom pour graph
        name = p["name"]
        edges = conn.execute(text("""
            SELECT from_name, to_name, min_level, trigger, item, time_of_day, min_happiness,
                   min_beauty, min_affection, held_item, known_move_type, location, gender
            FROM evolution_edges
        """)).mappings().all()

    # Build family graph: BFS sur edges non orientés
    nodes = set()
    adj = {}
    for e in edges:
        a, b = e["from_name"], e["to_name"]
        adj.setdefault(a, []).append(e)
        # on stocke aussi inverse pour atteignabilité
        inv = dict(e)
        inv["from_name"], inv["to_name"] = b, a
        adj.setdefault(b, []).append(inv)

    if name in adj:
        q = [name]
        seen = {name}
        fam_edges = []
        while q:
            cur = q.pop(0)
            for e in adj.get(cur, []):
                fam_edges.append(e)
                nxt = e["to_name"]
                if nxt not in seen:
                    seen.add(nxt)
                    q.append(nxt)
        nodes = seen
    else:
        fam_edges = []

    detail = PokemonDetail(
        pokedex_number=p["pokedex_number"],
        name=p["name"],
        types=[p["type1"]] + ([p["type2"]] if p["type2"] else []),
        stats={
            "hp": p["hp"], "atk": p["attack"], "def": p["defense"],
            "spa": p["sp_attack"], "spd": p["sp_defense"], "spe": p["speed"],
            "total": p["total_stats"]
        },
        sprites={"front": p["sprite_front"], "back": p["sprite_back"]},
        species=species or {},
        matchups={k: v for k, v in (dict(matchups or {})).items() if k.startswith("vs_")},
        moves=[dict(m) for m in moves],
        learnsets=[dict(l) for l in learnsets],
        evolutions={"nodes": sorted(nodes), "edges": [dict(e) for e in fam_edges]}
    )
    return detail

# ---------- Moves ----------
@router.get("/moves")
def list_moves(
    search: Optional[str] = None,
    type: Optional[str] = Query(None, alias="type"),
    damage_class: Optional[str] = None,
    page: int = 1,
    page_size: int = 50
):
    if page < 1 or page_size < 1 or page_size > 200:
        raise HTTPException(400, "Invalid pagination")
    sql = "SELECT move_id, name, type, power, accuracy, pp, priority, damage_class, effect FROM dim_move"
    params = {}
    where = []
    if search:
        where.append("LOWER(name) LIKE :q")
        params["q"] = f"%{search.lower()}%"
    if type:
        where.append("type = :t")
        params["t"] = type.lower()
    if damage_class:
        where.append("damage_class = :dc")
        params["dc"] = damage_class.lower()
    if where:
        sql += " WHERE " + " AND ".join(where)
    count_sql = "SELECT COUNT(1) FROM (" + sql + ") x"
    sql += " ORDER BY name LIMIT :l OFFSET :o"
    params.update({"l": page_size, "o": (page-1)*page_size})
    with engine_dwh.begin() as conn:
        total = conn.execute(text(count_sql), params).scalar()
        rows = conn.execute(text(sql), params).mappings().all()
    return {"total": total, "page": page, "page_size": page_size, "results": rows}

# ---------- Items ----------
@router.get("/items")
def list_items(
    search: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    page_size: int = 50
):
    if page < 1 or page_size < 1 or page_size > 200:
        raise HTTPException(400, "Invalid pagination")
    sql = "SELECT item_id, name, category, cost, effect, sprite_url, is_competitive_core FROM dim_item"
    params = {}
    where = []
    if search:
        where.append("LOWER(name) LIKE :q")
        params["q"] = f"%{search.lower()}%"
    if category:
        where.append("category = :c")
        params["c"] = category
    if where:
        sql += " WHERE " + " AND ".join(where)
    count_sql = "SELECT COUNT(1) FROM (" + sql + ") x"
    sql += " ORDER BY name LIMIT :l OFFSET :o"
    params.update({"l": page_size, "o": (page-1)*page_size})
    with engine_dwh.begin() as conn:
        total = conn.execute(text(count_sql), params).scalar()
        rows = conn.execute(text(sql), params).mappings().all()
    return {"total": total, "page": page, "page_size": page_size, "results": rows}

# ---------- Type chart ----------
@router.get("/type-chart")
def type_chart():
    with engine_dwh.begin() as conn:
        rows = conn.execute(text("SELECT attacking, defending, multiplier FROM type_chart ORDER BY attacking, defending")).mappings().all()
    return rows

# ---------- Evolutions direct par nom/dex ----------
@router.get("/evolutions/{dex_or_name}")
def evolutions(dex_or_name: str):
    # si chiffre => on récupère le nom
    try:
        dex = int(dex_or_name)
        with engine_dwh.begin() as conn:
            row = conn.execute(text("SELECT name FROM dim_pokemon WHERE pokedex_number=:d"), {"d": dex}).first()
        if not row:
            raise HTTPException(404, "Pokémon not found")
        name = row[0]
    except ValueError:
        name = dex_or_name.lower()

    with engine_dwh.begin() as conn:
        edges = conn.execute(text("""
            SELECT from_name, to_name, min_level, trigger, item, time_of_day, min_happiness,
                   min_beauty, min_affection, held_item, known_move_type, location, gender
            FROM evolution_edges
        """)).mappings().all()

    adj = {}
    nodes = set()
    for e in edges:
        a, b = e["from_name"], e["to_name"]
        adj.setdefault(a, []).append(e)
        inv = dict(e); inv["from_name"], inv["to_name"] = b, a
        adj.setdefault(b, []).append(inv)

    if name not in adj:
        return {"nodes": [name], "edges": []}

    q = [name]; seen = {name}; fam_edges = []
    while q:
        cur = q.pop(0)
        for e in adj.get(cur, []):
            fam_edges.append(e)
            nxt = e["to_name"]
            if nxt not in seen:
                seen.add(nxt); q.append(nxt)

    return {"nodes": sorted(seen), "edges": fam_edges}
