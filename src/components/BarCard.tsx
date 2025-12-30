import { Beer, MapPin, Footprints, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarCardProps {
  name: string;
  distance: number; // in meters
  rating?: number;
  type: string;
  isNearest?: boolean;
  delay?: number;
}

const BarCard = ({ name, distance, rating, type, isNearest = false, delay = 0 }: BarCardProps) => {
  // Average stride length is about 0.762 meters
  const footsteps = Math.round(distance / 0.762);
  
  // Walking time estimate (average 1.4 m/s walking speed)
  const walkingMinutes = Math.round(distance / 84);

  return (
    <div 
      className={cn(
        "glass-card rounded-2xl p-6 transition-all duration-500 hover:scale-[1.02] animate-count",
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
        <div>
          <h3 className={cn(
            "font-display font-bold text-foreground mb-1",
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          <span>{distance}m</span>
        </div>
        <span>~{walkingMinutes} min walk</span>
      </div>
    </div>
  );
};

export default BarCard;
