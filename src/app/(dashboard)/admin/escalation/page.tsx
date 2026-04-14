import { EscalationManagement } from '@/components/admin/escalation-management';
import { ShieldAlert } from 'lucide-react';
import { requireRole } from '@/lib/auth/rbac';

export default async function EscalationPage() {
  await requireRole('admin');
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-8 w-8" />
          Escalation Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure escalation rules, view active escalations, and manage alerts
        </p>
      </div>

      <EscalationManagement />
    </div>
  );
}
