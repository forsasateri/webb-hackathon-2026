"""
FastAPI Application Entry Point - Phase 3: Real Auth + Course + Schedule
Course, Auth, and Schedule endpoints use real DB. Review/Recommend endpoints remain Mock.
"""

from fastapi import FastAPI, Header, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from sqlalchemy.orm import Session

from server.src.I4_atoms.db.connection import get_db
from server.src.I4_atoms.helpers.jwt_helper import decode_token
from server.src.I4_atoms.types.schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from jose import JWTError

# course-service directory contains hyphens, re-export via __init__.py using importlib
import importlib.util, os as _os
_cs_init = _os.path.join(_os.path.dirname(__file__), "..", "I3_molecules", "course-service", "__init__.py")
_cs_spec = importlib.util.spec_from_file_location("course_service_pkg", _os.path.normpath(_cs_init))
_cs_mod = importlib.util.module_from_spec(_cs_spec)
_cs_spec.loader.exec_module(_cs_mod)
list_courses = _cs_mod.list_courses
get_course = _cs_mod.get_course

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

# ─────────────────────── Mock Data (Define before using) ───────────────────────

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
    version="0.4.0",
)

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

# ─────────────────────── Mock Data (Based on Real LiU Courses) ───────────────────────

MOCK_COURSES = [
    {
        "id": 1,
        "code": "TAMS11",
        "name": "Probability and Statistics, First Course",
        "description": "Introduction to probability and statistics with theoretical models and statistical inference.",
        "credits": 6,
        "instructor": "Xiangfeng Yang",
        "department": "Matematiska institutionen",
        "capacity": 111,
        "enrolled_count": 45,
        "avg_rating": 4.2,
        "time_slots": [
            {"id": 1, "period": 2, "slot": 4},
            {"id": 2, "period": 3, "slot": 4},
        ],
    },
    {
        "id": 54,
        "code": "TDDE80",
        "name": "Professionalism in Computer Science",
        "description": "Academic writing, sustainable development and ethics in computer science.",
        "credits": 6,
        "instructor": "Birgitta Thorslund",
        "department": "Institutionen för datavetenskap",
        "capacity": 42,
        "enrolled_count": 60,
        "avg_rating": 3.8,
        "time_slots": [
            {"id": 78, "period": 1, "slot": 4},
            {"id": 79, "period": 2, "slot": 3},
        ],
    },
    {
        "id": 22,
        "code": "TDDD38",
        "name": "Advanced Programming in C++",
        "description": "Advanced constructions and mechanisms in C++.",
        "credits": 6,
        "instructor": "Klas Arvidsson",
        "department": "Institutionen för datavetenskap",
        "capacity": 59,
        "enrolled_count": 48,
        "avg_rating": 4.5,
        "time_slots": [
            {"id": 30, "period": 1, "slot": 2},
            {"id": 31, "period": 2, "slot": 1},
            {"id": 32, "period": 3, "slot": 2},
            {"id": 33, "period": 4, "slot": 1},
            {"id": 34, "period": 5, "slot": 2},
            {"id": 35, "period": 6, "slot": 1},
        ],
    },
    {
        "id": 9,
        "code": "TDDC17",
        "name": "Artificial Intelligence",
        "description": "Concepts and applications of AI: problem solving, knowledge, reasoning, learning.",
        "credits": 6,
        "instructor": "Fredrik Heintz",
        "department": "Institutionen för datavetenskap",
        "capacity": 124,
        "enrolled_count": 55,
        "avg_rating": 4.3,
        "time_slots": [
            {"id": 14, "period": 1, "slot": 3},
        ],
    },
    {
        "id": 30,
        "code": "TDDE01",
        "name": "Machine Learning",
        "description": "Introduction to machine learning with focus on regression and classification.",
        "credits": 6,
        "instructor": "Oleg Sysoev",
        "department": "Institutionen för datavetenskap",
        "capacity": 119,
        "enrolled_count": 50,
        "avg_rating": 4.4,
        "time_slots": [
            {"id": 45, "period": 2, "slot": 1},
            {"id": 46, "period": 6, "slot": 1},
        ],
    },
    {
        "id": 55,
        "code": "TDTS06",
        "name": "Computer Networks",
        "description": "Network architecture, protocols, and implementation across layers.",
        "credits": 6,
        "instructor": "Andrei Gurtov",
        "department": "Institutionen för datavetenskap",
        "capacity": 75,
        "enrolled_count": 35,
        "avg_rating": 4.0,
        "time_slots": [
            {"id": 80, "period": 1, "slot": 1},
            {"id": 81, "period": 5, "slot": 1},
        ],
    },
    {
        "id": 21,
        "code": "TDDD37",
        "name": "Database Technology",
        "description": "Design, usage, and implementation of database systems.",
        "credits": 6,
        "instructor": "Olaf Hartig",
        "department": "Institutionen för datavetenskap",
        "capacity": 57,
        "enrolled_count": 40,
        "avg_rating": 4.1,
        "time_slots": [
            {"id": 29, "period": 2, "slot": 1},
        ],
    },
]

