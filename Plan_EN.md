# Course Selection System — 24h Hackathon Development Plan

**Tech Stack**: React + TypeScript + Vite + Ant Design / FastAPI + SQLAlchemy + SQLite  
**Auth**: JWT (username + password, bcrypt hash)  
**State Management**: React Context + useReducer  
**Team**: 4–5 junior web developers (Person A–E)  
**Architecture**: Atomic Refactoring + 4-Layer Architecture (I1 Entry → I2 Coordinator → I3 Molecule → I4 Atom)

---

## Database Design

5 core tables, located under `database/`:

| Table | Key Fields | Description |
|---|---|---|
| `users` | id, username, email, password_hash, role, created_at | Users |
| `courses` | id, code, name, description, credits, instructor, department, capacity, enrolled_count | Courses |
| `time_slots` | id, course_id(FK), day_of_week, start_time, end_time, location | Time slots |
| `reviews` | id, user_id(FK), course_id(FK), rating(1-5), comment, created_at | Reviews |
| `enrollments` | id, user_id(FK), course_id(FK), enrolled_at | Enrollment records |

Constraints: `enrollments` table has `(user_id, course_id)` unique; `reviews` table likewise prevents duplicate reviews.

---

## Phase 1: Foundation (Hour 0–3) — Full Team Collaboration

### 1.1 Monorepo Setup
- Root `package.json` (scripts: `dev:client`, `dev:server`), `.gitignore`, `.env.example`

### 1.2 Client Init (Person C + D)
- In `client/` run `npm create vite@latest . -- --template react-ts`
- Install: `antd`, `react-router-dom`, `@ant-design/icons`
- Configure `client/vite.config.ts` (proxy → `localhost:8000`), `client/tsconfig.json` (path alias `@/` → `src/`)

### 1.3 Server Init (Person A + B)
- In `server/` create `pyproject.toml` or `requirements.txt`
- Dependencies: `fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`, `python-jose[cryptography]`, `passlib[bcrypt]`, `python-multipart`
- Create virtual env `python -m venv venv`

### 1.4 Database (Person E)
- Write DDL in `database/schema.sql`
- Write seed script `database/seed.py` (15–20 courses, time slots, 2 test users)
- SQLite db file at `database/app.db`

**Deliverable**: `npm run dev:client` shows Vite default page, `uvicorn` starts and returns `{"status": "ok"}`, seed data importable.

---

## Phase 2: Atom Layer I4 (Hour 3–8) — Parallel Development

> **Core Rule**: Each atom file ~80 lines, forming a complete function. Atoms **MUST NOT import each other**.

### Server I4_atoms (Person A + Person B)

| File | Responsibility | Owner |
|---|---|---|
| `server/src/I4_atoms/db/connection.py` | SQLAlchemy engine, `SessionLocal` factory, `get_db` dependency | A |
| `server/src/I4_atoms/db/models.py` | ORM models: `User`, `Course`, `TimeSlot`, `Review`, `Enrollment` | A |
| `server/src/I4_atoms/types/schemas.py` | Pydantic models: request bodies (`CourseCreate`, `ReviewCreate`, `UserRegister`, `UserLogin`), response bodies (`CourseResponse`, `ReviewResponse`, `UserResponse`, `ScheduleResponse`) | A |
| `server/src/I4_atoms/types/enums.py` | Enums: `DayOfWeek`, `UserRole`, `SortOption` | A |
| `server/src/I4_atoms/helpers/password.py` | `hash_password(plain)` → str, `verify_password(plain, hashed)` → bool | B |
| `server/src/I4_atoms/helpers/jwt_helper.py` | `create_token(user_id, username)` → str, `decode_token(token)` → dict | B |
| `server/src/I4_atoms/helpers/response.py` | `success_response(data, msg)`, `error_response(msg, code)` standard JSON wrapper | B |
| `server/src/I4_atoms/validators/course_validator.py` | `validate_course_code(code)`, `validate_credits(n)` pure functions | B |
| `server/src/I4_atoms/validators/review_validator.py` | `validate_rating(r)`, `validate_comment(text)` pure functions | B |
| `server/src/I4_atoms/validators/schedule_validator.py` | `check_time_conflict(slot_a, slot_b)` → bool pure function | B |

### Client I4_atoms (Person C + Person D)

