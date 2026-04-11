'use client';

import { useState } from 'react';
import { AppSettings, updateSettings, ParentApprovalMode } from '@/lib/actions/settings';
import { Loader2, Save, MapPin, Navigation, Radius, Users, ShieldCheck, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { Toggle } from '@/components/ui/toggle';

export function SettingsForm({ initialSettings }: { initialSettings: AppSettings }) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleToggle = () => {
    setSettings(prev => ({ ...prev, geofencing_enabled: !prev.geofencing_enabled }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleModeChange = (mode: ParentApprovalMode) => {
    setSettings(prev => ({ ...prev, parent_approval_mode: mode }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(settings);
      router.refresh();
      alert('Settings updated successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Parental Supervision Section */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">Parental Supervision</h3>
            <p className="text-muted-foreground text-sm">Configure when parents should be notified to approve gate pass requests.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => handleModeChange('none')}
            className={clsx(
              "p-4 rounded-2xl border-2 text-left transition-all group",
              settings.parent_approval_mode === 'none' 
                ? "border-blue-600 bg-blue-500/5 ring-4 ring-blue-500/10" 
                : "border-border hover:border-blue-500/30 bg-background/50"
            )}
          >
            <div className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
              settings.parent_approval_mode === 'none' ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground group-hover:bg-muted/80"
            )}>
              <Zap className="w-5 h-5" />
            </div>
            <p className="font-bold text-foreground mb-1">None (Direct)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Skip parents entirely. All requests go directly to admins.</p>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('smart')}
            className={clsx(
              "p-4 rounded-2xl border-2 text-left transition-all group",
              settings.parent_approval_mode === 'smart' 
                ? "border-blue-600 bg-blue-500/5 ring-4 ring-blue-500/10" 
                : "border-border hover:border-blue-500/30 bg-background/50"
            )}
          >
            <div className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
              settings.parent_approval_mode === 'smart' ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground group-hover:bg-muted/80"
            )}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <p className="font-bold text-foreground mb-1">Smart Mode</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Parents approve Overnights/Emergency. Routine outings go to admin.</p>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('all')}
            className={clsx(
              "p-4 rounded-2xl border-2 text-left transition-all group",
              settings.parent_approval_mode === 'all' 
                ? "border-blue-600 bg-blue-500/5 ring-4 ring-blue-500/10" 
                : "border-border hover:border-blue-500/30 bg-background/50"
            )}
          >
            <div className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
              settings.parent_approval_mode === 'all' ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground group-hover:bg-muted/80"
            )}>
              <Users className="w-5 h-5" />
            </div>
            <p className="font-bold text-foreground mb-1">Strict (All)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Every request must be signed off by a parent before admin review.</p>
          </button>
        </div>
      </div>

      {/* Gatepass Reasons Section */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">Gatepass Reasons</h3>
            <p className="text-muted-foreground text-sm">Configure the predefined reasons students can choose from.</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Day Outing Reasons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Day Outing Reasons
              </h4>
              <button
                type="button"
                onClick={() => {
                  const reason = prompt('Enter new reason:');
                  if (reason && reason.trim()) {
                    setSettings(prev => ({
                      ...prev,
                      gatepass_reasons: {
                        ...prev.gatepass_reasons!,
                        day_outing: [...(prev.gatepass_reasons?.day_outing || []), reason.trim()]
                      }
                    }));
                  }
                }}
                className="text-xs font-bold text-white uppercase tracking-widest bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-all shadow-sm shadow-blue-500/20 active:scale-95"
              >
                + Add Reason
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(settings.gatepass_reasons?.day_outing || []).map((reason, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border group hover:border-blue-500/30 transition-all">
                  <span className="text-sm font-medium text-foreground/90">{reason}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSettings(prev => ({
                        ...prev,
                        gatepass_reasons: {
                          ...prev.gatepass_reasons!,
                          day_outing: prev.gatepass_reasons?.day_outing.filter((_, i) => i !== idx) || []
                        }
                      }));
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Radius className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Overnight Reasons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Overnight Reasons
              </h4>
              <button
                type="button"
                onClick={() => {
                  const reason = prompt('Enter new reason:');
                  if (reason && reason.trim()) {
                    setSettings(prev => ({
                      ...prev,
                      gatepass_reasons: {
                        ...prev.gatepass_reasons!,
                        overnight: [...(prev.gatepass_reasons?.overnight || []), reason.trim()]
                      }
                    }));
                  }
                }}
                className="text-xs font-bold text-white uppercase tracking-widest bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg transition-all shadow-sm shadow-purple-500/20 active:scale-95"
              >
                + Add Reason
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(settings.gatepass_reasons?.overnight || []).map((reason, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border group hover:border-blue-500/30 transition-all">
                  <span className="text-sm font-medium text-foreground/90">{reason}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSettings(prev => ({
                        ...prev,
                        gatepass_reasons: {
                          ...prev.gatepass_reasons!,
                          overnight: prev.gatepass_reasons?.overnight.filter((_, i) => i !== idx) || []
                        }
                      }));
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Radius className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60 italic">&ldquo;Other&rdquo; is automatically appended to the end of both lists and provides a text field for students.</p>
        </div>
      </div>

      {/* Geofencing Section */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b border-border">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${settings.geofencing_enabled ? 'bg-blue-500/10 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg">Geofencing Validation</h3>
              <p className="text-muted-foreground text-sm">Require students to be within campus boundaries to request a pass.</p>
            </div>
          </div>
          <Toggle
            enabled={settings.geofencing_enabled}
            onChange={handleToggle}
          />
        </div>

        {settings.geofencing_enabled && (
          <div className="grid sm:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground/50" />
                Latitude
              </label>
              <input
                type="number"
                step="0.000001"
                name="campus_lat"
                value={settings.campus_lat}
                onChange={handleChange}
                className="w-full rounded-xl border-border border px-4 py-2.5 bg-background focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-foreground font-medium"
                placeholder="28.6139"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground/50" />
                Longitude
              </label>
              <input
                type="number"
                step="0.000001"
                name="campus_lng"
                value={settings.campus_lng}
                onChange={handleChange}
                className="w-full rounded-xl border-border border px-4 py-2.5 bg-background focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-foreground font-medium"
                placeholder="77.2090"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                <Radius className="w-4 h-4 text-muted-foreground/50" />
                Radius (meters)
              </label>
              <input
                type="number"
                step="10"
                name="campus_radius_meters"
                value={settings.campus_radius_meters}
                onChange={handleChange}
                className="w-full rounded-xl border-border border px-4 py-2.5 bg-background focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-foreground font-medium"
                placeholder="500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isSaving}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-[0.98]"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Save Settings
        </button>
      </div>
    </form>
  );
}
