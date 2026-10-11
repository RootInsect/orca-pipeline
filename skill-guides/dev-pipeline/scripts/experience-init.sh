#!/usr/bin/env sh
# Scaffold host-level shared experience store (never repo-local only).
set -eu

ROOT="${PIPELINE_EXPERIENCE_ROOT:-$HOME/.pipeline/experience}"

mkdir -p "$ROOT/projects" "$ROOT/agents" "$ROOT/domains"

INDEX="$ROOT/index.jsonl"
if [ ! -f "$INDEX" ]; then
  : >"$INDEX"
fi

# Keep a tiny README so humans find the schema without opening the skill guide.
README="$ROOT/README.md"
if [ ! -f "$README" ]; then
  cat >"$README" <<'EOF'
# Shared experience store

Managed by the Orca `dev-pipeline` skill.

- `projects/<project-id>/` — repo-specific lessons
- `agents/<agent-id>/` — agent preferences across repos
- `domains/<domain-id>/` — cross-project domain notes
- `index.jsonl` — append-only index

Override root with `PIPELINE_EXPERIENCE_ROOT`. Do not move this tree into a single git repo as the only copy.
EOF
fi

printf 'experience root ready: %s\n' "$ROOT"
