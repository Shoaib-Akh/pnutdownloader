# Contributing to PNUTDownloader

Thank you for your interest in contributing! This guide will help you get started.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Pull Request Process](#pull-request-process)
5. [Coding Standards](#coding-standards)
6. [Reporting Issues](#reporting-issues)

---

## Code of Conduct

By participating in this project, you agree to follow our code of conduct:

- Be respectful and inclusive
- Welcome newcomers and help others learn
- Accept constructive criticism professionally
- Focus on what's best for the community

---

## Getting Started

### Fork the Repository

1. Click the **Fork** button on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pnutdownloader.git
   cd pnutdownloader
   ```

### Set Up Development Environment

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Create a Branch

```bash
# Create a new branch for your feature/fix
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

---

## Development Workflow

### 1. Pick an Issue

- Check [Issues](https://github.com/Shoaib-Akh/pnutdownloader/issues)
- Look for `good first issue` tags
- Comment on issues you'd like to work on

### 2. Make Changes

```bash
# Create branch
git checkout -b feature/my-feature

# Make your changes
# ... edit files ...

# Run tests
npm test

# Format code
npm run format
```

### 3. Commit Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Features
git commit -m "feat: add new download feature"

# Bug fixes
git commit -m "fix: resolve download pause issue"

# Documentation
git commit -m "docs: update API documentation"

# Refactoring
git commit -m "refactor: simplify download service"
```

### 4. Push and Create PR

```bash
# Push to your fork
git push origin feature/my-feature

# Create Pull Request on GitHub
```

---

## Pull Request Process

### PR Requirements

Before submitting:

1. ✅ Tests pass (`npm test`)
2. ✅ Code is formatted (`npm run format`)
3. ✅ No linting errors (`npm run lint`)
4. ✅ Documentation updated (if needed)
5. ✅ Branch is up-to-date with main

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
Describe testing done

## Screenshots (if applicable)
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback
3. Once approved, your PR will be merged

---

## Coding Standards

### JavaScript/React

- Use **ES6+** syntax
- Follow ESLint configuration
- Use Prettier for formatting

```javascript
// Good
const downloadVideo = async (url, options) => {
  const result = await fetch(url, options)
  return result.json()
}

// Bad
var downloadVideo = function(url, options) {
  return fetch(url, options).then(function(result) {
    return result.json()
  })
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `downloadPath` |
| Functions | camelCase | `getVideoInfo()` |
| Classes | PascalCase | `DownloadService` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Files | kebab-case | `download-service.js` |

### Component Structure

```jsx
// Functional components with hooks
const DownloadButton = ({ onClick, disabled }) => {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    await onClick()
    setLoading(false)
  }

  return (
    <button onClick={handleClick} disabled={disabled || loading}>
      {loading ? 'Downloading...' : 'Download'}
    </button>
  )
}

export default DownloadButton
```

### Error Handling

```javascript
// Always handle errors properly
try {
  const result = await downloadService.download(url)
  return result
} catch (error) {
  logger.error('Download failed:', error.message)
  throw new DownloadError(error.message)
}
```

---

## Project Structure

```
pnutdownloader/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.js    # Main entry point
│   │   └── services/   # Main process services
│   ├── preload/        # Preload scripts
│   │   └── index.js    # Context bridge
│   ├── renderer/       # React UI
│   │   └── src/
│   │       ├── components/
│   │       ├── viewmodels/
│   │       └── utils/
│   └── shared/         # Shared utilities
│       ├── ipcChannels.js
│       └── platformUtils.js
├── tests/              # Unit tests
├── docs/               # Documentation
└── public/             # Static assets
```

---

## Reporting Issues

### Before Reporting

1. Search existing issues
2. Try the latest version
3. Reproduce the issue

### Issue Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS 12]
- App Version: [e.g., 1.3.0]
- Node Version: [e.g., 18.x]

## Logs
Add relevant logs here
```

---

## Questions?

- Open a [Discussion](https://github.com/Shoaib-Akh/pnutdownloader/discussions)
- Join our community
- Ask in issues

---

Thank you for contributing! 🎉
