import { useState } from "react";
import { Beer, Footprints, Star, Info, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BarCardProps {
  name: string;
  distance: number;
  rating?: number;
  type: string;
  latitude: number;
  longitude: number;
  address?: string;
  opening_hours?: string;
  website?: string;
  phone?: string;
  isNearest?: boolean;
  delay?: number;
}

const BarCard = ({ 
  name, 
  distance, 
  rating, 
  type, 
  latitude, 
  longitude,
  address,
  opening_hours,
  phone,
  isNearest = false, 
  delay = 0 
}: BarCardProps) => {
  const [showInfo, setShowInfo] = useState(false);
  
  const footsteps = Math.round(distance / 0.762);
  const walkingMinutes = Math.round(distance / 84);

  const openInMaps = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const mapsUrl = `https://maps.google.com/maps?daddr=${latitude},${longitude}`;
    window.open(mapsUrl, '_blank');
  };

  // Get a quick info snippet (exclude type to avoid duplication)
  const getQuickInfo = () => {
    if (opening_hours) return opening_hours;
    if (phone) return phone;
    if (address) return address.split(',')[0];
    return null;
  };

  const quickInfo = getQuickInfo();

  return (
    <div 
      className={cn(
        "glass-card rounded-2xl p-5 transition-all duration-500 hover:scale-[1.02] animate-fade-in relative",
        isNearest && "gradient-border neon-glow"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {isNearest && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Nearest Bar
          </span>
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      )}
      
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 cursor-pointer" onClick={openInMaps}>
          <h3 className={cn(
            "font-display font-bold text-foreground mb-1 hover:text-primary transition-colors",
            isNearest ? "text-xl" : "text-lg"
          )}>
            {name}
          </h3>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Beer className="h-3 w-3" />
            <span>{type}</span>
            {quickInfo && (
              <>
                <span className="text-border">•</span>
                <span className="truncate max-w-[150px]">{quickInfo}</span>
              </>
            )}
          </div>
        </div>
        {rating && (
          <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-lg">
            <Star className="h-3 w-3 text-primary fill-primary" />
            <span className="text-xs font-medium">{rating}</span>
          </div>
        )}
      </div>

      <div className={cn(
        "rounded-xl p-3 mb-3",
        isNearest ? "bg-primary/10" : "bg-secondary/30"
      )}>
        <div className="flex items-center justify-center gap-3">
          <Footprints className={cn(
            "h-6 w-6",
            isNearest ? "text-primary animate-bounce-subtle" : "text-muted-foreground"
          )} />
          <div className="text-center">
            <p className={cn(
              "font-display font-bold",
              isNearest ? "text-3xl text-primary neon-text" : "text-2xl text-foreground"
            )}>
              {footsteps.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">footsteps • ~{walkingMinutes} min</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowInfo(!showInfo)}
        >
          <Info className="h-3 w-3" />
          <span>info</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={openInMaps}
        >
          <MapPin className="h-3 w-3" />
          <span>map</span>
        </Button>
      </div>

      {/* Quick Info Panel */}
      {showInfo && (
        <div className="absolute inset-0 bg-card/98 backdrop-blur-sm rounded-2xl p-4 z-10 animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <h4 className="font-display font-bold text-base text-foreground">{name}</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-1 -mt-1"
              onClick={() => setShowInfo(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <div className="space-y-1.5 text-sm">
            {phone && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs w-14">Phone</span>
                <a href={`tel:${phone}`} className="text-primary hover:underline text-sm">{phone}</a>
              </div>
            )}
            
            {address && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground text-xs w-14">Address</span>
                <span className="text-foreground flex-1 text-sm">{address}</span>
              </div>
            )}
            
            {opening_hours && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground text-xs w-14">Hours</span>
                <span className="text-foreground flex-1 text-sm">{opening_hours}</span>
              </div>
            )}
            
            {!phone && !address && !opening_hours && (
              <p className="text-muted-foreground text-sm">No additional info available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BarCard;
