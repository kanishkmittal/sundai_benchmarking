# Final Implementation Plan — Substack Article Creator Tool

## Inputs and Merge Basis
- Branch outputs: `.workflow/plan_a.md`, `.workflow/plan_b.md` (used because `parallel_results.json` is missing).
- Postmortem (read first): `.workflow/postmortem_latest.md`.
- Prior-run diagnostics: `.workflow/implementation_log.md` missing, `.workflow/verify_fidelity.md` missing.
- Product context: `substack-spec-v01.md`, `substack-dod-v01.md` (fallback because `.workflow/spec.md` and `.workflow/definition_of_done.md` are missing).

## Plan Synthesis Decisions
- Use Plan A as the structural base (stronger module granularity, dependency layering, AC mapping).
- Pull in Plan B’s concise infra boundaries (`db`, `llm`, `session recorder`) and deployment artifact detail (`Procfile` option).
- Add explicit postmortem-first work to fix AC9 failure mode before feature expansion.
- Add hard gates to ensure required artifacts are always produced (including best-effort output on failures).

## Postmortem-Driven Corrections (Mandatory)
1. Remove root-level hardcoded formatter assumptions (`src/`, root `npx prettier`).
2. Make all validate/fix scripts app-root aware via shared resolver (`APP_ROOT` override + package discovery fallback).
3. Require package-level `fmt:check` and `fmt:write` scripts with local `prettier` devDependency.
4. Align build/test/browser validators to the same resolved app root.
5. Enforce required artifacts:
   - `.workflow/verify_fidelity.md`
   - `.workflow/review_consensus.md`
   - `.workflow/implementation_log.md`
   - `.workflow/test-evidence/latest/manifest.json`
   - `parallel_results.json` (when review/fanout stage is enabled)

## Target Architecture
- Vite + React + TypeScript SPA (frontend only).
- IndexedDB (`idb`) for config, drafts, posts, sessions, replay cache.
- Gemini client wrapper with structured JSON + retry/backoff + model routing:
  - Prod: 3.1 Flash + 3.1 Pro
  - Smoke: Flash Lite substitution for all calls
- Deterministic browser evidence harness writing contract artifacts per IT scenario.

## Dependency-Ordered Work Queue (Bounded Modules)

### Core Infrastructure (lowest IDs)
| ID | Module | Target Files | Est LOC | Depends On | Done When |
|---|---|---|---:|---|---|
| WQ-001 | Runtime + App Root Resolution Utilities | `scripts/lib/resolve-app-root.sh`, `scripts/lib/workflow-flags.sh` | 220-320 | none | Shared shell helpers resolve app root deterministically (`APP_ROOT` override, package script checks, clear errors). |
| WQ-002 | Package Script Contract + Tooling Baseline | `package.json`, `.env.example` | 200-260 | WQ-001 | `fmt:check`/`fmt:write`, build/test/browser validate scripts, and smoke/manual mode env switches are defined. |
| WQ-003 | Format Validation Hardening (AC9 blocker) | `scripts/validate-fmt.sh`, `scripts/fix-fmt.sh` | 220-320 | WQ-001, WQ-002 | Dynamic file targeting via `git ls-files`; no hardcoded `src/`; skip cleanly when no targets; runs inside resolved app root. |
| WQ-004 | Build/Test/Browser Validator Root Alignment | `scripts/validate-build.sh`, `scripts/validate-test.sh`, `scripts/validate-browser.sh` | 260-420 | WQ-001, WQ-002 | All validators execute from same resolved app root and emit consistent logs/artifact paths. |
| WQ-005 | Artifact Contract Validator + Orchestrator | `scripts/validate-artifacts.sh`, `scripts/validate-all.sh` | 240-360 | WQ-003, WQ-004 | Missing required `.workflow`/manifest artifacts fail fast; conditional `parallel_results.json` requirement respected when review stage enabled. |
| WQ-006 | Domain Model Layer | `src/core/types/domain.ts` | 220-320 | WQ-002 | Typed entities for settings, sources, citations, drafts, posts, sessions, replay events finalized. |
| WQ-007 | Runtime Config + Mode Resolver | `src/core/config/runtimeConfig.ts` | 220-300 | WQ-006 | Prod/smoke/manual model mappings and feature flags resolved centrally. |
| WQ-008 | IndexedDB Bootstrap + Migrations | `src/core/storage/db.ts` | 240-340 | WQ-006 | Stores for config/drafts/posts/sessions/replay initialized with versioned migrations. |
| WQ-009 | Storage Repositories | `src/core/storage/settingsRepo.ts`, `src/core/storage/contentRepo.ts`, `src/core/storage/sessionRepo.ts`, `src/core/storage/resetService.ts` | 380-500 | WQ-008 | Persistence, lineage retention, and full reset behavior implemented and unit-tested. |
| WQ-010 | LLM Schemas + Prompt Builders | `src/core/llm/schemas.ts`, `src/core/llm/prompts.ts` | 320-480 | WQ-006, WQ-007 | Structured schema registry and deterministic prompt builders for setup/trending/new-post flows. |
| WQ-011 | LLM Client (Structured Retry/Backoff) | `src/core/llm/llmClient.ts` | 360-500 | WQ-007, WQ-010 | JSON validation, retry-with-feedback, backoff/jitter, and model routing pass IT-9 semantics. |
| WQ-012 | Session Recording + Replay Data Service | `src/core/replay/sessionRecorder.ts`, `src/core/replay/replayService.ts` | 280-420 | WQ-009, WQ-011 | Production sessions recorded fully; replay uses cached responses; cache miss hard-fails (no live fallback). |

