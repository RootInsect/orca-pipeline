# Roles and Agent routing

Framework = stage state machine with hard gates. Chat memory is **not** the
source of truth.

## Matrix

| Stage | Role | Capability | Cost | Example |
|-------|------|------------|------|---------|
| classify | Orchestrator | classify | low | rules / cheap model |
| setup_env | Orchestrator | env | low | CLI + env skill |
| clarify | Orchestrator | clarify | mid | dialogue-strong |
| plan | Planner | plan | mid–high | strong planner |
| develop | Developer | code | mid–low | cheap strong coder |
| test | Developer | test | low | same as develop or tester |
| review | Reviewer | review | mid | different account from develop |
| open_pr | Developer | code | low | same as develop |
| cicd / fix loop | Orchestrator + Developer | classify + code | mid | coordinator re-dispatches |
| experience | Orchestrator / Writer | write | low | cheap summarizer |

## MVP rules

1. Template stage declares `role` + `agent_preference`.
2. Policy / local config maps role → ordered agent account candidates.
3. Default: Plan stronger; Develop/Test value; Review ≠ Develop when possible.
4. Missing candidate → repo default worker + note on the task.
5. Task-level `agent_overrides` may force an account for a stage.

## What this skill does **not** do

- No custom Agent pool service.
- No rewrite of Orca orchestration workers.
- Writer is optional; bug_fix demo may skip a dedicated Writer worker.
