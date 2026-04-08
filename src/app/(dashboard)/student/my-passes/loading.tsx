export default function Loading() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-28 bg-muted rounded animate-pulse" />
          <div className="h-4 w-52 bg-muted rounded animate-pulse" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-4">
            <div className="bg-card rounded-3xl shadow-xl border border-border overflow-hidden">
              <div className="h-40 bg-blue-600 animate-pulse" />
              <div className="p-8 pb-10 flex flex-col items-center">
                <div className="w-[220px] h-[220px] bg-muted rounded-2xl animate-pulse" />
                <div className="mt-10 w-full space-y-4">
                  <div className="bg-muted/30 p-5 rounded-2xl border border-border space-y-3">
                    <div className="flex justify-between">
                      <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="flex justify-between border-t border-border pt-3">
                      <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="h-3 w-32 bg-muted rounded mx-auto animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm max-w-sm mx-auto">
              <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-full bg-muted rounded animate-pulse mb-1" />
              <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
