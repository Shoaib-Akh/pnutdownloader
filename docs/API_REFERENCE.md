# PNUTDownloader — API Reference

Technical reference for developers integrating with or extending PNUTDownloader.

---

## Table of Contents

1. [Architecture Diagram](#architecture-diagram)
2. [IPC Channels Reference](#ipc-channels-reference)
3. [IPC Events Reference](#ipc-events-reference)
4. [window.api (Preload Bridge)](#windowapi-preload-bridge)
5. [Main Process Services](#main-process-services)
6. [Shared Utilities](#shared-utilities)
7. [Platform Constants](#platform-constants)
8. [Error Handling](#error-handling)

---

## Architecture Diagram

```
Renderer (React)   ──window.api──►  Preload (contextBridge)  ──IPC──►  Main Process (Node)
                  ◄─────────────                             ◄──────
    Components                       Secure whitelist             IPC handlers + Services
    ViewModels                                                     Child processes (yt-dlp)
```

All IPC channel names are defined as constants in `src/shared/ipcChannels.js` to avoid string duplication.

---

## IPC Channels Reference

These channels are invoked from the renderer via `window.api.*` and handled by `ipcMain.handle(...)` in the main process.

### Download Operations

| Channel Constant | String Value | Parameters | Returns |
|-----------------|--------------|------------|---------|
| `DOWNLOAD_VIDEO` | `downloadVideo` | `{ id, url, isAudioOnly, selectedFormat, selectedQuality, selectBitrate, title, playlistTitle, forceSingle, saveTo }` | `void` (progress via event) |
| `PAUSE_DOWNLOAD` | `pauseDownload` | `{ downloadId: string }` | `{ success: boolean }` |
| `RESUME_DOWNLOAD` | `resumeDownload` | `{ downloadId: string }` | `{ success: boolean }` |
| `FETCH_VIDEO_INFO` | `fetch-video-info` | `url: string` | `VideoInfo` object |
| `FETCH_PLAYLIST_ENTRIES` | `fetch-playlist-entries` | `url: string` | `PlaylistInfo` object |

#### VideoInfo Object

```typescript
interface VideoInfo {
  videoUrl: string
  title: string
  thumbnail: string
  duration: string    // ISO 8601 (e.g., "PT3M45S")
  isPlaylist: boolean
  platform: string    // e.g., "youtube"
}
```

#### PlaylistInfo Object

```typescript
interface PlaylistInfo {
  isPlaylist: true
  playlistTitle: string
  videos: Array<{
    videoId: string
    title: string
    thumbnail: string
    duration: string
  }>
}
```

---

### File Operations

| Channel Constant | String Value | Parameters | Returns |
|-----------------|--------------|------------|---------|
| `SELECT_FOLDER` | `select-folder` | None | `string` (selected path) or `null` |
| `OPEN_PATH` | `openPath` | `path: string` | `void` |
| `OPEN_FILE` | `openFile` | `path: string` | `void` |
| `OPEN_EXTERNAL` | `openExternal` | `url: string` | `void` |
| `DELETE_FILE` | `deleteFile` | `filePath: string` | `{ success: boolean }` |
| `DELETE_MULTIPLE_FILES` | `deleteMultipleFiles` | `filePaths: string[]` | `{ deleted: string[], failed: string[] }` |
| `CHECK_FILE_EXISTS` | `checkFileExists` | `filePath: string` | `boolean` |
| `FILE_EXISTS` | `fileExists` | `filePath: string` | `boolean` |
| `READ_DIRECTORY` | `read-directory` | `dirPath: string` | `string[]` (file names) |
| `CREATE_DIRECTORY` | `create-directory` | `dirPath: string` | `{ success: boolean }` |
| `ACCESS_FILE` | `accessFile` | `filePath: string` | `boolean` |
| `PROXY_IMAGE` | `proxy-image` | `url: string` | `Buffer` (image data) |

---

### YouTube & Cookie Operations

| Channel Constant | String Value | Parameters | Returns |
|-----------------|--------------|------------|---------|
| `GET_YOUTUBE_COOKIES` | `getYoutubeCookies` | None | Saves cookies from WebView session |
| `SAVE_WEBVIEW_COOKIES` | `save-webview-cookies` | `cookies: CookieObject[]` | `void` |
| `GET_YOUTUBE_INFO` | `get-youtube-info` | `videoId: string` | `VideoInfo` |

---

### System Operations

| Channel Constant | String Value | Parameters | Returns |
|-----------------|--------------|------------|---------|
| `GET_APP_VERSION` | `get-app-version` | None | `string` (e.g., `"1.3.0"`) |
| `GET_YT_VERSION` | `getYtVersion` | None | `string` (yt-dlp version or error) |
| `GET_FFMPEG_VERSION` | `getFfmpegVersion` | None | `string` (FFmpeg version line or error) |
| `GET_PATH` | `get-path` | `name: string` | `string` (system path) |
| `SHOW_MESSAGE_BOX` | `show-message-box` | `{ type, title, message }` | `void` |
| `SHOW_CONFIRM_DIALOG` | `show-confirm-dialog` | `{ title, message }` | `boolean` |
| `CHECK_DEPENDENCIES` | `check-dependencies` | None | `{ ytdlp: boolean, ffmpeg: boolean }` |
| `SHOW_VIDEO_URL_NOTIFICATION` | `show-video-url-notification` | `url: string` | `{ success: boolean, platform?: string }` |

---

### Update Operations

| Channel Constant | String Value | Parameters | Returns |
|-----------------|--------------|------------|---------|
| `CHECK_YTDLP_UPDATE` | `check-ytdlp-update` | None | `{ needsUpdate: boolean, reason: string, currentVersion?: string, latestVersion?: string }` |
| `UPDATE_YTDLP` | `update-ytdlp` | None | `{ success: boolean, message: string, version?: string }` |
| `DOWNLOAD_UPDATE` | `download-update` | None | `void` |
| `INSTALL_UPDATE` | `install-update` | None | Restarts app |

---

### State Persistence Operations

| Channel Constant | String Value | Parameters | Returns |
|-----------------|--------------|------------|---------|
| `SAVE_DOWNLOAD_STATE` | `save-download-state` | `state: object` | `void` |
| `LOAD_DOWNLOAD_STATE` | `load-download-state` | None | `object` |
| `HANDLE_FILE_DELETION` | `handleFileDeletion` | `{ filePath: string }` | `void` |

---

## IPC Events Reference

These events are **pushed from the main process to renderer** via `mainWindow.webContents.send(eventName, data)`. In the renderer, subscribe via `window.api.on*(callback)`.

| Event Constant | String Value | Data Shape | When Fired |
|---------------|--------------|------------|-----------|
| `DOWNLOAD_PROGRESS` | `download-progress` | `{ downloadId, message, title?, thumbnail?, duration?, error? }` | During yt-dlp stdout streaming |
| `VIDEO_URL_DETECTED` | `video-url-detected` | `{ url: string }` | Clipboard monitor detects video URL |
| `WEBVIEW_URL_UPDATE` | `webview-url-update` | `{ url: string }` | WebView navigates to new page |
| `FILE_DELETED` | `file-deleted` | `{ filePath: string }` | File deleted from disk |
| `FILE_DELETED_SUCCESS` | `file-deleted-successfully` | `{ filePath: string }` | Confirmed deletion |
| `FILE_DELETION_FAILED` | `file-deletion-failed` | `{ filePath: string, error: string }` | Deletion failed |
| `UPDATE_AVAILABLE` | `update-available` | `UpdateInfo` (electron-updater) | New app version detected |
| `UPDATE_DOWNLOADED` | `update-downloaded` | `void` | Update ready to install |
| `UPDATE_DOWNLOAD_PROGRESS` | `update-download-progress` | `{ percent: number, ...}` | Downloading app update |
| `UPDATE_ERROR` | `update-error` | `{ error: string }` | Update process error |
| `CHECK_FOR_UPDATES` | `check-for-updates` | `void` | Trigger update check |
| `YTDLP_UPDATED` | `ytdlp-updated` | `{ version: string }` | yt-dlp binary refreshed |

### Progress Message Parsing

The `DOWNLOAD_PROGRESS` event's `message` field contains raw yt-dlp stdout. The renderer parses it:

```
[download]  45.2% of ~  128.50MiB at    3.20MiB/s ETA 00:28
```

Parsed to: `{ progress: 45.2, fileSize: '128.50MiB', speed: '3.20MiB/s', eta: '00:28' }`

For video+audio downloads (MP4), progress is weighted:
- Video stream: `0%–90%`
- Audio stream: `90%–100%`

---

## window.api (Preload Bridge)

The preload script exposes `window.api` to the renderer via `contextBridge.exposeInMainWorld`. **All renderer-to-main communication goes through this object.**

### Usage Examples

```javascript
// Get app version
const version = await window.api.getAppVersion()  // "1.3.0"

// Get yt-dlp version
const ytVersion = await window.api.getYtVersion()

// Get FFmpeg version
const ffmpegVersion = await window.api.getFfmpegVersion()

// Select a folder
const folderPath = await window.api.selectFolder()

// Open a file in the default OS viewer
await window.api.openFile('/path/to/video.mp4')

// Open a path in Finder/Explorer
await window.api.openPath('/path/to/folder')

// Open a URL in the default browser
await window.api.openExternal('https://ko-fi.com/pnutdownloader')

// Show a native message box
await window.api.showMessageBox({
  type: 'warning',
  title: 'Duplicate Download',
  message: 'This URL is already queued.'
})

// Start a download
await window.api.downloadVideo({
  id: 'uuid-here',
  url: 'https://youtube.com/watch?v=xxx',
  isAudioOnly: false,
  selectedFormat: 'mp4',
  selectedQuality: '1080p',
  selectBitrate: null,
  title: 'My Video',
  playlistTitle: null,
  forceSingle: false,
  saveTo: 'downloads'
})

// Subscribe to download progress
window.api.onDownloadProgress((data) => {
  console.log(data.message)  // raw yt-dlp stdout line
})

// Subscribe to clipboard URL detection
window.api.onVideoUrlDetected((data) => {
  console.log(data.url)
})

// Track an analytics event
window.api.trackEvent('download_started', { platform: 'youtube' })

// Force-update yt-dlp
const result = await window.api.updateYtdlp()

// Get YouTube cookies from WebView session
await window.api.getYoutubeCookies()

// Check if a file exists
const exists = await window.api.checkFileExists('/path/to/file.mp4')

// Delete a file
await window.api.deleteFile('/path/to/file.mp4')
```

---

## Main Process Services

Located in `src/main/services/`:

### DownloadService (`DownloadService.js`)

Manages yt-dlp child process spawning.

```javascript
const downloadService = new DownloadService({ ytdlpPath, cookiesPath, mainWindow })

downloadService.download(url, options)  // spawns yt-dlp
downloadService.pause(downloadId)       // kills child process
downloadService.resume(downloadId)      // re-spawns
downloadService.cancel(downloadId)      // kills + cleans up
```

### YtdlpService (`YtdlpService.js`)

Manages the yt-dlp binary lifecycle.

```javascript
const ytdlpService = new YtdlpService(pathService)

ytdlpService.getVersion()        // string: "2025.xx.xx"
ytdlpService.checkForUpdate()    // { needsUpdate, reason, currentVersion, latestVersion }
ytdlpService.update()            // downloads nightly binary, sets chmod 755
ytdlpService.extractInfo(url)    // runs yt-dlp --dump-json, returns metadata
```

### FfmpegService (`FfmpegService.js`)

Handles FFmpeg binary verification and download.

```javascript
const ffmpegService = new FfmpegService(pathService)

ffmpegService.getVersion()               // string: "ffmpeg version 8.0.1"
ffmpegService.downloadAndExtract()       // downloads platform FFmpeg archive
```

FFmpeg is downloaded from:
- **Windows**: GitHub BtbN builds (`.zip`)
- **macOS**: `evermeet.cx` (`.zip`)
- **Linux**: `johnvansickle.com` (`.tar.xz`)

### CookieService (`CookieService.js`)

Manages YouTube session cookies.

```javascript
const cookieService = new CookieService({ mainWindow, cookiesPath })

cookieService.getCookies()            // reads cookies.txt
cookieService.saveFromSession()       // dumps WebView session cookies → cookies.txt
```

### PathService (`PathService.js`)

Resolves file paths for both packaged and development modes.

```javascript
const pathService = new PathService()

pathService.getYtdlpPath()    // resolves to resources or public/
pathService.getFfmpegPath()   // resolves to resources or public/
pathService.getCookiesPath()  // resolves to cookies.txt
pathService.getDownloadsPath(type)  // 'downloads' | 'desktop' | custom
```

### UpdateService (`UpdateService.js`)

Wraps `electron-updater`.

```javascript
const updateService = new UpdateService({ mainWindow, isDev, logger })

updateService.checkForUpdates()   // fires UPDATE_AVAILABLE event if applicable
updateService.downloadUpdate()    // fires UPDATE_DOWNLOAD_PROGRESS events
updateService.installUpdate()     // quitAndInstall()
```

### ClipboardService (`ClipboardService.js`)

Monitors clipboard for video URLs every 1 second.

```javascript
const clipboardService = new ClipboardService({ mainWindow })

clipboardService.startMonitoring()   // starts setInterval
clipboardService.stopMonitoring()    // clears interval
```

When a video URL is detected:
1. Fires `IPC_EVENTS.VIDEO_URL_DETECTED` to renderer
2. Calls `IPC_CHANNELS.SHOW_VIDEO_URL_NOTIFICATION` to show OS notification

---

## Shared Utilities

### `src/shared/platformUtils.js`

```javascript
import {
  PLATFORMS,
  detectPlatform,
  isValidPlatformUrl,
  isYouTubePlatform,
  isDownloadableVideoUrl,
  getPlatformName,
  getPlatformUrl,
  extractVideoId,
  extractPlaylistId
} from '../shared/platformUtils'

detectPlatform('https://youtube.com/watch?v=xxx')
// → 'youtube'

isDownloadableVideoUrl('https://youtu.be/abc123')
// → true

isDownloadableVideoUrl('https://youtube.com')
// → false  (homepage, not a specific video)

extractVideoId('https://youtube.com/watch?v=abc123def45')
// → 'abc123def45'

extractPlaylistId('https://youtube.com/playlist?list=PLxxx')
// → 'PLxxx'

getPlatformName('tiktok')
// → 'TikTok'

getPlatformUrl('instagram')
// → 'https://www.instagram.com'
```

### `src/shared/ipcChannels.js`

```javascript
import { IPC_CHANNELS, IPC_EVENTS } from '../shared/ipcChannels'

// In main process:
ipcMain.handle(IPC_CHANNELS.DOWNLOAD_VIDEO, async (event, params) => { ... })
mainWindow.webContents.send(IPC_EVENTS.DOWNLOAD_PROGRESS, progressData)

// In renderer:
window.api.invoke(IPC_CHANNELS.DOWNLOAD_VIDEO, params)
ipcRenderer.on(IPC_EVENTS.DOWNLOAD_PROGRESS, handler)
```

---

## Platform Constants

```javascript
export const PLATFORMS = {
  YOUTUBE: 'youtube',
  YOUTUBE_MUSIC: 'youtube_music',
  YOUTUBE_KIDS: 'youtube_kids',
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  TWITTER: 'twitter',
  TWITCH: 'twitch',
  DAILYMOTION: 'dailymotion',
  BILIBILI: 'bilibili',
  REDDIT: 'reddit',
  PINTEREST: 'pinterest',
  LINKEDIN: 'linkedin',
  SOUNDCLOUD: 'soundcloud',
  VIMEO: 'vimeo',
  RUMBLE: 'rumble',
  BITCHUTE: 'bitchute',
  UNKNOWN: 'unknown'
}
```

---

## Error Handling

### Download Errors

When yt-dlp fails, the `DOWNLOAD_PROGRESS` event's `error` field is populated. Special error patterns trigger UI responses:

| yt-dlp Error Pattern | App Action |
|---------------------|------------|
| `Sign in to confirm` | `onLoginRequired()` → LoginModal |
| `exporting YouTube cookies` | `onLoginRequired()` → LoginModal |
| HTTP 403 / 429 | Status → `Failed`, retry button shown |
| `has already been downloaded` | Status → `Completed` (treated as success) |

### App Error Codes

| Code | Meaning |
|------|---------|
| `ERR_DOWNLOAD_FAILED` | yt-dlp exited with non-zero code |
| `ERR_VIDEO_UNAVAILABLE` | Video removed or region-blocked |
| `ERR_INVALID_URL` | URL did not match any supported pattern |
| `ERR_AUTH_REQUIRED` | Cookie/sign-in required |
| `ERR_NETWORK_ERROR` | Could not connect |
| `ERR_FFMPEG_MISSING` | FFmpeg binary not found or empty |
| `ERR_YTDLP_MISSING` | yt-dlp binary not found or empty |
| `ERR_PERMISSION_DENIED` | Cannot write to selected save path |

### ErrorBoundary

The renderer wraps the whole app in `<ErrorBoundary>` which catches React rendering errors and shows a fallback UI rather than a blank window.

---

## Running Tests

```bash
npm test           # run all Jest tests
npm run test:watch # watch mode
```

Tests are in `tests/` directory. Jest is configured in `jest.config.js`.

---

*Last updated: March 2026*
