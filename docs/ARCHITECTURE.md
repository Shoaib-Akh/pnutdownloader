# PNUTDownloader — Architecture Guide

This document describes the internal architecture of PNUTDownloader for developers, contributors, and technical stakeholders.

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Process Architecture](#process-architecture)
3. [IPC Communication Layer](#ipc-communication-layer)
4. [Main Process Internals](#main-process-internals)
5. [Renderer (UI) Layer](#renderer-ui-layer)
6. [Shared Module](#shared-module)
7. [Download Pipeline](#download-pipeline)
8. [Platform Detection](#platform-detection)
9. [Auto-Update Subsystem](#auto-update-subsystem)
10. [Data Persistence](#data-persistence)
11. [Security Model](#security-model)

---

## High-Level Overview

PNUTDownloader is built on the **Electron** framework, following the standard multi-process architecture:

```
┌───────────────────────────────────────────────────────────┐
│                    USER INTERFACE                         │
│              React 18 (Renderer Process)                  │
│  App → Navbar → BodySection → DownloadList → Modals       │
└───────────────────────────┬───────────────────────────────┘
                            │  window.api  (contextBridge)
┌───────────────────────────▼───────────────────────────────┐
│                    PRELOAD SCRIPT                         │
│           Secure bridge (contextBridge API)               │
│       Exposes only whitelisted IPC calls to renderer      │
└───────────────────────────┬───────────────────────────────┘
                            │  ipcMain / ipcRenderer (IPC)
┌───────────────────────────▼───────────────────────────────┐
│                    MAIN PROCESS                           │
│           Node.js + Electron (src/main/index.js)          │
│  IPC Handlers → Services (Download, YtDlp, FFmpeg, …)     │
│  Child Process: yt-dlp binary + ffmpeg binary             │
└───────────────────────────────────────────────────────────┘

         ┌──────── SHARED ────────┐
         │ src/shared/            │
         │  ipcChannels.js        │  ← used by main + renderer
         │  platformUtils.js      │  ← platform/URL detection
         └────────────────────────┘
```

---

## Process Architecture

### Main Process (`src/main/index.js`)

Runs as a Node.js process with full OS access. Responsibilities:
- Creates and manages the `BrowserWindow`
- Spawns `yt-dlp` and `ffmpeg` child processes
- Handles all `ipcMain.handle(...)` requests from the renderer
- Manages clipboard monitoring (`setInterval` on `clipboard.readText`)
- Sends events to renderer via `mainWindow.webContents.send(...)`
- Controls single-instance lock (`app.requestSingleInstanceLock`)
- Manages automatic app updates via `electron-updater`
- Downloads and self-updates the **yt-dlp** binary (checks every 3 days)

### Preload Script (`src/preload/index.js`)

Runs in a sandboxed context with access to both Node.js APIs and the DOM. Uses Electron's `contextBridge` to expose a safe, typed `window.api` object to the renderer — no raw `ipcRenderer` is exposed.

### Renderer Process (`src/renderer/`)

A standard React 18 single-page application bundled by Vite. Has no direct OS access — all OS operations are done via `window.api`.

---

## IPC Communication Layer

All IPC channel names are centralized in [`src/shared/ipcChannels.js`](../src/shared/ipcChannels.js):

```
IPC_CHANNELS (renderer → main, invoked with ipcRenderer.invoke)
IPC_EVENTS   (main → renderer, pushed with webContents.send)
```

This ensures the channel names are never duplicated as magic strings.

### Key IPC Channels

| Type | Channel Key | Direction | Purpose |
|------|-------------|-----------|---------|
| Request | `DOWNLOAD_VIDEO` | → Main | Start a download via yt-dlp |
| Request | `FETCH_VIDEO_INFO` | → Main | Fetch video metadata |
| Request | `FETCH_PLAYLIST_ENTRIES` | → Main | List playlist videos |
| Request | `PAUSE_DOWNLOAD` | → Main | Kill child process |
| Request | `SELECT_FOLDER` | → Main | Native folder picker |
| Request | `GET_YOUTUBE_COOKIES` | → Main | Read saved cookies |
| Request | `UPDATE_YTDLP` | → Main | Force update yt-dlp |
| Request | `CHECK_DEPENDENCIES` | → Main | Verify yt-dlp + ffmpeg |
| Event | `DOWNLOAD_PROGRESS` | Main → | Progress data from child |
| Event | `VIDEO_URL_DETECTED` | Main → | Clipboard URL detected |
| Event | `UPDATE_AVAILABLE` | Main → | New app version available |
| Event | `YTDLP_UPDATED` | Main → | yt-dlp binary updated |

---

## Main Process Internals

### Services (`src/main/services/`)

The main process logic is split into focused service modules:

| Service | File | Responsibility |
|---------|------|----------------|
| `DownloadService` | `DownloadService.js` | Spawn yt-dlp child process, stream progress |
| `YtdlpService` | `YtdlpService.js` | Version check, update yt-dlp binary |
| `FfmpegService` | `FfmpegService.js` | FFmpeg version check, download/extract |
| `CookieService` | `CookieService.js` | Read/write/import cookies.txt |
| `PathService` | `PathService.js` | Resolve paths (packaged vs. dev) |
| `PlatformService` | `PlatformService.js` | OS-level helpers |
| `UpdateService` | `UpdateService.js` | electron-updater integration |
| `ClipboardService` | `ClipboardService.js` | Monitor clipboard for video URLs |

### yt-dlp Binary Management

The app bundles a platform-specific yt-dlp binary in `public/` and ships it in `extraResources` via electron-builder. On startup:

1. Checks `ytdlp_version.txt` for the last-known version and timestamp
2. Fetches the latest nightly from `github.com/yt-dlp/yt-dlp-nightly-builds`
3. If version differs OR 3 days have passed → downloads the new binary
4. Sets executable permissions (`chmod 755`) on macOS/Linux
5. Verifies the binary with `--version`

### Path Resolution

All paths are resolved differently in packaged vs. development mode:

```javascript
// Example
const ytdlpPath = app.isPackaged
  ? join(process.resourcesPath, 'yt-dlp_macos')   // packaged
  : join(__dirname, '../../public/yt-dlp_macos')  // dev
```

---

## Renderer (UI) Layer

### Component Tree

```
App
├── ErrorBoundary           ← Catches unhandled React errors
├── UpdateNotification      ← Banner for app updates
├── UrlDetectionModal       ← Shown when clipboard URL is detected
├── Navbar                  ← Download settings (type, format, quality, bitrate, saveTo)
├── Sidebar                 ← Navigation (All Files, Settings, About, etc.)
└── BodySection             ← Main area
    ├── PlatformIcons       ← Quick-access platform buttons
    ├── WebView             ← Electron <webview> for browsing
    ├── DownloadList        ← Active + completed downloads
    ├── DonationModal       ← Shown every 4th download
    ├── LoginModal          ← YouTube login prompt (cookie issue)
    └── PlaylistSelectionModal ← Choose individual videos from a playlist
```

### ViewModels (Business Logic Hooks)

| Hook | File | Responsibility |
|------|------|----------------|
| `useAppLifecycle` | `useAppLifecycle.js` | App-level init: dependency check, update check, clipboard URL detection |
| `useDownloadManager` | `useDownloadManager.js` | Entire download queue, enqueue/retry/progress state |
| `useDownloadListVM` | `useDownloadListVM.js` | Download list display state, file operations |

#### `useDownloadManager` — Download State Machine

Downloads move through these states:

```
URL Added
   │
   ▼
"Fetching Info..."  (resolving video metadata via YouTube API or NonYouTubeExtractor)
   │
   ▼
"Queued" / "Waiting" (if another download is in progress)
   │
   ▼
"Downloading" (yt-dlp spawned, progress streamed via IPC)
   │
   ├──── "Completed" (file saved, Firebase record written, download count bumped)
   │
   └──── "Failed" (error logged, Firebase error recorded, retry available)
```

Downloads are **sequential** — only one active download at a time to prevent bandwidth issues. Additional URLs are Queued.

---

## Shared Module

`src/shared/` contains pure utility code with **no side effects** used across all processes.

### `platformUtils.js`

- `PLATFORMS` — constants for all 19 supported platforms
- `detectPlatform(url)` — returns the platform string from a URL
- `isDownloadableVideoUrl(url)` — strict check (specific path patterns per platform)
- `isValidPlatformUrl(url)` — any recognized platform
- `extractVideoId(url)` — YouTube video ID extraction
- `extractPlaylistId(url)` — YouTube playlist ID extraction
- `getPlatformName(platform)` — human-readable name
- `getPlatformUrl(platform)` — home URL for the platform

### `ipcChannels.js`

Single source of truth for all IPC strings:
- `IPC_CHANNELS` — for `ipcMain.handle` and `ipcRenderer.invoke`
- `IPC_EVENTS` — for `webContents.send` and `ipcRenderer.on`

---

## Download Pipeline

Step-by-step flow when a user clicks **Download**:

```
1. User pastes URL or clicks browser Download button
         │
2. BodySection.handleDownloadClick()
         │
3. useDownloadManager.enqueueDownload(url)
         │
4. Duplicate check (format + quality + saveTo + downloadType)
         │
5. getVideoInfo(url)
   ├── YouTube → YouTubeAPIManager → YouTube Data API v3
   └── Other  → NonYouTubeMetadataExtractor → yt-dlp --dump-json
         │
6. If playlist → PlaylistSelectionModal (user picks videos)
   └── enqueuePlaylistVideos(selectedVideos)
         │
7. New download entry added to localStorage, UUID assigned
         │
8. processQueue() → window.api.downloadVideo(params)  [IPC]
         │
9. Main process: spawns yt-dlp child process with args
         │
10. Child process streams stdout → IPC_EVENTS.DOWNLOAD_PROGRESS → renderer
         │
11. Progress parsed: %, speed, ETA, file size
         │
12. On completion:
    ├── Status set to "Completed"
    ├── saveDownload() → Firestore
    └── bumpDownloadCount() → every 4th download → DonationModal
```

---

## Platform Detection

Platform detection happens at multiple levels:

| Level | Where | How |
|-------|-------|-----|
| Clipboard | Main process | `isDownloadableVideoUrl()` — strict pattern match |
| Enqueue | Renderer | `detectPlatform()` — assigns platform to download entry |
| WebView | Renderer | Regex test against `all.json` video patterns |
| Notifications | Main process | `getPlatformName()` — in OS notification body |

---

## Auto-Update Subsystem

### App Updates (electron-updater)

1. `useAppLifecycle` calls `checkForUpdates` on startup
2. Main process uses `electron-updater` with GitHub releases as provider
3. Events: `UPDATE_AVAILABLE` → `UPDATE_DOWNLOAD_PROGRESS` → `UPDATE_DOWNLOADED`
4. `UpdateNotification` component renders a top banner
5. User clicks **Install** → `INSTALL_UPDATE` IPC → `autoUpdater.quitAndInstall()`

### yt-dlp Updates

1. On app startup, `updateYtdlp()` is called
2. Checks `ytdlp_version.txt` (version + timestamp)
3. Fetches GitHub nightly releases API
4. Downloads, replaces binary, sets permissions
5. Saves new version + timestamp to `ytdlp_version.txt`

---

## Data Persistence

| Data | Storage | Format |
|------|---------|--------|
| Download queue & history | `localStorage` | JSON array keyed `downloadList` |
| Download count | `localStorage` | Integer string keyed `downloadCount` |
| Download analytics | Firebase Firestore | Document per completed download |
| Error logs | Firebase Firestore | Document per failed download |
| YouTube cookies | `cookies.txt` | Netscape cookie format |
| yt-dlp version info | `ytdlp_version.txt` | `<tag>\n<timestamp>` |

---

## Security Model

- **Context Isolation**: enabled — renderer cannot access Node.js directly
- **nodeIntegration**: disabled in renderer — all OS calls via preload bridge
- **contextBridge**: only whitelisted methods exposed as `window.api`
- **webSecurity**: configured per Electron defaults
- **WebView**: uses `persist:main` partition for cookie persistence across sessions
- **Single Instance Lock**: `app.requestSingleInstanceLock()` prevents multiple app instances
- **Cookie Storage**: YouTube cookies stored as `cookies.txt` (Netscape format) — passed to yt-dlp via `--cookies` flag

---

*Last updated: March 2026*
