'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ThemeToggle } from './theme-toggle';

interface SuperadminSidebarProps {
  userName: string;
  avatarUrl?: string | null;
}

export function SuperadminSidebar({ userName, avatarUrl }: SuperadminSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const links = [
    { href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/superadmin/tenants', label: 'Universities', icon: Building2 },
    { href: '/superadmin/users', label: 'All Users', icon: Users },
    { href: '/superadmin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/superadmin/settings', label: 'Platform Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    window.location.href = '/login';
  };

  return (
    <>
      <button
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-card rounded-md shadow-sm border border-border text-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-64 bg-card/80 backdrop-blur-xl border-r border-border text-foreground flex flex-col transition-transform duration-300 md:translate-x-0 h-full shadow-lg shadow-black/5',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6">
          <Link href="/superadmin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">PassOS</span>
            <span className="ml-auto text-[10px] font-black bg-purple-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
              Admin
            </span>
          </Link>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
            Platform Management
          </p>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                (link.href !== '/superadmin' && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group/link',
                    isActive
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-sm shadow-purple-500/5'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1'
                  )}
                >
                  <Icon
                    size={18}
                    className={clsx(
                      'transition-transform group-hover/link:scale-110',
                      isActive ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'
                    )}
                  />
                  <span className="flex-1">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground border border-border shadow-sm overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground">Superadmin</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex-1 flex items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50"
            >
              <span>{loggingOut ? 'Signing out...' : 'Log out'}</span>
              <LogOut size={16} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
