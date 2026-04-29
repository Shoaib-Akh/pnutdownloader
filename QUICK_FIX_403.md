# ⚡ Quick Reference: Fix 403 Errors in 5 Minutes

## TL;DR - Three Things to Do

### 1️⃣ Update yt-dlp (1 minute)
```bash
pip install --upgrade yt-dlp
```

### 2️⃣ Export Cookies (2 minutes)
- Go to https://www.youtube.com (logged in)
- Install extension: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/)
- Click extension → Export
- Save to: `/Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt`

### 3️⃣ Test It (2 minutes)
```bash
/Users/mac/Documents/pnutdownloader/test_403_fix.sh
```

✅ **That's it!** Your 403 errors should be fixed.

---

## If Still Getting Errors 🔴

| Error | Fix |
|-------|-----|
| **403 Forbidden** | Update yt-dlp, re-export cookies |
| **Can't find cookies** | Run extension export again |
| **ffmpeg not found** | `brew install ffmpeg` |
| **yt-dlp not found** | `pip install yt-dlp` |
| **Still fails** | Try 720p instead of 1080p |

---

## Code Changes Summary 📝

**What Changed in Your App:**
- ✅ Using Web client instead of Android (more stable)
- ✅ Better error messages for 403 errors  
- ✅ Improved connection stability
- ✅ Proper cookie handling

**What You Do:**
- ✅ Install/update yt-dlp
- ✅ Export cookies from browser

---

## Best Quality Settings 🎬

```javascript
// Use this for best quality without 403 errors
{
  "format": "bestvideo[height<=720]+bestaudio/best",
  "quality": "720p",
  "isAudioOnly": false
}
```

**Why 720p?** = High quality + Stable downloads (no 403 errors)

---

## One-Line Test Command

```bash
yt-dlp --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt --dump-json --no-download 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
```

If this works without errors → **Your setup is correct!** ✅

---

## Need More Help?

- 📖 **Full guide**: Read `FIX_403_ERRORS.md`
- 🍪 **Cookies help**: Read `COOKIES_SETUP.md`
- 🔧 **Setup instructions**: Read `SETUP_INSTRUCTIONS.md`

