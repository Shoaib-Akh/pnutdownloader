# PNUTDownloader — Complete Documentation

**📋 Is file ko copy karke Google Docs mein paste karein — formatting automatically sahi ho jayegi!**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start Guide](#quick-start-guide)
3. [Installation](#installation)
4. [User Guide](#user-guide)
5. [Supported Platforms](#supported-platforms)
6. [Troubleshooting](#troubleshooting)
7. [Contributing](#contributing)
8. [Technical Details](#technical-details)

---

## Introduction

**PNUTDownloader** ek free, open-source, cross-platform desktop video downloader hai jo Electron aur React ke saath build kiya gaya hai. Ye [yt-dlp](https://github.com/yt-dlp/yt-dlp) ka use karta hai, jo **1700+ websites** ko support karta hai — including YouTube, Instagram, TikTok, Facebook, Twitter/X, aur bahut saare aur platforms.

### Key Features

- 📥 **Download videos** — MP4, MKV, WEBM and more
- 🎵 **Download audio** — MP3, M4A, OGG and more
- 📋 **Playlist support** — Select individual or all videos
- 🌐 **Built-in browser** — Browse + one-click download
- 📎 **Clipboard detection** — Auto-detects copied video URLs
- 🔁 **Queue system** — Multiple downloads, processed sequentially
- 🔄 **Auto-update** — App and yt-dlp both stay up to date
- 🍪 **Cookie auth** — Download age-restricted or private content
- 🖥️ **Cross-platform** — Windows, macOS, Linux

### Version Information

- **Current Version:** 1.3.0
- **Repository:** github.com/Shoaib-Akh/pnutdownloader
- **Website:** pnutdownloader.com

---

## Quick Start Guide

### Install the App

**Windows:**
- Download the latest `.exe` from Releases
- Run the installer — follow the wizard
- Launch from Start Menu or desktop shortcut

**macOS:**
- Download the `.dmg`
- Drag **PNUTDownloader** to Applications
- First run may require right-click → Open (Gatekeeper bypass)

**Linux (AppImage):**
```bash
wget https://github.com/Shoaib-Akh/pnutdownloader/releases/latest/download/pnutdownloader.AppImage
chmod +x pnutdownloader.AppImage
./pnutdownloader.AppImage
```

### Download Your First Video

1. Copy a video URL (YouTube, Facebook, etc.)
2. Paste into the URL bar (Ctrl/Cmd + V)
3. Select **Format/Quality** from the Navbar
4. Click **Download**
5. Progress appears in the list — click folder icon when done

### Download a Playlist

1. Copy the playlist link
2. Paste in the URL bar
3. Select videos in the Playlist Modal (or Select All)
4. Click **Download Selected**

### Grab Audio Only

1. Paste a video URL
2. Choose **Audio Only** (MP3/M4A)
3. Click **Download**

### Change Download Folder

1. Settings → Download Path
2. Click Browse → pick a folder → Save

### Use Cookies for Private Videos

1. Export cookies from browser (extension: "Get cookies.txt LOCALLY")
2. Settings → Cookies → Import → choose the file
3. Retry the download

### Auto-Detect URLs from Clipboard

1. Settings → enable Watch Clipboard
2. Copy any supported video URL
3. App auto-populates URL bar and can start downloading

### Manage the Queue

- **Pause/Resume:** Click pause/play icon
- **Cancel:** Click trash/delete icon
- **Open Folder:** Click folder icon

### Keep Updated

- Help → Check for Updates

---

## Installation

### System Requirements

**Minimum:**
- OS: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- RAM: 4 GB
- Disk: 500 MB free (plus downloads)
- Internet: Required

**Recommended:**
- OS: Windows 11 / macOS 13+ / Ubuntu 22.04+
- RAM: 8 GB
- Disk: 2 GB+
- Internet: 10 Mbps+ broadband

### Pre-built Binaries

Download from: **github.com/Shoaib-Akh/pnutdownloader/releases**

### Development Setup

**Prerequisites:**
1. Node.js v18 or higher
2. Git
3. FFmpeg & yt-dlp (bundled with app)

```bash
# Clone
git clone https://github.com/Shoaib-Akh/pnutdownloader.git
cd pnutdownloader

# Install
npm install

# Run
npm run dev
```

### Building from Source

```bash
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

---

## User Guide

### Interface Overview

**Navbar Controls:**
| Control | Options | Description |
|---------|---------|-------------|
| Type | Video / Audio | Download type |
| Quality | 144p → 4K / Best | Video resolution |
| Format | MP4, WEBM, MKV (video) / MP3, M4A (audio) | Output format |
| Bitrate | 64k → 320k | Audio bitrate (audio-only) |
| Save To | Downloads / Desktop / Custom | Download destination |

**Sidebar Items:**
- Home — Platform shortcuts
- All Files — Download list
- Settings — App settings
- About — Version and info

### Downloading Videos

**Method 1 — Paste URL:**
1. Copy video URL from browser
2. Open app — popup modal appears if URL detected
3. Click Download or paste manually
4. Select Quality and Format
5. Download starts immediately

**Method 2 — Built-in Browser:**
1. Click Platform Icon (e.g., YouTube)
2. Browse to video
3. Click Download button (appears at bottom-right)
4. Video added to queue

### Playlist Downloads

1. Copy YouTube playlist URL
2. Paste into app
3. Playlist Selection Modal opens
4. Select videos (or Select All)
5. Click Download Selected
6. Downloads processed sequentially

### Audio Extraction

1. Set Type → Audio
2. Choose Format: MP3, M4A, OGG, OPUS, or FLAC
3. Set Bitrate: 64k, 128k, 192k, 256k, or 320k
4. Paste URL or use browser
5. Click Download

### Built-in Browser Features

- Navigation: Back / Forward / Reload
- URL bar: Type or paste any URL
- Copy URL: Click copy icon
- Zoom: +/- buttons (10% increments, 10%–500%)
- Download button: Auto-appears on video pages
- Cookie persistence: Sessions saved automatically

### Quality Options

| Quality | Approximate |
|---------|-------------|
| Best | Highest (up to 4K) |
| 4K | 2160p |
| 1440p | QHD |
| 1080p | Full HD |
| 720p | HD |
| 480p | SD |
| 360p | Low |
| 144p | Very low |

### Format Options

**Video:**
- MP4 (recommended — best compatibility)
- WEBM (open format)
- MKV (flexible container)

**Audio:**
- MP3 (most compatible)
- M4A (better quality)
- OGG (open format)
- OPUS (best quality/size)
- FLAC (lossless)

### Download Statuses

| Status | Meaning |
|--------|---------|
| Queued | Waiting, no active download |
| Waiting | Queued behind active download |
| Fetching Info… | Resolving metadata |
| Downloading | Active download |
| Completed | File saved successfully |
| Failed | Error occurred |

### Clipboard Detection

1. Copy a video URL
2. Native OS notification appears
3. URL Detection Modal opens
4. Click Download to start

### YouTube Login (Cookies)

1. Login error appears automatically
2. Click Open YouTube
3. Log in with Google in built-in browser
4. Cookies auto-saved to cookies.txt
5. Retry download

### Auto-Update

**App Updates:**
- Banner appears when update available
- Downloads in background
- Click Install Update → restarts with new version

**yt-dlp Updates:**
- Checked on every launch
- Auto-updated if 3 days passed
- No manual action needed

---

## Supported Platforms

PNUTDownloader supports **1700+ websites** via yt-dlp. Built-in shortcuts for:

- YouTube
- YouTube Music
- YouTube Kids
- Facebook
- Instagram
- TikTok
- Twitter / X
- Twitch
- Dailymotion
- Vimeo
- SoundCloud
- Bilibili
- Reddit
- Pinterest
- LinkedIn
- Rumble
- BitChute

---

## Troubleshooting

### Common Download Errors

**"Download Failed" — generic:**
- Check internet connection → Retry
- Update yt-dlp → About → Update yt-dlp
- Confirm video is public
- Change Quality or Format
- Use VPN for region restrictions

**"Duplicate download" warning:**
- Change any setting (Quality, Format, Save To, or Type)

**Stuck at 0% / "Fetching Info…":**
- Wait 30 seconds (resolving stream)
- Restart app (yt-dlp auto-update)
- Verify URL works in browser

**Instagram/TikTok/Facebook fails:**
- Use built-in browser → Log in → Navigate to video
- Click Download button

### YouTube Issues

**"Sign in to confirm your age":**
1. Login Modal appears automatically
2. Click Open YouTube → Log in
3. Cookies auto-saved
4. Retry download

**Playlist downloads only one video:**
- Use actual playlist URL: youtube.com/playlist?list=PLxxxxx
- Not watch URL with &list=

**"HTTP Error 429" (Too Many Requests):**
- Wait 5-15 minutes
- Don't queue many videos at once
- Try VPN

### Installation & Startup

**"Initializing Dependencies…" forever:**
- Check internet
- Force-quit and relaunch
- Manually place binaries if persists

**"yt-dlp not found":**
- Restart app (auto-download)
- Or manually download from GitHub

**FFmpeg not found:**
- Restart app (auto-download)
- Or install system-wide: brew install ffmpeg (macOS), sudo apt install ffmpeg (Linux)

### macOS Specific

**"App from unidentified developer":**
```bash
xattr -cr /Applications/PNUTDownloader.app
```

**App opens but nothing happens:**
```bash
chmod +x /Applications/PNUTDownloader.app/Contents/MacOS/PNUTDownloader
```

### Windows Specific

**SmartScreen blocked:**
- Click More Info → Run Anyway

### Linux Specific

**AppImage doesn't open:**
```bash
sudo apt install libfuse2   # Ubuntu/Debian
sudo dnf install fuse       # Fedora
```

### Browser Issues

**Blank white page:**
- Click Reload
- Close and reopen browser
- Restart app

**No Download button:**
- Navigate directly to video (not search results)
- Or paste URL directly

### Performance Issues

**Slow downloads:**
- Website rate-limits
- ISP throttling
- VPN routing
- Try different time of day

**High CPU usage:**
- Download lower quality (720p vs 4K)
- Don't download multiple files at once

### Getting More Help

1. Search Issues: github.com/Shoaib-Akh/pnutdownloader/issues
2. Open Bug Report
3. GitHub Discussions

**When reporting, include:**
- OS and version
- App version
- yt-dlp version
- Exact URL
- Error messages

---

## Contributing

We welcome contributions!

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** Pull Request

See CONTRIBUTING.md for detailed guidelines.

---

## Technical Details

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron v34 |
| UI | React 18 + React Bootstrap |
| Bundler | electron-vite + Vite 6 |
| Download Engine | yt-dlp (nightly auto-updated) |
| Media Processing | FFmpeg (bundled) |
| Analytics | Aptabase |
| Auto-update | electron-updater |
| Database | Firebase (Firestore) |

### Project Layout

```
pnutdownloader/
├── src/
│   ├── main/               # Electron Main Process (Node.js)
│   │   ├── index.js        # App entry: window, IPC handlers
│   │   └── services/      # Download, Ytdlp, Ffmpeg, Cookie, Update
│   ├── preload/
│   │   └── index.js       # Context bridge
│   ├── renderer/
│   │   └── src/
│   │       ├── App.jsx
│   │       ├── components/
│   │       ├── viewmodels/
│   │       └── utils/
│   └── shared/
│       ├── ipcChannels.js
│       └── platformUtils.js
├── docs/                   # All documentation
├── public/                 # Static assets, binaries
├── tests/                  # Jest unit tests
└── package.json
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + V | Paste URL — triggers download |
| Enter | Navigate (browser mode) |
| Escape | Close modal |
| Ctrl/Cmd + Shift + I | DevTools (dev mode) |

---

## License

This project is licensed under the **MIT License**.

---

*Last updated: March 2026*
