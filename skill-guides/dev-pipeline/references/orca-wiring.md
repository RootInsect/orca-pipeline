# Stage → Orca CLI wiring

`ORCA` is the executable you resolved in the stub. Prefer `--json`.

This reference maps pipeline stages to **existing** Orca surfaces. It does not
add a second orchestration engine.

## setup_env

```text
ORCA worktree create --name <task-slug> --no-parent --agent <develop-agent> --prompt "<brief>" --json
```

If the project has a per-workspace env recipe:

```text
ORCA vm recipe doctor <recipe-id> --repo-path <repo> --json
```

Record `worktree` id (two-part `repoId::path`) and env notes on the task YAML.
Load `orca-cli` / `orca-per-workspace-env` for details.

## clarify / plan (gates)

Bind a supervised run when you need coordinator ownership:

```text
ORCA status --json
ORCA orchestration run-create --objective "<task title>" --json
ORCA orchestration worker-start --spec "<clarify or plan spec>" --worktree current --agent <agent> --json
ORCA orchestration gate-create --task <task_id> --question "<decision>" --options <json_array> --json
ORCA orchestration gate-resolve --id <gate_id> --resolution "<choice>" --json
```

Workers use `ask`; coordinators `reply`. Do not invent a parallel gate store —
use Orca gates and write summaries into `artifacts/<task_id>/`.

Before plan: load ≤5 experience summaries from the shared store (project +
agent + domain tags).

## develop / test / review

```text
ORCA orchestration worker-start --spec "<develop spec>" --worktree <placement> --agent <develop-agent> --json
ORCA orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json
```

Prefer a **different** `--agent` for review. On review reject, re-dispatch
develop (same Task with `--retry-of` when appropriate). Full contract:
`ORCA skills get orchestration`.

## open_pr

Usually inside the develop (or a short follow-up) worker:

```text
gh pr create --title "…" --body "…"
```

Write `pr_url` / number back to the task state file. This skill does not wrap
`gh`.

## cicd loop

MVP path is **manual or polled**, not a claimed GitHub webhook:

1. Read CI summary (`gh pr checks` / `gh run view`).
2. On red: put summary into a gate or coordinator message; dispatch a fix worker.
3. Increment `ci_loops`; stop at `max_ci_loops` (templates default to 2) →
   `blocked` / `failed` on the task YAML.
4. On green: advance to `experience`.

Do not claim CI is fully automated unless a real hook is implemented.

## terminals / search

- Agent CLIs run in Orca terminals on the task worktree.
- Session discovery: `ORCA search` (see `orca-cli` guide).
- MVP does **not** build a second session database.
