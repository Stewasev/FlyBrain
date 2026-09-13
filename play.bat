@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo  Male CNS atlas
echo  Live:  https://stewasev.github.io/FlyBrain/
echo  Local: http://127.0.0.1:8000/
echo.

if not exist "index.html" (
  echo Run this from the FlyBrain folder ^(the one with index.html^).
  pause
  exit /b 1
)
if not exist "data\runtime\neurons.json.gz" (
  echo Missing data\runtime. Clone the full repo, not a ZIP of source only:
  echo   git clone https://github.com/Stewasev/FlyBrain.git
  pause
  exit /b 1
)

set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY where python >nul 2>&1 && set "PY=python"
if not defined PY where python3 >nul 2>&1 && set "PY=python3"
if not defined PY (
  echo Need Python 3.
  echo Install from https://www.python.org/downloads/ and tick "Add python.exe to PATH".
  pause
  exit /b 1
)

echo Starting server. Close this window or press Ctrl+C to stop.
echo.
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://127.0.0.1:8000/"
%PY% -m http.server 8000 --bind 127.0.0.1
if errorlevel 1 (
  echo.
  echo Port 8000 is already in use - opening that copy instead.
  start http://127.0.0.1:8000/
  pause
)
