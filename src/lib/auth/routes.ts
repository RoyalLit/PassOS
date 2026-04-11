import type { UserRole } from '@/types';

export function canAccessRoute(role: UserRole, path: string): boolean {
  // Superadmin has unrestricted access to all routes
  if (role === 'superadmin') return true;

  // Tenant-scoped routes
  const routeRoles: Record<string, UserRole[]> = {
    '/student': ['student'],
    '/admin': ['admin'],
    '/guard': ['guard'],
    '/parent': ['parent'],
    '/warden': ['warden'],
    '/superadmin': ['superadmin'], // explicit block for non-superadmins
  };

  for (const [route, allowedRoles] of Object.entries(routeRoles)) {
    if (path.startsWith(route)) {
      return allowedRoles.includes(role);
    }
  }

  // Unlisted routes are accessible to all authenticated users
  return true;
}

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case 'superadmin': return '/superadmin';
    case 'admin': return '/admin';
    case 'student': return '/student';
    case 'guard': return '/guard';
    case 'parent': return '/parent';
    case 'warden': return '/warden';
    default: return '/login';
  }
}

export function isSuperadmin(role: UserRole): boolean {
  return role === 'superadmin';
}

export function isWarden(role: UserRole): boolean {
  return role === 'warden';
}

export function isAdminOrAbove(role: UserRole): boolean {
  return ['admin', 'superadmin', 'warden'].includes(role);
}
