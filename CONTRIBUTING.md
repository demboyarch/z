# Contributing to zen

Thank you for considering contributing to zen! This document outlines the process for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Please be kind and considerate to other contributors.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Set up the development environment**:
   ```bash
   cd z
   npm install
   ```
4. **Create a new branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Prerequisites

- Node.js 18+
- npm
- Git

### Running the Application

```bash
npm run start
```

### Code Style

- Follow the existing code style in the project
- Use descriptive variable names
- Comment complex logic
- Format your code before submitting

## Making Changes

1. Make your changes in your feature branch
2. Test your changes thoroughly
3. Update documentation if necessary
4. Ensure the application still works correctly

## Submitting Changes

1. **Commit your changes** with a clear message:
   ```bash
   git commit -am "Add feature: your feature description"
   ```
2. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
3. **Submit a pull request** against the main branch of the original repository
4. **Describe your changes** in the pull request description:
   - What did you change?
   - Why did you change it?
   - How can someone test your changes?

## Pull Request Process

1. Pull requests should focus on a single feature or bug fix
2. Ensure your code builds without errors
3. Update the README.md with details of changes if appropriate
4. A maintainer will review your pull request and may request changes
5. Your pull request will be merged once it has been approved

## Reporting Bugs

When reporting bugs, please include:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots if applicable
6. Your environment details (OS, application version, etc.)

## Feature Requests

Feature requests are welcome! Please provide:

1. A clear description of the feature
2. The motivation for the feature
3. How you envision it working

## Specialized Contributions

### Translations

To contribute translations:

1. Add new translation files to the `src/translations` directory
2. Follow the existing format for translations

### Rust Support

As Zen focuses on Rust development:

1. Improvements to Rust language support are especially welcome
2. Test thoroughly with various Rust codebases

## License

By contributing to Zen, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).

## Questions?

If you have questions about contributing, please open an issue with the "question" label.
