from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Annotated
from app.database import get_db
from app.models.user import User
from app.models.equipment import Equipment
from app.models.booking import Booking
from app.core.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    total_equipment = (await db.execute(select(func.count(Equipment.id)))).scalar()
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    pending_bookings = (
        await db.execute(select(func.count(Booking.id)).where(Booking.status == "pending"))
    ).scalar()
    approved_bookings = (
        await db.execute(select(func.count(Booking.id)).where(Booking.status == "approved"))
    ).scalar()
    total_bookings = (await db.execute(select(func.count(Booking.id)))).scalar()
    available_equipment = (
        await db.execute(select(func.count(Equipment.id)).where(Equipment.status == "available"))
    ).scalar()

    return {
        "total_equipment": total_equipment,
        "available_equipment": available_equipment,
        "total_users": total_users,
        "pending_bookings": pending_bookings,
        "approved_bookings": approved_bookings,
        "total_bookings": total_bookings,
    }


@router.get("/bookings-by-status")
async def bookings_by_status(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(
        select(Booking.status, func.count(Booking.id)).group_by(Booking.status)
    )
    return [{"status": row[0], "count": row[1]} for row in result.all()]


@router.get("/bookings-by-month")
async def bookings_by_month(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(
        select(
            func.date_trunc("month", Booking.created_at).label("month"),
            func.count(Booking.id).label("count"),
        )
        .group_by("month")
        .order_by("month")
    )
    return [
        {"month": row[0].strftime("%Y-%m") if row[0] else None, "count": row[1]}
        for row in result.all()
    ]


@router.get("/equipment-usage")
async def equipment_usage(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(
        select(Equipment.name, func.count(Booking.id).label("bookings"))
        .join(Booking, Booking.equipment_id == Equipment.id, isouter=True)
        .group_by(Equipment.id, Equipment.name)
        .order_by(func.count(Booking.id).desc())
        .limit(10)
    )
    return [{"name": row[0], "bookings": row[1]} for row in result.all()]
