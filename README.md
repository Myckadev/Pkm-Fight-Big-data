# Pokémon Lakehouse Arena – Guide complet

## 0) Prérequis
- Python 3.10+
- Node 18+
- Un fichier Kaggle **pokemon.csv** (dataset Rounak Banik) placé dans `poke-lakehouse/datalake/raw/csv/`

Arbo cible :
```
poke-lakehouse/
├─ datalake/
│  ├─ raw/
│  │  └─ csv/pokemon.csv
│  ├─ bronze/
│  ├─ silver/
│  └─ gold/
├─ scripts/
│  └─ pipeline.py
```

## 1) Générer les données (RAW → BRONZE → SILVER)
Depuis `poke-lakehouse/` (où se trouve `scripts/pipeline.py`) :
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Ingestion + enrichissement (tous les Pokémon si pas de --limit)
python scripts/pipeline.py --csv datalake/raw/csv/pokemon.csv
```
Résultat : `datalake/silver/pokemon_silver.parquet`

## 2) Backend (API FastAPI)
Arbo attendue côté backend :
```
backend/
├─ app.py
├─ download_sprites.py
├─ scripts/
│  └─ enrich_competitive.py
├─ datalake/
│  └─ silver/  (on y mettra le parquet + tables enrichies)
└─ static/
   └─ sprites/ (sprites téléchargés)
```

### 2.1 Installer & préparer
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Copier le parquet SILVER produit à l'étape 1
mkdir -p datalake/silver
cp ../datalake/silver/pokemon_silver.parquet datalake/silver/
```

### 2.2 Enrichissement compétitif (moves, items, natures)
```bash
# Test rapide (Gen 1) :
python scripts/enrich_competitive.py --silver datalake/silver/pokemon_silver.parquet --limit 151 --sleep 0.1

# Complet (toutes générations) :
python scripts/enrich_competitive.py --silver datalake/silver/pokemon_silver.parquet
```
Résultats dans `backend/datalake/silver/` :
- `dim_move.parquet`
- `bridge_pokemon_move.parquet`
- `dim_item.parquet`
- `dim_nature.parquet`

### 2.3 Télécharger les sprites (local)
```bash
# limit pour tester, sinon enlever --limit
python download_sprites.py --silver datalake/silver/pokemon_silver.parquet --limit 300
# ou toutes les images (plus long)
python download_sprites.py --silver datalake/silver/pokemon_silver.parquet
```
Sprites créés dans :
```
static/sprites/
  ├─ official-artwork/{id}.png
  ├─ front-default/{id}.png
  ├─ back-default/{id}.png
  ├─ front-shiny/{id}.png
  └─ back-shiny/{id}.png
```

### 2.4 Lancer l’API
```bash
uvicorn app:app --reload --port 8000
```
Endpoints utiles :
- `GET /api/health`
- `GET /api/pokemon?q=&generation=&type=`
- `GET /api/pokemon/{dex_id}`
- `GET /api/moves/{dex_id}` ← **tous les moves** du Pokémon (avec power/accuracy/type/…)
- `GET /api/items?competitive_core=true`
- `GET /api/natures`
- `POST /api/stats/calc` ← **calc de stats** à partir de `dex_id` ou `bases` + `level`, `nature`, `ivs`, `evs`
- `POST /api/battle` ← simulateur ultra simple (à raffiner)

## 3) Frontend (React + Vite)
```bash
cd ../frontend
npm i
echo "VITE_API=http://localhost:8000" > .env
npm run dev
```
Ouvre http://localhost:5173

Onglets :
- **Pokédex** : cartes avec sprites (locaux) + filtres
- **Battle Arena** : duel simple (utilise back/front sprites)
- **Team Builder** : construire une équipe de 6

## 4) Tips & suite
- Remplacer le moteur de combat par un calcul **move-by-move** (utiliser `/api/moves/{dex_id}` + `/api/stats/calc`).
- Animer les attaques côté React par **type** (procédural SVG/Canvas).
- Persister `teams` + `battle_logs` (DuckDB/SQLite) pour le mode **Défie tes amis**.
- Ajouter des **icônes de type**, un **leaderboard**, un **mode tournoi**.
