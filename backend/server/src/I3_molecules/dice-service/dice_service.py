"""
I3 Molecule: Dice Service
Client-result dice roll logic with audit trail:
- Consume one attempt immediately when roll starts.
- Persist random launch parameters for reproducibility.
- Persist start payload and finalize payload for auditing.
- Commit enrollment score only when finalize arrives.
- Support resuming a started-but-unfinalized roll.
"""

import json
import math
import random
import secrets
import sys
import os
from datetime import datetime

_BACKEND_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy.orm import Session

from server.src.I4_atoms.db.models import Enrollment, DiceRoll

MAX_DICE_ROLL_ATTEMPTS = 3
DICE_COUNT = 3
GRADE_KEYS = ["U", "3", "4", "5"]


def score_to_grade(score: int | None) -> str | None:
    if score is None:
        return None
    if score < 50:
        return "U"
    if score < 70:
        return "3"
    if score < 85:
        return "4"
    return "5"


def grade_to_score(grade: str) -> int:
    # Keep score in numeric domain while preserving U/3/4/5 boundaries.
    mapping = {
        "U": 45,
        "3": 60,
        "4": 77,
        "5": 92,
    }
    return mapping.get(grade, 60)


def score_value(label: str) -> int:
    return 2 if label == "U" else int(label)


def average_to_grade(avg_floor: int) -> str:
    if avg_floor <= 2:
        return "U"
    if avg_floor >= 5:
        return "5"
    return str(avg_floor)

def rounded_average(total: int) -> int:
    # Use half-up rounding to stay consistent with frontend Math.round behavior.
    return int((total / DICE_COUNT) + 0.5)


def get_face_distribution_for_grade(grade: str) -> dict[str, int]:
    if grade == "U":
        return {"U": 1, "3": 2, "4": 2, "5": 1}
    if grade == "3":
        return {"U": 1, "3": 1, "4": 2, "5": 2}
    if grade == "4":
        return {"U": 1, "3": 1, "4": 1, "5": 3}
    if grade == "5":
        return {"U": 0, "3": 1, "4": 2, "5": 3}
    return {"U": 2, "3": 1, "4": 1, "5": 2}


def _normalized(vec: tuple[float, float, float]) -> tuple[float, float, float]:
    length = math.sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2)
    if length == 0:
        return (0.0, 1.0, 0.0)
    return (vec[0] / length, vec[1] / length, vec[2] / length)


def _build_face_layout(distribution: dict[str, int], rng: random.Random) -> list[str]:
    layout: list[str] = []
    for key in GRADE_KEYS:
        layout.extend([key] * max(0, int(distribution.get(key, 0))))
    if len(layout) != 6:
        raise ValueError("Invalid face distribution")
    rng.shuffle(layout)
    return layout


def _generate_launch_params(rng: random.Random) -> list[dict]:
    params = []

    for i in range(DICE_COUNT):
        launch_x = -1.35 + rng.uniform(-0.09, 0.09)
        launch_y = 1.2 + i * 0.12 + rng.uniform(0.0, 0.1)
        launch_z = (i - 1) * 0.28 + rng.uniform(-0.09, 0.09)

        target_x = rng.uniform(-0.1, 0.1)
        target_y = 0.26
        target_z = rng.uniform(-0.24, 0.24)

        raw_direction = (target_x - launch_x, target_y - launch_y, target_z - launch_z)
        direction = _normalized(raw_direction)
        direction = (
            direction[0] + rng.uniform(-0.09, 0.09),
            direction[1] + rng.uniform(-0.03, 0.06),
            direction[2] + rng.uniform(-0.09, 0.09),
        )
        direction = _normalized(direction)

        speed = rng.uniform(6.1, 8.3)
        velocity = (
            direction[0] * speed,
            direction[1] * speed + rng.uniform(1.35, 2.35),
            direction[2] * speed,
        )

        angular_velocity = (
            rng.uniform(-48.0, 48.0),
            rng.uniform(-44.0, 44.0),
            rng.uniform(-48.0, 48.0),
        )

        rotation_euler = (
            rng.uniform(0.0, math.pi * 2),
            rng.uniform(0.0, math.pi * 2),
            rng.uniform(0.0, math.pi * 2),
        )

        params.append(
            {
                "position": [round(launch_x, 6), round(launch_y, 6), round(launch_z, 6)],
                "target": [round(target_x, 6), round(target_y, 6), round(target_z, 6)],
                "direction": [round(direction[0], 6), round(direction[1], 6), round(direction[2], 6)],
                "speed": round(speed, 6),
                "velocity": [round(velocity[0], 6), round(velocity[1], 6), round(velocity[2], 6)],
                "angular_velocity": [
                    round(angular_velocity[0], 6),
                    round(angular_velocity[1], 6),
                    round(angular_velocity[2], 6),
                ],
                "rotation_euler": [
                    round(rotation_euler[0], 6),
                    round(rotation_euler[1], 6),
                    round(rotation_euler[2], 6),
                ],
            }
        )

    return params


