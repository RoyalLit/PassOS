import { requireWarden, getWardenHostels } from '@/lib/auth/rbac';
import { Sidebar } from '@/components/layout/sidebar';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireWarden();
  
  return <>{children}</>;
}
