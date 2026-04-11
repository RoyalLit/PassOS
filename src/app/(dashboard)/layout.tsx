import { getAuthDiagnostics, requireWarden } from '@/lib/auth/rbac';
import { Sidebar } from '@/components/layout/sidebar';
import { LiveDataSync } from '@/components/common/live-data-sync';
import { redirect } from 'next/navigation';
import type { Warden } from '@/types';
import { LogOut, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authenticated, profile, error } = await getAuthDiagnostics();
  
  if (!authenticated) {
    redirect('/login');
  }

  if (!profile) {
    // We are authenticated but have no profile. 
    // This is the "Identity Sync Loop" state.
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-red-500/10">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight">System Configuration Error</h1>
            <p className="text-muted-foreground font-medium">
              We found your account, but your profile data is currently unreachable.
            </p>
            {error && (
              <div className="text-[10px] font-mono p-2 bg-muted rounded-lg text-muted-foreground overflow-hidden truncate">
                Error Code: {error.code} | {error.message}
              </div>
            )}
          </div>
          <div className="pt-4 flex flex-col gap-3">
             <form action="/api/auth/logout" method="POST">
                <button type="submit" className="w-full py-4 bg-muted hover:bg-red-500/10 hover:text-red-500 text-foreground rounded-2xl font-bold transition-all flex items-center justify-center gap-3 active:scale-95 group">
                  <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                  Sign Out of Session
                </button>
             </form>
             <button onClick={() => window.location.reload()} className="text-sm font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 transition-colors">
               Retry Sync
             </button>
          </div>
        </div>
      </div>
    );
  }

  // If warden, fetch their assignments for the sidebar counts
  let wardens: Warden[] = [];
  if (profile.role === 'warden') {
    const wardenProfile = await requireWarden();
    wardens = wardenProfile.wardens || [];
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        id={profile.id}
        email={profile.email}
        role={profile.role} 
        userName={profile.full_name} 
        avatarUrl={profile.avatar_url}
        wardens={wardens}
      />
      
      <LiveDataSync 
        tenantId={profile.tenant_id} 
        role={profile.role} 
        userId={profile.id} 
      />
      
      <main className="flex-1 min-w-0 md:pl-64 focus:outline-none">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