def _json_array(raw: str | None) -> list:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def _build_authoritative_result(roll: DiceRoll) -> dict:
    # Keep backward-compatible response shape, but source values from finalized
    # client payload when available.
    client_values = _json_array(roll.client_dice_values_json)
    dice_values = client_values if client_values else _json_array(roll.planned_dice_values_json)
    total = roll.client_total if roll.client_total is not None else roll.planned_total
    average = roll.client_average if roll.client_average is not None else roll.planned_average
    grade = roll.client_grade if (roll.client_grade in GRADE_KEYS) else roll.grade_after
    return {
        "dice_values": dice_values,
        "total": total,
        "average": average,
        "grade": grade,
    }


def _build_launch_plan(roll: DiceRoll) -> dict:
    return {
        "face_layout": _json_array(roll.face_layout_json),
        "dice_states": _json_array(roll.launch_params_json),
    }


def _build_start_response(roll: DiceRoll, attempts_used: int, attempts_left: int, message: str) -> dict:
    return {
        "roll_id": roll.id,
        "course_id": roll.course_id,
        "attempt_number": roll.attempt_number,
        "attempts_used": attempts_used,
        "attempts_left": attempts_left,
        "max_attempts": MAX_DICE_ROLL_ATTEMPTS,
        "status": roll.status,
        "original_score": roll.original_score,
        "score_before": roll.score_before,
        "score_after": roll.score_after,
        "grade_before": roll.grade_before,
        "grade_after": roll.grade_after,
        "authoritative_result": _build_authoritative_result(roll),
        "launch_plan": _build_launch_plan(roll),
        "message": message,
    }


def _sanitize_client_dice_values(values: list[str] | None) -> list[str]:
    if values is None:
        return []
    sanitized = [str(v) for v in values if str(v) in GRADE_KEYS]
    return sanitized if len(sanitized) == DICE_COUNT else []


def _resolve_client_result(
    fallback_grade: str,
    client_dice_values: list[str] | None,
    client_total: int | None,
    client_average: int | None,
    client_grade: str | None,
) -> dict:
    sanitized_values = _sanitize_client_dice_values(client_dice_values)
    computed_total = (
        sum(score_value(v) for v in sanitized_values) if len(sanitized_values) == DICE_COUNT else None
    )
    total = client_total if isinstance(client_total, int) else computed_total
    average = (
        client_average
        if isinstance(client_average, int)
        else (rounded_average(total) if isinstance(total, int) else None)
    )
    grade = None
    if isinstance(client_grade, str) and client_grade in GRADE_KEYS:
        grade = client_grade
    elif isinstance(average, int):
        grade = average_to_grade(average)
    elif isinstance(computed_total, int):
        grade = average_to_grade(rounded_average(computed_total))
    else:
        grade = fallback_grade

    return {
        "dice_values": sanitized_values if sanitized_values else None,
        "total": total,
        "average": average,
        "grade": grade,
        "score_after": grade_to_score(grade),
    }


def start_roll(db: Session, user_id: int, course_id: int) -> dict:
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user_id, Enrollment.course_id == course_id)
        .first()
    )
    if not enrollment:
        raise LookupError("Course is not enrolled")

    if not enrollment.finished_status or enrollment.score is None:
        raise ValueError("Only completed courses with existing score can roll dice")

    previous_rolls = (
        db.query(DiceRoll)
        .filter(DiceRoll.user_id == user_id, DiceRoll.course_id == course_id)
        .order_by(DiceRoll.attempt_number.asc())
        .all()
    )
    attempts_used = len(previous_rolls)

    pending_roll = next((roll for roll in reversed(previous_rolls) if roll.status != "FINALIZED"), None)
    if pending_roll:
        return _build_start_response(
            pending_roll,
            attempts_used=attempts_used,
            attempts_left=max(0, MAX_DICE_ROLL_ATTEMPTS - attempts_used),
            message="Pending roll restored with the same random launch parameters.",
        )

    if attempts_used >= MAX_DICE_ROLL_ATTEMPTS:
        raise ValueError("No roll attempts remaining for this course")

    score_before = enrollment.score
    grade_before = score_to_grade(score_before)
    if grade_before is None:
        raise ValueError("Current score is invalid for dice rolling")

    original_score = previous_rolls[0].original_score if previous_rolls else score_before
    attempt_number = attempts_used + 1

    # Server-side randomness is authoritative and persisted.
    rng = random.Random()
    rng.seed(secrets.randbits(64))

    face_distribution = get_face_distribution_for_grade(grade_before)
    face_layout = _build_face_layout(face_distribution, rng)
    launch_params = _generate_launch_params(rng)

    roll = DiceRoll(
        user_id=user_id,
        course_id=course_id,
        enrollment_id=enrollment.id,
        attempt_number=attempt_number,
        status="PENDING",
        original_score=original_score,
        score_before=score_before,
        score_after=score_before,
        grade_before=grade_before,
        grade_after=grade_before,
        face_layout_json=json.dumps(face_layout),
        launch_params_json=json.dumps(launch_params),
        planned_dice_values_json="[]",
        planned_total=0,
        planned_average=0,
        planned_grade=grade_before,
    )
    db.add(roll)

    db.commit()
    db.refresh(roll)

    return _build_start_response(
        roll,
        attempts_used=attempt_number,
        attempts_left=max(0, MAX_DICE_ROLL_ATTEMPTS - attempt_number),
        message="Roll started. Result will be committed after finalize.",
    )


