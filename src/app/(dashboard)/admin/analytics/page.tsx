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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">System Analytics</h1>
        <p className="text-muted-foreground">Real-time statistics and campus mobility trends</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Passes" value={data.stats.active_passes} icon={Activity} color="blue" />
        <StatCard title="Students Outside" value={data.stats.outside} icon={Users} color="green" />
        <StatCard title="Overdue Students" value={data.stats.overdue} icon={Clock} color="red" />
        <StatCard title="Active Fraud Flags" value={data.stats.active_fraud_flags} icon={ShieldAlert} color="orange" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-card rounded-2xl shadow-sm border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Pass Issuance (Last 7 Days)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chart_data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={(val) => val.split('-').slice(1).join('/')} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'hsl(var(--muted) / 0.1)'}} contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="passes" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 flex flex-col">
          <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-3 flex-1">
            <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Pending Review</p>
                <p className="text-sm text-muted-foreground">Approvals awaiting action</p>
              </div>
              <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-500/20">
                {data.stats.pending_requests}
              </span>
            </div>
 
            {data.stats.overdue > 0 && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-red-500">Trigger Alert Protocol</p>
                  <p className="text-sm text-red-500/70">Notify overdue students</p>
                </div>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'red' | 'orange';
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colorMap: Record<StatCardProps['color'], string> = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    green: "bg-green-500/10 text-green-500 border-green-500/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };

  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border flex items-center gap-4">
      <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border", colorMap[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
