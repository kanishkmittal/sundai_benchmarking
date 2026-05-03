# Plan A — Substack Creator Newsletter Engine Implementation Plan

## Inputs Used
- Spec source: `substack-spec-v01.md` (fallback because `.workflow/spec.md` is not present)
- DoD source: `substack-dod-v01.md` (fallback because `.workflow/definition_of_done.md` is not present)
- Lessons incorporated: `.workflow/postmortem_latest.md`

## Delivery Strategy
Implement in dependency-ordered vertical slices so every phase is runnable and testable. Prioritize foundational reliability first (LLM schema/retry, IndexedDB persistence, deterministic test harness, validation scripts), then product flows, then visual fidelity and release-readiness artifacts.

## Architecture Baseline (React + Vite + TS)
- Frontend-only SPA using Vite + React + TypeScript.
- Client-side Gemini calls through `@google/generative-ai`; API key stored in IndexedDB (no backend proxy).
- Persistence via `idb` for settings, drafts, post history, session recordings, demo cache/replay.
- Shared design primitives enforce Substack-like visual language and no-spinner rule.
- Scenario-driven browser evidence pipeline outputs `.ai/test-evidence/latest/manifest.json` and artifacts per DoD evidence contract.

## Project Setup (Phase 0)
1. Scaffold
- `npm create vite@latest` (React + TypeScript)
- Standardize to single app package root for deterministic scripts.

2. Dependencies
- Runtime: `react`, `react-dom`, `idb`, `@google/generative-ai`, `react-router-dom`, `react-markdown`.
- Optional display helpers: `remark-gfm`.
- Dev/Test: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `playwright`, `msw`, `prettier`, `typescript`, `eslint`.

3. Top-level scripts in `package.json`
- `dev`, `build`, `preview`
- `test:unit`, `test:integration`, `test:smoke`, `test:manual`
- `browser:integration`, `browser:smoke`, `browser:manual`
- `fmt:check`, `fmt:write`
- `validate:build`, `validate:fmt`, `validate:test`, `validate:browser`, `validate:artifacts`, `validate:all`

4. Environment contracts
- `.env.example` includes model aliases and smoke/manual switches.
- Test mode model substitution switch (`Flash Lite for all`) centralized in config.

## Module Decomposition (Target 200–500 LOC each)

### Core Infrastructure
| Module | Path | Est. LOC | Purpose |
|---|---|---:|---|
| App Shell + Routing | `src/app/AppShell.tsx` | 260 | Route guards for first-run vs dashboard/demo/new-post; global layout |
| Typed Domain Models | `src/core/types/domain.ts` | 240 | Strong types for settings, sources, citations, posts, sessions, replay events |
| App Config + Mode Resolver | `src/core/config/runtimeConfig.ts` | 220 | Production/smoke/manual mode resolution; model mapping and feature flags |
| LLM JSON Schema Registry | `src/core/llm/schemas.ts` | 280 | Structured output schemas for each task (confirm, trends, research, outline, write cycles) |
| LLM Client + Retry/Backoff | `src/core/llm/llmClient.ts` | 420 | Gemini invocation, JSON parse/validate, retry with feedback, exponential backoff/jitter, telemetry |
| Prompt Builders | `src/core/llm/prompts.ts` | 320 | Prompt templates for Flash/Pro tasks and replay-safe deterministic prompts |
| IndexedDB Bootstrap | `src/core/storage/db.ts` | 240 | `idb` database open/migrations/store definitions |
| Settings Repository | `src/core/storage/settingsRepo.ts` | 260 | API key/company/voice/guardrails CRUD + completeness checks |
| Content Repository | `src/core/storage/contentRepo.ts` | 360 | drafts/posts/source metadata/citation lineage persistence |
| Session + Replay Repository | `src/core/storage/sessionRepo.ts` | 340 | Full session event recording, demo session lookup, cache-miss detection |
| State Reset Service | `src/core/storage/resetService.ts` | 210 | "Reset everything" full IndexedDB wipe + safety checks |
| Evidence Logger (browser) | `src/core/testing/evidenceWriter.ts` | 260 | Per-scenario manifest writer and artifact registration helpers |

