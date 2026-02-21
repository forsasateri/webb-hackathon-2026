"""End-to-end HTTP test for Phase 3 Person A: Auth API endpoints via TestClient"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from server.src.I1_entry.app import app

client = TestClient(app)

# 1. Health check
r = client.get("/")
assert r.status_code == 200, f"Health check failed: {r.status_code}"
print("[1] Health check OK")

# 2. Register new user
r = client.post("/api/auth/register", json={
    "username": "e2e_testuser",
    "email": "e2e@test.com",
    "password": "password123",
})
assert r.status_code == 201, f"Register failed: {r.status_code} {r.text}"
data = r.json()
assert data["username"] == "e2e_testuser"
print(f"[2] Register OK: id={data['id']}, username={data['username']}")

# 3. Register duplicate → 409
r = client.post("/api/auth/register", json={
    "username": "e2e_testuser",
    "email": "e2e_dup@test.com",
    "password": "password123",
})
assert r.status_code == 409, f"Duplicate register should 409, got {r.status_code}"
print(f"[3] Duplicate register rejected OK: {r.json()['detail']}")

# 4. Login with new user
r = client.post("/api/auth/login", json={
    "username": "e2e_testuser",
    "password": "password123",
})
assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
token_data = r.json()
assert "access_token" in token_data
assert token_data["user"]["username"] == "e2e_testuser"
token = token_data["access_token"]
print(f"[4] Login OK: token={token[:40]}...")

# 5. Login with wrong password → 401
r = client.post("/api/auth/login", json={
    "username": "e2e_testuser",
    "password": "wrongpassword",
})
assert r.status_code == 401, f"Wrong password should 401, got {r.status_code}"
print(f"[5] Wrong password rejected OK: {r.json()['detail']}")

# 6. GET /api/auth/me with valid token
r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
assert r.status_code == 200, f"Get me failed: {r.status_code} {r.text}"
me = r.json()
assert me["username"] == "e2e_testuser"
print(f"[6] GET /api/auth/me OK: {me['username']} ({me['email']})")

# 7. GET /api/auth/me without token → 401/403 (HTTPBearer rejects missing token)
r = client.get("/api/auth/me")
assert r.status_code in (401, 403), f"No token should 401/403, got {r.status_code}"
print(f"[7] No token rejected OK: {r.status_code}")

# 8. GET /api/auth/me with invalid token → 401
r = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
assert r.status_code == 401, f"Invalid token should 401, got {r.status_code}"
print(f"[8] Invalid token rejected OK: {r.json()['detail']}")

# 9. Login with seed user (testuser1)
r = client.post("/api/auth/login", json={
    "username": "testuser1",
    "password": "password123",
})
assert r.status_code == 200, f"Seed user login failed: {r.status_code} {r.text}"
seed_token = r.json()["access_token"]
print(f"[9] Seed user login OK: testuser1")

# 10. Protected endpoints (enrollment mock) use real auth now
r = client.get("/api/schedule", headers={"Authorization": f"Bearer {seed_token}"})
assert r.status_code == 200, f"Schedule failed: {r.status_code} {r.text}"
print(f"[10] GET /api/schedule with auth OK")

# 11. Courses still work (no auth needed)
r = client.get("/api/courses")
assert r.status_code == 200
print(f"[11] GET /api/courses still OK: {r.json()['total']} courses")

# Cleanup: remove test user
from server.src.I4_atoms.db.connection import SessionLocal
from server.src.I4_atoms.db.models import User
db = SessionLocal()
u = db.query(User).filter(User.username == "e2e_testuser").first()
if u:
    db.delete(u)
    db.commit()
db.close()
print("[cleanup] e2e_testuser removed")

print("\n=== ALL E2E AUTH TESTS PASSED ===")
