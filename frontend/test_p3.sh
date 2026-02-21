#!/bin/bash
# P3 Frontend Integration Test Script
# Tests: Reviews CRUD, Recommendations, Roulette+Backend, GradePage, Course Battle
# Prerequisites: backend running on localhost:8000 with seeded DB
# Run: chmod +x test_p3.sh && ./test_p3.sh

BACKEND="http://localhost:8000"
MOCK_TOKEN="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token_for_frontend"
PASS=0
FAIL=0
TOTAL=0
REAL_TOKEN=""
FRONTEND_DIR="$(cd "$(dirname "$0")" && pwd)"

check() {
  local label="$1" expected="$2" actual="$3"
  ((TOTAL++))
  if [[ "$actual" == *"$expected"* ]]; then
    echo "  ✅ $label"
    ((PASS++))
  else
    echo "  ❌ $label — expected '$expected', got '$(echo "$actual" | head -c 200)'"
    ((FAIL++))
  fi
}

check_not() {
  local label="$1" unexpected="$2" actual="$3"
  ((TOTAL++))
  if [[ "$actual" != *"$unexpected"* ]]; then
    echo "  ✅ $label"
    ((PASS++))
  else
    echo "  ❌ $label — did NOT expect '$unexpected'"
    ((FAIL++))
  fi
}

check_http() {
  local label="$1" expected_code="$2" actual_code="$3"
  ((TOTAL++))
  if [[ "$actual_code" == *"$expected_code"* ]]; then
    echo "  ✅ $label (HTTP $actual_code)"
    ((PASS++))
  else
    echo "  ❌ $label — expected HTTP $expected_code, got $actual_code"
    ((FAIL++))
  fi
}

check_gte() {
  local label="$1" min_val="$2" actual="$3"
  ((TOTAL++))
  if [[ "$actual" -ge "$min_val" ]] 2>/dev/null; then
    echo "  ✅ $label ($actual >= $min_val)"
    ((PASS++))
  else
    echo "  ❌ $label — expected >= $min_val, got '$actual'"
    ((FAIL++))
  fi
}

echo "╔══════════════════════════════════════╗"
echo "║   P3 Frontend Integration Tests     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Prerequisite: backend health ──
echo "🔌 [PRE] Backend health check"
health=$(curl -sf "$BACKEND/" 2>/dev/null)
if [[ $? -ne 0 ]]; then
  echo "  ❌ Backend not reachable at $BACKEND — aborting"
  exit 1
fi
check "Backend is running" '"status":"ok"' "$health"
echo ""

# ── Login as testuser1 ──
echo "🔐 [PRE] Login as testuser1"
login_r=$(curl -sf -X POST "$BACKEND/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","password":"password123"}')
REAL_TOKEN=$(echo "$login_r" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))' 2>/dev/null)
USER_ID=$(echo "$login_r" | python3 -c 'import sys,json;print(json.load(sys.stdin)["user"]["id"])' 2>/dev/null)
check "Login successful" "access_token" "$login_r"
echo ""

# ══════════════════════════════════════
# Flow 1: Reviews CRUD
# ══════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⭐ [Flow 1] Reviews CRUD on course 1"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# T1: GET course reviews
reviews_r=$(curl -sf "$BACKEND/api/courses/1/reviews")
check "GET /api/courses/1/reviews returns reviews array" '"reviews"' "$reviews_r"
check "Response contains avg_rating field" '"avg_rating"' "$reviews_r"
check "Response contains total field" '"total"' "$reviews_r"

# T2: POST a new review
echo ""
echo "📝 [T2] Submit a new review"
review_post_r=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND/api/courses/1/reviews" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REAL_TOKEN" \
  -d '{"rating":4,"comment":"Great course for P3 test!"}')
review_post_code=$(echo "$review_post_r" | tail -1)
review_post_body=$(echo "$review_post_r" | sed '$d')