def finalize_roll(
    db: Session,
    user_id: int,
    roll_id: int,
    client_dice_values: list[str] | None = None,
    client_total: int | None = None,
    client_average: int | None = None,
    client_grade: str | None = None,
) -> dict:
    roll = db.query(DiceRoll).filter(DiceRoll.id == roll_id, DiceRoll.user_id == user_id).first()
    if not roll:
        raise LookupError("Roll record not found")

    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.id == roll.enrollment_id, Enrollment.user_id == user_id)
        .first()
    )
    if not enrollment:
        raise LookupError("Enrollment not found for roll record")

    if roll.status != "FINALIZED":
        resolved = _resolve_client_result(
            fallback_grade=roll.grade_before,
            client_dice_values=client_dice_values,
            client_total=client_total,
            client_average=client_average,
            client_grade=client_grade,
        )

        if client_dice_values is not None:
            roll.client_dice_values_json = json.dumps(client_dice_values)
        elif resolved["dice_values"] is not None:
            roll.client_dice_values_json = json.dumps(resolved["dice_values"])

        if client_total is not None:
            roll.client_total = client_total
        elif isinstance(resolved["total"], int):
            roll.client_total = resolved["total"]

        if client_average is not None:
            roll.client_average = client_average
        elif isinstance(resolved["average"], int):
            roll.client_average = resolved["average"]

        if client_grade is not None:
            roll.client_grade = client_grade
        else:
            roll.client_grade = resolved["grade"]

        roll.score_after = resolved["score_after"]
        roll.grade_after = resolved["grade"]

        roll.status = "FINALIZED"
        roll.finalized_at = datetime.utcnow()
        enrollment.score = resolved["score_after"]

        db.commit()
        db.refresh(roll)

    attempts_used = (
        db.query(DiceRoll)
        .filter(DiceRoll.user_id == user_id, DiceRoll.course_id == roll.course_id)
        .count()
    )

    return {
        "roll_id": roll.id,
        "course_id": roll.course_id,
        "attempt_number": roll.attempt_number,
        "attempts_used": attempts_used,
        "attempts_left": max(0, MAX_DICE_ROLL_ATTEMPTS - attempts_used),
        "status": roll.status,
        "score_after": roll.score_after,
        "grade_after": roll.grade_after,
        "authoritative_result": _build_authoritative_result(roll),
        "message": "Roll finalized",
    }


def clear_rolls_for_course(db: Session, user_id: int, course_id: int, restore_score: bool = True) -> dict:
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user_id, Enrollment.course_id == course_id)
        .first()
    )
    if not enrollment:
        raise LookupError("Course is not enrolled")

    rolls = (
        db.query(DiceRoll)
        .filter(DiceRoll.user_id == user_id, DiceRoll.course_id == course_id)
        .order_by(DiceRoll.attempt_number.asc())
        .all()
    )
    if not rolls:
        return {
            "course_id": course_id,
            "deleted_rolls": 0,
            "restored_score": enrollment.score,
            "message": "No dice roll records to clear",
        }

    restored_score = enrollment.score
    if restore_score:
        restored_score = rolls[0].original_score
        enrollment.score = restored_score

    deleted = len(rolls)
    for roll in rolls:
        db.delete(roll)

    db.commit()

    return {
        "course_id": course_id,
        "deleted_rolls": deleted,
        "restored_score": restored_score,
        "message": "Dice roll records cleared",
    }
