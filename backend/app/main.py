from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from app.config import settings
from app.routers import auth, users, equipment, bookings, dashboard, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create default admin user if none exists
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.role == "admin"))
        admin = result.scalar_one_or_none()
        if not admin:
            admin_user = User(
                email=settings.FIRST_ADMIN_EMAIL,
                full_name="System Administrator",
                hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
                role="admin",
            )
            db.add(admin_user)
            await db.commit()
            print(f"Created default admin: {settings.FIRST_ADMIN_EMAIL}")
    yield


app = FastAPI(
    title="Lab Management System",
    description="Full-stack laboratory management system API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(equipment.router, prefix="/api/v1")
app.include_router(bookings.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Lab Management System API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