MOCK_SCHEDULE = [
    {
        "enrollment_id": 1,
        "course": MOCK_COURSES[0],  # TAMS11
        "enrolled_at": "2026-02-20T12:00:00",
        "finished_status": False,
        "score": None,
    },
    {
        "enrollment_id": 2,
        "course": MOCK_COURSES[2],  # TDDD38
        "enrolled_at": "2026-02-20T12:05:00",
        "finished_status": False,
        "score": None,
    },
]

MOCK_REVIEWS = [
    {
        "id": 1,
        "user_id": 1,
        "username": "testuser1",
        "course_id": 1,
        "rating": 5,
        "comment": "Great course! Highly recommended.",
        "created_at": "2026-02-20T14:00:00",
    },
    {
        "id": 2,
        "user_id": 2,
        "username": "testuser2",
        "course_id": 1,
        "rating": 4,
        "comment": "Solid course with good structure.",
        "created_at": "2026-02-20T15:00:00",
    },
]

MOCK_RECOMMENDATIONS = [
    {
        "id": 30,
        "code": "TDDE01",
        "name": "Machine Learning",
        "credits": 6,
        "instructor": "Oleg Sysoev",
        "department": "Institutionen för datavetenskap",
        "co_enroll_count": 15,
    },
    {
        "id": 22,
        "code": "TDDD38",
        "name": "Advanced Programming in C++",
        "credits": 6,
        "instructor": "Klas Arvidsson",
        "department": "Institutionen för datavetenskap",
        "co_enroll_count": 12,
    },
    {
        "id": 55,
        "code": "TDTS06",
        "name": "Computer Networks",
        "credits": 6,
        "instructor": "Andrei Gurtov",
        "department": "Institutionen för datavetenskap",
        "co_enroll_count": 8,
    },
]

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
    
    # Any other username also returns success (Mock phase)
    try:
        return auth_login(db, data.username, data.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.get("/api/auth/me", tags=["Authentication"])
def get_me(user: dict = Depends(get_current_user)):
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

# ─────────────── Review Endpoints (P1) ───────────────

@app.get("/api/courses/{course_id}/reviews", tags=["Reviews"])
def get_reviews(course_id: int):
    """Get course review list"""
    return {
        "reviews": [r for r in MOCK_REVIEWS if r["course_id"] == course_id],
        "avg_rating": 4.5,
        "total": 2,
    }


@app.post("/api/courses/{course_id}/reviews", status_code=201, tags=["Reviews"])
def create_review(
    course_id: int,
    rating: int = Body(..., ge=1, le=5),
    comment: str = Body(...),
    user: dict = Depends(get_current_user),
):
    """Submit course review"""
    return {
        "id": 3,
        "user_id": user.id,
        "username": user.username,
        "course_id": course_id,
        "rating": rating,
        "comment": comment,
        "created_at": "2026-02-21T10:00:00",
    }


@app.delete("/api/reviews/{review_id}", tags=["Reviews"])
def delete_review(review_id: int, user: dict = Depends(get_current_user)):
    """Delete own review"""
    return {"message": "Review deleted", "review_id": review_id}

# ─────────────── Recommendation Endpoints (P1) ───────────────

@app.get("/api/courses/{course_id}/recommend", tags=["Recommendations"])
def recommend_courses(course_id: int):
    """What other courses did people who took this course also take"""
    return {"course_id": course_id, "recommendations": MOCK_RECOMMENDATIONS}
