export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-muted rounded animate-pulse" />
          <div className="h-4 w-52 bg-muted rounded animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
          <div className="h-10 w-12 bg-muted rounded animate-pulse" />
        </div>
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
          <div className="h-10 w-12 bg-muted rounded animate-pulse" />
        </div>
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border opacity-50">
          <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
          <div className="h-10 w-12 bg-muted rounded animate-pulse" />
        </div>
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border opacity-50">
          <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
          <div className="h-10 w-12 bg-muted rounded animate-pulse" />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            <div className="h-5 w-6 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
            <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
                    <div className="h-5 w-24 bg-muted rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="h-12 w-full bg-muted rounded-xl mb-4 animate-pulse" />
              <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-border">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
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
