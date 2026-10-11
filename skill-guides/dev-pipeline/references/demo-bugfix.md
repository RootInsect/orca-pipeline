# Demo：一条「修 Bug」happy path（可运行）

## 0. 准备

```bash
pnpm build:cli
orca-dev pipeline init
orca-dev pipeline config set --key Developer --value codex
orca-dev pipeline config set --key Reviewer --value claude
```

无本机 Orca 时演练：`export PIPELINE_DRY_RUN=1`

## 1. 发布任务

```bash
orca-dev pipeline create \
  --type bug_fix \
  --title "登录按钮无响应" \
  --repo owner/name \
  --domain-tag auth \
  --body "repro: 点击登录出现 TypeError"
```

## 2. 跑调度器

```bash
# 单步
orca-dev pipeline once --json
# 或常驻
orca-dev pipeline run --interval-ms 5000
```

调度器会：`worktree create` →（可跳过 clarify）→ plan/develop/test/review workers →
`open_pr` → `gh pr checks` 轮询 → experience 写入 `~/.pipeline/experience/`。

## 3. 看状态

```bash
orca-dev pipeline list
orca-dev pipeline status --task <id>
```

## 验收勾选

- [ ] 任务到 `done`，含 `pr_url`（dry-run 为 example URL）
- [ ] Review 使用配置的 Reviewer（≠ Developer）
- [ ] `~/.pipeline/experience/index.jsonl` 有行
- [ ] 未声称 GitHub webhook；CI 为轮询
