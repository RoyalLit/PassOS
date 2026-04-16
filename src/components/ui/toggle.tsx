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
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2',
        size === 'sm' ? 'h-6 w-10' : 'h-7 w-12',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        enabled
          ? isBlue ? 'bg-blue-600' : 'bg-purple-600'
          : 'bg-muted',
        enabled ? 'focus:ring-blue-500' : 'focus:ring-slate-400'
      )}
    >
      <span
        className={clsx(
          'pointer-events-none inline-block rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out',
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
          enabled
            ? size === 'sm' ? 'translate-x-5' : 'translate-x-6'
            : 'translate-x-0'
        )}
      />
    </button>
  );
}
