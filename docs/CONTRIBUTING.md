# Contributing to PNUTDownloader

Thank you for contributing! This guide walks you through the development workflow, coding standards, and project conventions.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Submitting a Pull Request](#submitting-a-pull-request)
7. [Reporting Issues](#reporting-issues)

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Welcome newcomers
- Focus on what's best for the project

---

## Getting Started

### 1. Fork & Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/pnutdownloader.git
cd pnutdownloader
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Add Required Binaries (first time only)

```bash
# macOS
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos \
     -o public/yt-dlp_macos && chmod +x public/yt-dlp_macos

# Download FFmpeg for macOS from https://evermeet.cx/ffmpeg/
# and place as public/ffmpeg
```

### 4. Run in Development Mode

```bash
npm run dev
```

---

## Project Structure

```
pnutdownloader/
├── src/
│   ├── main/
│   │   ├── index.js          # Main process entry: window, IPC, yt-dlp, ffmpeg
│   │   └── services/         # Modular services
│   │       ├── ClipboardService.js
│   │       ├── CookieService.js
│   │       ├── DownloadService.js
│   │       ├── FfmpegService.js
│   │       ├── PathService.js
│   │       ├── PlatformService.js
│   │       ├── UpdateService.js
│   │       └── YtdlpService.js
│   ├── preload/
│   │   └── index.js          # contextBridge — exposes window.api
│   ├── renderer/src/
│   │   ├── App.jsx            # Root component
│   │   ├── main.jsx           # React entry point
│   │   ├── firebase.js        # Firebase/Firestore setup
│   │   ├── components/        # UI components
│   │   │   ├── Navbar/
│   │   │   ├── Sidebar/
│   │   │   ├── BodySection/
│   │   │   ├── DownloadList/
│   │   │   ├── DonationModal/
│   │   │   ├── LoginModal/
│   │   │   ├── PlaylistSelectionModal/
│   │   │   ├── UrlDetectionModal/
│   │   │   ├── UpdateNotification/
│   │   │   ├── AboutUs/
│   │   │   ├── FeedbackModal/
│   │   │   ├── ErrorBoundary/
│   │   │   ├── PlatformIcons/
│   │   │   ├── CustomDropdown/
│   │   │   ├── YouTubeAPIManager.js
│   │   │   ├── NonYouTubeMetadataExtractor.js
│   │   │   ├── platformUtils.js
│   │   │   ├── commonFunction.js
│   │   │   └── common.css
│   │   ├── viewmodels/        # Business logic hooks
│   │   │   ├── useAppLifecycle.js
│   │   │   ├── useDownloadManager.js
│   │   │   └── useDownloadListVM.js
│   │   └── utils/             # Firestore helpers
│   └── shared/
│       ├── ipcChannels.js     # All IPC channel & event constants
│       └── platformUtils.js   # Platform detection (shared main + renderer)
├── tests/                     # Jest unit tests
├── docs/                      # Documentation
├── public/                    # Static assets + binaries
├── electron-builder.yml       # Packaging config
├── electron.vite.config.mjs   # Vite/Electron build config
└── package.json
```

---

## Development Workflow

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/short-description` | `feature/add-reddit-icon` |
| Bug Fix | `fix/issue-description` | `fix/playlist-modal-crash` |
| Docs | `docs/what-changed` | `docs/update-api-reference` |
| Refactor | `refactor/what` | `refactor/download-service` |

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add clipboard monitoring toggle in settings"
git commit -m "fix: prevent duplicate platform icons on resize"
git commit -m "docs: update IPC channels reference"
git commit -m "refactor: extract download queue logic to useDownloadManager"
git commit -m "test: add unit tests for platformUtils.detectPlatform"
git commit -m "chore: update yt-dlp nightly URL pattern"
```

### Development Loop

```bash
# Create branch
git checkout -b feature/my-feature

# Make changes and run
npm run dev

# Format code
npm run format

# Lint
npm run lint

# Test
npm test

# Commit
git add .
git commit -m "feat: ..."

# Push
git push origin feature/my-feature
```

---

## Coding Standards

### JavaScript / React

- **ES6+** syntax throughout — no `var`, no `.then()` chains where `async/await` can be used
- **Functional components** only — no class components
- **Named exports** preferred over default exports for utilities; default exports for components
- **Prettier** for formatting (`npm run format` before committing)
- **ESLint** with project config (`npm run lint`)

```javascript
// ✅ Good
const fetchInfo = async (url) => {
  try {
    const info = await getVideoInfo(url)
    return info
  } catch (error) {
    console.error('Failed to fetch info:', error.message)
    throw error
  }
}

// ❌ Bad
var fetchInfo = function(url) {
  return getVideoInfo(url).then(function(info) {
    return info
  })
}
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Variables | `camelCase` | `downloadPath`, `isCompleted` |
| Functions / Hooks | `camelCase` | `enqueueDownload()`, `useDownloadManager` |
| Components | `PascalCase` | `DownloadList`, `PlaylistSelectionModal` |
| Constants | `UPPER_SNAKE_CASE` | `DOWNLOAD_STORAGE_KEY`, `IPC_CHANNELS` |
| Files (services) | `PascalCase.js` | `DownloadService.js` |
| Files (components) | `PascalCase/index.jsx` | `DownloadList/index.jsx` |

### IPC Channels

**Always** use constants from `src/shared/ipcChannels.js`. Never use raw strings.

```javascript
// ✅ Correct
ipcMain.handle(IPC_CHANNELS.DOWNLOAD_VIDEO, handler)

// ❌ Wrong
ipcMain.handle('downloadVideo', handler)
```

### React Component Structure

```jsx
import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// 1. Component declaration
function DownloadItem({ download, onRetry, onDelete }) {
  // 2. State
  const [isExpanded, setIsExpanded] = useState(false)

  // 3. Effects
  useEffect(() => {
    // side effect
  }, [download.status])

  // 4. Handlers
  const handleRetry = () => {
    onRetry(download.id)
  }

  // 5. Render
  return (
    <div className="download-item">
      {/* JSX */}
    </div>
  )
}

// 6. Default export
export default DownloadItem
```

### Adding a New IPC Channel

1. Add the constant to `src/shared/ipcChannels.js`:
   ```javascript
   export const IPC_CHANNELS = {
     // existing...
     MY_NEW_CHANNEL: 'my-new-channel',
   }
   ```

2. Add the handler in `src/main/index.js`:
   ```javascript
   ipcMain.handle(IPC_CHANNELS.MY_NEW_CHANNEL, async (event, params) => {
     // implementation
   })
   ```

3. Expose via preload in `src/preload/index.js`:
   ```javascript
   contextBridge.exposeInMainWorld('api', {
     // existing...
     myNewChannel: (params) => ipcRenderer.invoke(IPC_CHANNELS.MY_NEW_CHANNEL, params),
   })
   ```

4. Call from renderer:
   ```javascript
   const result = await window.api.myNewChannel(params)
   ```

### Adding a New Platform

1. Add the constant to `src/shared/platformUtils.js`:
   ```javascript
   export const PLATFORMS = {
     // existing...
     NEWPLATFORM: 'newplatform',
   }
   ```

2. Add detection in `detectPlatform()`:
   ```javascript
   if (urlLower.includes('newplatform.com')) return PLATFORMS.NEWPLATFORM
   ```

3. Add downloadable URL patterns in `isDownloadableVideoUrl()`:
   ```javascript
   if (urlLower.includes('newplatform.com/video/')) return true
   ```

4. Add display name and URL in the maps

5. Add a platform icon in `PlatformIcons/index.jsx`

---

## Submitting a Pull Request

### Checklist

Before opening a PR:

- [ ] `npm test` passes
- [ ] `npm run lint` shows no errors
- [ ] `npm run format` applied
- [ ] Documentation updated if you changed behavior
- [ ] New IPC channels use constants (not raw strings)
- [ ] Branch is up-to-date with `main`

### PR Description Template

```markdown
## What does this PR do?
Brief description of the change.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring
- [ ] Dependency update

## Testing Done
Describe how you tested the change.

## Screenshots (if UI change)
Before / after screenshots.
```

### Review Process

1. Maintainers review within a few days
2. Address feedback and push new commits
3. PR is merged once approved

---

## Reporting Issues

### Before Opening an Issue

1. Search [existing issues](https://github.com/Shoaib-Akh/pnutdownloader/issues)
2. Reproduce with the latest version
3. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### Bug Report Template

```markdown
## Bug Description
What went wrong?

## Steps to Reproduce
1. Open PNUTDownloader
2. Paste URL: ...
3. Click Download
4. See error

## Expected Behavior
What should have happened?

## Actual Behavior
What actually happened?

## Environment
- OS: macOS 14.3 / Windows 11 / Ubuntu 22.04
- App Version: 1.3.0 (Help → About)
- yt-dlp Version: (shown in About)

## Logs / Error Messages
Paste relevant logs here.
```

---

## Questions?

- [GitHub Discussions](https://github.com/Shoaib-Akh/pnutdownloader/discussions)
- [Open an Issue](https://github.com/Shoaib-Akh/pnutdownloader/issues)

---

Thank you for contributing! 🎉

*Last updated: March 2026*
