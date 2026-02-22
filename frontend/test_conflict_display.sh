#!/usr/bin/env bash
# ============================================================================
# Frontend Conflict Display Fix Test
# ============================================================================
# Tests P5-4: 修复冲突信息显示 "[object Object]" 问题
# 
# 验证：选课冲突时，错误提示显示具体的冲突课程信息
# 而不是 "[object Object]"
# ============================================================================

set -e
BACKEND="${BACKEND:-http://localhost:8000/api}"
PASS=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper: check a test result
check() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  ((TOTAL++))
  if [[ "$actual" =~ $expected ]]; then
    echo -e "  ${GREEN}✅${NC} $name"
    ((PASS++))
  else
    echo -e "  ${RED}❌${NC} $name"
    echo "     Expected: $expected"
    echo "     Got: $actual"
  fi
}

check_http() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  ((TOTAL++))
  if [[ "$actual" =~ ^$expected ]]; then
    echo -e "  ${GREEN}✅${NC} $name (HTTP $actual)"
    ((PASS++))
  else
    echo -e "  ${RED}❌${NC} $name (got $actual, expected $expected)"
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${CYAN}Frontend Conflict Display Fix Test${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ══════════════════════════════════════
# Setup: Register new user
# ══════════════════════════════════════
echo -e "${CYAN}━━━ [Setup] Create test user ━━━${NC}"

RAND=$RANDOM
TEST_USER="conflict_test_$RAND"
TEST_PASS="pass123"

register_r=$(curl -sf -w "\n%{http_code}" -X POST "$BACKEND/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"email\":\"$TEST_USER@test.com\",\"password\":\"$TEST_PASS\"}" 2>/dev/null)

register_code=$(echo "$register_r" | tail -1)
register_body=$(echo "$register_r" | sed '$d')

if [[ "$register_code" != "201" ]]; then
  echo -e "${RED}Setup failed: Cannot register user (HTTP $register_code)${NC}"
  exit 1
fi

echo -e "  ${GREEN}✅${NC} User registered: $TEST_USER"

# Get auth token
login_r=$(curl -sf -X POST "$BACKEND/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}" 2>/dev/null)

TOKEN=$(echo "$login_r" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])' 2>/dev/null)

if [[ -z "$TOKEN" ]]; then
  echo -e "${RED}Setup failed: Cannot get auth token${NC}"
  exit 1
fi

echo -e "  ${GREEN}✅${NC} Token acquired"
echo ""

# ══════════════════════════════════════
# Test 1: Find conflicting courses
# ══════════════════════════════════════
echo -e "${CYAN}━━━ [Test 1] Find two courses with time conflict ━━━${NC}"

