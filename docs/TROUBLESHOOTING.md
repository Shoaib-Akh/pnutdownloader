# PNUTDownloader Troubleshooting Guide

Solutions to common problems with PNUTDownloader.

---

## Table of Contents

1. [Download Issues](#download-issues)
2. [Installation Problems](#installation-problems)
3. [Video Availability](#video-availability)
4. [Performance Issues](#performance-issues)
5. [Error Messages](#error-messages)
6. [Platform-Specific Issues](#platform-specific-issues)

---

## Download Issues

### Download Fails Immediately

**Symptoms:**
- Download starts but fails within seconds
- Error: "Download failed"

**Solutions:**
1. **Check your internet connection**
   - Try loading the website in your browser
   - Test with a different URL

2. **Update PNUTDownloader**
   - Go to **Help** > **Check for Updates**
   - Update yt-dlp if prompted

3. **Try a different format**
   - Some videos only work with specific formats
   - Try "Best Available" instead of specific quality

4. **Disable VPN/Proxy** (if applicable)
   - Some sites block VPN connections

---

### Download Stuck at 0%

**Symptoms:**
- Download shows 0% progress
- Nothing happens for a long time

**Solutions:**
1. **Wait 30-60 seconds**
   - Initial connection can take time for large videos

2. **Check firewall settings**
   - Make sure PNUTDownloader can access the internet

3. **Try different quality**
   - Lower quality often downloads faster

4. **Clear download queue**
   - Cancel stuck downloads
   - Try downloading one at a time

---

### Very Slow Download Speed

**Symptoms:**
- Downloads taking much longer than expected

**Solutions:**
1. **Check your internet speed**
   - Run a speed test

2. **Some sites limit download speeds**
   - This is beyond app control

3. **Try different times**
   - Peak hours may be slower

4. **Use a download manager**
   - Some countries may benefit from this

---

### Cannot Resume Download

**Symptoms:**
- Lost connection, can't resume
- Download starts from beginning

**Solutions:**
1. **Enable auto-save**
   - Check Settings > Enable download state saving

2. **Clear partial files**
   - Cancel and delete partial download
   - Start fresh

3. **Check disk space**
   - Ensure enough space for resume data

---

## Installation Problems

### App Won't Launch (Windows)

**Symptoms:**
- App crashes on startup
- No error message

**Solutions:**
1. **Install Visual C++ Redistributable**
   - Download from Microsoft

2. **Run as Administrator**
   - Right-click > Run as administrator

3. **Reinstall the app**
   - Uninstall completely
   - Download fresh installer

---

### App Won't Launch (macOS)

**Symptoms:**
- "App is damaged" error

**Solutions:**
```bash
# Remove quarantine attribute
xattr -cr /Applications/PNUTDownloader.app
```

Or:
```bash
# Gatekeeper workaround
sudo spctl --master-disable
```

---

### Missing yt-dlp

**Symptoms:**
- Error: "yt-dlp not found"
- Downloads won't start

**Solutions:**
1. **Update the app**
   - Newer versions include yt-dlp

2. **Manual installation**
   - Download yt-dlp from https://yt-dlp.github.io
   - Place in app resources folder

---

### Missing FFmpeg

**Symptoms:**
- Error: "FFmpeg not found"
- Can't convert audio/video

**Solutions:**
1. **App has bundled FFmpeg**
   - Should work automatically

2. **Install system FFmpeg**
   - macOS: `brew install ffmpeg`
   - Ubuntu: `sudo apt install ffmpeg`
   - Windows: Add to PATH

---

## Video Availability

### "Video Unavailable" Error

**Symptoms:**
- "This video is not available"
- "Video has been removed"

**Solutions:**
1. **Video may be deleted**
   - Check in browser first

2. **Region blocked**
   - Use VPN to match video region

3. **Age-restricted**
   - Try using cookies from logged-in account

4. **Private video**
   - Must be logged in (use cookies)

---

### "Login Required" Error

**Symptoms:**
- "This video requires authentication"
- Can watch in browser but not download

**Solutions:**
1. **Export browser cookies**
   - Use "Get cookies.txt LOCALLY" extension
   - Import in Settings > Cookies

2. **Make sure cookies are valid**
   - Some expire after logout

3. **Check cookie format**
   - Must be Netscape format

---

### Playlist Not Loading

**Symptoms:**
- Can't see playlist videos
- Only getting single video

**Solutions:**
1. **Copy playlist URL**
   - Make sure it's the playlist link
   - Not just one video

2. **Update yt-dlp**
   - Some playlist changes require updates

3. **Check playlist privacy**
   - Private playlists need authentication

---

## Performance Issues

### High Memory Usage

**Symptoms:**
- App is slow
- System is sluggish

**Solutions:**
1. **Limit concurrent downloads**
   - Settings > Max concurrent downloads = 1-2

2. **Clear completed downloads**
   - Remove from list when done

3. **Restart the app**
   - Close and reopen

---

### App Freezes

**Symptoms:**
- UI becomes unresponsive
- Buttons don't work

**Solutions:**
1. **Wait for background process**
   - May be processing large file

2. **Force restart**
   - Task Manager > End task
   - Then reopen app

3. **Check logs**
   - Help > View Logs

---

## Error Messages

### "ERR_INVALID_URL"

- Invalid URL format
- **Fix**: Check the URL is correct

### "ERR_NETWORK_ERROR"

- Network connection issue
- **Fix**: Check internet, try again

### "ERR_FILE_EXISTS"

- File already exists
- **Fix**: Enable "Overwrite" in settings or change filename

### "ERR_PERMISSION_DENIED"

- Can't write to folder
- **Fix**: Choose different download folder

### "ERR_DISK_FULL"

- No space left
- **Fix**: Free up disk space

---

## Platform-Specific Issues

### Windows

| Issue | Solution |
|-------|----------|
| Antivirus blocks | Add to exceptions |
| Missing DLL | Install Visual C++ Redistributable |
| Slow on Windows 11 | Update to latest version |

### macOS

| Issue | Solution |
|-------|----------|
| "Damaged app" | xattr -cr command (see above) |
| M1/M2 issues | Use Rosetta if needed |
| Notarization issue | Download directly from releases |

### Linux

| Issue | Solution |
|-------|----------|
| AppImage won't run | chmod +x filename.AppImage |
| Missing libraries | Install missing packages |
| Flatpak issues | Try AppImage instead |

---

## Getting More Help

### Enable Debug Logging

1. Go to **Settings**
2. Enable **Debug Mode**
3. Reproduce the issue
4. Check logs in Help > View Logs

### Collect Information

When asking for help, include:

- App version (Help > About)
- Operating system and version
- The URL you're trying to download
- Any error messages
- Steps to reproduce

### Contact Support

- [Open an Issue](https://github.com/Shoaib-Akh/pnutdownloader/issues)
- [Start a Discussion](https://github.com/Shoaib-Akh/pnutdownloader/discussions)

---

*Last updated: March 2026*