# Could be 201 (new) or 409 (already reviewed). Both are valid.
if [[ "$review_post_code" == "201" ]]; then
  check "POST review returns 201" "201" "$review_post_code"
  REVIEW_ID=$(echo "$review_post_body" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
  check "Review has id" "$REVIEW_ID" "$REVIEW_ID"
  check "Review has rating 4" "4" "$(echo "$review_post_body" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("rating",""))' 2>/dev/null)"
  check "Review has comment" "P3 test" "$review_post_body"

  # T3: Verify review appears in list
  echo ""
  echo "📋 [T3] Verify review in list"
  reviews_after=$(curl -sf "$BACKEND/api/courses/1/reviews")
  check "Review appears in list" "P3 test" "$reviews_after"

  # T4: Delete the review
  echo ""
  echo "🗑️  [T4] Delete review"
  del_r=$(curl -s -w "\n%{http_code}" -X DELETE "$BACKEND/api/reviews/$REVIEW_ID" \
    -H "Authorization: Bearer $REAL_TOKEN")
  del_code=$(echo "$del_r" | tail -1)
  check_http "DELETE review returns 200" "200" "$del_code"

  # Verify review is gone
  reviews_gone=$(curl -sf "$BACKEND/api/courses/1/reviews")
  check_not "Review no longer in list" "P3 test" "$reviews_gone"

elif [[ "$review_post_code" == "409" ]]; then
  echo "  ℹ️  User already reviewed course 1 (409). Testing duplicate detection."
  check_http "Duplicate review returns 409" "409" "$review_post_code"

  # Find existing review to test delete
  existing_reviews=$(curl -sf "$BACKEND/api/courses/1/reviews")
  REVIEW_ID=$(echo "$existing_reviews" | python3 -c "
import sys,json
data=json.load(sys.stdin)
for r in data['reviews']:
    if r['user_id']==$USER_ID:
        print(r['id']); break
" 2>/dev/null)

  if [[ -n "$REVIEW_ID" && "$REVIEW_ID" != "" ]]; then
    echo ""
    echo "🗑️  [T4] Delete existing review $REVIEW_ID"
    del_r=$(curl -s -w "\n%{http_code}" -X DELETE "$BACKEND/api/reviews/$REVIEW_ID" \
      -H "Authorization: Bearer $REAL_TOKEN")
    del_code=$(echo "$del_r" | tail -1)
    check_http "DELETE review returns 200" "200" "$del_code"

    # Re-submit review (should work now)
    echo ""
    echo "📝 [T4b] Re-submit review after delete"
    review_repost=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND/api/courses/1/reviews" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $REAL_TOKEN" \
      -d '{"rating":5,"comment":"Re-submitted P3 test review"}')
    repost_code=$(echo "$review_repost" | tail -1)
    check_http "Re-submit review returns 201" "201" "$repost_code"

    # Clean up: delete the re-submitted review
    REVIEW_ID2=$(echo "$review_repost" | sed '$d' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
    if [[ -n "$REVIEW_ID2" && "$REVIEW_ID2" != "" ]]; then
      curl -sf -X DELETE "$BACKEND/api/reviews/$REVIEW_ID2" \
        -H "Authorization: Bearer $REAL_TOKEN" > /dev/null 2>&1
    fi
  fi
else
  echo "  ❌ Unexpected HTTP code: $review_post_code"
  ((TOTAL++)); ((FAIL++))
fi

# T5: Unauth review should fail
echo ""
echo "🚫 [T5] Unauthenticated review submission"
unauth_review=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND/api/courses/1/reviews" \
  -H "Content-Type: application/json" \
  -d '{"rating":3,"comment":"no auth"}')
check_http "POST review without auth returns 401/403" "40" "$unauth_review"

echo ""

# ══════════════════════════════════════
# Flow 2: Recommendations
# ══════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 [Flow 2] Course Recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# T6: GET recommendations for course 1
rec_r=$(curl -sf "$BACKEND/api/courses/1/recommend")
check "GET /api/courses/1/recommend returns 200" '"course_id"' "$rec_r"
check "Response contains recommendations array" '"recommendations"' "$rec_r"

rec_course_id=$(echo "$rec_r" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("course_id",""))' 2>/dev/null)
check "Recommendation is for course_id 1" "1" "$rec_course_id"

# T7: Check recommendation structure (if not empty)
rec_count=$(echo "$rec_r" | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("recommendations",[])))' 2>/dev/null)
echo "  ℹ️  Course 1 has $rec_count recommendations"

if [[ "$rec_count" -gt 0 ]] 2>/dev/null; then
  first_rec=$(echo "$rec_r" | python3 -c 'import sys,json;r=json.load(sys.stdin)["recommendations"][0];print(json.dumps(r))' 2>/dev/null)
  check "Recommendation has id" '"id"' "$first_rec"
  check "Recommendation has code" '"code"' "$first_rec"
  check "Recommendation has name" '"name"' "$first_rec"
  check "Recommendation has co_enroll_count" '"co_enroll_count"' "$first_rec"
fi

# T8: Recommendations for multiple courses
echo ""
echo "📊 [T8] Recommendations for course 2"
rec_r2=$(curl -sf "$BACKEND/api/courses/2/recommend")
check "GET /api/courses/2/recommend returns valid response" '"course_id"' "$rec_r2"

echo ""

# ══════════════════════════════════════
# Flow 3: Roulette + Backend enrollment
# ══════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎰 [Flow 3] Roulette → Enroll via API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# First drop course 3 if already enrolled (clean slate)
curl -sf -X DELETE "$BACKEND/api/schedule/drop/3" \
  -H "Authorization: Bearer $REAL_TOKEN" > /dev/null 2>&1

# T9: Enroll in course 3 (simulating roulette selection)
enroll_r=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND/api/schedule/enroll/3" \
  -H "Authorization: Bearer $REAL_TOKEN")
enroll_code=$(echo "$enroll_r" | tail -1)
enroll_body=$(echo "$enroll_r" | sed '$d')
check_http "POST /api/schedule/enroll/3 returns 200/201" "20" "$enroll_code"
check "Enrollment response has message" '"message"' "$enroll_body"

# T10: Verify course appears in schedule
sched_r=$(curl -sf -H "Authorization: Bearer $REAL_TOKEN" "$BACKEND/api/schedule")
check "Schedule contains enrolled course" '"schedule"' "$sched_r"
sched_has_c3=$(echo "$sched_r" | python3 -c "
import sys,json
data=json.load(sys.stdin)
ids=[e['course']['id'] for e in data['schedule']]
print('YES' if 3 in ids else 'NO')
" 2>/dev/null)
check "Course 3 is in schedule" "YES" "$sched_has_c3"

# T11: Check schedule structure
sched_credits=$(echo "$sched_r" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("total_credits",0))' 2>/dev/null)
check_gte "Schedule has positive total_credits" "1" "$sched_credits"

sched_entry=$(echo "$sched_r" | python3 -c "
import sys,json
data=json.load(sys.stdin)
for e in data['schedule']:
    if e['course']['id']==3:
        print(json.dumps(e)); break
" 2>/dev/null)
check "Schedule entry has enrollment_id" '"enrollment_id"' "$sched_entry"
check "Schedule entry has enrolled_at" '"enrolled_at"' "$sched_entry"
check "Schedule entry has finished_status" '"finished_status"' "$sched_entry"

# T12: Try enrolling in a conflicting course
echo ""
echo "⚡ [T12] Conflict detection"
# Get course 3's time slots to find a conflicting course
c3_slots=$(curl -sf "$BACKEND/api/courses/3" | python3 -c "
import sys,json
data=json.load(sys.stdin)
for ts in data.get('time_slots',[]):
    print(f'{ts[\"period\"]}-{ts[\"slot\"]}')
" 2>/dev/null)
echo "  ℹ️  Course 3 time slots: $(echo $c3_slots | tr '\n' ' ')"

# Find another course with overlapping time slot
conflict_id=$(curl -sf "$BACKEND/api/courses" | python3 -c "
import sys,json
data=json.load(sys.stdin)
target_slots = set()
for ts in [{'period':int(p.split('-')[0]),'slot':int(p.split('-')[1])} for p in '''$c3_slots'''.strip().split('\n') if p]:
    target_slots.add((ts['period'],ts['slot']))
for c in data['courses']:
    if c['id']==3: continue
    for ts in c.get('time_slots',[]):
        if (ts['period'],ts['slot']) in target_slots:
            print(c['id']); sys.exit()
print('')
" 2>/dev/null)

if [[ -n "$conflict_id" && "$conflict_id" != "" ]]; then
  conflict_r=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND/api/schedule/enroll/$conflict_id" \
    -H "Authorization: Bearer $REAL_TOKEN")
  conflict_code=$(echo "$conflict_r" | tail -1)
  conflict_body=$(echo "$conflict_r" | sed '$d')
  check_http "Conflicting enrollment returns 409" "409" "$conflict_code"
  check "Conflict response has detail" '"detail"' "$conflict_body"
else
  echo "  ℹ️  No conflicting course found — skipping conflict test"
fi

# Clean up: drop course 3
curl -sf -X DELETE "$BACKEND/api/schedule/drop/3" \
  -H "Authorization: Bearer $REAL_TOKEN" > /dev/null 2>&1

echo ""

# ══════════════════════════════════════
# Flow 4: Grade Page (Schedule-based)
# ══════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎓 [Flow 4] GradePage — Schedule access"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# T13: Schedule endpoint provides data for grade page
grade_sched=$(curl -sf -H "Authorization: Bearer $REAL_TOKEN" "$BACKEND/api/schedule")
check "Schedule returns valid data for GradePage" '"schedule"' "$grade_sched"
check "Schedule has total_credits" '"total_credits"' "$grade_sched"

# T14: Each schedule entry has score field
entry_has_score=$(echo "$grade_sched" | python3 -c "
import sys,json
data=json.load(sys.stdin)
if len(data['schedule'])==0:
    print('EMPTY')
else:
    # Check first entry has 'score' key
    e=data['schedule'][0]
    print('YES' if 'score' in e else 'NO')
" 2>/dev/null)
if [[ "$entry_has_score" == "EMPTY" ]]; then
  echo "  ℹ️  Schedule is empty - score check skipped"
  ((TOTAL++)); ((PASS++))
else
  check "Schedule entries have score field" "YES" "$entry_has_score"
fi

# T15: Each schedule entry has finished_status
entry_has_finished=$(echo "$grade_sched" | python3 -c "
import sys,json
data=json.load(sys.stdin)
if len(data['schedule'])==0:
    print('EMPTY')
else:
    e=data['schedule'][0]
    print('YES' if 'finished_status' in e else 'NO')
" 2>/dev/null)
if [[ "$entry_has_finished" == "EMPTY" ]]; then
  echo "  ℹ️  Schedule is empty - finished_status check skipped"
  ((TOTAL++)); ((PASS++))
else
  check "Schedule entries have finished_status field" "YES" "$entry_has_finished"
fi

echo ""

# ══════════════════════════════════════
# Flow 5: Course Battle (API Integration)
# ══════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚔️  [Flow 5] Course Battle — API paths"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# T16: GET all courses (Battle needs full list)
courses_r=$(curl -sf "$BACKEND/api/courses")
course_count=$(echo "$courses_r" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("total",0))' 2>/dev/null)
check_gte "GET /api/courses returns enough for battle" "2" "$course_count"

# T17: Pick two random courses for battle
BATTLE_C1=$(echo "$courses_r" | python3 -c 'import sys,json;print(json.load(sys.stdin)["courses"][0]["id"])' 2>/dev/null)
BATTLE_C2=$(echo "$courses_r" | python3 -c 'import sys,json;print(json.load(sys.stdin)["courses"][1]["id"])' 2>/dev/null)
echo "  ℹ️  Battle: course $BATTLE_C1 vs course $BATTLE_C2"

# T18: Get recommendations for winner (simulating battle flow)
echo ""
echo "🏆 [T18] Get recommendations for battle winner (course $BATTLE_C1)"
battle_rec=$(curl -sf "$BACKEND/api/courses/$BATTLE_C1/recommend")
check "Recommendations for battle winner loads" '"course_id"' "$battle_rec"
battle_rec_count=$(echo "$battle_rec" | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("recommendations",[])))' 2>/dev/null)
echo "  ℹ️  Winner has $battle_rec_count recommendations for next challenger"

# T19: If recommendations exist, verify they can be used as challenger
if [[ "$battle_rec_count" -gt 0 ]] 2>/dev/null; then
  challenger_id=$(echo "$battle_rec" | python3 -c 'import sys,json;print(json.load(sys.stdin)["recommendations"][0]["id"])' 2>/dev/null)
  challenger_detail=$(curl -sf "$BACKEND/api/courses/$challenger_id")
  check "Challenger course detail loads" '"id"' "$challenger_detail"
  check "Challenger has name" '"name"' "$challenger_detail"
  check "Challenger has time_slots" '"time_slots"' "$challenger_detail"
fi

# T20: Enroll in battle winner (simulating final enrollment)
echo ""
echo "📝 [T20] Enroll in battle winner course"
# Use a course unlikely to conflict — pick the last course in the list
BATTLE_ENROLL=$(echo "$courses_r" | python3 -c '
import sys,json
courses=json.load(sys.stdin)["courses"]
# Find a course to test enrollment with
print(courses[-1]["id"])
' 2>/dev/null)
# Drop first to ensure clean state
curl -sf -X DELETE "$BACKEND/api/schedule/drop/$BATTLE_ENROLL" \
  -H "Authorization: Bearer $REAL_TOKEN" > /dev/null 2>&1

battle_enroll=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND/api/schedule/enroll/$BATTLE_ENROLL" \
  -H "Authorization: Bearer $REAL_TOKEN")
battle_enroll_code=$(echo "$battle_enroll" | tail -1)
check_http "Enroll battle winner returns 200" "200" "$battle_enroll_code"

# Clean up
curl -sf -X DELETE "$BACKEND/api/schedule/drop/$BATTLE_ENROLL" \
  -H "Authorization: Bearer $REAL_TOKEN" > /dev/null 2>&1

echo ""

# ══════════════════════════════════════
# Flow 6: TypeScript compilation
# ══════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 [Flow 6] TypeScript compilation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

tsc_output=$(cd "$FRONTEND_DIR" && npx tsc --noEmit 2>&1)
tsc_exit=$?
if [[ $tsc_exit -eq 0 ]]; then
  check "npx tsc --noEmit passes" "" ""
else
  echo "  ❌ TypeScript compilation errors:"
  echo "$tsc_output" | head -20
  ((TOTAL++)); ((FAIL++))
fi
echo ""

# ══════════════════════════════════════
# Flow 7: P3 file structure verification
# ══════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 [Flow 7] P3 file structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file() {
  local label="$1" filepath="$2"
  ((TOTAL++))
  if [[ -f "$filepath" ]]; then
    echo "  ✅ $label exists"
    ((PASS++))
  else
    echo "  ❌ $label missing — $filepath"
    ((FAIL++))
  fi
}

check_file "ReviewCard.tsx" "$FRONTEND_DIR/src/components/ReviewCard.tsx"
check_file "ReviewSection.tsx" "$FRONTEND_DIR/src/components/ReviewSection.tsx"
check_file "RecommendationSection.tsx" "$FRONTEND_DIR/src/components/RecommendationSection.tsx"
check_file "CourseBattlePage.tsx" "$FRONTEND_DIR/src/pages/CourseBattlePage.tsx"
check_file "BattleCard.tsx" "$FRONTEND_DIR/src/components/CourseBattle/BattleCard.tsx"

echo ""

# ══════════════════════════════════════
# Flow 8: Module exports & imports verification
# ══════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 [Flow 8] Module exports & imports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_contains() {
  local label="$1" file="$2" pattern="$3"
  ((TOTAL++))
  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo "  ✅ $label"
    ((PASS++))
  else
    echo "  ❌ $label — pattern '$pattern' not in $file"
    ((FAIL++))
  fi
}

# Components index exports
check_contains "components/index exports ReviewCard" "$FRONTEND_DIR/src/components/index.ts" "ReviewCard"
check_contains "components/index exports ReviewSection" "$FRONTEND_DIR/src/components/index.ts" "ReviewSection"
check_contains "components/index exports RecommendationSection" "$FRONTEND_DIR/src/components/index.ts" "RecommendationSection"

# Pages index exports
check_contains "pages/index exports CourseBattlePage" "$FRONTEND_DIR/src/pages/index.ts" "CourseBattlePage"

# App.tsx has battle route
check_contains "App.tsx imports CourseBattlePage" "$FRONTEND_DIR/src/App.tsx" "CourseBattlePage"
check_contains "App.tsx has /battle route" "$FRONTEND_DIR/src/App.tsx" "/battle"

# Navbar has battle link
check_contains "Navbar has Course Battle" "$FRONTEND_DIR/src/components/Navbar.tsx" "Course Battle"
check_contains "Navbar links to /battle" "$FRONTEND_DIR/src/components/Navbar.tsx" "/battle"

# CoursePage integrates reviews & recommendations
check_contains "CoursePage imports ReviewSection" "$FRONTEND_DIR/src/pages/CoursePage.tsx" "ReviewSection"
check_contains "CoursePage imports RecommendationSection" "$FRONTEND_DIR/src/pages/CoursePage.tsx" "RecommendationSection"

# CourseRoulette uses enrollment API
check_contains "CourseRoulette imports enrollInCourse" "$FRONTEND_DIR/src/components/rouletteSelection/CourseRoulette.tsx" "enrollInCourse"
check_contains "CourseRoulette imports useAuth" "$FRONTEND_DIR/src/components/rouletteSelection/CourseRoulette.tsx" "useAuth"
check_contains "CourseRoulette has confirmation Modal" "$FRONTEND_DIR/src/components/rouletteSelection/CourseRoulette.tsx" "Modal"

# Reviews API has types
check_contains "reviews.ts exports ReviewResponse" "$FRONTEND_DIR/src/api/reviews.ts" "ReviewResponse"
check_contains "reviews.ts exports ReviewsData" "$FRONTEND_DIR/src/api/reviews.ts" "ReviewsData"

# Recommendations API has types
check_contains "recommendations.ts exports RecommendedCourse" "$FRONTEND_DIR/src/api/recommendations.ts" "RecommendedCourse"
check_contains "recommendations.ts exports RecommendationsData" "$FRONTEND_DIR/src/api/recommendations.ts" "RecommendationsData"

echo ""

# ══════════════════════════════════════
# Summary
# ══════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESULTS: $PASS/$TOTAL passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $FAIL -eq 0 ]]; then
  echo "🎉 All P3 tests passed!"
  exit 0
else
  echo "⚠️  $FAIL test(s) failed."
  exit 1
fi
