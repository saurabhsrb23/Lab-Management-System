from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import Annotated, List, Optional
from app.database import get_db
from app.models.booking import Booking
from app.models.equipment import Equipment
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingResponse, BookingUpdate
from app.core.deps import get_current_user, get_admin_user

router = APIRouter(prefix="/bookings", tags=["bookings"])


async def check_conflict(
    db: AsyncSession,
    equipment_id: int,
    start_time,
    end_time,
    quantity: int,
    exclude_booking_id: Optional[int] = None,
) -> bool:
    """Returns True if conflict exists (not enough availability)."""
    result = await db.execute(select(Equipment).where(Equipment.id == equipment_id))
    eq = result.scalar_one_or_none()
    if not eq:
        return True

    # Count total approved/pending bookings that overlap
    overlap_query = select(Booking).where(
        and_(
            Booking.equipment_id == equipment_id,
            Booking.status.in_(["pending", "approved"]),
            Booking.start_time < end_time,
            Booking.end_time > start_time,
        )
    )
    if exclude_booking_id:
        overlap_query = overlap_query.where(Booking.id != exclude_booking_id)

    result2 = await db.execute(overlap_query)
    overlapping = result2.scalars().all()
    booked_qty = sum(b.quantity for b in overlapping)
    return (booked_qty + quantity) > eq.quantity


@router.get("/", response_model=List[BookingResponse])
async def list_bookings(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: Optional[str] = Query(None),
):
    query = (
        select(Booking)
        .options(selectinload(Booking.user), selectinload(Booking.equipment))
        .order_by(Booking.created_at.desc())
    )
    if current_user.role == "student":
        query = query.where(Booking.user_id == current_user.id)
    if status:
        query = query.where(Booking.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.user), selectinload(Booking.equipment))
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if current_user.role == "student" and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return booking


@router.post("/", response_model=BookingResponse, status_code=201)
async def create_booking(
    booking_in: BookingCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Check equipment exists
    result = await db.execute(select(Equipment).where(Equipment.id == booking_in.equipment_id))
    eq = result.scalar_one_or_none()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")
    if eq.status != "available":
        raise HTTPException(status_code=400, detail="Equipment is not available")

    # Conflict detection
    has_conflict = await check_conflict(
        db, booking_in.equipment_id, booking_in.start_time, booking_in.end_time, booking_in.quantity
    )
    if has_conflict:
        raise HTTPException(
            status_code=409,
            detail="Booking conflict: insufficient quantity available for the requested time slot",
        )

    booking = Booking(**booking_in.model_dump(), user_id=current_user.id)
    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    # Reload with relationships
    result2 = await db.execute(
        select(Booking)
        .options(selectinload(Booking.user), selectinload(Booking.equipment))
        .where(Booking.id == booking.id)
    )
    return result2.scalar_one()


@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    booking_in: BookingUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.user), selectinload(Booking.equipment))
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Only admin can approve/reject; users can only cancel their own
    if booking_in.status in ("approved", "rejected"):
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required for approval")
    elif booking_in.status == "cancelled":
        if current_user.role == "student" and booking.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    update_data = booking_in.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(booking, field, value)

    # Update equipment available quantity
    if booking_in.status == "approved":
        eq_result = await db.execute(select(Equipment).where(Equipment.id == booking.equipment_id))
        eq = eq_result.scalar_one()
        eq.available_quantity = max(0, eq.available_quantity - booking.quantity)
    elif booking_in.status in ("rejected", "cancelled") and booking.status == "approved":
        eq_result = await db.execute(select(Equipment).where(Equipment.id == booking.equipment_id))
        eq = eq_result.scalar_one()
        eq.available_quantity = min(eq.quantity, eq.available_quantity + booking.quantity)

    await db.commit()
    await db.refresh(booking)

    result2 = await db.execute(
        select(Booking)
        .options(selectinload(Booking.user), selectinload(Booking.equipment))
        .where(Booking.id == booking.id)
    )
    return result2.scalar_one()


@router.delete("/{booking_id}", status_code=204)
async def delete_booking(
    booking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if current_user.role == "student" and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.delete(booking)
    await db.commit()