### Shared UI System
| Module | Path | Est. LOC | Purpose |
|---|---|---:|---|
| Global Theme + Tokens | `src/ui/theme/substackTheme.css` | 250 | Substack-like serif palette/spacing; progress bar animation; no shadows |
| Card Primitive | `src/ui/components/Card.tsx` | 230 | Unified card container for blocks/results/confirmations/previews |
| Rich Input Control | `src/ui/components/RichInput.tsx` | 420 | textarea + attach/link toolbar + typed/paste/upload/link handling |
| Step Dots Indicator | `src/ui/components/StepDots.tsx` | 220 | accent/current, green/done, outlined/future states |
| Progress Bar | `src/ui/components/ProgressBar.tsx` | 210 | animated horizontal bar; explicitly no spinner/skeleton usage |
| Source Card | `src/ui/components/SourceCard.tsx` | 260 | headline/snippet/metadata + highlight/delete controls |
| Markdown Post Viewer | `src/ui/components/PostViewer.tsx` | 280 | serif rendering, numbered footnotes, linked source titles |
| Demo Replay Affordances | `src/ui/components/DemoReplayDecorators.tsx` | 220 | fade-in prefill, delayed attachments, next-button highlight |

### Feature Modules
| Module | Path | Est. LOC | Purpose |
|---|---|---:|---|
| Settings Flow Controller | `src/features/setup/SettingsPage.tsx` | 430 | first-run flow, parallel completion, subtle reset option |
| Confirmation Workflow | `src/features/setup/ConfirmationStep.tsx` | 260 | Pro-based confirmation with back navigation |
| Dashboard | `src/features/dashboard/DashboardPage.tsx` | 300 | New Post + Trending prominence, settings entry, drafts/history lists |
| Trending Orchestrator | `src/features/trending/TrendingTopicsPage.tsx` | 460 | parallel Flash grounded calls, deterministic aggregation, Pro synthesis to 3 prompts |
| Trend Visualization | `src/features/trending/TrendVisualization.tsx` | 260 | deterministic topic/trend visual rendering |
| New Post State Machine | `src/features/newPost/newPostMachine.ts` | 330 | Topic→Research→Outline→Write/Edit/Guardrails→Complete transitions |
| New Post Research Step | `src/features/newPost/ResearchStep.tsx` | 360 | source fetch/stream rendering, metadata capture, highlight/delete |
| New Post Outline Step | `src/features/newPost/OutlineStep.tsx` | 230 | one-shot Pro outline + back/accept controls |
| New Post Write Pipeline | `src/features/newPost/WritePipeline.tsx` | 430 | strict automatic 3-cycle execution and visible progress states |
| New Post Complete Step | `src/features/newPost/CompleteStep.tsx` | 260 | markdown save/view and citation-footnote resolution checks |
| Demo Mode Session Picker | `src/features/demo/DemoSessionPickerPage.tsx` | 260 | list recorded + bundled sessions |
| Demo Replay Engine | `src/features/demo/DemoReplayEngine.tsx` | 420 | production-path replay with cache-miss hard error/no live fallback |

### Testing + Validation Infrastructure
| Module | Path | Est. LOC | Purpose |
|---|---|---:|---|
| Canned Fixtures Generator Output | `src/test-fixtures/cannedSessions.ts` | 280 | bundled deterministic fixtures including P&G session |
| Integration Scenario Specs | `src/__tests__/integration/scenarios.test.ts` | 480 | IT-1..IT-12 mappings with canned data/no-network assertions |
| Smoke Scenario Specs | `src/__tests__/smoke/scenarios.smoke.test.ts` | 260 | live Flash Lite calls after integration pass |
| Manual Mode Harness | `src/__tests__/manual/manualMode.test.ts` | 210 | explicit switch to production model mix |
| Playwright Browser Runner | `src/tests/browser/runScenarios.ts` | 420 | scenario execution, artifact capture, console/unhandled summaries |
| Browser Scenario Definitions | `src/tests/browser/scenarios.ts` | 320 | deterministic browser path definitions and selectors |
| Manifest Contract Validator | `src/tests/browser/manifestValidator.ts` | 220 | validates evidence completeness and required fields |
| Selector Registry | `src/tests/browser/testIds.ts` | 240 | stable `data-testid` map for critical flows/actions/states |

