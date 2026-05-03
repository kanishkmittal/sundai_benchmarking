#!/bin/sh
set -e

SCRIPT_NAME="validate-test"
trap 'STATUS=$?; if [ "$STATUS" -ne 0 ]; then echo "FAIL: ${SCRIPT_NAME} exited with status $STATUS" >&2; fi' EXIT

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/lib/resolve-app-root.sh"
. "$SCRIPT_DIR/lib/workflow-flags.sh"

APP_DIR=$(resolve_app_root "$SCRIPT_DIR/..")
ensure_evidence_dirs
TEST_LOG="$(workflow_evidence_root)/test.log"
SMOKE_LOG="$(workflow_evidence_root)/smoke.log"

cd "$APP_DIR"
STATUS=0

echo "=== validate-test: running integration tests ==="
if npm test >"$TEST_LOG" 2>&1; then
  :
else
  STATUS=$?
fi

if [ "$STATUS" -eq 0 ]; then
  echo "=== validate-test: smoke tests ==="
  if [ -n "${GEMINI_API_KEY:-}" ]; then
    if npm run test:smoke >"$SMOKE_LOG" 2>&1; then
      :
    else
      STATUS=$?
    fi
  else
    echo "SKIP: GEMINI_API_KEY not set; skipping smoke tests" >"$SMOKE_LOG"
  fi
fi

if [ ! -f "$(workflow_manifest_path)" ]; then
  if [ "$STATUS" -eq 0 ]; then
    write_manifest_stub "pass" "Integration pipeline completed without a generated manifest." "$TEST_LOG"
  else
    write_manifest_stub "fail" "Integration or smoke tests failed before writing a manifest." "$TEST_LOG"
  fi
else
  sync_manifest "$(workflow_manifest_path)"
fi

test -f "$(workflow_manifest_path)" || { echo "FAIL: manifest.json not written by tests"; exit 1; }

if [ "$STATUS" -ne 0 ]; then
  exit "$STATUS"
fi

trap - EXIT
echo "=== validate-test: PASS ==="
