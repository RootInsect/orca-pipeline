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

This file is a discovery stub, not the usage guide. The full, version-matched Orca
dev-pipeline reference is served by the `orca` binary itself — kept out of this file on
purpose so it can never drift from the binary that will actually run your commands.

Engage this skill for the thin development-pipeline overlay: four task types
(bug_fix / new_feature / debug / small_change), stage checklists, role routing
(Orchestrator / Developer / Reviewer), host-level shared experience under
`~/.pipeline/experience`, and mapping those stages onto Orca worktree /
orchestration / gates / env recipes. Use `orca-cli` for ordinary worktree and
terminal handoffs without stage state, and `orchestration` when you need the
supervised coordinator loop without pipeline typing.

## Resolve the CLI for this session

Choose the executable once and reuse it for every later command:

- If the `ORCA_CLI_COMMAND` environment variable is set, use its value. Orca exports this
  for managed WSL sessions.
- Otherwise, in a dev checkout whose session exposes `ORCA_DEV_REPO_ROOT`, use `orca-dev`.
- Otherwise, on Linux outside an Orca-managed terminal, use `orca-ide`. Never run bare
  `orca` there — outside Orca's terminals it normally resolves to the
  GNOME Orca screen reader (`/usr/bin/orca`) and starts speech on the user's machine.
- Otherwise, use `orca`.

Below, `ORCA` is a placeholder for the executable you resolved. Substitute it before
running anything; do not create a shell variable or run `ORCA` literally. This works the
same way in POSIX shells, PowerShell, and cmd.exe.

If the selected executable cannot run, report its exact error and stop. Do not fall through
to another executable, which could silently target a different Orca build.

## Load the version-matched guide before running Orca commands

```text
ORCA skills get dev-pipeline
```

That prints the compact, version-matched guide for the exact binary that will handle your
next commands. For a conditional action gate (task-type checklists, templates, Orca wiring,
roles, experience store, demo, or upstream merge), load only the reference that gate names
with `ORCA skills get dev-pipeline --reference references/<file>.md`
(`--references` lists the names). If that binary rejects `--reference`, run
`ORCA skills get dev-pipeline --full` and read the named bundled reference before acting.

Prefer `--json`. Use the selected executable's `--help` for commands or flags the guide does
not cover. If a command reports that Orca is not running, start it with `ORCA open --json`
and retry. If it fails with `runtime_access_denied`, your sandbox blocked the connection:
re-run it with escalated permissions, and do not run `ORCA open` or restart Orca. If
`skills get` is unknown, explain that updating Orca restores the guide; use `--help` for
read-only discovery and do not guess unsupported commands.
