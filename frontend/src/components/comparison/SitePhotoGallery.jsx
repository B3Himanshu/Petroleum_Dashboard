import { useState, useEffect, useMemo } from "react";
import { Image, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Use the real site photo from /public/sites/ — same source as SiteCard and Metrics Comparison. */
function buildSlides(siteId) {
  return [{ src: `/sites/site-${siteId}.jpg`, label: "Site Photo" }];
}

const generatePlaceholder = (text, width = 800, height = 600) => {
  const fontSize = width < 200 ? 14 : 24;
  const escapedText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a1a"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${escapedText}</text>
</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const SitePhotoGallery = ({ siteId, siteName }) => {
  const slides = useMemo(() => (siteId ? buildSlides(siteId) : []), [siteId]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState(new Set());

  useEffect(() => {
    if (!siteId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setImageErrors(new Set());
    setCurrentIndex(0);
    const t = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(t);
  }, [siteId]);

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  if (loading && siteId) {
    return (
      <div className="chart-card h-64 animate-pulse">
        <div className="flex h-full items-center justify-center">
          <div className="text-muted-foreground">Loading photos...</div>
        </div>
      </div>
    );
  }

  if (!siteId || slides.length === 0) {
    return (
      <div className="chart-card h-64">
        <div className="flex h-full flex-col items-center justify-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Image className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{siteName}</p>
            <p className="mt-1 text-xs text-muted-foreground">No photos available</p>
          </div>
        </div>
      </div>
    );
  }

  const slide = slides[currentIndex];

  return (
    <div className="chart-card animate-slide-up">
      <div className="mb-3 sm:mb-4">
        <h3 className="mb-1 text-base sm:text-lg font-semibold text-foreground">{siteName}</h3>
        <p className="text-xs text-muted-foreground">
          Site photo from{" "}
          <code className="rounded bg-muted px-1">public/sites/</code>
        </p>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        <img
          src={imageErrors.has(currentIndex) ? generatePlaceholder(siteName, 800, 600) : slide.src}
          alt={`${siteName} — ${slide.label}`}
          className="h-full w-full object-cover"
          onError={(e) => {
            if (!imageErrors.has(currentIndex)) {
              setImageErrors((prev) => new Set(prev).add(currentIndex));
              e.target.src = generatePlaceholder(siteName, 800, 600);
            }
          }}
        />

        {slides.length > 1 && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
              onClick={prevPhoto}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
              onClick={nextPhoto}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              {currentIndex + 1} / {slides.length}
            </div>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {slides.map((photo, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-20 w-28 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                index === currentIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border opacity-60 hover:opacity-100"
              )}
            >
              <img
                src={photo.src}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.src = generatePlaceholder(String(index + 1), 80, 80);
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
