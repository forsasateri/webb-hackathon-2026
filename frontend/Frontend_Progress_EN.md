# Frontend Development Progress

## P1: Infrastructure Fixes ✅ Completed

### Fix Checklist

#### P1-1: Fix auth.ts Request Path + Token
- **File**: `src/api/auth.ts`
- **Issue**: All fetch paths used `/auth/*` without `BASE_URL`, requests were sent to Vite dev server → 404; Second half of `DEV_AUTH_TOKEN` was commented out, mismatching backend `MOCK_TOKEN`.
- **Fix**:
  - Imported `BASE_URL`, changed all paths to `${BASE_URL}/auth/*`.
  - Restored full Token value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token_for_frontend`
  - `getAuthToken()` prioritizes reading from `localStorage`, fallback to `DEV_AUTH_TOKEN`.

#### P1-2: Fix api/index.ts Exports
- **File**: `src/api/index.ts`
- **Issue**: Only exported `courses`, other modules were not exported.
- **Fix**: Added exports for `auth`, `enrollment`, `reviews`, `recommendations`.

#### P1-3: Fix courses.ts extraFilterCourse
- **File**: `src/api/courses.ts`
- **Issue**: `extraFilterCourse` applied `% 2 + 1` transformation to period/slot, compressing 24 different time slots into 4, causing false conflicts and display distortion.
- **Root Cause Analysis**:
  - Backend period range 1-6, slot range 1-4 (total 24 combinations).
  - After modulo, period and slot both became 1-2 (only 4 combinations).
  - Each modulo combination corresponded to 6 different original time slots, making conflict judgment completely invalid.
- **Fix**: Removed modulo logic, passing backend data as is.

#### P1-4: Fix enrollment.ts Response Destructuring
- **File**: `src/api/enrollment.ts`
- **Issue**: `getSchedule()` destructured as `data.courses`, but backend returns `{ schedule, total_credits }`.
- **Fix**:
  - Return full `ScheduleResponse` object.
  - Added types: `ScheduleEntry`, `ScheduleResponse`, `EnrollResponse`, `ConflictDetail`.
  - `enrollInCourse`/`dropCourse` added error message parsing (status code + error data).

#### Additional: Update TimeSlot Type Annotation
- **File**: `src/types/course.ts`
- **Fix**: Changed `period` annotation from `1, 2, 3, or 4` to `1-6` (matching backend actual data).

### Test Results

Test Script: `frontend/test_frontend.sh` — **15/15 Passed**

| # | Test Item | Result |
|---|-----------|--------|
| T1 | `GET /` Health check | ✅ |
| T2 | `GET /api/courses` Returns 77 courses | ✅ |
| T3 | `GET /api/courses/1` time_slots Not tampered | ✅ |
| T4 | `GET /api/auth/me` Full MOCK_TOKEN authentication | ✅ |
| T5 | Incomplete Token correctly returns 401/403 | ✅ |
| T6 | `POST /api/auth/login` Returns token + user | ✅ |
| T7 | `GET /api/schedule` Response contains schedule + total_credits | ✅ |
| T8 | `GET /api/courses/1/reviews` Response structure correct | ✅ |
| T9 | `GET /api/courses/1/recommend` Response structure correct | ✅ |
| T10 | Enroll/Drop round trip test | ✅ |

### TypeScript Compilation
- `npx tsc --noEmit` → Zero errors

---

## Subsequent Phases

| Phase | Status | Description |
|-------|--------|-------------|
| P1 Infrastructure Fixes | ✅ Completed | API layer fully usable |
| P2 Core Enrollment Loop | ✅ Completed | Login/Register UI, Enrollment connected to backend, Schedule page |
| P3 Reviews + Recommendations + Fun Features | ✅ Completed | Reviews CRUD, Recommendations display, Roulette connected to backend, Course Battle |
| P4 Data Driven + Experience Polish | 🔄 Partial | AllCoursesPage Pagination, CourseCard Radar Chart, AllCoursesPage Filtering (Tier List data-driven, schedule grid pending) |
| P6 Hexagon Radar Chart Visualization | ✅ Completed | CourseRadarChart component, BattleCard + CourseCard integrated with radar chart |
| P7 Hackathon Wow Factor | ✅ Completed | Cyberpunk dark theme, Framer Motion effects, Gamified UI, Home page dynamic background, Easter eggs |
| P5 Demo Preparation | ⬜ Not Started | Error boundaries, UI consistency, Demo walkthrough |

---

## P4-2: AllCoursesPage Course Filtering ✅ Completed

> **Goal**: Based on the backend `GET /api/courses` actual filter parameters (keyword, department, credits, period, slot), add complete filtering functionality to the frontend AllCoursesPage. Filter UI is placed below the "All Available Courses" title, consistent with the existing Cyberpunk dark theme.

### Completed Tasks

#### P4-2-1: API Layer Extension — `getAllCourses` with Filter Parameters ✅
- **File**: `src/api/courses.ts`
- **Changes**:
  - `getAllCourses` signature extended from `() => Promise<Course[]>` to `(filters?) => Promise<Course[]>`
  - Supports 5 optional filter parameters: `keyword`(string), `department`(string), `credits`(number), `period`(number[]), `slot`(number[])
  - Uses `URLSearchParams` to build query string; `period` and `slot` are multi-value params (multiple `append` calls)
  - Appended to `${BASE_URL}/courses?...` for the request

#### P4-2-2: AllCoursesPage Filter State Management + Debounce ✅
- **File**: `src/pages/AllCoursesPage.tsx`
- **Changes**:
  - Added custom `useDebounce` hook (300ms delay) for keyword search debouncing
  - Added 5 filter states: `keyword`, `department`, `credits`, `period`, `slot`
  - Added `departments` state, dynamically extracted from course data as sorted unique department list
  - `useEffect` dependency array includes all filter states; filter changes automatically re-fetch from backend API
  - Empty filter parameters are not sent (`undefined`), backend returns all courses

#### P4-2-3: Filter UI Components — Embedded Below CourseList Title ✅
- **Files**: `src/components/CourseList.tsx`, `src/pages/AllCoursesPage.tsx`
- **Changes**:
  - `CourseList` component added `filterComponent?: React.ReactNode` prop
  - Filter UI renders below "All Available Courses" title and above course cards (`marginBottom: 30px`)
  - Uses Ant Design `Row` + `Col` layout, 5 filter controls in one row:
    - **Search** (Col span=6): `Input.Search`, placeholder "Search courses...", real-time input + `allowClear`
    - **Department** (Col span=4): `Select` single-select, placeholder "Department", options dynamically extracted from course data, `allowClear`
    - **Credits** (Col span=4): `Select` single-select, placeholder "credit", options 6/8/12, `allowClear`
    - **Period** (Col span=5): `Select` multi-select (`mode="multiple"`), placeholder "Period (1-8)", options 1-8, `allowClear`
    - **Slot** (Col span=5): `Select` multi-select (`mode="multiple"`), placeholder "Slot (1-4)", options 1-4, `allowClear`
  - Filter controls background color matches page background (white `#ffffff`), blending with existing Cyberpunk theme

