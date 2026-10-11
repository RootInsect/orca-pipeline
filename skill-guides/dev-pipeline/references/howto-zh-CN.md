# 操作指南（中文）

把「修 Bug / 新功能 / 排查 / 小改动」跑成可重复的任务环：建任务 → 调度推进 → 按角色起 worker → CI 轮询 → 写共享经验。

## 1. 用本 fork 的 CLI（推荐）

在仓库根目录：

```bash
pnpm install
pnpm build:cli
# 开发入口
pnpm exec orca-dev pipeline --help
# 或
node out/cli/index.js pipeline --help
```

对已安装的 Orca：把本 fork 编出来的 `out/cli/index.js` 当作 `ORCA`，或设置：

```bash
export PIPELINE_ORCA_COMMAND=orca   # 调度器 shell-out 用的编排/CLI
# Linux 桌面注意：裸 `orca` 可能是读屏软件；优先 orca-ide / orca-dev
```

## 2. 初始化

```bash
orca-dev pipeline init
orca-dev pipeline config show
```

配置 Developer / Reviewer（自动换角色，不必每次手选）：

```bash
orca-dev pipeline config set --key Developer --value codex
orca-dev pipeline config set --key Reviewer --value claude
# 或环境变量
export PIPELINE_DEVELOPER_AGENT=codex
export PIPELINE_REVIEWER_AGENT=claude
```

路径默认：

- 任务：`~/.pipeline/tasks/`
- 经验：`~/.pipeline/experience/`（可用 `PIPELINE_EXPERIENCE_ROOT`）
- 配置：`~/.pipeline/config.yaml`

## 3. 发布任务

```bash
orca-dev pipeline create \
  --type bug_fix \
  --title "登录按钮无响应" \
  --repo acme/web \
  --domain-tag auth \
  --body "repro: 点击登录控制台 TypeError"
```

一条命令会：分类（或接受 `--type`）→ 加载模板 → 写入任务 YAML → `status=active` `stage=setup_env`。

## 4. 跑调度器

单步（调试）：

```bash
orca-dev pipeline once --json
```

常驻：

```bash
orca-dev pipeline run --interval-ms 5000
```

无本机 Orca/gh 时先演练：

```bash
export PIPELINE_DRY_RUN=1
orca-dev pipeline once
```

真跑时调度器会按阶段调用：

- `worktree create`
- `orchestration run-create` / `worker-start`（Develop≠Reviewer 账户）
- `worker-show` 等待 settle
- `gh pr checks` 轮询（**不是** webhook）
- 成功/失败后写入 `~/.pipeline/experience` + `index.jsonl`

## 5. 看状态（3–5 个并发任务）

```bash
orca-dev pipeline list
orca-dev pipeline status --task task_...
```

列：project / type / stage / status / role / agent / blocker。

Clarify 等人时：

```bash
orca-dev pipeline unblock --task task_... --note "验收：……"
```

## 6. 与 skill 文档的关系

```bash
orca-dev skills get dev-pipeline
orca-dev skills get dev-pipeline --reference references/demo-bugfix.md
```

## 范围外（本 MVP）

- 上千任务的多机舰队
- 完整 MCP `create_task` 服务（可后接）
- Electron / 手机列表 UI（CLI status 足够）
