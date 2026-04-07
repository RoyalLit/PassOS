'use client';

import { Loader2, MapPin, AlertCircle, Clock, Calendar, ArrowLeft } from 'lucide-react';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRequestSchema, type CreateRequestInput } from '@/lib/validators/request-schema';
import { REQUEST_TYPES, PREDEFINED_REASONS } from '@/lib/constants';
import { getSettings, AppSettings } from '@/lib/actions/settings';
import { isWithinCampus } from '@/lib/geo/campus-boundary';
import { RequestIcon } from '@/components/requests/request-icon';
import { clsx } from 'clsx';
import Link from 'next/link';

function NewRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const extensionOf = searchParams.get('extension_of');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [geoStatus, setGeoStatus] = useState<'checking' | 'valid' | 'invalid' | 'disabled'>('checking');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<any>({
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
    }
  });

  const requestType = watch('request_type');
  const selectedReason = watch('reason');

  useEffect(() => {
    async function init() {
      try {
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
      } catch (error) {
        console.error('Error initializing page:', error);
        setGeoStatus('disabled');
      }
    }
    init();
  }, []);

  const onSubmit = async (formData: any) => {
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

    const finalReason = formData.reason === 'Other' 
      ? `Other: ${formData.manual_reason}` 
      : formData.reason;

    const payload: CreateRequestInput = {
      request_type: formData.request_type,
      reason: extensionOf ? `EXTENSION of ${extensionOf}: ${finalReason}` : finalReason,
      destination: formData.destination,
      departure_at,
      return_by,
      geo_lat: 0, // Fallback
      geo_lng: 0, // Fallback
    };

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit request');
      }

      router.push('/student');
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {extensionOf ? 'Request Extension' : 'New Pass Request'}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {extensionOf ? 'Update your return time for your active pass.' : 'Select your outing type and details below.'}
          </p>
        </div>
        <Link 
          href="/student" 
          className="p-2.5 rounded-xl bg-white border shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
      </div>

      <div className="bg-white rounded-3xl border shadow-xl shadow-slate-200/50 overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="divide-y divide-slate-100">
          
          {/* Section 1: Type Selection */}
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Outing Type</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(REQUEST_TYPES).map(([key, config]) => (
                <label key={key} className={clsx(
                  "relative border-2 rounded-2xl p-5 cursor-pointer transition-all group flex flex-col items-center gap-3 text-center",
                  requestType === key 
                    ? "border-blue-600 bg-blue-50/50 ring-4 ring-blue-50" 
                    : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                )}>
                  <input 
                    type="radio" 
                    value={key} 
                    className="sr-only" 
                    {...register('request_type')} 
                  />
                  <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
                    config.color === 'blue' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                  )}>
                    <RequestIcon iconName={config.icon} className="w-6 h-6" />
                  </div>
                  <div>
                    <span className={clsx(
                      "block font-bold text-lg",
                      requestType === key ? "text-blue-900" : "text-slate-600"
                    )}>{config.label}</span>
                    <span className="text-xs font-medium text-slate-400">
                      {key === 'day_outing' ? 'Single day return' : 'Multi-day stay'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Timing */}
          <div className="p-8 space-y-6 bg-slate-50/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Schedule</h2>
            </div>

            {requestType === 'day_outing' ? (
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Outing Date</label>
                  <input 
                    type="date" 
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                    {...register('outing_date')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Time Out</label>
                    <input 
                      type="time" 
                      className="w-full rounded-xl border-slate-200 border px-4 py-3 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                      {...register('time_out')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Time In</label>
                    <input 
                      type="time" 
                      className="w-full rounded-xl border-slate-200 border px-4 py-3 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                      {...register('time_in')}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Departure</p>
                    <div className="space-y-2">
                      <input type="date" className="w-full border-none p-0 focus:ring-0 font-bold text-lg" {...register('start_date')} />
                      <input type="time" className="w-full border-none p-0 focus:ring-0 text-slate-500 font-medium" {...register('time_out')} />
                    </div>
                  </div>
                  <div className="space-y-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Return By</p>
                    <div className="space-y-2">
                      <input type="date" className="w-full border-none p-0 focus:ring-0 font-bold text-lg" {...register('end_date')} />
                      <input type="time" className="w-full border-none p-0 focus:ring-0 text-slate-500 font-medium" {...register('time_in')} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Details */}
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Destination</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input 
                    type="text"
                    required
                    placeholder="Where are you going?"
                    className="w-full rounded-xl border-slate-200 border pl-12 pr-4 py-3.5 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-400"
                    {...register('destination')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Reason</label>
                <select 
                  required
                  className="w-full rounded-xl border-slate-200 border px-4 py-3.5 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium appearance-none"
                  {...register('reason')}
                >
                  <option value="">Select a reason...</option>
                  {(settings?.gatepass_reasons?.[requestType as 'day_outing' | 'overnight'] || 
                    PREDEFINED_REASONS[requestType as keyof typeof PREDEFINED_REASONS])?.map((r: string) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>

              {selectedReason === 'Other' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-bold text-slate-700 px-1 flex justify-between">
                    Specify Reason <span className="text-red-500 text-[10px] font-black uppercase">Mandatory</span>
                  </label>
                  <textarea 
                    required
                    placeholder="Please explain your outing in detail..."
                    className="w-full rounded-xl border-slate-200 border px-4 py-3 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-400 min-h-[100px] resize-none"
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
                  <div className={clsx(
                    "p-2 rounded-lg",
                    geoStatus === 'valid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  )}>
                    {geoStatus === 'checking' ? <Loader2 className="animate-spin w-5 h-5" /> : 
                     geoStatus === 'valid' ? <MapPin className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Location Verification</p>
                    <p className="text-sm font-medium">
                      {geoStatus === 'checking' ? 'Establishing secure GPS link...' :
                       geoStatus === 'valid' ? 'Inside Campus Perimeter' :
                       'Outside Campus Perimeter'}
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

          <div className="p-8 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-white hover:text-slate-900 transition-all border border-transparent hover:border-slate-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || geoStatus === 'checking'}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                'Transmit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={
      <div className="p-12 flex justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    }>
      <NewRequestForm />
    </Suspense>
  );
}