### File Change Overview

| File | Change Type | Description |
|------|-------------|-------------|
| `src/api/courses.ts` | Enhance | `getAllCourses` supports 5 optional filter params, URLSearchParams query string |
| `src/pages/AllCoursesPage.tsx` | Enhance | Filter state management + useDebounce hook + filter UI via filterComponent prop |
| `src/components/CourseList.tsx` | Enhance | Added `filterComponent` prop, rendered below title |

### TypeScript Compilation
- Zero errors

---

## P7: Hackathon Wow Factor (Visual & Interaction Upgrade) ✅ Completed

> **Goal**: Introduce Cyberpunk/Dark Neon aesthetics, micro-interactions, gamified motion effects, and easter eggs to make the entire page visually striking and create a Hackathon Champion-level visual experience.

### Completed Tasks

#### P7-1: Global Dark Neon Theme ✅
- **File**: `src/index.css` (Completely rewritten)
- **Changes**:
  - CSS Custom Properties system: `--neon-cyan`, `--neon-magenta`, `--bg-primary`, `--bg-card`, `--text-primary`, etc.
  - Google Fonts: Orbitron (Headings/Display) + Inter (Body).
  - Dark background `#0a0e1a`, Glassmorphism card `rgba(17,24,39,0.65)` + `backdrop-filter: blur(16px)`.
  - Comprehensive coverage of Ant Design dark styles (Menu, Card, Button, Input, Modal, Tabs, Pagination, Select, Tag, Progress, Rate, Empty, etc.).
  - Neon glowing borders, hover suspension effects, gradient buttons.
