#!/bin/sh
set -e

SCRIPT_NAME="validate-all"
trap 'STATUS=$?; if [ "$STATUS" -ne 0 ]; then echo "FAIL: ${SCRIPT_NAME} exited with status $STATUS" >&2; fi' EXIT

sh scripts/validate-fmt.sh
sh scripts/validate-build.sh
sh scripts/validate-test.sh
sh scripts/validate-browser.sh
sh scripts/validate-artifacts.sh

trap - EXIT
echo "=== validate-all: PASS ==="
