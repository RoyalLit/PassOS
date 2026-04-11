'use client';

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Bell, BellOff, Clock, Smartphone, Loader2 } from 'lucide-react';
import type { NotificationPreference } from '@/types';

export function NotificationSettings() {
  const { isSupported, isSubscribed, subscribe, unsubscribe, loading: pushLoading } = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Partial<NotificationPreference>>({
    push_enabled: true,
    email_enabled: true,
    notify_pass_approved: true,
    notify_pass_rejected: true,
    notify_pass_overdue: true,
    notify_parent_approval_needed: true,
    notify_escalation: true,
    notify_new_announcement: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
    timezone: 'Asia/Kolkata',
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const { preferences } = await response.json();
        if (preferences) {
          setPreferences(preferences);
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribe();
      setPreferences((prev) => ({ ...prev, push_enabled: true }));
    } else {
      await unsubscribe();
      setPreferences((prev) => ({ ...prev, push_enabled: false }));
    }
  };

  if (loading || pushLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isSupported && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Receive real-time alerts on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  {isSubscribed ? 'You will receive push notifications' : 'Subscribe to receive alerts'}
                </p>
              </div>
              <Switch
                checked={isSubscribed}
                onCheckedChange={handlePushToggle}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={preferences.email_enabled ?? true}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, email_enabled: checked }))
                }
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base">Notify me about</Label>
              
              <div className="space-y-4 pl-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pass-approved" className="cursor-pointer">
                    Pass approvals
                  </Label>
                  <Switch
                    id="pass-approved"
                    checked={preferences.notify_pass_approved ?? true}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, notify_pass_approved: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="pass-rejected" className="cursor-pointer">
                    Pass rejections
                  </Label>
                  <Switch
                    id="pass-rejected"
                    checked={preferences.notify_pass_rejected ?? true}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, notify_pass_rejected: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="pass-overdue" className="cursor-pointer">
                    Overdue passes
                  </Label>
                  <Switch
                    id="pass-overdue"
                    checked={preferences.notify_pass_overdue ?? true}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, notify_pass_overdue: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="parent-approval" className="cursor-pointer">
                    Parent approval requests
                  </Label>
                  <Switch
                    id="parent-approval"
                    checked={preferences.notify_parent_approval_needed ?? true}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, notify_parent_approval_needed: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="escalation" className="cursor-pointer">
                    Escalation alerts
                  </Label>
                  <Switch
                    id="escalation"
                    checked={preferences.notify_escalation ?? true}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, notify_escalation: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="announcement" className="cursor-pointer">
                    Announcements
                  </Label>
                  <Switch
                    id="announcement"
                    checked={preferences.notify_new_announcement ?? true}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, notify_new_announcement: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Quiet Hours
              </Label>
              <p className="text-sm text-muted-foreground">
                Pause notifications during these hours
              </p>
              
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start" className="text-sm">From</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={preferences.quiet_hours_start || ''}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, quiet_hours_start: e.target.value || null }))
                    }
                    className="w-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end" className="text-sm">To</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={preferences.quiet_hours_end || ''}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, quiet_hours_end: e.target.value || null }))
                    }
                    className="w-32"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <Button onClick={savePreferences} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
