import { MapPin } from "lucide-react";
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
      size="default"
      className="group justify-center text-sm font-medium px-6 h-11"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <MapPin className="h-4 w-4" />
          <span>Finding you...</span>
        </>
      ) : hasLocation ? (
        <>
          <MapPin className="h-4 w-4 text-primary" />
          <span>Update Location</span>
        </>
      ) : (
        <>
          <MapPin className="h-4 w-4 group-hover:animate-bounce" />
          <span>Find Nearby Bars</span>
        </>
      )}
    </Button>
  );
};

export default LocationButton;
