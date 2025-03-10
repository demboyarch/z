@echo off
REM Project Setup Script for Windows
REM This script initializes the Fe project environment

echo ===================================
echo Fe Project - Setup Utility
echo ===================================

echo.
echo Installing dependencies...
npm install

echo.
echo Creating necessary directories if they don't exist...
if not exist "src" mkdir src
if not exist "Docs" mkdir Docs

echo.
echo Setup completed successfully!
echo.
echo ===================================
echo Try running the following commands:
echo ===================================
echo.
echo - To contribute to the project, see CONTRIBUTING.md
echo - To learn more about the project, see README.md
echo - To push changes, use: kernel-scripts\git-push.bat "Your commit message"
echo =================================== 