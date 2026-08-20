@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "GIT=C:\Program Files\Git\cmd\git.exe"
if not exist "%GIT%" (
  where git >nul 2>&1
  if errorlevel 1 (
    echo [错误] 找不到 Git，请把此窗口截图发给 Codex。
    pause
    exit /b 1
  )
  set "GIT=git"
)
echo 正在检查作品集文件...
if not exist "作品信息.xlsx" (
  echo [错误] 找不到作品信息.xlsx
  pause
  exit /b 1
)
"%GIT%" add -- "作品信息.xlsx" "content/images" "site/app.js" "site/styles.css" "tools/build_site.py" "更新作品集.cmd" "README.md" "AGENTS.md"
if errorlevel 1 (
  echo [错误] 文件暂存失败，请确认 Excel 已保存并关闭，然后把此窗口截图发给 Codex。
  pause
  exit /b 1
)
"%GIT%" diff --cached --quiet
if %errorlevel%==0 (
  echo 没有发现需要发布的修改。
  pause
  exit /b 0
)
"%GIT%" commit -m "更新作品集内容和网页详情"
if errorlevel 1 (
  echo [错误] 提交失败，请把此窗口截图发给 Codex。
  pause
  exit /b 1
)
"%GIT%" push origin main
if errorlevel 1 (
  echo [错误] 上传失败，请确认网络和 GitHub 登录状态。
  pause
  exit /b 1
)
echo 已上传。GitHub Pages 通常会在 1-3 分钟内自动更新。
pause
