'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, FileText, QrCode, ClipboardList, ShieldAlert,
  Users, Activity, Menu, X, LogOut, FileClock, Heart,
  Settings
} from 'lucide-react';
import { clsx } from 'clsx';
import type { UserRole } from '@/types';

interface SidebarProps {
  role: UserRole;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    window.location.href = '/login';
  };

  const getLinks = () => {
    switch (role) {
      case 'student':
        return [
          { href: '/student', label: 'Dashboard', icon: Home },
          { href: '/student/new-request', label: 'New Request', icon: FileText },
          { href: '/student/my-passes', label: 'My Passes', icon: QrCode },
          { href: '/student/history', label: 'History', icon: FileClock },
        ];
      case 'admin':
        return [
          { href: '/admin', label: 'Dashboard', icon: Activity },
          { href: '/admin/requests', label: 'Approvals', icon: ClipboardList },
          { href: '/admin/students', label: 'Students', icon: Users },
          { href: '/admin/fraud', label: 'Fraud Alerts', icon: ShieldAlert },
          { href: '/admin/audit', label: 'Audit Log', icon: FileClock },
          { href: '/admin/settings', label: 'Control Center', icon: Settings },
        ];
      case 'guard':
        return [
          { href: '/guard/scan', label: 'Scanner', icon: QrCode },
          { href: '/guard', label: 'Recent Scans', icon: ClipboardList },
        ];
      case 'parent':
        return [
          { href: '/parent', label: 'Student Requests', icon: Heart },
        ];
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <>
      <button 
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-md shadow-sm border"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={clsx(
        "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 md:translate-x-0 w-64 fixed h-full",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <Link href={`/${role}`} className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldAlert size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">PassOS</span>
          </Link>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-2">Menu</p>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== `/${role}`);
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-blue-600/10 text-blue-400" 
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon size={18} className={isActive ? "text-blue-400" : "text-slate-400"} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-white border border-slate-600">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-slate-400 capitalize">{role}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
          >
            <span>{loggingOut ? 'Signing out...' : 'Log out'}</span>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
