"""
Database seeding script - Initialize database from scraped JSON data
Usage: python database/seed.py

Data source: data/liu_6mics_courses.json (LiU 6MICS Master's Program courses)
Random values generated for missing fields.
"""

import json
import random
import sqlite3
from pathlib import Path

# Use bcrypt library to hash passwords directly (avoid passlib compatibility issues)
try:
    import bcrypt

    def hash_pw(password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
except ImportError:
    from hashlib import sha256

    def hash_pw(password: str) -> str:
        return f"$2b$12$fakehash_{sha256(password.encode()).hexdigest()[:40]}"


# -- Path configuration --
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "app.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"
JSON_PATH = BASE_DIR.parent.parent / "data" / "liu_6mics_courses.json"

# -- Random seed (reproducible) --
random.seed(42)


def compute_period_id(semester_number: int, period_str: str) -> int:
    """
    Map semester + period to period (integer) in database.

    Semester 1 Period 1 → 1    Semester 1 Period 2 → 2
    Semester 2 Period 1 → 3    Semester 2 Period 2 → 4
    Semester 3 Period 1 → 5    Semester 3 Period 2 → 6
    Semester 4 Period 1 → 7    Semester 4 Period 2 → 8
    """
    period_num = int(period_str.replace("Period ", ""))  # "Period 1" → 1
    return (semester_number - 1) * 2 + period_num


def seed():
    # Delete old database
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"[*] Deleted old database: {DB_PATH}")

    # Read JSON data
    if not JSON_PATH.exists():
        print(f"[!] Data file not found: {JSON_PATH}")
        print("    Please ensure data/liu_6mics_courses.json exists")
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    courses_data = data["courses"]
    offerings_data = data["offerings"]

    print(f"[*] Read {len(courses_data)} courses, {len(offerings_data)} offerings")

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    # -- 1. Create tables --
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        cur.executescript(f.read())
    print("[✓] Table structure created")

    # -- 2. Insert users --
    users = [
        ("testuser1", "testuser1@example.com", hash_pw("password123"), "student"),
        ("testuser2", "testuser2@example.com", hash_pw("password123"), "student"),
        ("testuser3", "testuser3@example.com", hash_pw("password123"), "student"),
        ("admin", "admin@example.com", hash_pw("admin123"), "admin"),
    ]
    cur.executemany(
        "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
        users,
    )
    print(f"[✓] Inserted {len(users)} users")

    # -- 3. Insert courses (from JSON courses array) --
    course_id_map = {}  # course_code → db_id
    course_rows = []

    for c in courses_data:
        code = c["course_code"]
        name = c["name"]
        description = c.get("description", "")
        credits = c.get("credits", 6.0)

        # instructor: Get from detail.examiner, generate random if missing
        detail = c.get("detail") or {}
        instructor = detail.get("examiner", "")
        if not instructor:
            instructor = random.choice([
                "Dr. Smith", "Prof. Johnson", "Dr. Anderson",
                "Prof. Williams", "Dr. Martinez", "Prof. Chen",
            ])

        # department: Get from detail.department, use main_field_of_study if missing
        department = detail.get("department", "")
        if not department:
            department = detail.get("main_field_of_study", "Computer Science")

        # capacity: No such field in JSON, randomly generate 30-150
        capacity = random.randint(30, 150)

        course_rows.append((code, name, description, int(credits), instructor, department, capacity))

    cur.executemany(
        "INSERT INTO courses (code, name, description, credits, instructor, department, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)",
        course_rows,
    )

    # Get inserted id mapping
    cur.execute("SELECT id, code FROM courses")
    for row in cur.fetchall():
        course_id_map[row[1]] = row[0]

    print(f"[✓] Inserted {len(course_rows)} courses")

    # -- 4. Insert time slots (extract unique period-slot combinations from offerings) --
    # period = compute_period_id(semester_number, period_str)
    # slot = time_module (1-4)
    time_slot_set = set()  # (course_id, period, slot) deduplication

    for o in offerings_data:
        code = o.get("course_code")
        if code not in course_id_map:
            continue

        course_id = course_id_map[code]
        semester_num = o.get("semester_number")
        period_str = o.get("period")
        time_module = o.get("time_module")

        if not all([semester_num, period_str, time_module]):
            continue

        period_id = compute_period_id(semester_num, period_str)

        # time_module may have multiple values, may contain "-" or other invalid values
        tm_values = o.get("time_module_values", [time_module])
        for tm in tm_values:
            tm_str = str(tm).strip()
            if tm_str.isdigit():
                slot = int(tm_str)
                if 1 <= slot <= 4:
                    time_slot_set.add((course_id, period_id, slot))

    time_slot_rows = sorted(time_slot_set)

    cur.executemany(
        "INSERT INTO time_slots (course_id, period, slot) VALUES (?, ?, ?)",
        time_slot_rows,
    )
    print(f"[✓] Inserted {len(time_slot_rows)} time slots")

    # -- 5. Find time conflicts --
    cur.execute("""
        SELECT ts1.period, ts1.slot, c1.code, c1.name, c2.code, c2.name
        FROM time_slots ts1
        JOIN time_slots ts2 ON ts1.period = ts2.period AND ts1.slot = ts2.slot AND ts1.course_id < ts2.course_id
        JOIN courses c1 ON ts1.course_id = c1.id
        JOIN courses c2 ON ts2.course_id = c2.id
        ORDER BY ts1.period, ts1.slot, c1.code
        LIMIT 30
    """)
    conflicts = cur.fetchall()

    # -- 6. Insert enrollment records (for recommendation feature testing) --
    all_course_ids = list(course_id_map.values())

    # testuser1 (id=1): enroll in 8 courses
    user1_courses = random.sample(all_course_ids, min(8, len(all_course_ids)))
    # testuser2 (id=2): partial overlap with user1
    overlap = random.sample(user1_courses, min(4, len(user1_courses)))
    others = [cid for cid in all_course_ids if cid not in user1_courses]
    user2_extra = random.sample(others, min(4, len(others)))
    user2_courses = overlap + user2_extra
    # testuser3 (id=3): enroll in 6 courses
    user3_courses = random.sample(all_course_ids, min(6, len(all_course_ids)))

    enrollments = []
    for cid in user1_courses:
        enrollments.append((1, cid, random.choice([True, False])))
    for cid in user2_courses:
        enrollments.append((2, cid, random.choice([True, False])))
    for cid in user3_courses:
        enrollments.append((3, cid, random.choice([True, False])))

    cur.executemany(
        "INSERT OR IGNORE INTO enrollments (user_id, course_id, finished_status) VALUES (?, ?, ?)",
        enrollments,
    )
    actual_enrollments = cur.execute("SELECT COUNT(*) FROM enrollments").fetchone()[0]
    print(f"[✓] Inserted {actual_enrollments} enrollment records (3 users)")

    # -- 7. Insert reviews --
    comments_pool = [
        "Great course! Highly recommended.",
        "The content was challenging but rewarding.",
        "Excellent teaching and well-organized labs.",
        "Good course, but the workload is heavy.",
        "Very theoretical, could use more practical examples.",
        "The examiner is very knowledgeable and helpful.",
        "Interesting topics, fair examination.",
        "A must-take for CS students.",
        "Learned a lot from this course.",
        "Solid course with good structure.",
        "The assignments were very helpful for understanding.",
        "Could be improved with more interactive sessions.",
    ]

    reviews = []
    for cid in random.sample(user1_courses, min(5, len(user1_courses))):
        reviews.append((1, cid, random.randint(3, 5), random.choice(comments_pool)))
    for cid in random.sample(user2_courses, min(4, len(user2_courses))):
        reviews.append((2, cid, random.randint(2, 5), random.choice(comments_pool)))
    for cid in random.sample(user3_courses, min(3, len(user3_courses))):
        reviews.append((3, cid, random.randint(3, 5), random.choice(comments_pool)))

    cur.executemany(
        "INSERT OR IGNORE INTO reviews (user_id, course_id, rating, comment) VALUES (?, ?, ?, ?)",
        reviews,
    )
    actual_reviews = cur.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    print(f"[✓] Inserted {actual_reviews} reviews")

    conn.commit()
    conn.close()

    # -- Output summary --
    print(f"\n{'=' * 60}")
    print(f"[✓] Database initialization completed: {DB_PATH}")
    print(f"{'=' * 60}")
    print(f"Data source: {JSON_PATH.name}")
    print(f"  Courses: {len(course_rows)}")
    print(f"  Time slots: {len(time_slot_rows)}")
    print(f"  Users: {len(users)}")
    print(f"  Enrollments: {actual_enrollments}")
    print(f"  Reviews: {actual_reviews}")
    print()
    print("Period mapping:")
    print("  1 = Sem1 Period1 (Aut 2026)   2 = Sem1 Period2 (Aut 2026)")
    print("  3 = Sem2 Period1 (Spr 2027)   4 = Sem2 Period2 (Spr 2027)")
    print("  5 = Sem3 Period1 (Aut 2027)   6 = Sem3 Period2 (Aut 2027)")
    print("  7 = Sem4 Period1 (Spr 2028)   8 = Sem4 Period2 (Spr 2028)")
    print("Slot = time_module (1-4)")
    print()

    if conflicts:
        print(f"Time conflict pairs (total {len(conflicts)}):")
        for period, slot, code1, name1, code2, name2 in conflicts:
            print(f"  period={period}, slot={slot}: {code1} ↔ {code2}")
    else:
        print("⚠️  No time conflicts found")

    print()
    print("Test accounts:")
    print("  testuser1 / password123 (student)")
    print("  testuser2 / password123 (student)")
    print("  testuser3 / password123 (student)")
    print("  admin / admin123 (admin)")


if __name__ == "__main__":
    seed()
