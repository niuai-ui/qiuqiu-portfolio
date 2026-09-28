---
name: sims4-portfolio-publish
description: 维护并发布“湫湫 Sims 日志”汉化作品集网站（GitHub Pages），包括新增作品、更新资料或网盘链接、预检、提交推送、等待 Pages 部署并核对线上数据。触发词：更新百度网盘、补网盘链接、更新作品集、发布作品集、上新模组、portfolio publish。
agent_created: true
---

# 湫湫 Sims 汉化档案馆发布

项目根：`E:\模拟人生4 湫湫Sims日志作品集网站`
仓库：`https://github.com/niuai-ui/qiuqiu-portfolio.git`（`main`）
线上：`https://niuai-ui.github.io/qiuqiu-portfolio/`

## 执行入口

- 开始前完整读取项目根目录的 `AGENTS.md`；业务规则、职责边界和发布门槛均以它为准。本 Skill 只记录执行方法。
- 整体 review、工作流迭代或批量审查时，按 `AGENTS.md` 读取长期笔记、最近日期日志和工作流问题反馈。
- 本 Skill 覆盖网站上新、Excel 修改、画廊同步、预检及发布。WorkBuddy 遇到规则缺口或 Skill 候选，按 `AGENTS.md` 的模板写入当天项目日志，由 Codex 后续评审。
- 一次性任务事实写入日期日志；经评审确认长期有效的业务规则写入 `AGENTS.md`，可重复使用的执行方法才写入本 Skill。

## 数据操作

- 按 `AGENTS.md` 的当前源目录与 Excel 双向核对，按英文名和中文名定位记录，写入后回读修改值、格式与行高。修改范围以本次任务为准。
- 新作品的类别依据作者说明或用户确认；无法判断时询问用户，不能按作者或相似作品批量猜测。
- 补链接或处理“日期为今天”等表述时，按 `AGENTS.md` 区分三个日期；表述有冲突或歧义时先澄清，不自行改写用户明确提到的字段。

## 发布执行

逐项执行 `AGENTS.md` 第 2 节：检查并同步 Git、修改目标、同步画廊、完整预检、精确暂存、提交推送、等待 Pages、线上核对和确认工作区状态。任一检查失败时停止提交或推送。

- WorkBuddy 可使用 `C:\Users\Administrator\.workbuddy\binaries\python\envs\default\Scripts\python.exe`；Git 可使用 `C:\Program Files\Git\cmd\git.exe`。
- 仅在旧 `dist/` 被 safe-delete 钩子误拦截、且确认路径是本项目输出目录时，运行 `python tools/purge_dist.py "E:\模拟人生4 湫湫Sims日志作品集网站\dist"`，随后重新运行完整预检。该脚本拒绝其他目标及重解析点。
- 线上数据使用 Python `urllib` 或等效程序化请求，给 `data.json` 加时间戳查询参数，核对目标字段与总数。不要只依据浏览器缓存或网页抓取摘要判定成功。

## 交付口径

说明实际改动、日期保持情况、预检结果、完整提交 SHA、Pages 结果和线上核对结论。只有 Pages 成功且线上数据正确后，才能称为“已发布”。
