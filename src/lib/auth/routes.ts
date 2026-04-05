import type { UserRole } from '@/types';

export function canAccessRoute(role: UserRole, path: string): boolean {
  const routeRoles: Record<string, UserRole[]> = {
    '/student': ['student'],
    '/admin': ['admin'],
    '/guard': ['guard'],
    '/parent': ['parent'],
  };

  for (const [route, allowedRoles] of Object.entries(routeRoles)) {
    if (path.startsWith(route)) {
      return allowedRoles.includes(role);
    }
  }
  return true;
}

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case 'student': return '/student';
    case 'admin': return '/admin';
    case 'guard': return '/guard';
    case 'parent': return '/parent';
    default: return '/login';
  }
}
