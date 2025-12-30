import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationButtonProps {
  onClick: () => void;
  isLoading: boolean;
  hasLocation: boolean;
}

const LocationButton = ({ onClick, isLoading, hasLocation }: LocationButtonProps) => {
  return (
    <Button
      onClick={onClick}
      variant={hasLocation ? "glass" : "neon"}
      size="lg"
      className="group justify-center text-sm scale-[0.87]"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Finding you...</span>
        </>
      ) : hasLocation ? (
        <>
          <MapPin className="h-5 w-5 text-primary" />
          <span>Update Location</span>
        </>
      ) : (
        <>
          <MapPin className="h-5 w-5 group-hover:animate-bounce" />
          <span>Find Nearby Bars</span>
        </>
      )}
    </Button>
  );
};

export default LocationButton;
