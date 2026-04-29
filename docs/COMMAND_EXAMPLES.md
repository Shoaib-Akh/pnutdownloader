# Working Command Examples for YouTube Downloads

These commands have been tested and work with the fixed YtdlpService.

---

## 1. Basic Download (720p Best Quality)

```bash
yt-dlp \
  --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  --extractor-args 'youtube:player_client=web' \
  --user-agent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' \
  --referer 'https://www.youtube.com/' \
  -f 'bestvideo[height<=720]+bestaudio/best' \
  -o '%(title)s.%(ext)s' \
  'https://www.youtube.com/watch?v=VIDEO_ID'
```

**Replace:** `VIDEO_ID` with actual YouTube video ID

---

## 2. Audio Only Download (MP3)

```bash
yt-dlp \
  --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  --extractor-args 'youtube:player_client=web' \
  -x --audio-format mp3 --audio-quality 192 \
  -o '%(title)s.%(ext)s' \
  'https://www.youtube.com/watch?v=VIDEO_ID'
```

**What it does:**
- Downloads audio only
- Converts to MP3 format
- 192kbps quality

---

## 3. Download Playlist (All Videos)

```bash
yt-dlp \
  --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  --extractor-args 'youtube:player_client=web' \
  -f 'bestvideo[height<=720]+bestaudio/best' \
  -o '%(playlist)s/%(playlist_index)s - %(title)s.%(ext)s' \
  'https://www.youtube.com/playlist?list=PLAYLIST_ID'
```

**Replace:** `PLAYLIST_ID` with the playlist ID from URL

---

## 4. High Quality Download (1080p - If Available)

```bash
yt-dlp \
  --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  --extractor-args 'youtube:player_client=web' \
  --no-warnings \
  -f 'bestvideo[height<=1080]+bestaudio/best' \
  -o '%(title)s.%(ext)s' \
  'https://www.youtube.com/watch?v=VIDEO_ID'
```

**Note:** May fail with 403 for some videos. If it does, use 720p version instead.

---

## 5. Safe Download (Lower Quality, More Stable)

```bash
yt-dlp \
  --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  --extractor-args 'youtube:player_client=web' \
  -f 'bestvideo[height<=480]+bestaudio/best' \
  -o '%(title)s.%(ext)s' \
  'https://www.youtube.com/watch?v=VIDEO_ID'
```

**When to use:**
- Getting 403 errors with 720p
- Slow internet connection
- Quick downloads needed

---

## 6. Get Video Info (No Download)

```bash
yt-dlp \
  --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  --extractor-args 'youtube:player_client=web' \
  --dump-json \
  --no-download \
  'https://www.youtube.com/watch?v=VIDEO_ID' | jq '.formats[] | {format_id, format_note, height, width, vcodec, acodec}' | head -20
```

**What it does:**
- Shows all available formats
- No file is downloaded
- Useful for debugging

---

## 7. Download with Custom Output Path

```bash
yt-dlp \
  --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  --extractor-args 'youtube:player_client=web' \
  -f 'bestvideo[height<=720]+bestaudio/best' \
  -o '/custom/path/%(title)s_[%(upload_date)s].%(ext)s' \
  'https://www.youtube.com/watch?v=VIDEO_ID'
```

**Output example:** `Video_Title_[20240101].mp4`

---

## 8. Download with Metadata & Thumbnail

```bash
yt-dlp \
  --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  --extractor-args 'youtube:player_client=web' \
  -f 'bestvideo[height<=720]+bestaudio/best' \
  --embed-metadata \
  --embed-subs \
  --write-thumbnail \
  -o '%(title)s.%(ext)s' \
  'https://www.youtube.com/watch?v=VIDEO_ID'
```

**Includes:**
- Metadata (title, artist, etc.)
- Subtitles (if available)
- Thumbnail image

---

## 9. Download with Retry on 403 Error

```bash
for i in {1..3}; do
  yt-dlp \
    --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
    --extractor-args 'youtube:player_client=web' \
    -f 'bestvideo[height<=720]+bestaudio/best' \
    -o '%(title)s.%(ext)s' \
    'https://www.youtube.com/watch?v=VIDEO_ID' && break
  
  if [ $i -lt 3 ]; then
    echo "Attempt $i failed, retrying in 5 seconds..."
    sleep 5
  fi
done
```

**What it does:**
- Tries download up to 3 times
- Waits 5 seconds between attempts
- Perfect for unreliable connections

---

## 10. Batch Download Multiple Videos

```bash
# Save this in file: videos.txt
# https://www.youtube.com/watch?v=VIDEO_ID_1
# https://www.youtube.com/watch?v=VIDEO_ID_2
# https://www.youtube.com/watch?v=VIDEO_ID_3

yt-dlp \
  --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt \
  --extractor-args 'youtube:player_client=web' \
  -f 'bestvideo[height<=720]+bestaudio/best' \
  -o '%(title)s.%(ext)s' \
  -a videos.txt
```

**How to use:**
1. Create `videos.txt` with URLs (one per line)
2. Run the command
3. Downloads all videos

---

## Troubleshooting Guide

### Getting 403 Error?

```bash
# Try lower quality
-f 'bestvideo[height<=480]+bestaudio/best'

# Or use best available (no quality constraint)
-f 'best[ext=mp4]'

# Or try just audio
-f 'bestaudio'
```

### Download is very slow?

```bash
# Use smaller chunk size
--http-chunk-size 1048576  # 1MB instead of 10MB

# Or skip embedding metadata
# (remove --embed-metadata flag)
```

### Subtitle download failing?

```bash
# Skip subtitles if not needed
# (remove --embed-subs and --write-subs flags)
```

---

## Quick Copy-Paste (Replace VIDEO_ID)

```bash
yt-dlp --cookies /Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt --extractor-args 'youtube:player_client=web' -f 'bestvideo[height<=720]+bestaudio/best' 'https://www.youtube.com/watch?v=VIDEO_ID'
```

This is the **minimum working command** for stable downloads.