| File | Responsibility | Owner |
|---|---|---|
| `client/src/I4_atoms/types/course.ts` | `Course`, `TimeSlot`, `Enrollment` interface definitions | C |
| `client/src/I4_atoms/types/user.ts` | `User`, `AuthState`, `LoginRequest`, `RegisterRequest` | C |
| `client/src/I4_atoms/types/review.ts` | `Review`, `ReviewCreate`, `ReviewStats` | C |
| `client/src/I4_atoms/types/api.ts` | `ApiResponse<T>`, `PaginatedResponse<T>`, error types | C |
| `client/src/I4_atoms/utils/api-client.ts` | `fetchApi<T>(url, options)` — fetch wrapper, auto-attach JWT header, JSON parse, error handling | C |
| `client/src/I4_atoms/utils/time-utils.ts` | `formatTimeSlot(slot)`, `hasConflict(slotA, slotB)`, `groupByDay(slots)` | C |
| `client/src/I4_atoms/utils/storage.ts` | `getToken()`, `setToken(t)`, `removeToken()`, `getUser()` | C |
| `client/src/I4_atoms/hooks/useAuth.ts` | `AuthContext` + `useAuth()` hook — login/logout/register/currentUser | D |
| `client/src/I4_atoms/hooks/useCourses.ts` | `useCourses(filters?)` — fetch course list with search/filter support | D |
| `client/src/I4_atoms/hooks/useSchedule.ts` | `useSchedule()` — get/add/remove enrolled courses | D |
| `client/src/I4_atoms/hooks/useReviews.ts` | `useReviews(courseId)` — get/submit reviews | D |
| `client/src/I4_atoms/ui/StarRating.tsx` | Star rating component (display + input mode) wrapping Ant Design `Rate` | D |
| `client/src/I4_atoms/ui/TimeSlotBadge.tsx` | Time slot badge (e.g. "Mon 09:00-10:30 Room A") wrapping `Tag` | D |
| `client/src/I4_atoms/ui/ConflictAlert.tsx` | Conflict warning banner wrapping `Alert` | D |
| `client/src/I4_atoms/ui/LoadingSpinner.tsx` | Loading state component wrapping `Spin` | D |

### Person E: Seed Data + Dev Tools
- Polish `database/seed.py` with realistic data (courses across departments, various time slots, some intentional conflicts)
- Write `database/reset.sh` one-click DB reset script
- Begin writing HTTP test files or Postman collection for manual API testing

**Deliverable**: All atom files independently importable, each with `__init__.py` (Python) or clear exports (TS), ready for upper-layer consumption.

---

## Phase 3: Molecule Layer I3 (Hour 8–14) — Parallel Development

> **Core Rule**: Molecules may ONLY import I4 atoms. Molecules **MUST NOT import/depend on each other**.

### Server I3_molecules (Person A + Person B)

| File | Responsibility | Atoms Used | Owner |
|---|---|---|---|
| `server/src/I3_molecules/auth-service/auth_service.py` | `register(db, data)`, `login(db, data)`, `get_current_user(db, user_id)` | `models`, `schemas`, `password`, `jwt_helper` | A |
| `server/src/I3_molecules/course-service/course_service.py` | `list_courses(db, filters)`, `get_course(db, id)`, `search_courses(db, keyword)` | `models`, `schemas`, `course_validator` | A |
| `server/src/I3_molecules/review-service/review_service.py` | `create_review(db, user_id, data)`, `get_reviews(db, course_id)`, `get_avg_rating(db, course_id)`, `delete_review(db, review_id, user_id)` | `models`, `schemas`, `review_validator` | B |
| `server/src/I3_molecules/schedule-service/schedule_service.py` | `enroll(db, user_id, course_id)`, `drop(db, user_id, course_id)`, `get_schedule(db, user_id)`, `check_conflicts(db, user_id, course_id)` | `models`, `schemas`, `schedule_validator` | B |

### Client I3_molecules (Person C + Person D)

