'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="p-2 w-9 h-9" />;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-sm border border-transparent hover:border-border"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun size={18} className="animate-in zoom-in spin-in-90 duration-500" />
      ) : (
        <Moon size={18} className="animate-in zoom-in spin-in-90 duration-500" />
      )}
    </button>
  );
}
