#!/usr/bin/env python3
"""
Clear dice roll records for testing.

Default behavior:
- Restore each affected enrollment score to the original score captured in attempt #1.
- Delete all rows from dice_rolls.

Usage:
  python3 backend/database/clear_dice_rolls.py
  python3 backend/database/clear_dice_rolls.py --no-restore-scores
"""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clear dice_rolls records for test users")
    parser.add_argument(
        "--no-restore-scores",
        action="store_true",
        help="Do not restore enrollment scores from original_score before deleting roll records",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    restore_scores = not args.no_restore_scores

    db_path = Path(__file__).resolve().parent / "app.db"
    if not db_path.exists():
        print(f"[!] Database not found: {db_path}")
        raise SystemExit(1)

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    exists = cur.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='dice_rolls'"
    ).fetchone()
    if not exists:
        print("[i] dice_rolls table does not exist, nothing to clear.")
        conn.close()
        return

    roll_count = cur.execute("SELECT COUNT(*) FROM dice_rolls").fetchone()[0]
    if roll_count == 0:
        print("[i] dice_rolls is already empty.")
        conn.close()
        return

    if restore_scores:
        cur.execute(
            """
            WITH first_roll AS (
                SELECT enrollment_id, MIN(attempt_number) AS first_attempt
                FROM dice_rolls
                GROUP BY enrollment_id
            )
            UPDATE enrollments
            SET score = (
                SELECT dr.original_score
                FROM dice_rolls dr
                JOIN first_roll fr
                  ON fr.enrollment_id = dr.enrollment_id
                 AND fr.first_attempt = dr.attempt_number
                WHERE dr.enrollment_id = enrollments.id
                LIMIT 1
            )
            WHERE id IN (SELECT enrollment_id FROM first_roll)
            """
        )

    cur.execute("DELETE FROM dice_rolls")
    conn.commit()

    print(f"[✓] Cleared {roll_count} dice_rolls record(s)")
    if restore_scores:
        print("[✓] Restored enrollment scores from original_score snapshots")

    conn.close()


if __name__ == "__main__":
    main()
