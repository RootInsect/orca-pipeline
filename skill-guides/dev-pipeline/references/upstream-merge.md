# Upstream merge strategy (RootInsect/orca-pipeline)

This fork stays close to [stablyai/orca](https://github.com/stablyai/orca).
The `dev-pipeline` skill is an **additive** topic: new files under
`skill-guides/`, `skill-stubs/`, `skills/`, plus small list edits in
`config/scripts/generate-bundled-skill-guides.mjs` and regenerated manifests.

## One-time remote

```text
git remote add upstream https://github.com/stablyai/orca.git
git fetch upstream
```

## Prefer rebase of the skill tip (or merge)

```text
git checkout cursor/dev-pipeline-mvp-9f16   # or main after merge
git fetch upstream
git rebase upstream/main
# if conflicts: almost always in
#   config/scripts/generate-bundled-skill-guides.mjs
#   src/cli/bundled-skill-guides.ts
#   resources/skills/*.json
# Resolve by keeping BOTH upstream topics and `dev-pipeline`, then:
pnpm generate:bundled-skill-guides
pnpm generate:skill-bundle-manifest
git add -A && git rebase --continue
```

Merge alternative: `git merge upstream/main` with the same regenerate step.

## Conflict hygiene

- Do **not** reformat unrelated Electron/renderer files when resolving.
- Do **not** rename upstream skills to make space for this topic.
- If upstream adds a topic whose name collides with `dev-pipeline`, rename
  **this** fork topic in one commit (guide + stub + generator lists + regenerate).

## What to avoid (keeps merges cheap)

- Parallel product trees that duplicate worktree/orchestration.
- Vendoring a second framework under `pipeline/`.
- Mass renames / import churn outside the skill surface.
