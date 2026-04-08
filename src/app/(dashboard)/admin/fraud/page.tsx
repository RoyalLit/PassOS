import { requireRole } from '@/lib/auth/rbac';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ShieldAlert, Filter } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { FraudTable } from '@/components/admin/fraud-table';

export default async function FraudDashboard(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q?.toLowerCase() || '';

  await requireRole('admin');
  const supabase = await createServerSupabaseClient();

  const { data: flags } = await supabase
    .from('fraud_flags')
    .select('*, student:profiles(*)')
    .order('created_at', { ascending: false });

  const typedFlags = flags || [];
  
  const filteredFlags = typedFlags.filter((flag) => {
    if (!q) return true;
    const nameMatch = flag.student?.full_name?.toLowerCase().includes(q);
    const typeMatch = flag.flag_type.toLowerCase().includes(q);
    return nameMatch || typeMatch;
  });

  const activeCount = typedFlags.filter(f => !f.resolved).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Fraud & Security Alerts
          </h1>
          <p className="text-muted-foreground">Monitor system abuse and flagged student behaviors</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-6 flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-500/80">Active Flags</p>
            <p className="text-3xl font-bold text-red-500 mt-1">{activeCount}</p>
          </div>
        </div>
        <div className="bg-card/60 backdrop-blur-md border border-border rounded-2xl p-6 flex items-start gap-4 shadow-sm md:col-span-2 hover:shadow-md transition-shadow">
          <div className="flex-1">
             <h3 className="font-bold text-foreground">Detection Rules</h3>
             <ul className="mt-2 text-sm text-muted-foreground space-y-1 list-disc list-inside">
               <li>Rapid Requests: &gt; 3 requests in 24 hours</li>
               <li>Late Returns: Returning late &gt; 2 times in 7 days</li>
               <li>Suspicious Anomalies: Flagged by the system</li>
             </ul>
          </div>
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur-md border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center gap-4">
          <SearchInput placeholder="Search students or alert types..." />
          <button className="p-2 border border-border rounded-lg bg-card/60 backdrop-blur-md text-muted-foreground hover:bg-muted transition-colors shrink-0">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <FraudTable flags={filteredFlags} />
      </div>
    </div>
  );
}
