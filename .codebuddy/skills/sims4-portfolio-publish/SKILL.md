---
name: sims4-portfolio-publish
description: 维护并发布“湫湫 Sims 日志”汉化作品集网站（GitHub Pages），包括新增作品、更新作品信息或百度网盘链接、执行完整预检、提交推送、等待 Pages 部署并核对线上数据。触发词：更新百度网盘、补网盘链接、更新作品集、发布作品集、上新模组、portfolio publish。
agent_created: true
---

# 湫湫 Sims 汉化档案馆发布

项目根：`E:\模拟人生4 湫湫Sims日志作品集网站`

项目级 Skill：`.codebuddy/skills/sims4-portfolio-publish/`

仓库：`https://github.com/niuai-ui/qiuqiu-portfolio.git`（`main`）

线上：`https://niuai-ui.github.io/qiuqiu-portfolio/`

## 权威边界

- 项目内 `AGENTS.md` 是唯一权威规则；本 Skill 只补充 WorkBuddy 的执行环境和可复用操作，不复制整套项目规范。
- 开始工作前先读取 `AGENTS.md`、项目 `.workbuddy/memory/MEMORY.md` 和最近 3～5 份日期日志，并与当前文件、Git 和命令结果交叉验证。
- 已有同用途 Skill 时只更新现有 Skill。不得为同一网站另建近义或重复 Skill；创建新 Skill 必须先获得用户明确同意。
- 一次性任务事实写入项目近期日志；长期项目规则写入 `AGENTS.md`；只有跨多次任务仍稳定复用的 WorkBuddy 执行方法才写入本 Skill。
- 本项目专用 Skill 只能位于 `.codebuddy/skills/`，专用辅助脚本只能位于项目 `tools/`；不得在 WorkBuddy 用户级目录保存本项目副本。

## Skill 选择与候选记录

- 本 Skill 覆盖网站上新、Excel 资料修改、网盘链接更新、画廊同步、完整预检、提交推送和部署核对。属于这些范围时直接使用本 Skill，不得因为新窗口或触发词不同而另建发布 Skill。
- 本项目默认只使用本 Skill。用户级目录中的作者整理、下载、模组清理、目录拍平或浏览器基础 Skill 不属于网站发布流程，除非用户明确把任务范围扩展到对应工作流，否则不得自动调用。
- WorkBuddy 只负责严格执行 `AGENTS.md` 和本 Skill，不得自行修改 `AGENTS.md`、本 Skill、其他 Skill，或以“优化”为由改写与当前业务任务无关的工作流脚本。
- 如果执行中发现流程缺陷、重复坑、规则歧义、工具故障或可能需要 Skill 的需求，只在当天项目日志 `.workbuddy/memory/YYYY-MM-DD.md` 追加以下反馈，不得现场创建或修改 Skill：

  ```text
  ## 工作流问题反馈：<简短名称>
  - 当前任务：
  - 已遵循的规则或 Skill：
  - 问题与复现条件：
  - 临时处理及其风险：
  - 对结果的影响：
  - 相关文件、命令或错误证据：
  - 建议整改方向：
  - 是否属于 Skill 候选：是 / 否 / 不确定
  ```

- 后续由 Codex 在整体 review 中统一评估并整改。WorkBuddy 的日志反馈不构成修改规则、绕开安全措施或创建 Skill 的授权；无法在现有规则内安全完成时应停止相关操作并向用户说明。

## 数据编辑原则

- `作品信息.xlsx` 是网站唯一数据源；工作表固定 14 列，字段、类别、图片和同步规则全部遵循 `AGENTS.md`。
- 三个日期彼此独立：原版更新只改“模组更新日期”，汉化文件变化才改“汉化更新日期”，“上新日期”创建后永不改变。只补链接时三个日期都不动。
- 百度网盘列格式为 `链接: <url> 提取码: <code>`；源目录没有地址时留空，不得编造。
- 按“模组英文名 + 模组中文名”定位 Excel 行，不能依赖记忆中的行号。写入后回读核对值、单元格格式和 36 行高。
- 现有记录的类别不得因重新同步而自行变化。用户已确认 `LovesBeingSingle / 热爱单身` 为“人物特征”；不得恢复成“游戏玩法”。新作品类别不明确时询问用户，不能按作者或相似作品批量猜测。
- 新增作品时从一个现有标准数据行完整复制格式；封面、介绍图、前置和放置说明均按 `AGENTS.md` 从日志源目录提取。

## 发布链路

顺序与 `更新作品集.cmd` 等效：

1. 确认工作区与暂存区状态，区分用户原有修改和本次修改。
2. 运行 `python tools/sync_gallery.py`。
3. 运行 `python tools/preflight.py`；任何检查失败都不得提交或推送。
4. 只暂存本次实际改动的精确文件路径，不使用 `git add .`，也不笼统暂存整个 `content`、`site` 或 `tools` 目录。
5. 用 `git diff --cached --name-status` 和 `git diff --cached --check` 核对暂存内容，再提交并推送 `main`。
6. 使用 `git rev-parse HEAD` 取得完整 40 位 SHA，运行 `python tools/wait_for_pages.py <完整 SHA>`。
7. Pages 成功后，用带时间戳参数的程序化请求读取线上 `data.json`，核对目标条目和字段；未验证成功不得声称已经发布完成。

`dist/`、临时预览、备份和 `outputs/` 均不得提交。

## WorkBuddy 本机执行

- WorkBuddy 使用 `C:\Users\Administrator\.workbuddy\binaries\python\envs\default\Scripts\python.exe`；Git 可使用 `C:\Program Files\Git\cmd\git.exe`。
- `更新作品集.cmd` 带有 `pause`，自动化任务应逐条执行等效发布链路。
- WorkBuddy 的 safe-delete 钩子可能拦截 `build_site.py` 对旧 `dist/` 的清理。仅在确认目标是本项目的 `dist` 后，才可运行项目脚本 `python tools/purge_dist.py "E:\模拟人生4 湫湫Sims日志作品集网站\dist"`，然后重新运行完整预检。
- `tools/purge_dist.py` 必须拒绝任何非 `E:\模拟人生4 湫湫Sims日志作品集网站\dist` 目标，并拒绝递归处理符号链接、目录联接点或其他重解析点。不得复制它去清理其他目录。
- 线上数量与字段核对使用 Python `urllib` 或等效程序化请求，并给 `data.json` 添加时间戳查询参数绕过 CDN 缓存。

## 交付口径

向用户说明：实际修改内容、哪些日期没有变化、预检结果、提交 SHA、Pages 工作流结果和线上核对结论。未推送或部署未成功时，不得表述为“已发布”。
