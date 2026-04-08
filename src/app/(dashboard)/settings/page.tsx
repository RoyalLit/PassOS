import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileSettings } from '@/components/profile/profile-settings';
import { User } from 'lucide-react';

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600" />
            Profile Settings
          </h1>
          <p className="text-slate-500 mt-1">Manage your account preferences and personal information.</p>
        </div>
      </div>

      <ProfileSettings />
    </div>
  );
}
