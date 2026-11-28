---
name: sims4-portfolio-publish
description: 维护并发布“湫湫 Sims 日志”汉化作品集网站（GitHub Pages），包括新增作品、更新资料或网盘链接、预检、提交推送、等待 Pages 部署并核对线上数据。触发词：更新百度网盘、补网盘链接、更新作品集、发布作品集、上新模组、portfolio publish。
agent_created: true
---

# 湫湫 Sims 汉化档案馆发布

从包含 `AGENTS.md` 和 `作品信息.xlsx` 的仓库根目录执行命令。

仓库：`https://github.com/niuai-ui/qiuqiu-portfolio.git`（`main`）
线上：`https://niuai-ui.github.io/qiuqiu-portfolio/`

## 执行入口

- 开始前完整读取项目根目录的 `AGENTS.md`；业务规则、职责边界和发布门槛均以它为准。本 Skill 只记录执行方法。
- 整体 review、工作流迭代或批量审查时，按 `AGENTS.md` 读取长期笔记、最近日期日志和工作流问题反馈。
- 本 Skill 覆盖网站上新、Excel 修改、画廊同步、预检及发布。WorkBuddy 遇到规则缺口或 Skill 候选，按 `AGENTS.md` 的模板写入当天项目日志，由 Codex 后续评审。
- 一次性任务事实写入日期日志；经评审确认长期有效的业务规则写入 `AGENTS.md`，可重复使用的执行方法才写入本 Skill。

## 数据操作

- PowerShell 下需要创建修改前快照时，用以下命令。重试同一次编辑时，使用之前记录的快照路径。

  ```powershell
  $backupDir = New-Item -ItemType Directory -Force -Path '.workbuddy/backups/workbook'
  $snapshot = Join-Path $backupDir.FullName "_bak_作品信息_$(Get-Date -Format yyyyMMdd_HHmmss).xlsx"
  if (Test-Path -LiteralPath $snapshot) { throw "快照已存在，换一个时间戳：$snapshot" }
  Copy-Item -LiteralPath '作品信息.xlsx' -Destination $snapshot -ErrorAction Stop
  $snapshot
  ```

- 新增行时可复制工作表第 2 行的格式与行高，再填入新值。程序化编辑后重新打开保存的文件核对。
- 经用户确认更新英文名时，检查派生的作品标识、封面路径和画廊目录。对于“作者 - 中文名”格式的源目录，画廊同步会从 Excel 解析英文名。

## 发布执行

按 `AGENTS.md` 第 2 节选择适用步骤。

- WorkBuddy 可使用 `C:\Users\Administrator\.workbuddy\binaries\python\envs\default\Scripts\python.exe`；Git 可使用 `C:\Program Files\Git\cmd\git.exe`。
- 遇到旧 `dist/` 被 safe-delete 钩子误拦截，使用 `AGENTS.md` 第 6 节的处理命令。
- 线上数据使用 Python `urllib` 或等效程序化请求，给 `data.json` 加时间戳查询参数，核对目标字段与总数。不要只依据浏览器缓存或网页抓取摘要判定成功。

## 交付口径

说明实际改动、日期保持情况、预检结果、完整提交 SHA、Pages 结果和线上核对结论。只有 Pages 成功且线上数据正确后，才能称为“已发布”。
