import { getCurrentUser } from '@/lib/auth/rbac';
import { Sidebar } from '@/components/layout/sidebar';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    console.log('[DashboardLayout] No user, redirecting to /login');
    redirect('/login');
  }

  console.log('[DashboardLayout] User authenticated:', user.full_name, user.role, 'tenant:', user.tenant_id);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar role={user.role} userName={user.full_name} avatarUrl={user.avatar_url} />
      
      <main className="flex-1 min-w-0 md:pl-64 focus:outline-none">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
