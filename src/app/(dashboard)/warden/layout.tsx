import { requireWarden } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export default async function WardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireWarden();
  
  return <>{children}</>;
}
