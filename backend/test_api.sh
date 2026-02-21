#!/usr/bin/env bash
# ============================================================================
#  One-Click API Integration Test Script
#  Usage: bash test_api.sh [BASE_URL]
#  Default: http://localhost:8000
# ============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"
MOCK_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token_for_frontend"
AUTH_HEADER="Authorization: Bearer ${MOCK_TOKEN}"

# ───── Color Definitions ─────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0
TOTAL=0

# ───── Helper Functions ─────

# Print separator line
separator() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Test a single endpoint
# Args: $1=test_name $2=HTTP_method $3=URL_path $4=expected_status $5=extra_curl_args(optional)
test_endpoint() {
  local test_name="$1"
  local method="$2"
  local path="$3"
  local expected_status="$4"
  shift 4
  local extra_args=("$@")

  TOTAL=$((TOTAL + 1))
  local url="${BASE_URL}${path}"

  # Execute request, capture response body and status code
  local tmpfile
  tmpfile=$(mktemp)
  local http_code
  http_code=$(curl -s -o "$tmpfile" -w "%{http_code}" \
    -X "$method" "$url" \
    -H "Content-Type: application/json" \
    "${extra_args[@]}" 2>/dev/null) || true

  local body
  body=$(cat "$tmpfile")
  rm -f "$tmpfile"

  # Check result
  if [[ "$http_code" == "$expected_status" ]]; then
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}✓ PASS${NC}  [${method} ${path}] ${test_name}"
    echo -e "         Status: ${http_code}  (Expected: ${expected_status})"
  else
    FAIL=$((FAIL + 1))
    echo -e "  ${RED}✗ FAIL${NC}  [${method} ${path}] ${test_name}"
    echo -e "         Status: ${http_code}  (Expected: ${expected_status})"
  fi

  # Print response summary (max 200 chars)
  local summary
  if [[ ${#body} -gt 200 ]]; then
    summary="${body:0:200}..."
  else
    summary="$body"
  fi
  echo -e "         Response: ${summary}"
  echo ""
}

# Test endpoint and verify response JSON contains a keyword
test_endpoint_contains() {
  local test_name="$1"
  local method="$2"
  local path="$3"
  local expected_status="$4"
  local contains_key="$5"
  shift 5
  local extra_args=("$@")

  TOTAL=$((TOTAL + 1))
  local url="${BASE_URL}${path}"

  local tmpfile
  tmpfile=$(mktemp)
  local http_code
  http_code=$(curl -s -o "$tmpfile" -w "%{http_code}" \
    -X "$method" "$url" \
    -H "Content-Type: application/json" \
    "${extra_args[@]}" 2>/dev/null) || true

  local body
  body=$(cat "$tmpfile")
  rm -f "$tmpfile"

  local status_ok=false
  local contains_ok=false

  [[ "$http_code" == "$expected_status" ]] && status_ok=true
  echo "$body" | grep -q "$contains_key" && contains_ok=true

  if $status_ok && $contains_ok; then
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}✓ PASS${NC}  [${method} ${path}] ${test_name}"
    echo -e "         Status: ${http_code}  Contains keyword: \"${contains_key}\" ✓"
  elif $status_ok && ! $contains_ok; then
    WARN=$((WARN + 1))
    echo -e "  ${YELLOW}⚠ WARN${NC}  [${method} ${path}] ${test_name}"
    echo -e "         Status: ${http_code} ✓ but response missing keyword: \"${contains_key}\""
  else
    FAIL=$((FAIL + 1))
    echo -e "  ${RED}✗ FAIL${NC}  [${method} ${path}] ${test_name}"
    echo -e "         Status: ${http_code}  (Expected: ${expected_status})"
  fi

  local summary
  if [[ ${#body} -gt 200 ]]; then
    summary="${body:0:200}..."
  else
    summary="$body"
  fi
  echo -e "         Response: ${summary}"
  echo ""
}

# ============================================================================
#  Start Tests
# ============================================================================

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║         API 接口一键测试 - Course Selection System         ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo -e "  Target server: ${CYAN}${BASE_URL}${NC}"
echo -e "  Test time:     $(date '+%Y-%m-%d %H:%M:%S')"

# ─── 0. Connectivity Check ───
separator
echo -e "${BOLD}[0] Connectivity Check${NC}"
echo ""

if curl -s --connect-timeout 5 "${BASE_URL}/" > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Server is reachable"
  echo ""
else
  echo -e "  ${RED}✗ Cannot connect to ${BASE_URL}${NC}"
  echo -e "  Please ensure the backend is running: ${YELLOW}uvicorn server.src.I1_entry.app:app --host 0.0.0.0 --port 8000${NC}"
  exit 1
fi

# ─── 1. Health Check ───
separator
echo -e "${BOLD}[1] Health Check${NC}"
echo ""

test_endpoint_contains \
  "Health check" \
  "GET" "/" "200" "ok"

# ─── 2. Course Endpoints (Real DB) ───
separator
echo -e "${BOLD}[2] Courses (Real DB)${NC}"
echo ""

test_endpoint_contains \
  "List all courses" \
  "GET" "/api/courses" "200" "courses"

test_endpoint_contains \
  "Search courses by keyword (keyword=Machine)" \
  "GET" "/api/courses?keyword=Machine" "200" "courses"

test_endpoint_contains \
  "Filter courses by credits (credits=6)" \
  "GET" "/api/courses?credits=6" "200" "courses"

test_endpoint_contains \
  "Filter courses by department (department=datavetenskap)" \
  "GET" "/api/courses?department=datavetenskap" "200" "courses"

test_endpoint_contains \
  "Get single course detail (course_id=1)" \
  "GET" "/api/courses/1" "200" "code"

test_endpoint \
  "Get non-existent course -> 404" \
  "GET" "/api/courses/99999" "404"

# ─── 3. Authentication Endpoints (Mock) ───
separator
echo -e "${BOLD}[3] Authentication (Mock)${NC}"
echo ""

test_endpoint_contains \
  "User registration" \
  "POST" "/api/auth/register" "201" "username" \
  -d '{"username":"newuser","email":"new@test.com","password":"pass123"}'

test_endpoint_contains \
  "User login (testuser1)" \
  "POST" "/api/auth/login" "200" "access_token" \
  -d '{"username":"testuser1","password":"any"}'

test_endpoint_contains \
  "User login (random username)" \
  "POST" "/api/auth/login" "200" "access_token" \
  -d '{"username":"randomuser","password":"any"}'

test_endpoint_contains \
  "Get current user (with Token)" \
  "GET" "/api/auth/me" "200" "testuser1" \
  -H "$AUTH_HEADER"

test_endpoint \
  "Get current user (no Token) -> 401" \
  "GET" "/api/auth/me" "401"

# ─── 4. Enrollment Endpoints (Mock) ───
separator
echo -e "${BOLD}[4] Enrollment (Mock)${NC}"
echo ""

test_endpoint_contains \
  "Enroll success (course_id=1 TAMS11)" \
  "POST" "/api/schedule/enroll/1" "200" "Enrollment successful" \
  -H "$AUTH_HEADER"

test_endpoint_contains \
  "Enroll time conflict (course_id=30) -> 409" \
  "POST" "/api/schedule/enroll/30" "409" "conflict" \
  -H "$AUTH_HEADER"

test_endpoint \
  "Enroll - course not found (course_id=99999) -> 404" \
  "POST" "/api/schedule/enroll/99999" "404" \
  -H "$AUTH_HEADER"

test_endpoint \
  "Enroll - no Token -> 401" \
  "POST" "/api/schedule/enroll/1" "401"

test_endpoint_contains \
  "Drop course (course_id=1)" \
  "DELETE" "/api/schedule/drop/1" "200" "dropped" \
  -H "$AUTH_HEADER"

test_endpoint_contains \
  "Get schedule" \
  "GET" "/api/schedule" "200" "schedule" \
  -H "$AUTH_HEADER"

test_endpoint \
  "Get schedule - no Token -> 401" \
  "GET" "/api/schedule" "401"

# ─── 5. Review Endpoints (Mock) ───
separator
echo -e "${BOLD}[5] Reviews (Mock)${NC}"
echo ""

test_endpoint_contains \
  "Get reviews (course_id=1)" \
  "GET" "/api/courses/1/reviews" "200" "reviews"

test_endpoint_contains \
  "Get reviews (course with no reviews)" \
  "GET" "/api/courses/999/reviews" "200" "reviews"

test_endpoint_contains \
  "Submit review" \
  "POST" "/api/courses/1/reviews" "201" "rating" \
  -H "$AUTH_HEADER" \
  -d '{"rating":5,"comment":"Excellent course!"}'

test_endpoint \
  "Submit review - no Token -> 401" \
  "POST" "/api/courses/1/reviews" "401" \
  -d '{"rating":5,"comment":"test"}'

test_endpoint_contains \
  "Delete review (review_id=1)" \
  "DELETE" "/api/reviews/1" "200" "deleted" \
  -H "$AUTH_HEADER"

test_endpoint \
  "Delete review - no Token -> 401" \
  "DELETE" "/api/reviews/1" "401"

# ─── 6. Recommendation Endpoints (Mock) ───
separator
echo -e "${BOLD}[6] Recommendations (Mock)${NC}"
echo ""

test_endpoint_contains \
  "Get recommendations (course_id=1)" \
  "GET" "/api/courses/1/recommend" "200" "recommendations"

# ============================================================================
#  Test Results Summary
# ============================================================================

separator
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                      Test Results Summary                   ║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}  Total: ${TOTAL} tests                                          ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${GREEN}✓ Passed:  ${PASS}${NC}                                             ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${YELLOW}⚠ Warning: ${WARN}${NC}                                             ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${RED}✗ Failed:  ${FAIL}${NC}                                             ${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ $FAIL -eq 0 && $WARN -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}🎉 All tests passed! API is working correctly.${NC}"
elif [[ $FAIL -eq 0 ]]; then
  echo -e "  ${YELLOW}${BOLD}⚠  Tests passed with warnings. Check output above.${NC}"
else
  echo -e "  ${RED}${BOLD}❌ ${FAIL} test(s) failed. Check output above for details.${NC}"
fi
echo ""

exit $FAIL
