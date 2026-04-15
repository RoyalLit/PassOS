'use client';

import { ActivityCharts } from '@/components/admin/activity-charts';
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity, 
  Shield,
  Bell,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function AdminDemoView() {
  const mockActivityData = [
    { created_at: new Date(Date.now() - 86400000 * 0).toISOString(), status: 'approved' },
    { created_at: new Date(Date.now() - 86400000 * 0).toISOString(), status: 'pending' },
    { created_at: new Date(Date.now() - 86400000 * 1).toISOString(), status: 'approved' },
    { created_at: new Date(Date.now() - 86400000 * 1).toISOString(), status: 'rejected' },
    { created_at: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'approved' },
    { created_at: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'approved' },
    { created_at: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'approved' },
    { created_at: new Date(Date.now() - 86400000 * 4).toISOString(), status: 'pending' },
    { created_at: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'approved' },
    { created_at: new Date(Date.now() - 86400000 * 6).toISOString(), status: 'approved' },
  ];

  const stats = [
    { label: 'Inside Campus', value: '4,842', trend: '+12%', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Passes', value: '156', trend: '+5%', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Security Alerts', value: '0', trend: '0%', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">University Dashboard</h2>
          <p className="text-sm text-slate-500 font-medium">Real-time overview of campus mobility.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search students..." 
              className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none w-48 lg:w-64"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-xl relative group hover:bg-slate-50 transition-colors">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border-2 border-white shadow-sm" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform", stat.bg, stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
                stat.trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-600"
              )}>
                {stat.trend.startsWith('+') ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {stat.trend}
              </div>
            </div>
            <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</h4>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <ActivityCharts activityData={mockActivityData} />
        
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Recent Movement</h3>
            <button className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">View Full Logs</button>
          </div>
          <div className="space-y-6">
            {[
              { name: 'Isha Patel', action: 'Exited Campus', time: '12 mins ago', id: 'STUD-901' },
              { name: 'Rahul V.', action: 'Returned to Campus', time: '28 mins ago', id: 'STUD-442' },
              { name: 'Simran K.', action: 'Exited Campus', time: '1 hour ago', id: 'STUD-115' },
              { name: 'Aman Deep', action: 'Approved Overnight', time: '2 hours ago', id: 'STUD-782' },
            ].map((log, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  {log.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate mb-0.5">{log.name}</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    <span className={cn(
                      "font-bold",
                      log.action.includes('Exited') ? "text-blue-600" : 
                      log.action.includes('Returned') ? "text-emerald-600" : "text-violet-600"
                    )}>{log.action}</span> • {log.time}
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-300 group-hover:text-slate-400 transition-colors">{log.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
