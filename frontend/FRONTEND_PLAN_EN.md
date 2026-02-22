# Frontend Development Plan

> Objective: Fully reflect the capabilities of the 13 backend API endpoints in frontend interactions, resulting in a course selection website (supporting course selection, recommendations, grades, and fun features).
> This plan is divided into phases according to development progress, with testing methods attached at the end of each phase. Language: English.

---

## 0. Current Status Analysis (Read Before Starting)

### 0.1 Backend API Endpoints (All 13, 100% Real DB)

| # | Method | Path | Auth | Return Structure |
|---|--------|------|------|------------------|
| 1 | GET | `/` | No | `{ status, message }` |
| 2 | GET | `/api/courses` | No | `{ courses: CourseResponse[], total: int }` |
| 3 | GET | `/api/courses/{id}` | No | `CourseResponse` (contains time_slots, avg_rating, enrolled_count) |
| 4 | POST | `/api/auth/register` | No | `UserResponse` (201) |
| 5 | POST | `/api/auth/login` | No | `{ access_token, token_type, user: UserResponse }` |
| 6 | GET | `/api/auth/me` | Bearer | `UserResponse` |
| 7 | POST | `/api/schedule/enroll/{course_id}` | Bearer | `{ message, enrollment: {...} }` or 409 Conflict |
| 8 | DELETE | `/api/schedule/drop/{course_id}` | Bearer | `{ message }` |
| 9 | GET | `/api/schedule` | Bearer | `{ schedule: ScheduleEntry[], total_credits }` |
| 10 | GET | `/api/courses/{id}/reviews` | No | `{ reviews: ReviewResponse[], avg_rating, total }` |
| 11 | POST | `/api/courses/{id}/reviews` | Bearer | `ReviewResponse` (201) |
| 12 | DELETE | `/api/reviews/{id}` | Bearer | `{ message }` |
| 13 | GET | `/api/courses/{id}/recommend` | No | `{ course_id, recommendations: RecommendedCourse[] }` |

### 0.2 Existing Frontend Assets

| Category | Content | Status |
|----------|---------|--------|
| API Layer | auth.ts, courses.ts, enrollment.ts, reviews.ts, recommendations.ts | Function signatures written, but **auth.ts path error + Incomplete Token + index.ts only exports courses** |
| Pages | HomePage, AllCoursesPage, CoursePage, CourseSelectionPage, GradePage, CourseTierListPage, DebugPage | Mostly just fetching course lists for display, **enroll/drop only changes local state, no API calls** |
| Fun Widget | Dice Game (Three.js Physics) | ✅ Completed |
| Fun Widget | Roulette Selection (react-custom-roulette) | ✅ Completed, but selection result not submitted to backend |
| Fun Widget | Tier List | ✅ Completed, randomly assigns courses (can change to sort by avg_rating) |
| Fun Widget | PanicButton (Random excuses) | ✅ Completed |
| Types | Course, TimeSlot | Basically aligned, **but missing backend correspondence for enrolled/score** |
| State | No global state | Independent useState per page |

### 0.3 Core Issue List (Must Fix)

| ID | Issue | Impact | Phase |
|----|-------|--------|-------|
| BUG-1 | `auth.ts` path uses `/auth/*` without BASE_URL, Vite has no proxy config → Request sent to Vite dev server → 404 | Authentication completely unusable | P1 |
| BUG-2 | `DEV_AUTH_TOKEN` second half commented out (`.mock_token_for_frontend`), mismatch backend `MOCK_TOKEN` | MOCK Auth fails | P1 |
| BUG-3 | `api/index.ts` only `export * from './courses'`, other modules not exported | Unified import path unusable | P1 |
| BUG-4 | `courses.ts` `extraFilterCourse` transforms period/slot with `% 2 + 1` → Time slot data distortion | Conflict judgement inaccurate | P1 |
| GAP-1 | AllCoursesPage / CoursePage enroll/drop only `setCourses` local state, not calling `enrollInCourse()`/`dropCourse()` API | Selection not persisted | P2 |
| GAP-2 | `getSchedule()` backend returns `{ schedule: ScheduleEntry[], total_credits }` but frontend enrollment.ts destructures as `data.courses` | Schedule data parse error | P2 |
| GAP-3 | Frontend `Course` type has `enrolled: boolean` and `score?: string`, backend `CourseResponse` doesn't have these fields | Need to derive enrolled status from schedule API | P2 |
| GAP-4 | No Login/Register UI Page | User cannot get real JWT | P2 |
| GAP-5 | No Reviews UI (View/Submit/Delete) | reviews API completely idle | P3 |
| GAP-6 | No Recommendations UI | recommend API completely idle | P3 |
| GAP-7 | Tier List randomly assigns courses, not using avg_rating | Not data driven | P4 |
| GAP-8 | Roulette selection result not submitted to backend | Fun feature disconnected from real selection | P3 |

