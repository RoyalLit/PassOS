import { getCurrentUser, requireWarden } from '@/lib/auth/rbac';
import { Sidebar } from '@/components/layout/sidebar';
import { redirect } from 'next/navigation';
import type { Warden } from '@/types';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUser();
  
  if (!profile) {
    redirect('/login');
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
        role={profile.role} 
        userName={profile.full_name} 
        avatarUrl={profile.avatar_url}
        wardens={wardens}
      />
      
      <main className="flex-1 min-w-0 md:pl-64 focus:outline-none">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
