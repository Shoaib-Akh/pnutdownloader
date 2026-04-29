# Fixing HTTP 403 Forbidden Errors with yt-dlp

## Problem
YouTube returns **HTTP 403 Forbidden** errors when downloading videos using yt-dlp. This happens because:

1. **User-Agent Detection** - YouTube identifies bot-like access patterns
2. **PO Token Requirement** - YouTube now requires a "PO Token" for certain video clients
3. **IP Rate Limiting** - Repeated requests from same IP trigger blocking
4. **Missing Cookies** - Authentication cookies from browser are required
5. **Outdated yt-dlp** - Old versions can't handle YouTube's new protection

---

## ✅ Solutions (In Order of Effectiveness)

### Solution 1: Update yt-dlp (CRITICAL)
YouTube protections change frequently. You MUST keep yt-dlp updated:

```bash
# Update yt-dlp to latest version
pip install --upgrade yt-dlp

# Verify version
yt-dlp --version
```

**Why:** Latest yt-dlp includes patches for YouTube's anti-scraping measures.

---

### Solution 2: Use Web Client Instead of Android Client
The **web client** is more stable than Android client for downloads.

**Updated configuration in YtdlpService.js:**
```javascript
args.push(
    '--extractor-args', 'youtube:player_client=web',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    '--referer', 'https://www.youtube.com/',
    '--add-header', 'Accept-Language:en-US,en;q=0.9',
    '--add-header', 'Sec-Fetch-Dest:iframe',
    '--add-header', 'Sec-Fetch-Mode:navigate',
    '--add-header', 'Sec-Fetch-Site:same-origin'
);
```

---

### Solution 3: Extract & Use Real Browser Cookies
This is the **MOST IMPORTANT** step. YouTube uses cookies to verify real browser access.

#### Option A: Using Browser Extension (Recommended)
1. Install **"Get cookies.txt LOCALLY"** extension for Chrome/Firefox:
   - Chrome: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/

2. Visit **https://www.youtube.com/**
3. Click extension icon → **"Export"**
4. Save as `cookies.txt` in `/Users/mac/Documents/pnutdownloader/web/cookies/`

#### Option B: Manual Export from Browser DevTools
1. Open **https://www.youtube.com/** in Chrome/Firefox
2. Press **F12** to open DevTools
3. Go to **Application** → **Cookies** → **https://www.youtube.com**
4. Copy all cookies manually into Netscape format

---

### Solution 4: Add Retry Logic with Exponential Backoff
Temporary 403 errors can be fixed with retries:

```javascript
// Add this to YtdlpService.js download() method
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async downloadWithRetry(options, attempt = 1) {
    try {
        return await this.download(options);
    } catch (error) {
        if (error.includes('403') && attempt < MAX_RETRIES) {
            console.log(`⏳ Retrying in 2 seconds (attempt ${attempt}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return this.downloadWithRetry(options, attempt + 1);
        }
        throw error;
    }
}
```

---

### Solution 5: Download Lower Quality First
High-quality formats (1080p) are more likely to trigger 403 errors.

**Try this download order:**
1. **720p** first (most stable)
2. **480p** as fallback
3. **Best audio + video merge** (not specific resolution)

```javascript
// Recommended quality selector
const qualityOrder = ['720p', '480p', '360p'];
```

---

### Solution 6: Use Best Format Selector (Don't Specify Format ID)
Instead of forcing specific format IDs, let yt-dlp choose:

```javascript
// ❌ BAD - Often fails with 403
format: '335' // Specific format ID

// ✅ GOOD - More flexible and stable
format: 'bestvideo[height<=720]+bestaudio/best'
```

---

### Solution 7: Add Connection Stabilization Headers
Updated YtdlpService.js now includes:
```javascript
'--socket-timeout', '30',           // Longer timeout
'--http-chunk-size', '10485760'     // 10MB chunks
```

---

## 🔧 Recommended Download Settings for Best Quality

### For Video + Audio (Recommended)
```json
{
  "format": "bestvideo[height<=720]+bestaudio/best",
  "quality": "720p",
  "isAudioOnly": false,
  "merge": true
}
```

### For Audio Only
```json
{
  "format": "bestaudio",
  "quality": "320k",
  "isAudioOnly": true,
  "bitrate": "320k"
}
```

---

## 📋 Troubleshooting Checklist

- [ ] **yt-dlp is updated** (`pip install --upgrade yt-dlp`)
- [ ] **Cookies.txt exists** in `/web/cookies/cookies.txt`
- [ ] **Cookies are fresh** (extracted from logged-in browser)
- [ ] **Web client is used** (not Android client)
- [ ] **No specific format ID** is forced
- [ ] **720p or lower** is set as max quality
- [ ] **Proper headers** are sent (User-Agent, Referer)

---

## 🚀 Complete Working Example

```bash
# Command that should work for most videos
yt-dlp \
  --cookies '/Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt' \
  --extractor-args 'youtube:player_client=web' \
  --user-agent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' \
  --referer 'https://www.youtube.com/' \
  -f 'bestvideo[height<=720]+bestaudio/best' \
  -o '%(title)s.%(ext)s' \
  'https://www.youtube.com/watch?v=VIDEO_ID'
```

---

## ❓ When All Else Fails

If you still get 403 errors:

1. **Try a different video** - Some videos have stricter protections
2. **Wait a few hours** - YouTube rate limits; try again later
3. **Use VPN** - If your IP is blocked (change location)
4. **Check if video is geobl blocked** - Some videos restrict by region
5. **Report to yt-dlp** - File issue on GitHub with error details

---

## 📚 References
- yt-dlp GitHub: https://github.com/yt-dlp/yt-dlp
- yt-dlp Issue #12482 (SABR/403 errors): https://github.com/yt-dlp/yt-dlp/issues/12482
- YouTube Cookie Guide: https://github.com/yt-dlp/yt-dlp/wiki/Installation-Guide

