# =========================
# Poke-Lakehouse Makefile
# =========================

PY=python
CSV=datalake/raw/csv/pokemon.csv

# -------- DATA (DWH) --------
data:
	$(PY) scripts/run.py --csv $(CSV)

data-limit:
	@if [ -z "$(LIM)" ]; then echo "Usage: make data-limit LIM=151"; exit 1; fi
	$(PY) scripts/run.py --csv $(CSV) --limit $(LIM)

# -------- DOCKER (PROD-LIKE) --------
up: ## Up all services (postgres-core, postgres-dwh, backend, frontend)
	docker compose up --build -d

up-back: ## Up only backend (+ DBs)
	docker compose up --build -d postgres-core postgres-dwh backend

up-front: ## Up only frontend (needs backend up)
	docker compose up --build -d frontend

down: ## Stop and remove containers
	docker compose down

logs: ## Tail all services logs
	docker compose logs -f

logs-back:
	docker compose logs -f backend

logs-front:
	docker compose logs -f frontend

# -------- LOCAL DEV (without Docker) --------
serve-api: ## Run FastAPI locally (dev) on :8000
	cd backend && uvicorn app:app --reload --port 8000

serve-web: ## Run frontend locally (dev) on :5173
	cd frontend && VITE_API_URL=http://localhost:8000 npm run dev

# -------- FRONTEND PROD BUILD (optional local) --------
web-build: ## Build frontend production bundle
	cd frontend && npm ci && npm run build

web-preview: ## Preview built frontend locally (vite preview)
	cd frontend && npm run preview -- --host --port 5173

# -------- UTIL --------
psql-core: ## Open psql on CORE DB
	docker exec -it postgres-core psql -U core_user -d poke_core

psql-dwh: ## Open psql on DWH DB
	docker exec -it postgres-dwh psql -U dwh_user -d poke_dwh

schema-dwh: ## Print all tables/columns in DWH
	docker exec -it postgres-dwh psql -U dwh_user -d poke_dwh -c "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position;"

# -------- CLEAN --------
clean: ## Clean local build artifacts (soft)
	rm -rf frontend/node_modules frontend/dist
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -prune -exec rm -rf {} +
	find . -type f -name ".DS_Store" -delete

clean-data: ## Remove generated data (sprites, temp)
	rm -rf datalake/sprites

clean-db: ## Drop docker volumes for Postgres services
	docker compose down -v

clean-all: ## HARD NUKE: containers + images + volumes + local builds
	@echo "⚠️  This will remove ALL docker containers, images, volumes and local build folders."
	@read -p "Continue? [y/N] " ans; \
	if [ "$$ans" = "y" ] || [ "$$ans" = "Y" ]; then \
		docker compose down -v --remove-orphans || true; \
		docker system prune -af --volumes || true; \
		rm -rf frontend/node_modules frontend/dist; \
		rm -rf datalake/sprites; \
		find . -type d -name "__pycache__" -prune -exec rm -rf {} +; \
		find . -type d -name ".pytest_cache" -prune -exec rm -rf {} +; \
		find . -type f -name ".DS_Store" -delete; \
		echo "✅ Clean-all done."; \
	else \
		echo "Cancelled."; \
	fi

# -------- HELP --------
help: ## Show this help
	@grep -E '^[a-zA-Z0-9\-_]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.PHONY: \
	data data-limit \
	up up-back up-front down logs logs-back logs-front \
	serve-api serve-web web-build web-preview \
	psql-core psql-dwh schema-dwh \
	clean clean-data clean-db clean-all help
