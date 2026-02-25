import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Annotated, Optional
from app.database import get_db
from app.models.booking import Booking
from app.models.user import User
from app.core.deps import get_current_user, get_admin_or_researcher

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/bookings")
async def booking_report(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_admin_or_researcher)],
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
):
    query = (
        select(Booking)
        .options(selectinload(Booking.user), selectinload(Booking.equipment))
        .order_by(Booking.created_at.desc())
    )
    if start_date:
        query = query.where(Booking.created_at >= start_date)
    if end_date:
        query = query.where(Booking.created_at <= end_date)
    if status:
        query = query.where(Booking.status == status)

    result = await db.execute(query)
    bookings = result.scalars().all()

    return [
        {
            "id": b.id,
            "user": b.user.full_name if b.user else "",
            "user_email": b.user.email if b.user else "",
            "equipment": b.equipment.name if b.equipment else "",
            "category": b.equipment.category if b.equipment else "",
            "quantity": b.quantity,
            "start_time": b.start_time.isoformat() if b.start_time else "",
            "end_time": b.end_time.isoformat() if b.end_time else "",
            "status": b.status,
            "purpose": b.purpose or "",
            "created_at": b.created_at.isoformat() if b.created_at else "",
        }
        for b in bookings
    ]


@router.get("/bookings/export/csv")
async def export_bookings_csv(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_admin_or_researcher)],
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
):
    query = (
        select(Booking)
        .options(selectinload(Booking.user), selectinload(Booking.equipment))
        .order_by(Booking.created_at.desc())
    )
    if start_date:
        query = query.where(Booking.created_at >= start_date)
    if end_date:
        query = query.where(Booking.created_at <= end_date)
    if status:
        query = query.where(Booking.status == status)

    result = await db.execute(query)
    bookings = result.scalars().all()

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["ID", "User", "Email", "Equipment", "Category", "Quantity",
                    "Start Time", "End Time", "Status", "Purpose", "Created At"],
    )
    writer.writeheader()
    for b in bookings:
        writer.writerow({
            "ID": b.id,
            "User": b.user.full_name if b.user else "",
            "Email": b.user.email if b.user else "",
            "Equipment": b.equipment.name if b.equipment else "",
            "Category": b.equipment.category if b.equipment else "",
            "Quantity": b.quantity,
            "Start Time": b.start_time.isoformat() if b.start_time else "",
            "End Time": b.end_time.isoformat() if b.end_time else "",
            "Status": b.status,
            "Purpose": b.purpose or "",
            "Created At": b.created_at.isoformat() if b.created_at else "",
        })

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=bookings_report.csv"},
    )
