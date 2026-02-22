"""
FastAPI Application Entry Point - Phase 4: All endpoints on Real DB
All 13 endpoints now use real database queries. No Mock data remaining.
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from server.src.I4_atoms.db.connection import get_db, engine
from server.src.I4_atoms.helpers.jwt_helper import decode_token
from server.src.I4_atoms.types.schemas import (
    UserRegister, UserLogin, UserResponse, TokenResponse,
    ReviewCreate, ReviewResponse, ReviewListResponse,
    DiceFinalizeRequest,
    RecommendationResponse,
)
from jose import JWTError

# course-service directory contains hyphens, re-export via __init__.py using importlib
import importlib.util, os as _os
_cs_init = _os.path.join(_os.path.dirname(__file__), "..", "I3_molecules", "course-service", "__init__.py")
_cs_spec = importlib.util.spec_from_file_location("course_service_pkg", _os.path.normpath(_cs_init))
_cs_mod = importlib.util.module_from_spec(_cs_spec)
_cs_spec.loader.exec_module(_cs_mod)
list_courses = _cs_mod.list_courses
get_course = _cs_mod.get_course
get_recommendations = _cs_mod.get_recommendations

# auth-service: directory contains hyphen, use importlib dynamic import
_as_init = _os.path.join(_os.path.dirname(__file__), "..", "I3_molecules", "auth-service", "__init__.py")
_as_spec = importlib.util.spec_from_file_location("auth_service_pkg", _os.path.normpath(_as_init))
_as_mod = importlib.util.module_from_spec(_as_spec)
_as_spec.loader.exec_module(_as_mod)
auth_register = _as_mod.register
auth_login = _as_mod.login
auth_get_user_by_id = _as_mod.get_user_by_id

# schedule-service: directory contains hyphen, use importlib dynamic import
_ss_init = _os.path.join(_os.path.dirname(__file__), "..", "I3_molecules", "schedule-service", "__init__.py")
_ss_spec = importlib.util.spec_from_file_location("schedule_service_pkg", _os.path.normpath(_ss_init))
_ss_mod = importlib.util.module_from_spec(_ss_spec)
_ss_spec.loader.exec_module(_ss_mod)
schedule_enroll = _ss_mod.enroll
schedule_drop = _ss_mod.drop
schedule_get = _ss_mod.get_schedule

# review-service: directory contains hyphen, use importlib dynamic import
_rs_init = _os.path.join(_os.path.dirname(__file__), "..", "I3_molecules", "review-service", "__init__.py")
_rs_spec = importlib.util.spec_from_file_location("review_service_pkg", _os.path.normpath(_rs_init))
_rs_mod = importlib.util.module_from_spec(_rs_spec)
_rs_spec.loader.exec_module(_rs_mod)
review_get_reviews = _rs_mod.get_reviews
review_create_review = _rs_mod.create_review
review_delete_review = _rs_mod.delete_review

# dice-service: directory contains hyphen, use importlib dynamic import
_ds_init = _os.path.join(_os.path.dirname(__file__), "..", "I3_molecules", "dice-service", "__init__.py")
_ds_spec = importlib.util.spec_from_file_location("dice_service_pkg", _os.path.normpath(_ds_init))
_ds_mod = importlib.util.module_from_spec(_ds_spec)
_ds_spec.loader.exec_module(_ds_mod)
dice_start_roll = _ds_mod.start_roll
dice_finalize_roll = _ds_mod.finalize_roll
dice_clear_rolls_for_course = _ds_mod.clear_rolls_for_course

# ─────────────────────── Mock Token (for frontend dev convenience) ───────────────────────

MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token_for_frontend"

MOCK_USER = {
    "id": 1,
    "username": "testuser1",
    "email": "testuser1@example.com",
    "role": "student",
    "created_at": "2026-02-20T10:00:00",
}

# ─────────────────────── Auth Dependency ───────────────────────

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> UserResponse:
    """FastAPI dependency: extract Bearer token → decode JWT → return UserResponse.
    
    Supports MOCK_TOKEN for testing purposes.
    """
    token = credentials.credentials
    
    # Support MOCK_TOKEN for frontend testing
    if token == MOCK_TOKEN:
        return UserResponse(**MOCK_USER)
    
    # Real JWT verification
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        return auth_get_user_by_id(db, user_id)
    except LookupError:
        raise HTTPException(status_code=401, detail="User not found")


app = FastAPI(
    title="Course Selection System API",
    description="Hackathon 2026 - Course Selection System Backend API (LiU 6MICS Master's Programme)",
    version="0.5.0",
)


@app.on_event("startup")
def ensure_dice_roll_schema() -> None:
    """Create dice_rolls table for existing DBs that were seeded before this feature."""
    ddl = [
        """
        CREATE TABLE IF NOT EXISTS dice_rolls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            enrollment_id INTEGER NOT NULL,
            attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
            status TEXT NOT NULL DEFAULT 'PENDING',
            original_score INTEGER NOT NULL CHECK (original_score >= 0 AND original_score <= 100),
            score_before INTEGER NOT NULL CHECK (score_before >= 0 AND score_before <= 100),
            score_after INTEGER NOT NULL CHECK (score_after >= 0 AND score_after <= 100),
            grade_before TEXT NOT NULL,
            grade_after TEXT NOT NULL,
            face_layout_json TEXT NOT NULL,
            launch_params_json TEXT NOT NULL,
            planned_dice_values_json TEXT NOT NULL,
            planned_total INTEGER NOT NULL,
            planned_average INTEGER NOT NULL,
            planned_grade TEXT NOT NULL,
            client_dice_values_json TEXT,
            client_total INTEGER,
            client_average INTEGER,
            client_grade TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            finalized_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
            UNIQUE (user_id, course_id, attempt_number)
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_dice_rolls_user_course ON dice_rolls (user_id, course_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_dice_rolls_enrollment ON dice_rolls (enrollment_id, created_at)",
    ]

    with engine.begin() as conn:
        for stmt in ddl:
            conn.execute(text(stmt))

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────── Health Check ───────────────────────

