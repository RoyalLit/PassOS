'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, ShieldAlert, Users, Clock, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { useRealtime } from '@/hooks/use-realtime';

interface AnalyticsData {
  stats: {
    active_passes: number;
    outside: number;
    overdue: number;
    pending_requests: number;
    active_fraud_flags: number;
  };
  chart_data: { date: string; passes: number }[];
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to changes affecting stats
  useRealtime(['passes', 'pass_requests', 'student_states', 'fraud_flags']);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics');
        const json = await res.json();
        if (res.ok) setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center animate-pulse">Loading analytics engine...</div>;
  }

  if (!data) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Analytics</h1>
        <p className="text-slate-500">Real-time statistics and campus mobility trends</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Passes" value={data.stats.active_passes} icon={Activity} color="blue" />
        <StatCard title="Students Outside" value={data.stats.outside} icon={Users} color="green" />
        <StatCard title="Overdue Students" value={data.stats.overdue} icon={Clock} color="red" />
        <StatCard title="Active Fraud Flags" value={data.stats.active_fraud_flags} icon={ShieldAlert} color="orange" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6 font-medium text-slate-900">Pass Issuance (Last 7 Days)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chart_data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tickFormatter={(val) => val.split('-').slice(1).join('/')} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="passes" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-4 font-medium text-slate-900">Quick Actions</h2>
          <div className="space-y-3 flex-1">
            <div className="p-4 rounded-xl border bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">Pending Review</p>
                <p className="text-sm text-slate-500">Approvals awaiting action</p>
              </div>
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                {data.stats.pending_requests}
              </span>
            </div>

            {data.stats.overdue > 0 && (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-red-900">Trigger Alert Protocol</p>
                  <p className="text-sm text-red-700">Notify overdue students</p>
                </div>
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4">
      <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", colorMap[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
