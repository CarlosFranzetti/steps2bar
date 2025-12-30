import { useEffect, useState } from "react";
import { Footprints } from "lucide-react";

interface FootstepCounterProps {
  targetSteps: number;
  isAnimating: boolean;
}

const FootstepCounter = ({ targetSteps, isAnimating }: FootstepCounterProps) => {
  const [displaySteps, setDisplaySteps] = useState(0);

  useEffect(() => {
    if (!isAnimating) {
      setDisplaySteps(0);
      return;
    }

    const duration = 800; // faster animation
    const steps = 60;
    const increment = targetSteps / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetSteps) {
        setDisplaySteps(targetSteps);
        clearInterval(timer);
      } else {
        setDisplaySteps(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [targetSteps, isAnimating]);

  return (
    <div className="text-center py-6">
      <div className="inline-flex items-center justify-center gap-4 mb-1">
        <Footprints className={`h-12 w-12 text-primary transition-transform duration-200 -mr-1 ${isAnimating && displaySteps < targetSteps ? 'scale-110' : ''}`} />
        <p className="font-display text-6xl md:text-7xl font-bold text-primary neon-text">
          {displaySteps.toLocaleString()}
        </p>
      </div>
      <p className="text-lg text-muted-foreground">
        footsteps to your next drink
      </p>
    </div>
  );
};

export default FootstepCounter;
