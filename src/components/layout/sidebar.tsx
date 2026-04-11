'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Home, FileText, QrCode, ClipboardList, ShieldAlert,
  Users, Activity, Menu, X, LogOut, FileClock, Heart,
  Settings, GraduationCap, Building2, BarChart3, UserCog,
  Bell
} from 'lucide-react';
import { clsx } from 'clsx';
import type { UserRole, Warden } from '@/types';
import { ThemeToggle } from './theme-toggle';
import { ClientEditProfileButton } from '@/components/common/client-edit-profile-button';

interface SidebarProps {
  role: UserRole;
  userName: string;
  avatarUrl?: string | null;
  wardens?: Warden[];
  email?: string; // Added to reconstruct profile for self-edit
  id?: string;    // Added to reconstruct profile for self-edit
}

export function Sidebar({ role, userName, avatarUrl, wardens, id, email }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [counts, setCounts] = useState<{ [key: string]: number }>({});

  const supabase = createClient();

  useEffect(() => {
    async function fetchCounts() {
      if (role === 'admin') {
        const [reqs, flags] = await Promise.all([
          supabase.from('pass_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'admin_pending', 'parent_pending', 'parent_approved']),
          supabase.from('fraud_flags').select('id', { count: 'exact', head: true }).eq('resolved', false)
        ]);
        setCounts({
          '/admin/requests': reqs.count || 0,
          '/admin/fraud': flags.count || 0
        });
      } else if (role === 'parent') {
        const { count } = await supabase.from('pass_requests').select('id', { count: 'exact', head: true }).eq('status', 'parent_pending');
        setCounts({ '/parent': count || 0 });
      } else if (role === 'warden' && wardens) {
        const hostels = wardens.map(w => w.hostel);
        if (hostels.length > 0) {
          const { data: hostelStudents } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'student')
            .in('hostel', hostels);
          const studentIds = hostelStudents?.map(s => s.id) || [];
          
          const [reqs, overdue] = await Promise.all([
            supabase.from('pass_requests')
              .select('id', { count: 'exact', head: true })
              .in('status', ['pending', 'admin_pending', 'parent_pending', 'parent_approved'])
              .in('student_id', studentIds),
            supabase.rpc('count_overdue_by_hostels', { p_hostels: hostels })
          ]);
          setCounts({
            '/warden/requests': reqs.count || 0,
            '/warden': (overdue.data as number) || 0
          });
        }
      }
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [role, supabase, wardens]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore logout errors */ }
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
          { href: '/admin/users', label: 'Users', icon: Users },
          { href: '/admin/students', label: 'Students', icon: GraduationCap },
          { href: '/admin/wardens', label: 'Wardens', icon: Building2 },
          { href: '/admin/fraud', label: 'Fraud Alerts', icon: ShieldAlert },
          { href: '/admin/escalation', label: 'Escalation', icon: ShieldAlert },
          { href: '/admin/audit', label: 'Audit Log', icon: FileClock },
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
      case 'warden':
        return [
          { href: '/warden', label: 'Dashboard', icon: Activity },
          { href: '/warden/requests', label: 'Approvals', icon: ClipboardList },
          { href: '/warden/students', label: 'Students', icon: GraduationCap },
          { href: '/warden/parents', label: 'Parents', icon: Users },
          { href: '/warden/analytics', label: 'Analytics', icon: BarChart3 },
        ];
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <>
      <button 
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-card rounded-md shadow-sm border border-border text-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={clsx(
        "fixed inset-y-0 left-0 z-40 w-64 bg-card/80 backdrop-blur-xl border-r border-border text-foreground flex flex-col transition-transform duration-300 md:translate-x-0 h-full shadow-lg shadow-black/5",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <Link href={`/${role}`} className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldAlert size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">PassOS</span>
          </Link>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">Menu</p>
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
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group/link relative",
                    isActive 
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm shadow-blue-500/5" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1"
                  )}
                >
                  <Icon size={18} className={clsx("transition-transform group-hover/link:scale-110", isActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")} />
                  <span className="flex-1">{link.label}</span>
                  {counts[link.href] > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white shadow-lg shadow-blue-500/20 animate-in zoom-in duration-300">
                      {counts[link.href]}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2 group">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground border border-border shadow-sm overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
            {(role !== 'student' || pathname.startsWith('/student')) && (
              <ClientEditProfileButton 
                user={{ 
                  id: id || '', 
                  full_name: userName, 
                  role: role, 
                  email: email || '',
                  avatar_url: avatarUrl || undefined
                } as any} 
                disableRoleChange={true}
                className="opacity-70 hover:opacity-100 transition-all hover:scale-110 active:scale-95"
              />
            )}
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
