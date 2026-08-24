@echo off
setlocal
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

set "BUNDLED_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%BUNDLED_PYTHON%" (
  set PYTHON="%BUNDLED_PYTHON%"
) else (
  py -3 --version >nul 2>&1
  if not errorlevel 1 (
    set "PYTHON=py -3"
  ) else (
    where python >nul 2>&1
    if errorlevel 1 (
      echo [错误] 找不到 Python，请安装 Python 3 后重试。
      pause
      exit /b 1
    )
    set "PYTHON=python"
  )
)

%PYTHON% -c "import openpyxl, PIL" >nul 2>&1
if errorlevel 1 (
  echo [错误] Python 缺少依赖。请先运行：python -m pip install -r requirements.txt
  pause
  exit /b 1
)

if not exist "作品信息.xlsx" (
  echo [错误] 找不到作品信息.xlsx
  pause
  exit /b 1
)

"%GIT%" diff --cached --quiet
if errorlevel 2 (
  echo [错误] 无法检查 Git 暂存区。
  pause
  exit /b 1
)
if errorlevel 1 (
  echo [错误] Git 暂存区已经有内容。为避免误提交，请先处理这些暂存文件再重试。
  "%GIT%" diff --cached --name-only
  pause
  exit /b 1
)

if /I not "%~1"=="--check-only" (
  echo 正在同步远端 main...
  "%GIT%" pull --ff-only origin main
  if errorlevel 1 (
    echo [错误] 无法快进同步远端 main，请把此窗口截图发给 Codex。
    pause
    exit /b 1
  )
)

echo 正在执行发布前完整检查...
%PYTHON% "tools\preflight.py"
if errorlevel 1 (
  echo [错误] 发布前检查未通过，没有提交或上传任何内容。
  pause
  exit /b 1
)
if /I "%~1"=="--check-only" (
  echo 检查模式完成：没有暂存、提交或上传任何内容。
  exit /b 0
)

"%GIT%" add -- "作品信息.xlsx" "content/images" "site" "tools" ".github/workflows/pages.yml" "requirements.txt" ".gitignore" "README.md" "AGENTS.md" "更新作品集.cmd"
if errorlevel 1 (
  echo [错误] 文件暂存失败，请确认 Excel 已保存并关闭。
  pause
  exit /b 1
)

"%GIT%" diff --cached --quiet
if not errorlevel 1 (
  echo 没有发现需要发布的修改。
  pause
  exit /b 0
)

"%GIT%" commit -m "更新作品集内容和发布流程"
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

for /f %%i in ('"%GIT%" rev-parse HEAD') do set "COMMIT_SHA=%%i"
echo 已上传，正在等待 GitHub Pages 部署完成...
%PYTHON% "tools\wait_for_pages.py" "%COMMIT_SHA%"
if errorlevel 1 (
  echo [警告] 提交已上传，但自动部署确认未完成。请查看仓库 Actions 页面。
  pause
  exit /b 1
)

echo 全部完成，网站已经更新。
pause
