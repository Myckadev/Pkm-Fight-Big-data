import os
from sqlalchemy import create_engine

# CORE (auth, favoris, plus tard teams/battles)
CORE_DB_URL = (
    f"postgresql://{os.getenv('CORE_DB_USER','core_user')}:"
    f"{os.getenv('CORE_DB_PASSWORD','core_pass')}@"
    f"{os.getenv('CORE_DB_HOST','postgres-core')}:"
    f"{os.getenv('CORE_DB_PORT','5432')}/"
    f"{os.getenv('CORE_DB_NAME','poke_core')}"
)

# DWH (lecture analytique Pokédex)
DWH_DB_URL = (
    f"postgresql://{os.getenv('DWH_DB_USER','dwh_user')}:"
    f"{os.getenv('DWH_DB_PASSWORD','dwh_pass')}@"
    f"{os.getenv('DWH_DB_HOST','postgres-dwh')}:"
    f"{os.getenv('DWH_DB_PORT','5432')}/"
    f"{os.getenv('DWH_DB_NAME','poke_dwh')}"
)

engine_core = create_engine(CORE_DB_URL, pool_pre_ping=True)
engine_dwh  = create_engine(DWH_DB_URL, pool_pre_ping=True)
