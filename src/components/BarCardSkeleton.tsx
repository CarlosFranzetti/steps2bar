import { Skeleton } from "@/components/ui/skeleton";

const BarCardSkeleton = () => {
  return (
    <div className="glass-card rounded-2xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-6 w-12 rounded-lg" />
      </div>

      <div className="rounded-xl p-3 mb-2 bg-secondary/30">
        <div className="flex items-center justify-center gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <div className="text-center">
            <Skeleton className="h-8 w-20 mb-1 mx-auto" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-14 rounded" />
      </div>
    </div>
  );
};

export default BarCardSkeleton;
