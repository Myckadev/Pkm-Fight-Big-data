import os, time, hashlib, hmac, base64, secrets
from typing import Optional, Dict, Any

# --- JWT (PyJWT) ---
try:
    import jwt  # PyJWT
except Exception as e:  # pragma: no cover
    jwt = None

SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
ALGO = "HS256"
TTL_SECONDS = int(os.getenv("JWT_TTL_SECONDS", str(7*24*3600)))  # 7 jours

def create_access_token(*, sub: str, extra: Optional[Dict[str, Any]] = None) -> str:
    payload = {"sub": sub, "iat": int(time.time()), "exp": int(time.time()) + TTL_SECONDS}
    if extra:
        payload.update(extra)
    if not jwt:
        raise RuntimeError("PyJWT is required (pip install PyJWT)")
    return jwt.encode(payload, SECRET, algorithm=ALGO)

def decode_token(token: str) -> Dict[str, Any]:
    if not jwt:
        raise RuntimeError("PyJWT is required (pip install PyJWT)")
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGO])  # type: ignore
    except Exception:
        raise ValueError("Invalid token")

try:
    import bcrypt  # type: ignore
except Exception:
    bcrypt = None

def hash_password(pwd: str) -> str:
    if bcrypt:
        return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", pwd.encode(), salt, 120_000, dklen=32)
    return "pbkdf2$" + base64.b64encode(salt + dk).decode()

def verify_password(pwd: str, hashed: str) -> bool:
    if hashed.startswith("$2"):
        if not bcrypt:
            return False
        try:
            return bcrypt.checkpw(pwd.encode(), hashed.encode())
        except Exception:
            return False
    if hashed.startswith("pbkdf2$"):
        raw = base64.b64decode(hashed.split("$", 1)[1].encode())
        salt, real = raw[:16], raw[16:]
        test = hashlib.pbkdf2_hmac("sha256", pwd.encode(), salt, 120_000, dklen=32)
        return hmac.compare_digest(test, real)
    return False
