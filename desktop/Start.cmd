@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Для запуска исходников установите Node.js 22 LTS или новее: https://nodejs.org
  echo Готовая сборка Volvo Desktop.exe запускается без Node.js.
  pause
  exit /b 1
)
if not exist node_modules\electron\dist\electron.exe (
  call npm ci
  if errorlevel 1 goto error
)
call npm start
if errorlevel 1 goto error
exit /b 0
:error
echo Не удалось запустить приложение. Сохраните текст ошибки выше.
pause
exit /b 1
