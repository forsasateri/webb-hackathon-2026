"""
End-to-end HTTP test for M2 Person B: Schedule endpoints (enroll/drop/conflict detection)
Runs the full 9-step cross-validation from Backend_plan_CH.md Phase 3.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from server.src.I1_entry.app import app
from server.src.I4_atoms.db.connection import SessionLocal
from server.src.I4_atoms.db.models import User, Enrollment, TimeSlot, Course

client = TestClient(app)


# ─── Helper: find two courses that share a (period, slot) conflict ───
def find_conflicting_pair():
    """Find two course IDs that share at least one (period, slot)."""
    db = SessionLocal()
    slots = db.query(TimeSlot).all()
    # Build map: (period, slot) → [course_id, ...]
    ps_map: dict[tuple[int, int], list[int]] = {}
    for ts in slots:
        key = (ts.period, ts.slot)
        ps_map.setdefault(key, []).append(ts.course_id)
    db.close()
    for key, cids in ps_map.items():
        if len(cids) >= 2:
            return cids[0], cids[1], key
    raise RuntimeError("No conflicting course pair found in DB — seed data issue")


course_a, course_b, conflict_slot = find_conflicting_pair()
print(f"[setup] Conflict pair: course {course_a} vs course {course_b} at period={conflict_slot[0]}, slot={conflict_slot[1]}")

# ─── Step 1: Register new user ───
r = client.post("/api/auth/register", json={
    "username": "m2_schedule_test",
    "email": "m2test@liu.se",
    "password": "password123",
})
assert r.status_code == 201, f"Step 1 FAIL: Register {r.status_code} {r.text}"
print(f"[1] Register OK: {r.json()['username']}")

# ─── Step 2: Login ───
r = client.post("/api/auth/login", json={
    "username": "m2_schedule_test",
    "password": "password123",
})
assert r.status_code == 200, f"Step 2 FAIL: Login {r.status_code} {r.text}"
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"[2] Login OK: token={token[:40]}...")

# ─── Step 3: Authorize verified (GET /api/auth/me) ───
r = client.get("/api/auth/me", headers=headers)
assert r.status_code == 200
print(f"[3] Auth verified: {r.json()['username']}")

# ─── Step 4: Enroll course A (occupies the conflict slot) → success ───
r = client.post(f"/api/schedule/enroll/{course_a}", headers=headers)
assert r.status_code == 200, f"Step 4 FAIL: Enroll course_a {r.status_code} {r.text}"
print(f"[4] Enroll course {course_a} OK: {r.json()['enrollment']['course_name']}")

# ─── Step 5: Enroll course B (same slot → 409 conflict) ───
r = client.post(f"/api/schedule/enroll/{course_b}", headers=headers)
assert r.status_code == 409, f"Step 5 FAIL: Should 409, got {r.status_code} {r.text}"
detail = r.json()["detail"]
assert "conflicts" in detail, f"Step 5 FAIL: Missing 'conflicts' in detail: {detail}"
print(f"[5] Conflict detected OK: {detail['message']}, conflicts={detail['conflicts']}")

# ─── Step 6: Get schedule → should contain course A ───
r = client.get("/api/schedule", headers=headers)
assert r.status_code == 200
sched = r.json()
assert len(sched["schedule"]) == 1, f"Step 6 FAIL: Expected 1 course, got {len(sched['schedule'])}"
assert sched["schedule"][0]["course"]["id"] == course_a
print(f"[6] Schedule OK: {len(sched['schedule'])} course(s), {sched['total_credits']} credits")

# ─── Step 7: Drop course A ───
r = client.delete(f"/api/schedule/drop/{course_a}", headers=headers)
assert r.status_code == 200, f"Step 7 FAIL: Drop {r.status_code} {r.text}"
print(f"[7] Drop course {course_a} OK")

# ─── Step 8: Get schedule → should be empty ───
r = client.get("/api/schedule", headers=headers)
assert r.status_code == 200
sched = r.json()
assert len(sched["schedule"]) == 0, f"Step 8 FAIL: Expected empty, got {len(sched['schedule'])}"
assert sched["total_credits"] == 0
print(f"[8] Schedule empty OK: {len(sched['schedule'])} courses, {sched['total_credits']} credits")

# ─── Step 9: Enroll course B (conflict released) → success ───
r = client.post(f"/api/schedule/enroll/{course_b}", headers=headers)
assert r.status_code == 200, f"Step 9 FAIL: Enroll course_b after drop {r.status_code} {r.text}"
print(f"[9] Enroll course {course_b} OK (conflict released): {r.json()['enrollment']['course_name']}")

# ─── Bonus: duplicate enrollment → 409 ───
r = client.post(f"/api/schedule/enroll/{course_b}", headers=headers)
assert r.status_code == 409
print(f"[bonus] Duplicate enrollment rejected OK: {r.json()['detail']}")

# ─── Bonus: drop non-enrolled course → 404 ───
r = client.delete(f"/api/schedule/drop/{course_a}", headers=headers)
assert r.status_code == 404
print(f"[bonus] Drop non-enrolled course rejected OK: {r.json()['detail']}")

# ─── Bonus: enroll non-existent course → 404 ───
r = client.post("/api/schedule/enroll/99999", headers=headers)
assert r.status_code == 404
print(f"[bonus] Non-existent course rejected OK: {r.json()['detail']}")

# ─── Cleanup ───
db = SessionLocal()
u = db.query(User).filter(User.username == "m2_schedule_test").first()
if u:
    db.query(Enrollment).filter(Enrollment.user_id == u.id).delete()
    db.delete(u)
    db.commit()
db.close()
print("[cleanup] m2_schedule_test user + enrollments removed")

print("\n=== ALL 9-STEP M2 SCHEDULE E2E TESTS PASSED ===")