- **Inline Style Updates in Components**:
  - `Navbar.tsx`: Dark glass header + Cyan Logo glow.
  - `LoginPage.tsx`: Orbitron title + Cyan Dev Login.
  - `CourseCard.tsx`: Dark text variables + Green enrolled marker.
  - `CourseDetail.tsx`: Orbitron title + Golden rating glow + Breathing enroll button.
  - `CourseList.tsx`: Orbitron title.
  - `BattleCard.tsx`: Dark card background + Neon border + Gradient select button.
  - `ReviewCard.tsx`: CSS variable text colors.
  - `ReviewSection.tsx`: Dark form background.
  - `RecommendationSection.tsx`: Relies on global Ant Design overrides.
  - `CourseGrade.tsx`: Orbitron title + CSS variable colors.
  - `CourseRadarChart.tsx`: Dark radar chart (Cyan lines/grid, Dark tooltip).
  - `NotFound.tsx`: Orbitron title.
  - `CourseSelectionPage.tsx`: Orbitron title + Dark text.
  - `DebugPage.tsx`: Orbitron title.
  - `SchedulePage.tsx`: Cyan credit tag + Dark card.

#### P7-2: Silky Page Transitions ✅
- **File**: `src/App.tsx`
- **Changes**:
  - Added `AnimatedRoutes` component, wrapped routes with `<AnimatePresence mode="wait">` + `<motion.div>`.
  - `pageVariants`: opacity + y displacement + blur filter transition.
  - `pageTransition`: tween type, easeInOut, 0.35s.
  - Added `cyber-grid-bg` animated grid to background.
  - Main content area uses glass container + Cyan border glow.
- **List Animations**: `CourseList.tsx`, `SchedulePage.tsx` — Staggered fade-in for each card (delay = index × 0.05s).
- **Hover Physics Feedback**: `CourseCard.tsx` — `motion.div whileHover={{ y: -4 }}`.

