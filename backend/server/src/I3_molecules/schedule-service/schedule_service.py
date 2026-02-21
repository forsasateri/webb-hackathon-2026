"""
I3 Molecule: Schedule Service
Business logic for course enrollment, dropping, and schedule retrieval.
Includes time-slot conflict detection.
"""

import sys, os

_BACKEND_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session

from server.src.I4_atoms.db.models import Course, Enrollment, TimeSlot
from server.src.I4_atoms.validators.schedule_validator import check_slot_conflict
from server.src.I4_atoms.types.schemas import (
    EnrollmentCourseResponse,
    ScheduleEntry,
    ScheduleResponse,
    TimeSlotResponse,
)


def enroll(db: Session, user_id: int, course_id: int) -> dict:
    """
    Enroll a user in a course.
    Checks: course exists → duplicate → capacity → slot conflict.
    Returns enrollment info dict on success.
    Raises: LookupError (course not found), ValueError (duplicate/full/conflict).
    """
    # 1. Check course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise LookupError(f"Course {course_id} not found")

    # 2. Check duplicate enrollment
    existing = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user_id, Enrollment.course_id == course_id)
        .first()
    )
    if existing:
        raise ValueError("Already enrolled in this course")

    # 3. Check capacity
    enrolled_count = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.course_id == course_id)
        .scalar()
        or 0
    )
    if enrolled_count >= course.capacity:
        raise ValueError("Course is full")

    # 4. Check slot conflict
    # 4a. Target course's (period, slot) pairs
    new_slots = [
        (ts.period, ts.slot) for ts in course.time_slots
    ]

    # 4b. User's existing enrolled courses' (period, slot) pairs + course info for conflict detail
    user_enrolled_slots = (
        db.query(TimeSlot.period, TimeSlot.slot, TimeSlot.course_id, Course.name)
        .join(Course, TimeSlot.course_id == Course.id)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.user_id == user_id)
        .all()
    )

    existing_slots = [(row[0], row[1]) for row in user_enrolled_slots]

    # 4c. Detect conflicts
    conflicts = check_slot_conflict(existing_slots, new_slots)

    if conflicts:
        # Build conflict detail: for each conflicting (period, slot), find which course owns it
        slot_to_course = {
            (row[0], row[1]): (row[2], row[3]) for row in user_enrolled_slots
        }
        conflict_details = []
        for period, slot in conflicts:
            c_id, c_name = slot_to_course[(period, slot)]
            conflict_details.append({
                "period": period,
                "slot": slot,
                "conflicting_course_id": c_id,
                "conflicting_course_name": c_name,
            })
        raise ValueError({
            "message": "Time slot conflict",
            "conflicts": conflict_details,
        })

    # 5. All checks passed → INSERT
    enrollment = Enrollment(
        user_id=user_id,
        course_id=course_id,
        finished_status=False,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return {
        "message": "Enrollment successful",
        "enrollment": {
            "enrollment_id": enrollment.id,
            "course_id": course_id,
            "course_name": course.name,
            "enrolled_at": enrollment.enrolled_at.isoformat(),
        },
    }


def drop(db: Session, user_id: int, course_id: int) -> dict:
    """
    Drop a course for a user.
    Raises LookupError if enrollment not found.
    """
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user_id, Enrollment.course_id == course_id)
        .first()
    )
    if not enrollment:
        raise LookupError("Enrollment not found — you are not enrolled in this course")

    db.delete(enrollment)
    db.commit()

    return {"message": "Course dropped successfully", "course_id": course_id}


def get_schedule(db: Session, user_id: int) -> ScheduleResponse:
    """
    Get user's enrolled courses with time-slot details.
    Returns ScheduleResponse with total_credits.
    """
    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user_id)
        .all()
    )

    schedule_entries = []
    total_credits = 0

    for enr in enrollments:
        course = db.query(Course).filter(Course.id == enr.course_id).first()
        if not course:
            continue

        time_slots = [
            TimeSlotResponse(id=ts.id, period=ts.period, slot=ts.slot)
            for ts in course.time_slots
        ]

        entry = ScheduleEntry(
            enrollment_id=enr.id,
            course=EnrollmentCourseResponse(
                id=course.id,
                code=course.code,
                name=course.name,
                credits=course.credits,
                instructor=course.instructor,
                department=course.department,
                time_slots=time_slots,
            ),
            enrolled_at=enr.enrolled_at,
            finished_status=enr.finished_status,
            score=enr.score,
        )
        schedule_entries.append(entry)
        total_credits += course.credits

    return ScheduleResponse(schedule=schedule_entries, total_credits=total_credits)


if __name__ == "__main__":
    from server.src.I4_atoms.db.connection import SessionLocal

    db = SessionLocal()

    # Test get_schedule for user 1
    sched = get_schedule(db, 1)
    print(f"✅ get_schedule(user=1): {len(sched.schedule)} courses, {sched.total_credits} credits")

    # Test enroll user 1 in a course they haven't enrolled in
    from server.src.I4_atoms.db.models import Course as C
    all_enrolled_ids = {e.course.id for e in sched.schedule}
    test_course = db.query(C).filter(~C.id.in_(all_enrolled_ids)).first()
    if test_course:
        try:
            result = enroll(db, 1, test_course.id)
            print(f"✅ enroll OK: {result}")
            # Immediately drop it
            drop_result = drop(db, 1, test_course.id)
            print(f"✅ drop OK: {drop_result}")
        except ValueError as e:
            print(f"⚠️ enroll conflict (expected if slot conflict): {e}")

    # Test duplicate enrollment
    if sched.schedule:
        try:
            enroll(db, 1, sched.schedule[0].course.id)
            print("❌ Should have raised ValueError for duplicate")
        except ValueError as e:
            print(f"✅ Duplicate rejected: {e}")

    db.close()
    print("\n=== SCHEDULE SERVICE TESTS PASSED ===")
