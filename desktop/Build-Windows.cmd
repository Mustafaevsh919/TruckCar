@echo off
chcp 65001 >nul
cd /d "%~dp0"
call npm ci
if errorlevel 1 goto error
call npm test
if errorlevel 1 goto error
call npm run dist:win
if errorlevel 1 goto error
explorer dist
exit /b 0
:error
echo Сборка остановлена из-за ошибки. Сохраните текст выше.
pause
exit /b 1
