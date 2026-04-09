import { getCurrentUser } from '@/lib/auth/rbac';
import { SuperadminSidebar } from '@/components/layout/superadmin-sidebar';
import { redirect } from 'next/navigation';
import { isSuperadmin } from '@/lib/auth/routes';

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  if (!isSuperadmin(user.role)) {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen bg-background flex">
      <SuperadminSidebar
        userName={user.full_name}
        avatarUrl={user.avatar_url}
      />
      <main className="flex-1 min-w-0 md:pl-64 focus:outline-none">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
