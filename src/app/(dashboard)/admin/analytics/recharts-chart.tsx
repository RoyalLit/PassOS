'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartProps {
  data: { date: string; passes: number }[];
}

export default function RechartsBarChart({ data }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tickFormatter={(val) => val.split('-').slice(1).join('/')} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip 
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))', 
            backdropFilter: 'blur(8px)', 
            borderRadius: '12px', 
            border: '1px solid hsl(var(--border))', 
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
            color: 'hsl(var(--foreground))' 
          }} 
        />
        <Bar dataKey="passes" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
      </BarChart>
    </ResponsiveContainer>
  );
}
