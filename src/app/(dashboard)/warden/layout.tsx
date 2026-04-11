import { requireWarden, getWardenHostels } from '@/lib/auth/rbac';
import { Sidebar } from '@/components/layout/sidebar';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireWarden();
  
  // If warden has no hostels assigned, show message
  const hostels = profile.wardens?.map(w => w.hostel) || [];
  
  if (hostels.length === 0) {
    redirect('/warden/no-hostels');
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        role={profile.role} 
        userName={profile.full_name} 
        avatarUrl={profile.avatar_url}
        wardens={profile.wardens}
      />
      
      <main className="flex-1 min-w-0 md:pl-64 focus:outline-none">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
