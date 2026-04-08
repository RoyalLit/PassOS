import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>

      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden divide-y divide-border">
        {/* Section 1 */}
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-24 h-4" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>

        {/* Section 2 */}
        <div className="p-8 space-y-6 bg-muted/5">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-24 h-4" />
          </div>
          <div className="grid gap-6">
            <div className="space-y-2">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        {/* Section 4 */}
        <div className="p-8 bg-muted/10 flex gap-4">
          <Skeleton className="h-12 w-32 rounded-2xl" />
          <Skeleton className="h-12 flex-1 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
