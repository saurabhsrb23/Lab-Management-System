from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated, List, Optional
from app.database import get_db
from app.models.equipment import Equipment
from app.models.user import User
from app.schemas.equipment import EquipmentCreate, EquipmentResponse, EquipmentUpdate
from app.core.deps import get_current_user, get_admin_user

router = APIRouter(prefix="/equipment", tags=["equipment"])


@router.get("/", response_model=List[EquipmentResponse])
async def list_equipment(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    query = select(Equipment)
    if category:
        query = query.where(Equipment.category == category)
    if status:
        query = query.where(Equipment.status == status)
    query = query.order_by(Equipment.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment(
    equipment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(select(Equipment).where(Equipment.id == equipment_id))
    eq = result.scalar_one_or_none()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return eq


@router.post("/", response_model=EquipmentResponse, status_code=201)
async def create_equipment(
    eq_in: EquipmentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_admin_user)],
):
    eq = Equipment(**eq_in.model_dump(), available_quantity=eq_in.quantity)
    db.add(eq)
    await db.commit()
    await db.refresh(eq)
    return eq


@router.put("/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(
    equipment_id: int,
    eq_in: EquipmentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_admin_user)],
):
    result = await db.execute(select(Equipment).where(Equipment.id == equipment_id))
    eq = result.scalar_one_or_none()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")

    update_data = eq_in.model_dump(exclude_none=True)
    if "quantity" in update_data:
        diff = update_data["quantity"] - eq.quantity
        eq.available_quantity = max(0, eq.available_quantity + diff)
    for field, value in update_data.items():
        setattr(eq, field, value)
    await db.commit()
    await db.refresh(eq)
    return eq


@router.delete("/{equipment_id}", status_code=204)
async def delete_equipment(
    equipment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_admin_user)],
):
    result = await db.execute(select(Equipment).where(Equipment.id == equipment_id))
    eq = result.scalar_one_or_none()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")
    await db.delete(eq)
    await db.commit()
