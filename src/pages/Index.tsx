import { useState, useEffect, useRef } from "react";
import { Beer, AlertCircle, ChevronDown } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useFetchBars, Bar } from "@/hooks/useFetchBars";
import BarCard from "@/components/BarCard";
import FootstepCounter from "@/components/FootstepCounter";
import LocationButton from "@/components/LocationButton";
import LocationInput from "@/components/LocationInput";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BARS_PER_PAGE = 20;

const Index = () => {
  const { latitude, longitude, error: geoError, isLoading: geoLoading, getLocation, setManualLocation } = useGeolocation();
  const { bars, isLoading: barsLoading, error: barsError, fetchBars } = useFetchBars();
  const [showBars, setShowBars] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BARS_PER_PAGE);
  const [showTagline, setShowTagline] = useState(true);
  const { toast } = useToast();
  const hasFetchedRef = useRef(false);

  const hasLocation = latitude !== null && longitude !== null;
  const nearestBar = bars[0];
  const isLoading = geoLoading || barsLoading;
  const error = geoError || barsError;

  const visibleBars = bars.slice(0, visibleCount);
  const hasMoreBars = visibleCount < bars.length;

  const handleManualLocation = (lat: number, lng: number) => {
    setManualLocation(lat, lng);
  };

  const loadMoreBars = () => {
    setVisibleCount((prev) => Math.min(prev + BARS_PER_PAGE, bars.length));
  };

  // Fetch bars when location is available
  useEffect(() => {
    if (hasLocation && latitude && longitude && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      setVisibleCount(BARS_PER_PAGE);
      fetchBars(latitude, longitude).then((fetchedBars: Bar[]) => {
        if (fetchedBars.length > 0) {
          setShowBars(true);
          toast({
            title: "Location found!",
            description: `Found ${fetchedBars.length} bars near you.`,
          });
        } else {
          toast({
            title: "No bars found",
            description: "No bars found nearby. Try a different location.",
            variant: "destructive",
          });
        }
      });
    }
  }, [latitude, longitude, hasLocation]);

  // Reset fetch flag when location is cleared
  useEffect(() => {
    if (!hasLocation) {
      hasFetchedRef.current = false;
      setShowBars(false);
      setVisibleCount(BARS_PER_PAGE);
    }
  }, [hasLocation]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  return (
    <main className="min-h-screen bg-background">
      {/* Background gradient effect */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="container relative z-10 py-12 px-4">
        {/* Header */}
        <header className={`text-center ${showTagline ? 'mb-12' : 'mb-8'}`}>
          <div 
            className="inline-flex items-center justify-center gap-3 mb-4 cursor-pointer"
            onClick={() => setShowTagline(true)}
          >
            <Beer className="h-10 w-10 text-primary animate-float" />
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Steps<span className="text-primary">2</span>Bar
            </h1>
          </div>
          {showTagline && (
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Because knowing the exact number of footsteps to your next drink is essential information.
            </p>
          )}
        </header>

        {/* Main content */}
        <div className="max-w-2xl mx-auto">
          {/* Location controls */}
          <div className="space-y-4 mb-8">
            <div className="text-center">
              <LocationButton
                onClick={() => {
                  setShowTagline(false);
                  getLocation();
                }}
                isLoading={isLoading}
                hasLocation={hasLocation}
              />
            </div>
            
            <LocationInput
              onLocationFound={(lat, lng) => {
                setShowTagline(false);
                handleManualLocation(lat, lng);
              }}
              isLoading={isLoading}
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="glass-card rounded-xl p-4 mb-8 flex items-center gap-3 border-destructive/50">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {/* Footstep counter */}
          {showBars && nearestBar && (
            <FootstepCounter
              targetSteps={Math.round(nearestBar.distance / 0.762)}
              isAnimating={showBars}
            />
          )}

          {/* Bar list */}
          {showBars && bars.length > 0 && (
            <div className="space-y-4 mt-8">
              <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                Nearby Bars
              </h2>
              {visibleBars.map((bar, index) => (
                <BarCard
                  key={bar.id}
                  name={bar.name}
                  distance={bar.distance}
                  type={bar.type}
                  latitude={bar.latitude}
                  longitude={bar.longitude}
                  address={bar.address}
                  openingHours={bar.opening_hours}
                  website={bar.website}
                  phone={bar.phone}
                  isNearest={index === 0}
                  delay={index * 100}
                />
              ))}
              
              {hasMoreBars && (
                <div className="text-center pt-4">
                  <Button
                    variant="glass"
                    size="lg"
                    onClick={loadMoreBars}
                    className="gap-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                    More Bars ({bars.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!showBars && !isLoading && (
            <div className="text-center py-16">
              <div className="glass-card rounded-2xl p-8 max-w-sm mx-auto">
                <Beer className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Tap the button above or enter an address to discover how many footsteps stand between you and refreshment.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-sm text-muted-foreground">
          <p>Please drink responsibly. Average stride: 0.762m</p>
        </footer>
      </div>
    </main>
  );
};

export default Index;
