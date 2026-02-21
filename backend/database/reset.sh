#!/usr/bin/env bash
# One-click database reset
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_PATH="$SCRIPT_DIR/app.db"

echo "=== Database Reset Script ==="

# Delete old database
if [ -f "$DB_PATH" ]; then
    rm "$DB_PATH"
    echo "[*] Deleted old database: $DB_PATH"
fi

# Run seed script
cd "$SCRIPT_DIR/.."
python database/seed.py

echo ""
echo "[✓] Database reset completed!"
