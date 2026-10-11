# Shared experience store

## Why host-level

Experience must cross repos. Storing only under `repo/.experience/` or
`repo/pipeline/experience/` loses cross-project recall and ties notes to one
worktree.

## Layout

```text
$PIPELINE_EXPERIENCE_ROOT/          # default ~/.pipeline/experience
  projects/<project-id>/            # repo/product-specific
  agents/<agent-id>/                # follows CLI identity across repos
  domains/<domain-id>/              # docker, auth, i18n, ci, …
  index.jsonl
```

Ids:

- `project-id`: stable short name (`owner__repo` or configured `project_id`)
- `agent-id`: `claude` / `codex` / `cursor-agent` / …
- `domain-id`: lowercase tags

Scaffold:

```text
sh skill-guides/dev-pipeline/scripts/experience-init.sh
# or: PIPELINE_EXPERIENCE_ROOT=/path/to/sync sh …/experience-init.sh
```

## Note schema (Markdown + front matter)

```markdown
---
id: compose-profile-dev
title: compose 要用 profile=dev
scope: project
scope_id: acme__web
tags: [docker, env]
when_to_use: 本地或 worktree 起服务失败时
what_happened: 默认 compose 没拉 worker
lesson: 一律 docker compose --profile dev up -d
links: [task-123]
updated_at: 2026-10-11T11:00:00+08:00
---

短正文即可。
```

## index.jsonl (one JSON object per line)

```json
{"id":"compose-profile-dev","scope":"project","scope_id":"acme__web","tags":["docker","env"],"title":"compose 要用 profile=dev","updated_at":"2026-10-11T11:00:00+08:00","path":"projects/acme__web/compose-profile-dev.md"}
```

Write the file first, then append/update the index line. Never store secrets.

## When to read / write

| When | Action |
|------|--------|
| Plan (and classify if useful) | Filter index by project + agent + domain_tags; inject ≤5 summaries |
| experience stage (CI green or explicit close) | Draft note → correct bucket → index append |
| Optional CI fix success | Short `ci-fix` tagged note |

MVP retrieval is grep/scan of `index.jsonl`, not a vector DB.
