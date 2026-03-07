# PNUTDownloader User Guide

A comprehensive guide for using PNUTDownloader - your favorite video downloader application.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Downloading Videos](#downloading-videos)
4. [Supported Platforms](#supported-platforms)
5. [Advanced Features](#advanced-features)
6. [Settings & Configuration](#settings--configuration)
7. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Introduction

PNUTDownloader is an Electron-based desktop application that allows you to download videos from various websites. It uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) as the core downloading engine and supports multiple video formats.

### Key Features

- 📥 Download videos from 1700+ websites
- 🎵 Extract audio from videos
- 🎬 Download playlists
- 🔄 Resume interrupted downloads
- 🍪 Cookie-based authentication
- 🖥️ Cross-platform support (Windows, macOS, Linux)

---

## Getting Started

### First Launch

1. Launch PNUTDownloader from your applications folder
2. The main window will appear with the URL input field at the top

### Basic Download Flow

1. **Paste URL** - Copy a video URL and paste it into the input field
2. **Select Format** - Choose your preferred video/audio format
3. **Start Download** - Click the download button to begin

---

## Downloading Videos

### Single Video Download

1. Navigate to a video on any supported platform
2. Copy the video URL from your browser
3. Paste the URL into PNUTDownloader's input field
4. Select your desired quality and format
5. Click **Download**

### Playlist Download

1. Copy the playlist URL
2. Paste it into the URL field
3. A modal will appear showing all videos in the playlist
4. Select which videos you want to download (or select all)
5. Click **Download Selected**

### Audio Extraction

1. Paste a video URL
2. Select **Audio Only** from the format dropdown
3. Choose your preferred audio format (MP3, M4A, etc.)
4. Click **Download**

---

## Supported Platforms

PNUTDownloader supports downloading from 1700+ websites including:

| Platform | Support |
|----------|---------|
| YouTube | ✅ Full |
| YouTube Music | ✅ Full |
| Twitter/X | ✅ Full |
| Instagram | ✅ Full |
| Facebook | ✅ Full |
| TikTok | ✅ Full |
| Vimeo | ✅ Full |
| Dailymotion | ✅ Full |
| Twitch | ✅ Full |
| And 1690+ more... | ✅ |

---

## Advanced Features

### Using Cookies for Authentication

Some videos require login to access. You can use cookies from your browser:

1. Install a browser extension like "Get cookies.txt LOCALLY"
2. Export cookies from the website you want to download from
3. In PNUTDownloader, go to Settings > Cookies
4. Import your cookie file
5. Now you can download private videos

### Clipboard Monitoring

Enable automatic URL detection:

1. Go to **Settings**
2. Enable **Watch Clipboard**
3. Copy any video URL - PNUTDownloader will automatically detect it

### Download Queue Management

- **Pause/Resume** - Click pause on any active download
- **Cancel** - Stop a download and delete partial files
- **Queue** - Add multiple downloads and they will process sequentially

---

## Settings & Configuration

### Download Location

Default: `~/Downloads/PNUTDownloader`

To change:
1. Go to **Settings** > **Download Path**
2. Click **Browse** to select a new folder
3. Click **Save**

### Video Quality

| Quality | Resolution | Use Case |
|---------|------------|----------|
| Best | 1080p+ | Full quality video |
| High | 720p | Good quality, smaller size |
| Medium | 480p | Balanced |
| Low | 360p | Slow connections |

### Auto-Update

PNUTDownloader automatically checks for updates on startup. To manually check:

1. Go to **Help** > **Check for Updates**
2. If an update is available, click **Update Now**

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + V` | Paste URL from clipboard |
| `Ctrl + Shift + V` | Paste and start download |
| `Ctrl + O` | Open download folder |
| `Delete` | Cancel selected download |
| `Escape` | Close modal/dialog |

---

## Troubleshooting

### Common Issues

**Video unavailable**
- The video may be region-locked
- Video may have been deleted
- Try using cookies from the original account

**Download fails**
- Check your internet connection
- Try a different video format
- Update PNUTDownloader to the latest version

**Slow download speeds**
- Some websites limit download speeds
- Try downloading at different times
- Use a VPN if available

For more help, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## About

- **Version**: 1.3.0
- **License**: MIT
- **Repository**: [GitHub](https://github.com/Shoaib-Akh/pnutdownloader)

---

*Last updated: March 2026*
