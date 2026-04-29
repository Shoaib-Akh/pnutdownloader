#!/bin/bash

# Test script for yt-dlp 403 error fixes
# This script helps you diagnose and test your setup

echo "🔍 YouTube Video Download - 403 Error Diagnostic"
echo "=================================================="
echo ""

# Check 1: yt-dlp is installed
echo "✓ Check 1: Verifying yt-dlp is installed..."
if ! command -v yt-dlp &> /dev/null; then
    echo "  ❌ yt-dlp is NOT installed"
    echo "  Install with: pip install yt-dlp"
    exit 1
fi

YTDLP_VERSION=$(yt-dlp --version)
echo "  ✅ yt-dlp found: $YTDLP_VERSION"
echo ""

# Check 2: Cookies file exists
echo "✓ Check 2: Verifying cookies file..."
COOKIES_FILE="/Users/mac/Documents/pnutdownloader/web/cookies/cookies.txt"

if [ ! -f "$COOKIES_FILE" ]; then
    echo "  ❌ Cookies file NOT found at: $COOKIES_FILE"
    echo "  Action: Extract cookies using browser extension (see COOKIES_SETUP.md)"
    exit 1
fi

COOKIES_SIZE=$(wc -c < "$COOKIES_FILE")
echo "  ✅ Cookies file found (${COOKIES_SIZE} bytes)"

# Check if it has valid Netscape format
if ! grep -q "# Netscape HTTP Cookie File" "$COOKIES_FILE"; then
    echo "  ⚠️  Warning: File may not be in Netscape format"
fi

YOUTUBE_COOKIES=$(grep -c "\.youtube\.com\|\.google\.com" "$COOKIES_FILE" 2>/dev/null || echo "0")
echo "  📍 YouTube/Google cookies in file: $YOUTUBE_COOKIES"
echo ""

# Check 3: FFmpeg availability
echo "✓ Check 3: Verifying FFmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "  ⚠️  FFmpeg NOT found (needed for video merging)"
    echo "  Install with: brew install ffmpeg"
else
    FFMPEG_VERSION=$(ffmpeg -version | head -1)
    echo "  ✅ FFmpeg found: $FFMPEG_VERSION"
fi
echo ""

# Check 4: Test video info fetch
echo "✓ Check 4: Testing yt-dlp with cookies (info only, no download)..."
echo "  Running: yt-dlp --cookies ... --dump-json --no-download <TEST_VIDEO>"
echo ""

TEST_VIDEO="https://www.youtube.com/watch?v=dQw4w9WgXcQ"

yt-dlp \
    --cookies "$COOKIES_FILE" \
    --extractor-args 'youtube:player_client=web' \
    --user-agent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' \
    --dump-json \
    --no-download \
    --no-warnings \
    "$TEST_VIDEO" > /tmp/ytdlp_test.json 2>&1

if [ $? -eq 0 ]; then
    echo "  ✅ Video info fetch SUCCESSFUL"
    
    # Extract info
    VIDEO_TITLE=$(jq -r '.title' /tmp/ytdlp_test.json 2>/dev/null || echo "Unknown")
    VIDEO_DURATION=$(jq -r '.duration_string' /tmp/ytdlp_test.json 2>/dev/null || echo "Unknown")
    FORMAT_COUNT=$(jq '.formats | length' /tmp/ytdlp_test.json 2>/dev/null || echo "0")
    
    echo "  📽️  Title: $VIDEO_TITLE"
    echo "  ⏱️  Duration: $VIDEO_DURATION"
    echo "  🎬 Available formats: $FORMAT_COUNT"
    echo ""
    
    # Show best video/audio combination
    echo "  📊 Recommended formats for download:"
    jq -r '.formats[] | select(.vcodec != "none" and .acodec == "none") | "    - Video: \(.format_note // .format) (\(.height)p)"' /tmp/ytdlp_test.json 2>/dev/null | head -3
    echo ""
    
else
    ERROR_MSG=$(cat /tmp/ytdlp_test.json | grep -i "403\|forbidden\|error" | head -1)
    echo "  ❌ FAILED - Video info fetch error"
    echo "  Error: $ERROR_MSG"
    echo ""
    echo "  🔧 Troubleshooting:"
    echo "    1. Update yt-dlp: pip install --upgrade yt-dlp"
    echo "    2. Export fresh cookies from YouTube"
    echo "    3. Wait 5 minutes (IP may be rate limited)"
    exit 1
fi

echo ""
echo "✅ All checks passed! Your setup is working correctly."
echo ""
echo "🚀 Next step: Download a video with web app or use:"
echo "   yt-dlp --cookies '$COOKIES_FILE' -f 'bestvideo[height<=720]+bestaudio' 'https://www.youtube.com/watch?v=VIDEO_ID'"
echo ""
