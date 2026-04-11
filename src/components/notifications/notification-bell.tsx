'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Loader2, Check } from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

interface Notification {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  read_at: string | null;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/history?limit=10');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.read_at).length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications/read', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: id })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors group">
          <Bell className={clsx("w-5 h-5", unreadCount > 0 && "animate-wiggle")} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-card" />
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden bg-card border border-border shadow-xl">
        <div className="p-4 flex items-center justify-between bg-muted/30">
          <h4 className="font-bold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-700 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
        
        <Separator />
        
        <div className="max-h-[350px] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <BellOff className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  onClick={() => !notification.read_at && markAsRead(notification.id)}
                  className={clsx(
                    "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                    !notification.read_at && "bg-blue-500/5"
                  )}
                >
                  <div className="flex gap-3">
                    <div className={clsx(
                      "mt-1 w-2 h-2 rounded-full shrink-0",
                      notification.read_at ? "bg-transparent" : "bg-blue-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        "text-sm font-medium leading-none mb-1",
                        !notification.read_at ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-2 capitalize">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <Separator />
        
        <div className="p-2 bg-muted/10">
          <Link href="/settings" className="block w-full">
            <Button variant="ghost" className="w-full text-xs h-8">
              Notification Settings
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
