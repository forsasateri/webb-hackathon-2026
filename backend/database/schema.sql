-- Course Selection System DDL
-- 5 core tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL,
    instructor TEXT NOT NULL,
    department TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 60
);

-- Time slots table (one course can occupy multiple period-slot combinations)
-- period = teaching phase within semester, calculated by (semester_number - 1) * 2 + period_num
--   1 = Semester 1 Period 1 (Autumn 2026 first half)
--   2 = Semester 1 Period 2 (Autumn 2026 second half)
--   3 = Semester 2 Period 1 (Spring 2027 first half)
--   4 = Semester 2 Period 2 (Spring 2027 second half)
--   5 = Semester 3 Period 1 (Autumn 2027 first half)
--   6 = Semester 3 Period 2 (Autumn 2027 second half)
--   7 = Semester 4 Period 1 (Spring 2028 first half)
--   8 = Semester 4 Period 2 (Spring 2028 second half)
-- slot = time_module teaching module (1=module 1, 2=module 2, 3=module 3, 4=module 4)
CREATE TABLE IF NOT EXISTS time_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    period INTEGER NOT NULL,
    slot INTEGER NOT NULL CHECK (slot >= 1 AND slot <= 4),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE (course_id, period, slot)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    workload INTEGER NOT NULL CHECK (workload >= 1 AND workload <= 5),
    difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
    practicality INTEGER NOT NULL CHECK (practicality >= 1 AND practicality <= 5),
    grading INTEGER NOT NULL CHECK (grading >= 1 AND grading <= 5),
    teaching_quality INTEGER NOT NULL CHECK (teaching_quality >= 1 AND teaching_quality <= 5),
    interest INTEGER NOT NULL CHECK (interest >= 1 AND interest <= 5),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE (user_id, course_id)
);

-- Enrollment records table
CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    finished_status BOOLEAN NOT NULL DEFAULT 0,
    score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE (user_id, course_id)
);

-- Dice roll records table
CREATE TABLE IF NOT EXISTS dice_rolls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    enrollment_id INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
    status TEXT NOT NULL DEFAULT 'PENDING',
    original_score INTEGER NOT NULL CHECK (original_score >= 0 AND original_score <= 100),
    score_before INTEGER NOT NULL CHECK (score_before >= 0 AND score_before <= 100),
    score_after INTEGER NOT NULL CHECK (score_after >= 0 AND score_after <= 100),
    grade_before TEXT NOT NULL,
    grade_after TEXT NOT NULL,
    face_layout_json TEXT NOT NULL,
    launch_params_json TEXT NOT NULL,
    planned_dice_values_json TEXT NOT NULL,
    planned_total INTEGER NOT NULL,
    planned_average INTEGER NOT NULL,
    planned_grade TEXT NOT NULL,
    client_dice_values_json TEXT,
    client_total INTEGER,
    client_average INTEGER,
    client_grade TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    UNIQUE (user_id, course_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_dice_rolls_user_course ON dice_rolls (user_id, course_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dice_rolls_enrollment ON dice_rolls (enrollment_id, created_at);
