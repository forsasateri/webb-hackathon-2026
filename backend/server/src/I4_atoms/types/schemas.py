"""
I4 Atom: Pydantic Schemas
Request/Response models for API contract. Used by FastAPI for validation + Swagger docs.
"""

from datetime import datetime
from pydantic import BaseModel, Field


# ─────────────────────── TimeSlot ───────────────────────

class TimeSlotResponse(BaseModel):
    id: int
    period: int
    slot: int

    model_config = {"from_attributes": True}


# ─────────────────────── Course ───────────────────────

class CourseResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    credits: int
    instructor: str
    department: str
    capacity: int
    enrolled_count: int
    avg_rating: float | None
    time_slots: list[TimeSlotResponse]

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "code": "TDDE01",
                "name": "Machine Learning",
                "description": "Introduction to machine learning.",
                "credits": 6,
                "instructor": "Oleg Sysoev",
                "department": "Institutionen för datavetenskap",
                "capacity": 119,
                "enrolled_count": 50,
                "avg_rating": 4.4,
                "time_slots": [{"id": 1, "period": 2, "slot": 1}],
            }
        },
    }


class CourseListResponse(BaseModel):
    courses: list[CourseResponse]
    total: int


# ─────────────────────── Auth ───────────────────────

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)

    model_config = {
        "json_schema_extra": {
            "example": {
                "username": "newstudent",
                "email": "newstudent@liu.se",
                "password": "password123",
            }
        }
    }


class UserLogin(BaseModel):
    username: str
    password: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "username": "testuser1",
                "password": "password123",
            }
        }
    }


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "username": "testuser1",
                "email": "testuser1@example.com",
                "role": "student",
                "created_at": "2026-02-20T10:00:00",
            }
        },
    }


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIs...",
                "token_type": "bearer",
                "user": {
                    "id": 1,
                    "username": "testuser1",
                    "email": "testuser1@example.com",
                    "role": "student",
                    "created_at": "2026-02-20T10:00:00",
                },
            }
        }
    }


# ─────────────────────── Schedule / Enrollment ───────────────────────

class EnrollmentCourseResponse(BaseModel):
    """Course info nested inside a schedule entry."""
    id: int
    code: str
    name: str
    credits: int
    instructor: str
    department: str
    time_slots: list[TimeSlotResponse]

    model_config = {"from_attributes": True}


class ScheduleEntry(BaseModel):
    """A single enrollment record with course details."""
    enrollment_id: int
    course: EnrollmentCourseResponse
    enrolled_at: datetime
    finished_status: bool
    score: int | None

    model_config = {
        "json_schema_extra": {
            "example": {
                "enrollment_id": 1,
                "course": {
                    "id": 1,
                    "code": "TAMS11",
                    "name": "Probability and Statistics, First Course",
                    "credits": 6,
                    "instructor": "Xiangfeng Yang",
                    "department": "Matematiska institutionen",
                    "time_slots": [{"id": 1, "period": 2, "slot": 4}],
                },
                "enrolled_at": "2026-02-20T12:00:00",
                "finished_status": False,
                "score": None,
            }
        }
    }


class ScheduleResponse(BaseModel):
    schedule: list[ScheduleEntry]
    total_credits: int


class EnrollmentSuccess(BaseModel):
    message: str
    enrollment: dict

    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Enrollment successful",
                "enrollment": {
                    "enrollment_id": 99,
                    "course_id": 1,
                    "course_name": "Probability and Statistics, First Course",
                    "enrolled_at": "2026-02-21T10:00:00",
                },
            }
        }
    }


class ConflictDetail(BaseModel):
    period: int
    slot: int
    conflicting_course_id: int
    conflicting_course_name: str


class EnrollmentConflict(BaseModel):
    message: str
    conflicts: list[ConflictDetail]

    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Time slot conflict",
                "conflicts": [
                    {
                        "period": 2,
                        "slot": 1,
                        "conflicting_course_id": 22,
                        "conflicting_course_name": "Advanced Programming in C++",
                    }
                ],
            }
        }
    }
