'use client';

import { useState, useEffect } from 'react';
import { Loader2, MapPin, AlertCircle, Clock, Calendar, ArrowLeft, User, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { REQUEST_TYPES, PREDEFINED_REASONS } from '@/lib/constants';
import { getSettings, AppSettings } from '@/lib/actions/settings';
import { isWithinCampus } from '@/lib/geo/campus-boundary';
import { RequestIcon } from '@/components/requests/request-icon';
import { clsx } from 'clsx';
import Link from 'next/link';

interface LinkedStudent {
  id: string;
  full_name: string;
  email: string;
  hostel: string | null;
  room_number: string | null;
}

export default function ParentRequestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [geoStatus, setGeoStatus] = useState<'checking' | 'valid' | 'invalid' | 'disabled'>('checking');
  const [linkedStudent, setLinkedStudent] = useState<LinkedStudent | null>(null);
  const [parentName, setParentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      request_type: 'day_outing',
      outing_date: new Date().toISOString().split('T')[0],
      time_out: '09:00',
      time_in: '21:00',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      reason: '',
      manual_reason: '',
      destination: '',
    },
  });

  const requestType = watch('request_type');
  const selectedReason = watch('reason');
  const startDate = watch('start_date');
  const endDate = watch('end_date');

  useEffect(() => {
    async function init() {
      try {
        // Fetch linked student info
        const profileRes = await fetch('/api/profile');
        if (!profileRes.ok) throw new Error('Failed to load profile');
        const profileData = await profileRes.json();
        setParentName(profileData.data?.full_name || 'Parent');

        // Fetch linked student via parent requests endpoint
        const requestsRes = await fetch('/api/parent/requests');
        if (!requestsRes.ok) throw new Error('Failed to load linked student');
        const requestsData = await requestsRes.json();
        
        if (!requestsData.student) {
          setError('No linked student found. Please link with your ward first from the Parent Portal.');
          setLoading(false);
          return;
        }
        
        setLinkedStudent(requestsData.student);

        const s = await getSettings();
        setSettings(s);

        if (!s.geofencing_enabled) {
          setGeoStatus('disabled');
          return;
        }

        if (!navigator.geolocation) {
          setGeoStatus('invalid');
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const valid = isWithinCampus(
              latitude,
              longitude,
              s.campus_lat,
              s.campus_lng,
              s.campus_radius_meters
            );
            setGeoStatus(valid ? 'valid' : 'invalid');
          },
          () => {
            setGeoStatus('invalid');
          },
          { enableHighAccuracy: true }
        );
      } catch (err) {
        console.error('Error initializing page:', err);
        setGeoStatus('disabled');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const onSubmit = async (formData: Record<string, string>) => {
    if (!linkedStudent) return;
    setIsSubmitting(true);

    let departure_at: string;
    let return_by: string;

    if (formData.request_type === 'day_outing') {
      departure_at = new Date(`${formData.outing_date}T${formData.time_out}`).toISOString();
      return_by = new Date(`${formData.outing_date}T${formData.time_in}`).toISOString();
    } else {
      departure_at = new Date(`${formData.start_date}T${formData.time_out}`).toISOString();
      return_by = new Date(`${formData.end_date}T${formData.time_in}`).toISOString();
    }

    const finalReason =
      formData.reason === 'Other'
        ? `Other: ${formData.manual_reason}`
        : formData.reason;

    const payload = {
      request_type: formData.request_type,
      reason: finalReason,
      destination: formData.destination,
      departure_at,
      return_by,
      geo_lat: 0,
      geo_lng: 0,
    };

    try {
      const res = await fetch('/api/parent/request-for-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit request');
      }

      router.push('/parent');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 flex items-start gap-4 text-red-500 shadow-sm">
          <AlertCircle className="shrink-0 mt-0.5 w-6 h-6" />
          <div>
            <p className="font-bold text-lg text-foreground">Unable to proceed</p>
            <p className="text-sm mt-1 text-muted-foreground">{error}</p>
            <Link
              href="/parent"
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-red-700 transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Parent Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            Request for {linkedStudent?.full_name || 'Student'}
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Initiate a pass request on behalf of your ward.
          </p>
        </div>
        <Link
          href="/parent"
          className="p-2.5 rounded-xl bg-card border border-border shadow-sm hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
      </div>

      {/* Parent & Student Info Banner */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20 p-5 flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-0.5">Requested By</p>
            <p className="font-bold text-foreground">{parentName}</p>
          </div>
        </div>
        <div className="hidden sm:block w-px bg-purple-500/20" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-0.5">Pass Holder (Ward)</p>
            <p className="font-bold text-foreground">{linkedStudent?.full_name}</p>
            {(linkedStudent?.hostel || linkedStudent?.room_number) && (
              <p className="text-xs text-muted-foreground">
                {[linkedStudent?.hostel, linkedStudent?.room_number].filter(Boolean).join(' - Room ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border shadow-xl shadow-black/5 overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="divide-y divide-border">
          {/* Section 1: Type Selection */}
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <h2 className="font-bold text-foreground uppercase tracking-widest text-xs">Outing Type</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Object.entries(REQUEST_TYPES).map(([key, config]) => (
                <label
                  key={key}
                  className={clsx(
                    'relative border-2 rounded-2xl p-5 cursor-pointer transition-all group flex flex-col items-center gap-3 text-center',
                    requestType === key
                      ? 'border-purple-600 bg-purple-500/5 ring-4 ring-purple-500/10'
                      : 'border-border hover:border-purple-500/30 hover:bg-muted/50'
                  )}
                >
                  <input type="radio" value={key} className="sr-only" {...register('request_type')} />
                  <div
                    className={clsx(
                      'w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm',
                      config.color === 'blue' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                    )}
                  >
                    <RequestIcon iconName={config.icon} className="w-6 h-6" />
                  </div>
                  <div>
                    <span
                      className={clsx(
                        'block font-bold text-lg',
                        requestType === key ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'
                      )}
                    >
                      {config.label}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground/60">
                      {key === 'day_outing' ? 'Single day return' : 'Multi-day stay'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Timing */}
          <div className="p-8 space-y-6 bg-muted/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="font-bold text-foreground uppercase tracking-widest text-xs">Schedule</h2>
            </div>

            {requestType === 'day_outing' ? (
              <div className="grid gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-foreground/80">Outing Date</label>
                    <span className="text-[10px] font-black uppercase text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      Same Day Return Only
                    </span>
                  </div>
                  <input
                    type="date"
                    className="w-full rounded-xl border-border border px-4 py-3 bg-background focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-medium"
                    {...register('outing_date')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/80">Time Out</label>
                    <input
                      type="time"
                      className="w-full rounded-xl border-border border px-4 py-3 bg-background focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-medium"
                      {...register('time_out')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/80">Time In</label>
                    <input
                      type="time"
                      className="w-full rounded-xl border-border border px-4 py-3 bg-background focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-medium"
                      {...register('time_in')}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Departure
                    </p>
                    <div className="space-y-2">
                      <input
                        type="date"
                        className="w-full border-none p-0 focus:ring-0 font-bold text-lg bg-transparent"
                        {...register('start_date')}
                      />
                      <input
                        type="time"
                        className="w-full border-none p-0 focus:ring-0 text-muted-foreground font-medium bg-transparent"
                        {...register('time_out')}
                      />
                    </div>
                  </div>
                  <div className="space-y-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Return By
                    </p>
                    <div className="space-y-2">
                      <input
                        type="date"
                        className="w-full border-none p-0 focus:ring-0 font-bold text-lg bg-transparent"
                        {...register('end_date')}
                      />
                      <input
                        type="time"
                        className="w-full border-none p-0 focus:ring-0 text-muted-foreground font-medium bg-transparent"
                        {...register('time_in')}
                      />
                    </div>
                  </div>
                </div>
                {startDate === endDate && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-black text-amber-500 flex items-center justify-center gap-2 uppercase tracking-widest">
                    <AlertCircle className="w-4 h-4" /> Overnight pass requires at least one night stay
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Details */}
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground/50" />
                <input
                  type="text"
                  required
                  placeholder="Where will your ward be going?"
                  className="w-full rounded-xl border-border border pl-12 pr-4 py-3.5 bg-background focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-medium placeholder:text-muted-foreground/40"
                  {...register('destination')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80">Reason</label>
              <select
                required
                className="w-full rounded-xl border-border border px-4 py-3.5 bg-background focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-medium appearance-none"
                {...register('reason')}
              >
                <option value="" className="bg-card">
                  Select a reason...
                </option>
                {(settings?.gatepass_reasons?.[requestType as 'day_outing' | 'overnight'] ||
                  PREDEFINED_REASONS[requestType as keyof typeof PREDEFINED_REASONS])?.map((r: string) => (
                  <option key={r} value={r} className="bg-card">
                    {r}
                  </option>
                ))}
                <option value="Other" className="bg-card">
                  Other
                </option>
              </select>
            </div>

            {selectedReason === 'Other' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-bold text-foreground/80 px-1 flex justify-between">
                  Specify Reason <span className="text-red-500 text-[10px] font-black uppercase">Mandatory</span>
                </label>
                <textarea
                  required
                  placeholder="Please explain the outing in detail..."
                  className="w-full rounded-xl border-border border px-4 py-3 bg-muted/20 focus:bg-background focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-medium placeholder:text-muted-foreground/40 min-h-[100px] resize-none"
                  {...register('manual_reason', { required: selectedReason === 'Other' })}
                />
              </div>
            )}
          </div>

          {/* Section 4: Location Check */}
          {geoStatus !== 'disabled' && (
            <div className="px-8 py-6 bg-slate-900 text-white">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'p-2 rounded-lg',
                      geoStatus === 'valid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    )}
                  >
                    {geoStatus === 'checking' ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : geoStatus === 'valid' ? (
                      <MapPin className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Location Verification
                    </p>
                    <p className="text-sm font-medium">
                      {geoStatus === 'checking'
                        ? 'Establishing secure GPS link...'
                        : geoStatus === 'valid'
                          ? 'Inside Campus Perimeter'
                          : 'Outside Campus Perimeter'}
                    </p>
                  </div>
                </div>
                {geoStatus === 'valid' && (
                  <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-black text-green-400 uppercase tracking-tighter">
                    Verified
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-8 bg-muted/10 flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-8 py-4 rounded-2xl font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-transparent hover:border-border active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || geoStatus === 'checking'}
              className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
