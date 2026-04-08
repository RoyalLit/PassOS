export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-36 bg-muted rounded animate-pulse" />
        <div className="h-4 w-80 bg-muted rounded animate-pulse" />
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium"><div className="h-3 w-12 bg-muted-foreground/20 rounded animate-pulse" /></th>
                <th className="px-6 py-4 font-medium"><div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" /></th>
                <th className="px-6 py-4 font-medium"><div className="h-3 w-16 bg-muted-foreground/20 rounded animate-pulse" /></th>
                <th className="px-6 py-4 font-medium"><div className="h-3 w-16 bg-muted-foreground/20 rounded animate-pulse" /></th>
                <th className="px-6 py-4 font-medium"><div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
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
