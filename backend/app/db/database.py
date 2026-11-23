import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

Base = declarative_base()

connect_args = {}
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
elif db_url.startswith("postgresql://"):
    db_url_pg = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    try:
        # Test connection with short timeout
        test_engine = create_engine(
            db_url_pg,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 3}
        )
        with test_engine.connect() as conn:
            pass
        engine = test_engine
        print("[DATABASE] Connected to Supabase PostgreSQL successfully.")
    except Exception as e:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_path = os.path.join(base_dir, "college_erp_dev.db").replace("\\", "/")
        print(f"[DATABASE NOTICE] PostgreSQL connection unreachable (Supabase project may be paused).")
        print(f"[DATABASE NOTICE] Gracefully falling back to local SQLite database: {db_path}")
        sqlite_url = f"sqlite:///{db_path}"
        engine = create_engine(sqlite_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
else:
    engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
