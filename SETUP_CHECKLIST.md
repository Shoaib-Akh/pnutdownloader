# 📋 Setup Checklist - 403 Error Fix

Use this checklist to ensure everything is set up correctly.

---

## ✅ Pre-Setup Verification

- [ ] **yt-dlp is installed**
  ```bash
  which yt-dlp
  ```

- [ ] **ffmpeg is installed**
  ```bash
  which ffmpeg
  ```

- [ ] **You have a YouTube account** (for cookies)

- [ ] **You're on the `getformatweb` branch**
  ```bash
  git branch
  ```

---

## ✅ Step 1: Update yt-dlp

- [ ] **Install/update yt-dlp**
  ```bash
  pip install --upgrade yt-dlp
  ```

- [ ] **Verify version**
  ```bash
  yt-dlp --version
  # Should show current version (e.g., 2024.01.16)
  ```

- [ ] **Confirm yt-dlp is working**
  ```bash
  yt-dlp --help | head -10
  # Should show help text without errors
  ```

---

## ✅ Step 2: Export Cookies

### Option A: Using Browser Extension (RECOMMENDED)

- [ ] **Open YouTube while logged in**
  - Go to https://www.youtube.com
  - Verify you're logged in (see your profile icon)

- [ ] **Install cookie extension**
  - Chrome: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/
  - Firefox: https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/

- [ ] **Export cookies**
  - Click extension icon in toolbar
  - Click "Export" or "Export as ⬇️"

- [ ] **Save cookies file**
  - Save to: `/Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt`
  - File should be > 1KB (usually 2-5KB)

- [ ] **Verify cookies saved**
  ```bash
  ls -lh /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt
  # Should show file with size like "2.3K" or "4.1K"
  ```

### Option B: Manual Export via DevTools

- [ ] **Open Browser DevTools**
  - Press F12

- [ ] **Navigate to Cookies**
  - Chrome: Application → Cookies → https://www.youtube.com
  - Firefox: Storage → Cookies → https://www.youtube.com

- [ ] **Copy all cookie data**
  - Format as Netscape HTTP Cookie File

- [ ] **Create/update cookies.txt**
  - Save with proper Netscape format headers
  - Include at least one YouTube-related cookie

---

## ✅ Step 3: Verify Cookies Format

- [ ] **Check if file has proper format**
  ```bash
  head -3 /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt
  # Should start with: # Netscape HTTP Cookie File
  ```

- [ ] **Check for YouTube cookies**
  ```bash
  grep -i "youtube\|google" /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt | wc -l
  # Should show: 1 or higher
  ```

- [ ] **Verify file is not empty**
  ```bash
  wc -l /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt
  # Should show: 10+ lines
  ```

---

## ✅ Step 4: Verify Code Changes

- [ ] **Check YtdlpService.js was updated**
  ```bash
  grep "youtube:player_client=web" /Users/mac/Documents/pnutdownloader/web/server/services/YtdlpService.js
  # Should find the line (showing web client is being used)
  ```

- [ ] **Verify socket timeout added**
  ```bash
  grep "socket-timeout" /Users/mac/Documents/pnutdownloader/web/server/services/YtdlpService.js
  # Should find: '--socket-timeout', '30'
  ```

- [ ] **Check 403 error detection**
  ```bash
  grep "403" /Users/mac/Documents/pnutdownloader/web/server/services/YtdlpService.js
  # Should find error detection code
  ```

---

## ✅ Step 5: Run Diagnostic Script

- [ ] **Execute test script**
  ```bash
  /Users/mac/Documents/pnutdownloader/test_403_fix.sh
  ```

- [ ] **Check test output**
  - Should show all ✅ checks passing
  - Should show: "All checks passed! Your setup is working correctly."

- [ ] **If test fails**
  - Note which check failed
  - See troubleshooting section below

---

## ✅ Step 6: Test Individual Video

