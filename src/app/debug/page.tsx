'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const logs: string[] = [];
      
      logs.push('=== Auth Debug ===');
      
      // Check session
      const { data: sessionData } = await supabase.auth.getSession();
      logs.push(`Session: ${sessionData.session ? 'exists' : 'null'}`);
      if (sessionData.session) {
        logs.push(`User ID: ${sessionData.session.user.id}`);
        logs.push(`User email: ${sessionData.session.user.email}`);
        logs.push(`User metadata: ${JSON.stringify(sessionData.session.user.user_metadata)}`);
      }
      
      // Check user
      const { data: userData } = await supabase.auth.getUser();
      logs.push(`GetUser: ${userData.user ? 'success' : 'null'}`);
      if (userData.user) {
        logs.push(`User ID: ${userData.user.id}`);
      }
      
      // Check profile
      if (sessionData.session) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();
        
        if (profileError) {
          logs.push(`Profile error: ${profileError.message}`);
        } else {
          logs.push(`Profile: ${JSON.stringify(profileData)}`);
        }
      }
      
      setDebugInfo(logs);
    };
    
    check();
  }, []);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-lg border border-border p-8">
        <h1 className="text-2xl font-bold mb-6">Auth Debug Info</h1>
        <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap">
          {debugInfo.join('\n')}
        </pre>
      </div>
    </div>
  );
}
