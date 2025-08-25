@echo off
setlocal

REM Change to the directory of this script
cd /d "%~dp0"

echo Installing dependencies...
call npm ci --no-audit --fund=false
if errorlevel 1 goto :error

echo Building protected distribution...
call npm run build:protect
if errorlevel 1 goto :error

echo.
echo Protected build created at: "%CD%\dist_protected"
echo To start the protected server: npm run start:protected

goto :eof

:error
echo Build failed. See errors above.
exit /b 1


