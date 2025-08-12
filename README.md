# Tube Sight Fetcher — YouTube Downloader

A fast, modern YouTube downloader with a polished React/TypeScript frontend (created with Lovable.dev) and a Python backend powered by yt-dlp and FFmpeg. Paste a link, preview the video, pick format/quality, and save it where you want.

- Video: MP4 (1080p / 720p / 480p / 360p)
- Audio: MP3 (320 / 192 / 128 kbps)
- Save-As support on Chromium browsers (File System Access API)
- Works locally: your downloads never leave your machine

---

## Contents
- Quick start (Windows one-click)
- Manual setup (all platforms)
- How it works
- Requirements
- FFmpeg notes
- Cookies for restricted videos
- API
- Troubleshooting
- Project structure
- Scripts

---

## Quick start (Windows)

The simplest way is to use the included batch scripts.

1) Start both backend and frontend (recommended)
```bat
start_both.bat
```
- Opens two terminals: backend (Python) and frontend (Vite)
- Backend runs at http://localhost:5000
- Frontend runs at http://localhost:5173

2) Start individually
```bat
# Backend (yt-dlp + FFmpeg autodetect)
start_backend_ytdlp.bat

# Frontend (React dev server)
start_frontend.bat
```

Notes
- The backend script detects FFmpeg in ./ffmpeg/bin/ffmpeg.exe first, then PATH; if not found it can auto-download a portable FFmpeg.
- Keep both terminals open while using the app.

---

## Manual setup (all platforms)

Prereqs
- Node.js 18+
- Python 3.9+
- FFmpeg installed (or placed at ./ffmpeg/bin/ffmpeg[.exe])

Backend (Python)
```bash
# Install Python deps
pip install -r requirements_ytdlp.txt

# Start the server
python install_videos_ytdlp.py
```

Frontend (Node)
```bash
npm install
npm run dev
```
Visit http://localhost:5173

Production build
```bash
npm run build
# preview
npm run preview
```

---

## How it works

- Frontend (React + Vite) validates your YouTube URL, fetches oEmbed metadata for a quick preview, and sends your selected options to the backend.
- Backend (Flask + yt-dlp) downloads the media into a temporary folder, optionally merging video+audio with FFmpeg, then exposes the file via a short-lived URL for your browser to download.
- Save As: On Chromium browsers, we use the File System Access API to prompt for a save location. On non-Chromium browsers, a standard download prompt is used with a suggested filename.

Default behavior
- Files are first written to a temp folder (auto-cleaned after ~1 hour)
- The file you keep is saved by your browser in the folder you choose (or your default Downloads folder if you skip the Save dialog)

---

## Requirements

Backend
- Python 3.9+
- yt-dlp (latest), Flask, flask-cors
- FFmpeg available on PATH or at ./ffmpeg/bin/ffmpeg[.exe]

Frontend
- Node.js 18+
- Chrome/Edge/Brave for Save-As (others fall back to standard download)

---

## FFmpeg notes

- Many YouTube videos provide separate video and audio streams. FFmpeg is required to merge them into MP4.
- The backend auto-detects FFmpeg in this order:
  1. ./ffmpeg/bin/ffmpeg[.exe]
  2. PATH (where ffmpeg)
  3. Environment variables: FFMPEG_PATH / YTDLP_FFMPEG / FFMPEG_BIN
- If not present, the Windows batch script can download a portable FFmpeg automatically.

---

## Cookies for restricted videos (optional)

Some videos are age/region restricted. You can provide cookies to improve access.

1) Install a “cookies.txt” exporter extension in your browser (e.g., “Get cookies.txt”)
2) While logged into YouTube, export cookies for youtube.com
3) Save the file as cookies.txt in the project root

The backend will detect and use it automatically.

---

## API (local)

- POST /download
  - body: { url: string, format: "mp4" | "mp3", quality: "1080p" | "720p" | "480p" | "360p" | "320 kbps" | "192 kbps" | "128 kbps" }
  - returns: { downloadUrl: string, filename: string, title: string }
- GET /file/<download_id>
  - returns the binary file as an attachment
- GET /health
  - returns basic health status
- GET /test
  - attempts to fetch info for a known public video to verify yt-dlp

---

## Troubleshooting

- Backend window closes immediately
  - Open a terminal first and run the script so you can see errors
  - Ensure Python is on PATH: `python --version`
- 403 Forbidden / 400 Bad Request
  - Update yt-dlp to latest: `pip install -U yt-dlp`
  - Try a different quality (e.g., 720p) or a different video
  - Provide cookies.txt (see above)
- No Save dialog appears
  - Chromium browsers only for File System Access API
  - Fallback will still prompt a save with a suggested filename
- “Backend not running”
  - Start `start_backend_ytdlp.bat` (or `python install_videos_ytdlp.py`)
  - Check http://localhost:5000/health and http://localhost:5000/test
- FFmpeg not found
  - Put ffmpeg.exe at `./ffmpeg/bin/ffmpeg.exe` or install FFmpeg and add to PATH

---

## Project structure
```
├── public/
├── src/                         # React + TypeScript frontend
│   └── components/downloader/YouTubeDownloader.tsx
├── install_videos_ytdlp.py      # Flask backend (yt-dlp + FFmpeg)
├── requirements_ytdlp.txt       # Python dependencies for backend
├── start_backend_ytdlp.bat      # Windows: backend with FFmpeg autodetect
├── start_frontend.bat           # Windows: frontend dev server
├── start_both.bat               # Windows: starts backend + frontend
├── ffmpeg/bin/ffmpeg.exe        # Optional local FFmpeg (Windows)
├── package.json
├── vite.config.ts
└── README.md
```

---

## Scripts

Frontend
- npm run dev — start dev server
- npm run build — production build
- npm run preview — preview the build

Backend
- start_backend_ytdlp.bat — Windows launcher with FFmpeg autodetect
- python install_videos_ytdlp.py — start backend manually

---

## Legal / Fair Use
This project is for personal use. Respect YouTube’s Terms of Service and copyright laws in your jurisdiction. Only download content you have rights to access.
