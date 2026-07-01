# PNUTDownloader Documentation - Google Docs Ready

📋 **यह file को copy करके Google Docs में paste करें - formatting automatically सही हो जाएगी!**

---

# PNUTDownloader Documentation

**Welcome to official documentation for PNUTDownloader — a powerful, cross-platform desktop video downloader built with Electron and React.**

---

## 📚 Documentation Index

| Document | Description | Audience |
|----------|-------------|----------|
| **USER_GUIDE.md** | Complete end-user usage guide | End Users |
| **INSTALLATION.md** | System setup and installation | End Users / Developers |
| **ARCHITECTURE.md** | System design & architecture deep-dive | Developers |
| **API_REFERENCE.md** | Full IPC channels and services API | Developers |
| **CONTRIBUTING.md** | How to contribute to project | Contributors |
| **TROUBLESHOOTING.md** | Common issues and solutions | All |
| **QUICKSTART.md** | 5-minute getting started guide | All |

---

## 🚀 Quick Start (TL;DR)

```bash
# Clone the repo
git clone https://github.com/Shoaib-Akh/pnutdownloader.git
cd pnutdownloader

# Install and run
npm install
npm run dev
```

Or download a pre-built binary from **[Releases](https://github.com/Shoaib-Akh/pnutdownloader/releases)**.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron v34 |
| UI | React 18 + React Bootstrap |
| Bundler | electron-vite + Vite 6 |
| Download Engine | yt-dlp (nightly auto-updated) |
| Media Processing | FFmpeg (bundled) |
| Analytics | None |
| Auto-update | electron-updater |
| Database | Firebase (Firestore) |

---

## 📁 Project Layout

```
pnutdownloader/
├── src/
│   ├── main/               # Electron Main Process (Node.js)
│   │   ├── index.js        # App entry: window, IPC handlers, yt-dlp & ffmpeg management
│   │   └── services/       # Modular services (Download, Ytdlp, Ffmpeg, Cookie, Update…)
│   ├── preload/
│   │   └── index.js        # Context bridge — exposes window.api to renderer
│   ├── renderer/
│   │   └── src/
│   │       ├── App.jsx         # Root component
│   │       ├── components/     # UI components (Navbar, BodySection, DownloadList…)
│   │       ├── viewmodels/     # Business logic hooks (useDownloadManager, useAppLifecycle…)
│   │       └── utils/          # Firestore, helpers
│   └── shared/             # Shared pure utilities (used in main + renderer)
│       ├── ipcChannels.js  # All IPC channel & event name constants
│       └── platformUtils.js # URL platform detection logic
├── docs/                   # All documentation (you are here)
├── public/                 # Static assets (icons, yt-dlp binaries, cookies.txt)
├── tests/                  # Jest unit tests
├── electron-builder.yml    # Build configuration
└── package.json
```

---

## 🌐 Supported Platforms

PNUTDownloader supports **1700+ websites** via yt-dlp, with native first-class support for:

**YouTube · YouTube Music · YouTube Kids · Facebook · Instagram · TikTok · Twitter/X · Twitch · Dailymotion · Vimeo · SoundCloud · Bilibili · Reddit · Pinterest · LinkedIn · Rumble · BitChute · and many more.**

---

## 📦 Version

**Current version:** `1.3.0`  
**Repository:** [github.com/Shoaib-Akh/pnutdownloader](https://github.com/Shoaib-Akh/pnutdownloader)

---

## 🎯 Key Features

- 📥 **Download videos from 1700+ websites**
- 🎵 **Extract audio from videos**
- 🎬 **Download playlists**
- 🔄 **Resume interrupted downloads**
- 🍪 **Cookie-based authentication**
- 🖥️ **Cross-platform support** (Windows, macOS, Linux)
- ⚡ **Auto-update functionality**
- 📊 **Download progress tracking**
- 🔧 **Advanced settings & configuration**

---

## 🚀 Getting Started for Users

### 1️⃣ **Installation**
- **Windows:** Download `.exe` from Releases → Run installer
- **macOS:** Download `.dmg` → Drag to Applications
- **Linux:** Download AppImage → `chmod +x` → Run

### 2️⃣ **First Download**
1. Copy video URL (YouTube, Facebook, etc.)
2. Paste in PNUTDownloader
3. Select format/quality
4. Click Download

### 3️⃣ **Advanced Features**
- **Playlist Downloads:** Paste playlist URL → Select videos
- **Audio Only:** Choose "Audio Only" format
- **Private Videos:** Use browser cookies
- **Auto-Detect:** Enable clipboard monitoring

---

## 👨‍💻 For Developers

### 🏗️ **Architecture**
- **Main Process:** Node.js, OS integration, IPC handlers
- **Renderer:** React UI, business logic hooks
- **Preload:** Secure context bridge
- **Shared:** Pure utilities, constants

### 🔧 **Development Setup**
```bash
git clone https://github.com/Shoaib-Akh/pnutdownloader.git
cd pnutdownloader
npm install
npm run dev
```

### 📚 **API Documentation**
- **IPC Channels:** Main ↔ Renderer communication
- **Services:** Download, Ytdlp, Ffmpeg, Cookie, Update
- **Events:** Progress updates, notifications

---

## ❓ Troubleshooting

### **Common Issues**
- **Download fails:** Check internet, update app, try different format
- **Video unavailable:** May be region-locked or deleted
- **Slow speeds:** Some sites limit downloads
- **App won't open:** Install dependencies, check permissions

### **Get Help**
- 📖 **Full Guide:** See USER_GUIDE.md
- 🔧 **Issues:** Check TROUBLESHOOTING.md
- 🐛 **Report:** Open GitHub Issue
- 💬 **Discuss:** GitHub Discussions

---

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** Pull Request

See **CONTRIBUTING.md** for detailed guidelines.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](https://github.com/Shoaib-Akh/pnutdownloader/blob/main/LICENSE) file for details.

---

*Last updated: March 2026*
