"""
I3 Molecule: Auth Service
Business logic for user registration and login.
"""

import sys, os

_BACKEND_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy.orm import Session

from server.src.I4_atoms.db.models import User
from server.src.I4_atoms.helpers.password import hash_password, verify_password
from server.src.I4_atoms.helpers.jwt_helper import create_token
from server.src.I4_atoms.types.schemas import UserResponse, TokenResponse


def register(db: Session, username: str, email: str, password: str) -> UserResponse:
    """
    Register a new user.
    Raises ValueError if username or email already exists.
    """
    existing = db.query(User).filter(
        (User.username == username) | (User.email == email)
    ).first()
    if existing:
        if existing.username == username:
            raise ValueError(f"Username '{username}' is already taken")
        raise ValueError(f"Email '{email}' is already registered")

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role="student",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse.model_validate(user)


def login(db: Session, username: str, password: str) -> TokenResponse:
    """
    Authenticate user and return JWT token.
    Raises ValueError if credentials are invalid.
    """
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise ValueError("Invalid username or password")

    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid username or password")

    token = create_token(user.id, user.username)
    user_resp = UserResponse.model_validate(user)

    return TokenResponse(access_token=token, token_type="bearer", user=user_resp)


def get_user_by_id(db: Session, user_id: int) -> UserResponse:
    """
    Get user by ID. Used by auth middleware after decoding JWT.
    Raises LookupError if user not found.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise LookupError(f"User {user_id} not found")
    return UserResponse.model_validate(user)


if __name__ == "__main__":
    from server.src.I4_atoms.db.connection import SessionLocal
    db = SessionLocal()
    # Test login with seed user
    try:
        result = login(db, "testuser1", "password123")
        print(f"✅ login OK: token={result.access_token[:30]}... user={result.user.username}")
    except ValueError as e:
        print(f"❌ login failed: {e}")
    # Test get_user_by_id
    try:
        user = get_user_by_id(db, 1)
        print(f"✅ get_user_by_id OK: {user.username}")
    except LookupError as e:
        print(f"❌ get_user_by_id failed: {e}")
    db.close()