---

## P1: Infrastructure Fixes (Est. 1-2h)

> **Goal**: Fix all API layer Bugs, ensuring frontend can correctly call all 13 backend endpoints. No UI changes in this phase.

### Task List

#### P1-1: Fix auth.ts Request Path + Token

```
File: src/api/auth.ts
Changes:
  1. import BASE_URL (or use "http://localhost:8000/api" directly)
  2. Change all fetch paths from '/auth/*' → '${BASE_URL}/auth/*'
  3. Uncomment second half of DEV_AUTH_TOKEN → Full value:
     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token_for_frontend"
```

#### P1-2: Fix api/index.ts Exports

```
File: src/api/index.ts
Changes:
  export * from './courses';
  export * from './auth';        // New
  export * from './enrollment';  // New
  export * from './reviews';     // New
  export * from './recommendations'; // New
```

#### P1-3: Fix courses.ts extraFilterCourse

```
File: src/api/courses.ts
Changes: Remove or replace the % 2 + 1 transformation for period/slot in extraFilterCourse.
      Backend period range 1-8, slot range 1-4, frontend should use as is.
      If this function is for frontend display simplification, do mapping in UI layer, don't modify raw data.
```

#### P1-4: Fix enrollment.ts Response Destructuring

```
File: src/api/enrollment.ts
Changes:
  In getSchedule():
    Old: return data.courses
    New: return data  // Return full { schedule: ScheduleEntry[], total_credits }
         // Or: return data.schedule.map(entry => entry.course) if you still want Course[]
  
  Sync new TypeScript types:
    interface ScheduleEntry {
      enrollment_id: number;
      course: Course;
      enrolled_at: string;
      finished_status: boolean;
      score: number | null;
    }
    interface ScheduleResponse {
      schedule: ScheduleEntry[];
      total_credits: number;
    }
```

### P1 Test Method

```
Test Type: Manual + Console Verification
Prerequisite: Backend running at localhost:8000

1. Open Browser DevTools → Network Panel
2. Visit AllCoursesPage → Confirm GET /api/courses returns 200 + 77 courses
3. Console execute:
   - import { getCurrentUser } from './api/auth'
   - await getCurrentUser() → Should return { id:1, username:"testuser1", ... }
4. Console execute:
   - import { getSchedule } from './api/enrollment'
   - await getSchedule() → Should return { schedule: [...], total_credits: N }
5. Confirm all Network request targets depend on BASE_URL (not Vite dev server)
6. Confirm no CORS errors
```

---

## P2: Core Enrollment Loop (Est. 3-4h)

> **Goal**: Connect **Register/Login → Browse Courses → Enroll/Drop → View Schedule** complete user flow. This is the core path of the Demo.

### Task List

#### P2-1: Global Auth State Management

```
New File: src/context/AuthContext.tsx
Tech: React Context + useReducer

State:
  {
    user: UserResponse | null,   // Current logged-in user
    token: string | null,        // JWT token
    isAuthenticated: boolean,
    loading: boolean,
  }

Actions:
  - LOGIN_SUCCESS(token, user)  → Save token to localStorage + Set user
  - LOGOUT                      → Clear localStorage + Reset state
  - SET_USER(user)              → Update user info

Expose hooks:
  - useAuth() → { user, token, isAuthenticated, login, logout, register }

Impact on API Layer:
  - getAuthToken() in auth.ts changes to read from localStorage (dev mode fallback DEV_AUTH_TOKEN)
  - All authenticated API calls automatically attach Bearer token
```

#### P2-2: Login/Register Page

