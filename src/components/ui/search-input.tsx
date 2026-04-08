'use client';

import { Search } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition, useState, useEffect, Suspense } from 'react';

function SearchInputContent({ placeholder }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set('q', value);
      } else {
        params.delete('q');
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, pathname, router, searchParams]);

  return (
    <div className="relative max-w-xs w-full flex-1">
      <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isPending ? 'text-blue-500 animate-pulse' : 'text-muted-foreground/50'}`} />
      <input 
        type="text" 
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
      />
    </div>
  );
}

export function SearchInput(props: { placeholder?: string }) {
  return (
    <Suspense fallback={
      <div className="relative max-w-xs w-full flex-1">
        <div className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 h-9" />
      </div>
    }>
      <SearchInputContent {...props} />
    </Suspense>
  );
}
