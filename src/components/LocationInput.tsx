import { useState } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LocationInputProps {
  onLocationFound: (lat: number, lng: number) => void;
  isLoading: boolean;
}

const LocationInput = ({ onLocationFound, isLoading }: LocationInputProps) => {
  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter city or address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-4 bg-card/60 border-border/50"
            disabled={isLoading || searching}
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
