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
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
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
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE (user_id, course_id)
);
