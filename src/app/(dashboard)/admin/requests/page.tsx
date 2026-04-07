import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { RequestCard } from '@/components/requests/request-card';

export default async function AdminRequestsPage() {
  await requireRole('admin');
  const supabase = await createServerSupabaseClient();

  const { data: requests, error } = await supabase
    .from('pass_requests')
    .select(`
      *,
      student:profiles (full_name, hostel, room_number),
      ai_analysis (risk_level, flags)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pass Requests</h1>
        <p className="text-muted-foreground">Manage and review all pending and active student pass requests.</p>
      </div>
      
      <div className="grid gap-6">
        {requests?.length ? (
          requests.map((request: any) => (
            <RequestCard 
              key={request.id} 
              request={request}
              isAdminView={true}
            />
          ))
        ) : (
          <div className="text-center py-20 bg-card rounded-2xl border border-border shadow-sm">
            <p className="text-muted-foreground">No requests found in the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}
