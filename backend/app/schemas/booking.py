from pydantic import BaseModel, model_validator
from datetime import datetime
from typing import Optional
from app.schemas.user import UserResponse
from app.schemas.equipment import EquipmentResponse


class BookingBase(BaseModel):
    equipment_id: int
    quantity: int = 1
    start_time: datetime
    end_time: datetime
    purpose: Optional[str] = None


class BookingCreate(BookingBase):
    @model_validator(mode="after")
    def check_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class BookingUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None


class BookingResponse(BookingBase):
    id: int
    user_id: int
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user: Optional[UserResponse] = None
    equipment: Optional[EquipmentResponse] = None

    model_config = {"from_attributes": True}
