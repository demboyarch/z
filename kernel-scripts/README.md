# Z Project Utility Scripts

This directory contains utility scripts to simplify common operations for the Fe project.

## Available Scripts

### Git Operations

- **git-push.bat** / **git-push.sh** - Simplify the git commit and push process
  - Usage (Windows): `git-push.bat "Your commit message here"`
  - Usage (Unix/Mac): `./git-push.sh "Your commit message here"`

### Project Setup

- **setup-project.bat** / **setup-project.sh** - Initialize the project environment
  - Usage (Windows): `setup-project.bat`
  - Usage (Unix/Mac): `./setup-project.sh`

## Adding New Scripts

When adding new scripts, please:

1. Create both Windows (.bat) and Unix/Mac (.sh) versions when applicable
2. Update this README.md with documentation about the new script
3. Follow the existing naming and formatting conventions
4. Include clear usage instructions within the script

## Script Conventions

- All scripts should have clear error handling
- Include usage instructions as comments at the top of each script
- Use echo commands to provide feedback about what the script is doing
- Structure output with clear section delimiters (e.g., `===================================`)

## Permissions

If you're on Unix/Mac, you may need to make scripts executable:

```bash
chmod +x kernel-scripts/*.sh
```

This is automatically done when running the setup-project.sh script. 