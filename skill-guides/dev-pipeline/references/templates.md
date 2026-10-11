# Templates (stage + role binding)

Canonical YAML files (copy from the repo, do not invent parallel copies inside a
single project worktree as the only source of truth):

```text
skill-guides/dev-pipeline/templates/
  bugfix-v1.yaml
  feature-v1.yaml
  debug-v1.yaml
  small-change-v1.yaml
```

## Common fields

```yaml
id: bugfix-v1
task_types: [bug_fix]
max_ci_loops: 2
stages:
  - name: setup_env          # setup_env | clarify | plan | develop | test | review | open_pr | cicd | experience
    role: Orchestrator       # Orchestrator | Planner | Developer | Reviewer | Writer
    skills: []               # soft labels for agents; not Orca skill package names unless noted
    tools: []                # optional whitelist; empty = inherit type defaults
    human_gate: false
    skip_when: null          # optional predicate note
    exit_when: "…"           # human-readable exit condition
    on_fail: retry           # retry | escalate | goto:<stage>
    agent_preference:
      capability: env        # classify | env | clarify | plan | code | test | review | write
      cost: low              # low | mid | high
```

## Per-type defaults (summary)

| Template | Forced clarify | Plan role | Develop | Review isolation | Experience |
|----------|----------------|-----------|---------|------------------|------------|
| `bugfix-v1` | only if no repro | Planner | Developer | prefer other account | project (+ domain) |
| `feature-v1` | **required** | Planner | Developer | prefer other account | project |
| `debug-v1` | if expectation unclear | Planner | Developer | optional | project + domain |
| `small-change-v1` | usually skip | skipped/light | Developer | light | optional short note |

Auto-assign notes: templates declare `agent_preference.capability` + `cost`.
At runtime, map those to configured Orca agent accounts (see
`references/roles-and-routing.md`). Missing candidates → fall back to the repo
default worker and record the fallback in task notes.
