# Summary: Fixing HTTP 403 Forbidden Errors

## What Was Wrong ❌

Your app was getting **HTTP 403 Forbidden** errors from YouTube because:

1. **Using old Android client** - Requires PO Token (hard to get)
2. **Missing valid cookies** - YouTube checks for browser authentication
3. **Outdated yt-dlp** - New YouTube protections need latest version
4. **Forcing specific format IDs** - Some formats aren't available to downloader bots
5. **No connection stability settings** - Network timeouts and interruptions

---

## What Was Fixed ✅

### Code Changes Made:

1. **Changed from Android to Web client** (`YtdlpService.js`)
   - Web client is more stable and doesn't require PO Token
   - Added proper headers for browser identification

2. **Added 403 error detection** 
   - Now warns users about cookies/yt-dlp version when 403 occurs
   - Provides actionable suggestions

3. **Improved connection stability**
   - Increased socket timeout to 30 seconds
   - Set HTTP chunk size to 10MB for better stability

4. **Better cookie handling**
   - Always uses cookies if available
   - Creates fallback if missing

---

## What You Need to Do 🔧

### Step 1: Update yt-dlp (CRITICAL)

Run this command in terminal:

```bash
pip install --upgrade yt-dlp
```

Verify it's updated:
```bash
yt-dlp --version
```

### Step 2: Export YouTube Cookies

**Option A: Browser Extension (Easiest)** ⭐

1. Install **"Get cookies.txt LOCALLY"** extension:
   - Chrome: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/
   - Firefox: https://addons.mozilla.org/firefox/addon/cookies-txt/

2. Visit https://www.youtube.com (logged in)

3. Click extension → Export

4. Save as: `/Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt`

**Option B: DevTools (Manual)**

1. Open https://www.youtube.com (logged in)
2. Press F12 → Application → Cookies → youtube.com
3. Copy all cookies in Netscape format

### Step 3: Test Your Setup

Run the diagnostic script:

```bash
/Users/mac/Documents/pnutdownloader/test_403_fix.sh
```

This will verify:
- ✅ yt-dlp is installed
- ✅ Cookies file exists
- ✅ FFmpeg is available
- ✅ Can fetch video info (no 403 error!)

---

## Download Quality Settings 🎬

### For Best Video Quality (720p)
```json
{
  "format": "bestvideo[height<=720]+bestaudio/best",
  "quality": "720p",
  "isAudioOnly": false
}
```

### For Best Audio Only (320kbps)
```json
{
  "format": "bestaudio",
  "quality": "320k",
  "isAudioOnly": true,
  "bitrate": "320k"
}
```

**Why 720p instead of 1080p?**
- Higher quality formats have stricter YouTube protections
- 720p is stable and rarely gets 403 errors
- Still excellent video quality for most uses

---

## Files Created/Modified 📄

| File | Purpose |
|------|---------|
| `YtdlpService.js` | Updated download logic (web client, error detection) |
| `FIX_403_ERRORS.md` | Comprehensive troubleshooting guide |
| `COOKIES_SETUP.md` | Step-by-step cookie extraction guide |
| `test_403_fix.sh` | Diagnostic script to verify setup |

---

## If You Still Get 403 Errors 🆘

1. **Update yt-dlp**
   ```bash
   pip install --upgrade yt-dlp
   ```

2. **Re-export cookies** (they may have expired)
   - Log out/in on YouTube first
   - Re-extract cookies

3. **Try lower quality**
   - 720p instead of 1080p
   - 480p as fallback

4. **Wait and retry**
   - YouTube rate limits IPs
   - Wait 10-15 minutes, try again

5. **Check logs**
   - Look for specific error messages
   - File issue on yt-dlp GitHub

---

## Pro Tips 💡

1. **Refresh cookies weekly** - YouTube expires them after 1-2 weeks
2. **Download during off-peak hours** - Fewer rate limits at night
3. **Use quality selector instead of format ID** - More flexible
4. **Merge video+audio instead of forcing one format** - More stable
5. **Monitor yt-dlp GitHub** - YouTube changes frequently, updates are essential

---

## Next Steps 🚀

1. ✅ Update yt-dlp
2. ✅ Extract cookies
3. ✅ Run test script
4. ✅ Use web app to download videos
5. ✅ If issues persist, check `FIX_403_ERRORS.md` for advanced solutions

---

## Questions?

- See `FIX_403_ERRORS.md` for detailed explanations
- See `COOKIES_SETUP.md` for cookie extraction help
- Run `test_403_fix.sh` to diagnose issues

