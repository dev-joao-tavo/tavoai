from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

# PostgreSQL connection string
DATABASE_URL = "postgresql+asyncpg://kanban_user:123456@localhost/kanban_db"

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Create session factory
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# Base class for models
Base = declarative_base()

# Function to get a new async session
@asynccontextmanager
async def get_db_session():
    """Provides an asynchronous database session."""
    async with SessionLocal() as session:
        yield session