### Shared UI + Navigation Foundation
| ID | Module | Target Files | Est LOC | Depends On | Done When |
|---|---|---|---:|---|---|
| WQ-013 | App Shell + Route Guards | `src/app/AppShell.tsx`, `src/app/routes.tsx` | 240-340 | WQ-007, WQ-009 | First-run routes to Settings; returning users route to Dashboard; demo/new-post/trending routes wired. |
| WQ-014 | Substack Theme + Core Primitives | `src/ui/theme/substackTheme.css`, `src/ui/components/Card.tsx`, `src/ui/components/ProgressBar.tsx`, `src/ui/components/StepDots.tsx` | 360-500 | WQ-013 | Serif/Substack-like styling, no-shadow cards, no spinner/skeleton pattern, horizontal bar + step dots complete. |
| WQ-015 | Rich Input + Source/Post Display Primitives | `src/ui/components/RichInput.tsx`, `src/ui/components/SourceCard.tsx`, `src/ui/components/PostViewer.tsx` | 360-500 | WQ-014 | Reusable typed/paste/upload/link input; source metadata cards; serif markdown viewer with footnotes/links. |

### Feature Delivery
| ID | Module | Target Files | Est LOC | Depends On | Done When |
|---|---|---|---:|---|---|
| WQ-016 | Settings + Confirmation Workflow | `src/features/setup/SettingsPage.tsx`, `src/features/setup/ConfirmationStep.tsx` | 360-500 | WQ-011, WQ-013, WQ-015 | Parallel setup completion; Pro confirmations with back; subtle reset flow integrated. |
| WQ-017 | Dashboard + History/Draft Entry Points | `src/features/dashboard/DashboardPage.tsx` | 240-340 | WQ-016 | Prominent New Post/Trending, Settings access, post history + resume draft actions. |
| WQ-018 | Trending Topics Pipeline | `src/features/trending/TrendingTopicsPage.tsx`, `src/features/trending/TrendVisualization.tsx` | 360-500 | WQ-011, WQ-017 | Parallel Flash grounded fetch, deterministic visualization, Pro synthesis to exactly 3 prompts, prefill-to-topic nav. |
| WQ-019 | New Post State Machine + Research/Outline | `src/features/newPost/newPostMachine.ts`, `src/features/newPost/ResearchStep.tsx`, `src/features/newPost/OutlineStep.tsx` | 380-500 | WQ-011, WQ-015, WQ-017 | Topic→Research→Outline flow works with source highlight/delete and metadata persistence. |
| WQ-020 | New Post Write Cycles + Complete | `src/features/newPost/WritePipeline.tsx`, `src/features/newPost/CompleteStep.tsx` | 360-500 | WQ-019 | Automatic 3-cycle Write/Edit/Guardrails flow (no manual controls), visible progress, markdown save/display, citation lineage retained. |
| WQ-021 | Demo Mode UX + Bundled Session | `src/features/demo/DemoSessionPickerPage.tsx`, `src/features/demo/DemoReplayEngine.tsx`, `src/demo/cannedSessions.ts` | 360-500 | WQ-012, WQ-017 | Bundled P&G session present; replay affordances (fade, delayed attachments, highlighted next button); cache-miss error path enforced. |

