#!/bin/sh
set -e

SCRIPT_NAME="validate-build"
trap 'STATUS=$?; if [ "$STATUS" -ne 0 ]; then echo "FAIL: ${SCRIPT_NAME} exited with status $STATUS" >&2; fi' EXIT

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/lib/resolve-app-root.sh"
. "$SCRIPT_DIR/lib/workflow-flags.sh"

APP_DIR=$(resolve_app_root "$SCRIPT_DIR/..")
ensure_evidence_dirs
BUILD_LOG="$(workflow_evidence_root)/build.log"

cd "$APP_DIR"
echo "=== validate-build: starting npm run build ==="
npm run build >"$BUILD_LOG" 2>&1

echo "=== validate-build: checking dist/ ==="
test -d dist || { echo "FAIL: dist/ not found"; exit 1; }
test -f dist/index.html || { echo "FAIL: dist/index.html missing"; exit 1; }
JS_COUNT=$(find dist/assets -name '*.js' 2>/dev/null | wc -l | tr -d ' ')
test "$JS_COUNT" -gt 0 || { echo "FAIL: no JS bundles in dist/assets/"; exit 1; }

trap - EXIT
echo "=== validate-build: PASS (dist/ exists, index.html present, ${JS_COUNT} JS bundles) ==="
