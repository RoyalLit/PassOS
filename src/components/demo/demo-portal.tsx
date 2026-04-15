'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  CheckCircle2, 
  LayoutDashboard, 
  ShieldCheck, 
  ArrowLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

import { StudentDemoView } from './student-view';
import { ParentDemoView } from './parent-view';
import { AdminDemoView } from './admin-view';
import { GuardDemoView } from './guard-view';

// Mock components for the portals
const StudentDemo = () => <StudentDemoView />;
const ParentDemo = () => <ParentDemoView />;
const AdminDemo = () => <AdminDemoView />;
const GuardDemo = () => <GuardDemoView />;

const roles = [
  { 
    id: 'student', 
    label: 'Student', 
    icon: Users, 
    description: 'Request passes and view status.',
    color: 'blue'
  },
  { 
    id: 'parent', 
    label: 'Parent', 
    icon: CheckCircle2, 
    description: 'Approve or deny student requests.',
    color: 'emerald'
  },
  { 
    id: 'admin', 
    label: 'Admin', 
    icon: LayoutDashboard, 
    description: 'Manage campus movement and security.',
    color: 'violet'
  },
  { 
    id: 'guard', 
    label: 'Guard', 
    icon: ShieldCheck, 
    description: 'Verify QR passes at the gate.',
    color: 'slate'
  }
];

export function DemoPortal({ initialRole }: { initialRole: string }) {
  const [activeRole, setActiveRole] = useState(initialRole || 'student');

  const activeRoleData = roles.find(r => r.id === activeRole) || roles[0];

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-50">
      {/* Demo Sidebar */}
      <aside className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col z-20 overflow-y-auto shrink-0">
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors mb-6 group">
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">PassOS Demo</h1>
              <p className="text-xs text-slate-500 font-medium">Interactive Preview</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-2">
          <div className="px-2 pb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Perspective</p>
          </div>
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setActiveRole(role.id)}
              className={cn(
                "group flex items-start gap-4 p-4 rounded-2xl transition-all text-left relative",
                activeRole === role.id 
                  ? "bg-blue-50/50 shadow-sm" 
                  : "hover:bg-slate-50"
              )}
            >
              {activeRole === role.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 top-4 bottom-4 w-1 bg-blue-600 rounded-full"
                />
              )}
              <div className={cn(
                "p-2 rounded-xl transition-colors shrink-0",
                activeRole === role.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
              )}>
                <role.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "font-bold text-sm",
                  activeRole === role.id ? "text-blue-900" : "text-slate-600"
                )}>{role.label}</span>
                <span className="text-xs text-slate-400 leading-tight pr-4">{role.description}</span>
              </div>
              <ChevronRight className={cn(
                "ml-auto h-4 w-4 transition-all opacity-0 group-hover:opacity-100",
                activeRole === role.id ? "text-blue-600 opacity-100" : "text-slate-300"
              )} />
            </button>
          ))}
        </div>

        <div className="p-6 bg-slate-50/80 border-t border-slate-100">
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-blue-600">
              <Info className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Demo Mode</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Explore the interface as a {activeRoleData.label.toLowerCase()}. Data is simulated and actions are local only.
            </p>
            <Link 
              href="/signup"
              className="block w-full text-center py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              Get Real Access
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Perspective Container */}
      <main className="flex-1 relative overflow-y-auto bg-slate-50 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRole}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 min-h-full flex flex-col overflow-hidden"
            >
              {/* Simulated Browser Bar */}
              <div className="h-10 border-b border-slate-100 bg-slate-50/50 flex items-center px-6 gap-6 flex-none">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                </div>
                <div className="flex-1 max-w-lg mx-auto bg-white border border-slate-200 rounded-md h-6 flex items-center px-4">
                  <span className="text-[10px] text-slate-400 font-mono tracking-tight">
                    app.passos.io/{activeRole === 'student' ? 'dashboard' : activeRole}
                  </span>
                </div>
              </div>

              {/* Perspective Content */}
              <div className="flex-1 overflow-y-auto bg-white p-6 md:p-10">
                {activeRole === 'student' && <StudentDemo />}
                {activeRole === 'parent' && <ParentDemo />}
                {activeRole === 'admin' && <AdminDemo />}
                {activeRole === 'guard' && <GuardDemo />}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
