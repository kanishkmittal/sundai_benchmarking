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
```

See `fabro --help` and the [docs](https://docs.fabro.computer/) for the full surface.

---

## How they fit together

- Use **OpenSpec** to capture *what* the system should do (specs) and *what's changing* (proposals under `openspec/changes/`).
- Use **Fabro workflows** to drive the implementation loop — turning a proposal into tasks, code, and a draft PR.

A typical flow:

1. `/openspec-propose` (or `openspec proposal …`) to draft a change.
2. Review and refine the proposal + tasks in `openspec/changes/<change>/`.
3. Run a Fabro workflow (or `/openspec-apply-change`) to implement.
4. Merge the PR, then `openspec archive <change>` to move it under `openspec/changes/archive/`.