### Testing, Evidence, and Release Readiness (highest IDs)
| ID | Module | Target Files | Est LOC | Depends On | Done When |
|---|---|---|---:|---|---|
| WQ-022 | Stable Selector Registry + Test Fixtures | `src/tests/browser/testIds.ts`, `src/test-fixtures/cannedSessions.ts` | 240-360 | WQ-015, WQ-021 | Critical states/actions expose stable `data-testid`; canned fixtures deterministic for integration mode. |
| WQ-023 | Integration/Smoke/Manual Test Suites | `src/__tests__/integration/scenarios.test.ts`, `src/__tests__/smoke/scenarios.smoke.test.ts`, `src/__tests__/manual/manualMode.test.ts` | 420-500 | WQ-020, WQ-022 | IT-1..IT-12 logic covered; smoke runs only after integration; manual mode opt-in. |
| WQ-024 | Browser Scenario Runner + Evidence Writer | `src/tests/browser/runScenarios.ts`, `src/tests/browser/scenarios.ts`, `src/core/testing/evidenceWriter.ts`, `src/tests/browser/manifestValidator.ts` | 420-500 | WQ-022, WQ-023 | Each scenario writes manifest entry + screenshots + trace/log + console/unhandled summary; failures still emit best-effort artifacts. |
| WQ-025 | Deployment Readiness Artifacts | `railway.json`, `Procfile` (if needed), `docs/deploy-railway.md` | 220-320 | WQ-004 | GitHub→Railway handoff docs/config coherent; no live deploy actions required for acceptance. |
| WQ-026 | Workflow Artifact Publishing | `.workflow/verify_fidelity.md`, `.workflow/review_consensus.md`, `.workflow/implementation_log.md`, `.workflow/test-evidence/latest/manifest.json` generation hooks | 220-320 | WQ-005, WQ-024 | Verification run reliably materializes all required workflow artifacts; conditional `parallel_results.json` presence checked/recorded. |

## Phase Gates
1. Gate A (AC9 unblock): WQ-001 to WQ-005 complete before feature work beyond scaffold.
2. Gate B (Core reliability): WQ-006 to WQ-012 complete with unit tests for retry/backoff + persistence.
3. Gate C (UX parity): WQ-013 to WQ-021 complete with visual checks (no spinner/skeleton regressions).
4. Gate D (Evidence + release): WQ-022 to WQ-026 complete; validators pass in sequence.

## Validation Order (must stay fixed)
1. `npm run validate:fmt`
2. `npm run validate:build`
3. `npm run validate:test` (integration -> smoke; manual optional)
4. `npm run validate:browser`
5. `npm run validate:artifacts`
6. `npm run validate:all` (orchestrated aggregate)

## AC Coverage Notes
- AC9 risk is explicitly front-loaded via WQ-001 to WQ-005.
- AC11 evidence contract is implemented by WQ-024 + enforced by WQ-005/WQ-026.
- Demo cache-miss no-fallback behavior (AC-8.7) is isolated in WQ-012/WQ-021 for focused testing.
- Citation lineage persistence (AC-2.7, AC-7.15) is enforced in WQ-009 and validated in WQ-020/WQ-023.

## Immediate Execution Start Point
- Start with WQ-001, WQ-002, WQ-003 in order.
- Do not begin UI feature modules until Gate A passes and formatter/validator reliability is proven in current repo layout.
