"""
Comprehensive integration tests for ALL API endpoints.
All 13 endpoints now tested against real DB.
Run: cd backend && python -m pytest test_all_endpoints.py -v
"""
import sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pytest
from fastapi.testclient import TestClient
from server.src.I1_entry.app import app, MOCK_TOKEN
from server.src.I4_atoms.db.connection import SessionLocal
from server.src.I4_atoms.db.models import User, Enrollment, TimeSlot, Course, Review

client = TestClient(app)

# ═══════════════════════════════════════════════════════════════
# Fixtures / Helpers
# ═══════════════════════════════════════════════════════════════

TEST_USER = "pytest_user_" + os.urandom(4).hex()
TEST_EMAIL = f"{TEST_USER}@test.com"
TEST_PASSWORD = "password123"


def _cleanup_user(username: str):
    """Remove test user and all associated data."""
    db = SessionLocal()
    u = db.query(User).filter(User.username == username).first()
    if u:
        db.query(Enrollment).filter(Enrollment.user_id == u.id).delete()
        db.query(Review).filter(Review.user_id == u.id).delete()
        db.delete(u)
        db.commit()
    db.close()


def _register_and_login(username: str, email: str, password: str) -> str:
    """Register a user, login, and return the JWT token."""
    client.post("/api/auth/register", json={
        "username": username,
        "email": email,
        "password": password,
    })
    r = client.post("/api/auth/login", json={
        "username": username,
        "password": password,
    })
    return r.json()["access_token"]


def _find_conflicting_pair():
    """Find two course IDs that share at least one (period, slot)."""
    db = SessionLocal()
    slots = db.query(TimeSlot).all()
    ps_map: dict[tuple[int, int], list[int]] = {}
    for ts in slots:
        key = (ts.period, ts.slot)
        ps_map.setdefault(key, []).append(ts.course_id)
    db.close()
    for key, cids in ps_map.items():
        unique_cids = list(set(cids))
        if len(unique_cids) >= 2:
            return unique_cids[0], unique_cids[1], key
    raise RuntimeError("No conflicting course pair found in DB")


def _find_no_conflict_course(user_id: int):
    """Find a course that doesn't conflict with user's current schedule."""
    db = SessionLocal()
    # Get user's existing time slots
    user_slots = set()
    user_course_ids = set()
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == user_id).all()
    for e in enrollments:
        user_course_ids.add(e.course_id)
        for ts in db.query(TimeSlot).filter(TimeSlot.course_id == e.course_id).all():
            user_slots.add((ts.period, ts.slot))

    # Find a course with no slot overlap
    courses = db.query(Course).all()
    for c in courses:
        if c.id in user_course_ids:
            continue
        course_slots = {(ts.period, ts.slot) for ts in c.time_slots}
        if not course_slots & user_slots:
            db.close()
            return c.id
    db.close()
    return None


# ═══════════════════════════════════════════════════════════════
# 1. Health Check
# ═══════════════════════════════════════════════════════════════

class TestHealthCheck:
    def test_health_check(self):
        r = client.get("/")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"


# ═══════════════════════════════════════════════════════════════
# 2. Course Endpoints (Real DB)
# ═══════════════════════════════════════════════════════════════

