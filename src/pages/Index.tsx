import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import YouTubeDownloader from "@/components/downloader/YouTubeDownloader";
import { Download } from "lucide-react";

const Index = () => {
  useEffect(() => {
    document.title = "YouTube Downloader — Fast, Free, No Fuss";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Fast YouTube Downloader frontend. Paste a link, preview the video, and prepare MP4 or MP3 downloads in seconds.");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="hero-gradient">
        <div className="container py-16 md:py-24 text-center text-primary-foreground">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Fast YouTube Downloader</h1>
          <p className="mt-4 text-base md:text-lg opacity-90">Paste a link, preview instantly, and prepare MP4/MP3 downloads.</p>
          <div className="mt-8 flex items-center justify-center">
            <Button variant="hero" size="lg">
              <Download /> Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 md:py-12 space-y-12">
        <YouTubeDownloader />

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg border p-6 elevated-card">
            <h3 className="text-lg font-semibold">1. Paste</h3>
            <p className="text-sm text-muted-foreground mt-2">Drop your YouTube link and validate instantly.</p>
          </div>
          <div className="rounded-lg border p-6 elevated-card">
            <h3 className="text-lg font-semibold">2. Preview</h3>
            <p className="text-sm text-muted-foreground mt-2">We fetch title and thumbnail via public oEmbed.</p>
          </div>
          <div className="rounded-lg border p-6 elevated-card">
            <h3 className="text-lg font-semibold">3. Download</h3>
            <p className="text-sm text-muted-foreground mt-2">Connect your backend to generate download links.</p>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container py-8 text-sm text-muted-foreground">
          Built with ❤️ on Lovable. This is a frontend-only demo; connect your API to enable downloads.
        </div>
      </footer>
    </div>
  );
};

export default Index;
