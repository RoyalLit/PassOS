'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Sun, Moon, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Toggle } from '@/components/ui/toggle';
import type { PassTimeLimit } from '@/types';

const PASS_TYPE_INFO: Record<string, { label: string; icon: typeof Sun; color: string; description: string }> = {
  day_outing: {
    label: 'Day Outing',
    icon: Sun,
    color: 'blue',
    description: 'Short outings within a single day',
  },
  overnight: {
    label: 'Overnight',
    icon: Moon,
    color: 'purple',
    description: 'Passes that extend past midnight',
  },
  emergency: {
    label: 'Emergency',
    icon: AlertCircle,
    color: 'red',
    description: 'Urgent exits requiring immediate approval',
  },
  medical: {
    label: 'Medical',
    icon: AlertCircle,
    color: 'green',
    description: 'Medical appointments and health-related exits',
  },
};

export function TimeLimitsForm({ initialLimits }: { initialLimits: PassTimeLimit[] }) {
  const router = useRouter();
  const [limits, setLimits] = useState<PassTimeLimit[]>(initialLimits);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleToggle = (passType: string) => {
    setLimits(prev => prev.map(limit => 
      limit.pass_type === passType 
        ? { ...limit, enabled: !limit.enabled }
        : limit
    ));
    setSaved(false);
  };

  const handleTimeChange = (passType: string, field: 'allowed_start' | 'allowed_end', value: string) => {
    setLimits(prev => prev.map(limit => 
      limit.pass_type === passType 
        ? { ...limit, [field]: value || null }
        : limit
    ));
    setSaved(false);
  };

  const handleDurationChange = (passType: string, value: string) => {
    setLimits(prev => prev.map(limit => 
      limit.pass_type === passType 
        ? { ...limit, max_duration_hours: value ? parseFloat(value) : null }
        : limit
    ));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaved(false);
    
    try {
      const response = await fetch('/api/admin/time-limits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limits }),
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save time limits');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Time Limits */}
      <div className="space-y-4">
        {limits.map(limit => {
          const info = PASS_TYPE_INFO[limit.pass_type] || {
            label: limit.pass_type,
            icon: Clock,
            color: 'gray',
            description: '',
          };
          const Icon = info.icon;
          const colorClasses = {
            blue: 'bg-blue-500/10 text-blue-600',
            purple: 'bg-purple-500/10 text-purple-600',
            red: 'bg-red-500/10 text-red-600',
            green: 'bg-green-500/10 text-green-600',
            gray: 'bg-gray-500/10 text-gray-600',
          };
          
          return (
            <div 
              key={limit.pass_type}
              className={clsx(
                'bg-card rounded-2xl border shadow-sm overflow-hidden transition-all',
                limit.enabled ? 'border-blue-500/30' : 'border-border opacity-75'
              )}
            >
              {/* Header */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    colorClasses[info.color as keyof typeof colorClasses]
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{info.label}</h3>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </div>
                </div>
                <Toggle
                  enabled={limit.enabled}
                  onChange={() => handleToggle(limit.pass_type)}
                />
              </div>
              
              {/* Settings */}
              {limit.enabled && (
                <div className="px-6 pb-6 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="h-px bg-border mx-[-24px] mb-4" />
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    {/* Time Window */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Allowed Time Window
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                          <input
                            type="time"
                            value={limit.allowed_start || ''}
                            onChange={(e) => handleTimeChange(limit.pass_type, 'allowed_start', e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <span className="text-muted-foreground mt-5">to</span>
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">End</label>
                          <input
                            type="time"
                            value={limit.allowed_end || ''}
                            onChange={(e) => handleTimeChange(limit.pass_type, 'allowed_end', e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Leave blank for no time restrictions
                      </p>
                    </div>
                    
                    {/* Max Duration */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Maximum Duration
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="72"
                          value={limit.max_duration_hours || ''}
                          onChange={(e) => handleDurationChange(limit.pass_type, e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-12 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="No limit"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          hours
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Maximum time from departure to return
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isSaving}
          className={clsx(
            'px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-[0.98]',
            saved 
              ? 'bg-green-500 text-white shadow-green-500/20'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
            isSaving && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saved ? 'Saved!' : 'Save Time Limits'}
        </button>
      </div>
    </form>
  );
}
