import { useState, useEffect, useRef } from "react";
import { Beer, AlertCircle } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useFetchBars } from "@/hooks/useFetchBars";
import BarCard from "@/components/BarCard";
import FootstepCounter from "@/components/FootstepCounter";
import LocationButton from "@/components/LocationButton";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { latitude, longitude, error: geoError, isLoading: geoLoading, getLocation } = useGeolocation();
  const { bars, isLoading: barsLoading, error: barsError, fetchBars } = useFetchBars();
  const [showBars, setShowBars] = useState(false);
  const { toast } = useToast();
  const hasFetchedRef = useRef(false);

  const hasLocation = latitude !== null && longitude !== null;
  const nearestBar = bars[0];
  const isLoading = geoLoading || barsLoading;
  const error = geoError || barsError;

  // Fetch bars when location is available (either saved or fresh)
  useEffect(() => {
    if (hasLocation && latitude && longitude && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchBars(latitude, longitude).then((fetchedBars) => {
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
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-6">
            <Beer className="h-10 w-10 text-primary animate-float" />
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Steps<span className="text-primary">2</span>Bar
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Because knowing the exact number of footsteps to your next drink is essential information.
          </p>
        </header>

        {/* Main content */}
        <div className="max-w-2xl mx-auto">
          {/* Location button */}
          <div className="text-center mb-8">
            <LocationButton
              onClick={getLocation}
              isLoading={isLoading}
              hasLocation={hasLocation}
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
              {bars.map((bar, index) => (
                <BarCard
                  key={bar.id}
                  name={bar.name}
                  distance={bar.distance}
                  type={bar.type}
                  isNearest={index === 0}
                  delay={index * 100}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!showBars && !isLoading && (
            <div className="text-center py-16">
              <div className="glass-card rounded-2xl p-8 max-w-sm mx-auto">
                <Beer className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Tap the button above to discover how many footsteps stand between you and refreshment.
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
