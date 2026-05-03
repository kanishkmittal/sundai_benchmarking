# sundai_benchmarking

This repo is set up to use two spec-driven tooling layers:

- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** — manages capability specs and proposed changes that AI coding assistants read before they implement work.
- **[Fabro](https://docs.fabro.computer/)** — runs spec-driven workflows (proposals, tasks, PRs) with a configurable project context.

Both tools have **already been initialized** in this repo. You only need to install the CLIs locally, then run normal commands.

---

## Prerequisites

- Node.js 20+ (for OpenSpec)
- A package manager — this project prefers `bun`. `npm`/`pnpm`/`yarn` also work for global installs of these tools if you don't have bun.
- Git

---

## OpenSpec

### Install

```bash
bun add -g @fission-ai/openspec
# or: npm install -g @fission-ai/openspec
```

Verify:

```bash
openspec --version
```

### What's already in the repo

`openspec init` has been run. The layout is:

```
openspec/
├── config.yaml        # schema: spec-driven
├── specs/             # capability specs (currently empty)
└── changes/
    └── archive/       # archived/completed changes
```

You do **not** need to run `openspec init` again.

### Common commands

```bash
openspec list                  # list current specs and changes
openspec proposal "title..."   # draft a new change proposal under openspec/changes/
openspec validate              # validate spec/change formatting
openspec archive <change>      # move a completed change into changes/archive
```

Inside Claude Code, the OpenSpec workflow is also available as slash skills:

- `/openspec-explore` — think through an idea before proposing
- `/openspec-propose` — generate a complete change proposal
- `/openspec-apply-change` — implement tasks from a change
- `/openspec-archive-change` — archive when done

---

## Fabro

### Install

Follow the [Fabro quick start](https://docs.fabro.computer/getting-started/quick-start) to install the CLI and authenticate:

```bash
# install (see Fabro docs for the current command)
curl -fsSL https://fabro.computer/install.sh | sh

# log in
fabro auth login
```

### What's already in the repo

`fabro repo init` has been run. The layout is:

```
.fabro/
├── project.toml       # _version = 1; PR auto-create enabled (draft)
└── workflows/
    └── hello/         # starter workflow
```

You do **not** need to run `fabro repo init` again.

### Configure project context (optional)

Edit `.fabro/project.toml` to add a `context` block and per-artifact `rules` so Fabro's AI has the right tech-stack and conventions when it drafts proposals and tasks. Templates are commented in the file.

### PR behavior

`.fabro/project.toml` is set to auto-open **draft** PRs on successful workflow runs:

```toml
[run.pull_request]
enabled = true
draft = true
# auto_merge = true   # uncomment to also auto-merge
```

### Common commands

```bash
fabro workflow list             # list workflows under .fabro/workflows/
fabro run hello                 # run the starter workflow
fabro workflow new <name>       # scaffold a new workflow
fabro model list                # list available models/providers
fabro run --preflight <file>    # validate without executing
```

See `fabro --help` and the [docs](https://docs.fabro.computer/) for the full surface.

### Authoring new workflows with the `fabro-create-workflow` skill

This repo ships a Claude Code skill at `.claude/skills/fabro-create-workflow/` that turns a natural-language description into a runnable workflow — a `.fabro` DOT graph plus an optional `.toml` run config.

**How to use it from Claude Code:**

1. Describe what you want, e.g.:
   > "Create a Fabro workflow that runs `bun test`, has Claude analyze any failures, then opens a fix-it loop with up to 3 retries."
2. Claude invokes `fabro-create-workflow`, which will:
   - Run `fabro model list` to fetch the current model catalog (never guesses model IDs).
   - Ask clarifying questions about goal, tools, parallelism, human gates, sandbox.
   - Pick a topology (linear, command-then-analyze, implement-test-fix loop, plan-approve-implement, parallel fan-out, multi-model ensemble, browser-testing with Vibium, etc.).
   - Write the `.fabro` DOT graph (with `start`/`exit`, correct node shapes, `model_stylesheet`, `max_visits` on retry nodes, `goal_gate` on verifications).
   - Write a matching `workflow.toml` if sandbox/setup/env/vars are needed.
   - Run `fabro run --preflight` to validate.

**Where to put the result.** Drop the generated files into `.fabro/workflows/<name>/`:

```
.fabro/workflows/<name>/
├── workflow.fabro     # DOT graph
├── workflow.toml      # run config (optional)
└── prompts/           # external @prompt files (optional)
```

**Skill references** (read by the skill, useful if you author by hand):

- `.claude/skills/fabro-create-workflow/references/dot-language.md` — DOT node types, edges, conditions, stylesheets
- `.claude/skills/fabro-create-workflow/references/run-configuration.md` — TOML sandbox, setup, hooks, LLM, vars, assets
- `.claude/skills/fabro-create-workflow/references/example-workflows.md` — complete example workflows

**Quick guardrails to remember:**

- Exactly one `start` (Mdiamond) and one `exit` (Msquare); no edges into start or out of exit.
- `box` = agent with tools, `tab` = LLM-only think/analyze, `parallelogram` = shell command, `diamond` = routing only (no prompt), `hexagon` = human gate, `component`/`tripleoctagon` = fan-out/merge.
- Set `max_visits` (typically 3) on fix/retry nodes to avoid infinite loops.
- Use `goal_gate=true` on must-pass verification nodes; pair with `retry_target`.
- Use semicolons between properties in `model_stylesheet` rules.
- For UI tests, prefer **Vibium** (`vibium install` in `[setup]`) over Playwright/MCP.

---

## How they fit together

- Use **OpenSpec** to capture *what* the system should do (specs) and *what's changing* (proposals under `openspec/changes/`).
- Use **Fabro workflows** to drive the implementation loop — turning a proposal into tasks, code, and a draft PR.

A typical flow:

1. `/openspec-propose` (or `openspec proposal …`) to draft a change.
2. Review and refine the proposal + tasks in `openspec/changes/<change>/`.
3. Run a Fabro workflow (or `/openspec-apply-change`) to implement.
4. Merge the PR, then `openspec archive <change>` to move it under `openspec/changes/archive/`.
