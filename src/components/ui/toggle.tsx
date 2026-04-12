'use client';

import { clsx } from 'clsx';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  variant?: 'blue' | 'purple';
}

export function Toggle({ 
  enabled, 
  onChange, 
  disabled = false,
  size = 'md',
  variant = 'blue'
}: ToggleProps) {
  const isBlue = variant === 'blue';
  
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={clsx(
        'relative rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2',
        size === 'sm' ? 'h-6 w-10' : 'h-7 w-12',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        enabled
          ? isBlue ? 'bg-blue-600' : 'bg-purple-600'
          : 'bg-muted border-2 border-border',
        enabled ? 'focus:ring-blue-500' : 'focus:ring-slate-400'
      )}
    >
      <span
        className={clsx(
          'absolute top-1 rounded-full bg-white shadow-md transition-all duration-300',
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
          enabled
            ? size === 'sm' ? 'translate-x-5' : 'translate-x-6'
            : 'translate-x-1'
        )}
      />
    </button>
  );
}
