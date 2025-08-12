
---

# 🎥 YouTube Downloader

A **fast, modern YouTube downloader** with a polished **React/TypeScript** frontend (created with [Lovable.dev](https://lovable.dev)) and a **Python** backend powered by **yt-dlp** and **FFmpeg**.

Paste a link → Preview the video → Pick format/quality → Save it where you want.

**Features:**

* 📹 **Video:** MP4 (1080p / 720p / 480p / 360p)
* 🎵 **Audio:** MP3 (320 / 192 / 128 kbps)
* 💾 **Save-As** support on Chromium browsers (File System Access API)
* 🔒 **Works locally:** your downloads never leave your machine

---

## 📑 Contents

* [Quick start (Windows one-click)](#-quick-start-windows)
* [Manual setup (all platforms)](#-manual-setup-all-platforms)
* [How it works](#-how-it-works)
* [Requirements](#-requirements)
* [FFmpeg notes](#-ffmpeg-notes)
* [Cookies for restricted videos](#-cookies-for-restricted-videos-optional)
* [API](#-api-local)
* [Troubleshooting](#-troubleshooting)
* [Project structure](#-project-structure)
* [Scripts](#-scripts)
* [Legal / Fair Use](#-legal--fair-use)

---

## 🚀 Quick start (Windows)

The simplest way is to use the included **batch scripts**.

### 1) Start both backend and frontend (recommended)

```bat
start_both.bat
```

* Opens two terminals: **backend (Python)** and **frontend (Vite)**
* Backend → [http://localhost:5000](http://localhost:5000)
* Frontend → [http://localhost:5173](http://localhost:5173)

### 2) Start individually

```bat
# Backend (yt-dlp + FFmpeg autodetect)
start_backend_ytdlp.bat

# Frontend (React dev server)
start_frontend.bat
```

**Notes:**

* Backend detects FFmpeg in `./ffmpeg/bin/ffmpeg.exe` first, then PATH; if not found, it can auto-download a portable FFmpeg.
* Keep both terminals open while using the app.

---

## 🛠 Manual setup (all platforms)

**Prerequisites:**

* Node.js **18+**
* Python **3.9+**
* FFmpeg installed (or placed at `./ffmpeg/bin/ffmpeg[.exe]`)

### Backend (Python)

```bash
# Install Python deps
pip install -r requirements_ytdlp.txt

# Start the server
python install_videos_ytdlp.py
```

### Frontend (Node)

```bash
npm install
npm run dev
```

Visit → [http://localhost:5173](http://localhost:5173)

**Production build:**

```bash
npm run build
# Preview
npm run preview
```

---

## ⚙ How it works

1. **Frontend (React + Vite)**

   * Validates your YouTube URL
   * Fetches oEmbed metadata for preview
   * Sends selected options to the backend

2. **Backend (Flask + yt-dlp)**

   * Downloads the media into a temporary folder
   * Merges video+audio with FFmpeg (if needed)
   * Exposes file via a short-lived URL for browser download

3. **Save As behavior:**

   * Chromium browsers → File System Access API (custom save location)
   * Non-Chromium → Standard download prompt with suggested filename

**Default behavior:**

* Files stored in temp folder (auto-cleaned after \~1 hour)
* Final file saved in browser’s chosen location or default **Downloads** folder

---

## 📋 Requirements

**Backend:**

* Python 3.9+
* yt-dlp (latest), Flask, flask-cors
* FFmpeg in PATH or `./ffmpeg/bin/ffmpeg[.exe]`

**Frontend:**

* Node.js 18+
* Chrome / Edge / Brave for Save-As (others → standard download)

---

## 🎞 FFmpeg notes

* Many YouTube videos have **separate video/audio streams** → FFmpeg required to merge into MP4.
* Auto-detect order:

  1. `./ffmpeg/bin/ffmpeg[.exe]`
  2. PATH (`where ffmpeg`)
  3. Environment vars: `FFMPEG_PATH`, `YTDLP_FFMPEG`, `FFMPEG_BIN`
* If missing, Windows batch script can auto-download portable FFmpeg.

---

## 🍪 Cookies for restricted videos (optional)

Some videos are **age/region restricted**. Cookies help bypass restrictions.

1. Install a `cookies.txt` exporter extension (e.g., “Get cookies.txt”)
2. While logged in to YouTube, export cookies for `youtube.com`
3. Save as `cookies.txt` in the project root

Backend will detect and use automatically.

---

## 📡 API (local)

### POST `/download`

* **Body:**

  ```json
  {
    "url": "string",
    "format": "mp4" | "mp3",
    "quality": "1080p" | "720p" | "480p" | "360p" | "320 kbps" | "192 kbps" | "128 kbps"
  }
  ```
* **Returns:** `{ downloadUrl, filename, title }`

### GET `/file/<download_id>`

Returns binary file as attachment.

### GET `/health`

Returns basic health status.

### GET `/test`

Fetches info for a known public video to verify yt-dlp.

---

## 🩺 Troubleshooting

* **Backend window closes immediately**

  * Run from terminal to see errors
  * Ensure Python in PATH → `python --version`

* **403 / 400 errors**

  * Update yt-dlp → `pip install -U yt-dlp`
  * Try different quality or video
  * Provide `cookies.txt`

* **No Save dialog**

  * Only Chromium browsers support File System Access API
  * Fallback → normal download prompt

* **Backend not running**

  * Start `start_backend_ytdlp.bat` or `python install_videos_ytdlp.py`
  * Check health at [http://localhost:5000/health](http://localhost:5000/health)

* **FFmpeg not found**

  * Place at `./ffmpeg/bin/ffmpeg.exe` or install globally

---

## 📂 Project structure

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

## 📜 Scripts

**Frontend:**

* `npm run dev` — Start dev server
* `npm run build` — Production build
* `npm run preview` — Preview build

**Backend:**

* `start_backend_ytdlp.bat` — Windows launcher with FFmpeg autodetect
* `python install_videos_ytdlp.py` — Start backend manually

---

## ⚖ Legal / Fair Use

This project is for **personal use**.
Respect **YouTube’s Terms of Service** and **copyright laws** in your jurisdiction.
Only download content you have the rights to access.

---

