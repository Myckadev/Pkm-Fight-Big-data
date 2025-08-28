from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
import os

from routers import pokedex, auth, favorites

app = FastAPI(title="Poke-Lakehouse API", version="1.0.0")

# CORS
origins = [
    os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# Static sprites (assume datalake mounted at /app/datalake)
if os.path.isdir("datalake"):
    app.mount("/media", StaticFiles(directory="datalake"), name="media")

@app.get("/health")
def health():
    return {"status": "ok"}

# Routers
app.include_router(auth.router)
app.include_router(favorites.router)
app.include_router(pokedex.router)
