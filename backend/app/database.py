import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# In production (Render), DATABASE_URL is set to a Neon Postgres connection string
# (Render's free tier has no persistent disk, so SQLite would get wiped on every
# restart). Locally, with no DATABASE_URL set, this falls back to the same SQLite
# file it's always used — local dev needs no extra setup.
DATABASE_URL = os.environ.get("DATABASE_URL") or f"sqlite:///{os.path.join(BASE_DIR, 'catalog.db')}"
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Columns added to models after the table already existed on someone's machine.
# Base.metadata.create_all() only creates missing TABLES, not missing columns on
# existing ones, so a plain `ALTER TABLE ... ADD COLUMN` here keeps existing local
# databases (and whatever data is already in them) working after a model change,
# instead of throwing "no such column" on every request.
_ADDITIVE_COLUMNS = {
    "catalog": {
        "logo_x": "REAL DEFAULT 0.75",
        "logo_y": "REAL DEFAULT 0.06",
        "logo_w": "REAL DEFAULT 0.18",
        "logo_h": "REAL DEFAULT 0.18",
    },
    "products": {
        "included": "BOOLEAN DEFAULT TRUE",
    },
}


def run_additive_migrations():
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, columns in _ADDITIVE_COLUMNS.items():
            if table not in existing_tables:
                continue  # fresh DB — create_all() will make the table with all columns already
            existing_columns = {col["name"] for col in inspector.get_columns(table)}
            for name, ddl in columns.items():
                if name not in existing_columns:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
