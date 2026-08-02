@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在检查作品集文件...
if not exist "content\作品信息.xlsx" (
  echo [错误] 找不到 content\作品信息.xlsx
  pause
  exit /b 1
)
git add -- "content/作品信息.xlsx" "content/images"
git diff --cached --quiet
if %errorlevel%==0 (
  echo 没有发现需要发布的修改。
  pause
  exit /b 0
)
git commit -m "更新作品集内容"
if errorlevel 1 (
  echo [错误] 提交失败，请把此窗口截图发给 Codex。
  pause
  exit /b 1
)
git push origin main
if errorlevel 1 (
  echo [错误] 上传失败，请确认网络和 GitHub 登录状态。
  pause
  exit /b 1
)
echo 已上传。GitHub Pages 通常会在 1-3 分钟内自动更新。
pause