#### P7-3: Gamified UI Remodel ✅
- **Course Battle**: `CourseBattlePage.tsx`
  - `AnimatePresence` card swap animation (Left slides in from -50px, Right slides in from +50px).
  - VS text uses `vs-flash` CSS animation + Orbitron 48px.
  - Result phase triggers `confetti()` colored particles (#00f0ff, #ff00ff, #39ff14).
  - Gradient progress bar `strokeColor`.
  - cyber-loader replaces Spin loading.
- **Roulette**: `CourseRoulette.tsx`
  - `roulette-frame` Neon marquee border (conic-gradient animation rotation).
  - Successful enrollment triggers `confetti()`.
  - Orbitron title + Breathing generate button.
- **Tier List**: `TierCategory.tsx`
  - Neon glow for each rank: S(Gold), A(Green), B(Cyan), C(Blue), D(Purple), E(Orange), F(Red).
  - Orbitron font rank labels.
  - Dark border and background.

#### P7-4: Home Page Visual Impact ✅
- **File**: `src/pages/HomePage.tsx` (Completely rewritten)
- **Changes**:
  - Glitch Art Slogan: `<h1 className="glitch" data-text="BETTER LISAM">` + CSS `clip-path` jitter.
  - Cyberpunk Subtitle: "Survive the system. Choose your destiny."
  - Three CTA Buttons: Browse Courses (Cyan breathing), Spin the Wheel (Purple), Course Battle (Magenta).
  - `motion.div` Staggered entrance animation (Title → Subtitle 0.3s → Buttons 0.5s → Panic 0.8s).

#### P7-5: Surprise Easter Eggs ✅
- **Panic Button**: `PanicButton.tsx`
  - Magenta→Purple gradient button.
  - Triggers full-screen red flashing overlay (`panic-flash` animation).
  - Modal uses Orbitron title + Red glow.
- **Geek Style Loading Animation**: `LoadingSpinner.tsx`
  - Replaced Ant Design `<Spin>` with custom cyber-loader (5 pulse bars).
  - "Loading..." Orbitron Cyan glowing text.
- **Enrollment Success Particle Explosion**:
  - `AllCoursesPage.tsx`: Enrollment success `confetti()` neon colors.
  - `CoursePage.tsx`: Enrollment success `confetti()` neon colors.
  - `CourseRoulette.tsx`: Roulette enrollment success `confetti()`.
  - `CourseBattlePage.tsx`: Battle Champion `confetti()`.

### File Change Overview

| File | Change Type | Description |
|------|-------------|-------------|
| `src/index.css` | Complete Rewrite | Cyberpunk Dark Theme + Ant Design Overrides + Animations |
| `src/App.tsx` | Refactor | framer-motion Page Transitions + Glass Container |
| `src/pages/HomePage.tsx` | Complete Rewrite | Glitch Art + Breathing CTA + Staggered Animations |
| `src/components/Navbar.tsx` | Enhance | Dark Glass Header + Neon Logo |
| `src/components/LoadingSpinner.tsx` | Complete Rewrite | cyber-loader Pulse Bars |
| `src/components/PanicButton.tsx` | Enhance | Red Flash Overlay + Gradient Button |
| `src/pages/CourseBattlePage.tsx` | Refactor | AnimatePresence + VS flash + confetti |
| `src/components/CourseBattle/BattleCard.tsx` | Enhance | Neon Card + Gradient Button |
| `src/components/CourseCard.tsx` | Enhance | motion hover + Dark Variables |
| `src/components/CourseList.tsx` | Enhance | Staggered fade-in Animation |
| `src/components/rouletteSelection/CourseRoulette.tsx` | Enhance | Neon Marquee + confetti |
| `src/components/tierlist/TierCategory.tsx` | Enhance | Rank Neon Glow |
| `src/components/CourseDetail.tsx` | Enhance | motion Entrance + Orbitron + Breathing Button |
| `src/components/ReviewCard.tsx` | Enhance | CSS Variable Colors |
| `src/components/ReviewSection.tsx` | Enhance | Dark Form Background |
| `src/components/CourseGrade.tsx` | Enhance | Orbitron + CSS Variables |
| `src/components/CourseRadarChart.tsx` | Enhance | Dark Neon Radar Colors |
| `src/components/NotFound.tsx` | Enhance | Orbitron + primary Button |
| `src/pages/LoginPage.tsx` | Enhance | Orbitron + Cyan Button |
| `src/pages/SchedulePage.tsx` | Enhance | motion Staggered + Neon Credit Tag |
| `src/pages/AllCoursesPage.tsx` | Enhance | confetti Enrollment Celebration |
| `src/pages/CoursePage.tsx` | Enhance | confetti Enrollment Celebration |
| `src/pages/CourseSelectionPage.tsx` | Enhance | Orbitron + Dark Text |
| `src/pages/DebugPage.tsx` | Enhance | Orbitron + Dark Text |

### Dependencies
- `framer-motion` 12.34.3 — Page transitions, staggered animations, hover feedback.
- `canvas-confetti` 1.9.4 — Particle explosion effects.
- Google Fonts: Orbitron + Inter (Loaded via CSS @import).

### TypeScript Compilation
- `tsc -b` → Zero errors
- `npm run build` → Build successful

---

## P6: Hexagon Radar Chart Visualization ✅ Completed

### Function Updates

#### P6-1: Course Radar Chart Component
- **File**: `src/components/CourseRadarChart.tsx`
- **Features**:
  - Implemented 6-dimension radar chart based on Recharts (Workload, Difficulty, Practicality, Grading, Teaching, Interest).
  - Handles empty data states, adaptive sizing.
  - Custom Tooltip format.

#### P6-2: Course Battle Experience Optimization
- **File**: `src/components/CourseBattle/BattleCard.tsx`
- **Features**:
  - **Radar Chart Integration**: Courses with ratings directly display radar chart in the card for intuitive comparison.
  - **Layout Optimization**: Adjusted card width and spacing to fit chart display.
  - **Information Hierarchy**: Description defaults to collapsed ("Show description") to save space.
  - **Empty State**: Shows "No ratings" tag for unrated courses, automatically expanding text description as alternative.

#### P6-3: CourseCard Radar Chart Integration + Card Experience Refactor
- **File**: `src/components/CourseCard.tsx`
- **Issues**:
  - Previously used `course.avg_rating`, but backend `/api/courses` does not return this field (only returns 6 dimensions `avg_workload` etc.), causing all courses to show "No ratings yet".
  - Description using Ant Design `Paragraph ellipsis={{ expandable: true }}` could not be collapsed after expansion.
- **Fixes**:
  - Rating Calculation: Switched to `computeOverallAvg()` to calculate overall rating from 6 dimensions.
  - **Radar Integration**: Mimicked BattleCard design, rendering `CourseRadarChart` (190px) directly in the card when rating data exists.
  - **Collapsible Description**: Description defaults to collapsed "Show description" when radar chart exists, expands on click, "less" to collapse; Shows 3-line truncated description as fallback when no ratings.
  - **Rating Tag**: Uses `Tag` to show ★ Overall Rating + Credits, shows "No ratings" tag if no data.
  - **Meta Info**: Shows instructor and department at the bottom.
  - **API Fix**: Changed `bodyStyle` to `styles={{ body: ... }}` (Fixing Ant Design 5.x deprecated API warning).

#### P6-4: AllCoursesPage Pagination
- **File**: `src/components/CourseList.tsx`
- **Changes**:
  - Added Ant Design `Pagination` component, 12 courses per page.
  - Smooth scroll to top after page change.
  - Shows "Total N courses" at bottom.
  - Hides pagination controls when total courses ≤ 12.

#### P6-5: Course Type Supplement avg_rating
- **File**: `src/types/course.ts`
- **Changes**: Added `avg_rating: number | null` field to Course interface (backend actually returns it but frontend didn't declare).
- **Note**: Backend `/api/courses` list interface returns `avg_rating` as null (6 dimension scores exist in `avg_workload` etc.), `computeOverallAvg()` is the correct way for frontend calculation of overall score.

### File Change Overview

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/CourseCard.tsx` | Refactor | BattleCard style: Radar + Collapsible Desc + Tag Rating |
| `src/components/CourseList.tsx` | Enhance | Pagination (12/page) + Scroll to top |
| `src/types/course.ts` | Extend | Added `avg_rating` field |

### TypeScript Compilation
- `npx tsc --noEmit` → Zero errors

---

## P2: Core Enrollment Loop ✅ Completed

### Fix Checklist

#### P2-1: Global Auth State Management (AuthContext)
- **New File**: `src/context/AuthContext.tsx`
- **Tech**: React Context + useReducer
- **Features**:
  - State: `user`, `token`, `isAuthenticated`, `loading`
  - Actions: `LOGIN_SUCCESS`, `SET_USER`, `LOGOUT`, `SET_LOADING`
  - Auto-verify token in localStorage on startup (via `/auth/me`)
  - Expose `useAuth()` hook: `{ user, token, isAuthenticated, login, register, logout }`
  - `login()` → Call API → Save token to localStorage → dispatch LOGIN_SUCCESS
  - `register()` → Auto login after registration
  - `logout()` → Clear localStorage → dispatch LOGOUT

#### P2-2: Login/Register Page
- **New File**: `src/pages/LoginPage.tsx`
- **Route**: `/login`
- **Features**:
  - Tab Switch: Login / Register
  - Login Form: username + password
  - Register Form: username + email + password (with email format validation, password length validation)
  - "Dev Login" Button → One-click login with testuser1/password123
  - Navigate to `/courses` on success
  - Error Feedback: Ant Design message

#### P2-3: Navbar User State Display
- **File**: `src/components/Navbar.tsx`
- **Changes**:
  - Logged in: Show username + "My Schedule" menu item + Logout button
  - Not logged in: Show Login button (Jump to /login)
  - Debug button changed to independent Button (No longer Menu.Item)
  - Imported useAuth, useNavigate

#### P2-4: Enroll/Drop Connected to Backend API
- **Files**: `AllCoursesPage.tsx`, `CoursePage.tsx`, `CourseCard.tsx`, `CourseList.tsx`
- **Changes**:
  - `AllCoursesPage`: Call `getSchedule()` on load to get enrolledIds Set, merge into courses enrolled field.
  - `CoursePage`: Check current course enrolled status via `getSchedule()`, enroll/drop calls real API.
  - `CourseCard`: Added `onEnroll` prop, show "Take Course" button if not enrolled, "Enrolled" + "Drop Course" if enrolled.
  - `CourseList`: Added `onEnroll` prop passed through to CourseCard.
  - 409 Conflict: Parse conflicts array and show conflicting course info.
  - Not logged in click enroll → message.warning prompt to login.

#### P2-5: Schedule Page (SchedulePage)
- **New File**: `src/pages/SchedulePage.tsx`
- **Route**: `/schedule`
- **Features**:
  - Call `getSchedule()` → Display course card list
  - Show Total Credits Tag
  - Each card: Course Info + enrolled_at + finished_status Tag + Drop Button
  - Empty Schedule: Empty component + "Browse Courses" guide
  - Not logged in: Prompt to login

#### P2-6: Frontend Course Type Adaptation
- **File**: `src/types/course.ts`
- **New Types**: `UserResponse`, `TokenResponse`, `ScheduleEntry`, `ScheduleResponse`, `ConflictDetail`

#### Additional: CourseDetail Improvement
- **File**: `src/components/CourseDetail.tsx`
- Added display: Credits, Instructor, Department, Capacity, Average Rating
- Removed old Grade display (Changed to be provided by ScheduleEntry)

#### Routes & Exports
- `App.tsx`: Wrapped `<AuthProvider>`, Added `/login` and `/schedule` routes
- `pages/index.ts`: Export `LoginPage`, `SchedulePage`
- `auth.ts`: Added `setAuthToken()`, `clearAuthToken()` helper functions

### Test Results

Test Script: `frontend/test_p2.sh` — **51/51 Passed**

| Flow | Test Item | Count | Result |
|------|-----------|-------|--------|
| Flow 1 | Login (testuser1) + token verification | 5 | ✅ |
| Flow 2 | Register New User + Empty Schedule Verify + Duplicate Register Reject | 6 | ✅ |
| Flow 3 | Course List (77 courses) + Single Course Detail + Field Integrity | 5 | ✅ |
| Flow 4 | Enroll + Schedule Verify + Credit Verify + Field Integrity | 7 | ✅ |
| Flow 5 | Time Conflict Detection (409 + conflicts info) | 2 | ✅ |
| Flow 6 | Drop + Schedule Sync + Illegal Drop 404 + Re-enroll | 4 | ✅ |
| Flow 7 | Unauthenticated Access Protection (401/403) | 4 | ✅ |
| Flow 8 | TypeScript Compilation (npx tsc --noEmit) | 1 | ✅ |
| Flow 9 | P2 File Structure Verify | 3 | ✅ |
| Flow 10 | Module Exports + Key Import Check | 14 | ✅ |

### TypeScript Compilation
- `npx tsc --noEmit` → Zero errors

---

## P3: Reviews + Recommendations + Fun Features ✅ Completed

### Fix Checklist

#### P3-1: CoursePage Integration with Review System
- **New Files**: `src/components/ReviewCard.tsx`, `src/components/ReviewSection.tsx`
- **Modified Files**: `src/pages/CoursePage.tsx`, `src/api/reviews.ts`
- **Features**:
  - `ReviewSection`: Review list + Submission form, integrated at bottom of each course detail page.
  - `ReviewCard`: Single review card, displaying username, star rating (Ant Design Rate), comment, created time.
  - Logged-in users can submit review (1-5 stars + optional comment), 409 duplicate review has warning prompt.
  - Your own review shows Delete button, supports list refresh after deletion.
  - Non-logged-in users see "Login to write a review" prompt.
  - `reviews.ts` added `ReviewResponse`, `ReviewsData` types, `getCourseReviews` returns full response (including avg_rating, total).
  - `deleteCourseReview` parameter simplified from `(courseId, reviewId)` to `(reviewId)`.

#### P3-2: CoursePage Integration with Recommendation System
- **New File**: `src/components/RecommendationSection.tsx`
- **Modified File**: `src/api/recommendations.ts`
- **Features**:
  - Course detail page added "Students who took this course also took" section.
  - Shows recommended course cards (code, name, credits, co_enroll_count).
  - Each card clickable to jump to corresponding course detail page.
  - Shows "No recommendations yet" when empty.
  - `recommendations.ts` added `RecommendedCourse`, `RecommendationsData` types.
  - Backend actual return field is `id` (not `course_id`), fixed type definition.

#### P3-3: Roulette Selection Connected to Backend
- **Modified Files**: `src/components/rouletteSelection/CourseRoulette.tsx`, `CourseWheel.tsx`
- **Features**:
  - After wheel stops, pop up Confirm Modal "Confirm Enrollment", instead of adding directly to list.
  - After confirm, call `enrollInCourse(courseId)` → 200 Success Popup / 409 Conflict Show Detail.
  - Not logged in click confirm → "Please login first" warning.
  - Page load reads enrolled courses from `getSchedule()`, initializes selectedCourses.
  - `CourseWheel`'s `setSelectedCourses` changed from `React.Dispatch` to normal callback function.

#### P3-4: Grade Page (GradePage) Connected to Backend
- **Status**: Completed in P2 Phase
- GradePage already calls `getSchedule()` to get course list, filters `finished_status=true`.
- Grade Conversion: 0-49→U, 50-69→3, 70-84→4, 85-100→5.
- Dice game remains unchanged.

#### P3-5: Fun Selection: Course Battle
- **New Files**: `src/pages/CourseBattlePage.tsx`, `src/components/CourseBattle/BattleCard.tsx`
- **Route**: `/battle`
- **Features**:
  - Three stage flow: init → battle → result.
  - Init stage: Show intro text + "Start Battle!" button.
  - Battle stage: Left/Right two course cards, user clicks to choose preferred course.
    - Winner stays, loser replaced by recommended similar course (or random new course).
    - Call `getCourseRecommendations(winnerId)` to get recommendation, prefer unseen ones.
    - Progress bar shows current round / total rounds (default 7 rounds).
    - Loading new challenger has Spin + "Finding next challenger..." prompt.
  - Result stage: Show Trophy + Final Winner Course + "Enroll Now" / "Play Again" buttons.
  - `BattleCard`: Course card component, shows code, name, credits, rating, description, time, instructor.
    - Deterministic color (based on `getColorForCourse`).
    - Selected animation and winner highlight.

#### Routes & Navigation
- `App.tsx`: Added `/battle` route → `<CourseBattlePage />`.
- `Navbar.tsx`: Added "Course Battle" menu item (⚡ ThunderboltOutlined icon).
- `pages/index.ts`: Export `CourseBattlePage`.
- `components/index.ts`: Export `ReviewCard`, `ReviewSection`, `RecommendationSection`.

### Test Results

Test Script: `frontend/test_p3.sh` — **64/64 Passed**

| Flow | Test Item | Count | Result |
|------|-----------|-------|--------|
| Flow 1 | Reviews CRUD (GET/POST/DELETE + 409 Duplicate + 401 Unauth) | 12 | ✅ |
| Flow 2 | Recommendations (Structure Verify + Field Integrity) | 8 | ✅ |
| Flow 3 | Roulette Selection (enroll + schedule verify + conflict detection) | 10 | ✅ |
| Flow 4 | GradePage (schedule data + score/finished_status fields) | 4 | ✅ |
| Flow 5 | Course Battle (API paths + recommend + enroll) | 7 | ✅ |
| Flow 6 | TypeScript Compilation (npx tsc --noEmit) | 1 | ✅ |
| Flow 7 | P3 File Structure Verify (5 new files) | 5 | ✅ |
| Flow 8 | Module Exports + Key Import Check | 17 | ✅ |

### TypeScript Compilation
- `npx tsc --noEmit` → Zero errors