```
New File: src/pages/LoginPage.tsx
Route: /login

UI Structure:
  - Tab Switch: Login | Register
  - Login Form: username + password + Submit
  - Register Form: username + email + password + Submit
  - Error Prompt: Ant Design message component
  - Success: navigate('/courses')

Call API:
  - login(username, password) → Get { access_token, user } → AuthContext.login()
  - register(username, email, password) → Auto call login

Quick Login:
  - "Dev Login" Button → One-click login with testuser1/password123 (Hackathon Demo convenience)
```

#### P2-3: Navbar Add User State

```
File: src/components/Navbar.tsx
Changes:
  - Right side: Not logged in → "Login" Button (Link /login)
  - Logged in → Username + "My Schedule" Link + "Logout" Button
  - Logout calls AuthContext.logout()
```

#### P2-4: Enroll/Drop Connect Backend API

```
Involved Files:
  - src/pages/AllCoursesPage.tsx
  - src/pages/CoursePage.tsx
  - src/components/CourseCard.tsx
  - src/components/CourseDetail.tsx

Change Points:
  1. onEnroll(courseId) → Call enrollInCourse(courseId)
     - Success → message.success + Update local enrolled state
     - 409 Conflict → Parse conflicts array, popup conflict course info
       "Time Conflict: Period X, Slot Y conflicts with [Course Name]"
     - 404 → message.error("Course not found")
  2. onDrop(courseId) → Call dropCourse(courseId)
     - Success → message.success + Update local enrolled state
     - 404 → message.error("Course not enrolled")
  3. enrolled state source:
     - Plan A (Simple): Call getSchedule() on page load, generate enrolledCourseIds: Set<number>
     - Plan B (Precise): Maintain enrolledCourseIds in AuthContext, update after every enroll/drop
     → Recommend Plan A (Fast implementation for P2), upgrade to Plan B in P4
```

#### P2-5: Schedule Page (My Schedule)

```
New File: src/pages/SchedulePage.tsx
Route: /schedule

UI Structure:
  - Title: "My Schedule"
  - Total Credits: "Total Credits: {total_credits}"
  - Course List: Render with CourseCard (Add enrolled_at, finished_status checks)
  - Each card has "Drop Course" button
  - Empty Schedule: "No courses enrolled yet. Browse courses →"
  - Time Grid (Optional):
    8 periods × 4 slots grid, filled with enrolled courses
    Visual display of current schedule

Call API:
  - getSchedule() → Render schedule list
  - dropCourse(courseId) → Refresh schedule

Navbar Add:
  - "My Schedule" Menu Item (Only visible when logged in)
```

#### P2-6: Frontend Course Type Adaptation

```
File: src/types/course.ts
Changes:
  1. Course interface align with backend CourseResponse:
     - Remove enrolled field (Derive from schedule API)
     - Remove score field (Get from ScheduleEntry)
  2. New Types:
     interface ScheduleEntry {
       enrollment_id: number;
       course: Course;
       enrolled_at: string;
       finished_status: boolean;
       score: number | null;
     }
     interface ScheduleResponse {
       schedule: ScheduleEntry[];
       total_credits: number;
     }
     interface UserResponse {
       id: number;
       username: string;
       email: string;
       role: string;
       created_at: string;
     }
     interface TokenResponse {
       access_token: string;
       token_type: string;
       user: UserResponse;
     }
     interface ConflictDetail {
       period: number;
       slot: number;
       conflicting_course_id: number;
       conflicting_course_name: string;
     }
```

### P2 Test Method

```
Test Type: E2E Manual Test (Follow Demo Path)

Prerequisite: Backend running + DB seeded

Flow 1 — Login + Browse + Enroll:
  1. Visit /login → Click "Dev Login" (testuser1/password123)
  2. Navbar shows "testuser1" + "My Schedule" + "Logout"
  3. Visit /courses → Shows 77 courses
  4. Click any course card → Details page → Click "Take Course"
  5. Network Panel confirm POST /api/schedule/enroll/{id} returns 200
  6. message.success popup
  7. Visit /schedule → See newly enrolled course + Correct credits

Flow 2 — Conflict Detection:
  1. Pick a course occupying Period 1 Slot 2
  2. Pick another course also Period 1 Slot 2
  3. Conflict prompt should appear, showing conflicting course name
  4. Network Panel confirm 409 response

Flow 3 — Drop Course:
  1. Click "Drop Course" in /schedule page
  2. Network Panel confirm DELETE returns 200
  3. Course disappears from list, credits decrease

Flow 4 — Register New User:
  1. Logout → Visit /login → Switch "Register" Tab
  2. Fill newstudent / newstudent@liu.se / password123 → Submit
  3. Auto login → Navbar shows "newstudent"
  4. Visit /schedule → Empty schedule

Flow 5 — Regression:
  1. Home PanicButton still clickable + excuse popup
  2. Course Roulette (/selection) still spins
  3. Grade Page (/grade) dice still throwable
```

