import os
from datetime import datetime, timedelta
from typing import Optional, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from corais.database import get_db
from corais.models import Admin, User, UserRole

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-please")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context  = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Union[User, Admin]:
    """Resolves JWT to the correct row in either the users or admins table."""
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        table:   str = payload.get("table", "users")
        if user_id is None:
            raise exc
    except JWTError:
        raise exc

    uid = int(user_id)
    if table == "admins":
        principal = db.query(Admin).filter(Admin.id == uid).first()
    else:
        principal = db.query(User).filter(User.id == uid).first()

    if principal is None or not principal.is_active:
        raise exc
    return principal


def require_admin(current: Union[User, Admin] = Depends(get_current_user)) -> Admin:
    if current.role not in (UserRole.admin, UserRole.superadmin):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current


def require_superadmin(current: Union[User, Admin] = Depends(get_current_user)) -> Admin:
    if current.role != UserRole.superadmin:
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return current
