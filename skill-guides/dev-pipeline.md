---
name: dev-pipeline
description: >-
  Thin development-pipeline overlay on Orca: four task types (bug_fix /
  new_feature / debug / small_change), stage checklists, role routing
  (Orchestrator / Developer / Reviewer / Writer), and a host-level shared
  experience store at ~/.pipeline/experience. Use when classifying work into
  those types, advancing stage state, wiring stages to worktree / orchestration
  / gates / env recipes, or reading and writing shared experience — not for
  ordinary single-agent handoffs (use orca-cli) or low-level coordinator loops
  alone (use orchestration).
---

# Dev pipeline (thin task layer)

`ORCA` is a placeholder for the executable you resolved in the stub; substitute it before running.

This skill is a **thin task layer on top of Orca**. It does not replace worktrees,
terminals, orchestration, or env recipes. Task YAML is the stage truth source;
Orca owns execution.

## Outcome

**Result:** one task has a known type, loaded template, current stage, and clear
next Orca command. **Done:** stage exits are recorded, PR URL is written when
opened, and experience (if any) lands under `PIPELINE_EXPERIENCE_ROOT` (default
`~/.pipeline/experience/`), never only inside a single repo folder.

## Four task types

| 人话 | id | Template |
|------|-----|----------|
| 修 Bug | `bug_fix` | `templates/bugfix-v1.yaml` |
| 新功能 | `new_feature` | `templates/feature-v1.yaml` |
| 排查/调试 | `debug` | `templates/debug-v1.yaml` |
| 小改动 | `small_change` | `templates/small-change-v1.yaml` |

Plain-language stage checklists: load
`ORCA skills get dev-pipeline --reference references/task-types.md`.

Machine-readable templates live next to this guide at
`skill-guides/dev-pipeline/templates/` (repo path). An annotated copy is also in
`references/templates.md`.

## Stage → Orca wiring

| Stage | Orca surface | Thin layer |
|-------|--------------|------------|
| classify | — | pick type + template |
| setup_env | `ORCA worktree create … --json`; env recipe / `ORCA vm recipe doctor … --json` | record worktree id + notes |
| clarify / plan | `ORCA orchestration gate-create` / `ask` / `reply` | inject experience summary; write artifacts |
| develop / test / review | `ORCA orchestration run-create`, `worker-start`, `check --wait` | advance stage on exit_when |
| open_pr | agent runs `gh pr create` (or host equivalent) | write `pr_url` into task state |
| cicd | pull CI summary (e.g. `gh`); gate + re-dispatch on red | honor `max_ci_loops` (suggest 2); **not** a claimed auto-webhook unless you add one |
| experience | — | write under shared experience root + append `index.jsonl` |

Full command sketches:
`ORCA skills get dev-pipeline --reference references/orca-wiring.md`.

## Roles → workers

| Role | Typical stage | Cost | Orca mapping |
|------|---------------|------|--------------|
| Orchestrator | classify, setup_env, clarify, cicd loop, experience | low | coordinator + gates + advance script |
| Planner | plan | mid–high | stronger model worker |
| Developer | develop, test, open_pr | mid–low | develop worker account |
| Reviewer | review | mid | **different** account from Developer when possible |
| Writer | experience / docs (optional) | low | optional; skip on bug_fix MVP |

Routing notes:
`ORCA skills get dev-pipeline --reference references/roles-and-routing.md`.

## Shared experience store

Default root: `~/.pipeline/experience/` (override with `PIPELINE_EXPERIENCE_ROOT`).

```text
$PIPELINE_EXPERIENCE_ROOT/
  projects/<project-id>/
  agents/<agent-id>/
  domains/<domain-id>/
  index.jsonl
```

**Do not** store experience only under `repo/.experience/` or
`pipeline/experience/` — that breaks cross-project reuse.

Scaffold: `skill-guides/dev-pipeline/scripts/experience-init.sh`.

Schema and read/write timing:
`ORCA skills get dev-pipeline --reference references/experience-store.md`.

## Task state

Example file:
`skill-guides/dev-pipeline/examples/task-state.example.yaml`.

Helpers (optional, local files only):

```text
skill-guides/dev-pipeline/scripts/task-create.sh --type bug_fix --title "…" --repo owner/name
skill-guides/dev-pipeline/scripts/task-advance.sh --task <path-or-id> --to plan
```

These scripts write YAML under a chosen tasks dir; they do **not** replace Orca
orchestration state.

## Demo (修 Bug happy path)

`ORCA skills get dev-pipeline --reference references/demo-bugfix.md`.

## Upstream merge (this fork)

`ORCA skills get dev-pipeline --reference references/upstream-merge.md`.

## Conditional references

| Action gate | Reference |
|-------------|-----------|
| Stage checklists for the four types | `references/task-types.md` |
| Template YAML + field notes | `references/templates.md` |
| Concrete Orca CLI mapping | `references/orca-wiring.md` |
| Role / cost routing | `references/roles-and-routing.md` |
| Shared experience layout | `references/experience-store.md` |
| End-to-end bug_fix demo | `references/demo-bugfix.md` |
| Rebase/merge stablyai/orca into this fork | `references/upstream-merge.md` |
