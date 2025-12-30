import { useState } from "react";
import { Beer, Footprints, Star, Info, MapPin, X, ExternalLink } from "lucide-react";
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
  openingHours?: string;
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
  openingHours,
  website,
  phone,
  isNearest = false, 
  delay = 0 
}: BarCardProps) => {
  const [showInfo, setShowInfo] = useState(false);
  
  // Average stride length is about 0.762 meters
  const footsteps = Math.round(distance / 0.762);
  
  // Walking time estimate (average 1.4 m/s walking speed)
  const walkingMinutes = Math.round(distance / 84);

  const openInMaps = () => {
    // Universal link that works on iOS, Android, and desktop
    const mapsUrl = `https://maps.google.com/maps?daddr=${latitude},${longitude}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div 
      className={cn(
        "glass-card rounded-2xl p-6 transition-all duration-500 hover:scale-[1.02] animate-count relative",
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
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 cursor-pointer" onClick={openInMaps}>
          <h3 className={cn(
            "font-display font-bold text-foreground mb-1 hover:text-primary transition-colors",
            isNearest ? "text-2xl" : "text-xl"
          )}>
            {name}
          </h3>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Beer className="h-4 w-4" />
            <span>{type}</span>
          </div>
        </div>
        {rating && (
          <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-lg">
            <Star className="h-4 w-4 text-primary fill-primary" />
            <span className="text-sm font-medium">{rating}</span>
          </div>
        )}
      </div>

      <div className={cn(
        "rounded-xl p-4 mb-4",
        isNearest ? "bg-primary/10" : "bg-secondary/30"
      )}>
        <div className="flex items-center justify-center gap-3">
          <Footprints className={cn(
            "h-8 w-8",
            isNearest ? "text-primary animate-bounce-subtle" : "text-muted-foreground"
          )} />
          <div className="text-center">
            <p className={cn(
              "font-display font-bold",
              isNearest ? "text-4xl text-primary neon-text" : "text-3xl text-foreground"
            )}>
              {footsteps.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">footsteps away</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">~{walkingMinutes} min walk</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setShowInfo(!showInfo)}
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={openInMaps}
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Info Panel */}
      {showInfo && (
        <div className="absolute inset-0 bg-card/95 backdrop-blur-sm rounded-2xl p-6 z-10 animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <h4 className="font-display font-bold text-lg text-foreground">{name}</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-2 -mt-2"
              onClick={() => setShowInfo(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Beer className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">{type}</span>
            </div>
            
            {address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">{address}</span>
              </div>
            )}
            
            {openingHours && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">🕐</span>
                <span className="text-muted-foreground">{openingHours}</span>
              </div>
            )}
            
            {phone && (
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">📞</span>
                <a href={`tel:${phone}`} className="text-primary hover:underline">{phone}</a>
              </div>
            )}
            
            {website && (
              <div className="flex items-start gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5" />
                <a 
                  href={website.startsWith('http') ? website : `https://${website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  {website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            
            <div className="pt-3 border-t border-border/50">
              <Button onClick={openInMaps} variant="default" size="sm" className="w-full">
                <MapPin className="h-4 w-4 mr-2" />
                Open in Maps
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarCard;
