'use client';

import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRequestSchema, type CreateRequestInput } from '@/lib/validators/request-schema';
import { REQUEST_TYPES } from '@/lib/constants';
import { getSettings, AppSettings } from '@/lib/actions/settings';
import { isWithinCampus } from '@/lib/geo/campus-boundary';
import { RequestIcon } from '@/components/requests/request-icon';
import { clsx } from 'clsx';

export default function NewRequestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [geoStatus, setGeoStatus] = useState<'checking' | 'valid' | 'invalid' | 'disabled'>('checking');

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
        setGeoStatus('disabled'); // Fallback to disabled on error
      }
    }
    init();
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<CreateRequestInput>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      request_type: 'day_outing',
      departure_at: getNextHour(),
      return_by: getNextHour(4),
      proof_urls: [],
    }
  });

  function getNextHour(addHours = 1) {
    const d = new Date();
    d.setHours(d.getHours() + addHours);
    d.setMinutes(0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  const onSubmit = async (data: CreateRequestInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">New Pass Request</h1>
        <p className="text-slate-500">Submit a new gate pass request for approval.</p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Geo Validation Badge - Only shown if enabled */}
          {geoStatus !== 'disabled' && (
            <div className={`p-4 rounded-xl flex items-start gap-3 transition-all duration-300 ${
              geoStatus === 'checking' ? 'bg-blue-50 text-blue-700' :
              geoStatus === 'valid' ? 'bg-green-50 text-green-700' :
              'bg-red-50 text-red-700'
            }`}>
              {geoStatus === 'checking' ? <Loader2 className="animate-spin shrink-0" /> : 
               geoStatus === 'valid' ? <MapPin className="shrink-0" /> : <AlertCircle className="shrink-0" />}
              <div>
                <p className="font-semibold text-sm">
                  {geoStatus === 'checking' ? 'Verifying location...' :
                   geoStatus === 'valid' ? 'Campus Location Verified' :
                   'Location Verification Failed'}
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  {geoStatus === 'checking' ? 'Please allow location access if prompted.' :
                   geoStatus === 'valid' ? 'You are within the approved campus boundary.' :
                   'You must be inside campus to request a pass. Your request may be flagged.'}
                </p>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-6 border-b pb-6">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Request Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(REQUEST_TYPES).map(([key, config]) => (
                  <label key={key} className={`
                    border rounded-xl p-3 cursor-pointer transition-all flex flex-col items-center gap-2 text-center
                    has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:ring-1 has-[:checked]:ring-blue-500
                  `}>
                    <input 
                      type="radio" 
                      value={key} 
                      className="sr-only" 
                      {...register('request_type')} 
                    />
                    <div className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center mb-1",
                      config.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                      config.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                      config.color === 'red' ? 'bg-red-50 text-red-600' :
                      config.color === 'green' ? 'bg-green-50 text-green-600' :
                      'bg-amber-50 text-amber-600'
                    )}>
                      <RequestIcon iconName={config.icon} className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-slate-900">{config.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Departure Time</label>
              <input 
                type="datetime-local" 
                className="w-full rounded-lg border-gray-300 border px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                {...register('departure_at')}
              />
              {errors.departure_at && <p className="text-red-500 text-xs mt-1">{errors.departure_at.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Expected Return</label>
              <input 
                type="datetime-local" 
                className="w-full rounded-lg border-gray-300 border px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                {...register('return_by')}
              />
              {errors.return_by && <p className="text-red-500 text-xs mt-1">{errors.return_by.message}</p>}
            </div>
          </div>

          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Destination</label>
              <input 
                type="text" 
                placeholder="Where are you going?"
                className="w-full rounded-lg border-gray-300 border px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                {...register('destination')}
              />
              {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Reason</label>
              <textarea 
                rows={4}
                placeholder="Provide a detailed reason for your request..."
                className="w-full rounded-lg border-gray-300 border px-4 py-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none"
                {...register('reason')}
              />
              {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
            </div>
          </div>

          <div className="pt-6 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || geoStatus === 'checking'}
              className="px-6 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
