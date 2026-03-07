# PNUTDownloader Installation Guide

Complete guide for installing and setting up PNUTDownloader.

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-built Installation](#pre-built-installation)
3. [Development Setup](#development-setup)
4. [Building from Source](#building-from-source)
5. [Post-Installation](#post-installation)

---

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Windows 10+, macOS 10.15+, Ubuntu 18.04+ |
| **RAM** | 4 GB |
| **Storage** | 500 MB (plus downloads) |
| **Internet** | Required for downloading |

### Recommended Requirements

| Component | Recommendation |
|-----------|----------------|
| **OS** | Windows 11 / macOS 12+ / Ubuntu 22.04+ |
| **RAM** | 8 GB |
| **Storage** | 1 GB+ |
| **Internet** | Broadband (10 Mbps+) |

---

## Pre-built Installation

### Windows

1. Download the latest installer from [Releases](https://github.com/Shoaib-Akh/pnutdownloader/releases)
2. Run the `.exe` installer
3. Follow the installation wizard
4. Launch PNUTDownloader from Start Menu

### macOS

1. Download the `.dmg` file from [Releases](https://github.com/Shoaib-Akh/pnutdownloader/releases)
2. Open the `.dmg` file
3. Drag **PNUTDownloader** to Applications folder
4. Launch from Applications

> **Note**: On first run, macOS may show a warning about unsigned apps. Right-click the app and select "Open" to bypass.

### Linux

#### Ubuntu/Debian

```bash
# Download the AppImage
wget https://github.com/Shoaib-Akh/pnutdownloader/releases/latest/download/pnutdownloader.AppImage

# Make it executable
chmod +x pnutdownloader.AppImage

# Run it
./pnutdownloader.AppImage
```

#### Arch Linux (AUR)

```bash
# Using yay
yay -S pnutdownloader

# Or manually
git clone https://aur.archlinux.org/pnutdownloader.git
cd pnutdownloader
makepkg -si
```

---

## Development Setup

### Prerequisites

Install these tools before proceeding:

1. **Node.js** (v18 or higher)
   ```bash
   # Using nvm (recommended)
   nvm install 18
   nvm use 18
   
   # Or download from https://nodejs.org
   ```

2. **Git**
   ```bash
   # macOS
   brew install git
   
   # Ubuntu
   sudo apt install git
   
   # Windows
   # Download from https://git-scm.com
   ```

3. **FFmpeg** (included in app, for development)
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu
   sudo apt install ffmpeg
   
   # Windows
   # Download from https://ffmpeg.org
   ```

### Clone Repository

```bash
git clone https://github.com/Shoaib-Akh/pnutdownloader.git
cd pnutdownloader
```

### Install Dependencies

```bash
npm install
```

This will:
- Install all npm packages
- Download yt-dlp binaries
- Configure FFmpeg

### Run in Development Mode

```bash
npm run dev
```

The app will launch in development mode with:
- Hot module reloading
- Debug tools enabled
- Developer console

---

## Building from Source

### Build for Windows

```bash
npm run build:win
```

Output: `dist/win-unpacked/PNUTDownloader.exe`

### Build for macOS

```bash
npm run build:mac
```

Output: `dist/mac/PNUTDownloader.app`

### Build for Linux

```bash
npm run build:linux
```

Output: `dist/linux-unpacked/pnutdownloader`

### Build Configuration

Customize build in `electron-builder.yml`:

```yaml
appId: com.shoaibakh.pnutdownloader
productName: PNUTDownloader

win:
  icon: public/icon.ico
  target: nsis

mac:
  icon: resources/icon.icns
  target: dmg

linux:
  icon: resources/icon.png
  target: AppImage
```

---

## Post-Installation

### First Run Setup

1. **Launch the app** - Wait for initial configuration
2. **Check dependencies** - App will verify yt-dlp and FFmpeg
3. **Select download folder** - Choose where to save videos
4. **Optional**: Enable clipboard monitoring in Settings

### Verify Installation

Run these commands to verify:

```bash
# Check app version
# In app: Help > About

# Check yt-dlp
# In app: Settings > About > yt-dlp Version

# Check FFmpeg
# In app: Settings > About > FFmpeg Version
```

### Optional: Install FFmpeg Manually

The app includes FFmpeg, but you can use your own:

**Windows:**
1. Download FFmpeg from https://ffmpeg.org
2. Add to PATH, or
3. Place `ffmpeg.exe` in app resources folder

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

---

## Troubleshooting Installation

### Common Issues

#### "App cannot be opened" (macOS)

```bash
# Remove quarantine attribute
xattr -cr /Applications/PNUTDownloader.app
```

#### "yt-dlp not found"

- Reinstall the app
- Or manually download yt-dlp to app resources

#### "FFmpeg not found"

- Install FFmpeg system-wide (see above)
- Or app will use bundled FFmpeg

#### "Node.js version mismatch"

```bash
# Check your Node version
node --version

# Use nvm to switch versions
nvm install 18
nvm use 18
```

---

## Uninstalling

### Windows

- Go to **Settings** > **Apps** > **PNUTDownloader** > **Uninstall**
- Or use Control Panel

### macOS

```bash
# Remove from Applications
rm -rf /Applications/PNUTDownloader.app

# Remove supporting files (optional)
rm -rf ~/Library/Application\ Support/PNUTDownloader
```

### Linux

```bash
# Remove AppImage
rm pnutdownloader.AppImage

# Remove config (if installed via AUR)
yay -R pnutdownloader
```

---

*Last updated: March 2026*
