"""
I4 Atom: JWT Helpers
Token creation & decoding using python-jose.
"""

import os
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt

# Secret key — in production, use env var
SECRET_KEY = os.getenv("JWT_SECRET", "hackathon-secret-key-2026-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours for hackathon convenience


def create_token(user_id: int, username: str) -> str:
    """Create a JWT access token with user_id and username in payload."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and verify a JWT token.
    Returns payload dict with 'sub' (user_id as str) and 'username'.
    Raises JWTError on invalid/expired token.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


if __name__ == "__main__":
    token = create_token(1, "testuser1")
    print(f"Token: {token[:50]}...")
    payload = decode_token(token)
    print(f"Payload: {payload}")
    assert payload["sub"] == "1"
    assert payload["username"] == "testuser1"
    print("✅ jwt_helper.py OK")
