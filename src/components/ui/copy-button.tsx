'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className={clsx(
        "p-2 rounded-xl border transition-all active:scale-95",
        copied 
          ? "bg-green-50 border-green-200 text-green-600" 
          : "bg-white hover:border-blue-200 text-slate-400 hover:text-blue-600"
      )}
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}
