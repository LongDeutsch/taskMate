@echo off
cd /d "%~dp0"
if not exist "node_modules\nodemailer" (
  echo Installing dependencies...
  call npm install
)
echo Starting TaskMate mail_system...
node mailAgent.cjs
pause
