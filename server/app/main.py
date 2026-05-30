import os

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import SessionLocal, engine, get_db

app = FastAPI(title="invvy API")

raw_cors_origins = os.getenv("CORS_ORIGINS", "*")
cors_origins = [
    origin.strip()
    for origin in raw_cors_origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _env_flag(name: str, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.lower() in {"1", "true", "yes", "on"}


def seed_demo_user() -> None:
    if not _env_flag("DEMO_USER_ENABLED", True):
        return

    email = os.getenv("DEMO_EMAIL", "demo@invvy.app").strip().lower()
    password = os.getenv("DEMO_PASSWORD", "password")
    name = os.getenv("DEMO_NAME", "Demo User")

    if not email or not password:
        return

    db = SessionLocal()
    try:
        user = crud.get_user_by_email(db, email)
        if user is None:
            crud.create_user(
                db,
                schemas.UserRegister(email=email, password=password, name=name),
            )
            return

        if not verify_password(password, user.hashed_password):
            user.hashed_password = hash_password(password)
            db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup() -> None:
    models.Base.metadata.create_all(bind=engine)
    seed_demo_user()


@app.get("/")
def health_check() -> dict[str, str]:
    return {"message": "invvy API"}


@app.post("/api/auth/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)) -> schemas.Token:
    existing_user = crud.get_user_by_email(db, payload.email.strip().lower())
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    user = crud.create_user(db, payload)
    token = create_access_token({"sub": user.id})
    return schemas.Token(access_token=token, token_type="bearer")


@app.post("/api/auth/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)) -> schemas.Token:
    user = crud.get_user_by_email(db, payload.email.strip().lower())
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": user.id})
    return schemas.Token(access_token=token, token_type="bearer")


@app.get("/api/auth/me", response_model=schemas.UserPublic)
def me(current_user: models.User = Depends(get_current_user)) -> models.User:
    return current_user


@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.DashboardStats:
    return crud.get_dashboard_stats(db, current_user)


@app.get("/api/notifications", response_model=list[schemas.NotificationOut])
def list_notifications(
    archived: bool | None = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[models.Notification]:
    return crud.get_notifications(db, current_user, archived=archived)


@app.patch("/api/notifications/{notification_id}/read", response_model=schemas.NotificationOut)
def read_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.Notification:
    notification = crud.mark_notification_read(db, notification_id, current_user)
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification


@app.patch("/api/notifications/{notification_id}/archive", response_model=schemas.NotificationOut)
def archive_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.Notification:
    notification = crud.archive_notification(db, notification_id, current_user)
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification


@app.get("/api/inventories", response_model=list[schemas.InventoryOut])
def list_inventories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[schemas.InventoryOut]:
    return crud.get_inventories(db, current_user)


@app.post(
    "/api/inventories",
    response_model=schemas.InventoryOut,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory(
    payload: schemas.InventoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.InventoryOut:
    inventory = crud.create_inventory(db, payload, current_user)
    return crud._inventory_out(db, inventory)


@app.get("/api/inventories/{inv_id}", response_model=schemas.InventoryOut)
def get_inventory(
    inv_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.InventoryOut:
    inventory = crud.get_inventory(db, inv_id, current_user)
    if inventory is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
    return crud._inventory_out(db, inventory)


@app.put("/api/inventories/{inv_id}", response_model=schemas.InventoryOut)
def update_inventory(
    inv_id: str,
    payload: schemas.InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.InventoryOut:
    inventory = crud.update_inventory(db, inv_id, payload, current_user)
    if inventory is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
    return crud._inventory_out(db, inventory)


@app.delete("/api/inventories/{inv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory(
    inv_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Response:
    deleted = crud.delete_inventory(db, inv_id, current_user)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/inventories/{inv_id}/categories", response_model=list[schemas.CategoryOut])
def list_categories(
    inv_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[schemas.CategoryOut]:
    categories = crud.get_categories(db, inv_id, current_user)
    if categories is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
    return categories


@app.post(
    "/api/inventories/{inv_id}/categories",
    response_model=schemas.CategoryOut,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    inv_id: str,
    payload: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.CategoryOut:
    category = crud.create_category(db, inv_id, payload, current_user)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
    return crud._category_out(db, category)


@app.put("/api/inventories/{inv_id}/categories/{cid}", response_model=schemas.CategoryOut)
def update_category(
    inv_id: str,
    cid: str,
    payload: schemas.CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> schemas.CategoryOut:
    category = crud.update_category(db, inv_id, cid, payload, current_user)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return crud._category_out(db, category)


@app.delete(
    "/api/inventories/{inv_id}/categories/{cid}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_category(
    inv_id: str,
    cid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Response:
    deleted = crud.delete_category(db, inv_id, cid, current_user)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/items", response_model=list[schemas.ItemOut])
def list_items(
    cat_id: str | None = None,
    inv_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> list[models.InventoryItem]:
    return crud.get_items(db, current_user, cat_id=cat_id, inv_id=inv_id)


@app.post("/api/items", response_model=schemas.ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: schemas.ItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.InventoryItem:
    item = crud.create_item(db, payload, current_user)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return item


@app.get("/api/items/{item_id}", response_model=schemas.ItemOut)
def get_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.InventoryItem:
    item = crud.get_item(db, item_id, current_user)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


@app.put("/api/items/{item_id}", response_model=schemas.ItemOut)
def update_item(
    item_id: str,
    payload: schemas.ItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> models.InventoryItem:
    item = crud.update_item(db, item_id, payload, current_user)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


@app.delete("/api/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Response:
    deleted = crud.delete_item(db, item_id, current_user)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
