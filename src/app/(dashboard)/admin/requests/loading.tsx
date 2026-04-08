import { SkeletonStats } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-muted rounded animate-pulse" />
      </div>

      <SkeletonStats />

      <div className="space-y-4">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2">
                  <div className="h-6 w-40 bg-muted rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
                    <div className="h-5 w-24 bg-muted rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="h-16 w-full bg-muted rounded-xl mb-4 animate-pulse" />
              <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-border">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
              </div>
              <div className="flex justify-end gap-3">
                <div className="h-10 w-24 bg-muted rounded-xl animate-pulse" />
                <div className="h-10 w-32 bg-muted rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