---

## P3: Reviews + Recommendations + Fun Features (Est. 3-4h)

> **Goal**: Integrate reviews and recommendations API, perfecting CoursePage details as "One-stop Course Info Center". Connect Roulette selection result to backend.

### Task List

#### P3-1: CoursePage Integration with Review System

```
File: src/pages/CoursePage.tsx + New Components

Change Points:
  CoursePage details add two new sections:

  1. Review List Area:
     - Call getCourseReviews(courseId)
     - Display: Username, Rating (Stars), Comment, Created Time
     - Average Rating Display (User avg_rating field)
     - If comment belongs to current user → Show "Delete" button
     - Delete → deleteCourseReview(courseId, reviewId) → Refresh list

  2. Submit Review Form:
     - Prerequisite: Logged in (Not logged in show "Login to review")
     - Rating: 1-5 Stars (Ant Design Rate component)
     - Comment: TextArea (Optional)
     - Submit → addCourseReview(courseId, rating, comment)
     - 409 Duplicate Review → message.warning("You have already reviewed this course")
     - Success → Refresh review list

New Components:
  src/components/ReviewSection.tsx  — Review List + Submit Form
  src/components/ReviewCard.tsx     — Single Review Card
```

#### P3-2: CoursePage Integration with Recommendation System

```
File: src/pages/CoursePage.tsx + New Components

Change Points:
  CoursePage details add "Students who took this course also took" section:
  - Call getCourseRecommendations(courseId)
  - Display recommended course cards (code, name, credits, co_enroll_count)
  - Each card clickable to jump to corresponding course detail page
  - co_enroll_count display as "N students also took this course"
  - Show "No recommendation data" when empty

New Components:
  src/components/RecommendationSection.tsx — Recommended Course List
```

#### P3-3: Roulette Selection Connect Backend

```
File: src/components/rouletteSelection/CourseRoulette.tsx

Change Points:
  Current: Wheel selected course only adds to local selectedCourses state
  Change to:
    1. Initial State Optimization (New):
       - Don't load all courses to wheel initially (avoid overcrowding)
       - Show "Generate Random Courses" button
       - Click to randomly select 12-15 courses from valid courses as candidate pool
       - These courses show on wheel for user to select
       - User can regenerate different random subset
    
    2. Wheel Stop → Pop Confirm Box "Selected [Course Name], Confirm Enroll?"
    
    3. Confirm → enrollInCourse(courseId)
       - 200 → message.success + Add to selectedCourses
       - 409 Conflict → Show conflict info + Don't add to list (but keep in pool to let user know)
       - Need Login: Not logged in click SPIN → Prompt "Please login first"
    
    4. selectedCourses Sync from getSchedule() initial value (on page load)

Extra Improvements:
  - filterValidCourses logic already implemented in frontend (Keep)
  - Backend also does conflict detection (Double insurance)
  - Random subset size configurable (Default 12-15 courses)
```

#### P3-4: Grade Page (GradePage) Connect Backend

```
File: src/pages/GradePage.tsx + src/components/CourseGrade.tsx

Change Points:
  Current: Filter courses enrolled=true to show grade
  Change to:
    1. Call getSchedule() to get enrolled course list
    2. Filter finished_status=true courses
    3. Grade Source: ScheduleEntry.score (Backend 0-100 integer)
    4. Convert to Swedish Grade: 0-49→U, 50-69→3, 70-84→4, 85-100→5
    5. Dice game logic unchanged (Use random grade to simulate "Fate Changing" fun experience)
    6. If score is null (unfinished) → Show "In Progress"
```

#### P3-5: Fun Selection: Course Battle

