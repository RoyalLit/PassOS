import { SkeletonStats } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-56 bg-muted rounded animate-pulse" />
      </div>

      <SkeletonStats />

      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
            <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-4 w-16 bg-muted rounded-full animate-pulse" />
                    <div className="h-4 w-20 bg-muted rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="h-12 w-full bg-muted rounded-xl mb-4 animate-pulse" />
              <div className="space-y-2 mb-4 pb-4 border-b border-border">
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              </div>
              <div className="flex gap-3">
                <div className="h-10 flex-1 bg-muted rounded-xl animate-pulse" />
                <div className="h-10 flex-1 bg-muted rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
