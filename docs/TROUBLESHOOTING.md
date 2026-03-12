# PNUTDownloader — Troubleshooting Guide

Solutions to the most common problems users encounter with PNUTDownloader.

---

## Table of Contents

1. [Download Errors](#download-errors)
2. [YouTube Specific Issues](#youtube-specific-issues)
3. [Installation & Startup Issues](#installation--startup-issues)
4. [Browser (WebView) Issues](#browser-webview-issues)
5. [Platform-Specific Issues](#platform-specific-issues)
6. [Performance Issues](#performance-issues)
7. [Update Issues](#update-issues)
8. [Checking Logs](#checking-logs)
9. [Getting More Help](#getting-more-help)

---

## Download Errors

### "Download Failed" — generic failure

**Causes & Fixes:**

| Probable Cause | Solution |
|----------------|---------|
| Bad internet connection | Check your connection, then click **Retry** |
| Outdated yt-dlp | Go to **About → Update yt-dlp** or restart the app |
| Video deleted or private | Confirm the video is publicly accessible in a browser |
| Format not available | Change **Quality** or **Format** in the Navbar |
| Region restriction | Use a VPN to change your apparent location |

---

### "Duplicate download" warning

This appears when you attempt to add the same URL with the same **Format**, **Quality**, **Save To**, and **Type**.

**Fix**: Change any one of those settings (e.g., change quality from 1080p to Best), then download again.

---

### Download stuck at 0% or "Fetching Info…"

**Causes & Fixes:**

| Probable Cause | Solution |
|----------------|---------|
| Slow network / CDN delay | Wait 30 seconds; yt-dlp is resolving the stream |
| yt-dlp binary corrupted | Restart app to trigger yt-dlp auto-update |
| Unsupported URL | Verify the URL works in the built-in browser |

---

### Download fails immediately for Instagram / TikTok / Facebook

**Cause**: These platforms restrict direct access without cookies.

**Fix**:
1. Use the built-in browser → click the Platform Icon (e.g., Instagram)
2. Log into the platform
3. Navigate to the video
4. Click the **Download** button that appears

---

### "Destination" file appears but download never completes

**Cause**: yt-dlp downloads video and audio as separate streams and merges them with FFmpeg. If FFmpeg is missing or corrupted, merging fails.

**Fix**:
1. Restart the app (FFmpeg is auto-downloaded on startup if missing)
2. Check **About** → verify FFmpeg version shows correctly
3. If FFmpeg version shows `Error`, see [FFmpeg not found](#ffmpeg-not-found-or-unavailable)

---

## YouTube Specific Issues

### "Sign in to confirm your age" / Login error

**Cause**: YouTube requires authentication for age-restricted content or detects bot-like access.

**Fix**:
1. A **Login Modal** will appear automatically when this error is detected
2. Click **Open YouTube** in the modal
3. Log into your Google account in the built-in browser
4. Your session cookies are automatically saved
5. Close any open Login modal and click **Retry** on the failed download

> **Note**: Cookies are saved to `cookies.txt` locally and passed to yt-dlp. They are never uploaded anywhere.

---

### YouTube playlist downloads only show one video

**Cause**: The URL includes both a video ID (`v=`) and a playlist ID (`list=`). PNUTDownloader strips the `list=` parameter by default to download the single video.

**Fix**: Use the actual playlist URL: `youtube.com/playlist?list=PLxxxxxxxx` (not a watch URL with `&list=`). The Playlist Selection Modal will open automatically.

---

### YouTube Music downloads fail

**Cause**: YouTube Music sometimes requires an authenticated session.

**Fix**: Log into YouTube Music in the built-in browser (use the YouTube Music icon in Platform Icons) before downloading.

---

### "HTTP Error 429: Too Many Requests"

**Cause**: YouTube rate-limited your IP because of too many rapid requests.

**Fix**:
1. Wait 5–15 minutes before trying again
2. Avoid queuing many YouTube videos simultaneously
3. Consider using a VPN to rotate your IP

---

## Installation & Startup Issues

### App shows "Initializing Dependencies…" forever

**Cause**: yt-dlp or FFmpeg download stalled on first run.

**Fix**:
1. Check your internet connection
2. Force-quit the app and relaunch
3. If it persists, manually place binaries in the app resources folder (see [INSTALLATION.md](./INSTALLATION.md))

---

### "yt-dlp not found" error on startup

**Cause**: The yt-dlp binary is missing or has zero bytes.

**Fix — macOS/Linux** (development mode):
```bash
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos \
     -o /path/to/pnutdownloader/public/yt-dlp_macos
chmod +x /path/to/pnutdownloader/public/yt-dlp_macos
```

**Fix — Windows** (development mode):
```bash
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe `
     -o C:\path\to\pnutdownloader\public\yt-dlp.exe
```

**Fix — packaged app**: Uninstall and reinstall the app.

---

### FFmpeg not found or unavailable

**Cause**: FFmpeg binary missing, corrupted, or failed to download.

**Fix**:
1. Restart the app — FFmpeg is automatically downloaded on startup from official sources
2. If still missing, manually install:

**macOS**:
```bash
brew install ffmpeg
# App will use system ffmpeg as fallback
```

**Linux**:
```bash
sudo apt install ffmpeg
```

**Windows**: Download from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html) and place `ffmpeg.exe` in the app resources folder.

---

### macOS: "App cannot be opened because it is from an unidentified developer"

**Fix**:
```bash
# Remove quarantine attribute
xattr -cr /Applications/PNUTDownloader.app
```

Or right-click the app → **Open** → **Open** in the dialog.

---

### macOS: App opens but nothing happens

**Cause**: Permission issue with the binary.

**Fix**:
```bash
chmod +x /Applications/PNUTDownloader.app/Contents/MacOS/PNUTDownloader
```

---

### Windows: "Windows protected your PC" (SmartScreen)

**Fix**: Click **More Info** → **Run Anyway**. This is expected for unsigned Electron apps.

---

### Linux: AppImage doesn't open

**Fix** — install FUSE:
```bash
# Ubuntu/Debian
sudo apt install libfuse2

# Fedora
sudo dnf install fuse fuse-libs
```

---

## Browser (WebView) Issues

### Built-in browser shows a blank white page

**Cause**: WebView failed to load.

**Fix**:
1. Click the **Reload** button (⟳) in the browser toolbar
2. Close and reopen the browser
3. Restart the app

---

### No **Download** button appears on a video page

**Cause**: The current URL doesn't match any downloadable video pattern in `all.json`.

**Possible scenarios:**
- You're on a search results page, not a video page — navigate directly to a video
- The platform isn't yet supported — copy the URL and paste it directly instead

---

### YouTube login doesn't persist in the browser

**Cause**: The WebView session partition `persist:main` may have been cleared.

**Fix**:
1. Clear app data: delete `~/Library/Application Support/PNUTDownloader` (macOS) or `%APPDATA%\PNUTDownloader` (Windows)
2. Relaunch and log in again

---

## Platform-Specific Issues

### TikTok: Downloads watermarked

**Cause**: yt-dlp may download the watermarked version from some TikTok endpoints.

**Fix**: This is a yt-dlp limitation. Try updating yt-dlp via **About → Update yt-dlp** as newer versions may resolve this.

---

### Twitter / X: "Could not find video"

**Cause**: The tweet doesn't contain a video, or the account is private.

**Fix**: Confirm the tweet URL is a tweet (`.../status/...`) and the video is publicly visible.

---

### Instagram Stories: Expired link

**Cause**: Instagram story URLs expire after 24 hours.

**Fix**: Download stories while they're still live.

---

### Twitch VODs: Only first few minutes download

**Cause**: Subscriber-only or premium VOD content.

**Fix**: Log into Twitch in the built-in browser to save your session cookies.

---

## Performance Issues

### App is slow or uses high CPU during download

**Cause**: FFmpeg merge process is CPU-intensive for high-resolution video.

**Fix**:
- Download lower quality (720p instead of 4K)
- Avoid downloading multiple files simultaneously

---

### Downloads are very slow

**Potential causes:**
- Website rate-limits downloads
- Your ISP throttles certain content
- VPN routing is slow

**Fix**:
- Try a different time of day
- Try without a VPN (or with a different server)
- For YouTube, this is often temporary — retry after a few minutes

---

## Update Issues

### App update banner keeps appearing but doesn't install

**Fix**:
1. Click **Install Update** prominently when the download completes (the button changes)
2. If it still doesn't work, download the latest installer manually from [GitHub Releases](https://github.com/Shoaib-Akh/pnutdownloader/releases)

---

### yt-dlp update fails silently

**Cause**: GitHub API rate limit or network issue.

**Fix**:
```bash
# Check from terminal whether GitHub is reachable
curl -I https://api.github.com/repos/yt-dlp/yt-dlp-nightly-builds/releases/latest
```

If you get a `403` or `rate limit`, wait a few minutes and restart the app.

---

## Checking Logs

### macOS

```bash
# Open Console app and filter by "PNUTDownloader"
# Or check log file:
cat ~/Library/Logs/PNUTDownloader/main.log
```

### Windows

```
%APPDATA%\PNUTDownloader\logs\main.log
```

### Linux

```bash
~/.config/PNUTDownloader/logs/main.log
```

### Developer Console (DevTools)

In development mode: `Ctrl/Cmd + Shift + I` opens DevTools in the renderer window. You can see all console output and IPC messages.

---

## Getting More Help

If none of the above solutions work:

1. **Search Issues**: [github.com/Shoaib-Akh/pnutdownloader/issues](https://github.com/Shoaib-Akh/pnutdownloader/issues)
2. **Open a Bug Report**: Use the template in [CONTRIBUTING.md](./CONTRIBUTING.md#bug-report-template)
3. **Discussions**: [GitHub Discussions](https://github.com/Shoaib-Akh/pnutdownloader/discussions)

When reporting, always include:
- Your **OS** and version
- **App version** (from About)
- **yt-dlp version** (from About)
- **The exact URL** you were trying to download
- **What happened** vs. what you expected
- Any **error messages** shown

---

*Last updated: March 2026*