| File | Responsibility | Atoms Used | Owner |
|---|---|---|---|
| `client/src/I3_molecules/auth-form/AuthForm.tsx` | Login/Register toggle form using Ant Design `Form`, `Input`, `Button`; calls `useAuth` | `useAuth`, `User` types | C |
| `client/src/I3_molecules/search-filter/SearchFilter.tsx` | Keyword search + department/credits/time filter bar using `Input.Search`, `Select`, `Slider` | `Course` types | C |
| `client/src/I3_molecules/course-card/CourseCard.tsx` | Course card: name, instructor, credits, avg rating, time slot preview, enroll button | `StarRating`, `TimeSlotBadge`, `Course` types | D |
| `client/src/I3_molecules/course-detail/CourseDetail.tsx` | Full course info: description, all time slots, capacity, enroll action, review entry | `StarRating`, `TimeSlotBadge`, `ConflictAlert`, types | D |
| `client/src/I3_molecules/review-panel/ReviewPanel.tsx` | Review list + submit new review form using `List`, `Form`, `Rate` | `StarRating`, `useReviews`, `Review` types | C |
| `client/src/I3_molecules/schedule-grid/ScheduleGrid.tsx` | Weekly schedule grid (Mon–Fri × 8:00–20:00), enrolled courses shown as color blocks | `TimeSlotBadge`, `time-utils`, `Enrollment` types | D |

### Person E: Integration Testing + API Docs
- Validate each finished endpoint via FastAPI built-in `/docs`
- Write `server/src/I2_coordinators/api-docs/api_spec.py` with custom OpenAPI metadata
- Write basic tests for completed services

**Deliverable**: All business logic and UI components independently usable. Server-side verified via unit tests, client components previewable in a temp page.

---

## Phase 4: Coordinator Layer I2 + Entry Layer I1 (Hour 14–18) — Full Team Integration

### Server I2_coordinators (Person A + Person B)

| File | Role | Responsibility |
|---|---|---|
| `server/src/I2_coordinators/commander/auth_router.py` | Commander | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| `server/src/I2_coordinators/commander/course_router.py` | Commander | `GET /api/courses`, `GET /api/courses/{id}`, `GET /api/courses/search` |
| `server/src/I2_coordinators/commander/review_router.py` | Commander | `POST /api/courses/{id}/reviews`, `GET /api/courses/{id}/reviews`, `DELETE /api/reviews/{id}` |
| `server/src/I2_coordinators/commander/schedule_router.py` | Commander | `GET /api/schedule`, `POST /api/schedule/enroll/{course_id}`, `DELETE /api/schedule/drop/{course_id}` |
| `server/src/I2_coordinators/data-officer/auth_middleware.py` | Data Officer | `get_current_user` FastAPI Depends — parse JWT → user_id |
| `server/src/I2_coordinators/data-officer/error_handler.py` | Data Officer | Global exception handler, unified error response format |
| `server/src/I2_coordinators/diplomat/cors_config.py` | Diplomat | CORS middleware config (allow `localhost:5173`) |
| `server/src/I2_coordinators/api-docs/openapi_config.py` | API Docs | OpenAPI title/description/tags customization |

### Server I1_entry (Person A)

| File | Responsibility |
|---|---|
| `server/src/I1_entry/app.py` | FastAPI instance, mount all routers (prefix), register middleware (CORS/error), `on_startup` create tables |
| `server/src/I1_entry/__main__.py` | `uvicorn.run(app, host, port)` |

### Client I2_coordinators (Person C + Person D)

| File | Role | Responsibility |
|---|---|---|
| `client/src/I2_coordinators/commander/Router.tsx` | Commander | React Router config: `/` → course list, `/course/:id` → detail, `/schedule` → my schedule, `/auth` → login |
| `client/src/I2_coordinators/commander/HomePage.tsx` | Commander | Assemble `SearchFilter` + `CourseCard` list with Ant Design `Layout`, `Row`, `Col` |
| `client/src/I2_coordinators/commander/CourseDetailPage.tsx` | Commander | Assemble `CourseDetail` + `ReviewPanel`, get route params |
| `client/src/I2_coordinators/commander/SchedulePage.tsx` | Commander | Assemble `ScheduleGrid`, show enrolled course stats |
| `client/src/I2_coordinators/commander/AuthPage.tsx` | Commander | Assemble `AuthForm`, redirect after login |
| `client/src/I2_coordinators/data-officer/AuthProvider.tsx` | Data Officer | `AuthContext.Provider` wrapping the app, manage global auth state |
| `client/src/I2_coordinators/data-officer/ProtectedRoute.tsx` | Data Officer | Route guard, redirect to `/auth` if not logged in |
| `client/src/I2_coordinators/diplomat/api.ts` | Diplomat | API endpoint constants + per-endpoint call functions (`loginApi`, `fetchCourses`, `submitReview`, etc.) |
| `client/src/I2_coordinators/diplomat/interceptors.ts` | Diplomat | 401 auto-redirect to login, network error toast |
| `client/src/I2_coordinators/api-docs/api-types.ts` | API Docs | TS interfaces matching backend Pydantic models (reuse I4 types or maintain independently) |

