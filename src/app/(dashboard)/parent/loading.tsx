export default function Loading() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-9 w-48 bg-muted rounded animate-pulse" />
        <div className="h-5 w-72 bg-muted rounded animate-pulse" />
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
            <div className="h-4 w-56 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
        </div>

        {[1, 2].map((i) => (
          <div key={i} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
                <div className="flex items-center gap-4">
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="w-6 h-6 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4">
        <div className="h-6 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-3 w-48 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
