import sqlite3
import random
from pathlib import Path

# -- Path configuration --
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "app.db"

def fill_missing_ratings():
    if not DB_PATH.exists():
        print(f"[!] Database not found: {DB_PATH}")
        return

    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    # 1. Get all courses
    cur.execute("SELECT id, code, name FROM courses")
    all_courses = cur.fetchall()
    
    # 2. Get courses with reviews
    cur.execute("SELECT DISTINCT course_id FROM reviews")
    reviewed_course_ids = {row[0] for row in cur.fetchall()}

    # 3. Identify courses without reviews
    courses_missing_reviews = [c for c in all_courses if c[0] not in reviewed_course_ids]

    print(f"Found {len(courses_missing_reviews)} courses with no reviews.")
    if not courses_missing_reviews:
        print("All courses have at least one review.")
        conn.close()
        return

    # 4. Get available users (students)
    cur.execute("SELECT id FROM users WHERE role = 'student'")
    student_ids = [row[0] for row in cur.fetchall()]

    if not student_ids:
        print("No students found in database to write reviews.")
        conn.close()
        return

    # 5. Generate reviews
    comments_pool = [
        "A bit challenging but learned a lot.",
        "Good introduction to the subject.",
        "The labs were quite time consuming.",
        "Great lecturer!",
        "Would recommend to others.",
        "Hard exams, study well.",
        "Very useful for future career.",
        "Content is a bit outdated.",
        "Fun course if you like the topic.",
        "Well organized.",
        "Mixed feelings about this one.",
        "Pretty standard course.",
        "Amazing experience!",
        "Avoid if possible unless you need it.",
        "Decent workload, fair grading."
    ]

    new_reviews = []
    
    for course_id, code, name in courses_missing_reviews:
        # Generate 1 to 5 reviews per course
        num_reviews = random.randint(1, 5)
        # Pick distinct users
        selected_users = random.sample(student_ids, min(num_reviews, len(student_ids)))

        for user_id in selected_users:
            workload = random.randint(1, 5)
            difficulty = random.randint(1, 5)
            practicality = random.randint(1, 5)
            grading = random.randint(1, 5)
            teaching_quality = random.randint(1, 5)
            interest = random.randint(1, 5)
            comment = random.choice(comments_pool)

            new_reviews.append((
                user_id, course_id, 
                workload, difficulty, practicality, grading, teaching_quality, interest, 
                comment
            ))

    # 6. Insert reviews
    print(f"Generating {len(new_reviews)} new reviews for {len(courses_missing_reviews)} courses...")
    
    cur.executemany("""
        INSERT INTO reviews (
            user_id, course_id, 
            workload, difficulty, practicality, grading, teaching_quality, interest, 
            comment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, new_reviews)

    conn.commit()
    print(f"[✓] Successfully inserted {len(new_reviews)} reviews.")
    conn.close()

if __name__ == "__main__":
    fill_missing_ratings()
