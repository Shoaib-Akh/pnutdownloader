# PNUTDownloader Web Application

A web-based version of PNUTDownloader that allows users to download videos from various platforms including YouTube, TikTok, Facebook, Instagram, and more.

## Features

- **Multi-platform Support**: Download from YouTube, TikTok, Facebook, Instagram, Twitter, Twitch, and more
- **Real-time Progress**: Live download progress updates via WebSocket
- **Multiple Formats**: Support for MP4, WebM, MP3, WAV, AVI, MOV
- **Quality Selection**: Choose from various video qualities (8K to 360p) and audio bitrates
- **Playlist Support**: Download entire playlists or select individual videos
- **Dark/Light Theme**: Toggle between light and dark themes
- **Responsive Design**: Works on desktop and mobile devices
- **Docker Support**: Easy deployment with Docker and Docker Compose

## Quick Start

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/Shoaib-Akh/pnutdownloader.git
cd pnutdownloader/web
```

2. Build and run with Docker Compose:
```bash
docker-compose up -d
```

3. Access the application at `http://localhost:3000`

### Manual Installation

1. Install dependencies:
```bash
npm run install:all
```

2. Install yt-dlp system-wide:
```bash
# On macOS
brew install yt-dlp ffmpeg

# On Ubuntu/Debian
sudo apt update
sudo apt install yt-dlp ffmpeg

# On Windows (using Chocolatey)
choco install yt-dlp ffmpeg
```

3. Start the development server:
```bash
npm run dev
```

4. Access the application at `http://localhost:3000`

## Project Structure

```
web/
├── server/                 # Backend Node.js application
│   ├── index.js           # Main server file
│   ├── routes/            # API routes
│   │   ├── download.js    # Download endpoints
│   │   ├── video.js       # Video info endpoints
│   │   └── system.js      # System endpoints
│   ├── services/          # Business logic
│   │   ├── DownloadService.js
│   │   └── YtdlpService.js
│   └── downloads/         # Download storage
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   └── assets/        # Static assets
│   └── dist/              # Built frontend
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## API Endpoints

### Download Management
- `POST /api/download/start` - Start a new download
- `POST /api/download/pause/:id` - Pause a download
- `POST /api/download/resume/:id` - Resume a download
- `POST /api/download/cancel/:id` - Cancel a download
- `GET /api/download/status/:id` - Get download status
- `GET /api/download/active` - Get all active downloads

### Video Information
- `POST /api/video/info` - Get video information
- `POST /api/video/playlist` - Get playlist entries
- `POST /api/video/youtube` - Get YouTube-specific info

### System Information
- `GET /api/system/version` - Get app version
- `GET /api/system/ytdlp-version` - Get yt-dlp version
- `GET /api/system/ffmpeg-version` - Get FFmpeg version

## WebSocket Events

### Client to Server
- Connect to receive real-time download progress updates

### Server to Client
- `download-progress` - Real-time download progress updates

## Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `YTDLP_PROXY` - Optional default proxy for yt-dlp (for example `http://127.0.0.1:8080` or `socks5://127.0.0.1:1080`)

### Proxy and Cookies
- You can set proxy per request using `proxy` in API payload.
- If `proxy` is omitted, server uses `YTDLP_PROXY` / `HTTPS_PROXY` / `HTTP_PROXY` if present.
- Supported proxy schemes: `http://`, `https://`, `socks5://`, `socks5h://`, `socks4://`, `socks4a://`.
- Cookies must be valid Netscape-format cookies from a real logged-in session. Fake/forged cookies are not supported.

Example payload for download start:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "selectedQuality": "1080p",
  "useCookies": true,
  "proxy": "http://127.0.0.1:8080"
}
```

### Docker Configuration
- Downloads are stored in `./server/downloads`
- Logs are stored in `./server/logs`
- Application runs on port 3000

## Development

### Backend Development
```bash
cd server
npm install
npm run dev
```

### Frontend Development
```bash
cd client
npm install
npm run dev
```

### Full Development
```bash
npm run dev
```

## Production Deployment

### Docker Production
```bash
# Build and run in production mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### Manual Production
```bash
# Build the frontend
cd client && npm run build

# Start the production server
cd .. && npm start
```

## Supported Platforms

- YouTube (youtube.com, youtu.be)
- TikTok (tiktok.com)
- Facebook (facebook.com, fb.watch)
- Instagram (instagram.com)
- Twitter/X (twitter.com, x.com)
- Twitch (twitch.tv)
- Dailymotion (dailymotion.com)
- SoundCloud (soundcloud.com)
- Bilibili (bilibili.com)
- Reddit (reddit.com)
- Pinterest (pinterest.com)
- LinkedIn (linkedin.com)

## Security Considerations

- Input validation for all URLs
- File type restrictions
- Rate limiting (can be implemented)
- User quota management (can be implemented)
- No authentication required (as requested)

## Troubleshooting

### yt-dlp not found
Ensure yt-dlp is installed and accessible in the system PATH or in the `./bin` directory.

### Download failures
Check the server logs for detailed error information.

### Docker issues
Ensure Docker Desktop is running and you have sufficient disk space.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the same license as the original PNUTDownloader project.
