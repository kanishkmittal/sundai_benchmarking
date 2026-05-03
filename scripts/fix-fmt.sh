#!/bin/sh
set -e

SCRIPT_NAME="fix-fmt"
trap 'STATUS=$?; if [ "$STATUS" -ne 0 ]; then echo "FAIL: ${SCRIPT_NAME} exited with status $STATUS" >&2; fi' EXIT

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/lib/resolve-app-root.sh"

APP_DIR=$(resolve_app_root "$SCRIPT_DIR/..")
TARGETS=$(git -C "$APP_DIR" ls-files '*.ts' '*.tsx' '*.css' '*.json' '*.html' '*.md' ':!:package-lock.json' ':!:dist/**' ':!:build/**' ':!:.workflow/**' ':!:.ai/**')

echo "=== fix-fmt: Prettier write ==="
if [ -z "$TARGETS" ]; then
  echo "SKIP: no format targets"
  trap - EXIT
  exit 0
fi

cd "$APP_DIR"
# shellcheck disable=SC2086
npm run fmt:write -- $TARGETS

trap - EXIT
echo "=== fix-fmt: DONE ==="
