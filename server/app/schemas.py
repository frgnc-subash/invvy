from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class Token(BaseModel):
    access_token: str
    token_type: str


class UserRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: Optional[str] = None


class InventoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class InventoryUpdate(BaseModel):
    name: str
    description: Optional[str] = None


class InventoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    category_count: int = 0
    item_count: int = 0
    created_at: datetime


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    inventory_id: str
    item_count: int = 0
    total_quantity: int = 0
    created_at: datetime


class ItemCreate(BaseModel):
    name: str
    sku: str
    category_id: str
    quantity: int = Field(default=0, ge=0)
    min_stock: int = Field(default=0, ge=0)
    price: float = Field(default=0.0, ge=0)
    cost: float = Field(default=0.0, ge=0)
    supplier: Optional[str] = None
    unit: str = "pieces"
    status: str = "in-stock"
    image: Optional[str] = None


class ItemUpdate(BaseModel):
    name: str
    sku: str
    category_id: str
    quantity: int = Field(ge=0)
    min_stock: int = Field(ge=0)
    price: float = Field(ge=0)
    cost: float = Field(ge=0)
    supplier: Optional[str] = None
    unit: str
    status: str
    image: Optional[str] = None


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    sku: str
    category_id: str
    quantity: int
    min_stock: int
    price: float
    cost: float
    supplier: Optional[str] = None
    unit: str
    status: str
    image: Optional[str] = None
    last_updated: datetime


class DashboardStats(BaseModel):
    total_items: int
    in_stock: int
    low_stock: int
    out_of_stock: int
    total_value: float
    total_cost: float
    inventory_count: int
    category_count: int


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    message: str
    kind: str
    source_id: Optional[str] = None
    is_read: bool
    is_archived: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
