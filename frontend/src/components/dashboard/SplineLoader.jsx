import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export const SplineLoader = ({ onLoadingComplete, isLoading }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [initialIframeLoaded, setInitialIframeLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(true);
  // Track if callback has already been called to prevent multiple calls
  const callbackCalledRef = useRef(false);

  // Reset state when component mounts or isLoading becomes true
  useEffect(() => {
    if (isLoading) {
      setFadeOut(false);
      setInitialIframeLoaded(false);
      setShowFallback(true);
      callbackCalledRef.current = false; // Reset callback flag when loading starts
    }
  }, [isLoading]);

  // Animation sequence: Show main animation for 5 seconds, then fade out and open dashboard
  useEffect(() => {
    if (!isLoading || callbackCalledRef.current) return;

    // Wait for everything to be ready before starting animations
    let cleanupFunctions = [];
    
    const startAnimations = () => {
      // Use requestAnimationFrame to ensure smooth start
      requestAnimationFrame(() => {
        // Small delay to ensure CSS and styles are fully loaded
        const cssDelayTimer = setTimeout(() => {
          // Show main animation for 5 seconds, then fade out
          const initialTimer = setTimeout(() => {
            requestAnimationFrame(() => {
              setFadeOut(true);
            });
            
            // After fade out completes, call onLoadingComplete
            const completeTimer = setTimeout(() => {
              if (onLoadingComplete && !callbackCalledRef.current) {
                callbackCalledRef.current = true;
                requestAnimationFrame(() => {
                  onLoadingComplete();
                });
              }
            }, 500); // Smooth transition to dashboard

            cleanupFunctions.push(() => clearTimeout(completeTimer));
          }, 5000); // Main animation for 5 seconds

          // Maximum timeout: if something goes wrong, proceed after 8 seconds
          const maxTimer = setTimeout(() => {
            if (onLoadingComplete && !callbackCalledRef.current) {
              callbackCalledRef.current = true;
              setFadeOut(true);
              setTimeout(() => {
                onLoadingComplete();
              }, 800);
            }
          }, 8000);

          cleanupFunctions.push(
            () => clearTimeout(initialTimer),
            () => clearTimeout(maxTimer)
          );
        }, 100); // Small delay to ensure CSS is loaded
        
        cleanupFunctions.push(() => clearTimeout(cssDelayTimer));
      });
    };

    // Wait for DOM, stylesheets, and fonts to be ready
    const checkReady = () => {
      // Check if document is ready and stylesheets are loaded
      if (document.readyState === 'complete') {
        // Additional check: ensure fonts are loaded
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            startAnimations();
          }).catch(() => {
            // Fallback if fonts.ready fails
            setTimeout(startAnimations, 50);
          });
        } else {
          // Fallback if fonts API not available
          setTimeout(startAnimations, 100);
        }
      } else if (document.readyState === 'interactive') {
        // If interactive, wait a bit more for complete
        window.addEventListener('load', () => {
          setTimeout(startAnimations, 50);
        }, { once: true });
      } else {
        // Wait for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(startAnimations, 100);
        }, { once: true });
      }
    };

    // Start checking immediately
    checkReady();

    // Fallback: ensure animations start even if checks fail
    const fallbackTimer = setTimeout(() => {
      startAnimations();
    }, 500);

    return () => {
      clearTimeout(fallbackTimer);
      // Clean up all timers
      cleanupFunctions.forEach(cleanup => cleanup());
      cleanupFunctions = [];
    };
  }, [isLoading, onLoadingComplete]);

  // Auto-hide fallback after 2 seconds to ensure iframe is visible
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setShowFallback(false);
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  const handleInitialIframeLoad = () => {
    setInitialIframeLoaded(true);
    setShowFallback(false);
  };

  const handleInitialIframeError = () => {
    setInitialIframeLoaded(true);
    setShowFallback(false);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] bg-background flex items-center justify-center",
        "transition-opacity duration-1000 ease-in-out",
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Spline 3D Animation Container - Full Screen */}
      <div className="relative w-full h-full overflow-hidden">
        {/* Main Animation - Shows for 5 seconds */}
        <iframe
          key="main-animation"
          src="https://my.spline.design/prismcoin-VgyBFEJs7VFsxVJi9L05Uvoe/"
          frameBorder="0"
          width="100%"
          height="100%"
          className={cn(
            "w-full h-full absolute inset-0",
            "transition-opacity duration-1000 ease-in-out",
            "opacity-100"
          )}
          onLoad={handleInitialIframeLoad}
          onError={handleInitialIframeError}
          style={{ 
            border: 'none', 
            display: 'block', 
            zIndex: 2,
            willChange: 'opacity'
          }}
        />
        
        {/* Loading Text Overlay */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center z-20">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-primary animate-ping opacity-75" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Loading Dashboard...
            </p>
          </div>
        </div>

        {/* Fallback loading indicator - shown only briefly while iframe loads */}
        {showFallback && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-30 transition-opacity duration-500">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-chart-blue/50 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <p className="text-sm font-medium text-foreground">
                Loading 3D animation...
              </p>
            </div>
          </div>
        )}

        {/* Black overlay to hide "Built with Spline" button in bottom right */}
        <div 
          className="absolute bottom-0 right-0 w-56 h-20 bg-background z-40 pointer-events-none"
        />
      </div>
    </div>
  );
};

