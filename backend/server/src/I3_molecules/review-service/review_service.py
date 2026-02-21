"""
I3 Molecule: Review Service
Business logic for course reviews: get, create, delete.
"""

import sys, os

_BACKEND_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy import func
from sqlalchemy.orm import Session

from server.src.I4_atoms.db.models import Review, Course, User
from server.src.I4_atoms.types.schemas import ReviewResponse, ReviewListResponse
from server.src.I4_atoms.validators.review_validator import validate_rating, validate_comment


def get_reviews(db: Session, course_id: int) -> ReviewListResponse:
    """Get all reviews for a course, ordered by newest first.
    Raises LookupError if course not found.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise LookupError(f"Course {course_id} not found")

    reviews = (
        db.query(Review)
        .filter(Review.course_id == course_id)
        .order_by(Review.created_at.desc())
        .all()
    )

    avgs = db.query(
        func.avg(Review.workload),
        func.avg(Review.difficulty),
        func.avg(Review.practicality),
        func.avg(Review.grading),
        func.avg(Review.teaching_quality),
        func.avg(Review.interest)
    ).filter(Review.course_id == course_id).first()

    def round_avg(val):
        return round(float(val), 2) if val is not None else None

    review_responses = []
    for r in reviews:
        user = db.query(User).filter(User.id == r.user_id).first()
        review_responses.append(ReviewResponse(
            id=r.id,
            user_id=r.user_id,
            username=user.username if user else "unknown",
            course_id=r.course_id,
            workload=r.workload,
            difficulty=r.difficulty,
            practicality=r.practicality,
            grading=r.grading,
            teaching_quality=r.teaching_quality,
            interest=r.interest,
            comment=r.comment,
            created_at=r.created_at,
        ))

    return ReviewListResponse(
        reviews=review_responses,
        avg_workload=round_avg(avgs[0]) if avgs else None,
        avg_difficulty=round_avg(avgs[1]) if avgs else None,
        avg_practicality=round_avg(avgs[2]) if avgs else None,
        avg_grading=round_avg(avgs[3]) if avgs else None,
        avg_teaching_quality=round_avg(avgs[4]) if avgs else None,
        avg_interest=round_avg(avgs[5]) if avgs else None,
        total=len(review_responses),
    )


def create_review(db: Session, user_id: int, course_id: int, data: dict) -> ReviewResponse:
    """Create a new review. Validates input, checks course exists and no duplicate.
    Raises LookupError if course not found.
    Raises ValueError if duplicate review or invalid input.
    """
    # Validate input
    workload = validate_rating(data.get("workload"))
    difficulty = validate_rating(data.get("difficulty"))
    practicality = validate_rating(data.get("practicality"))
    grading = validate_rating(data.get("grading"))
    teaching_quality = validate_rating(data.get("teaching_quality"))
    interest = validate_rating(data.get("interest"))
    comment = validate_comment(data.get("comment"))

    # Check course exists
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise LookupError(f"Course {course_id} not found")

    # Check duplicate
    existing = (
        db.query(Review)
        .filter(Review.user_id == user_id, Review.course_id == course_id)
        .first()
    )
    if existing:
        raise ValueError("You have already reviewed this course")

    # Insert
    review = Review(
        user_id=user_id,
        course_id=course_id,
        workload=workload,
        difficulty=difficulty,
        practicality=practicality,
        grading=grading,
        teaching_quality=teaching_quality,
        interest=interest,
        comment=comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    user = db.query(User).filter(User.id == user_id).first()
    return ReviewResponse(
        id=review.id,
        user_id=review.user_id,
        username=user.username if user else "unknown",
        course_id=review.course_id,
        workload=review.workload,
        difficulty=review.difficulty,
        practicality=review.practicality,
        grading=review.grading,
        teaching_quality=review.teaching_quality,
        interest=review.interest,
        comment=review.comment,
        created_at=review.created_at,
    )


def delete_review(db: Session, user_id: int, review_id: int) -> dict:
    """Delete a review. Only the author can delete their own review.
    Raises LookupError if review not found.
    Raises PermissionError if not the author.
    """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise LookupError(f"Review {review_id} not found")

    if review.user_id != user_id:
        raise PermissionError("You can only delete your own review")

    db.delete(review)
    db.commit()
    return {"message": "Review deleted", "review_id": review_id}


if __name__ == "__main__":
    from server.src.I4_atoms.db.connection import SessionLocal
    db = SessionLocal()
    # Test get_reviews for course 1
    result = get_reviews(db, 1)
    print(f"✅ get_reviews(course_id=1): {result.total} reviews, avg_rating={result.avg_rating}")
    for r in result.reviews:
        print(f"   - {r.username}: {r.rating}/5 - {r.comment}")
    db.close()
