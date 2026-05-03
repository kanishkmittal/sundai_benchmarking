#!/bin/sh
set -e

SCRIPT_NAME="validate-artifacts"
trap 'STATUS=$?; if [ "$STATUS" -ne 0 ]; then echo "FAIL: ${SCRIPT_NAME} exited with status $STATUS" >&2; fi' EXIT

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/lib/workflow-flags.sh"

MANIFEST=$(workflow_manifest_path)

test -f "$MANIFEST" || { echo "FAIL: manifest.json missing at $MANIFEST"; exit 1; }

echo "=== validate-artifacts: checking scenario IDs ==="
node -e '
const fs = require("fs");
const manifestPath = process.argv[1];
const dodCandidates = [".workflow/definition_of_done.md", "substack-dod-v01.md"];
const dodPath = dodCandidates.find((candidate) => fs.existsSync(candidate));
if (!dodPath) {
  console.error("FAIL: no DoD file found");
  process.exit(1);
}
const dod = fs.readFileSync(dodPath, "utf8");
const expected = [...new Set([...dod.matchAll(/\| (IT-\d+) \|/g)].map((match) => match[1]))];
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const seen = new Set((manifest.scenarios || []).map((entry) => entry.id));
for (const id of expected) {
  if (!seen.has(id)) {
    console.error(`FAIL: ${id} missing from manifest`);
    process.exit(1);
  }
  console.log(`  OK: ${id} found`);
}
' "$MANIFEST"

echo "=== validate-artifacts: checking artifact files are non-empty ==="
node -e '
const fs = require("fs");
const manifestPath = process.argv[1];
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
for (const entry of manifest.scenarios || []) {
  for (const artifact of entry.artifacts || []) {
    const artifactPath = artifact.path || artifact;
    const stat = fs.statSync(artifactPath);
    if (stat.size === 0) {
      console.error(`FAIL: empty artifact: ${artifactPath}`);
      process.exit(1);
    }
  }
}
console.log("All artifact files are non-empty");
' "$MANIFEST"

echo "=== validate-artifacts: checking screenshots are >=5KB ==="
find "$(workflow_evidence_root)" -name '*.png' 2>/dev/null | while read -r file_path; do
  SIZE=$(wc -c < "$file_path" | tr -d ' ')
  test "$SIZE" -ge 5120 || { echo "FAIL: screenshot $file_path is too small (${SIZE} bytes)"; exit 1; }
done

trap - EXIT
echo "=== validate-artifacts: PASS ==="
