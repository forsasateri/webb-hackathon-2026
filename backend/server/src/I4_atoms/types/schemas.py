"""
I4 Atom: Pydantic Schemas
Request/Response models for API contract. Used by FastAPI for validation + Swagger docs.
"""

from pydantic import BaseModel


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