```
New File: src/pages/CourseBattlePage.tsx + src/components/CourseBattle/BattleCard.tsx
Route: /battle

Change Points:
  Add a Tinder-like / Duel fun selection mode:
  1. Initial: Randomly select two courses to display on left and right cards.
  2. Interaction: User taps to choose preferred course (Winner).
  3. Recommendation Supplement: 
     - Eliminate unselected course.
     - Call getCourseRecommendations(WinnerID) to get similar recommended courses.
     - Pick an unseen course from recommendations as new challenger.
     - If recommendations empty or exhausted, random new course.
  4. Rounds: Set total rounds (e.g. 5 or 10).
  5. Final Result: After rounds, the last standing course is "User's Favorite".
  6. Enroll Action: Result page shows winner course, "Enroll Now" button calls enrollInCourse(courseId).
     - Success → message.success
     - Conflict → Prompt conflict info

Navbar Add:
  - "Course Battle" Menu Item
```

### P3 Test Method

```
Test Type: Functional Test + API Response Verify

Flow 1 — Reviews CRUD:
  1. Login testuser1 → Visit any course detail /course/1
  2. Review List Load: Network confirm GET /api/courses/1/reviews returns 200
  3. If history reviews exist → Review card displays correctly
  4. Submit New Review: Pick 4 stars + Write comment → Submit
     - Network confirm POST /api/courses/1/reviews 201
     - List refresh, new review appears at top
  5. Submit again → 409 → message.warning
  6. Delete own review → Network confirm DELETE /api/reviews/{id} 200
     - Review disappears from list

Flow 2 — Recommendation:
  1. Visit course detail with enrollment history
  2. "Students who took this also took" section loads
  3. Network confirm GET /api/courses/{id}/recommend 200
  4. Recommended course card clickable

Flow 3 — Roulette Selection:
  1. Login → Visit /selection
  2. Initial: Show "Generate Random Courses" button
  3. Click "Generate Random Courses" → Wheel shows 12-15 random courses
  4. Verify wheel course count reasonable
  5. SPIN → Stop → Confirm Box
  6. Confirm → Network POST /api/schedule/enroll → 200 → message.success
  7. Spin again → Pick conflicting course → 409 → Conflict info
  8. Test Regenerate: Click "Generate Random Courses" again
  9. Not logged in SPIN → Prompt login

Flow 4 — Grade Page:
  1. Login → Enroll few courses → Visit /grade
  2. Network confirm GET /api/schedule 200
  3. Only show finished_status=true courses (if seeded)
  4. Dice game still playable

Flow 5 — Course Battle:
  1. Login → Visit /battle
  2. Page shows two initial course cards.
  3. Click one, other replaced.
  4. Network confirm GET /api/courses/{id}/recommend called.
  5. Reach round limit.
  6. Page shows winner, "Enroll Now" button.
  7. Click Enroll → Network POST /api/schedule/enroll → 200 → message.success.

Regression:
  - /courses list loads normal
  - /course/:id detail page contains new review and recommendation sections
```

---

## P4: Data Driven + Experience Polish (Est. 2-3h)

> **Goal**: Drive remaining fun features with real data, perfect full site experience, final prep for Demo.

### Task List

#### P4-1: Tier List Data Driven

```
File: src/components/tierlist/Tierlist.tsx

Change Points:
  Current: useEffect Math.random() assigns courses to S-F tiers
  Change to: Tier by avg_rating
    - S: avg_rating >= 4.5
    - A: avg_rating >= 4.0
    - B: avg_rating >= 3.5
    - C: avg_rating >= 3.0
    - D: avg_rating >= 2.5
    - E: avg_rating >= 2.0
    - F: avg_rating < 2.0 or null (No rating)
  
  Interaction Enhance (Optional):
    - Drag and drop sort (User custom Tier rank)
    - Click course code → Jump to details
```

#### P4-2: AllCoursesPage Filtering Enhance

```
File: src/pages/AllCoursesPage.tsx

Change Points:
  Backend supports 5 filter params: keyword, department, credits, period, slot
  Frontend add Filter UI:
    - Search Box: keyword (Input.Search, debounce 300ms)
    - Dropdown: department (Ant Design Select, distinct from course list)
    - Number: credits (Select: 6/8/12/All)
    - Period: 1-8 Multiple Select
    - Slot: 1-4 Multiple Select
  
  Call Method:
    GET /api/courses?keyword=machine&period=2&slot=1
    All filter params verify query string pass to backend
```

