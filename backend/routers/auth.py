from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import EmailStr
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from typing import Optional

from ..db import engine_core
from ..utils.security import create_access_token, hash_password, verify_password, decode_token
from ..schemas import UserCreate, UserOut, TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing Bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(401, "Invalid token")
    email = payload.get("sub")
    if not email:
        raise HTTPException(401, "Invalid token payload")
    # fetch user
    with engine_core.begin() as conn:
        row = conn.execute(text("SELECT id, email, handle FROM users WHERE email = :e"), {"e": email}).mappings().first()
    if not row:
        raise HTTPException(401, "User not found")
    return dict(row)

@router.post("/register", response_model=TokenOut)
def register(payload: UserCreate):
    with engine_core.begin() as conn:
        try:
            conn.execute(
                text("""
                    INSERT INTO users(email, handle, password_hash)
                    VALUES (:email, :handle, :ph)
                """),
                {"email": payload.email, "handle": payload.handle, "ph": hash_password(payload.password)}
            )
        except IntegrityError:
            raise HTTPException(409, "Email or handle already exists")
    token = create_access_token(sub=payload.email)
    return {"access_token": token}

@router.post("/login", response_model=TokenOut)
def login(email: EmailStr, password: str):
    with engine_core.begin() as conn:
        row = conn.execute(text("SELECT id, email, handle, password_hash FROM users WHERE email=:e"), {"e": email}).mappings().first()
    if not row or not verify_password(password, row["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(sub=row["email"])
    return {"access_token": token}

@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return user
