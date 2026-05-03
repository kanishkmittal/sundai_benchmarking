# Implementation Plan: Substack Creator Newsletter Engine

## 1. Project Overview
A brand-driven Substack content creation tool built as a pure React frontend application. It leverages Gemini LLMs for content generation, research, and synthesis, with all data persisted locally via IndexedDB.

### Tech Stack
- **Framework:** Vite + React + TypeScript
- **Persistence:** `idb` (IndexedDB wrapper)
- **LLM SDK:** `@google/generative-ai`
- **Styling:** CSS Modules (Substack-like serif aesthetic)
- **Deployment:** Railway (GitHub integration)

---

## 2. Infrastructure & Core Modules

### 2.1 Persistence Layer (`src/infra/db.ts`)
- **Size:** ~250 lines
- **Responsibility:** Initialize IndexedDB schema (stores: `config`, `posts`, `drafts`, `sessions`). Provide CRUD operations for each store.
- **Dependency:** None

### 2.2 LLM Client (`src/infra/llm.ts`)
- **Size:** ~400 lines
- **Responsibility:** Wrapper for `@google/generative-ai`.
  - Implements **Structured Output Mode** (JSON enforcement).
  - Implements **Retry/Backoff** logic (handles malformed JSON or rate limits).
  - Model routing: Gemini 3.1 Flash (small tasks), 3.1 Pro (complex tasks), 2.5 Flash Lite (tests).
- **Dependency:** `db.ts` (to fetch API key)

### 2.3 Session Recorder/Replayer (`src/infra/session-recorder.ts`)
- **Size:** ~300 lines
- **Responsibility:** 
  - **Production Mode:** Intercept all LLM calls and user inputs to record "sessions".
  - **Demo Mode:** Provide cached responses instead of live API calls.
- **Dependency:** `db.ts`, `llm.ts`

### 2.4 Shared UI Components (`src/components/common/`)
- **Card.tsx:** Container primitive with clean spacing, no shadows.
- **RichInput.tsx:** Textarea + attach/link toolbar.
- **ProgressBar.tsx:** Horizontal accent-color fill (animating left-to-right).
- **StepIndicators.tsx:** Horizontal dots (accent/green/outlined).
- **Size:** ~500 lines total

---

## 3. Feature Modules

### 3.1 Setup Flow (`src/features/setup/`)
- **Size:** ~400 lines
- **Components:** `SettingsPage.tsx`, `SetupStep.tsx`.
- **Logic:** Parallel completion of API Key, Company, Voice, and Guardrails.
- **Dependency:** `infra/db.ts`, `infra/llm.ts`

### 3.2 Dashboard (`src/features/dashboard/`)
- **Size:** ~350 lines
- **Components:** `Dashboard.tsx`, `PostList.tsx`, `DraftList.tsx`.
- **Logic:** History view, resume drafts, navigation to New Post/Trending.
- **Dependency:** `infra/db.ts`

### 3.3 Trending Topics (`src/features/trending/`)
- **Size:** ~350 lines
- **Components:** `TrendingView.tsx`, `TrendVisualization.tsx`.
- **Logic:** Parallel Flash calls with search grounding; Pro-based prompt synthesis.
- **Dependency:** `infra/llm.ts`, `components/common/`

### 3.4 New Post Pipeline (`src/features/post-pipeline/`)
- **Size:** ~600 lines
- **Steps:** Topic -> Research -> Outline -> 3-Cycle Write -> Complete.
- **Logic:** Preservation of citation lineage (source metadata -> footnotes).
- **Dependency:** `infra/llm.ts`, `infra/db.ts`, `components/common/`

---

## 4. Test Infrastructure

### 4.1 Integration & Smoke Tests
- **Location:** `src/__tests__/`
- **Integration:** Canned data (no network).
- **Smoke:** Live Gemini 2.5 Flash Lite calls.
- **Manual:** Full production model mix.
- **Evidence:** Generate `.ai/test-evidence/latest/manifest.json` and screenshots.

### 4.2 Validation Scripts
- `scripts/validate-fmt.sh`: Discovers files via `git ls-files` instead of hardcoded `src/`.
- `scripts/fix-fmt.sh`: Robust formatter fix using local Prettier.
- `scripts/validate-build.sh`: Vite build exit code 0 check.
- `scripts/validate-test.sh`: Runs test suite and checks manifest.
- `scripts/validate-browser.sh`: Browser-level smoke verification.
- `scripts/validate-artifacts.sh`: Final check for all required deliverables.

---

## 5. Deployment Configuration
- `railway.json`: Configuration for static asset deployment.
- `Procfile`: Start command for web process.
- `README.md`: Instructions for Railway setup (API keys, etc.).

---

## 6. Implementation Schedule & Dependency Order

1. **Phase 1: Foundation**
   - Setup project (Vite/TS/Prettier).
   - Core Infra: `db.ts`, `llm.ts`, `session-recorder.ts`.
   - Validation scripts (fixes from postmortem).
2. **Phase 2: Common Components**
   - Substack-serif styling.
   - `RichInput`, `Card`, `ProgressBar`.
3. **Phase 3: Setup & Dashboard**
   - Routing logic (Settings vs Dashboard).
   - Persistence verification.
4. **Phase 4: Post Pipeline**
   - Multi-step flow implementation.
   - Citation management.
5. **Phase 5: Trending & Demo**
   - Search grounding integration.
   - Replay logic and bundled P&G session.
6. **Phase 6: Final Validation**
   - Full test suite execution.
   - Artifact generation and manifest verification.

---

## 7. Lessons from Postmortem
- **Prettier:** Use local `devDependencies` version and run via `npm run fmt`.
- **Targeting:** Scripts must handle missing `src/` gracefully or target dynamically discovered files.
- **Evidence:** Every verification run must produce the evidence bundle to satisfy the DoD.