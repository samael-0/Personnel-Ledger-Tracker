import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-pill" />
          <Skeleton className="h-6 w-28 rounded-pill" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 sm:h-28 w-full" />
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>

      <Skeleton className="h-64 w-full" />
    </div>
  );
}

