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
    # ================================================================
    # Strategy: Create 20 simulated students with themed enrollment patterns
    # so that "people who enrolled in X also enrolled in Y" produces
    # meaningful, ranked recommendations.
    #
    # Tracks (course groups that students tend to co-enroll):
    #   AI Track:       TDDE01(30) Machine Learning, TDDE15(35) Advanced ML,
    #                   TDDE07(32) Bayesian Learning, TDDE09(33) NLP,
    #                   TDDE52(45→skip, use 52) Deep Learning(52),
    #                   TBMI26(8) Neural Networks, TDDE05(31) AI Robotics,
    #                   TDDC17(9) AI, TDDE13(34) Multi Agent Systems
    #   Data Track:     TDDE01(30) ML, TDDD41(23) Data Mining, TDDE31(40) Big Data,
    #                   TDDE16(36) Text Mining, TDDE64(48) Sports Analytics,
    #                   TDDE07(32) Bayesian Learning, TNM098(66) Visual Data Analysis
    #   Systems Track:  TDDC88(11) Software Engineering, TDDD04(13) Software Testing,
    #                   TDDE41(42→use 41) Software Verification(41),
    #                   TDDE34(41) Software Verification, TDDE41(42) Software Architectures,
    #                   TDDE45(43) Software Design, TDDE51(44) Large Distributed Projects,
    #                   TDDC90(12) Software Security
    #   Networks Track: TDTS06(55) Computer Networks, TDTS21(58) Advanced Networking,
    #                   TSIN01(73) Info Networks, TSIN02(74) Internetworking,
    #                   TSIT02(75) Computer Security, TSIT03(76) Cryptology,
    #                   TDDE62(47) Info Security
    #   Graphics Track: TNM061(60) 3D Graphics, TNM067(61) Scientific Viz,
    #                   TNM079(62) Modelling & Animation, TNM084(63) Procedural Methods,
    #                   TNCG15(59) Advanced Rendering, TNM116(70) XR,
    #                   TNM114(69) AI for Interactive Media
    # ================================================================

    all_course_ids = list(course_id_map.values())

    # -- 6a. Insert simulated students (student5 ~ student24, 20 users) --
    sim_pw_hash = hash_pw("password123")  # Hash once, reuse for all simulated users
    sim_users = []
    for i in range(5, 25):
        sim_users.append(
            (f"student{i}", f"student{i}@liu.se", sim_pw_hash, "student")
        )
    cur.executemany(
        "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
        sim_users,
    )
    print(f"[✓] Inserted {len(sim_users)} simulated students (student5–student24)")

    # Build user_id lookup (get all user ids after insert)
    cur.execute("SELECT id, username FROM users")
    user_id_map = {row[1]: row[0] for row in cur.fetchall()}

    # -- Define course ID shortcuts by code --
    C = course_id_map  # C["TDDE01"] → course_id

    # -- Define track course lists --
    ai_core = [C["TDDE01"], C["TDDE15"], C["TDDE07"], C["TDDE09"], C["TBMI26"], C["TDDC17"]]
    ai_extra = [C["TDDE05"], C["TDDE13"], C["TDDE70"], C["TDDD48"]]

    data_core = [C["TDDE01"], C["TDDD41"], C["TDDE31"], C["TDDE16"], C["TDDE07"]]
    data_extra = [C["TNM098"], C["TDDE64"], C["TDDE09"], C["TBMI26"]]

    sys_core = [C["TDDC88"], C["TDDD04"], C["TDDE34"], C["TDDE41"], C["TDDE45"]]
    sys_extra = [C["TDDE51"], C["TDDC90"], C["TDDE21"], C["TDDD25"]]

    net_core = [C["TDTS06"], C["TDTS21"], C["TSIN01"], C["TSIN02"], C["TSIT02"]]
    net_extra = [C["TSIT03"], C["TDDE62"], C["TSKS33"], C["TDDC90"]]

    gfx_core = [C["TNM061"], C["TNM067"], C["TNM079"], C["TNM084"], C["TNCG15"]]
    gfx_extra = [C["TNM116"], C["TNM114"], C["TNM091"], C["TNM107"]]

    # math courses as cross-track electives
    math_electives = [C["TAMS11"], C["TAMS43"], C["TAOP24"], C["TATA54"], C["TATA55"], C["TATA64"]]

    # -- 6b. Assign enrollments for original 3 test users with track themes --
    # testuser1: AI track student
    user1_courses = list(set(ai_core + random.sample(ai_extra, 2) + random.sample(math_electives, 2)))
    # testuser2: Data track student (overlaps with AI on TDDE01, TDDE07)
    user2_courses = list(set(data_core + random.sample(data_extra, 2) + random.sample(math_electives, 1)))
    # testuser3: Systems track student
    user3_courses = list(set(sys_core + random.sample(sys_extra, 2) + random.sample(math_electives, 1)))

    enrollments = []

    def add_enrollment(uid, cid_list):
        for cid in cid_list:
            finished = random.choice([True, True, True, False])  # 75% finished
            score = random.randint(40, 100) if finished else None
            enrollments.append((uid, cid, finished, score))

    add_enrollment(user_id_map["testuser1"], user1_courses)
    add_enrollment(user_id_map["testuser2"], user2_courses)
    add_enrollment(user_id_map["testuser3"], user3_courses)

    # -- 6c. Assign enrollments for 20 simulated students --
    # Each student picks a primary track (core + 1-3 extra) and 1-2 cross-track electives
    track_configs = [
        # (primary_core, primary_extra, label)
        (ai_core, ai_extra, "AI"),
        (data_core, data_extra, "Data"),
        (sys_core, sys_extra, "Systems"),
        (net_core, net_extra, "Networks"),
        (gfx_core, gfx_extra, "Graphics"),
    ]

    for i in range(5, 25):
        username = f"student{i}"
        uid = user_id_map[username]

        # Assign primary track (distribute roughly evenly, with AI/Data more popular)
        if i % 5 == 0:
            core, extra, label = track_configs[0]  # AI
        elif i % 5 == 1:
            core, extra, label = track_configs[1]  # Data
        elif i % 5 == 2:
            core, extra, label = track_configs[2]  # Systems
        elif i % 5 == 3:
            core, extra, label = track_configs[3]  # Networks
        else:
            core, extra, label = track_configs[4]  # Graphics

        # Core courses: take all or most (4-6)
        n_core = min(len(core), random.randint(max(3, len(core) - 2), len(core)))
        student_courses = set(random.sample(core, n_core))

        # Extra courses from same track: 1-3
        n_extra = min(len(extra), random.randint(1, 3))
        student_courses.update(random.sample(extra, n_extra))

        # Cross-track elective: pick 1-2 from math or another track
        student_courses.update(random.sample(math_electives, random.randint(0, 2)))

        # Some students also take 1 course from an adjacent track
        if random.random() < 0.5:
            adjacent_idx = (track_configs.index((core, extra, label)) + 1) % 5
            adj_core = track_configs[adjacent_idx][0]
            student_courses.add(random.choice(adj_core))

        add_enrollment(uid, list(student_courses))

    cur.executemany(
        "INSERT OR IGNORE INTO enrollments (user_id, course_id, finished_status, score) VALUES (?, ?, ?, ?)",
        enrollments,
    )
    actual_enrollments = cur.execute("SELECT COUNT(*) FROM enrollments").fetchone()[0]
    print(f"[✓] Inserted {actual_enrollments} enrollment records ({3 + len(sim_users)} users)")

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
        "One of the best courses at LiU!",
        "Perfect balance of theory and practice.",
        "The group project was really valuable.",
        "Tough but fair, you'll learn a lot.",
        "Well-structured lectures and helpful TAs.",
        "This course changed how I think about programming.",
    ]

    reviews = []

    # Reviews from original 3 users
    for cid in random.sample(user1_courses, min(5, len(user1_courses))):
        reviews.append((user_id_map["testuser1"], cid, random.randint(3, 5), random.choice(comments_pool)))
    for cid in random.sample(user2_courses, min(4, len(user2_courses))):
        reviews.append((user_id_map["testuser2"], cid, random.randint(2, 5), random.choice(comments_pool)))
    for cid in random.sample(user3_courses, min(3, len(user3_courses))):
        reviews.append((user_id_map["testuser3"], cid, random.randint(3, 5), random.choice(comments_pool)))

    # Reviews from simulated students (each reviews 2-5 of their enrolled courses)
    for i in range(5, 25):
        uid = user_id_map[f"student{i}"]
        # Get this student's enrolled courses
        cur.execute("SELECT course_id FROM enrollments WHERE user_id = ?", (uid,))
        student_enrolled = [row[0] for row in cur.fetchall()]
        if student_enrolled:
            n_reviews = min(len(student_enrolled), random.randint(2, 5))
            for cid in random.sample(student_enrolled, n_reviews):
                reviews.append((uid, cid, random.randint(2, 5), random.choice(comments_pool)))

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
    print(f"  Users: {len(users) + len(sim_users)}")
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
    print("  testuser1 / password123 (student, AI track)")
    print("  testuser2 / password123 (student, Data track)")
    print("  testuser3 / password123 (student, Systems track)")
    print("  student5–student24 / password123 (simulated students)")
    print("  admin / admin123 (admin)")
    print()
    print("Track themes for recommendation testing:")
    print("  AI Track:       TDDE01, TDDE15, TDDE07, TDDE09, TBMI26, TDDC17, ...")
    print("  Data Track:     TDDE01, TDDD41, TDDE31, TDDE16, TDDE07, ...")
    print("  Systems Track:  TDDC88, TDDD04, TDDE34, TDDE41, TDDE45, ...")
    print("  Networks Track: TDTS06, TDTS21, TSIN01, TSIN02, TSIT02, ...")
    print("  Graphics Track: TNM061, TNM067, TNM079, TNM084, TNCG15, ...")
    print()
    print("Recommendation test examples:")
    print("  GET /api/courses/{TDDE01_id}/recommend → should show TDDE15, TDDE07, TDDE09 (AI+Data overlap)")
    print("  GET /api/courses/{TDDC88_id}/recommend → should show TDDD04, TDDE34, TDDE45 (Systems track)")
    print("  GET /api/courses/{TDTS06_id}/recommend → should show TDTS21, TSIN01, TSIT02 (Networks track)")
    print()


if __name__ == "__main__":
    seed()