#### P4-3: DebugPage Implementation

```
File: src/pages/DebugPage.tsx

Changes:
  - "Reset User State" → logout + Clear localStorage
  - "Assign Random Courses" → Random pick 3 courses → Chain call enrollInCourse()
  - Add "Reset Database" Button (Optional, call backend reset script)
  - Add "API Health Check" → Call GET / Show connection status
  - Show current Token, User Info, Enrolled Count debug info
```

#### P4-4: Global Enrolled State Management (Upgrade)

```
File: src/context/AuthContext.tsx (or new src/context/ScheduleContext.tsx)

Changes:
  P2 Phase Plan A (Call getSchedule every page load) Upgrade to Plan B:
  - ScheduleContext maintains enrolledCourseIds: Set<number>
  - Auto call getSchedule() init after login
  - enroll Success → add(courseId)
  - drop Success → delete(courseId)
  - All pages/components use useSchedule() to get enrolled state
  - CourseCard shows enrolled marker based on enrolledCourseIds.has(id)

Benefits:
  - Avoid repeating getSchedule() calls
  - Instant reflect across site after enroll/drop (no refresh needed)
```

#### P4-5: Schedule Visualization (Time Grid)

```
New File: src/components/ScheduleGrid.tsx
Integrate to: src/pages/SchedulePage.tsx

UI:
  8 Rows (Period 1-8) × 4 Columns (Slot 1-4) Grid
  Enrolled courses fill corresponding cells:
    - Bg Color: getColorForCourse(course)
    - Show: Course Code
    - Click: Jump to Details
  Empty Slot: Gray Dashed Line
  Visual: At-a-glance schedule distribution
```

### P4 Test Method

```
Test Type: Functional Verify + Demo Walkthrough

1. Tier List Verify:
   - Visit /tiers → Courses tiered by avg_rating
   - High rating in S/A, Low in D/E/F
   - Click course code jumps to details

2. Filter Function Verify:
   - /courses page input "machine" → Only show machine related
   - Network confirm query string passed
   - Multi-condition combination correct

3. DebugPage Verify:
   - Reset User State → Logout + Navbar restore
   - Assign Random Courses → 3 courses enrolled → /schedule visible

4. Global State Verify:
   - /courses Enroll → No refresh visit /selection → Wheel excludes just selected course (conflict)
   - /schedule Drop → Return /courses → Card enrolled marker disappears

5. Schedule Grid Verify:
   - /schedule page shows 8×4 grid
   - Enrolled courses in correct period-slot
   - Color consistent with CourseCard
```

---

## P5: Demo Preparation + Final Integration Test (Est. 1-2h)

> **Goal**: Ensure Demo path smooth, fix bugs, prepare presentation environment.

### Task List

#### P5-1: Demo Path Scripting

```
Prepare a Demo Flow:
  1. Home Display → "Welcome to CYBER LISAM" + PanicButton
  2. Login(Dev Login) → Navbar Change
  3. Browse Courses (/courses) → Search "Machine Learning"
  4. Course Detail → Reviews (Stars+Com)+ Recommendations
  5. Enroll → Success Popup
  6. Enroll Conflict → Conflict Popup
  7. Schedule Page → 8×4 Grid Visual
  8. Roulette → SPIN → Confirm → Auto Enroll
  9. Tier List → Data Driven Ranking
  10. Grade Page → Dice Fate
  11. PanicButton → Random Excuse

Ensure no loading lag, no console error in each step.
```

#### P5-2: Error Boundary + Empty State

```
Global:
  - Backend unavailable → Friendly Error (Not Blank Page)
  - API Timeout → Retry / Prompt User
  
Page Level:
  - /schedule Empty → "No courses yet" + Guide
  - /course/:id No Reviews → "Be the first to review!"
  - /course/:id No Recommend → "No recommendations yet"
  - /tiers No Rating Data → All in F + Prompt "Add reviews to see ratings"
```

#### P5-3: UI Consistency Check

```
- All pages color consistent (Global bg #80dcf3 Sky Blue)
- Loading State: Unified LoadingSpinner
- Error Prompt: Unified Ant Design message
- Button Style: Unified Ant Design Button
- Responsive: Check Mobile Usability (Ant Design Grid xs/sm/md/lg)
```

### P5 Test Method

