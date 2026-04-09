'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type RealtimeTable = 'profiles' | 'pass_requests' | 'passes' | 'pass_scans' | 'student_states' | 'fraud_flags';

interface RealtimeRefreshProps {
  tables: RealtimeTable[];
}

/**
 * A headless component that listens for realtime changes to Supabase tables
 * and triggers a Next.js router refresh when data changes.
 * This allows Server Components on the same page to re-fetch and update.
 */
export function RealtimeRefresh({ tables }: RealtimeRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channels = tables.map(table => {
      const channel = supabase.channel(`refresh:${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            console.log(`[Realtime] Change detected in ${table}, refreshing...`, payload);
            router.refresh();
          }
        )
        .subscribe();
      
      return channel;
    });

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [tables, router]);

  return null;
}
