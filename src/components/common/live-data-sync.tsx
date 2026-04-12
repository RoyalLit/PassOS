'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface LiveDataSyncProps {
  tenantId: string;
  role: string;
  userId: string;
}

export function LiveDataSync({ tenantId, role, userId }: LiveDataSyncProps) {
  const router = useRouter();

  useEffect(() => {
    // Only admins, wardens, guards, and superadmins need global tenant syncs.
    // Students only care about their own stuff, but since we use RLS, it's safe to listen,
    // though listening with a filter is better to avoid noise.
    
    const supabase = createClient();

    // Determine the filter based on role to reduce noise
    // Admins and wardens care about all tenant activity
    // Students only care about their own requests
    let filterStr = `tenant_id=eq.${tenantId}`;
    if (role === 'student' || role === 'parent') {
      filterStr = `student_id=eq.${userId}`;
    }

    const channel = supabase.channel(`live-sync-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'pass_requests',
          filter: filterStr,
        },
        (payload) => {
          // Trigger Next.js router refresh to fetch new data
          router.refresh();

          // Show a toast based on role and event
          if (payload.eventType === 'INSERT' && (role === 'admin' || role === 'warden')) {
            toast.info('New pass request received', {
              description: 'A student just submitted a new request.',
            });
          }
          if (payload.eventType === 'UPDATE' && role === 'student') {
            const newRecord = payload.new as Record<string, unknown>;
            if (newRecord.status === 'approved') {
              toast.success('Pass Request Approved!', {
                description: 'Your request was just approved.',
              });
            } else if (newRecord.status === 'rejected') {
              toast.error('Pass Request Rejected', {
                description: 'Please check your dashboard for details.',
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'passes',
          filter: filterStr,
        },
        (payload) => {
          router.refresh();
          
          if (payload.eventType === 'UPDATE' && (role === 'admin' || role === 'warden')) {
            const newRecord = payload.new as Record<string, unknown>;
            const oldRecord = payload.old as Record<string, unknown>;
            if (newRecord.entry_at && !oldRecord.entry_at) {
              toast.success('Student Returned', {
                description: 'A student just entered campus.',
              });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug('Live data sync established');
        }
      });

    return () => {
      // Cleanup subscription on unmount
      supabase.removeChannel(channel);
    };
  }, [tenantId, role, userId, router]);

  // This is a headless component, it renders nothing
  return null;
}
