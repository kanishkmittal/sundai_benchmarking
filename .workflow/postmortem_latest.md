# Postmortem: Latest Iteration Failure Analysis

## Root causes of failure
1. Verification is still running from the repository root, but the root is not an app package.
- `scripts/validate-fmt.sh` and `scripts/fix-fmt.sh` call `npx prettier ... src/` from root.
- Root has no `package.json` and no `src/`, so formatting checks fail before downstream stages.

2. Formatter targets are hardcoded and brittle.
- `src/` is assumed to exist.
- Failure in `.workflow/verify_errors.log` repeats: `No files matching the pattern were found: "src/"`.

3. Required fidelity/review artifacts were not produced in this iteration.
- Missing: `.workflow/verify_fidelity.md`, `.workflow/review_consensus.md`, `.workflow/implementation_log.md`, `.workflow/test-evidence/latest/manifest.json`, `parallel_results.json`.
- Without those, canonical AC extraction from fidelity/review outputs is blocked.

## What works and must be preserved
- Toolchain health is good and should be preserved: Node `v24.13.0`, npm `11.6.2`.
- Existing validation script scaffold and workflow docs are present and should be incrementally repaired, not replaced.
- Existing planning artifacts (`.workflow/plan_a.md`, `.workflow/plan_b.md`) and current repo structure should be kept.

## What failed and must be fixed
- Failing gate remains formatting/validation reliability (`AC9` fallback classification).
- Validation flow fails early due to root-context + hardcoded target mismatch.
- Artifact generation gates are not reached, so fidelity/review outputs remain absent.

## Progress detection (required)
- Current failing AC IDs from canonical sources (`verify_fidelity.md` or review outputs): unavailable because those files are missing.
- Fallback failing AC set from available evidence: `AC9` (from `.workflow/verify_errors.log` signature and prior postmortem/plan context).
- Previous iteration failing ACs: `AC9`.
- Comparison result: **zero progress** (identical fallback failing AC set and identical formatter failure signature).

## Concrete next changes (specific files, specific fixes)
1. Make formatting scripts app-root aware and avoid hardcoded `src/`.
- File: `scripts/validate-fmt.sh`
- File: `scripts/fix-fmt.sh`
- Fix:
  - Detect actual app root before running tools (prefer explicit env like `APP_ROOT`; fallback discovery by locating nearest `package.json` containing frontend scripts).
  - Build target list dynamically via `git ls-files` glob filters.
  - If no targets, print `SKIP: no format targets` and exit 0.

2. Stop using implicit global `npx prettier` from repo root.
- File: `scripts/validate-fmt.sh`
- File: `scripts/fix-fmt.sh`
- Fix:
  - Execute inside detected app root.
  - Prefer package scripts (`npm run fmt:check`, `npm run fmt:write`) for deterministic tool versioning.

3. Ensure the active app package defines formatter scripts/dependency.
- File: `<active-app-root>/package.json`
- Fix:
  - Add `prettier` in `devDependencies`.
  - Add scripts: `fmt:check`, `fmt:write` with project-relevant file globs.

4. Align remaining validators to the same app root.
- File: `scripts/validate-build.sh`
- File: `scripts/validate-test.sh`
- File: `scripts/validate-browser.sh`
- File: `scripts/validate-artifacts.sh`
- Fix:
  - Resolve and `cd` to active app root for build/test/browser commands.
  - Keep artifact path writing consistent (either root-relative contract or app-relative with explicit copy/sync to `.workflow/test-evidence/latest`).

5. Regenerate required workflow artifacts after AC9 repair.
- Expected outputs:
  - `.workflow/verify_fidelity.md`
  - `.workflow/review_consensus.md`
  - `.workflow/implementation_log.md`
  - `.workflow/test-evidence/latest/manifest.json`
  - `parallel_results.json` (if review stage runs)

## Evidence file paths read (or explicit reason each was skipped)
### Requested files
- `.workflow/review_consensus.md` — skipped: file missing.
- `.workflow/verify_fidelity.md` — skipped: file missing.
- `.workflow/implementation_log.md` — skipped: file missing.
- `.workflow/test-evidence/latest/manifest.json` — skipped: file missing.
- Manifest-referenced failed/suspicious IT evidence — skipped: cannot resolve because manifest is missing.
- `parallel_results.json` — skipped: file missing.

### Additional evidence read
- `.workflow/verify_errors.log` — read.
- `.workflow/postmortem_latest.md` (previous iteration content) — read for prior AC comparison.
- `.workflow/plan_a.md` — read.
- `.workflow/plan_b.md` — read.
- `scripts/validate-fmt.sh` — read.
- `scripts/fix-fmt.sh` — read.
- `scripts/validate-build.sh` — read.
- `scripts/validate-test.sh` — read.
- `scripts/validate-browser.sh` — read.
- `scripts/validate-artifacts.sh` — read.
