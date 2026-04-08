import { Suspense } from 'react';
import { LandingContent } from '@/components/landing/landing-content';

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LandingContent />
    </Suspense>
  );
}
