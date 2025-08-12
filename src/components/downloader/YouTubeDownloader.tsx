import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, Link as LinkIcon } from "lucide-react";

interface OEmbedMeta {
  title: string;
  author_name: string;
  thumbnail_url: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]{11}(?:[&#?].*)?$/i;

const getBackendConfig = () => ({
  url: "http://localhost:5000",
  key: "",
});

export default function YouTubeDownloader() {
  const [url, setUrl] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [meta, setMeta] = useState<OEmbedMeta | null>(null);
  const [format, setFormat] = useState<"mp4" | "mp3">("mp4");
  const [quality, setQuality] = useState("1080p");
  const [downloading, setDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsValid(YT_REGEX.test(url.trim()));
  }, [url]);

  // Interactive spotlight effect
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--spot-x", `${x}%`);
      el.style.setProperty("--spot-y", `${y}%`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch (e) {
      toast.error("Clipboard access denied. Paste manually.");
    }
  };

  const fetchMeta = async () => {
    if (!isValid) {
      toast.error("Enter a valid YouTube link.");
      return;
    }
    setLoadingMeta(true);
    setMeta(null);
    try {
      const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await fetch(oembed);
      if (!res.ok) throw new Error("Could not fetch video info");
      const data: OEmbedMeta = await res.json();
      setMeta(data);
      toast.success("Video info loaded");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load info");
    } finally {
      setLoadingMeta(false);
    }
  };
 
  const qualityOptions = useMemo(() => {
    return format === "mp4"
      ? ["1080p", "720p", "480p", "360p"]
      : ["320 kbps", "192 kbps", "128 kbps"];
  }, [format]);

  const tryDownload = async () => {
    if (!meta) {
      toast.error("Load video info first.");
      return;
    }

    setDownloading(true);

    try {
      const cfg = getBackendConfig();

      // Prepare a filename and, if available, prompt the user to choose where to save FIRST
      const suggestedName = meta?.title
        ? `${meta.title}.${format === 'mp3' ? 'mp3' : 'mp4'}`
        : (format === 'mp3' ? 'audio.mp3' : 'video.mp4');

      let saveHandle: any | null = null;
      const hasSavePicker = typeof (window as any).showSaveFilePicker === 'function';
      if (hasSavePicker) {
        try {
          const types = format === 'mp3'
            ? [{ description: 'MP3 Audio', accept: { 'audio/mpeg': ['.mp3'] } }]
            : [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }];
          // Call picker immediately during the user gesture
          saveHandle = await (window as any).showSaveFilePicker({ suggestedName, types });
        } catch (pickerErr: any) {
          // If the user cancels the picker, abort gracefully
          if (pickerErr && (pickerErr.name === 'AbortError' || pickerErr.code === 20)) {
            toast.info('Save cancelled');
            setDownloading(false);
            return;
          }
          // For other picker errors, continue with fallback later
          console.warn('Save picker error, will fallback later:', pickerErr);
          saveHandle = null;
        }
      }

      // Check if backend is running
      try {
        await fetch(`${cfg.url}/health`);
      } catch (e) {
        toast.error("Backend not running. Please start the Python server first.");
        setDownloading(false);
        return;
      }

      console.log("Sending download request:", { url, format, quality });

      const res = await fetch(`${cfg.url}/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, format, quality }),
      });

      console.log("Response status:", res.status);

      if (!res.ok) {
        let errorMessage = "Download failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      if (data?.downloadUrl) {
        const downloadUrl = `${cfg.url}${data.downloadUrl}`;
        const finalName = data.filename || (format === 'mp3' ? 'audio.mp3' : 'video.mp4');

        try {
          const fileRes = await fetch(downloadUrl);
          if (!fileRes.ok) throw new Error('Failed to fetch file for saving');

          if (saveHandle && fileRes.body && 'WritableStream' in window) {
            // Stream directly to the file chosen by the user
            const writable = await saveHandle.createWritable();
            await (fileRes.body as any).pipeTo(writable as any);
            toast.success(`✅ Download Complete! Saved: ${finalName}`);
          } else if (typeof (window as any).showSaveFilePicker === 'function') {
            // If picker is available but we didn't open it earlier, open now as a fallback
            const types = format === 'mp3'
              ? [{ description: 'MP3 Audio', accept: { 'audio/mpeg': ['.mp3'] } }]
              : [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }];
            const handle = await (window as any).showSaveFilePicker({ suggestedName: finalName, types });
            const writable = await handle.createWritable();
            await (fileRes.body as any).pipeTo(writable as any);
            toast.success(`✅ Download Complete! Saved: ${finalName}`);
          } else {
            // Fallback: Blob + anchor with filename
            const blob = await fileRes.blob();
            const urlObj = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = urlObj;
            a.download = finalName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(urlObj);
            toast.success(`✅ Download Complete! Started: ${finalName}`);
          }
        } catch (saveErr: any) {
          console.error('Save error, falling back to direct download:', saveErr);
          // Last resort: open server URL (browser decides where to save)
          window.open(downloadUrl, '_blank');
          toast.success(`✅ Download Complete! File opened in new tab: ${finalName}`);
        }
      } else {
        throw new Error('No download URL returned');
      }
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(error.message || "Failed to download video");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section ref={containerRef} className="interactive-spotlight">
      <div className="mx-auto max-w-3xl">
        <Card className="elevated-card">
          <CardHeader>
            <CardTitle className="text-2xl">YouTube Downloader</CardTitle>
            <CardDescription>Paste a link, preview, and get MP4/MP3.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="yt-url">YouTube URL</Label>
              <div className="flex gap-2">
                <Input
                  id="yt-url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  aria-invalid={!isValid && url.length > 0}
                />
                <Button variant="secondary" onClick={pasteFromClipboard} title="Paste from clipboard">
                  <LinkIcon /> Paste
                </Button>
                <Button variant="hero" onClick={fetchMeta} disabled={!isValid || loadingMeta}>
                  {loadingMeta ? "Loading…" : "Preview"}
                </Button>
              </div>
            </div>

            {meta && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="md:col-span-1">
                  <div className="overflow-hidden rounded-md border bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={meta.thumbnail_url}
                      alt={`${meta.title} thumbnail`}
                      loading="lazy"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold leading-snug truncate">{meta.title}</h3>
                    <p className="text-sm text-muted-foreground">by {meta.author_name}</p>
                  </div>

                  <Tabs value={format} onValueChange={(v) => setFormat(v as any)}>
                    <TabsList>
                      <TabsTrigger value="mp4">MP4 (Video)</TabsTrigger>
                      <TabsTrigger value="mp3">MP3 (Audio)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="mp4" className="mt-3" />
                    <TabsContent value="mp3" className="mt-3" />
                  </Tabs>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Quality</Label>
                      <Select value={quality} onValueChange={setQuality}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                        <SelectContent>
                          {qualityOptions.map((q) => (
                            <SelectItem key={q} value={q}>
                              {q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Actions</Label>
                      <div className="flex gap-2">
                        <Button
                          onClick={tryDownload}
                          variant="hero"
                          className="flex-1"
                          disabled={downloading}
                        >
                          <Download /> {downloading ? "Downloading..." : "Download"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!meta && (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                Tip: use the Preview button to load title and thumbnail. Make sure the Python backend is running on port 5000.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
