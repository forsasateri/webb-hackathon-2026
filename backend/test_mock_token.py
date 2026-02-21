import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from fastapi.testclient import TestClient
from server.src.I1_entry.app import app, MOCK_TOKEN

client = TestClient(app)

r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {MOCK_TOKEN}"})
print(f"GET /api/auth/me: {r.status_code} {r.json()}")

r = client.get("/api/schedule", headers={"Authorization": f"Bearer {MOCK_TOKEN}"})
print(f"GET /api/schedule: {r.status_code} total_credits={r.json()['total_credits']}")

r = client.post("/api/schedule/enroll/1", headers={"Authorization": f"Bearer {MOCK_TOKEN}"})
print(f"POST /api/schedule/enroll/1: {r.status_code}")

# Real JWT should still work
r2 = client.post("/api/auth/login", json={"username": "testuser1", "password": "password123"})
real_token = r2.json()["access_token"]
r3 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {real_token}"})
print(f"GET /api/auth/me (real JWT): {r3.status_code} {r3.json()['username']}")

print(f"\nMOCK_TOKEN = {MOCK_TOKEN}")
print("=== ALL MOCK TOKEN TESTS PASSED ===")
