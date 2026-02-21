#!/bin/bash
# P3 Roulette Feature Test Script
# Tests: Course Selection Wheel with Random Subset Generation
# Prerequisites: 
#   1. Backend running on localhost:8000 with seeded DB
#   2. Frontend dev server running on localhost:5173
# Run: chmod +x test_p3_roulette.sh && ./test_p3_roulette.sh

echo "╔══════════════════════════════════════╗"
echo "║   P3 Roulette Selection Tests       ║"
echo "╚══════════════════════════════════════╝"
echo ""

BACKEND="http://localhost:8000"
FRONTEND="http://localhost:5173"

echo "📝 Manual Test Checklist for Course Selection Wheel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ══════════════════════════════════════
# Automated Backend Verification
# ══════════════════════════════════════
echo "🔍 [Pre-Check] Backend API health"
health=$(curl -sf "$BACKEND/" 2>/dev/null)
if [[ $? -ne 0 ]]; then
  echo "  ❌ Backend not reachable at $BACKEND"
  exit 1
fi
echo "  ✅ Backend is running"

# Check course count
courses=$(curl -sf "$BACKEND/api/courses")
total=$(echo "$courses" | python3 -c 'import sys,json;print(json.load(sys.stdin)["total"])' 2>/dev/null)
if [[ "$total" -gt 0 ]]; then
  echo "  ✅ Backend has $total courses available"
else
  echo "  ❌ No courses found in backend"
  exit 1
fi
echo ""

# ══════════════════════════════════════
# Manual Test Instructions
# ══════════════════════════════════════
echo "🎡 [Test Flow] Course Selection Wheel - Random Subset"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Please perform the following manual tests in your browser:"
echo ""
echo "1️⃣  Initial State Test:"
echo "    - Navigate to: $FRONTEND/selection"
echo "    - ✅ Verify: Page shows title 'Course Selection Wheel'"
echo "    - ✅ Verify: Wheel is NOT visible initially"
echo "    - ✅ Verify: Button '🎲 Generate Random Courses' is displayed"
echo "    - ✅ Verify: Description text explains the functionality"
echo ""

echo "2️⃣  Random Generation Test:"
echo "    - Click '🎲 Generate Random Courses' button"
echo "    - ✅ Verify: Wheel appears with courses"
echo "    - ✅ Verify: Wheel displays 12-15 courses (not all $total courses)"
echo "    - ✅ Verify: Course codes are visible on wheel segments"
echo "    - ✅ Verify: Each segment has a distinct color"
echo "    - ✅ Verify: '🔄 Regenerate Courses' button appears"
echo ""

echo "3️⃣  Wheel Density Test:"
echo "    - Observe the wheel visual appearance"
echo "    - ✅ Verify: Wheel is NOT overcrowded (text is readable)"
echo "    - ✅ Verify: Course codes don't overlap"
echo "    - ✅ Verify: Segments are reasonably sized"
echo ""

echo "4️⃣  Regeneration Test:"
echo "    - Note the current course codes on the wheel"
echo "    - Click '🔄 Regenerate Courses' button"
echo "    - ✅ Verify: Wheel updates with a different set of courses"
echo "    - ✅ Verify: New set has 12-15 courses"
echo "    - ✅ Verify: At least some courses are different from before"
echo ""

echo "5️⃣  Spin Functionality Test:"
echo "    - Click 'SPIN THE WHEEL' button"
echo "    - ✅ Verify: Wheel starts spinning"
echo "    - ✅ Verify: Button changes to 'Spinning...' and is disabled"
echo "    - ✅ Verify: Wheel stops after a short duration"
echo "    - ✅ Verify: Selected course appears below the wheel"
echo ""

echo "6️⃣  Multiple Selection Test:"
echo "    - Spin the wheel again"
echo "    - ✅ Verify: Another course is added to selected courses list"
echo "    - ✅ Verify: Wheel automatically excludes time conflicts"
echo "    - ✅ Verify: If all courses have conflicts, appropriate message appears"
echo "    - ✅ Verify: 'Generate Random Courses' button works after selecting courses"
echo ""

echo "7️⃣  Edge Case - All Courses Selected:"
echo "    - Select multiple courses until no valid courses remain"
echo "    - ✅ Verify: When no valid courses exist:"
echo "        - 'Generate Random Courses' button is disabled"
echo "        - Message: 'All courses have been selected or have time conflicts!'"
echo ""

echo "8️⃣  Integration with Backend (if implemented):"
echo "    - If backend enrollment is implemented:"
echo "    - ✅ Verify: Confirmation dialog appears after wheel stops"
echo "    - ✅ Verify: Clicking 'OK' calls POST /api/schedule/enroll"
echo "    - ✅ Verify: 409 conflicts are handled with proper error messages"
echo "    - ✅ Verify: Selected courses persist across page refresh"
echo ""

# ══════════════════════════════════════
# Code Verification
# ══════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 [Code Check] Verifying implementation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROULETTE_FILE="$SCRIPT_DIR/src/components/rouletteSelection/CourseRoulette.tsx"

if [[ ! -f "$ROULETTE_FILE" ]]; then
  echo "  ❌ CourseRoulette.tsx not found"
  exit 1
fi

# Check for key features in code
roulette_code=$(cat "$ROULETTE_FILE")

if echo "$roulette_code" | grep -q "generateRandomSubset"; then
  echo "  ✅ generateRandomSubset function exists"
else
  echo "  ❌ generateRandomSubset function not found"
fi

if echo "$roulette_code" | grep -q "wheelCourses"; then
  echo "  ✅ wheelCourses state exists"
else
  echo "  ❌ wheelCourses state not found"
fi

if echo "$roulette_code" | grep -q "Generate Random Courses"; then
  echo "  ✅ Generate button text exists"
else
  echo "  ❌ Generate button text not found"
fi

if echo "$roulette_code" | grep -q "Regenerate"; then
  echo "  ✅ Regenerate button exists"
else
  echo "  ❌ Regenerate button not found"
fi

# Check min/max course count (12-15)
if echo "$roulette_code" | grep -q "min.*=.*12" && echo "$roulette_code" | grep -q "max.*=.*15"; then
  echo "  ✅ Default min=12, max=15 configured"
else
  echo "  ⚠️  Warning: min/max values might differ from 12-15"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Automated checks complete!"
echo ""
echo "Please perform the manual tests above and verify:"
echo "  • Wheel displays 12-15 courses (not all $total)"
echo "  • Regeneration works correctly"
echo "  • Visual clarity is improved (no overcrowding)"
echo ""
echo "After manual verification, update FRONTEND_PLAN.md flow 3 test results."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
