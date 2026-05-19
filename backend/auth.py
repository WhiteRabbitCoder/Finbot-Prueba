import os
import secrets
from datetime import datetime, timedelta
from typing import Annotated

import psycopg2
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from config import DATABASE_URL

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required")

JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@finbot.co")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin1234")

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer()


def _connect():
    return psycopg2.connect(DATABASE_URL)


def init_users_table() -> None:
    con = _connect()
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id              SERIAL PRIMARY KEY,
            email           TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            role            TEXT NOT NULL DEFAULT 'user',
            created_at      TIMESTAMP DEFAULT NOW()
        )
    """)
    con.commit()
    con.close()


def seed_admin() -> None:
    con = _connect()
    cur = con.cursor()
    cur.execute("SELECT COUNT(*) FROM users")
    count = cur.fetchone()[0]
    con.close()
    if count == 0:
        create_user(ADMIN_EMAIL, ADMIN_PASSWORD, role="admin")
        print(f"[Auth] Admin seeded: {ADMIN_EMAIL}")


def _get_user(email: str) -> dict | None:
    con = _connect()
    cur = con.cursor()
    cur.execute(
        "SELECT id, email, hashed_password, role FROM users WHERE email = %s",
        (email,),
    )
    row = cur.fetchone()
    con.close()
    if not row:
        return None
    return {"id": row[0], "email": row[1], "hashed_password": row[2], "role": row[3]}


def create_user(email: str, password: str, role: str = "user") -> dict:
    hashed = _pwd_context.hash(password)
    con = _connect()
    cur = con.cursor()
    try:
        cur.execute(
            "INSERT INTO users (email, hashed_password, role) VALUES (%s, %s, %s)",
            (email, hashed, role),
        )
        con.commit()
    except Exception:
        con.close()
        raise HTTPException(status_code=409, detail="El email ya está registrado")
    con.close()
    return {"email": email, "role": role}


def authenticate_user(email: str, password: str) -> dict | None:
    user = _get_user(email)
    if not user:
        return None
    if not _pwd_context.verify(password, user["hashed_password"]):
        return None
    return user


def create_access_token(email: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": email, "role": role, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> dict:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if not email:
            raise exc
    except JWTError:
        raise exc
    user = _get_user(email)
    if not user:
        raise exc
    return user


async def require_admin(
    current_user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Se requiere rol de administrador")
    return current_user
