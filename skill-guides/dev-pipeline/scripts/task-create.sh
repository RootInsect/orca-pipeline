#!/usr/bin/env sh
# Create a thin-layer task YAML. Does not call Orca; wires type → template only.
set -eu

TYPE=""
TITLE=""
REPO=""
PROJECT_ID=""
BODY=""
TASKS_DIR="${PIPELINE_TASKS_DIR:-./pipeline-tasks}"
DOMAIN_TAGS=""

usage() {
  cat <<'EOF'
Usage: task-create.sh --type <bug_fix|new_feature|debug|small_change> --title <text> [options]

Options:
  --repo <owner/name>       Repository slug
  --project-id <id>         Experience project id (default: owner__name from --repo)
  --body <text>             Task body
  --tasks-dir <path>        Where to write task YAML (default: $PIPELINE_TASKS_DIR or ./pipeline-tasks)
  --domain-tags <a,b>       Comma-separated domain tags
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --type) TYPE="${2:-}"; shift 2 ;;
    --title) TITLE="${2:-}"; shift 2 ;;
    --repo) REPO="${2:-}"; shift 2 ;;
    --project-id) PROJECT_ID="${2:-}"; shift 2 ;;
    --body) BODY="${2:-}"; shift 2 ;;
    --tasks-dir) TASKS_DIR="${2:-}"; shift 2 ;;
    --domain-tags) DOMAIN_TAGS="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'unknown arg: %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ -z "$TYPE" ] || [ -z "$TITLE" ]; then
  usage >&2
  exit 2
fi

case "$TYPE" in
  bug_fix) TEMPLATE_ID="bugfix-v1"; MAX_CI=2 ;;
  new_feature) TEMPLATE_ID="feature-v1"; MAX_CI=2 ;;
  debug) TEMPLATE_ID="debug-v1"; MAX_CI=2 ;;
  small_change) TEMPLATE_ID="small-change-v1"; MAX_CI=1 ;;
  *) printf 'unsupported type: %s\n' "$TYPE" >&2; exit 2 ;;
esac

if [ -z "$PROJECT_ID" ] && [ -n "$REPO" ]; then
  # Stable experience id: owner__repo (not a local absolute path).
  PROJECT_ID=$(printf '%s' "$REPO" | sed 's|/|__|g')
fi

STAMP=$(date -u +%Y%m%d_%H%M%S 2>/dev/null || date +%Y%m%d_%H%M%S)
ID="task_${STAMP}_$$"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)

mkdir -p "$TASKS_DIR"
OUT="$TASKS_DIR/${ID}.yaml"

# YAML list for domain tags
TAGS_YAML="[]"
if [ -n "$DOMAIN_TAGS" ]; then
  TAGS_YAML="["
  FIRST=1
  OLDIFS=$IFS
  IFS=,
  for tag in $DOMAIN_TAGS; do
    tag=$(printf '%s' "$tag" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$tag" ] && continue
    if [ "$FIRST" -eq 1 ]; then
      TAGS_YAML="${TAGS_YAML}\"${tag}\""
      FIRST=0
    else
      TAGS_YAML="${TAGS_YAML}, \"${tag}\""
    fi
  done
  IFS=$OLDIFS
  TAGS_YAML="${TAGS_YAML}]"
fi

# Escape body for a literal block by indenting.
BODY_INDENTED=$(printf '%s\n' "$BODY" | sed 's/^/  /')

cat >"$OUT" <<EOF
id: ${ID}
source: manual
type: ${TYPE}
type_hint: ${TYPE}
template_id: ${TEMPLATE_ID}
title: $(printf '%s' "$TITLE" | sed 's/"/\\"/g' | sed 's/^/"/;s/$/"/')
body: |
${BODY_INDENTED}
repo: ${REPO:-null}
project_id: ${PROJECT_ID:-null}
base_ref: main
domain_tags: ${TAGS_YAML}
priority: normal
status: active
stage: setup_env
ci_loops: 0
max_ci_loops: ${MAX_CI}
pr_url: null
orca:
  worktree_id: null
  run_id: null
  gate_ids: []
  develop_agent: null
  review_agent: null
agent_overrides: {}
notes:
  - "created by task-create.sh; classified as ${TYPE} → ${TEMPLATE_ID}"
artifacts: []
experience:
  root_env: PIPELINE_EXPERIENCE_ROOT
  written: []
created_at: ${NOW}
updated_at: ${NOW}
EOF

printf '%s\n' "$OUT"
