import { NotificationSettings } from '@/components/notifications/notification-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Bell, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Manage your notification preferences and history
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <NotificationSettings />
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Notification History
              </CardTitle>
              <CardDescription>
                View your recent notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Your notification history is available in the notification bell in the sidebar.
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium">🎉 Pass Approved</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Example: Your day outing pass has been approved
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium">⚠️ Overdue Alert</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Example: Student has not returned on time
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium">📢 Announcement</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Example: New hostel guidelines announced
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Push Notification Setup</CardTitle>
              <CardDescription>
                How push notifications work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Enable Push Notifications</h4>
                <p className="text-muted-foreground">
                  Click the toggle above to receive real-time alerts directly on your device, even when the app is closed.
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium">Browser Support</h4>
                <p className="text-muted-foreground">
                  Push notifications are supported in Chrome, Firefox, Safari, and Edge. Make sure your browser allows notifications from this site.
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium">Quiet Hours</h4>
                <p className="text-muted-foreground">
                  Set a time range when you don&apos;t want to receive notifications. This is useful for nighttime or study hours.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