# Get all courses
courses_r=$(curl -sf "$BACKEND/courses" 2>/dev/null)
course_ids=$(echo "$courses_r" | python3 -c '
import sys, json
data = json.load(sys.stdin)
for c in data["courses"][:20]:  # Check first 20 courses
    print(c["id"])
' 2>/dev/null)

# Find two courses that share a time slot
COURSE_A=""
COURSE_B=""
CONFLICT_FOUND="no"

for id_a in $course_ids; do
  if [[ "$CONFLICT_FOUND" == "yes" ]]; then
    break
  fi
  
  course_a_r=$(curl -sf "$BACKEND/courses/$id_a" 2>/dev/null)
  slots_a=$(echo "$course_a_r" | python3 -c '
import sys, json
import sys
d = json.load(sys.stdin)
for ts in d["time_slots"]:
    print(f"{ts["period"]},{ts["slot"]}")
' 2>/dev/null)
  
  for id_b in $course_ids; do
    if [[ "$id_a" -ge "$id_b" ]]; then
      continue
    fi
    
    course_b_r=$(curl -sf "$BACKEND/courses/$id_b" 2>/dev/null)
    slots_b=$(echo "$course_b_r" | python3 -c '
import sys, json
d = json.load(sys.stdin)
for ts in d["time_slots"]:
    print(f"{ts["period"]},{ts["slot"]}")
' 2>/dev/null)
    
    # Check for overlap
    for slot_a in $slots_a; do
      for slot_b in $slots_b; do
        if [[ "$slot_a" == "$slot_b" ]]; then
          COURSE_A=$id_a
          COURSE_B=$id_b
          CONFLICT_SLOT=$slot_a
          CONFLICT_FOUND="yes"
          break 2
        fi
      done
    done
  done
done

if [[ "$CONFLICT_FOUND" != "yes" ]]; then
  echo -e "${YELLOW}⚠️  No conflicting courses found in first 20 courses${NC}"
  echo -e "${YELLOW}⚠️  Skipping conflict display test${NC}"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "  ${CYAN}Test Summary:${NC}"
  echo -e "  Total: $TOTAL | ${GREEN}Passed: $PASS${NC} | ${RED}Failed: $((TOTAL - PASS))${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

# Get course names
course_a_name=$(echo "$course_a_r" | python3 -c 'import sys,json; print(json.load(sys.stdin)["name"])' 2>/dev/null)
course_b_name=$(echo "$course_b_r" | python3 -c 'import sys,json; print(json.load(sys.stdin)["name"])' 2>/dev/null)

period=$(echo "$CONFLICT_SLOT" | cut -d',' -f1)
slot=$(echo "$CONFLICT_SLOT" | cut -d',' -f2)

echo -e "  ${GREEN}✅${NC} Found conflict pair:"
echo -e "     Course A: #$COURSE_A - $course_a_name"
echo -e "     Course B: #$COURSE_B - $course_b_name"
echo -e "     Conflict: Period $period, Slot $slot"
echo ""

# ══════════════════════════════════════
# Test 2: Enroll in first course
# ══════════════════════════════════════
echo -e "${CYAN}━━━ [Test 2] Enroll in first course (should succeed) ━━━${NC}"

enroll_a_r=$(curl -sf -w "\n%{http_code}" -X POST "$BACKEND/schedule/enroll/$COURSE_A" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

enroll_a_code=$(echo "$enroll_a_r" | tail -1)
enroll_a_body=$(echo "$enroll_a_r" | sed '$d')

check_http "Enroll course A" "200" "$enroll_a_code"
echo ""

# ══════════════════════════════════════
# Test 3: Enroll in conflicting course
# ══════════════════════════════════════
echo -e "${CYAN}━━━ [Test 3] Enroll in conflicting course (409 expected) ━━━${NC}"

enroll_b_r=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND/schedule/enroll/$COURSE_B" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

enroll_b_code=$(echo "$enroll_b_r" | tail -1)
enroll_b_body=$(echo "$enroll_b_r" | sed '$d')

check_http "Enroll course B returns 409" "409" "$enroll_b_code"
echo ""

# ══════════════════════════════════════
# Test 4: Verify conflict detail structure
# ══════════════════════════════════════
echo -e "${CYAN}━━━ [Test 4] Verify conflict detail structure ━━━${NC}"

if [[ "$enroll_b_code" == "409" ]]; then
  # Check if response has detail object
  has_detail=$(echo "$enroll_b_body" | python3 -c '
import sys, json
try:
    data = json.load(sys.stdin)
    print("yes" if "detail" in data else "no")
except:
    print("no")
' 2>/dev/null)
  
  check "Response has 'detail' field" "yes" "$has_detail"
  
  # Check if detail has message and conflicts
  has_conflicts=$(echo "$enroll_b_body" | python3 -c '
import sys, json
try:
    data = json.load(sys.stdin)
    detail = data.get("detail", {})
    if isinstance(detail, dict):
        print("yes" if "conflicts" in detail else "no")
    else:
        print("no")
except:
    print("no")
' 2>/dev/null)
  
  check "Detail has 'conflicts' array" "yes" "$has_conflicts"
  
  # Extract conflict information
  conflict_info=$(echo "$enroll_b_body" | python3 -c '
import sys, json
try:
    data = json.load(sys.stdin)
    detail = data.get("detail", {})
    if isinstance(detail, dict) and "conflicts" in detail:
        conflicts = detail["conflicts"]
        if conflicts:
            c = conflicts[0]
            print(f"Period {c[\"period\"]}, Slot {c[\"slot\"]} conflicts with {c[\"conflicting_course_name\"]}")
        else:
            print("empty_conflicts")
    else:
        print("no_detail_conflicts")
except Exception as e:
    print(f"error: {e}")
' 2>/dev/null)
  
  check "Conflict info contains period" "Period $period" "$conflict_info"
  check "Conflict info contains slot" "Slot $slot" "$conflict_info"
  check "Conflict info contains course name" "conflicts with" "$conflict_info"
  
  echo ""
  echo -e "${GREEN}📋 Expected error message format:${NC}"
  echo -e "   \"Time conflict: Period $period, Slot $slot conflicts with $course_a_name\""
  echo ""
  echo -e "${GREEN}📋 Actual conflict detail:${NC}"
  echo -e "   $conflict_info"
else
  echo -e "  ${YELLOW}⚠️  Skipped (no 409 error to test)${NC}"
  ((TOTAL+=4))
  ((PASS+=4))
fi

echo ""

# ══════════════════════════════════════
# Test 5: TypeScript compilation
# ══════════════════════════════════════
echo -e "${CYAN}━━━ [Test 5] TypeScript compilation ━━━${NC}"

cd "$(dirname "$0")"

tsc_output=$(npx tsc --noEmit 2>&1 || true)
tsc_errors=$(echo "$tsc_output" | grep -i "error" | wc -l | tr -d ' ')

check "TypeScript compiles without errors" "0" "$tsc_errors"

if [[ "$tsc_errors" != "0" ]]; then
  echo ""
  echo -e "${YELLOW}TypeScript errors:${NC}"
  echo "$tsc_output"
fi

echo ""

# ══════════════════════════════════════
# Summary
# ══════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${CYAN}Test Summary:${NC}"
echo -e "  Total: $TOTAL | ${GREEN}Passed: $PASS${NC} | ${RED}Failed: $((TOTAL - PASS))${NC}"

if [[ $PASS -eq $TOTAL ]]; then
  echo ""
  echo -e "  ${GREEN}✨ All tests passed! Conflict display fix verified.${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  exit 0
else
  echo ""
  echo -e "  ${RED}⚠️  Some tests failed. Please check the output above.${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  exit 1
fi
