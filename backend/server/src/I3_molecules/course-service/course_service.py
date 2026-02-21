"""
I3 Molecule: Course Service
Real database queries replacing Mock endpoints for GET /api/courses and GET /api/courses/{id}.
"""

import sys, os

# Ensure backend/ is in sys.path so `from server.src...` imports work
_BACKEND_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from server.src.I4_atoms.db.models import Course, Enrollment, Review, TimeSlot
from server.src.I4_atoms.types.schemas import CourseListResponse, CourseResponse, TimeSlotResponse, RecommendedCourse, RecommendationResponse


def _build_course_response(course: Course, db: Session) -> CourseResponse:
    """Build a CourseResponse dict with computed enrolled_count and avg_rating."""
    enrolled_count = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.course_id == course.id)
        .scalar()
        or 0
    )
    
    avgs = db.query(
        func.avg(Review.workload),
        func.avg(Review.difficulty),
        func.avg(Review.practicality),
        func.avg(Review.grading),
        func.avg(Review.teaching_quality),
        func.avg(Review.interest)
    ).filter(Review.course_id == course.id).first()

    def round_avg(val):
        return round(float(val), 2) if val is not None else None

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
        avg_workload=round_avg(avgs[0]) if avgs else None,
        avg_difficulty=round_avg(avgs[1]) if avgs else None,
        avg_practicality=round_avg(avgs[2]) if avgs else None,
        avg_grading=round_avg(avgs[3]) if avgs else None,
        avg_teaching_quality=round_avg(avgs[4]) if avgs else None,
        avg_interest=round_avg(avgs[5]) if avgs else None,
        time_slots=time_slots,
    )


def list_courses(
    db: Session,
    keyword: str | None = None,
    department: str | None = None,
    credits: int | None = None,
    period: int | None = None,
    slot: int | None = None,
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
    if period is not None:
        query = query.filter(Course.time_slots.any(TimeSlot.period == period))
    if slot is not None:
        query = query.filter(Course.time_slots.any(TimeSlot.slot == slot))

    courses = query.order_by(Course.code).all()
    course_responses = [_build_course_response(c, db) for c in courses]

    return CourseListResponse(courses=course_responses, total=len(course_responses))


def get_course(db: Session, course_id: int) -> CourseResponse:
    """Return course detail. Raises LookupError if not found."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise LookupError(f"Course {course_id} not found")
    return _build_course_response(course, db)


def get_recommendations(db: Session, course_id: int, limit: int = 5) -> RecommendationResponse:
    """'People who enrolled in this course also enrolled in...'
    Raises LookupError if course not found.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise LookupError(f"Course {course_id} not found")

    # Find courses co-enrolled by users who enrolled in target course
    # SQL: SELECT c.*, COUNT(*) as co_count FROM courses c
    #      JOIN enrollments e1 ON c.id = e1.course_id
    #      JOIN enrollments e2 ON e1.user_id = e2.user_id
    #      WHERE e2.course_id = :target AND c.id != :target
    #      GROUP BY c.id ORDER BY co_count DESC LIMIT 5
    from sqlalchemy import func as sa_func

    results = (
        db.query(Course, sa_func.count(Enrollment.id).label("co_count"))
        .join(Enrollment, Course.id == Enrollment.course_id)
        .filter(
            Enrollment.user_id.in_(
                db.query(Enrollment.user_id).filter(Enrollment.course_id == course_id)
            ),
            Course.id != course_id,
        )
        .group_by(Course.id)
        .order_by(sa_func.count(Enrollment.id).desc())
        .limit(limit)
        .all()
    )

    recommendations = [
        RecommendedCourse(
            id=c.id,
            code=c.code,
            name=c.name,
            credits=c.credits,
            instructor=c.instructor,
            department=c.department,
            co_enroll_count=co_count,
        )
        for c, co_count in results
    ]

    return RecommendationResponse(
        course_id=course_id,
        recommendations=recommendations,
    )


if __name__ == "__main__":
    from server.src.I4_atoms.db.connection import SessionLocal
    db = SessionLocal()
    result = list_courses(db, keyword="machine")
    print(f"✅ list_courses(keyword='machine'): {result.total} results")
    if result.courses:
        detail = get_course(db, result.courses[0].id)
        print(f"✅ get_course({detail.id}): {detail.name}, enrolled={detail.enrolled_count}, rating={detail.avg_rating}")
    # Test recommendations
    rec = get_recommendations(db, 1)
    print(f"✅ get_recommendations(course_id=1): {len(rec.recommendations)} recommendations")
    for r in rec.recommendations:
        print(f"   - {r.code}: {r.name} (co_enroll_count={r.co_enroll_count})")
    db.close()
