import { useState, useEffect, useMemo, memo } from "react";
import { MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { sitesAPI } from "@/services/api";

// City coordinates configuration with optimized bounding box for city-specific views
// Delta values control the bounding box size - larger = wider view
// For city views, we use 0.05-0.08 degrees which gives a good city-level zoom
const cityMapConfig = {
  // New cities from sites data
  southampton: { lat: 50.9097, lon: -1.4044, delta: 0.06 },
  guildford: { lat: 51.2362, lon: -0.5704, delta: 0.06 },
  exmouth: { lat: 50.6192, lon: -3.4140, delta: 0.06 },
  truro: { lat: 50.2632, lon: -5.0510, delta: 0.08 },
  luton: { lat: 51.8797, lon: -0.4175, delta: 0.06 },
  peterborough: { lat: 52.5739, lon: -0.2508, delta: 0.06 },
  warrington: { lat: 53.3929, lon: -2.5964, delta: 0.06 },
  wisbech: { lat: 52.6661, lon: 0.1595, delta: 0.06 },
  huddersfield: { lat: 53.6458, lon: -1.7850, delta: 0.06 },
  oldham: { lat: 53.5409, lon: -2.1114, delta: 0.06 },
  matlock: { lat: 53.1384, lon: -1.5556, delta: 0.06 },
  stafford: { lat: 52.8067, lon: -2.1168, delta: 0.06 },
  birmingham: { lat: 52.4862, lon: -1.8904, delta: 0.08 },
  weymouth: { lat: 50.6144, lon: -2.4576, delta: 0.06 },
  lydney: { lat: 51.7247, lon: -2.5303, delta: 0.06 },
  evesham: { lat: 52.0925, lon: -1.9475, delta: 0.06 },
  crawley: { lat: 51.1090, lon: -0.1872, delta: 0.06 },
  dudley: { lat: 52.5087, lon: -2.0877, delta: 0.06 },
  shrewsbury: { lat: 52.7073, lon: -2.7553, delta: 0.06 },
  burnley: { lat: 53.7893, lon: -2.2405, delta: 0.06 },
  yeovil: { lat: 50.9406, lon: -2.6349, delta: 0.06 },
  rotherham: { lat: 53.4308, lon: -1.3567, delta: 0.06 },
  "bury-st-edmunds": { lat: 52.2469, lon: 0.7116, delta: 0.08 },
};

// UK bounding box for overall view
const UK_BOUNDS = {
  west: -8.0,
  south: 49.8,
  east: 2.0,
  north: 61.0
};

// UK bounding box string for OpenStreetMap embed (comma-separated)
const UK_BBOX = `${UK_BOUNDS.west},${UK_BOUNDS.south},${UK_BOUNDS.east},${UK_BOUNDS.north}`;

// Calculate bounding box for a city
const calculateCityBoundingBox = (cityKey) => {
  if (!cityKey || cityKey === 'all' || !cityMapConfig[cityKey]) {
    return null;
  }
  
  const { lat, lon, delta } = cityMapConfig[cityKey];
  const d = delta ?? 0.06;
  
  return {
    south: lat - d,
    north: lat + d,
    west: lon - d,
    east: lon + d,
    lat,
    lon
  };
};

// Build map URL based on selected city using bounding box (OpenStreetMap embed format)
const buildMapSrc = (selectedCity) => {
  // If no city selected or 'all', show UK overview
  if (!selectedCity || selectedCity === 'all' || !cityMapConfig[selectedCity]) {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${UK_BBOX}&layer=mapnik`;
  }

  const bboxData = calculateCityBoundingBox(selectedCity);
  if (!bboxData) {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${UK_BBOX}&layer=mapnik`;
  }

  // Build OpenStreetMap embed URL with bounding box
  // Format: bbox=west,south,east,north (comma-separated, not URL encoded)
  const bbox = `${bboxData.west},${bboxData.south},${bboxData.east},${bboxData.north}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
};

// Calculate pin position for overlay (for city-specific views)
const calculatePinPosition = (cityKey) => {
  if (!cityKey || cityKey === 'all' || !cityMapConfig[cityKey]) {
    return null;
  }
  
  // For bbox maps with marker, pin is at center (50%, 50%)
  return {
    top: '50%',
    left: '50%',
  };
};

// CityMap component for dashboard
const CityMapComponent = ({ selectedSite = 'all' }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapKey, setMapKey] = useState(0); // Force iframe reload with key change
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Fetch site data from API
  useEffect(() => {
    if (!selectedSite || selectedSite === 'all') {
      setSiteData(null);
      return;
    }

    const fetchSite = async () => {
      try {
        setLoading(true);
        const data = await sitesAPI.getById(selectedSite);
        setSiteData(data);
      } catch (error) {
        console.error('Error fetching site data:', error);
        setSiteData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSite();
  }, [selectedSite]);
  
  // Combined memoization: get site data and derive all related values in one useMemo
  const siteDataAndCity = useMemo(() => {
    if (!selectedSite || selectedSite === 'all' || !siteData) {
      return {
        siteData: null,
        selectedCity: 'all',
        cityName: 'United Kingdom',
        siteName: null,
        mapSrc: buildMapSrc('all'),
        pinPosition: null
      };
    }
    
    const selectedCity = siteData.city;
    const cityName = siteData.cityDisplay || siteData.name;
    const siteName = siteData.name;
    const mapSrc = buildMapSrc(selectedCity);
    
    // Calculate pin position (centered for city views)
    const pinPosition = calculatePinPosition(selectedCity);
    
    return {
      siteData,
      selectedCity,
      cityName,
      siteName,
      mapSrc,
      pinPosition
    };
  }, [selectedSite, siteData]);
  
  // Reset map loaded state and force iframe reload when site changes
  useEffect(() => {
    setMapLoaded(false);
    // Force iframe reload by changing key
    setMapKey(prev => prev + 1);
  }, [selectedSite]);

  return (
    <div className="chart-card mb-4 lg:mb-6 animate-slide-up">
      {/* Map Header */}
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Location Overview</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Navigation className="w-3 h-3" />
              {siteDataAndCity.siteName ? `${siteDataAndCity.siteName}, ${siteDataAndCity.cityName}` : siteDataAndCity.cityName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-xs font-semibold text-primary">Interactive Map</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative rounded-2xl border border-border/50 overflow-hidden bg-card shadow-lg">
        {/* Loading Overlay */}
        {!mapLoaded && (
          <div className="absolute inset-0 bg-card/90 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center space-y-3">
              <div className="relative">
                <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}

        {/* Map Frame */}
        <div className="relative w-full h-[400px] lg:h-[500px]">
          <iframe
            key={`map-${selectedSite}-${mapKey}`}
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight="0"
            marginWidth="0"
            src={siteDataAndCity.mapSrc}
            style={{ border: 0, pointerEvents: "none" }}
            title={`Map view of ${siteDataAndCity.siteName || siteDataAndCity.cityName}`}
            onLoad={() => {
              setMapLoaded(true);
            }}
            onError={() => {
              setMapLoaded(true); // Show map even if there's an error
            }}
            className={cn(
              "transition-opacity duration-500",
              mapLoaded ? "opacity-100" : "opacity-0"
            )}
            tabIndex="-1"
            allowFullScreen={false}
          />

          {/* City Pin Marker - Only show when map is loaded and a specific city is selected */}
          {mapLoaded && siteDataAndCity.pinPosition && siteDataAndCity.selectedCity !== 'all' && (
            <div
              className="absolute z-20 pointer-events-none animate-fade-in"
              style={{
                top: siteDataAndCity.pinPosition.top,
                left: siteDataAndCity.pinPosition.left,
                transform: 'translate(-50%, -100%)', // Center pin on coordinates, pin point at bottom
              }}
            >
              <div className="relative">
                {/* Pin Shadow */}
                <div className="absolute top-1 left-1 w-10 h-10 bg-black/20 rounded-full blur-sm" />
                {/* Red Pin Icon */}
                <MapPin className="w-10 h-10 text-red-500 drop-shadow-lg" fill="#ef4444" stroke="#dc2626" strokeWidth={1.5} />
                {/* Red Pulse Animation */}
                <div className="absolute top-0 left-0 w-10 h-10 rounded-full bg-red-500/30 animate-ping" style={{ transform: 'translate(-50%, -50%)', top: '50%', left: '50%' }} />
              </div>
            </div>
          )}

          {/* City Info Badge - Bottom Left */}
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
            <div className="bg-card/95 backdrop-blur-md rounded-lg px-4 py-2.5 border border-border/50 shadow-lg">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Selected Location</p>
                  <p className="text-sm font-bold text-foreground">{siteDataAndCity.cityName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative gradient corners */}
          <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none rounded-br-full" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-chart-blue/5 to-transparent pointer-events-none rounded-tl-full" />
        </div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export const CityMap = memo(CityMapComponent);