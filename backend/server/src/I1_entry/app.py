"""
FastAPI Application Entry Point - Phase 1: Mock API
All endpoints return hardcoded JSON for immediate frontend integration.
Mock data based on real LiU 6MICS courses.
"""

from fastapi import FastAPI, Header, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

app = FastAPI(
    title="Course Selection System API",
    description="Hackathon 2026 - Course Selection System Backend API (LiU 6MICS Master's Programme)",
    version="0.1.0",
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

MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token_for_frontend"

MOCK_USER = {
    "id": 1,
    "username": "testuser1",
    "email": "testuser1@example.com",
    "role": "student",
    "created_at": "2026-02-20T10:00:00",
}

MOCK_SCHEDULE = [
    {
        "enrollment_id": 1,
        "course": MOCK_COURSES[0],  # TAMS11
        "enrolled_at": "2026-02-20T12:00:00",
        "finished_status": False,
    },
    {
        "enrollment_id": 2,
        "course": MOCK_COURSES[2],  # TDDD38
        "enrolled_at": "2026-02-20T12:05:00",
        "finished_status": False,
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

# ─────────────── Course Endpoints (P0) ───────────────

@app.get("/api/courses", tags=["Courses"])
def list_courses(
    keyword: Optional[str] = None,
    department: Optional[str] = None,
    credits: Optional[int] = None,
):
    """Get course list (with filtering support)"""
    results = MOCK_COURSES
    if keyword:
        results = [c for c in results if keyword.lower() in c["name"].lower() or keyword.lower() in c["description"].lower()]
    if department:
        results = [c for c in results if c["department"] == department]
    if credits is not None:
        results = [c for c in results if c["credits"] == credits]
    return {"courses": results, "total": len(results)}


@app.get("/api/courses/{course_id}", tags=["Courses"])
def get_course(course_id: int):
    """Get course details"""
    for c in MOCK_COURSES:
        if c["id"] == course_id:
            return c
    raise HTTPException(status_code=404, detail="Course not found")

# ─────────────── Authentication Endpoints (P0) ───────────────

@app.post("/api/auth/register", status_code=201, tags=["Authentication"])
def register(
    username: str = Body(...),
    email: str = Body(...),
    password: str = Body(...),
):
    """User registration"""
    return {
        "id": 3,
        "username": username,
        "email": email,
        "role": "student",
        "created_at": "2026-02-21T10:00:00",
    }


@app.post("/api/auth/login", tags=["Authentication"])
def login(
    username: str = Body(...),
    password: str = Body(...),
):
    """User login, returns JWT"""
    return {
        "access_token": MOCK_TOKEN,
        "token_type": "bearer",
        "user": MOCK_USER,
    }


@app.get("/api/auth/me", tags=["Authentication"])
def get_me(authorization: Optional[str] = Header(None)):
    """Get current user information"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token not provided")
    return MOCK_USER

# ─────────────── Enrollment Endpoints (P0) ───────────────

@app.post("/api/schedule/enroll/{course_id}", tags=["Enrollment"])
def enroll_course(course_id: int, authorization: Optional[str] = Header(None)):
    """Enroll in course (with conflict detection + capacity check)"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token not provided")
    # Mock: TDDE01(id=30) and TDDD38(id=22) both at period=2/slot=1 conflict
    # Assuming user already enrolled in TDDD38, enrolling in TDDE01 triggers conflict
    if course_id == 30:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Time slot conflict",
                "conflicts": [
                    {
                        "period": 2,
                        "slot": 1,
                        "conflicting_course_id": 22,
                        "conflicting_course_name": "Advanced Programming in C++",
                    }
                ],
            },
        )
    for c in MOCK_COURSES:
        if c["id"] == course_id:
            return {
                "message": "Enrollment successful",
                "enrollment": {
                    "enrollment_id": 99,
                    "course_id": course_id,
                    "course_name": c["name"],
                    "enrolled_at": "2026-02-21T10:00:00",
                },
            }
    raise HTTPException(status_code=404, detail="Course not found")


@app.delete("/api/schedule/drop/{course_id}", tags=["Enrollment"])
def drop_course(course_id: int, authorization: Optional[str] = Header(None)):
    """Drop course"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token not provided")
    return {"message": "Course dropped successfully", "course_id": course_id}


@app.get("/api/schedule", tags=["Enrollment"])
def get_schedule(authorization: Optional[str] = Header(None)):
    """Get current user's enrolled courses + schedule"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token not provided")
    return {"schedule": MOCK_SCHEDULE, "total_credits": 12}

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
    authorization: Optional[str] = Header(None),
):
    """Submit course review"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token not provided")
    return {
        "id": 3,
        "user_id": 1,
        "username": "testuser1",
        "course_id": course_id,
        "rating": rating,
        "comment": comment,
        "created_at": "2026-02-21T10:00:00",
    }


@app.delete("/api/reviews/{review_id}", tags=["Reviews"])
def delete_review(review_id: int, authorization: Optional[str] = Header(None)):
    """Delete own review"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token not provided")
    return {"message": "Review deleted", "review_id": review_id}

# ─────────────── Recommendation Endpoints (P1) ───────────────

@app.get("/api/courses/{course_id}/recommend", tags=["Recommendations"])
def recommend_courses(course_id: int):
    """What other courses did people who took this course also take"""
    return {"course_id": course_id, "recommendations": MOCK_RECOMMENDATIONS}
