# FastAPI Backend Security Review

Date: 2026-05-30

Scope reviewed:

- `server/app/auth.py`
- `server/app/crud.py`
- `server/app/database.py`
- `server/app/main.py`
- `server/app/models.py`
- `server/app/schemas.py`

## Executive Summary

The backend uses ORM-based database access and generally verifies ownership before returning or mutating protected resources. JWT validation pins the expected algorithm, and passwords are hashed with bcrypt.

Key issues to address before production:

- `JWT_SECRET` has a weak hard-coded fallback value.
- CORS currently allows all origins.
- Database connection failures are printed to stdout and may expose internal connection details.
- bcrypt uses the library default work factor rather than an explicit configured cost.
- Password inputs have no length or complexity validation.

## Findings

### 1. Password Hashing

Status: Mostly OK, with hardening recommended

Evidence:

- `server/app/auth.py` uses `bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())`.
- `server/app/auth.py` verifies passwords with `bcrypt.checkpw(...)`.
- `server/app/crud.py` stores `hashed_password`, not plaintext passwords.

Assessment:

- Passwords are hashed correctly with bcrypt.
- The work factor is not explicitly set. Python `bcrypt.gensalt()` defaults to 12 rounds, which is generally acceptable today, but relying on an implicit default is less clear and harder to audit.
- `server/app/schemas.py` accepts any string password. There is no minimum length validation.

Recommended remediation:

```python
PASSWORD_BCRYPT_ROUNDS = int(os.getenv("PASSWORD_BCRYPT_ROUNDS", "12"))

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=PASSWORD_BCRYPT_ROUNDS)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
```

Also add password validation, for example `min_length=8` or stronger, in `UserRegister`.

### 2. JWT Validation

Status: Partially OK

Evidence:

- `server/app/auth.py` sets `ALGORITHM = "HS256"`.
- Tokens are created with `jwt.encode(..., algorithm=ALGORITHM)`.
- Tokens are decoded with `jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])`.
- The `sub` claim is checked and must be a non-empty string.
- The user is fetched from the database after token decode.

Assessment:

- The JWT algorithm is pinned correctly.
- Expiration is included through the `exp` claim.
- A major weakness remains: `SECRET_KEY = os.getenv("JWT_SECRET", "change-me-in-production")`. If `JWT_SECRET` is missing in production, the app silently uses a known weak secret.

Recommended remediation:

- Fail startup if `JWT_SECRET` is missing or still set to a placeholder.
- Consider adding issuer/audience validation if tokens may cross service boundaries.

Example:

```python
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY or SECRET_KEY == "change-me-in-production":
    raise RuntimeError("JWT_SECRET must be configured")
```

### 3. SQL Injection Risk

Status: Low risk found

Evidence:

- `server/app/crud.py` uses SQLAlchemy ORM query construction with `.filter(...)`, `.join(...)`, `.order_by(...)`, and aggregate functions.
- The only raw SQL-like execution found is `connection.execute(text("SELECT 1"))` in `server/app/database.py`.

Assessment:

- No user-controlled raw SQL string concatenation was found.
- `SELECT 1` is constant and not injection-prone.

Recommended remediation:

- Continue using SQLAlchemy ORM or parameterized SQLAlchemy `text()` statements.
- Avoid f-strings or string concatenation inside SQL queries.

### 4. Sensitive Environment Variables

Status: Needs improvement

Evidence:

- `server/app/auth.py` reads `JWT_SECRET` from the environment but falls back to a hard-coded placeholder.
- `server/app/database.py` reads `DATABASE_URL` from the environment.
- `server/app/database.py` prints database connection exceptions to stdout:

```python
print(
    "Warning: could not use DATABASE_URL. "
    f"Falling back to SQLite at ./sql_app.db. Error: {exc}"
)
```

Assessment:

- The application code does not directly print `JWT_SECRET`.
- The database exception can include hostnames, usernames, database names, and driver-level connection details. It may not always include the full password, but logging raw connection exceptions is still risky.
- The repository currently has a tracked `server/.env` file with sensitive-looking values. That is outside runtime code behavior but is a serious secret management concern.

Recommended remediation:

- Do not commit `.env` files with real secrets.
- Rotate any secrets that were committed or shared.
- Replace raw exception printing with sanitized logging.
- Fail closed for missing production secrets.

Example:

```python
logger.warning("Could not connect to configured database; using SQLite fallback")
```

### 5. Authenticated Endpoint Ownership Checks

Status: Mostly OK

Evidence:

- All protected routes depend on `get_current_user`.
- Inventory reads/writes use `models.Inventory.owner_id == user.id`.
- Category operations first verify parent inventory ownership or join through inventory ownership.
- Item operations use `_items_query`, which joins `InventoryItem -> Category -> Inventory` and filters by `Inventory.owner_id == user.id`.
- Item creation and update verify the target category belongs to the current user.

Assessment:

- Resource ownership is consistently enforced for inventories, categories, items, and dashboard stats.
- Public endpoints are limited to health check, login, and register.
- One design note: `GET /api/items` allows optional `cat_id` and `inv_id`; ownership is still enforced through `_items_query`, so another user's IDs should return no rows.

Recommended remediation:

- Keep this pattern centralized.
- Add integration tests that attempt cross-user access to inventories, categories, and items.

### 6. CORS Configuration

Status: Not appropriate for production

Evidence:

`server/app/main.py` configures:

```python
allow_origins=["*"]
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

Assessment:

- This is acceptable for local development only.
- In production, `allow_origins=["*"]` should be restricted to trusted frontend origins.
- Combining wildcard origins with credentials is especially risky conceptually. Browser behavior may block some wildcard credential cases, but the intended policy is still too broad.

Recommended remediation:

- Read allowed origins from environment.
- Use explicit production origins.

Example:

```python
allowed_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

### 7. Unhandled Exceptions and Internal Detail Exposure

Status: Moderate risk

Evidence:

- Route handlers intentionally raise sanitized `HTTPException` responses for common not-found and auth cases.
- Database startup catches broad exceptions and prints the raw exception to stdout.
- CRUD operations generally do not catch `db.commit()` errors, such as uniqueness or database availability failures.

Assessment:

- FastAPI normally returns generic 500 responses to clients when debug is off, so internal details are not necessarily exposed to HTTP clients.
- Internal details may be exposed in server logs through raw database exception printing.
- Unhandled database exceptions may produce noisy logs and inconsistent client behavior under constraint failures or outages.

Recommended remediation:

- Add a global exception handler for SQLAlchemy errors to return a generic message.
- Log sanitized operational errors without credentials.
- Avoid broad fallback behavior in production. A production database failure should usually fail startup rather than silently using SQLite.

Example:

```python
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

@app.exception_handler(SQLAlchemyError)
def database_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Database operation failed"},
    )
```

## Prioritized Remediation Checklist

1. Remove the hard-coded JWT fallback and fail startup when `JWT_SECRET` is missing.
2. Restrict CORS origins using environment-based allowed frontend URLs.
3. Stop printing raw database exceptions; log sanitized messages only.
4. Remove committed secrets from `server/.env`, rotate them, and keep `.env` ignored.
5. Set bcrypt rounds explicitly and add password length validation.
6. Add cross-user authorization tests for inventory/category/item routes.
7. Add generic exception handlers for database errors.

## Overall Risk Rating

Medium.

The authorization and SQL access patterns are reasonably strong, but production readiness is weakened by permissive CORS, weak secret fallback behavior, raw exception logging, and committed secret risk.
