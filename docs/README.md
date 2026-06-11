# PNUTDownloader Documentation

Welcome to the official documentation for **PNUTDownloader** — a powerful, cross-platform desktop video downloader built with Electron and React.

---

## 📚 Documentation Index

| Document | Description | Audience |
|----------|-------------|----------|
| [USER_GUIDE.md](./USER_GUIDE.md) | Complete end-user usage guide | End Users |
| [INSTALLATION.md](./INSTALLATION.md) | System setup and installation | End Users / Developers |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design & architecture deep-dive | Developers |
| [API_REFERENCE.md](./API_REFERENCE.md) | Full IPC channels and services API | Developers |
| [GENZ_APP_REDESIGN.md](./GENZ_APP_REDESIGN.md) | Professional Gen Z UI/UX redesign spec with no functionality changes | Designers / Developers |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute to the project | Contributors |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues and solutions | All |
| [QUICKSTART.md](./QUICKSTART.md) | 5-minute getting started guide | All |

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

Or download a pre-built binary from [Releases](https://github.com/Shoaib-Akh/pnutdownloader/releases).

---

## 🛠 Tech Stack

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

YouTube · YouTube Music · YouTube Kids · Facebook · Instagram · Snapchat · TikTok · Twitter/X · Twitch · Dailymotion · Vimeo · SoundCloud · Spotify · Bilibili · Reddit · Pinterest · LinkedIn · Rumble · BitChute · and many more.

---

## 📦 Version

**Current version:** `1.3.0`  
**Repository:** [github.com/Shoaib-Akh/pnutdownloader](https://github.com/Shoaib-Akh/pnutdownloader)

---

*Last updated: March 2026*
