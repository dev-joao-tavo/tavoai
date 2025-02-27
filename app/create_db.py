import asyncio
from db import engine, Base

async def init_db():
    async with engine.begin() as conn:
        print("Dropping existing tables if they exist...")
        await conn.run_sync(Base.metadata.drop_all)  # Drop existing tables
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)  # Create new tables
        print("✅ Database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_db())
