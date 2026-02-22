"""
I4 Atom: ORM Models
SQLAlchemy declarative models mapping 5 core tables.
"""

from datetime import datetime
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from server.src.I4_atoms.db.connection import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="student")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    enrollments: Mapped[list["Enrollment"]] = relationship("Enrollment", back_populates="user")
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="user")
    dice_rolls: Mapped[list["DiceRoll"]] = relationship("DiceRoll", back_populates="user")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)
    instructor: Mapped[str] = mapped_column(String, nullable=False)
    department: Mapped[str] = mapped_column(String, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=60)

    time_slots: Mapped[list["TimeSlot"]] = relationship("TimeSlot", back_populates="course", cascade="all, delete-orphan")
    enrollments: Mapped[list["Enrollment"]] = relationship("Enrollment", back_populates="course")
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="course")
    dice_rolls: Mapped[list["DiceRoll"]] = relationship("DiceRoll", back_populates="course")


class TimeSlot(Base):
    __tablename__ = "time_slots"
    __table_args__ = (
        UniqueConstraint("course_id", "period", "slot"),
        CheckConstraint("slot >= 1 AND slot <= 4"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    period: Mapped[int] = mapped_column(Integer, nullable=False)
    slot: Mapped[int] = mapped_column(Integer, nullable=False)

    course: Mapped["Course"] = relationship("Course", back_populates="time_slots")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id"),
        CheckConstraint("workload >= 1 AND workload <= 5"),
        CheckConstraint("difficulty >= 1 AND difficulty <= 5"),
        CheckConstraint("practicality >= 1 AND practicality <= 5"),
        CheckConstraint("grading >= 1 AND grading <= 5"),
        CheckConstraint("teaching_quality >= 1 AND teaching_quality <= 5"),
        CheckConstraint("interest >= 1 AND interest <= 5"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    workload: Mapped[int] = mapped_column(Integer, nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    practicality: Mapped[int] = mapped_column(Integer, nullable=False)
    grading: Mapped[int] = mapped_column(Integer, nullable=False)
    teaching_quality: Mapped[int] = mapped_column(Integer, nullable=False)
    interest: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="reviews")
    course: Mapped["Course"] = relationship("Course", back_populates="reviews")


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("user_id", "course_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    finished_status: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    score: Mapped[int | None] = mapped_column(Integer, CheckConstraint("score IS NULL OR (score >= 0 AND score <= 100)"), nullable=True, default=None)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="enrollments")
    course: Mapped["Course"] = relationship("Course", back_populates="enrollments")
    dice_rolls: Mapped[list["DiceRoll"]] = relationship("DiceRoll", back_populates="enrollment")


class DiceRoll(Base):
    __tablename__ = "dice_rolls"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", "attempt_number"),
        CheckConstraint("attempt_number >= 1"),
        CheckConstraint("original_score >= 0 AND original_score <= 100"),
        CheckConstraint("score_before >= 0 AND score_before <= 100"),
        CheckConstraint("score_after >= 0 AND score_after <= 100"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    enrollment_id: Mapped[int] = mapped_column(Integer, ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="PENDING")
    original_score: Mapped[int] = mapped_column(Integer, nullable=False)
    score_before: Mapped[int] = mapped_column(Integer, nullable=False)
    score_after: Mapped[int] = mapped_column(Integer, nullable=False)
    grade_before: Mapped[str] = mapped_column(String, nullable=False)
    grade_after: Mapped[str] = mapped_column(String, nullable=False)
    face_layout_json: Mapped[str] = mapped_column(Text, nullable=False)
    launch_params_json: Mapped[str] = mapped_column(Text, nullable=False)
    planned_dice_values_json: Mapped[str] = mapped_column(Text, nullable=False)
    planned_total: Mapped[int] = mapped_column(Integer, nullable=False)
    planned_average: Mapped[int] = mapped_column(Integer, nullable=False)
    planned_grade: Mapped[str] = mapped_column(String, nullable=False)
    client_dice_values_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    client_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    client_average: Mapped[int | None] = mapped_column(Integer, nullable=True)
    client_grade: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="dice_rolls")
    course: Mapped["Course"] = relationship("Course", back_populates="dice_rolls")
    enrollment: Mapped["Enrollment"] = relationship("Enrollment", back_populates="dice_rolls")


if __name__ == "__main__":
    from server.src.I4_atoms.db.connection import SessionLocal
    db = SessionLocal()
    count = db.query(Course).count()
    print(f"✅ Models OK. Course count: {count}")
    db.close()