```
Test Type: Full Demo Walkthrough × 3 times

Walkthrough 1 — Normal Path:
  Strictly follow P5-1 Demo Flow, record any lag or error

Walkthrough 2 — Exception Path:
  - Unauthorized access to protected features
  - Enroll → Drop → Enroll same course again
  - Massive rapid actions (Spin 5 times quickly)
  - State retention after refresh

Walkthrough 3 — Backend Down:
  - Stop backend → Friendly prompt on frontend?
  - Restart backend → Frontend auto recover?

Acceptance Criteria:
  ✅ 13 Backend APIs at least 1 call point
  ✅ Demo Path 0 error, 0 lag
  ✅ 3 Fun Features demoable
  ✅ Data Driven (No Hardcode)
```

---

## P6: Hexagon Radar Chart Visualization

> **Goal**: Expand course reviews from single star rating to 6 dimensions, using hexagon radar chart for intuitive display.

### Task List

#### P6-1: Update Frontend Type Definitions

```
File: src/types/course.ts
Changes:
  1. Course interface add 6 dimension avg scores:
     avg_workload?: number;
     avg_difficulty?: number;
     avg_practicality?: number;
     avg_grading?: number;
     avg_teaching_quality?: number;
     avg_interest?: number;
  2. ReviewResponse and ReviewCreate interface add 6 dimension rating fields (1-5).
```

#### P6-2: Import Chart Lib & Create Radar Component

```
New File: src/components/CourseRadarChart.tsx
Tech: recharts (or @ant-design/charts)
Changes:
  1. npm install recharts
  2. Create CourseRadarChart component, prop: Course.
  3. Map 6 dimension avg scores to chart data format.
  4. Render RadarChart, set colors, grid, labels.
  5. Handle empty data state.
```

#### P6-3: Integrate Radar Chart to Course Detail

```
File: src/components/CourseDetail.tsx (or src/pages/CoursePage.tsx)
Changes:
  1. Import CourseRadarChart component.
  2. Display radar chart in prominent position (Top Right or Separate Card).
  3. Replace or Optimize original complex text stats.
```

#### P6-4: Review Form Support 6 Dimensions

```
File: src/components/ReviewSection.tsx
Changes:
  1. Modify submit form, expand single Rate to 6 dimension Rates (or Sliders).
  2. Add label for each dimension (Workload, Difficulty, etc.).
  3. Bundle 6 scores on submit.
```

#### P6-5: Review Card Display Dimension Context

```
File: src/components/ReviewCard.tsx
Changes:
  1. In single review card, besides comment, show user's 6 specific scores in compact way (Mini Radar, Progress Bar, or Tags).
```

---

## Phase Dependencies

```
P1 (Infrastructure Fixes)
 │
 ▼
P2 (Core Enrollment Loop)  ←── Minimum Demoable Version
 │
 ├──→ P3 (Reviews + Recommendations + Fun Features)
 │
 ├──→ P4 (Data Driven + Polish)  ← P3, P4 Parallel
 │
 └──→ P6 (Radar Chart)  ← Depends on P3 Reviews & Backend P5
       │
       ▼
      P7 (Hackathon Wow Factor Visual Upgrade)
       │
       ▼
      P5 (Demo Prep)
```

**Minimum Demoable = After P1 + P2 (Est. 5h)**: User can Login→Browse→Enroll→Drop→Schedule.

**Full Version = P1-P4, P6, P7 Completed (Est. 18h)**: Plus Reviews, Recommendations, Data Driven Tier List, Filtering, Schedule Grid, Radar Chart, and Cyberpunk Visuals.

---

## P7: Hackathon Wow Factor (Visual & Interaction Upgrade - Hackathon Champion Edition)

> **Goal**: Apply "Hackathon Champion" perspective to upgrade current plain frontend with "Wow Factor". Hackathon judges usually only have 2-3 minutes, the first 10 seconds determine life or death. We need Cyberpunk/Dark Neon aesthetics, micro-interactions, gamified motion, and easter eggs.

### Task List

#### P7-1: Global Dark Neon Theme
```
File: src/index.css, src/App.tsx
Change Points:
  1. Discard plain white/blue bg, switch to deep dark (`#0f172a` or `#000000`).
  2. Introduce high saturation Neon accents (Cyan `#00f3ff`, Magenta `#ff003c`, Electric Purple `#b026ff`).
  3. Font Upgrade: Headings use futuristic font (`Orbitron` or `Space Grotesk`), Body uses `Inter`.
  4. Card and containers add Glow Effects and Glassmorphism.
