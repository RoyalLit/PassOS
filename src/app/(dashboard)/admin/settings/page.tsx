import { requireRole } from '@/lib/auth/rbac';
import { getSettings } from '@/lib/actions/settings';
import { SettingsForm } from '@/components/admin/settings-form';
import { Settings as SettingsIcon } from 'lucide-react';

export default async function AdminSettingsPage() {
  await requireRole('admin');
  const settings = await getSettings();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-blue-600" />
            Control Center
          </h1>
          <p className="text-slate-500 mt-1">Configure global application behavior and campus boundaries.</p>
        </div>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
