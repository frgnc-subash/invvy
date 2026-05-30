import os

from dotenv import load_dotenv
from sqlalchemy import String, create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

SQLITE_URL = "sqlite:///./sql_app.db"


class IncompatibleDatabaseSchema(RuntimeError):
    pass


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql://", 1)
    return database_url


def _use_local_sqlite() -> bool:
    return os.getenv("USE_LOCAL_SQLITE", "").lower() in {"1", "true", "yes", "on"}


def _database_connect_timeout() -> int:
    raw_timeout = os.getenv("DATABASE_CONNECT_TIMEOUT", "3")
    try:
        return max(1, int(raw_timeout))
    except ValueError:
        return 3


def _connect_args(database_url: str) -> dict[str, bool | int]:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    if database_url.startswith(("postgresql", "postgres")):
        return {"connect_timeout": _database_connect_timeout()}
    return {}


def _create_engine(database_url: str) -> Engine:
    return create_engine(database_url, connect_args=_connect_args(database_url))


def _validate_existing_schema(engine: Engine) -> None:
    expected_string_columns = {
        "users": {"id", "email", "hashed_password"},
        "inventories": {"id", "owner_id"},
        "categories": {"id", "inventory_id"},
        "inventory_items": {"id", "category_id"},
    }
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    for table_name, column_names in expected_string_columns.items():
        if table_name not in existing_tables:
            continue

        columns = {column["name"]: column for column in inspector.get_columns(table_name)}
        missing_columns = column_names - set(columns)
        if missing_columns:
            missing = ", ".join(sorted(missing_columns))
            raise IncompatibleDatabaseSchema(
                f"{table_name} is missing required columns: {missing}"
            )

        incompatible_columns = [
            column_name
            for column_name in column_names
            if not isinstance(columns[column_name]["type"], String)
        ]
        if incompatible_columns:
            incompatible = ", ".join(sorted(incompatible_columns))
            raise IncompatibleDatabaseSchema(
                f"{table_name} has incompatible non-string columns: {incompatible}"
            )


def _build_engine() -> Engine:
    if _use_local_sqlite():
        return _create_engine(SQLITE_URL)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return _create_engine(SQLITE_URL)

    database_url = _normalize_database_url(database_url)
    try:
        postgres_engine = _create_engine(database_url)
        with postgres_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        _validate_existing_schema(postgres_engine)
        return postgres_engine
    except IncompatibleDatabaseSchema:
        return _create_engine(SQLITE_URL)
    except Exception as exc:
        print(
            "Warning: could not use DATABASE_URL. "
            f"Falling back to SQLite at ./sql_app.db. Error: {exc}"
        )
        return _create_engine(SQLITE_URL)


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
