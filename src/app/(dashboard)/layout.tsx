import { getAuthDiagnostics, requireWarden } from '@/lib/auth/rbac';
import { Sidebar } from '@/components/layout/sidebar';
import { LiveDataSync } from '@/components/common/live-data-sync';
import { redirect } from 'next/navigation';
import type { Warden } from '@/types';
import { IdentityErrorView } from '@/components/auth/identity-error-view';

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
    // We delegate the interactive UI to a Client Component.
    return <IdentityErrorView error={error} />;
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
