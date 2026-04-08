export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex justify-between items-center gap-4">
            <div className="h-10 w-full max-w-sm bg-muted rounded-lg animate-pulse" />
            <div className="h-10 w-20 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/10 border-b border-border text-sm">
                <th className="px-6 py-4 font-medium"><div className="h-3 w-16 bg-muted-foreground/20 rounded animate-pulse" /></th>
                <th className="px-6 py-4 font-medium"><div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" /></th>
                <th className="px-6 py-4 font-medium"><div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" /></th>
                <th className="px-6 py-4 font-medium"><div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" /></th>
                <th className="px-6 py-4 font-medium"><div className="h-3 w-16 bg-muted-foreground/20 rounded animate-pulse" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                      <div className="space-y-1">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="h-3 w-40 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
