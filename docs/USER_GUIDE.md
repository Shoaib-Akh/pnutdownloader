# PNUTDownloader — User Guide

Complete guide for using **PNUTDownloader** — your fast, powerful desktop video downloader.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Interface Overview](#interface-overview)
3. [Downloading Videos](#downloading-videos)
4. [Playlist Downloads](#playlist-downloads)
5. [Audio Extraction](#audio-extraction)
6. [Using the Built-in Browser](#using-the-built-in-browser)
7. [Supported Platforms](#supported-platforms)
8. [Download Settings](#download-settings)
9. [Managing Downloads](#managing-downloads)
10. [Clipboard Detection](#clipboard-detection)
11. [YouTube Login (Cookies)](#youtube-login-cookies)
12. [Auto-Update](#auto-update)
13. [Keyboard Shortcuts](#keyboard-shortcuts)
14. [Troubleshooting](#troubleshooting)

---

## Introduction

**PNUTDownloader** is a free, open-source, cross-platform desktop video downloader built with Electron. It uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) as its download engine, giving it support for **1700+ websites**, including YouTube, Instagram, TikTok, Facebook, Twitter/X, and many more.

### Key Features

| Feature | Details |
|---------|---------|
| 📥 Download videos | MP4, MKV, WEBM and more |
| 🎵 Download audio | MP3, M4A, OGG and more |
| 📋 Playlist support | Select individual or all videos |
| 🌐 Built-in browser | Browse + one-click download |
| 📎 Clipboard detection | Auto-detects copied video URLs |
| 🔁 Queue system | Multiple downloads, processed sequentially |
| 🔄 Auto-update | App and yt-dlp both stay up to date |
| 🍪 Cookie auth | Download age-restricted or private content |
| 🖥️ Cross-platform | Windows, macOS, Linux |

---

## Interface Overview

```
┌─────────────────────────────────────────────────────────┐
│  Navbar  [Type▼] [Quality▼] [Format▼] [Bitrate▼] [Save▼]│
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Sidebar  │           Body Section                       │
│          │  ┌──────────────────────────────────┐       │
│ • Home   │  │  Platform shortcuts (YouTube,    │       │
│ • All    │  │  Instagram, TikTok…)             │       │
│   Files  │  └──────────────────────────────────┘       │
│ • About  │                                              │
│          │  (or) Download List / WebView                │
└──────────┴──────────────────────────────────────────────┘
```

### Navbar Controls

| Control | Options | Description |
|---------|---------|-------------|
| **Type** | Video / Audio | Whether to download video or audio-only |
| **Quality** | 144p → 4K / Best | Video resolution |
| **Format** | MP4, WEBM, MKV (video) / MP3, M4A (audio) | Output file format |
| **Bitrate** | 64k → 320k | Audio bitrate (audio-only mode) |
| **Save To** | Downloads / Desktop / Custom | Download destination folder |

### Sidebar Items

| Item | Action |
|------|--------|
| **Home** | Show platform shortcuts |
| **All Files** | Open the download list |
| **Settings** | App settings |
| **About** | App version and info |
| **Feedback** | Submit feedback |

---

## Downloading Videos

### Method 1 — Paste URL

1. Copy a video URL from any browser
2. Open PNUTDownloader — a **popup modal** will appear automatically if a video URL is detected in your clipboard
3. Click **Download** in the popup, or paste the URL manually
4. Select your desired **Quality** and **Format** in the Navbar
5. The download starts immediately and appears in the Download List

### Method 2 — Built-in Browser

1. Click any **Platform Icon** (e.g., YouTube) in the Body Section
2. Browse to the video you want
3. When a downloadable video page is detected, a **Download** button floats at the bottom-right
4. Click **Download** — the video is added to the queue

---

## Playlist Downloads

1. Copy a YouTube playlist URL
2. Paste it into PNUTDownloader (either via clipboard detection or the built-in browser)
3. A **Playlist Selection Modal** opens, showing all videos with their thumbnails and durations
4. Select individual videos or use **Select All**
5. Click **Download Selected** — each video is added to the queue
6. Videos download sequentially

> **Note**: PNUTDownloader strips the `list=` parameter from watch URLs that have a playlist tag, so single-video URLs are always downloaded as singles.

---

## Audio Extraction

1. Set **Type** → **Audio** in the Navbar
2. Choose **Format**: `MP3`, `M4A`, `OGG`, `OPUS`, or `FLAC`
3. Set **Bitrate**: `64k`, `128k`, `192k`, `256k`, or `320k`
4. Paste a URL or use the browser
5. Click **Download**

The audio stream is extracted and converted by FFmpeg automatically.

---

## Using the Built-in Browser

The built-in browser is a full Chromium WebView (Electron's `<webview>` tag) with:

| Feature | How |
|---------|-----|
| Navigation | Back / Forward / Reload buttons |
| URL bar | Type or paste any URL, press Enter or click Go |
| Copy URL | Click the copy icon next to the URL bar |
| Zoom | Use `+` / `−` / Reset buttons (10% increments, 10%–500%) |
| Download button | Appears automatically when a downloadable video is detected |
| Cookie persistence | All sessions use `persist:main` — you stay logged in |

### Browser Tips

- Click **Resume Browser** to return to your last browsed page after switching to the Download List
- The browser automatically defaults to `youtube.com` on first open
- Cookies from the browser are saved as `cookies.txt` and used for subsequent yt-dlp downloads

---

## Supported Platforms

PNUTDownloader supports **1700+ websites** via yt-dlp. The following platforms have **first-class icon shortcuts** built into the UI:

| Platform | URL Pattern | Notes |
|----------|-------------|-------|
| YouTube | `youtube.com/watch`, `youtu.be`, `/shorts/`, `/playlist` | Full + playlist support |
| YouTube Music | `music.youtube.com` | Audio extraction ideal |
| YouTube Kids | `youtubekids.com` | |
| Facebook | `facebook.com/videos/`, `/reel/`, `fb.watch` | |
| Instagram | `instagram.com/p/`, `/reels/`, `/stories/` | |
| Snapchat | `snapchat.com/spotlight/`, `snapchat.com/stories/`, `story.snapchat.com` | Public Spotlight/story media |
| TikTok | `tiktok.com/@.../video/`, `vm.tiktok.com` | |
| Twitter / X | `twitter.com/.../status/`, `x.com` | |
| Twitch | `twitch.tv/videos/`, `/clip/` | |
| Dailymotion | `dailymotion.com/video/`, `dai.ly` | |
| Vimeo | `vimeo.com/` | |
| SoundCloud | `soundcloud.com/` | Audio |
| Spotify | `open.spotify.com/track/`, `/episode/`, `/show/`, `/playlist/`, `/album/`, `spotify.link` | Audio |
| Bilibili | `bilibili.com/`, `b23.tv` | |
| Reddit | `reddit.com/` | |
| Pinterest | `pinterest.com/`, `pin.it` | |
| LinkedIn | `linkedin.com/` | |
| Rumble | `rumble.com/v*` | |
| BitChute | `bitchute.com/video/` | |

---

## Download Settings

### Quality Options

| Quality | Approximate Resolution |
|---------|------------------------|
| Best | Highest available (up to 4K) |
| 4K | 2160p |
| 1440p | QHD |
| 1080p | Full HD |
| 720p | HD |
| 480p | SD |
| 360p | Low |
| 144p | Very low |

### Format Options

**Video formats:**

| Format | Notes |
|--------|-------|
| MP4 | Best compatibility — recommended |
| WEBM | Open format, good for web |
| MKV | Flexible container |

**Audio formats:**

| Format | Notes |
|--------|-------|
| MP3 | Most compatible |
| M4A | Better quality at same bitrate |
| OGG | Open format |
| OPUS | Best quality/size ratio |
| FLAC | Lossless |

### Save To Locations

| Option | Actual Path |
|--------|------------|
| Downloads | `~/Downloads` |
| Desktop | `~/Desktop` |
| Custom | You select a folder via the folder picker |

---

## Managing Downloads

### Download List

Open via **Sidebar → All Files**. Each row shows:

- Thumbnail
- Video title and platform
- Progress bar with **%**, **speed** (e.g. `3.2 MB/s`), and **ETA**
- File size
- Status badge: `Queued` / `Waiting` / `Fetching Info…` / `Downloading` / `Completed` / `Failed`

### Download Statuses

| Status | Meaning |
|--------|---------|
| `Queued` | Waiting, no other download active |
| `Waiting` | Queued behind an active download |
| `Fetching Info…` | Resolving video metadata |
| `Downloading` | Active download in progress |
| `Completed` | File saved successfully |
| `Failed` | Error occurred |

### Actions

| Action | How |
|--------|-----|
| **Retry** | Click **Retry** on a Failed download |
| **Open File** | Click the file name or open icon when Completed |
| **Open Folder** | Click folder icon to reveal in Finder/Explorer |
| **Delete** | Remove the download from the list (and optionally delete the file) |

---

## Clipboard Detection

PNUTDownloader monitors your clipboard in the background. When you **copy a video URL**:

1. The app detects the URL
2. A **native OS notification** appears: *"Downloadable Video Detected"*
3. A **URL Detection Modal** opens in the app
4. Click **Download** to start, or **Dismiss** to ignore

No extra steps needed — just copy a URL from any website.

---

## YouTube Login (Cookies)

Some YouTube videos require you to be logged in (age-restricted, members-only, etc.). If a download fails with a login error:

1. A **Login Modal** appears automatically
2. Click **Open YouTube** — the built-in browser navigates to `youtube.com`
3. Log in with your Google account in the browser
4. Your cookies are automatically saved to `cookies.txt`
5. Try the download again — it will now use your credentials

> **Privacy Note**: Cookies are stored locally on your device only, in the yt-dlp Netscape format (`cookies.txt`). They are never uploaded anywhere.

---

## Auto-Update

### App Updates

PNUTDownloader checks for new versions on every launch via GitHub Releases. If an update is available:

1. A banner appears at the top of the app
2. The update downloads in the background (progress shown)
3. Click **Install Update** — the app restarts with the new version

### yt-dlp Updates

yt-dlp is the download engine. It is automatically updated to the latest nightly build:

- Checked on every app launch
- Updated automatically if a new version is available or if 3 days have passed
- No manual action needed

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + V` | Paste a URL — triggers download flow |
| `Enter` | In URL bar (browser mode) — navigate |
| `Escape` | Close open modal |
| `Ctrl/Cmd + Shift + I` | Open developer tools (dev mode only) |

---

## Troubleshooting

For a full list of solutions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

**Common quick fixes:**

| Problem | Solution |
|---------|---------|
| Download fails immediately | Check internet connection; try again |
| "Sign in to confirm" error | Use the Login flow (see [YouTube Login](#youtube-login-cookies)) |
| No Download button in browser | Navigate to the actual video page, not a search list |
| Duplicate download warning | Change Quality, Format, or Save Location |
| App freezes on startup | Delete app data and reinstall |

---

## About

- **Version**: 1.3.0
- **License**: MIT
- **Website**: [pnutdownloader.com](https://pnutdownloader.com)
- **Repository**: [github.com/Shoaib-Akh/pnutdownloader](https://github.com/Shoaib-Akh/pnutdownloader)
- **Support**: Open an issue on GitHub

---

*Last updated: March 2026*