### Deployment + Ops Deliverables
| Module | Path | Est. LOC | Purpose |
|---|---|---:|---|
| Railway Config | `railway.json` | 220 | build/start/static output wiring and env placeholders |
| Deploy Readiness Doc | `docs/deploy-railway.md` | 260 | GitHub→Railway handoff instructions; explicit no-live-deploy validation |
| Validation Orchestrator | `scripts/validate-all.sh` | 240 | runs validate-* scripts in required order |
| Build Validator | `scripts/validate-build.sh` | 220 | install/build/static output/deploy-readiness checks |
| Format Validator | `scripts/validate-fmt.sh` | 230 | robust formatter check (postmortem fix applied) |
| Test Validator | `scripts/validate-test.sh` | 260 | integration gate before smoke/manual |
| Browser Validator | `scripts/validate-browser.sh` | 300 | browser scenario evidence and manifest generation |
| Artifact Validator | `scripts/validate-artifacts.sh` | 260 | asserts required files/artifacts for DoD acceptance |
| Formatter Auto-fix | `scripts/fix-fmt.sh` | 220 | deterministic formatting writes using package scripts |

## Dependency Ordering

### Layer 1 (Must Exist First)
1. `src/core/types/domain.ts`
2. `src/core/config/runtimeConfig.ts`
3. `src/core/storage/db.ts`
4. `src/core/llm/schemas.ts`
5. `src/core/llm/llmClient.ts`
6. `src/core/llm/prompts.ts`
7. `src/ui/theme/substackTheme.css`
8. `src/ui/components/{Card,RichInput,ProgressBar,StepDots}.tsx`

### Layer 2 (Data + Platform Services)
1. `settingsRepo.ts`, `contentRepo.ts`, `sessionRepo.ts`, `resetService.ts`
2. `evidenceWriter.ts`, `testIds.ts`
3. `AppShell.tsx` route skeleton

### Layer 3 (User Flows)
1. Setup flow + confirmation workflow
2. Dashboard
3. Trending topics orchestrator + visualization
4. New Post machine + steps + write pipeline + complete step
5. Demo picker + replay engine

### Layer 4 (Verification + Release)
1. Fixtures + integration suite
2. Smoke suite (gated after integration)
3. Manual mode harness
4. Browser runner + manifest validator + screenshots/traces
5. Deployment/readiness docs + Railway config
6. Validation scripts + artifact checks

## Postmortem Lessons Applied (AC9 and workflow reliability)
1. Validation scripts are app-root aware
- All `scripts/validate-*.sh` and `scripts/fix-fmt.sh` resolve app root dynamically (prefer `APP_ROOT`, fallback to nearest `package.json` with required scripts).

2. Formatter targets are dynamic and safe
- `validate-fmt.sh` and `fix-fmt.sh` use tracked file globs (via `git ls-files`) instead of hardcoded `src/`.
- If no targets are found, script prints `SKIP: no format targets` and exits 0.

3. Deterministic tool invocation
- Use `npm run fmt:check` / `npm run fmt:write` inside resolved app root.
- Avoid root-level implicit `npx` assumptions.

4. Artifact generation cannot be skipped silently
- `validate-artifacts.sh` hard-fails when required acceptance artifacts are missing:
  - `.workflow/verify_fidelity.md`
  - `.workflow/review_consensus.md`
  - `.workflow/implementation_log.md`
  - `.workflow/test-evidence/latest/manifest.json`
  - `parallel_results.json` (when review stage is enabled)

## Acceptance Coverage Plan (By DoD Group)

### AC-1 Build & Deploy
- Implement `validate-build.sh` for install/build/static output checks.
- Add `railway.json` + `docs/deploy-railway.md` (review-only validation, no live deploy command).

### AC-2 Persistence
- Repositories persist settings, drafts, posts, sessions, citation lineage.
- Reset service fully wipes IndexedDB and returns app to first-run state.

### AC-3 LLM Integration
- Every LLM task routes through `llmClient.ts` with structured schema validation.
- Malformed JSON retries include error feedback and backoff schedule.
- Runtime mode mapping enforces Flash/Pro in prod and Flash Lite substitution in smoke.

