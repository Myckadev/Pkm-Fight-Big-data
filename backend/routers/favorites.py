# routers/favorites.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel

from db import engine_core, engine_dwh
from routers.auth import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])


class FavoriteIn(BaseModel):
    pokedex_number: int


class FavoriteOut(BaseModel):
    pokedex_number: int
    name: Optional[str] = None
    type1: Optional[str] = None
    type2: Optional[str] = None
    sprite: Optional[str] = None


@router.get("", response_model=List[FavoriteOut])
def list_favorites(user=Depends(get_current_user)):
    # Récupère la liste des dex favorisés pour l’utilisateur
    with engine_core.begin() as conn:
        rows = conn.execute(
            text(
                "SELECT pokedex_number FROM favorites WHERE user_id = :uid ORDER BY pokedex_number"
            ),
            {"uid": user["id"]},
        ).fetchall()

    dex_list = [r[0] for r in rows]
    if not dex_list:
        return []

    # Détail depuis le DWH (on passe un array à Postgres et on utilise ANY())
    with engine_dwh.begin() as conn:
        data = conn.execute(
            text(
                """
                SELECT
                  pokedex_number,
                  name,
                  type1,
                  NULLIF(type2,'') AS type2,
                  sprite_official_front AS sprite
                FROM dim_pokemon
                WHERE pokedex_number = ANY(:dex)
                ORDER BY pokedex_number
                """
            ),
            {"dex": dex_list},
        ).mappings().all()

    return [FavoriteOut(**d) for d in data]


@router.post("", status_code=201)
def add_favorite(payload: FavoriteIn, user=Depends(get_current_user)):
    # Vérifie que le Pokémon existe dans le DWH
    with engine_dwh.begin() as conn:
        ok = conn.execute(
            text("SELECT 1 FROM dim_pokemon WHERE pokedex_number = :d"),
            {"d": payload.pokedex_number},
        ).first()
    if not ok:
        raise HTTPException(404, "Pokémon not found")

    # Upsert simple (ignore si déjà favori)
    with engine_core.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO favorites(user_id, pokedex_number)
                VALUES (:u, :dex)
                ON CONFLICT (user_id, pokedex_number) DO NOTHING
                """
            ),
            {"u": user["id"], "dex": payload.pokedex_number},
        )
    return {"ok": True}


@router.delete("/{dex}", status_code=204)
def del_favorite(dex: int, user=Depends(get_current_user)):
    with engine_core.begin() as conn:
        conn.execute(
            text(
                """
                DELETE FROM favorites
                WHERE user_id = :u AND pokedex_number = :d
                """
            ),
            {"u": user["id"], "d": dex},
        )
    # 204 No Content
    return
