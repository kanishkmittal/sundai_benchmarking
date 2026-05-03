# Run Configuration (TOML) Reference

The TOML file configures how a workflow is executed. It is separate from the DOT graph which defines the workflow structure.

## Minimal Config

```toml
_version = 1

[workflow]
graph = "workflow.fabro"

[run]
goal = "Implement the login feature"
```

**Required:** `_version` (must be 1 — note the underscore prefix), `[workflow] graph` (path relative to TOML file's directory).

> ⚠️ **Breaking change**: The top-level key is `_version`, NOT `version`. Using `version` will cause a parse error: _"settings files must use `_version` instead of `version`"_.

## All Sections

### Top-level

| Field | Type | Description |
|---|---|---|
| `_version` | Integer | Must be `1` (underscore-prefixed) |

### `[workflow]`

| Field | Type | Description |
|---|---|---|
| `graph` | String | Path to DOT file (relative to TOML) |

### `[run]`

| Field | Type | Description |
|---|---|---|
| `goal` | String | Override workflow goal |
| `working_dir` | String | Working directory for the run |

### `[run.model]`

```toml
[run.model]
name = "claude-sonnet-4-6"
fallbacks = ["gemini-3.1-pro-preview", "gpt-5.2"]
```

### `[[run.prepare.steps]]`

Sequential shell commands run before the workflow starts:

```toml
[[run.prepare.steps]]
script = "npm install"

[[run.prepare.steps]]
script = "npm run build"
```

### `[run.sandbox]`

```toml
[run.sandbox]
provider = "local"     # local, docker, daytona
preserve = false

[run.sandbox.local]
worktree_mode = "always"  # always, never, clean, dirty

[run.sandbox.daytona]
auto_stop_interval = 60   # minutes

[run.sandbox.daytona.snapshot]
name = "my-snapshot"
cpu = 4
memory = "8GB"
disk = "20GB"
dockerfile = "FROM node:20-slim\nRUN apt-get update"

[run.sandbox.env]
NODE_ENV = "test"
API_KEY = "{{ env.API_KEY }}"   # passthrough from host env
```

### `[run.inputs]`

Variables passed into the workflow:

```toml
[run.inputs]
repo_name = "my-project"
branch = "main"
```

### `[run.checkpoint]`

```toml
[run.checkpoint]
exclude_globs = ["node_modules/**", ".git/**"]
```

### `[run.artifacts]`

```toml
[run.artifacts]
include = ["output/**", "*.png"]
```

### `[run.pull_request]`

```toml
[run.pull_request]
enabled = true
draft = true
auto_merge = false
merge_strategy = "squash"
```

### `[[run.hooks]]`

Lifecycle event hooks:

```toml
[[run.hooks]]
id = "pre-check"
event = "stage_start"
script = "./scripts/pre-check.sh"
blocking = true

[[run.hooks]]
id = "notify"
event = "run_complete"
script = "echo 'Done'"
```

Events: `stage_start`, `stage_complete`, `run_complete`, `run_failed`, and others.

## Complete Example

```toml
_version = 1

[workflow]
graph = "workflow.fabro"

[run]
goal = "Build and test the feature"
working_dir = "/tmp/workdir"

[run.model]
name = "claude-sonnet-4-6"
fallbacks = ["gemini-3.1-pro-preview"]

[[run.prepare.steps]]
script = "npm install"

[[run.prepare.steps]]
script = "npm run build"

[run.sandbox]
provider = "local"

[run.sandbox.local]
worktree_mode = "always"

[run.sandbox.env]
NODE_ENV = "test"
API_KEY = "{{ env.API_KEY }}"

[run.artifacts]
include = ["test-results/**", "coverage/**"]

[run.checkpoint]
exclude_globs = ["node_modules/**", ".git/**"]
```

## Precedence (first match wins)

Node-level attribute > Stylesheet > TOML config > CLI flags > Server defaults > DOT graph attributes > Built-in defaults

## Validation

```bash
fabro run --preflight workflow.toml   # validate without executing
```
