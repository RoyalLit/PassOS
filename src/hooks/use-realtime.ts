import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeTable = 'pass_requests' | 'passes' | 'pass_scans' | 'student_states' | 'fraud_flags' | 'escalation_logs';

export function useRealtime(tables: RealtimeTable[]) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    tables.forEach(table => {
      const channel = supabase.channel(`public:${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            console.log(`Realtime update on ${table}`, payload);
            setLastUpdate(new Date());
            router.refresh(); // Automatically refresh Next.js route cache to get new server data
          }
        )
        .subscribe();
      
      channels.push(channel);
    });

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [tables, router]);

  return { lastUpdate };
}
