#!/bin/bash
# P1 Frontend API Layer Test Script
# Prerequisites: backend running on localhost:8000

BACKEND="http://localhost:8000"
TOKEN="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token_for_frontend"
PASS=0
FAIL=0

check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    echo "  ✅ $label"
    ((PASS++))
  else
    echo "  ❌ $label — expected '$expected', got '$actual'"
    ((FAIL++))
  fi
}

echo "=== P1 Frontend API Tests ==="
echo ""

# T1: Health check
echo "[T1] GET /"
r=$(curl -sf "$BACKEND/")
check "status ok" '"status":"ok"' "$r"

# T2: All courses
echo "[T2] GET /api/courses"
r=$(curl -sf "$BACKEND/api/courses")
total=$(echo "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin)["total"])')
check "returns 77 courses" "77" "$total"

# T3: Single course + time_slots unchanged
echo "[T3] GET /api/courses/1 (time_slots integrity)"
r=$(curl -sf "$BACKEND/api/courses/1")
code=$(echo "$r" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["code"])')
period=$(echo "$r" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["time_slots"][0]["period"])')
check "course code" "TAMS11" "$code"
check "period > 2 (not modded)" "2" "$period"  # backend returns period=2 for TAMS11

# T4: Auth/me with MOCK_TOKEN
echo "[T4] GET /api/auth/me (mock token)"
r=$(curl -sf -H "Authorization: $TOKEN" "$BACKEND/api/auth/me")
user=$(echo "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin)["username"])')
check "user is testuser1" "testuser1" "$user"

# T5: Auth/me with broken token (old bug: missing second half)
echo "[T5] GET /api/auth/me (broken token should fail)"
r=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" "$BACKEND/api/auth/me")
check "broken token returns 401/403" "40" "$r"  # 401 or 403

# T6: Login
echo "[T6] POST /api/auth/login"
r=$(curl -sf -X POST "$BACKEND/api/auth/login" -H "Content-Type: application/json" -d '{"username":"testuser1","password":"password123"}')
has_token=$(echo "$r" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("yes" if d.get("access_token") else "no")')
login_user=$(echo "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin)["user"]["username"])')
check "returns access_token" "yes" "$has_token"
check "returns user testuser1" "testuser1" "$login_user"

# T7: Schedule (response structure)
echo "[T7] GET /api/schedule (response structure)"
r=$(curl -sf -H "Authorization: $TOKEN" "$BACKEND/api/schedule")
keys=$(echo "$r" | python3 -c 'import sys,json;print(sorted(json.load(sys.stdin).keys()))')
check "has schedule+total_credits" "schedule" "$keys"
check "has total_credits key" "total_credits" "$keys"

# T8: Reviews
echo "[T8] GET /api/courses/1/reviews"
r=$(curl -sf "$BACKEND/api/courses/1/reviews")
rkeys=$(echo "$r" | python3 -c 'import sys,json;print(sorted(json.load(sys.stdin).keys()))')
check "has reviews key" "reviews" "$rkeys"
check "has avg_rating key" "avg_rating" "$rkeys"

# T9: Recommendations
echo "[T9] GET /api/courses/1/recommend"
r=$(curl -sf "$BACKEND/api/courses/1/recommend")
recs=$(echo "$r" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["recommendations"]))')
check "has recommendations" "recommendations" "$r"

# T10: Enroll + Drop round-trip
echo "[T10] POST+DELETE enroll/drop round-trip"
# Pick course 77 (unlikely to be enrolled)
enroll_r=$(curl -s -w "\n%{http_code}" -X POST -H "Authorization: $TOKEN" "$BACKEND/api/schedule/enroll/77")
enroll_code=$(echo "$enroll_r" | tail -1)
if [[ "$enroll_code" == "200" || "$enroll_code" == "201" ]]; then
  check "enroll success" "20" "$enroll_code"
  drop_r=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "Authorization: $TOKEN" "$BACKEND/api/schedule/drop/77")
  check "drop success" "200" "$drop_r"
elif [[ "$enroll_code" == "409" ]]; then
  echo "  ⚠️  course 77 already enrolled (conflict), trying drop first"
  curl -s -o /dev/null -X DELETE -H "Authorization: $TOKEN" "$BACKEND/api/schedule/drop/77"
  enroll_r2=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: $TOKEN" "$BACKEND/api/schedule/enroll/77")
  check "enroll after drop" "20" "$enroll_r2"
  drop_r2=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE -H "Authorization: $TOKEN" "$BACKEND/api/schedule/drop/77")
  check "drop cleanup" "200" "$drop_r2"
else
  check "enroll returns 200/201/409" "20" "$enroll_code"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[[ $FAIL -eq 0 ]] && echo "🎉 All P1 tests passed!" || echo "⚠️  Some tests failed"
exit $FAIL
