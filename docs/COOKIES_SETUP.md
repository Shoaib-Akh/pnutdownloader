# How to Extract YouTube Cookies for yt-dlp

## Why Cookies Are Required

YouTube now requires valid authentication cookies to download videos. Without them, you'll get **HTTP 403 Forbidden** errors.

---

## ✅ Method 1: Using Browser Extension (EASIEST & FASTEST)

### For Chrome:
1. Install **"Get cookies.txt LOCALLY"** extension:
   - Go to https://chrome.google.com/webstore/detail/get-cookiestxt-locally/
   - Click "Add to Chrome"

2. Open **https://www.youtube.com** (while logged in)

3. Click the extension icon in your toolbar

4. Click **"Export as ⬇️"** or **"Export"**

5. Save the file as `cookies.txt` to:
   ```
   /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt
   ```

6. **Done!** Your cookies are now configured

### For Firefox:
1. Install **"Cookies.txt"** extension:
   - Go to https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/
   - Click "Add to Firefox"

2. Open **https://www.youtube.com** (while logged in)

3. Click the extension icon

4. Click **"Export Cookies"**

5. Save to the same location as above

---

## ✅ Method 2: Using Browser DevTools (Manual)

If you prefer not to install extensions:

### Chrome:
1. Open **https://www.youtube.com** (logged in)
2. Press **F12** to open DevTools
3. Go to **Application** tab → **Cookies** → **https://www.youtube.com**
4. You'll see a table of all cookies
5. Right-click on the table → **Export as HAR** (or manually copy them)

### Firefox:
1. Open **https://www.youtube.com** (logged in)
2. Press **Shift + F9** for Storage Inspector
3. Go to **Storage** → **Cookies** → **https://www.youtube.com**
4. Manually copy all cookies

---

## ✅ Method 3: Command-Line with curl (Advanced)

If you have curl installed:

```bash
# 1. First, visit YouTube to set cookies
curl -c /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  -b /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  'https://www.youtube.com'

# 2. Convert to Netscape format (required by yt-dlp)
curl -c /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ' > /dev/null 2>&1
```

---

## 📝 Verify Cookies Are Valid

After exporting cookies, verify they're correct:

```bash
# Check if cookies file exists
test -f /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt && echo "✅ Cookies file found" || echo "❌ Cookies file missing"

# Check file size (should be > 1KB)
ls -lh /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt

# Check for YouTube cookies
grep -i "youtube\|google" /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt | wc -l
```

---

## 🔄 Refresh Cookies Regularly

YouTube cookies expire after ~2 weeks of inactivity. If downloads start failing:

1. **Re-export cookies** using the same method above
2. **Replace the old** `cookies.txt` file
3. **Try the download again**

---

## ⚠️ Important Notes

- **Cookies must be from a LOGGED-IN browser session**
- **Netscape format is required** (`.txt` format with proper headers)
- **Cookies contain sensitive auth tokens** - Don't share them publicly
- **Update every 1-2 weeks** for best results
- **Different browsers = different cookies** - Use the browser you're logged into YouTube with

---

## 🧪 Test Your Cookies

Test if your cookies work:

```bash
# Replace VIDEO_ID with an actual YouTube video ID
yt-dlp \
  --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  --no-download \
  --dump-json \
  'https://www.youtube.com/watch?v=VIDEO_ID' | head -20
```

If this works without 403 errors, your cookies are valid! ✅

---

## Still Getting 403 Errors?

1. **Delete the old cookies file** and export fresh ones
2. **Log out and log back in** to YouTube before exporting
3. **Try a different browser** (Chrome vs Firefox)
4. **Update yt-dlp** to the latest version:
   ```bash
   pip install --upgrade yt-dlp
   ```
5. **Wait a few minutes** - YouTube may rate limit your IP temporarily

---

## 🚀 Download Test Command

Once cookies are set up, test with this:

```bash
yt-dlp \
  --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  -f 'bestvideo[height<=720]+bestaudio' \
  -o '%(title)s.%(ext)s' \
  'https://www.youtube.com/watch?v=VIDEO_ID'
```

Replace `VIDEO_ID` with an actual video ID. This should download at the highest quality available.

