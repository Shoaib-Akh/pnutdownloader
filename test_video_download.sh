#!/bin/bash

# Helper script for web app download testing
# This script is called by the web server to diagnose download issues

COOKIES_FILE="/Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt"
VIDEO_URL="${1:-https://www.youtube.com/watch?v=dQw4w9WgXcQ}"
OUTPUT_FORMAT="${2:-720p}"

echo "🔍 YouTube Download Diagnostics"
echo "==============================="
echo ""
echo "URL: $VIDEO_URL"
echo "Quality: $OUTPUT_FORMAT"
echo "Cookies: $COOKIES_FILE"
echo ""

# Check if cookies exist
if [ ! -f "$COOKIES_FILE" ]; then
    echo "❌ ERROR: Cookies file not found!"
    echo "   Please extract cookies to: $COOKIES_FILE"
    exit 1
fi

echo "✅ Cookies file found"
echo ""

# Determine quality settings
case $OUTPUT_FORMAT in
    "1080p")
        FORMAT_SELECTOR="bestvideo[height<=1080]+bestaudio/best"
        ;;
    "720p")
        FORMAT_SELECTOR="bestvideo[height<=720]+bestaudio/best"
        ;;
    "480p")
        FORMAT_SELECTOR="bestvideo[height<=480]+bestaudio/best"
        ;;
    "audio")
        FORMAT_SELECTOR="bestaudio"
        ;;
    *)
        FORMAT_SELECTOR="bestvideo[height<=720]+bestaudio/best"
        ;;
esac

echo "🔧 Testing with format: $FORMAT_SELECTOR"
echo ""

# Test video info fetch
echo "📊 Fetching video information..."
echo ""

yt-dlp \
    --cookies "$COOKIES_FILE" \
    --extractor-args 'youtube:player_client=web' \
    --user-agent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' \
    --dump-json \
    --no-download \
    --no-warnings \
    "$VIDEO_URL" > /tmp/ytdlp_test.json 2>&1

if [ ! -s /tmp/ytdlp_test.json ]; then
    echo "❌ FAILED: Could not fetch video information"
    echo ""
    echo "Possible reasons:"
    echo "  1. Invalid video URL"
    echo "  2. Video is age-restricted or geo-blocked"
    echo "  3. Cookies have expired (re-export them)"
    echo "  4. yt-dlp is outdated (run: pip install --upgrade yt-dlp)"
    exit 1
fi

# Parse video info
VIDEO_TITLE=$(jq -r '.title // "Unknown"' /tmp/ytdlp_test.json 2>/dev/null)
VIDEO_DURATION=$(jq -r '.duration_string // "Unknown"' /tmp/ytdlp_test.json 2>/dev/null)
UPLOADER=$(jq -r '.uploader // "Unknown"' /tmp/ytdlp_test.json 2>/dev/null)
FORMAT_COUNT=$(jq '.formats | length' /tmp/ytdlp_test.json 2>/dev/null)

echo "✅ Video Information:"
echo "   Title: $VIDEO_TITLE"
echo "   Uploader: $UPLOADER"
echo "   Duration: $VIDEO_DURATION"
echo "   Available formats: $FORMAT_COUNT"
echo ""

# Check if any formats match our selector
MATCHING_FORMATS=$(jq -r ".formats[] | select(.vcodec != \"none\" and (.height == null or .height <= ${OUTPUT_FORMAT%p})) | .format_id" /tmp/ytdlp_test.json 2>/dev/null | wc -l)

if [ $MATCHING_FORMATS -eq 0 ]; then
    echo "⚠️  WARNING: No formats found for $OUTPUT_FORMAT"
    echo "   Available video formats:"
    jq -r '.formats[] | select(.vcodec != "none") | "   - \(.height)p: \(.format_id)"' /tmp/ytdlp_test.json 2>/dev/null | sort -u | head -5
    echo ""
    echo "   Falling back to best available format..."
    FORMAT_SELECTOR="best"
else
    echo "✅ Found $MATCHING_FORMATS compatible format(s) for $OUTPUT_FORMAT"
    echo ""
fi

# Test actual download capability
echo "🎬 Testing download capability..."
echo "   (This will NOT download, just check if possible)"
echo ""

# Use yt-dlp to check if download would work
yt-dlp \
    --cookies "$COOKIES_FILE" \
    --extractor-args 'youtube:player_client=web' \
    --user-agent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' \
    --referer 'https://www.youtube.com/' \
    -f "$FORMAT_SELECTOR" \
    --print-json \
    --no-simulate \
    --no-download \
    "$VIDEO_URL" > /tmp/ytdlp_download_check.json 2>&1

DOWNLOAD_CHECK=$?

if [ $DOWNLOAD_CHECK -eq 0 ]; then
    echo "✅ Download test SUCCESSFUL!"
    echo "   This video CAN be downloaded with the selected settings"
    echo ""
    
    # Show estimated file size
    FILE_SIZE=$(jq -r '.filesize // "Unknown"' /tmp/ytdlp_download_check.json 2>/dev/null)
    if [ "$FILE_SIZE" != "Unknown" ] && [ "$FILE_SIZE" != "null" ]; then
        FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1024 / 1024" | bc)
        echo "   Estimated size: ${FILE_SIZE_MB}MB"
    fi
    echo ""
    
    echo "🎬 Recommended action: Proceed with download in web app"
    exit 0
else
    echo "❌ Download test FAILED!"
    echo ""
    
    # Check for specific error messages
    if grep -q "403" /tmp/ytdlp_download_check.json; then
        echo "   ERROR: HTTP 403 Forbidden"
        echo "   Solutions:"
        echo "     1. Re-export cookies from browser"
        echo "     2. Try lower quality (480p instead of 720p)"
        echo "     3. Update yt-dlp: pip install --upgrade yt-dlp"
        echo "     4. Wait 5-10 minutes and try again (rate limit)"
    else
        echo "   ERROR: Unable to determine cause"
        echo "   Check the error message below:"
        cat /tmp/ytdlp_download_check.json
    fi
    exit 1
fi
