'use client';

import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-lg bg-muted',
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </div>
      <Skeleton className="h-16 w-full mb-4 rounded-xl" />
      <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-border">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-10 w-12" />
      </div>
      <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-10 w-12" />
      </div>
      <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-10 w-12" />
      </div>
      <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-10 w-12" />
      </div>
    </div>
  );
}

export function SkeletonPassCard() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[400px] w-full max-w-sm mx-auto rounded-3xl" />
      <Skeleton className="h-32 w-full max-w-sm mx-auto rounded-2xl" />
    </div>
  );
}

export function SkeletonParentPortal() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-5">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {[1, 2].map((i) => (
          <div key={i} className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-5">
              <Skeleton className="w-12 h-12 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 flex items-center gap-4 border-b border-border last:border-0">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
