#!/bin/sh
set -e

SCRIPT_NAME="validate-browser"
trap 'STATUS=$?; if [ "$STATUS" -ne 0 ]; then echo "FAIL: ${SCRIPT_NAME} exited with status $STATUS" >&2; fi' EXIT

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/lib/resolve-app-root.sh"
. "$SCRIPT_DIR/lib/workflow-flags.sh"

APP_DIR=$(resolve_app_root "$SCRIPT_DIR/..")
ensure_evidence_dirs
BROWSER_LOG="$(workflow_evidence_root)/browser.log"

cd "$APP_DIR"
echo "=== validate-browser: building app ==="
npm run build >>"$BROWSER_LOG" 2>&1

echo "=== validate-browser: running browser verification ==="
if ! npm run verify:browser >>"$BROWSER_LOG" 2>&1; then
  test -f "$(workflow_manifest_path)" || write_manifest_stub "fail" "Browser verification failed before writing a manifest." "$BROWSER_LOG"
  exit 1
fi

sync_manifest "$(workflow_manifest_path)"

PNG_COUNT=$(find "$(workflow_evidence_root)" -name '*.png' 2>/dev/null | wc -l | tr -d ' ')
test "$PNG_COUNT" -gt 0 || { echo "FAIL: no screenshots captured"; exit 1; }

trap - EXIT
echo "=== validate-browser: PASS ($PNG_COUNT screenshots) ==="