```

#### P7-2: Silky Page Transitions & Micro-interactions (Framer Motion)
```
File: src/App.tsx, Page Components
Change Points:
  1. Introduce `framer-motion`.
  2. Add silky fade/slide transitions on route change.
  3. List rendering (CourseList) add Staggered Fade-in.
  4. Buttons and Cards add Hover Physics Feedback (Scale, Shadow, Glow).
```

#### P7-3: Gamification UI Remodel
```
File: src/pages/CourseBattlePage.tsx, src/components/rouletteSelection/CourseRoulette.tsx
Change Points:
  1. **Course Battle**: Fighting game character select style. Huge flashing "VS" text. "Shatter" effect when eliminating.
  2. **Roulette**: Casino style marquee border, sound effects, screen shake, full screen Confetti on win.
  3. **Tier List**: Smash Bros style Tier List visuals. S Tier Gold/Red, F Tier Gray.
```

#### P7-4: Hero Section Visual Impact
```
File: src/pages/HomePage.tsx
Change Points:
  1. Hero Section dynamic background (Three.js particles, fluid gradient, or CSS dynamic grid).
  2. Huge Typewriter effect or Glitch effect Slogan: "Survive LISAM. Choose Your Destiny."
  3. Core CTA Buttons with breathing effect.
```

#### P7-5: Surprise Easter Eggs
```
File: Global
Change Points:
  1. **Panic Button Upgrade**: Red flash or alarm animation.
  2. **Loading State**: Geek style terminal code scroll or Neon custom loader.
  3. **Enroll Success Feedback**: Enrolling success triggers `canvas-confetti` particle explosion.
```

---

## File Change Overview

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| P1 | — | api/auth.ts, api/index.ts, api/courses.ts, api/enrollment.ts |
| P2 | context/AuthContext.tsx, pages/LoginPage.tsx, pages/SchedulePage.tsx, types/course.ts(Extend) | App.tsx, Navbar.tsx, AllCoursesPage.tsx, CoursePage.tsx, CourseCard.tsx, CourseDetail.tsx |
| P3 | components/ReviewSection.tsx, components/ReviewCard.tsx, components/RecommendationSection.tsx, pages/CourseBattlePage.tsx, components/CourseBattle/BattleCard.tsx | CoursePage.tsx, CourseRoulette.tsx, GradePage.tsx, CourseGrade.tsx, App.tsx, Navbar.tsx |
| P4 | components/ScheduleGrid.tsx, context/ScheduleContext.tsx | Tierlist.tsx, AllCoursesPage.tsx, DebugPage.tsx |
| P6 | components/CourseRadarChart.tsx | types/course.ts, CourseDetail.tsx, ReviewSection.tsx, ReviewCard.tsx |
| P5 | — | Global Bug Fixes |

---

## Backend API → Frontend Call Point Mapping (Final State)

| Backend Endpoint | Frontend Call Point |
|------------------|---------------------|
| GET `/` | DebugPage (Health Check) |
| GET `/api/courses` | AllCoursesPage, CourseSelectionPage, GradePage, CourseTierListPage |
| GET `/api/courses/{id}` | CoursePage |
| POST `/api/auth/register` | LoginPage (Register Tab) |
| POST `/api/auth/login` | LoginPage (Login Tab + Dev Login) |
| GET `/api/auth/me` | AuthContext (Init Logged-in User) |
| POST `/api/schedule/enroll/{id}` | CoursePage, CourseRoulette, DebugPage |
| DELETE `/api/schedule/drop/{id}` | CoursePage, SchedulePage |
| GET `/api/schedule` | SchedulePage, GradePage, AuthContext/ScheduleContext |
| GET `/api/courses/{id}/reviews` | CoursePage → ReviewSection |
| POST `/api/courses/{id}/reviews` | CoursePage → ReviewSection |
| DELETE `/api/reviews/{id}` | CoursePage → ReviewSection |
| GET `/api/courses/{id}/recommend` | CoursePage → RecommendationSection, CourseBattlePage |

**13/13 Endpoints Called ✅**
