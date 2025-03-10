#!/bin/bash
# Project Setup Script for Unix/Mac
# This script initializes the Fe project environment

echo "==================================="
echo "Fe Project - Setup Utility"
echo "==================================="

echo
echo "Installing dependencies..."
npm install

echo
echo "Creating necessary directories if they don't exist..."
mkdir -p src
mkdir -p Docs

echo
echo "Setting execute permissions for scripts..."
chmod +x kernel-scripts/*.sh

echo
echo "Setup completed successfully!"
echo
echo "==================================="
echo "Try running the following commands:"
echo "==================================="
echo
echo "- To contribute to the project, see CONTRIBUTING.md"
echo "- To learn more about the project, see README.md"
echo "- To push changes, use: ./kernel-scripts/git-push.sh \"Your commit message\""
echo "===================================" 