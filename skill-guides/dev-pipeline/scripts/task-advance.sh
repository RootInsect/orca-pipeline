#!/usr/bin/env sh
# Advance thin-layer task YAML stage / simple fields. Does not call Orca.
set -eu

TASK=""
TO=""
NOTE=""
SET_PAIRS=""

usage() {
  cat <<'EOF'
Usage: task-advance.sh --task <path> --to <stage> [--note <text>] [--set key=value ...]

Stages: classify | setup_env | clarify | plan | develop | test | review | open_pr | cicd | experience | done

Supported --set keys: worktree_id, run_id, pr_url, develop_agent, review_agent
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --task) TASK="${2:-}"; shift 2 ;;
    --to) TO="${2:-}"; shift 2 ;;
    --note) NOTE="${2:-}"; shift 2 ;;
    --set)
      SET_PAIRS="${SET_PAIRS} ${2:-}"
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'unknown arg: %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ -z "$TASK" ] || [ -z "$TO" ]; then
  usage >&2
  exit 2
fi

case "$TO" in
  classify|setup_env|clarify|plan|develop|test|review|open_pr|cicd|experience|done) ;;
  *) printf 'unsupported stage: %s\n' "$TO" >&2; exit 2 ;;
esac

if [ ! -f "$TASK" ]; then
  printf 'task file not found: %s\n' "$TASK" >&2
  exit 1
fi

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)
TMP="${TASK}.tmp.$$"

# Rewrite known top-level / nested keys with a small awk pass.
awk -v to="$TO" -v now="$NOW" -v note="$NOTE" -v sets="$SET_PAIRS" '
function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t]+$/, "", s); return s }
BEGIN {
  n = split(sets, parts, /[ \t]+/)
  for (i = 1; i <= n; i++) {
    if (parts[i] == "") continue
    split(parts[i], kv, "=")
    key = kv[1]
    val = substr(parts[i], length(key) + 2)
    setv[key] = val
  }
  in_orca = 0
  in_notes = 0
  notes_done = 0
}
{
  if ($0 ~ /^orca:[[:space:]]*$/) { in_orca = 1; in_notes = 0; print; next }
  if ($0 ~ /^[a-zA-Z_][a-zA-Z0-9_]*:/ && $0 !~ /^[[:space:]]/) {
    if (in_notes && note != "" && !notes_done) {
      print "  - \"" note "\""
      notes_done = 1
    }
    in_orca = 0
    in_notes = ($0 ~ /^notes:[[:space:]]*$/)
  }
  if ($0 ~ /^stage:[[:space:]]*/) { print "stage: " to; next }
  if ($0 ~ /^updated_at:[[:space:]]*/) { print "updated_at: " now; next }
  if ($0 ~ /^status:[[:space:]]*/ && to == "done") { print "status: done"; next }
  if ($0 ~ /^status:[[:space:]]*/ && to == "cicd") { print "status: active"; next }
  if (in_orca) {
    if ($0 ~ /^[[:space:]]+worktree_id:[[:space:]]*/ && ("worktree_id" in setv)) {
      print "  worktree_id: " setv["worktree_id"]; next
    }
    if ($0 ~ /^[[:space:]]+run_id:[[:space:]]*/ && ("run_id" in setv)) {
      print "  run_id: " setv["run_id"]; next
    }
    if ($0 ~ /^[[:space:]]+develop_agent:[[:space:]]*/ && ("develop_agent" in setv)) {
      print "  develop_agent: " setv["develop_agent"]; next
    }
    if ($0 ~ /^[[:space:]]+review_agent:[[:space:]]*/ && ("review_agent" in setv)) {
      print "  review_agent: " setv["review_agent"]; next
    }
  }
  if ($0 ~ /^pr_url:[[:space:]]*/ && ("pr_url" in setv)) {
    print "pr_url: " setv["pr_url"]; next
  }
  print
}
END {
  if (in_notes && note != "" && !notes_done) {
    print "  - \"" note "\""
  }
}
' "$TASK" >"$TMP"

mv "$TMP" "$TASK"
printf '%s -> %s\n' "$TASK" "$TO"
