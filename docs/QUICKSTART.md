# PNUTDownloader Quickstart (Step by Step)

Short, copy-paste friendly steps to get the desktop app installed, configured, and downloading videos fast. For deeper detail, see `docs/USER_GUIDE.md`.

---

## 1) Install the App
- **Windows:** Download the latest `.exe` from Releases → run the installer → finish the wizard.
- **macOS:** Download the `.dmg` → open it → drag **PNUTDownloader** to Applications → first run may require right-click → Open to bypass Gatekeeper.
- **Linux (AppImage):**
  ```bash
  wget https://github.com/Shoaib-Akh/pnutdownloader/releases/latest/download/pnutdownloader.AppImage
  chmod +x pnutdownloader.AppImage
  ./pnutdownloader.AppImage
  ```

## 2) First Launch
- Open the app. The URL bar sits at the top; downloads list fills the main panel.
- Default download folder: `~/Downloads/PNUTDownloader`.

## 3) Download a Single Video
1. Copy a video URL (e.g., YouTube).
2. Paste into the URL bar (`Ctrl/Cmd + V`).
3. Pick the **Format/Quality** you want.
4. Click **Download**. Progress appears in the list; open the file with the folder icon when done.

## 4) Download a Playlist
1. Copy the playlist link.
2. Paste it in the URL bar.
3. When the playlist modal appears, select the videos you want (or **Select All**).
4. Click **Download Selected**.

## 5) Grab Audio Only
1. Paste a video URL.
2. Choose **Audio Only** (MP3/M4A, etc.).
3. Click **Download**.

## 6) Change the Download Folder
1. Open **Settings** → **Download Path**.
2. Click **Browse**, pick a folder, then **Save**.

## 7) Speed/Quality Tips
- **Best/High/Medium/Low** presets balance size vs. quality.
- Slow speeds? Try Medium quality or download during off-peak hours.

## 8) Use Cookies for Private/Logged-In Videos
1. Export cookies from your browser (extension like “Get cookies.txt LOCALLY”).
2. In the app: **Settings** → **Cookies** → **Import** → choose the exported file.
3. Retry the download.

## 9) Auto-Detect URLs from Clipboard
1. **Settings** → enable **Watch Clipboard**.
2. Copy any supported video URL; the app auto-populates the URL bar and can start downloading.

## 10) Manage the Queue
- **Pause/Resume:** Click the pause/play icon on an active item.
- **Cancel:** Trash/delete icon removes the current download.
- **Open Folder:** Folder icon reveals the completed file.

## 11) Keep the App Updated
- **Help** → **Check for Updates**. Accept the prompt if a new build is found.

## 12) Quick Troubleshooting
- “Video unavailable” → may be region-locked or deleted; try with cookies.
- “Download fails” → check connection, pick another format, or update the app.
- More help: `docs/TROUBLESHOOTING.md`.

## 13) Run from Source (Developers)
1. Prereqs: Node.js 18+, Git, FFmpeg available on PATH.
2. Clone: `git clone https://github.com/Shoaib-Akh/pnutdownloader.git && cd pnutdownloader`
3. Install deps: `npm install`
4. Start dev app with live reload: `npm run dev`
5. Build installers (platform-specific): `npm run build:win | build:mac | build:linux`

---

Last updated: 2026-03-09
