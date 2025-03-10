#!/bin/bash
# Git Push Script for Unix/Mac
# Usage: ./git-push.sh "Your commit message here"

echo "==================================="
echo "Fe Project - Git Push Utility"
echo "==================================="

if [ -z "$1" ]; then
    echo "ERROR: Please provide a commit message."
    echo "Usage: ./git-push.sh \"Your commit message here\""
    exit 1
fi

echo
echo "Checking git status..."
git status

echo
echo "Adding all changes..."
git add .

echo
echo "Committing with message: $1"
git commit -m "$1"

echo
echo "Pushing to remote repository..."
git push

echo
echo "==================================="
echo "Git push operation completed!"
echo "===================================" 