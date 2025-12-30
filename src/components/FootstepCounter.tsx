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

    const duration = 1500; // 1.5 seconds
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
      <div className="inline-flex items-center justify-center gap-4 mb-3">
        <Footprints className={`h-14 w-14 text-primary transition-transform duration-300 ${isAnimating && displaySteps < targetSteps ? 'animate-bounce scale-110' : 'animate-bounce-subtle'}`} />
      </div>
      <p className="font-display text-6xl md:text-7xl font-bold text-primary neon-text mb-1">
        {displaySteps.toLocaleString()}
      </p>
      <p className="text-lg text-muted-foreground">
        footsteps to your next drink
      </p>
    </div>
  );
};

export default FootstepCounter;
