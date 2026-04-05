const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: reqs } = await supabase.from('pass_requests').select('id, status, reason').order('created_at', { ascending: false }).limit(3);
  const { data: passes } = await supabase.from('passes').select('id, request_id, status').order('created_at', { ascending: false }).limit(3);
  
  console.log('--- TRIGGERING PASS CREATION ---');
  if (reqs.length > 0) {
    try {
      const res = await fetch('http://localhost:3000/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: reqs[0].id })
      });
      const txt = await res.text();
      console.log(`STATUS: ${res.status}`);
      console.log(`BODY: ${txt}`);
    } catch(e) {
      console.log('Fetch error:', e);
    }
  }
}

check();