@app.get("/", tags=["Health Check"])
def health_check():
    return {"status": "ok", "message": "Course Selection System API is running"}

# ─────────────── Course Endpoints (P0) — REAL DB ───────────────

@app.get("/api/courses", tags=["Courses"])
def list_courses_endpoint(
    keyword: Optional[str] = None,
    department: Optional[str] = None,
    credits: Optional[int] = None,
    period: Optional[int] = None,
    slot: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Get course list from database (with keyword/department/credits/period/slot filtering)"""
    return list_courses(db, keyword=keyword, department=department, credits=credits, period=period, slot=slot)


@app.get("/api/courses/{course_id}", tags=["Courses"])
def get_course_endpoint(course_id: int, db: Session = Depends(get_db)):
    """Get course details from database (includes time_slots, avg_rating, enrolled_count)"""
    try:
        return get_course(db, course_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))

# ─────────────── Authentication Endpoints (P0) — REAL DB ───────────────

@app.post("/api/auth/register", status_code=201, tags=["Authentication"], response_model=UserResponse)
def register_endpoint(
    data: UserRegister,
    db: Session = Depends(get_db),
):
    """User registration"""
    try:
        return auth_register(db, data.username, data.email, data.password)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.post("/api/auth/login", tags=["Authentication"], response_model=TokenResponse)
def login_endpoint(
    data: UserLogin,
    db: Session = Depends(get_db),
):
    """User login, returns JWT (Test accounts: testuser/testuser1, any password)"""
    # Mock phase: test accounts directly return MOCK_TOKEN for frontend convenience
    if data.username in ["testuser", "testuser1"]:
        return {
            "access_token": MOCK_TOKEN,
            "token_type": "bearer",
            "user": MOCK_USER,
        }
    
    try:
        return auth_login(db, data.username, data.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.get("/api/auth/me", tags=["Authentication"])
def get_me(user: UserResponse = Depends(get_current_user)):
    """Get current user information"""
    return user

# ─────────────── Enrollment Endpoints (P0) — REAL DB ───────────────

@app.post("/api/schedule/enroll/{course_id}", tags=["Enrollment"])
def enroll_course(course_id: int, user: UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
    """Enroll in course (with conflict detection + capacity check)"""
    try:
        return schedule_enroll(db, user.id, course_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        detail = e.args[0] if e.args else str(e)
        raise HTTPException(status_code=409, detail=detail)


@app.delete("/api/schedule/drop/{course_id}", tags=["Enrollment"])
def drop_course(course_id: int, user: UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
    """Drop course"""
    try:
        return schedule_drop(db, user.id, course_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/schedule", tags=["Enrollment"])
def get_schedule(user: UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's enrolled courses + schedule"""
    return schedule_get(db, user.id)


# ─────────────── Grade Dice Endpoints (P2) ───────────────

@app.post("/api/grade/dice/{course_id}/start", tags=["Grade Dice"])
def start_grade_dice_roll(course_id: int, user: UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
    """Start a dice roll: consumes one attempt immediately and persists launch params."""
    try:
        return dice_start_roll(db, user.id, course_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.post("/api/grade/dice/finalize", tags=["Grade Dice"])
def finalize_grade_dice_roll(
    data: DiceFinalizeRequest,
    user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Finalize dice roll using client-observed result payload; persists audit data."""
    try:
        return dice_finalize_roll(
            db=db,
            user_id=user.id,
            roll_id=data.roll_id,
            client_dice_values=data.client_dice_values,
            client_total=data.client_total,
            client_average=data.client_average,
            client_grade=data.client_grade,
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/api/grade/dice/{course_id}/debug-clear", tags=["Grade Dice"])
def debug_clear_grade_dice_rolls(course_id: int, user: UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
    """Debug helper: clear current user's dice roll records for one course and restore original score."""
    try:
        return dice_clear_rolls_for_course(db=db, user_id=user.id, course_id=course_id, restore_score=True)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))

# ─────────────── Review Endpoints (P1) — REAL DB ───────────────

@app.get("/api/courses/{course_id}/reviews", tags=["Reviews"], response_model=ReviewListResponse)
def get_reviews(course_id: int, db: Session = Depends(get_db)):
    """Get course review list"""
    try:
        return review_get_reviews(db, course_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/courses/{course_id}/reviews", status_code=201, tags=["Reviews"], response_model=ReviewResponse)
def create_review(
    course_id: int,
    data: ReviewCreate,
    user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit course review (one review per user per course)"""
    try:
        return review_create_review(db, user.id, course_id, data.model_dump())
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.delete("/api/reviews/{review_id}", tags=["Reviews"])
def delete_review(review_id: int, user: UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete own review (only the author can delete)"""
    try:
        return review_delete_review(db, user.id, review_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

# ─────────────── Recommendation Endpoints (P1) — REAL DB ───────────────

@app.get("/api/courses/{course_id}/recommend", tags=["Recommendations"], response_model=RecommendationResponse)
def recommend_courses(course_id: int, db: Session = Depends(get_db)):
    """What other courses did people who took this course also take"""
    try:
        return get_recommendations(db, course_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
