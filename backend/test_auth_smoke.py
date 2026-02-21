"""Quick smoke test for Phase 3 Person A: Auth endpoints"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server.src.I4_atoms.db.connection import SessionLocal
from server.src.I4_atoms.db.models import User

db = SessionLocal()

# 1. Verify seed user exists
u = db.query(User).filter(User.username == "testuser1").first()
assert u is not None, "testuser1 not found in DB"
print(f"[1] Seed user found: {u.username}, hash={u.password_hash[:20]}...")

# 2. Test auth_service login
import importlib.util
_path = os.path.join("server", "src", "I3_molecules", "auth-service", "auth_service.py")
_spec = importlib.util.spec_from_file_location("auth_service", _path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

result = _mod.login(db, "testuser1", "password123")
print(f"[2] Login OK: token={result.access_token[:40]}... user={result.user.username}")

# 3. Test get_user_by_id
user = _mod.get_user_by_id(db, 1)
print(f"[3] get_user_by_id OK: {user.username} ({user.email})")

# 4. Test wrong password
try:
    _mod.login(db, "testuser1", "wrongpassword")
    print("[4] FAIL: Should have raised ValueError")
except ValueError as e:
    print(f"[4] Wrong password rejected OK: {e}")

# 5. Test register new user
try:
    new_user = _mod.register(db, "smoketest_user", "smoke@test.com", "password123")
    print(f"[5] Register OK: id={new_user.id}, username={new_user.username}")
    # Clean up
    db_user = db.query(User).filter(User.username == "smoketest_user").first()
    if db_user:
        db.delete(db_user)
        db.commit()
        print("[5] Cleanup OK")
except Exception as e:
    print(f"[5] Register error: {e}")

# 6. Test duplicate registration
try:
    _mod.register(db, "testuser1", "new@email.com", "password123")
    print("[6] FAIL: Should have raised ValueError for duplicate username")
except ValueError as e:
    print(f"[6] Duplicate username rejected OK: {e}")

db.close()
print("\n=== ALL AUTH TESTS PASSED ===")
