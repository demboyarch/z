 @echo off
REM Git Push Script for Windows
REM Usage: git-push.bat "Your commit message here"

echo ===================================
echo Fe Project - Git Push Utility
echo ===================================

IF "%~1"=="" (
    echo ERROR: Please provide a commit message.
    echo Usage: git-push.bat "Your commit message here"
    exit /B 1
)

echo.
echo Checking git status...
git status

echo.
echo Adding all changes...
git add .

echo.
echo Committing with message: %~1
git commit -m "%~1"

echo.
echo Pushing to remote repository...
git push

echo.
echo ===================================
echo Git push operation completed!
echo ===================================