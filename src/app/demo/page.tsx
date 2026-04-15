'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DemoPortal } from '@/components/demo/demo-portal';

export default function DemoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 animate-pulse" />}>
      <DemoContent />
    </Suspense>
  );
}

function DemoContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') || 'student';

  return (
    <div className="min-h-screen bg-white selection:bg-blue-100 selection:text-blue-900">
      <DemoPortal initialRole={initialRole} />
    </div>
  );
}
