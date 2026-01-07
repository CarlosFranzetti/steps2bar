import { useState } from "react";
import { MapPin, Search, Loader2, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LocationInputProps {
  onLocationFound: (lat: number, lng: number) => void;
  isLoading: boolean;
  onRequestGeolocation?: () => void;
}

const LocationInput = ({ onLocationFound, isLoading, onRequestGeolocation }: LocationInputProps) => {
  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geolocating, setGeolocating] = useState(false);

  const searchLocation = async () => {
    if (!address.trim()) return;
    
    setSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'Steps2Bar/1.0'
          }
        }
      );
      
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon } = data[0];
        onLocationFound(parseFloat(lat), parseFloat(lon));
      } else {
        setError("Location not found. Try a different address.");
      }
    } catch {
      setError("Failed to search location. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchLocation();
    }
  };

  const handleGeolocation = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    
    setGeolocating(true);
    setError(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        onLocationFound(latitude, longitude);
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'User-Agent': 'Steps2Bar/1.0' } }
          );
          const data = await response.json();
          if (data.display_name) {
            setAddress(data.display_name);
          }
        } catch {
          // Address lookup failed, but location was found
        }
        
        setGeolocating(false);
        if (onRequestGeolocation) onRequestGeolocation();
      },
      (err) => {
        setError("Unable to get your location. Please enter an address.");
        setGeolocating(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button
            type="button"
            onClick={handleGeolocation}
            disabled={isLoading || searching || geolocating}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-primary/20 transition-colors disabled:opacity-50"
            title="Use my current location"
          >
            {geolocating ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>
          <Input
            type="text"
            placeholder="Enter city or address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-4 bg-card/60 border-border/50"
            disabled={isLoading || searching || geolocating}
          />
        </div>
        <Button
          onClick={searchLocation}
          disabled={isLoading || searching || !address.trim()}
          variant="glass"
          size="icon"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

export default LocationInput;
