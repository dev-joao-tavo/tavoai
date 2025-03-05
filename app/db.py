from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from base import Base

# PostgreSQL connection string
DATABASE_URL = "postgresql+asyncpg://tavoaiuser:Savassi1!@tavoai-database.cgromq4eqxfc.us-east-1.rds.amazonaws.com:5432/tavoai_db"

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Create session factory
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# Import models to ensure they are included in Base.metadata
from models.models import User, Board, Contact, Card, Message

# Function to get a new async session
@asynccontextmanager
async def get_db_session():
    """Provides an asynchronous database session."""
    async with SessionLocal() as session:
        yield session