import { SkeletonPassCard } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {[1, 2].map((i) => (
          <SkeletonPassCard key={i} />
        ))}
      </div>
    </div>
  );
}
