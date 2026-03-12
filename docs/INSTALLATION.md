# PNUTDownloader — Installation Guide

Complete setup guide for end users and developers.

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-built Binaries (Recommended)](#pre-built-binaries-recommended)
3. [Development Setup](#development-setup)
4. [Building from Source](#building-from-source)
5. [Post-Installation Setup](#post-installation-setup)
6. [Uninstalling](#uninstalling)

---

## System Requirements

### Minimum

| Component | Requirement |
|-----------|-------------|
| **OS** | Windows 10+, macOS 10.15 (Catalina)+, Ubuntu 18.04+ |
| **RAM** | 4 GB |
| **Disk** | 500 MB free (plus space for downloads) |
| **Internet** | Required |

### Recommended

| Component | Recommendation |
|-----------|----------------|
| **OS** | Windows 11 / macOS 13+ / Ubuntu 22.04+ |
| **RAM** | 8 GB |
| **Disk** | 2 GB+ |
| **Internet** | 10 Mbps+ broadband |

---

## Pre-built Binaries (Recommended)

Download the latest release for your platform from:

**[github.com/Shoaib-Akh/pnutdownloader/releases](https://github.com/Shoaib-Akh/pnutdownloader/releases)**

### Windows

1. Download `PNUTDownloader-Setup-x.x.x.exe`
2. Run the installer — follow the wizard (installs to `Program Files` by default)
3. Launch **PNUTDownloader** from the Start Menu or desktop shortcut
4. Windows SmartScreen may warn about an unsigned app — click **More Info → Run Anyway**

### macOS

1. Download `PNUTDownloader-x.x.x.dmg`
2. Open the `.dmg` file
3. Drag **PNUTDownloader** into your `/Applications` folder
4. Launch from Applications or Spotlight
5. On first run, macOS Gatekeeper may block the app:
   ```bash
   # Option 1 — right-click the app → "Open"
   # Option 2 — remove quarantine via Terminal:
   xattr -cr /Applications/PNUTDownloader.app
   ```

### Linux

Download the **AppImage** (no installation needed):

```bash
# Download
wget https://github.com/Shoaib-Akh/pnutdownloader/releases/latest/download/PNUTDownloader.AppImage

# Make executable
chmod +x PNUTDownloader.AppImage

# Run
./PNUTDownloader.AppImage
```

> **FUSE required**: AppImages need libfuse. Install it if missing:
> ```bash
> sudo apt install libfuse2   # Ubuntu/Debian
> sudo dnf install fuse       # Fedora
> ```

---

## Development Setup

### Prerequisites

Before cloning, install:

**1. Node.js v18 or higher**

```bash
# Recommended: use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify
node --version   # → v18.x.x
npm --version    # → 9.x.x or higher
```

**2. Git**

```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt install git

# Windows — download from https://git-scm.com
```

> **FFmpeg & yt-dlp** are **bundled with the app** via `extraResources` in `electron-builder.yml`. You do not need to install them globally for development.

---

### Clone the Repository

```bash
git clone https://github.com/Shoaib-Akh/pnutdownloader.git
cd pnutdownloader
```

### Install Dependencies

```bash
npm install
```

This installs all npm packages and runs `electron-builder install-app-deps` (postinstall).

### Download Required Binaries

The `public/` directory must contain the yt-dlp and FFmpeg binaries for development:

```bash
# macOS — download yt-dlp for mac
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos \
     -o public/yt-dlp_macos
chmod +x public/yt-dlp_macos

# Windows — download yt-dlp for windows
# curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -o public/yt-dlp.exe

# FFmpeg — see https://ffmpeg.org/download.html
# Place ffmpeg binary as:
#   public/ffmpeg       (macOS/Linux)
#   public/ffmpeg.exe   (Windows)
```

### Start Development Server

```bash
npm run dev
```

The Electron app launches with:
- **Hot module reloading** for React components
- **Electron DevTools** available
- Source maps enabled

---

## Building from Source

All build commands first clean the output directories (`rimraf dist out`) before building.

### Build for Windows

```bash
npm run build:win
```

Output: `dist/win-unpacked/` + installer in `dist/`
Auto-publishes to GitHub Releases (requires `GH_TOKEN`).

### Build for macOS

```bash
npm run build:mac
```

Output: `dist/mac/PNUTDownloader.app` + `.dmg`
Auto-publishes to GitHub Releases.

### Build for Linux

```bash
npm run build:linux
```

Output: `dist/linux-unpacked/` + `.AppImage`

### Build Configuration

See `electron-builder.yml` for the full build config. Key entries:

```yaml
appId: com.shoaibakh.pnutdownloader
productName: PNUTDownloader  

extraResources:
  - public/yt-dlp.exe      # Windows binary
  - public/yt-dlp_macos    # macOS binary
  - public/ffmpeg.exe      # FFmpeg (Windows)
  - public/cookies.txt     # Default cookies file
  - public/all.json        # Platform URL patterns
  - public/formats.json    # Format definitions

publish:
  provider: github
  owner: Shoaib-Akh
  repo: pnutdownloader
  releaseType: release
```

### Preview a Build (without packaging)

```bash
npm run start
```

Runs `electron-vite preview` — serves the built app without creating installer.

---

## Post-Installation Setup

### First Launch

On first launch, the app:

1. Shows a **loading spinner** while initializing dependencies
2. Checks and updates the bundled **yt-dlp** binary
3. Verifies **FFmpeg** is available
4. Opens the main window

This initial setup may take 10–30 seconds depending on your internet speed.

### Verify Your Installation

Open the **About** section in the Sidebar:

| Item | Expected |
|------|---------|
| App Version | `1.3.0` |
| yt-dlp Version | Recent nightly (e.g., `2025.xx.xx`) |
| FFmpeg Version | `ffmpeg version 8.x.x` or similar |

### Configure Download Location

1. In the **Navbar**, find the **Save To** dropdown
2. Select `Downloads`, `Desktop`, or click the folder icon to choose a custom path

---

## Uninstalling

### Windows

1. **Settings → Apps → PNUTDownloader → Uninstall**, or
2. Use **Control Panel → Programs → Uninstall a Program**

To also remove user data:
```
%APPDATA%\PNUTDownloader
```

### macOS

```bash
# Remove app
rm -rf /Applications/PNUTDownloader.app

# Remove user data
rm -rf ~/Library/Application\ Support/PNUTDownloader
rm -rf ~/Library/Logs/PNUTDownloader
rm -rf ~/Library/Preferences/com.shoaibakh.pnutdownloader.plist
```

### Linux

```bash
# AppImage — just delete the file
rm PNUTDownloader.AppImage

# Remove config
rm -rf ~/.config/PNUTDownloader
```

---

*Last updated: March 2026*
