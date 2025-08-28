from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    handle: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    handle: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ---------- Favoris ----------
class FavoriteIn(BaseModel):
    pokedex_number: int

class FavoriteOut(BaseModel):
    pokedex_number: int
    name: str
    sprite_front: Optional[str] = None

# ---------- Pokédex ----------
class PokemonListItem(BaseModel):
    pokedex_number: int
    name: str
    type1: str
    type2: Optional[str] = None
    total_stats: int
    is_legendary: bool
    generation: str
    sprite_front: Optional[str] = None

class PokemonListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    results: List[PokemonListItem]

class PokemonDetail(BaseModel):
    dex: int = Field(..., alias="pokedex_number")
    name: str
    types: List[str]
    stats: Dict[str, int]
    sprites: Dict[str, Optional[str]]
    species: Dict[str, Optional[str] | int | bool]
    matchups: Dict[str, float]
    moves: List[Dict[str, Any]]
    learnsets: List[Dict[str, Any]]
    evolutions: Dict[str, Any]  # graph simplifié
