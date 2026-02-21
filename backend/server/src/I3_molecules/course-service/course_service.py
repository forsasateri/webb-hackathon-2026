"""
I3 Molecule: Course Service
Real database queries replacing Mock endpoints for GET /api/courses and GET /api/courses/{id}.
"""

import sys, os

# 确保 backend/ 在 sys.path，使 `from server.src...` 可正常 import
_BACKEND_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from server.src.I4_atoms.db.models import Course, Enrollment, Review, TimeSlot
from server.src.I4_atoms.types.schemas import CourseListResponse, CourseResponse, TimeSlotResponse


def _build_course_response(course: Course, db: Session) -> CourseResponse:
    """Build a CourseResponse dict with computed enrolled_count and avg_rating."""
    enrolled_count = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.course_id == course.id)
        .scalar()
        or 0
    )
    avg_rating = (
        db.query(func.avg(Review.rating))
        .filter(Review.course_id == course.id)
        .scalar()
    )
    avg_rating = round(float(avg_rating), 2) if avg_rating is not None else None

    time_slots = [
        TimeSlotResponse(id=ts.id, period=ts.period, slot=ts.slot)
        for ts in course.time_slots
    ]

    return CourseResponse(
        id=course.id,
        code=course.code,
        name=course.name,
        description=course.description,
        credits=course.credits,
        instructor=course.instructor,
        department=course.department,
        capacity=course.capacity,
        enrolled_count=enrolled_count,
        avg_rating=avg_rating,
        time_slots=time_slots,
    )


def list_courses(
    db: Session,
    keyword: str | None = None,
    department: str | None = None,
    credits: int | None = None,
) -> CourseListResponse:
    """Return filtered course list with computed counts and ratings."""
    query = db.query(Course)

    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            Course.name.ilike(like) | Course.description.ilike(like) | Course.code.ilike(like)
        )
    if department:
        query = query.filter(Course.department == department)
    if credits is not None:
        query = query.filter(Course.credits == credits)

    courses = query.order_by(Course.code).all()
    course_responses = [_build_course_response(c, db) for c in courses]

    return CourseListResponse(courses=course_responses, total=len(course_responses))


def get_course(db: Session, course_id: int) -> CourseResponse:
    """Return course detail. Raises LookupError if not found."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise LookupError(f"Course {course_id} not found")
    return _build_course_response(course, db)


if __name__ == "__main__":
    from server.src.I4_atoms.db.connection import SessionLocal
    db = SessionLocal()
    result = list_courses(db, keyword="machine")
    print(f"✅ list_courses(keyword='machine'): {result.total} results")
    if result.courses:
        detail = get_course(db, result.courses[0].id)
        print(f"✅ get_course({detail.id}): {detail.name}, enrolled={detail.enrolled_count}, rating={detail.avg_rating}")
    db.close()
