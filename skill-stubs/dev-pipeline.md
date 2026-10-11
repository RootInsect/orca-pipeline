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

<!-- shared: resolver -->

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

<!-- shared: no-guessing -->