- [ ] **Pick a test video**
  - URL format: https://www.youtube.com/watch?v=VIDEO_ID
  - Try with a recent, popular video

- [ ] **Run video test script**
  ```bash
  /Users/mac/Documents/pnutdownloader/test_video_download.sh 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' '720p'
  ```

- [ ] **Verify test succeeded**
  - Should show: ✅ Video Information
  - Should show: ✅ Download test SUCCESSFUL
  - Should show: 🎬 Recommended action: Proceed with download

---

## ✅ Step 7: Test Web App Download

- [ ] **Start web server**
  ```bash
  cd /Users/mac/Documents/pnutdownloader/web
  npm start
  # Or: node server/index.js
  ```

- [ ] **Open web interface**
  - Go to http://localhost:PORT (usually 3000 or 5000)

- [ ] **Test video download**
  - Paste YouTube URL
  - Select 720p quality
  - Click Download
  - Watch for successful completion

- [ ] **Verify file was saved**
  - Check: `/Users/mac/Documents/pnutdownloader/web/server/downloads/Downloads/`
  - File should exist with video title

---

## 🆘 Troubleshooting Checklist

If tests are failing, check these:

### Test Script Fails at "yt-dlp check"
- [ ] Run: `pip install --upgrade yt-dlp`
- [ ] Verify: `yt-dlp --version`
- [ ] Try: `which yt-dlp`

### Test Script Fails at "Cookies check"
- [ ] Check file exists: `test -f /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt && echo "Found"`
- [ ] Check file size: `ls -lh /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt`
- [ ] Re-export cookies using browser extension

### Test Script Fails at "Video info fetch"
- [ ] Cookies may have expired → Re-export
- [ ] yt-dlp may be outdated → Update it
- [ ] YouTube may be rate-limiting → Wait 10 minutes, try again

### Video Download Gets 403 Error
- [ ] Update yt-dlp: `pip install --upgrade yt-dlp`
- [ ] Re-export cookies
- [ ] Try lower quality (720p → 480p)
- [ ] Check logs for more details

### File Not Saving to Disk
- [ ] Check directory exists: `test -d /Users/mac/Documents/pnutdownloader/web/server/downloads/Downloads/ && echo "Found"`
- [ ] Check permissions: `ls -ld /Users/mac/Documents/pnutdownloader/web/server/downloads/Downloads/`
- [ ] Should be writable (at least 755 or 775)

---

## ✅ Final Verification

Once all checks pass:

- [ ] **yt-dlp is current version**
- [ ] **Cookies file exists and is valid**
- [ ] **Code has web client enabled**
- [ ] **test_403_fix.sh passes all checks**
- [ ] **test_video_download.sh succeeds for test video**
- [ ] **Web app downloads work without 403 errors**

✅ **You're all set!**

---

## 📝 Notes

- **Date completed**: _________________
- **yt-dlp version**: _________________
- **Cookies last updated**: _________________
- **Test video URL**: _________________
- **Any issues encountered**: _________________

---

## 🔄 Maintenance Checklist

Every 2 weeks:

- [ ] **Update yt-dlp**
  ```bash
  pip install --upgrade yt-dlp
  ```

- [ ] **Re-export cookies**
  - If downloads start failing

- [ ] **Run diagnostic**
  ```bash
  /Users/mac/Documents/pnutdownloader/test_403_fix.sh
  ```

Every month:

- [ ] **Check yt-dlp GitHub for updates**
  - https://github.com/yt-dlp/yt-dlp/releases

- [ ] **Check for YouTube API changes**
  - https://github.com/yt-dlp/yt-dlp/issues

---

## 🎉 Success Indicators

Your setup is working if you see:

```
✅ yt-dlp is installed: 2024.01.16
✅ Cookies file found (2.3K)
✅ FFmpeg found
✅ Video info fetch SUCCESSFUL
✅ Download test SUCCESSFUL
✅ Web app downloads complete without errors
```

Good luck! 🚀

