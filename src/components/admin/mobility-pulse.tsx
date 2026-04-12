'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, ArrowUpRight, ArrowDownLeft, User } from 'lucide-react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { clsx } from 'clsx';
import type { PassScan, Pass, Profile } from '@/types';

export interface ScanWithPass extends PassScan {
  pass: Pass & {
    student: Profile;
  };
}

interface MobilityPulseProps {
  scans: ScanWithPass[];
}

export function MobilityPulse({ scans }: MobilityPulseProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Live Mobility Pulse
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-primary/10">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
        {scans.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No mobility activity recorded today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scans.map((scan) => {
              const direction = scan.scan_type === 'exit' ? 'OUT' : 'IN';
              const isExit = scan.scan_type === 'exit';
              const student = scan.pass?.student;
              
              let timestamp;
              try {
                timestamp = parseISO(scan.created_at);
                if (!isValid(timestamp)) {
                  timestamp = new Date(scan.created_at);
                }
              } catch {
                timestamp = new Date();
              }

              return (
                <div
                  key={scan.id}
                  className="group flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 transition-all"
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                    isExit ? "bg-blue-500/10 text-blue-600" : "bg-emerald-500/10 text-emerald-600"
                  )}>
                    {isExit ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-foreground truncate">
                        {student?.full_name || 'System Auto-Log'}
                      </p>
                      <span className="text-[10px] whitespace-nowrap font-bold uppercase tracking-tighter text-muted-foreground">
                        {formatDistanceToNow(timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={clsx(
                        "text-[10px] font-black px-1.5 py-0.5 rounded-md",
                        isExit ? "bg-blue-500 text-white" : "bg-emerald-500 text-white",
                        scan.scan_result === 'late_entry' && "bg-amber-500",
                        scan.scan_result === 'expired' && "bg-red-500"
                      )}>
                        {scan.scan_result === 'late_entry' ? 'LATE ENTRY' : direction}
                      </span>
                      <p className="text-xs text-muted-foreground truncate italic">
                        {scan.scan_result === 'valid' ? (isExit ? 'Exited Main Gate' : 'Entered Main Gate') : 
                         scan.scan_result === 'late_entry' ? 'Returned late to campus' :
                         scan.scan_result === 'expired' ? 'Attempted exit with expired pass' :
                         scan.scan_result}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
