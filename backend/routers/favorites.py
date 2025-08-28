from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from typing import List

from ..db import engine_core, engine_dwh
from .auth import get_current_user
from ..schemas import FavoriteIn, FavoriteOut

router = APIRouter(prefix="/favorites", tags=["favorites"])

@router.get("", response_model=List[FavoriteOut])
def list_favorites(user=Depends(get_current_user)):
    with engine_core.begin() as conn:
        rows = conn.execute(text("SELECT pokedex_number FROM favorites WHERE user_id=:uid ORDER BY pokedex_number"), {"uid": user["id"]}).fetchall()
    dex_list = [r[0] for r in rows]
    if not dex_list:
        return []
    with engine_dwh.begin() as conn:
        dwh = conn.execute(
            text("""
                SELECT pokedex_number, name, sprite_front
                FROM dim_pokemon
                WHERE pokedex_number = ANY(:dex)
                ORDER BY pokedex_number
            """),
            {"dex": dex_list}
        ).mappings().all()
    return [FavoriteOut(**row) for row in dwh]

@router.post("", status_code=201)
def add_favorite(payload: FavoriteIn, user=Depends(get_current_user)):
    with engine_core.begin() as conn:
        # verify exists in DWH
        with engine_dwh.begin() as dwh:
            exists = dwh.execute(text("SELECT 1 FROM dim_pokemon WHERE pokedex_number=:dex"), {"dex": payload.pokedex_number}).first()
        if not exists:
            raise HTTPException(404, "Pokémon not found")
        conn.execute(
            text("""
                 INSERT INTO favorites(user_id, pokedex_number)
                 VALUES (:u, :dex)
                 ON CONFLICT (user_id, pokedex_number) DO NOTHING
            """),
            {"u": user["id"], "dex": payload.pokedex_number}
        )
    return {"ok": True}

@router.delete("/{dex}", status_code=204)
def del_favorite(dex: int, user=Depends(get_current_user)):
    with engine_core.begin() as conn:
        conn.execute(text("DELETE FROM favorites WHERE user_id=:u AND pokedex_number=:d"), {"u": user["id"], "d": dex})
    return
