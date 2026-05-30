import uuid
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import hash_password


def _new_id() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserRegister) -> models.User:
    db_user = models.User(
        id=_new_id(),
        email=user.email.strip().lower(),
        hashed_password=hash_password(user.password),
        name=user.name or user.email.split("@", 1)[0],
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    create_notification(
        db,
        db_user,
        title="Welcome to invvy",
        message="Your inventory workspace is ready.",
        kind="info",
    )
    return db_user


def create_notification(
    db: Session,
    user: models.User,
    title: str,
    message: str,
    kind: str = "info",
    source_id: str | None = None,
) -> models.Notification:
    notification = models.Notification(
        id=_new_id(),
        owner_id=user.id,
        title=title,
        message=message,
        kind=kind,
        source_id=source_id,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_notifications(
    db: Session,
    user: models.User,
    archived: bool | None = False,
) -> list[models.Notification]:
    query = db.query(models.Notification).filter(models.Notification.owner_id == user.id)
    if archived is not None:
        query = query.filter(models.Notification.is_archived == archived)
    return query.order_by(models.Notification.created_at.desc()).all()


def get_notification(
    db: Session,
    notification_id: str,
    user: models.User,
) -> models.Notification | None:
    return (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.owner_id == user.id,
        )
        .first()
    )


def mark_notification_read(
    db: Session,
    notification_id: str,
    user: models.User,
) -> models.Notification | None:
    notification = get_notification(db, notification_id, user)
    if notification is None:
        return None

    notification.is_read = True
    notification.read_at = _now()
    db.commit()
    db.refresh(notification)
    return notification


def archive_notification(
    db: Session,
    notification_id: str,
    user: models.User,
) -> models.Notification | None:
    notification = get_notification(db, notification_id, user)
    if notification is None:
        return None

    notification.is_read = True
    notification.is_archived = True
    notification.read_at = notification.read_at or _now()
    notification.archived_at = _now()
    db.commit()
    db.refresh(notification)
    return notification


def _stock_notification_kind(item: models.InventoryItem) -> str | None:
    if item.quantity <= 0 or item.status == "out-of-stock":
        return "out-of-stock"
    if item.quantity <= item.min_stock or item.status == "low-stock":
        return "low-stock"
    return None


def _create_stock_notification(db: Session, user: models.User, item: models.InventoryItem) -> None:
    kind = _stock_notification_kind(item)
    if kind is None:
        return

    existing = (
        db.query(models.Notification)
        .filter(
            models.Notification.owner_id == user.id,
            models.Notification.source_id == item.id,
            models.Notification.kind == kind,
            models.Notification.is_archived.is_(False),
        )
        .first()
    )
    if existing:
        return

    if kind == "out-of-stock":
        title = "Item out of stock"
        message = f"{item.name} has no stock remaining."
    else:
        title = "Low stock alert"
        message = f"{item.name} is at {item.quantity} {item.unit}, minimum is {item.min_stock}."

    create_notification(db, user, title=title, message=message, kind=kind, source_id=item.id)


def _inventory_item_count(db: Session, inventory_id: str) -> int:
    return (
        db.query(func.count(models.InventoryItem.id))
        .join(models.Category)
        .filter(models.Category.inventory_id == inventory_id)
        .scalar()
        or 0
    )


def _inventory_out(db: Session, inventory: models.Inventory) -> schemas.InventoryOut:
    category_count = (
        db.query(func.count(models.Category.id))
        .filter(models.Category.inventory_id == inventory.id)
        .scalar()
        or 0
    )
    return schemas.InventoryOut(
        id=inventory.id,
        name=inventory.name,
        description=inventory.description,
        category_count=category_count,
        item_count=_inventory_item_count(db, inventory.id),
        created_at=inventory.created_at,
    )


def get_inventories(db: Session, user: models.User) -> list[schemas.InventoryOut]:
    inventories = (
        db.query(models.Inventory)
        .filter(models.Inventory.owner_id == user.id)
        .order_by(models.Inventory.created_at.desc())
        .all()
    )
    return [_inventory_out(db, inventory) for inventory in inventories]


def get_inventory(
    db: Session,
    inventory_id: str,
    user: models.User,
) -> models.Inventory | None:
    return (
        db.query(models.Inventory)
        .filter(models.Inventory.id == inventory_id, models.Inventory.owner_id == user.id)
        .first()
    )


def create_inventory(
    db: Session,
    inventory: schemas.InventoryCreate,
    user: models.User,
) -> models.Inventory:
    db_inventory = models.Inventory(
        id=_new_id(),
        name=inventory.name,
        description=inventory.description,
        owner_id=user.id,
    )
    db.add(db_inventory)
    db.commit()
    db.refresh(db_inventory)
    return db_inventory


def update_inventory(
    db: Session,
    inventory_id: str,
    inventory: schemas.InventoryUpdate,
    user: models.User,
) -> models.Inventory | None:
    db_inventory = get_inventory(db, inventory_id, user)
    if db_inventory is None:
        return None

    db_inventory.name = inventory.name
    db_inventory.description = inventory.description
    db.commit()
    db.refresh(db_inventory)
    return db_inventory


def delete_inventory(db: Session, inventory_id: str, user: models.User) -> bool:
    db_inventory = get_inventory(db, inventory_id, user)
    if db_inventory is None:
        return False

    db.delete(db_inventory)
    db.commit()
    return True


def _category_out(db: Session, category: models.Category) -> schemas.CategoryOut:
    item_count = (
        db.query(func.count(models.InventoryItem.id))
        .filter(models.InventoryItem.category_id == category.id)
        .scalar()
        or 0
    )
    total_quantity = (
        db.query(func.coalesce(func.sum(models.InventoryItem.quantity), 0))
        .filter(models.InventoryItem.category_id == category.id)
        .scalar()
        or 0
    )
    return schemas.CategoryOut(
        id=category.id,
        name=category.name,
        description=category.description,
        inventory_id=category.inventory_id,
        item_count=item_count,
        total_quantity=total_quantity,
        created_at=category.created_at,
    )


def get_categories(
    db: Session,
    inventory_id: str,
    user: models.User,
) -> list[schemas.CategoryOut] | None:
    inventory = get_inventory(db, inventory_id, user)
    if inventory is None:
        return None

    categories = (
        db.query(models.Category)
        .filter(models.Category.inventory_id == inventory_id)
        .order_by(models.Category.created_at.desc())
        .all()
    )
    return [_category_out(db, category) for category in categories]


def get_category(db: Session, category_id: str, user: models.User) -> models.Category | None:
    return (
        db.query(models.Category)
        .join(models.Inventory)
        .filter(
            models.Category.id == category_id,
            models.Inventory.owner_id == user.id,
        )
        .first()
    )


def create_category(
    db: Session,
    inventory_id: str,
    category: schemas.CategoryCreate,
    user: models.User,
) -> models.Category | None:
    inventory = get_inventory(db, inventory_id, user)
    if inventory is None:
        return None

    db_category = models.Category(
        id=_new_id(),
        name=category.name,
        description=category.description,
        inventory_id=inventory_id,
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def update_category(
    db: Session,
    inventory_id: str,
    category_id: str,
    category: schemas.CategoryUpdate,
    user: models.User,
) -> models.Category | None:
    db_category = get_category(db, category_id, user)
    if db_category is None or db_category.inventory_id != inventory_id:
        return None

    db_category.name = category.name
    db_category.description = category.description
    db.commit()
    db.refresh(db_category)
    return db_category


def delete_category(
    db: Session,
    inventory_id: str,
    category_id: str,
    user: models.User,
) -> bool:
    db_category = get_category(db, category_id, user)
    if db_category is None or db_category.inventory_id != inventory_id:
        return False

    db.delete(db_category)
    db.commit()
    return True


def _items_query(db: Session, user: models.User):
    return (
        db.query(models.InventoryItem)
        .join(models.Category)
        .join(models.Inventory)
        .filter(models.Inventory.owner_id == user.id)
    )


def get_items(
    db: Session,
    user: models.User,
    cat_id: str | None = None,
    inv_id: str | None = None,
) -> list[models.InventoryItem]:
    query = _items_query(db, user)
    if cat_id:
        query = query.filter(models.InventoryItem.category_id == cat_id)
    if inv_id:
        query = query.filter(models.Inventory.id == inv_id)
    return query.order_by(models.InventoryItem.last_updated.desc()).all()


def get_item(db: Session, item_id: str, user: models.User) -> models.InventoryItem | None:
    return _items_query(db, user).filter(models.InventoryItem.id == item_id).first()


def create_item(
    db: Session,
    item: schemas.ItemCreate,
    user: models.User,
) -> models.InventoryItem | None:
    category = get_category(db, item.category_id, user)
    if category is None:
        return None

    db_item = models.InventoryItem(
        id=_new_id(),
        name=item.name,
        sku=item.sku.strip().upper(),
        category_id=item.category_id,
        quantity=item.quantity,
        min_stock=item.min_stock,
        price=item.price,
        cost=item.cost,
        supplier=item.supplier,
        unit=item.unit,
        status=item.status,
        image=item.image,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    _create_stock_notification(db, user, db_item)
    return db_item


def update_item(
    db: Session,
    item_id: str,
    item: schemas.ItemUpdate,
    user: models.User,
) -> models.InventoryItem | None:
    db_item = get_item(db, item_id, user)
    if db_item is None:
        return None

    category = get_category(db, item.category_id, user)
    if category is None:
        return None

    db_item.name = item.name
    db_item.sku = item.sku.strip().upper()
    db_item.category_id = item.category_id
    db_item.quantity = item.quantity
    db_item.min_stock = item.min_stock
    db_item.price = item.price
    db_item.cost = item.cost
    db_item.supplier = item.supplier
    db_item.unit = item.unit
    db_item.status = item.status
    db_item.image = item.image
    db.commit()
    db.refresh(db_item)
    _create_stock_notification(db, user, db_item)
    return db_item


def delete_item(db: Session, item_id: str, user: models.User) -> bool:
    db_item = get_item(db, item_id, user)
    if db_item is None:
        return False

    db.delete(db_item)
    db.commit()
    return True


def get_dashboard_stats(db: Session, user: models.User) -> schemas.DashboardStats:
    items = get_items(db, user)
    out_of_stock = sum(
        1 for item in items if item.quantity <= 0 or item.status == "out-of-stock"
    )
    low_stock = sum(
        1
        for item in items
        if item.quantity > 0
        and item.quantity <= item.min_stock
        and item.status != "out-of-stock"
    )
    in_stock = max(len(items) - low_stock - out_of_stock, 0)

    inventory_count = (
        db.query(func.count(models.Inventory.id))
        .filter(models.Inventory.owner_id == user.id)
        .scalar()
        or 0
    )
    category_count = (
        db.query(func.count(models.Category.id))
        .join(models.Inventory)
        .filter(models.Inventory.owner_id == user.id)
        .scalar()
        or 0
    )

    return schemas.DashboardStats(
        total_items=len(items),
        in_stock=in_stock,
        low_stock=low_stock,
        out_of_stock=out_of_stock,
        total_value=sum(item.quantity * item.price for item in items),
        total_cost=sum(item.quantity * item.cost for item in items),
        inventory_count=inventory_count,
        category_count=category_count,
    )
