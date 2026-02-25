from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class EquipmentBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    quantity: int = 1
    status: str = "available"
    location: Optional[str] = None


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    status: Optional[str] = None
    location: Optional[str] = None


class EquipmentResponse(EquipmentBase):
    id: int
    available_quantity: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
