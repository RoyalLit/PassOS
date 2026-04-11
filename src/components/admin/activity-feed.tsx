'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';

interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

interface ActivityFeedProps {
  activities: AuditLog[];
}

const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
  'pass.created': { label: 'Pass created', icon: '📝' },
  'pass.approved': { label: 'Pass approved', icon: '✅' },
  'pass.rejected': { label: 'Pass rejected', icon: '❌' },
  'pass.used': { label: 'Pass used', icon: '🚶' },
  'pass.expired': { label: 'Pass expired', icon: '⏰' },
  'request.created': { label: 'Request submitted', icon: '📨' },
  'request.approved': { label: 'Request approved', icon: '✅' },
  'request.rejected': { label: 'Request rejected', icon: '❌' },
  'student.flagged': { label: 'Student flagged', icon: '🚩' },
  'student.unflagged': { label: 'Flag removed', icon: '🏁' },
  'user.created': { label: 'User created', icon: '👤' },
  'escalation.triggered': { label: 'Escalation triggered', icon: '🚨' },
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityInfo = (activity: AuditLog) => {
    const actionKey = `${activity.entity_type}.${activity.action}`;
    return ACTION_LABELS[actionKey] || {
      label: `${activity.action} ${activity.entity_type}`,
      icon: '📌',
    };
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-80 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const info = getActivityInfo(activity);
              let timestamp;
              
              try {
                timestamp = parseISO(activity.created_at);
                if (!isValid(timestamp)) {
                  timestamp = new Date(activity.created_at);
                }
              } catch {
                timestamp = new Date();
              }

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="text-lg shrink-0">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground">{info.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(timestamp, { addSuffix: true })}
                    </p>
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
