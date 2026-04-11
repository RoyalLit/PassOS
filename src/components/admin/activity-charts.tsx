'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { format, subDays, parseISO, isValid } from 'date-fns';

interface ActivityData {
  created_at: string;
  status: string;
}

interface ActivityChartsProps {
  activityData: ActivityData[];
}

export function ActivityCharts({ activityData }: ActivityChartsProps) {
  const chartData = useMemo(() => {
    const days: { date: string; approved: number; rejected: number; pending: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayLabel = format(date, 'EEE');
      
      const dayRequests = activityData.filter(item => {
        try {
          const itemDate = parseISO(item.created_at);
          return isValid(itemDate) && format(itemDate, 'yyyy-MM-dd') === dateStr;
        } catch {
          return false;
        }
      });

      days.push({
        date: dayLabel,
        approved: dayRequests.filter(r => r.status === 'approved').length,
        rejected: dayRequests.filter(r => r.status === 'rejected').length,
        pending: dayRequests.filter(r => 
          ['pending', 'admin_pending', 'parent_pending', 'parent_approved'].includes(r.status)
        ).length,
      });
    }
    
    return days;
  }, [activityData]);

  const totalStats = useMemo(() => {
    return {
      approved: chartData.reduce((sum, d) => sum + d.approved, 0),
      rejected: chartData.reduce((sum, d) => sum + d.rejected, 0),
      pending: chartData.reduce((sum, d) => sum + d.pending, 0),
    };
  }, [chartData]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          7-Day Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                className="text-muted-foreground"
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar dataKey="approved" name="Approved" fill="var(--success)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rejected" name="Rejected" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="var(--warning)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex justify-center gap-6 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-xs text-muted-foreground">Approved ({totalStats.approved})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-xs text-muted-foreground">Rejected ({totalStats.rejected})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-xs text-muted-foreground">Pending ({totalStats.pending})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
