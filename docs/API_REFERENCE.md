# PNUTDownloader API Reference

Technical documentation for developers working with PNUTDownloader.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [IPC Channels](#ipc-channels)
3. [Services](#services)
4. [Preload API](#preload-api)
5. [Error Codes](#error-codes)

---

## Architecture Overview

PNUTDownloader follows a layered Electron architecture:

```
┌─────────────────────────────────────────┐
│           src/renderer (React)          │
│         UI and presentation logic       │
└──────────────────┬──────────────────────┘
                   │ window.api
┌──────────────────▼──────────────────────┐
│          src/preload (Bridge)           │
│      contextBridge secure API           │
└──────────────────┬──────────────────────┘
                   │ IPC
┌──────────────────▼──────────────────────┐
│            src/main (Node.js)           │
│     OS integrations, file system       │
└─────────────────────────────────────────┘

Shared: src/shared (Pure utilities)
```

---

## IPC Channels

### Request Channels

All IPC channels are defined in [`src/shared/ipcChannels.js`](../src/shared/ipcChannels.js).

#### Download Operations

| Channel | Description | Parameters |
|---------|-------------|------------|
| `DOWNLOAD_VIDEO` | Start video download | `{url, format, quality, outputPath}` |
| `PAUSE_DOWNLOAD` | Pause active download | `{downloadId}` |
| `RESUME_DOWNLOAD` | Resume paused download | `{downloadId}` |
| `FETCH_VIDEO_INFO` | Get video metadata | `{url}` |
| `FETCH_PLAYLIST_ENTRIES` | Get playlist videos | `{playlistUrl}` |

#### File Operations

| Channel | Description | Parameters |
|---------|-------------|------------|
| `SELECT_FOLDER` | Open folder picker | None |
| `OPEN_PATH` | Open file/folder | `{path}` |
| `OPEN_EXTERNAL` | Open in external app | `{url}` |
| `DELETE_FILE` | Delete a file | `{filePath}` |
| `DELETE_MULTIPLE_FILES` | Delete multiple files | `{filePaths[]}` |
| `CHECK_FILE_EXISTS` | Check if file exists | `{filePath}` |
| `READ_DIRECTORY` | List directory contents | `{dirPath}` |
| `CREATE_DIRECTORY` | Create new directory | `{dirPath}` |

#### YouTube Operations

| Channel | Description | Parameters |
|---------|-------------|------------|
| `GET_YOUTUBE_INFO` | Fetch YouTube video info | `{videoId}` |
| `GET_YOUTUBE_COOKIES` | Get saved YouTube cookies | None |
| `SAVE_WEBVIEW_COOKIES` | Save cookies from webview | `{cookies}` |
| `GET_YT_VERSION` | Get yt-dlp version | None |

#### System Operations

| Channel | Description | Parameters |
|---------|-------------|------------|
| `GET_PATH` | Get system path | `{name}` (e.g., 'home', 'downloads') |
| `GET_APP_VERSION` | Get app version | None |
| `GET_FFMPEG_VERSION` | Get FFmpeg version | None |
| `SHOW_MESSAGE_BOX` | Show native dialog | `{type, title, message}` |
| `SHOW_CONFIRM_DIALOG` | Show confirmation dialog | `{title, message}` |
| `CHECK_DEPENDENCIES` | Check required dependencies | None |

#### Update Operations

| Channel | Description | Parameters |
|---------|-------------|------------|
| `CHECK_YTDLP_UPDATE` | Check yt-dlp for updates | None |
| `UPDATE_YTDLP` | Update yt-dlp | None |
| `DOWNLOAD_UPDATE` | Download app update | None |
| `INSTALL_UPDATE` | Install downloaded update | None |

#### State Management

| Channel | Description | Parameters |
|---------|-------------|------------|
| `SAVE_DOWNLOAD_STATE` | Persist download state | `{state}` |
| `LOAD_DOWNLOAD_STATE` | Load saved state | None |
| `HANDLE_FILE_DELETION` | Handle file deletion | `{filePath}` |

#### Other

| Channel | Description | Parameters |
|---------|-------------|------------|
| `PROXY_IMAGE` | Proxy image request | `{url}` |
| `OPEN_WEBVIEW` | Open webview | `{url}` |
| `SAVE_WEBVIEW_COOKIES` | Save webview cookies | `{cookies}` |

---

## IPC Events

Events are emitted from main process to renderer.

| Event | Description | Data |
|-------|-------------|------|
| `DOWNLOAD_PROGRESS` | Download progress update | `{id, percent, speed, eta}` |
| `VIDEO_URL_DETECTED` | Video URL detected | `{url}` |
| `WEBVIEW_URL_UPDATE` | WebView URL changed | `{url}` |
| `FILE_DELETED` | File deleted successfully | `{filePath}` |
| `FILE_DELETION_FAILED` | File deletion failed | `{filePath, error}` |
| `UPDATE_AVAILABLE` | Update available | `{version}` |
| `UPDATE_DOWNLOADED` | Update downloaded | None |
| `UPDATE_DOWNLOAD_PROGRESS` | Update download progress | `{percent}` |
| `UPDATE_ERROR` | Update error | `{error}` |
| `YTDLP_UPDATED` | yt-dlp updated | `{version}` |

---

## Services

### DownloadService

Located in [`src/main/services/DownloadService.js`](../src/main/services/DownloadService.js)

```javascript
const { DownloadService } = require('../services')

const downloadService = new DownloadService({
  ytdlpPath: '/path/to/yt-dlp',
  cookiesPath: '/path/to/cookies.txt',
  mainWindow: mainWindow
})
```

**Methods:**

| Method | Description |
|--------|-------------|
| `download(url, options)` | Start a download |
| `pause(downloadId)` | Pause download |
| `resume(downloadId)` | Resume download |
| `cancel(downloadId)` | Cancel download |
| `getInfo(url)` | Fetch video metadata |

### YtdlpService

Located in [`src/main/services/YtdlpService.js`](../src/main/services/YtdlpService.js)

```javascript
const { YtdlpService } = require('../services')

const ytdlpService = new YtdlpService(pathService)
```

**Methods:**

| Method | Description |
|--------|-------------|
| `getVersion()` | Get yt-dlp version |
| `checkForUpdate()` | Check for updates |
| `update()` | Update yt-dlp |
| `extractInfo(url)` | Extract video info |

### FfmpegService

Located in [`src/main/services/FfmpegService.js`](../src/main/services/FfmpegService.js)

```javascript
const { FfmpegService } = require('../services')

const ffmpegService = new FfmpegService(pathService)
```

**Methods:**

| Method | Description |
|--------|-------------|
| `getVersion()` | Get FFmpeg version |
| `convert(input, output, options)` | Convert media file |
| `extractAudio(input, output)` | Extract audio from video |

### CookieService

Located in [`src/main/services/CookieService.js`](../src/main/services/CookieService.js)

```javascript
const { CookieService } = require('../services')

const cookieService = new CookieService({
  mainWindow: mainWindow,
  cookiesPath: '/path/to/cookies.txt'
})
```

**Methods:**

| Method | Description |
|--------|-------------|
| `importCookies(filePath)` | Import cookies from file |
| `exportCookies(filePath)` | Export cookies to file |
| `getCookies()` | Get current cookies |

### UpdateService

Located in [`src/main/services/UpdateService.js`](../src/main/services/UpdateService.js)

```javascript
const { UpdateService } = require('../services')

const updateService = new UpdateService({
  mainWindow: mainWindow,
  isDev: false,
  logger: console
})
```

**Methods:**

| Method | Description |
|--------|-------------|
| `checkForUpdates()` | Check for app updates |
| `downloadUpdate()` | Download available update |
| `installUpdate()` | Install downloaded update |

---

## Preload API

The preload script exposes a secure API to the renderer via `window.api`.

```javascript
// Example usage in renderer
const { ipcRenderer } = window.api

// Start a download
await ipcRenderer.invoke('downloadVideo', {
  url: 'https://youtube.com/watch?v=xxx',
  format: 'mp4',
  quality: 'best'
})

// Listen for progress
ipcRenderer.on('download-progress', (event, data) => {
  console.log(data.percent) // 50
})
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `ERR_DOWNLOAD_FAILED` | Download failed |
| `ERR_VIDEO_UNAVAILABLE` | Video not available |
| `ERR_INVALID_URL` | Invalid URL format |
| `ERR_AUTH_REQUIRED` | Authentication required |
| `ERR_NETWORK_ERROR` | Network error |
| `ERR_FILE_EXISTS` | File already exists |
| `ERR_PERMISSION_DENIED` | Permission denied |
| `ERR_FFMPEG_MISSING` | FFmpeg not found |
| `ERR_YTDLP_MISSING` | yt-dlp not found |

---

## Testing

Run unit tests:

```bash
npm test
```

Tests are located in [`tests/`](../tests/) directory.

---

*Last updated: March 2026*