### Client I1_entry (Person C)

| File | Responsibility |
|---|---|
| `client/src/I1_entry/main.tsx` | `ReactDOM.createRoot` + `<App />` |
| `client/src/I1_entry/App.tsx` | `<AuthProvider>` → `<Router>` → `<Layout>` (Ant Design shell) |

**Deliverable**: Frontend and backend fully connected. Browser can access all pages, API calls work, login → browse courses → enroll → review full loop complete.

---

## Phase 5: Polish + Error Handling (Hour 18–22)

### 5.1 UI Polish (Person C + D)
- Ant Design theme customization (brand colors)
- Responsive layout (`Row gutter` + `Col xs/sm/md`)
- Empty state, loading state, error state full coverage
- Schedule grid color differentiation (different courses = different color blocks)

### 5.2 Edge Cases (Person A + B)
- Course full handling (`enrolled_count >= capacity`)
- Time conflict blocks enrollment + friendly warning
- Duplicate review prevention
- Drop course decrements `enrolled_count`
- Input validation error message i18n

### 5.3 UX Optimization (Person E)
- Enroll/drop instant feedback (Ant Design `message.success`)
- Course list pagination or virtual scrolling
- Search debounce (300ms)

---

## Phase 6: Deployment + Demo Prep (Hour 22–24)

### 6.1 Deployment
- Backend: Package FastAPI as single service, deploy to Railway / Render
- Frontend: `npm run build` → static files to Vercel / Netlify
- Database: SQLite ships with backend

### 6.2 Demo Preparation
- 2 test accounts ready (in seed data)
- Demo script: Register → Browse → Search → Enroll (show conflict detection) → View schedule → Submit review → Drop course
- Record 30s GIF as backup

---

## Team Assignment Overview

| Role | Primary Focus | Files Covered (by phase) |
|---|---|---|
| **Person A** | Server data layer + Auth/Course | db, models, schemas, enums → auth-service, course-service → auth_router, course_router → app.py |
| **Person B** | Server utility layer + Review/Schedule | password, jwt, response, validators → review-service, schedule-service → review_router, schedule_router |
| **Person C** | Client types/utils + Auth/Review UI | types, utils, api-client → AuthForm, SearchFilter, ReviewPanel → pages, diplomat, entry |
| **Person D** | Client hooks/UI + Course/Schedule UI | hooks, UI atoms → CourseCard, CourseDetail, ScheduleGrid → pages, providers |
| **Person E** | Data/Quality/Deployment | seed data, testing, API docs, integration verification, deployment |

---

## Validation Checklist

1. **Atom independence**: Each I4 file can be imported standalone without triggering other I4 imports (Python: `python -c "from I4_atoms.helpers.password import hash_password"`; TS: no circular dependency)
2. **Molecule independence**: grep confirms no cross-imports like `from I3_molecules` within I3 files
3. **API smoke test**: `curl` or FastAPI `/docs` page to test all endpoints one by one
4. **End-to-end flow**: Register → Login → Search courses → View detail → Enroll (with conflict detection) → View schedule → Submit review → Drop course
5. **File line count check**: `wc -l server/src/I4_atoms/**/*.py` confirms atom files are in the 60–100 line range

---

## Key Decisions

- **FastAPI over Flask**: Auto-generated OpenAPI docs naturally fit the api-docs layer in the 4-layer architecture; Pydantic provides free request body validation
- **SQLite over PostgreSQL**: Zero config priority in a 24h hackathon; SQLAlchemy abstraction ensures future switchability
- **Ant Design over Tailwind**: Out-of-the-box `Table`, `Form`, `Card`, `Rate`, `Tag` components drastically reduce CSS work for juniors
- **Context + useReducer over Zustand**: Zero extra dependencies, juniors understand React built-in state management more easily
- **One file per service (not classes)**: Pure function style, easier for juniors to test and understand, avoids OOP complexity