### AC-4 Setup Flow
- Settings first-run route, parallel completion, empty-state icons.
- Rich input reused across company/voice/guardrails/topic.
- Pro confirmations include back navigation.

### AC-5 Dashboard
- Prominent New Post/Trending buttons.
- Settings entry, drafts + past posts list, resume/view actions.

### AC-6 Trending Topics
- On open, launch parallel Flash grounded calls.
- Deterministic visualization built as results arrive.
- Pro synthesis returns exactly 3 prompts; selection prefills New Post topic.

### AC-7 New Post Pipeline
- Strict sequence with automatic write/edit/guardrails cycles (no manual in-between controls).
- Visible cycle progress with horizontal bars.
- Complete step renders serif Markdown with numbered footnotes and source links.
- Citation lineage retained and resolvable across reloads.

### AC-8 Demo Mode
- Session picker lists recorded + bundled P&G session.
- Replay uses production code path with UX replay effects.
- Cache miss yields explicit error and blocks live fallback.

### AC-9 Visual Design
- Central theme enforces Substack-like serif style, palette, card spacing, no shadows.
- No spinner/skeleton components; progress bars only.
- Post preview fidelity validated by screenshot checklist.

### AC-10 Testing Infrastructure
- Integration tests: canned data + no network.
- Smoke tests: live Flash Lite only after integration pass.
- Manual mode: explicit real-model config flag.

### AC-11 Browser Evidence Contract
- Browser runner writes per-scenario manifest entries with status/artifacts/summary.
- Required screenshots + trace/log + console/unhandled summaries.
- Failures still emit best-effort artifacts and manifest entries.

## Test Infrastructure Plan
1. Integration (default CI gate)
- Use canned fixtures for LLM outputs and replay sessions.
- Enforce zero external network calls.

2. Smoke (post-integration gate)
- Run only when integration suite passes.
- Replace all model selections with `gemini-2.5-flash-lite`.
- Keep retries/backoff enabled to absorb nondeterminism.

3. Manual (non-blocking option)
- Explicit command/config to use production model mix (`3.1 Flash` + `3.1 Pro`).
- Intended for final qualitative review and prompt quality checks.

4. Browser evidence output
- Write `.ai/test-evidence/latest/manifest.json` with one entry per IT scenario.
- Persist screenshots, traces, logs, console summary, and failures with artifacts.

## Build/Validate Script Contract
- `scripts/validate-build.sh`: install/build/deploy-readiness review checks.
- `scripts/validate-fmt.sh`: app-root aware format checks.
- `scripts/validate-test.sh`: integration then smoke ordering; manual option discovery.
- `scripts/validate-browser.sh`: browser scenarios + evidence bundle generation.
- `scripts/fix-fmt.sh`: deterministic formatter fix pass.
- `scripts/validate-artifacts.sh`: required DoD artifact presence/integrity checks.

## Deployment Readiness (GitHub -> Railway)
- Include `railway.json` configured for static build artifact serving.
- Add documentation for expected env vars and build/start commands.
- Validate by repository review/static checks only; no deployment execution in DoD runs.

## Milestones and Exit Criteria

### M1 — Foundations Complete
- Core LLM + storage + UI primitives implemented.
- Unit checks pass; first-run routing works.

### M2 — Primary Flows Complete
- Setup, Dashboard, Trending, New Post complete paths functional.
- Session recording + citation lineage persistence in place.

### M3 — Demo + Visual Fidelity
- Bundled P&G replay works with cache-miss behavior.
- AC-9 visual constraints satisfied (Substack-like serif, no spinners).

### M4 — Validation + Release Readiness
- All `validate-*` scripts pass in order.
- Evidence manifest and required artifacts generated.
- Deployment-readiness docs/config complete and reviewable.

## Execution Order Summary
1. Scaffold + dependencies + scripts baseline.
2. Core types/config + LLM + IndexedDB.
3. Shared UI primitives and theme.
4. Setup + Dashboard.
5. Trending topics.
6. New Post pipeline + citation lineage.
7. Demo replay with bundled P&G session.
8. Integration/smoke/manual/browser test systems.
9. Validation scripts hardening + artifact validator.
10. Deployment readiness docs/config and final acceptance crosscheck.
