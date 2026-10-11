# Demo：一条「修 Bug」happy path

目标：用薄层任务状态 + Orca 原生能力，从建任务走到开 PR（CI 回环用手动/轮询即可，不假装已接 webhook）。

## 0. 准备

1. Orca 已安装并运行：`ORCA status --json`（`ORCA` = stub 里解析到的可执行文件）。
2. 共享经验库空壳：

```text
sh skill-guides/dev-pipeline/scripts/experience-init.sh
```

3. （可选）选一个任务落盘目录，例如 `~/pipeline-tasks/`（**不要**把经验正文只写进某个 git 仓库）。

## 1. 建任务（薄层）

```text
sh skill-guides/dev-pipeline/scripts/task-create.sh \
  --type bug_fix \
  --title "登录按钮无响应" \
  --repo owner/name \
  --project-id owner__name \
  --tasks-dir ~/pipeline-tasks \
  --body "点击登录无反应；控制台有 TypeError"
```

得到类似 `~/pipeline-tasks/task_<id>.yaml`，`type: bug_fix`，`template_id: bugfix-v1`，
`stage: classify` → 脚本会推进到 `setup_env`。对照
`examples/task-state.example.yaml`。

## 2. setup_env（Orca）

```text
ORCA worktree create --name fix-login-button --no-parent --agent codex --prompt "Reproduce login TypeError; minimal fix" --json
```

需要时：`ORCA vm recipe doctor <recipe-id> --repo-path <repo> --json`。

把 worktree id 写回任务（编辑 YAML 或）：

```text
sh skill-guides/dev-pipeline/scripts/task-advance.sh \
  --task ~/pipeline-tasks/task_<id>.yaml \
  --to clarify \
  --set worktree_id='<repoId::path>'
```

有稳定复现时可跳过 clarify：`--to plan --note "skip clarify: repro known"`。

## 3. plan + 经验注入

1. 扫 `~/.pipeline/experience/index.jsonl`（按 `project_id` / domain）。
2. 建 orchestration run + plan worker / gate（见 `references/orca-wiring.md`）。
3. 通过后：

```text
sh skill-guides/dev-pipeline/scripts/task-advance.sh --task … --to develop
```

## 4. develop → test → review

```text
ORCA orchestration run-create --objective "Fix login TypeError" --json
ORCA orchestration worker-start --spec "<develop acceptance>" --worktree current --agent <develop> --json
ORCA orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json
```

Review 尽量换账户再 `worker-start`。阶段随退出条件推进：
`develop` → `test` → `review` → `open_pr`。

## 5. open_pr

Worker 内 `gh pr create …`；写回：

```text
sh skill-guides/dev-pipeline/scripts/task-advance.sh \
  --task … --to cicd --set pr_url='https://github.com/owner/name/pull/N'
```

## 6. CI 回环（诚实版）

```text
gh pr checks N
# 红：摘要进 gate → 再 dispatch 修 → ci_loops++；超过 max_ci_loops(2) 则 blocked
# 绿：进入 experience
```

```text
sh skill-guides/dev-pipeline/scripts/task-advance.sh --task … --to experience
```

## 7. 经验回流（共享库）

在 `~/.pipeline/experience/projects/<project-id>/` 写一条 Markdown 笔记，并 append
一行到 `index.jsonl`（字段见 `references/experience-store.md`）。然后：

```text
sh skill-guides/dev-pipeline/scripts/task-advance.sh --task … --to done
```

## 验收勾选

- [ ] 任务 YAML 从 `bug_fix` 走到 `done`，含 `pr_url`
- [ ] worktree / terminal / orchestration 全程走 Orca，无自建 PTY
- [ ] clarify 或 plan 至少一次 gate（或 YAML 里有显式 skip 笔记）
- [ ] CI 路径文档可跑（轮询即可）；未声称已接 webhook
- [ ] `~/.pipeline/experience/` 与 `index.jsonl` 至少一条
