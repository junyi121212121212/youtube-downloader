import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Link as LinkIcon, Settings } from "lucide-react";

interface OEmbedMeta {
  title: string;
  author_name: string;
  thumbnail_url: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]{11}(?:[&#?].*)?$/i;

const getBackendConfig = () => ({
  url: localStorage.getItem("ytBackendUrl") || "",
  key: localStorage.getItem("ytBackendKey") || "",
});

export default function YouTubeDownloader() {
  const [url, setUrl] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [meta, setMeta] = useState<OEmbedMeta | null>(null);
  const [format, setFormat] = useState<"mp4" | "mp3">("mp4");
  const [quality, setQuality] = useState("1080p");
  const [openSettings, setOpenSettings] = useState(false);
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
    const cfg = getBackendConfig();
    if (!cfg.url) {
      setOpenSettings(true);
      toast.info("Connect a backend to enable downloads.");
      return;
    }
    if (!meta) {
      toast.error("Load video info first.");
      return;
    }

    const promise = (async () => {
      const res = await fetch(`${cfg.url.replace(/\/$/, "")}/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cfg.key ? { Authorization: `Bearer ${cfg.key}` } : {}),
        },
        body: JSON.stringify({ url, format, quality }),
      });
      if (!res.ok) throw new Error("Backend error – check settings");
      const data = await res.json();
      if (data?.downloadUrl) {
        window.location.href = data.downloadUrl;
      } else {
        throw new Error("No download URL returned");
      }
    })();

    toast.promise(promise, {
      loading: "Preparing download…",
      success: "Download ready!",
      error: (e) => e.message || "Failed to prepare download",
    });
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
                        <Button onClick={tryDownload} variant="hero" className="flex-1">
                          <Download /> Download
                        </Button>
                        <Dialog open={openSettings} onOpenChange={setOpenSettings}>
                          <DialogTrigger asChild>
                            <Button variant="outline" title="Backend settings">
                              <Settings />
                            </Button>
                          </DialogTrigger>
                          <BackendSettings onClose={() => setOpenSettings(false)} />
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!meta && (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                Tip: use the Preview button to load title and thumbnail. Downloads require connecting a backend.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function BackendSettings({ onClose }: { onClose?: () => void }) {
  const [url, setUrl] = useState(localStorage.getItem("ytBackendUrl") || "");
  const [key, setKey] = useState(localStorage.getItem("ytBackendKey") || "");

  const save = () => {
    localStorage.setItem("ytBackendUrl", url.trim());
    localStorage.setItem("ytBackendKey", key.trim());
    toast.success("Backend saved");
    onClose?.();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Connect a backend</DialogTitle>
        <DialogDescription>
          Set your API endpoint that prepares download links. We'll POST {"{"} url, format, quality {"}"} to /download.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="backend-url">Backend base URL</Label>
          <Input
            id="backend-url"
            placeholder="https://your-api.example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="backend-key">API key (optional)</Label>
          <Input
            id="backend-key"
            placeholder="Bearer token or secret"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="hero" onClick={save}>Save</Button>
        </div>
      </div>
    </DialogContent>
  );
}
