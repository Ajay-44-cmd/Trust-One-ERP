from app.db.database import Base, engine
import app.models  # Ensure all SQLAlchemy models are registered with Base.metadata

def init_db():
    """Ensure all database tables exist on the connected PostgreSQL / SQLite instance."""
    Base.metadata.create_all(bind=engine)
    print("Database schema verified and all tables created successfully in Supabase PostgreSQL.")

if __name__ == "__main__":
    init_db()
