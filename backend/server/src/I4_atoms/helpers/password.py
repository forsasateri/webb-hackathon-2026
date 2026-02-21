"""
I4 Atom: Password Helpers
bcrypt-based password hashing & verification.
⚠️ Uses `bcrypt` directly — passlib is incompatible with Python 3.14.
"""

import bcrypt


def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt. Returns UTF-8 hash string."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


if __name__ == "__main__":
    h = hash_password("password123")
    print(f"Hash: {h}")
    print(f"Verify correct:  {verify_password('password123', h)}")
    print(f"Verify wrong:    {verify_password('wrong', h)}")
    print("✅ password.py OK")
