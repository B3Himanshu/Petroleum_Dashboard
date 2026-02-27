import { useState, useEffect } from "react";
import { Image, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sitesAPI } from "@/services/api";
import { cn } from "@/lib/utils";

// Generate SVG placeholder as data URI
const generatePlaceholder = (text, width = 800, height = 600) => {
  const fontSize = width < 200 ? 14 : 24;
  const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a1a"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${escapedText}</text>
</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const SitePhotoGallery = ({ siteId, siteName }) => {
  const [photos, setPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState(new Set());

  useEffect(() => {
    if (!siteId) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    // Fetch site photos - using local station images
    // Cycle through the 6 station images for each site
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        // Use local station images from public folder
        // Each site gets 3 unique photos from the 6 available images
        // Distribute images so different sites get different images for comparison
        // Use siteId to create unique starting points that ensure variety
        const startImage = ((siteId - 1) % 6) + 1; // Start image (1-6)
        
        // Take 3 consecutive images, wrapping around if needed
        const image1 = startImage;
        const image2 = ((startImage % 6) + 1);
        const image3 = (((startImage + 1) % 6) + 1);
        
        const sitePhotos = [
          `/station-${image1}.jpg`,
          `/station-${image2}.jpg`,
          `/station-${image3}.jpg`,
        ];
        
        setPhotos(sitePhotos);
        setImageErrors(new Set()); // Reset image errors when photos change
        setCurrentIndex(0); // Reset to first image
      } catch (error) {
        console.error('Error fetching site photos:', error);
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [siteId]);

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  if (loading) {
    return (
      <div className="chart-card h-64 animate-pulse">
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading photos...</div>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="chart-card h-64">
        <div className="flex flex-col items-center justify-center h-full space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Image className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{siteName}</p>
            <p className="text-xs text-muted-foreground mt-1">No photos available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card animate-slide-up">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-1">{siteName}</h3>
        <p className="text-xs text-muted-foreground">
          {photos.length} photo{photos.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
        <img
          src={imageErrors.has(currentIndex) ? generatePlaceholder(siteName, 800, 600) : photos[currentIndex]}
          alt={`${siteName} - Photo ${currentIndex + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            if (!imageErrors.has(currentIndex)) {
              setImageErrors(prev => new Set(prev).add(currentIndex));
              e.target.src = generatePlaceholder(siteName, 800, 600);
            }
          }}
        />

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={prevPhoto}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={nextPhoto}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}

        {/* Photo Counter */}
        {photos.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-xs">
            {currentIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {photos.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                index === currentIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border opacity-60 hover:opacity-100"
              )}
            >
              <img
                src={photo}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  if (!imageErrors.has(index)) {
                    setImageErrors(prev => new Set(prev).add(index));
                    e.target.src = generatePlaceholder(`${index + 1}`, 80, 80);
                  } else {
                    e.target.src = generatePlaceholder(`${index + 1}`, 80, 80);
                  }
                }}
                onLoad={() => {
                  // Remove from errors if image loads successfully
                  if (imageErrors.has(index)) {
                    setImageErrors(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(index);
                      return newSet;
                    });
                  }
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