class TestCourses:
    def test_list_courses(self):
        """GET /api/courses returns course list from DB."""
        r = client.get("/api/courses")
        assert r.status_code == 200, f"Failed: {r.status_code} {r.text}"
        data = r.json()
        assert "courses" in data
        assert "total" in data
        assert data["total"] > 0
        # Each course should have required fields
        course = data["courses"][0]
        for field in ["id", "code", "name", "credits", "instructor", "department", "capacity", "enrolled_count", "time_slots"]:
            assert field in course, f"Missing field: {field}"

    def test_list_courses_keyword_filter(self):
        """GET /api/courses?keyword=machine returns filtered results."""
        r = client.get("/api/courses", params={"keyword": "machine"})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] > 0
        # All results should contain 'machine' in name/description/code
        for c in data["courses"]:
            text = (c["name"] + " " + (c["description"] or "") + " " + c["code"]).lower()
            assert "machine" in text

    def test_list_courses_department_filter(self):
        """GET /api/courses?department=X returns only courses from that department."""
        # First get all courses to find a valid department
        r = client.get("/api/courses")
        all_courses = r.json()["courses"]
        if all_courses:
            dept = all_courses[0]["department"]
            r = client.get("/api/courses", params={"department": dept})
            assert r.status_code == 200
            for c in r.json()["courses"]:
                assert c["department"] == dept

    def test_list_courses_credits_filter(self):
        """GET /api/courses?credits=6 returns only 6-credit courses."""
        r = client.get("/api/courses", params={"credits": 6})
        assert r.status_code == 200
        for c in r.json()["courses"]:
            assert c["credits"] == 6

    def test_list_courses_empty_result(self):
        """GET /api/courses?keyword=xyznonexistent returns empty list."""
        r = client.get("/api/courses", params={"keyword": "xyznonexistent_12345"})
        assert r.status_code == 200
        assert r.json()["total"] == 0
        assert r.json()["courses"] == []

    def test_get_course_detail(self):
        """GET /api/courses/{id} returns full course detail."""
        # Get a valid course ID first
        r = client.get("/api/courses")
        course_id = r.json()["courses"][0]["id"]

        r = client.get(f"/api/courses/{course_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == course_id
        for field in ["code", "name", "description", "credits", "instructor", "department",
                       "capacity", "enrolled_count", "avg_rating", "time_slots"]:
            assert field in data, f"Missing field: {field}"
        # time_slots should be a list
        assert isinstance(data["time_slots"], list)

    def test_get_course_not_found(self):
        """GET /api/courses/99999 returns 404."""
        r = client.get("/api/courses/99999")
        assert r.status_code == 404


# ═══════════════════════════════════════════════════════════════
# 3. Authentication Endpoints (Real DB)
# ═══════════════════════════════════════════════════════════════

class TestAuth:
    @pytest.fixture(autouse=True)
    def cleanup(self):
        yield
        _cleanup_user(TEST_USER)

    def test_register_success(self):
        """POST /api/auth/register creates new user."""
        r = client.post("/api/auth/register", json={
            "username": TEST_USER,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 201, f"Register failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["username"] == TEST_USER
        assert data["email"] == TEST_EMAIL
        assert data["role"] == "student"
        assert "id" in data
        assert "created_at" in data
        # password should not be in response
        assert "password" not in data
        assert "password_hash" not in data

    def test_register_duplicate_username(self):
        """POST /api/auth/register with duplicate username returns 409."""
        client.post("/api/auth/register", json={
            "username": TEST_USER,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        r = client.post("/api/auth/register", json={
            "username": TEST_USER,
            "email": "other_" + TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 409

    def test_register_duplicate_email(self):
        """POST /api/auth/register with duplicate email returns 409."""
        client.post("/api/auth/register", json={
            "username": TEST_USER,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        r = client.post("/api/auth/register", json={
            "username": "other_" + TEST_USER,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 409

    def test_register_invalid_short_username(self):
        """POST /api/auth/register with too short username returns 422."""
        r = client.post("/api/auth/register", json={
            "username": "ab",  # min 3
            "email": "short@test.com",
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 422

    def test_register_invalid_short_password(self):
        """POST /api/auth/register with too short password returns 422."""
        r = client.post("/api/auth/register", json={
            "username": TEST_USER,
            "email": TEST_EMAIL,
            "password": "12345",  # min 6
        })
        assert r.status_code == 422

    def test_login_success(self):
        """POST /api/auth/login with valid credentials returns token."""
        client.post("/api/auth/register", json={
            "username": TEST_USER,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        r = client.post("/api/auth/login", json={
            "username": TEST_USER,
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
        data = r.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == TEST_USER

    def test_login_wrong_password(self):
        """POST /api/auth/login with wrong password returns 401."""
        client.post("/api/auth/register", json={
            "username": TEST_USER,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        r = client.post("/api/auth/login", json={
            "username": TEST_USER,
            "password": "wrongpassword",
        })
        assert r.status_code == 401

    def test_login_nonexistent_user(self):
        """POST /api/auth/login with non-existent user returns 401."""
        r = client.post("/api/auth/login", json={
            "username": "nonexistent_user_xyz123",
            "password": "password123",
        })
        assert r.status_code == 401

    def test_login_seed_user(self):
        """POST /api/auth/login with seed user testuser1 works."""
        r = client.post("/api/auth/login", json={
            "username": "testuser1",
            "password": "password123",
        })
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data

    def test_get_me_valid_token(self):
        """GET /api/auth/me with valid JWT returns user info."""
        client.post("/api/auth/register", json={
            "username": TEST_USER,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        r = client.post("/api/auth/login", json={
            "username": TEST_USER,
            "password": TEST_PASSWORD,
        })
        token = r.json()["access_token"]

        r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["username"] == TEST_USER
        assert data["email"] == TEST_EMAIL

    def test_get_me_mock_token(self):
        """GET /api/auth/me with MOCK_TOKEN returns MOCK_USER."""
        r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {MOCK_TOKEN}"})
        assert r.status_code == 200
        data = r.json()
        assert data["username"] == "testuser1"

    def test_get_me_no_token(self):
        """GET /api/auth/me without token returns 401 or 403."""
        r = client.get("/api/auth/me")
        assert r.status_code in (401, 403)

    def test_get_me_invalid_token(self):
        """GET /api/auth/me with invalid token returns 401."""
        r = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════
# 4. Schedule / Enrollment Endpoints (Real DB)
# ═══════════════════════════════════════════════════════════════

class TestSchedule:
    """Tests for enrollment, drop, and schedule retrieval."""

    @pytest.fixture(autouse=True)
    def setup_user(self):
        """Register a test user and get a token; cleanup after test."""
        self.username = "pytest_sched_" + os.urandom(4).hex()
        self.email = f"{self.username}@test.com"

        r = client.post("/api/auth/register", json={
            "username": self.username,
            "email": self.email,
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 201, f"Setup register failed: {r.status_code} {r.text}"
        self.user_id = r.json()["id"]

        r = client.post("/api/auth/login", json={
            "username": self.username,
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 200, f"Setup login failed: {r.status_code} {r.text}"
        self.token = r.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

        yield

        _cleanup_user(self.username)

    def test_get_schedule_empty(self):
        """GET /api/schedule for new user returns empty schedule."""
        r = client.get("/api/schedule", headers=self.headers)
        assert r.status_code == 200, f"Failed: {r.status_code} {r.text}"
        data = r.json()
        assert "schedule" in data
        assert "total_credits" in data
        assert len(data["schedule"]) == 0
        assert data["total_credits"] == 0

    def test_enroll_success(self):
        """POST /api/schedule/enroll/{id} enrolls user in course."""
        # Find a course to enroll in
        course_id = _find_no_conflict_course(self.user_id)
        if course_id is None:
            pytest.skip("No conflict-free course found")

        r = client.post(f"/api/schedule/enroll/{course_id}", headers=self.headers)
        assert r.status_code == 200, f"Enroll failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["message"] == "Enrollment successful"
        assert data["enrollment"]["course_id"] == course_id

    def test_enroll_and_check_schedule(self):
        """Enroll in a course, then check schedule contains it."""
        course_id = _find_no_conflict_course(self.user_id)
        if course_id is None:
            pytest.skip("No conflict-free course found")

        r = client.post(f"/api/schedule/enroll/{course_id}", headers=self.headers)
        assert r.status_code == 200

        r = client.get("/api/schedule", headers=self.headers)
        assert r.status_code == 200
        sched = r.json()
        assert len(sched["schedule"]) == 1
        assert sched["schedule"][0]["course"]["id"] == course_id
        assert sched["total_credits"] > 0

    def test_enroll_duplicate(self):
        """POST /api/schedule/enroll/{id} twice returns 409."""
        course_id = _find_no_conflict_course(self.user_id)
        if course_id is None:
            pytest.skip("No conflict-free course found")

        r = client.post(f"/api/schedule/enroll/{course_id}", headers=self.headers)
        assert r.status_code == 200

        r = client.post(f"/api/schedule/enroll/{course_id}", headers=self.headers)
        assert r.status_code == 409, f"Duplicate should 409, got {r.status_code} {r.text}"

    def test_enroll_conflict(self):
        """Enroll in two courses that share the same time slot → 409 with conflict details."""
        course_a, course_b, conflict_slot = _find_conflicting_pair()

        # Enroll in course A
        r = client.post(f"/api/schedule/enroll/{course_a}", headers=self.headers)
        assert r.status_code == 200, f"Enroll course_a failed: {r.status_code} {r.text}"

        # Enroll in course B (conflict)
        r = client.post(f"/api/schedule/enroll/{course_b}", headers=self.headers)
        assert r.status_code == 409, f"Conflict should 409, got {r.status_code} {r.text}"
        detail = r.json()["detail"]
        assert "conflicts" in detail, f"Missing 'conflicts' in detail: {detail}"
        assert len(detail["conflicts"]) > 0
        conflict = detail["conflicts"][0]
        assert "period" in conflict
        assert "slot" in conflict
        assert "conflicting_course_id" in conflict
        assert "conflicting_course_name" in conflict

    def test_enroll_nonexistent_course(self):
        """POST /api/schedule/enroll/99999 returns 404."""
        r = client.post("/api/schedule/enroll/99999", headers=self.headers)
        assert r.status_code == 404, f"Non-existent should 404, got {r.status_code} {r.text}"

    def test_drop_success(self):
        """DELETE /api/schedule/drop/{id} drops enrolled course."""
        course_id = _find_no_conflict_course(self.user_id)
        if course_id is None:
            pytest.skip("No conflict-free course found")

        # Enroll first
        r = client.post(f"/api/schedule/enroll/{course_id}", headers=self.headers)
        assert r.status_code == 200

        # Drop
        r = client.delete(f"/api/schedule/drop/{course_id}", headers=self.headers)
        assert r.status_code == 200, f"Drop failed: {r.status_code} {r.text}"
        assert r.json()["course_id"] == course_id

        # Verify schedule is empty
        r = client.get("/api/schedule", headers=self.headers)
        assert r.status_code == 200
        assert len(r.json()["schedule"]) == 0

    def test_drop_not_enrolled(self):
        """DELETE /api/schedule/drop/{id} for non-enrolled course returns 404."""
        r = client.delete("/api/schedule/drop/99999", headers=self.headers)
        assert r.status_code == 404, f"Drop not-enrolled should 404, got {r.status_code} {r.text}"

    def test_enroll_drop_reenroll(self):
        """Full cycle: enroll → conflict → drop → re-enroll (conflict released)."""
        course_a, course_b, conflict_slot = _find_conflicting_pair()

        # Enroll A
        r = client.post(f"/api/schedule/enroll/{course_a}", headers=self.headers)
        assert r.status_code == 200

        # Enroll B → 409
        r = client.post(f"/api/schedule/enroll/{course_b}", headers=self.headers)
        assert r.status_code == 409

        # Drop A
        r = client.delete(f"/api/schedule/drop/{course_a}", headers=self.headers)
        assert r.status_code == 200

        # Now B should succeed (conflict released)
        r = client.post(f"/api/schedule/enroll/{course_b}", headers=self.headers)
        assert r.status_code == 200, f"Re-enroll after drop should succeed, got {r.status_code} {r.text}"

    def test_enroll_no_auth(self):
        """POST /api/schedule/enroll/{id} without token returns 401/403."""
        r = client.post("/api/schedule/enroll/1")
        assert r.status_code in (401, 403)

    def test_schedule_no_auth(self):
        """GET /api/schedule without token returns 401/403."""
        r = client.get("/api/schedule")
        assert r.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════
# 5. Review Endpoints (Real DB)
# ═══════════════════════════════════════════════════════════════

class TestReviews:
    """Full lifecycle tests for review endpoints against real DB."""

    @pytest.fixture(autouse=True)
    def setup_user(self):
        """Register a test user and get a token; cleanup after test."""
        self.username = "pytest_review_" + os.urandom(4).hex()
        self.email = f"{self.username}@test.com"

        r = client.post("/api/auth/register", json={
            "username": self.username,
            "email": self.email,
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 201, f"Setup register failed: {r.status_code} {r.text}"
        self.user_id = r.json()["id"]

        r = client.post("/api/auth/login", json={
            "username": self.username,
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 200, f"Setup login failed: {r.status_code} {r.text}"
        self.token = r.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

        # Pick first course from DB
        r = client.get("/api/courses")
        self.course_id = r.json()["courses"][0]["id"]

        yield

        _cleanup_user(self.username)

    def test_get_reviews_empty(self):
        """GET /api/courses/{id}/reviews returns correct structure (may be empty)."""
        r = client.get(f"/api/courses/{self.course_id}/reviews")
        assert r.status_code == 200
        data = r.json()
        assert "reviews" in data
        assert "avg_rating" in data
        assert "total" in data
        assert isinstance(data["reviews"], list)
        assert isinstance(data["total"], int)

    def test_get_reviews_nonexistent_course(self):
        """GET /api/courses/99999/reviews returns 404."""
        r = client.get("/api/courses/99999/reviews")
        assert r.status_code == 404

    def test_create_review(self):
        """POST /api/courses/{id}/reviews creates a review in real DB."""
        r = client.post(
            f"/api/courses/{self.course_id}/reviews",
            json={"rating": 5, "comment": "Great course!"},
            headers=self.headers,
        )
        assert r.status_code == 201, f"Create review failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["rating"] == 5
        assert data["comment"] == "Great course!"
        assert data["user_id"] == self.user_id
        assert data["username"] == self.username
        assert data["course_id"] == self.course_id
        assert "id" in data
        assert "created_at" in data

    def test_create_review_and_verify_in_list(self):
        """Create a review then verify it appears in GET reviews."""
        client.post(
            f"/api/courses/{self.course_id}/reviews",
            json={"rating": 4, "comment": "Solid course"},
            headers=self.headers,
        )
        r = client.get(f"/api/courses/{self.course_id}/reviews")
        assert r.status_code == 200
        data = r.json()
        my_reviews = [rv for rv in data["reviews"] if rv["user_id"] == self.user_id]
        assert len(my_reviews) == 1
        assert my_reviews[0]["rating"] == 4
        assert my_reviews[0]["comment"] == "Solid course"
        # avg_rating should be a number now
        assert data["avg_rating"] is not None

    def test_create_review_duplicate(self):
        """POST /api/courses/{id}/reviews twice returns 409."""
        client.post(
            f"/api/courses/{self.course_id}/reviews",
            json={"rating": 5, "comment": "First review"},
            headers=self.headers,
        )
        r = client.post(
            f"/api/courses/{self.course_id}/reviews",
            json={"rating": 3, "comment": "Duplicate"},
            headers=self.headers,
        )
        assert r.status_code == 409, f"Duplicate review should 409, got {r.status_code} {r.text}"

    def test_create_review_invalid_rating(self):
        """POST with rating=0 or rating=6 returns 422."""
        r = client.post(
            f"/api/courses/{self.course_id}/reviews",
            json={"rating": 0, "comment": "bad"},
            headers=self.headers,
        )
        assert r.status_code == 422

        r = client.post(
            f"/api/courses/{self.course_id}/reviews",
            json={"rating": 6, "comment": "bad"},
            headers=self.headers,
        )
        assert r.status_code == 422

    def test_create_review_nonexistent_course(self):
        """POST /api/courses/99999/reviews returns 404."""
        r = client.post(
            "/api/courses/99999/reviews",
            json={"rating": 5, "comment": "no course"},
            headers=self.headers,
        )
        assert r.status_code == 404

    def test_delete_review(self):
        """DELETE /api/reviews/{id} deletes own review from DB."""
        # Create a review first
        r = client.post(
            f"/api/courses/{self.course_id}/reviews",
            json={"rating": 5, "comment": "To be deleted"},
            headers=self.headers,
        )
        assert r.status_code == 201
        review_id = r.json()["id"]

        # Delete it
        r = client.delete(f"/api/reviews/{review_id}", headers=self.headers)
        assert r.status_code == 200
        assert r.json()["review_id"] == review_id

        # Verify it's gone
        r = client.get(f"/api/courses/{self.course_id}/reviews")
        my_reviews = [rv for rv in r.json()["reviews"] if rv["user_id"] == self.user_id]
        assert len(my_reviews) == 0

    def test_delete_review_not_found(self):
        """DELETE /api/reviews/99999 returns 404."""
        r = client.delete("/api/reviews/99999", headers=self.headers)
        assert r.status_code == 404

    def test_delete_review_not_owner(self):
        """DELETE another user's review returns 403."""
        # Create review with current user
        r = client.post(
            f"/api/courses/{self.course_id}/reviews",
            json={"rating": 5, "comment": "My review"},
            headers=self.headers,
        )
        review_id = r.json()["id"]

        # Register another user
        other_user = "pytest_review_other_" + os.urandom(4).hex()
        other_email = f"{other_user}@test.com"
        client.post("/api/auth/register", json={
            "username": other_user,
            "email": other_email,
            "password": TEST_PASSWORD,
        })
        r = client.post("/api/auth/login", json={
            "username": other_user,
            "password": TEST_PASSWORD,
        })
        other_token = r.json()["access_token"]
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # Try to delete first user's review
        r = client.delete(f"/api/reviews/{review_id}", headers=other_headers)
        assert r.status_code == 403, f"Should be 403, got {r.status_code} {r.text}"

        # Cleanup other user
        _cleanup_user(other_user)

    def test_create_review_no_auth(self):
        """POST /api/courses/{id}/reviews without token returns 401/403."""
        r = client.post(f"/api/courses/{self.course_id}/reviews", json={"rating": 5, "comment": "test"})
        assert r.status_code in (401, 403)

    def test_create_review_no_comment(self):
        """POST /api/courses/{id}/reviews with no comment succeeds."""
        r = client.post(
            f"/api/courses/{self.course_id}/reviews",
            json={"rating": 3},
            headers=self.headers,
        )
        assert r.status_code == 201, f"Create review without comment failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["rating"] == 3
        assert data["comment"] is None


# ═══════════════════════════════════════════════════════════════
# 6. Recommendation Endpoint (Real DB)
# ═══════════════════════════════════════════════════════════════

class TestRecommendations:
    def test_get_recommendations(self):
        """GET /api/courses/{id}/recommend returns recommendations from DB."""
        # Pick a valid course
        r = client.get("/api/courses")
        course_id = r.json()["courses"][0]["id"]

        r = client.get(f"/api/courses/{course_id}/recommend")
        assert r.status_code == 200
        data = r.json()
        assert "course_id" in data
        assert data["course_id"] == course_id
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)
        # Each recommendation should have the right fields
        for rec in data["recommendations"]:
            for field in ["id", "code", "name", "credits", "instructor", "department", "co_enroll_count"]:
                assert field in rec, f"Missing field: {field}"
            assert isinstance(rec["co_enroll_count"], int)
            assert rec["co_enroll_count"] > 0

    def test_get_recommendations_nonexistent_course(self):
        """GET /api/courses/99999/recommend returns 404."""
        r = client.get("/api/courses/99999/recommend")
        assert r.status_code == 404

    def test_recommendations_exclude_self(self):
        """Recommendations should not include the course itself."""
        r = client.get("/api/courses")
        course_id = r.json()["courses"][0]["id"]

        r = client.get(f"/api/courses/{course_id}/recommend")
        assert r.status_code == 200
        rec_ids = [rec["id"] for rec in r.json()["recommendations"]]
        assert course_id not in rec_ids, "Recommendations should not include the course itself"


# ═══════════════════════════════════════════════════════════════
# 7. Cross-cutting concerns
# ═══════════════════════════════════════════════════════════════

class TestCrossCutting:
    def test_nonexistent_endpoint(self):
        """GET /api/nonexistent returns 404."""
        r = client.get("/api/nonexistent")
        assert r.status_code == 404

    def test_mock_token_on_protected_endpoints(self):
        """MOCK_TOKEN should work on all protected endpoints."""
        headers = {"Authorization": f"Bearer {MOCK_TOKEN}"}

        # /api/auth/me
        r = client.get("/api/auth/me", headers=headers)
        assert r.status_code == 200

        # /api/schedule
        r = client.get("/api/schedule", headers=headers)
        assert r.status_code == 200

    def test_seed_user_login_and_auth_round_trip(self):
        """testuser1 (seed) should login and use protected endpoints."""
        r = client.post("/api/auth/login", json={
            "username": "testuser1",
            "password": "password123",
        })
        assert r.status_code == 200
        token = r.json()["access_token"]

        r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        # For MOCK_TOKEN the user returned is MOCK_USER (testuser1)
        # For real JWT the user should also resolve correctly
        assert r.json()["username"] == "testuser1"
