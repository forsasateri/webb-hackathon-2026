"""
I4 Atom: Database Connection
SQLAlchemy engine + session factory + FastAPI dependency
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Path: backend/database/app.db
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "..", "..", "..", "database", "app.db")
DB_PATH = os.path.normpath(DB_PATH)

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite needs this for FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: yield a DB session, close after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    # Quick test
    db = SessionLocal()
    result = db.execute(__import__("sqlalchemy").text("SELECT COUNT(*) FROM courses")).scalar()
    print(f"✅ DB connected. courses count: {result}")
    db.close()
