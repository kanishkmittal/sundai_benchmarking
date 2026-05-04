#!/bin/sh

workflow_root() {
  printf '%s\n' "${WORKFLOW_ROOT:-.workflow}"
}

workflow_evidence_root() {
  printf '%s/test-evidence/latest\n' "$(workflow_root)"
}

ai_evidence_root() {
  printf '%s\n' "${AI_EVIDENCE_ROOT:-.ai/test-evidence/latest}"
}

workflow_manifest_path() {
  printf '%s/manifest.json\n' "$(workflow_evidence_root)"
}

ai_manifest_path() {
  printf '%s/manifest.json\n' "$(ai_evidence_root)"
}

ensure_evidence_dirs() {
  mkdir -p "$(workflow_evidence_root)" "$(ai_evidence_root)"
}

sync_manifest() {
  SOURCE_PATH=$1

  ensure_evidence_dirs
  WORKFLOW_TARGET=$(workflow_manifest_path)
  AI_TARGET=$(ai_manifest_path)

  if [ "$(cd "$(dirname "$SOURCE_PATH")" && pwd)/$(basename "$SOURCE_PATH")" != "$(cd "$(dirname "$WORKFLOW_TARGET")" && pwd)/$(basename "$WORKFLOW_TARGET")" ]; then
    cp "$SOURCE_PATH" "$WORKFLOW_TARGET"
  fi
  if [ "$(cd "$(dirname "$SOURCE_PATH")" && pwd)/$(basename "$SOURCE_PATH")" != "$(cd "$(dirname "$AI_TARGET")" && pwd)/$(basename "$AI_TARGET")" ]; then
    cp "$SOURCE_PATH" "$AI_TARGET"
  fi
}

write_manifest_stub() {
  STATUS=$1
  SUMMARY=$2
  LOG_PATH=$3
  TARGET=$(workflow_manifest_path)

  ensure_evidence_dirs

  node -e '
const fs = require("fs");
const target = process.argv[1];
const status = process.argv[2];
const summary = process.argv[3];
const logPath = process.argv[4];
const payload = {
  generatedAt: new Date().toISOString(),
  scenarios: [
    {
      id: "IT-10",
      status,
      summary,
      artifacts: logPath ? [{ path: logPath, type: "log" }] : []
    }
  ]
};
fs.writeFileSync(target, JSON.stringify(payload, null, 2));
' "$TARGET" "$STATUS" "$SUMMARY" "$LOG_PATH"

  sync_manifest "$TARGET"
}
