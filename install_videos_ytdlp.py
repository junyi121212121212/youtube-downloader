from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import threading
import time
import yt_dlp
import json
import shutil

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Store download info temporarily
downloads = {}

def cleanup_old_files():
    """Clean up old temporary files"""
    while True:
        current_time = time.time()
        to_remove = []
        for download_id, info in downloads.items():
            if current_time - info.get('created_at', 0) > 3600:  # 1 hour
                if os.path.exists(info.get('file_path', '')):
                    try:
                        os.remove(info['file_path'])
                    except:
                        pass
                to_remove.append(download_id)
        
        for download_id in to_remove:
            downloads.pop(download_id, None)
        
        time.sleep(300)  # Check every 5 minutes

# Start cleanup thread
cleanup_thread = threading.Thread(target=cleanup_old_files, daemon=True)
cleanup_thread.start()

@app.route('/download', methods=['POST'])
def download_video():
    try:
        # Get JSON data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        url = data.get('url')
        format_type = data.get('format', 'mp4')
        quality = data.get('quality', '1080p')
        
        print(f"Download request: URL={url}, format={format_type}, quality={quality}")
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        print(f"Created temp directory: {temp_dir}")
        
        # Configure yt-dlp options with anti-detection measures
        # Resolve FFmpeg location (env var, local, PATH)
        env_ffmpeg = os.environ.get('FFMPEG_PATH') or os.environ.get('YTDLP_FFMPEG') or os.environ.get('FFMPEG_BIN')
        ffmpeg_candidates = [
            env_ffmpeg if env_ffmpeg else None,
            shutil.which('ffmpeg'),
            shutil.which('ffmpeg.exe'),
            os.path.join(os.getcwd(), 'ffmpeg', 'bin', 'ffmpeg.exe'),
            os.path.join(os.getcwd(), 'ffmpeg', 'bin', 'ffmpeg'),
            os.path.join(os.getcwd(), 'vendor', 'ffmpeg', 'bin', 'ffmpeg.exe'),
            os.path.join(os.getcwd(), 'vendor', 'ffmpeg', 'bin', 'ffmpeg'),
        ]
        ffmpeg_path = next((p for p in ffmpeg_candidates if p and os.path.exists(p)), None)
        ffmpeg_dir = os.path.dirname(ffmpeg_path) if ffmpeg_path else None
        if ffmpeg_dir:
            print(f"Using FFmpeg at: {ffmpeg_path}")
        else:
            print("FFmpeg not found on PATH or in known locations. Progressive downloads may still work; merging/conversion will be skipped if unavailable.")

        base_opts = {
            'outtmpl': os.path.join(temp_dir, '%(title)s.%(ext)s'),
            'noplaylist': True,
            'extract_flat': False,
            'writethumbnail': False,
            'writeinfojson': False,
            'quiet': False,
            'no_warnings': False,
            'socket_timeout': 15,
            'noprogress': True,
            # HTTP headers to mimic a real browser
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.youtube.com/',
                'Sec-Fetch-Mode': 'navigate',
            },
            # Retry and bypass options
            'retries': 5,
            'fragment_retries': 5,
            'extractor_retries': 5,
            'sleep_interval': 1,
            'max_sleep_interval': 5,
            'geo_bypass': True,
            'nocheckcertificate': True,
            'source_address': '0.0.0.0',
            'extractor_args': {
                'youtube': {
                    # Use Android/TV clients which can avoid throttling/403 in some cases
                    'player_client': ['android', 'tv']
                }
            },
            **({'ffmpeg_location': ffmpeg_dir} if ffmpeg_dir else {}),
        }

        # Use cookies.txt if present (helps with age/region restrictions)
        cookiefile = os.path.join(os.getcwd(), 'cookies.txt')
        if os.path.exists(cookiefile):
            base_opts['cookiefile'] = cookiefile
            print(f"Using cookies from: {cookiefile}")

        if format_type == 'mp4':
            # Video download options
            if quality == '1080p':
                # Prefer 1080p, fallback to best available
                format_selector = 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]/best[ext=mp4]/best'
            elif quality == '720p':
                format_selector = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]/best'
            elif quality == '480p':
                format_selector = 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[height<=480]/best[ext=mp4]/best'
            elif quality == '360p':
                format_selector = 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best[height<=360]/best[ext=mp4]/best'
            else:
                format_selector = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'

            ydl_opts = {
                **base_opts,
                'format': format_selector,
                'merge_output_format': 'mp4',  # Ensure merging into mp4 when separate streams are used
            }
        else:  # mp3/audio
            ydl_opts = {
                **base_opts,
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': quality.replace(' kbps', '').replace('kbps', '') if 'kbps' in quality else '192',
                }],
            }
        
        # Download with yt-dlp
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                print("Getting video info...")
                info = ydl.extract_info(url, download=False)
                title = info.get('title', 'Unknown')
                print(f"Video title: {title}")
                
                print("Starting download...")
                ydl.download([url])
                
                # Find the downloaded file
                downloaded_files = []
                for file in os.listdir(temp_dir):
                    if os.path.isfile(os.path.join(temp_dir, file)):
                        downloaded_files.append(file)
                
                if not downloaded_files:
                    return jsonify({'error': 'Download completed but no file found'}), 500
                
                # Use the first (and usually only) downloaded file
                filename = downloaded_files[0]
                file_path = os.path.join(temp_dir, filename)
                
                print(f"Downloaded file: {filename}")
                
        except Exception as e:
            print(f"yt-dlp download error: {e}")
            return jsonify({'error': f'Download failed: {str(e)}'}), 500
        
        # Generate download ID
        download_id = str(abs(hash(f"{url}_{format_type}_{quality}_{time.time()}")))
        
        # Store download info
        downloads[download_id] = {
            'file_path': file_path,
            'filename': filename,
            'created_at': time.time()
        }
        
        print(f"Download ready with ID: {download_id}")
        
        # Return download URL
        download_url = f"/file/{download_id}"
        
        return jsonify({
            'downloadUrl': download_url,
            'filename': filename,
            'title': title
        })
        
    except Exception as e:
        print(f"Unexpected error in download_video: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/file/<download_id>')
def serve_file(download_id):
    if download_id not in downloads:
        return "File not found or expired", 404
    
    file_info = downloads[download_id]
    file_path = file_info['file_path']
    
    if not os.path.exists(file_path):
        return "File not found", 404
    
    return send_file(
        file_path,
        as_attachment=True,
        download_name=file_info['filename']
    )

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy'})

@app.route('/test')
def test_ytdlp():
    """Test endpoint to check if yt-dlp is working"""
    try:
        # Test with a known working video
        test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(test_url, download=False)
            
        return jsonify({
            'status': 'yt-dlp_working',
            'test_video_title': info.get('title', 'Unknown'),
            'test_video_duration': info.get('duration', 0),
            'formats_available': len(info.get('formats', []))
        })
    except Exception as e:
        return jsonify({
            'status': 'yt-dlp_error',
            'error': str(e),
            'error_type': type(e).__name__
        }), 500

if __name__ == '__main__':
    print("🎬 YouTube Downloader Backend (yt-dlp) starting...")
    print("📡 Server will be available at: http://localhost:5000")
    print("🌐 Frontend should connect to this URL")
    print("🔧 Using yt-dlp for better compatibility")
    print("📝 Check console for download logs")
    print("-" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)
