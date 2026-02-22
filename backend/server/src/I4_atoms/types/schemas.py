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
    avg_workload: float | None
    avg_difficulty: float | None
    avg_practicality: float | None
    avg_grading: float | None
    avg_teaching_quality: float | None
    avg_interest: float | None
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
                "avg_workload": 4.2,
                "avg_difficulty": 4.5,
                "avg_practicality": 4.8,
                "avg_grading": 3.5,
                "avg_teaching_quality": 4.0,
                "avg_interest": 4.6,
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


class DiceStatePlan(BaseModel):
    position: list[float]
    target: list[float]
    direction: list[float]
    speed: float
    velocity: list[float]
    angular_velocity: list[float]
    rotation_euler: list[float]


class DiceLaunchPlan(BaseModel):
    face_layout: list[str]
    dice_states: list[DiceStatePlan]


class DiceRollHistoryEntry(BaseModel):

    roll_id: int
    attempt_number: int
    status: str
    score_before: int
    score_after: int
    grade_before: str
    grade_after: str
    dice_values: list[str]
    average: int
    total: int
    launch_plan: DiceLaunchPlan | None = None
    created_at: datetime
    finalized_at: datetime | None = None


class DiceSummary(BaseModel):
    max_attempts: int
    attempts_used: int
    attempts_left: int
    original_score: int | None
    current_score: int | None
    last_roll_at: datetime | None = None


class ScheduleEntry(BaseModel):
    """A single enrollment record with course details."""
    enrollment_id: int
    course: EnrollmentCourseResponse
    enrolled_at: datetime
    finished_status: bool
    score: int | None
    dice_summary: DiceSummary
    dice_history: list[DiceRollHistoryEntry]

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
                "dice_summary": {
                    "max_attempts": 3,
                    "attempts_used": 1,
                    "attempts_left": 2,
                    "original_score": 79,
                    "current_score": 60,
                    "last_roll_at": "2026-02-22T10:05:00",
                },
                "dice_history": [
                    {
                        "roll_id": 12,
                        "attempt_number": 1,
                        "status": "FINALIZED",
                        "score_before": 79,
                        "score_after": 60,
                        "grade_before": "4",
                        "grade_after": "3",
                        "dice_values": ["5", "U", "3"],
                        "average": 3,
                        "total": 10,
                        "created_at": "2026-02-22T10:05:00",
                        "finalized_at": "2026-02-22T10:05:09",
                    }
                ],
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


class DiceFinalizeRequest(BaseModel):
    roll_id: int
    client_dice_values: list[str] | None = None
    client_total: int | None = None
    client_average: int | None = None
    client_grade: str | None = None


# ─────────────────────── Reviews ───────────────────────

class ReviewCreate(BaseModel):
    workload: int = Field(..., ge=1, le=5)
    difficulty: int = Field(..., ge=1, le=5)
    practicality: int = Field(..., ge=1, le=5)
    grading: int = Field(..., ge=1, le=5)
    teaching_quality: int = Field(..., ge=1, le=5)
    interest: int = Field(..., ge=1, le=5)
    comment: str | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "workload": 4,
                "difficulty": 5,
                "practicality": 5,
                "grading": 3,
                "teaching_quality": 4,
                "interest": 5,
                "comment": "Great course! Highly recommended.",
            }
        }
    }


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    username: str
    course_id: int
    workload: int
    difficulty: int
    practicality: int
    grading: int
    teaching_quality: int
    interest: int
    comment: str | None
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "user_id": 1,
                "username": "testuser1",
                "course_id": 1,
                "workload": 4,
                "difficulty": 5,
                "practicality": 5,
                "grading": 3,
                "teaching_quality": 4,
                "interest": 5,
                "comment": "Great course! Highly recommended.",
                "created_at": "2026-02-20T14:00:00",
            }
        },
    }


class ReviewListResponse(BaseModel):
    reviews: list[ReviewResponse]
    avg_workload: float | None
    avg_difficulty: float | None
    avg_practicality: float | None
    avg_grading: float | None
    avg_teaching_quality: float | None
    avg_interest: float | None
    total: int


# ─────────────────────── Recommendations ───────────────────────

class RecommendedCourse(BaseModel):
    id: int
    code: str
    name: str
    credits: int
    instructor: str
    department: str
    co_enroll_count: int

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 30,
                "code": "TDDE01",
                "name": "Machine Learning",
                "credits": 6,
                "instructor": "Oleg Sysoev",
                "department": "Institutionen för datavetenskap",
                "co_enroll_count": 15,
            }
        },
    }


class RecommendationResponse(BaseModel):
    course_id: int
    recommendations: list[RecommendedCourse]
