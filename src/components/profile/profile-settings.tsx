'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import { User, Lock, Bell, AlertCircle, Loader2, Check, Camera } from 'lucide-react';
import Image from 'next/image';
import { clsx } from 'clsx';

interface ProfileMetadata {
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  notifications_email?: boolean;
  notifications_in_app?: boolean;
  notifications_whatsapp?: boolean;
}

export function ProfileSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'avatar' | 'emergency' | 'notifications'>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function updateProfile(updates: Partial<Profile & { metadata: ProfileMetadata }>) {
    setSaving(true);
    setMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const body: Record<string, unknown> = {};
      
      if (updates.full_name !== undefined) body.full_name = updates.full_name;
      if (updates.phone !== undefined) body.phone = updates.phone;
      if (updates.hostel !== undefined) body.hostel = updates.hostel;
      if (updates.room_number !== undefined) body.room_number = updates.room_number;
      
      if (updates.metadata !== undefined) {
        body.metadata = {
          ...(profile?.metadata || {}),
          ...updates.metadata,
        };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      fetchProfile();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      }).then(res => res.json());

      if (error) throw new Error(error);

      setMessage({ type: 'success', text: 'Password changed successfully' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    setSaving(true);
    setMessage(null);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const result = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_data: base64,
        }),
      }).then(res => res.json());

      if (result.error) throw new Error(result.error);
      if (!result.success) throw new Error('Failed to upload avatar');

      setMessage({ type: 'success', text: 'Avatar updated successfully' });
      fetchProfile();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  }

  const metadata = (profile?.metadata || {}) as ProfileMetadata;

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'password' as const, label: 'Password', icon: Lock },
    { id: 'avatar' as const, label: 'Avatar', icon: Camera },
    ...(profile?.role === 'student' ? [{ id: 'emergency' as const, label: 'Emergency Contact', icon: AlertCircle }] : []),
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={clsx(
          'p-4 rounded-lg flex items-center gap-2',
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        )}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="max-w-2xl">
        {activeTab === 'profile' && (
          <ProfileForm key={profile?.id} profile={profile} onSave={updateProfile} saving={saving} />
        )}
        {activeTab === 'password' && (
          <PasswordForm onSave={changePassword} saving={saving} />
        )}
        {activeTab === 'avatar' && (
          <AvatarForm profile={profile} onUpload={uploadAvatar} saving={saving} fileInputRef={fileInputRef} />
        )}
        {activeTab === 'emergency' && (
          <EmergencyContactForm key={`emergency-${profile?.id}`} metadata={metadata} onSave={updateProfile} saving={saving} />
        )}
        {activeTab === 'notifications' && (
          <NotificationForm metadata={metadata} onSave={updateProfile} saving={saving} />
        )}
      </div>
    </div>
  );
}

function ProfileForm({ profile, onSave, saving }: { profile: Profile | null; onSave: (updates: Partial<Profile>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    hostel: profile?.hostel || '',
    room_number: profile?.room_number || '',
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
        <input
          type="text"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="+91 XXXXX XXXXX"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Hostel</label>
          <input
            type="text"
            value={form.hostel}
            onChange={(e) => setForm({ ...form, hostel: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Block A"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Room Number</label>
          <input
            type="text"
            value={form.room_number}
            onChange={(e) => setForm({ ...form, room_number: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="101"
          />
        </div>
      </div>

      <button
        onClick={() => onSave(form)}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Changes
      </button>
    </div>
  );
}

function PasswordForm({ onSave, saving }: { onSave: (current: string, next: string) => void; saving: boolean }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleSubmit = () => {
    if (next !== confirm) {
      alert('Passwords do not match');
      return;
    }
    onSave(current, next);
    setCurrent('');
    setNext('');
    setConfirm('');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Current Password</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          minLength={8}
        />
        <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Confirm New Password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || !current || !next || !confirm}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Change Password
      </button>
    </div>
  );
}

function AvatarForm({ profile, onUpload, saving, fileInputRef }: {
  profile: Profile | null;
  onUpload: (file: File) => void;
  saving: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  const avatarUrl = profile?.avatar_url || null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      onUpload(file);
    }
  };

  const displayUrl = preview || avatarUrl;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <div className="relative">
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt="Avatar"
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </button>
        </div>
        <div>
          <p className="font-medium text-foreground">Profile Photo</p>
          <p className="text-sm text-muted-foreground">JPG, PNG, GIF or WebP. Max 5MB.</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

function EmergencyContactForm({ metadata, onSave, saving }: {
  metadata: ProfileMetadata;
  onSave: (updates: { metadata: Partial<ProfileMetadata> }) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    emergency_contact_name: metadata.emergency_contact_name || '',
    emergency_contact_phone: metadata.emergency_contact_phone || '',
    emergency_contact_relation: metadata.emergency_contact_relation || '',
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This information will be used in case of emergencies when you cannot be reached.
      </p>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Contact Name</label>
        <input
          type="text"
          value={form.emergency_contact_name}
          onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Parent/Guardian name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Contact Phone</label>
        <input
          type="tel"
          value={form.emergency_contact_phone}
          onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="+91 XXXXX XXXXX"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Relationship</label>
        <select
          value={form.emergency_contact_relation}
          onChange={(e) => setForm({ ...form, emergency_contact_relation: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select relationship</option>
          <option value="parent">Parent</option>
          <option value="guardian">Guardian</option>
          <option value="sibling">Sibling</option>
          <option value="relative">Relative</option>
          <option value="other">Other</option>
        </select>
      </div>

      <button
        onClick={() => onSave({ metadata: form })}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Emergency Contact
      </button>
    </div>
  );
}

function NotificationForm({ metadata, onSave, saving }: {
  metadata: ProfileMetadata;
  onSave: (updates: { metadata: Partial<ProfileMetadata> }) => void;
  saving: boolean;
}) {
  const [prefs, setPrefs] = useState({
    notifications_email: metadata.notifications_email ?? true,
    notifications_in_app: metadata.notifications_in_app ?? true,
    notifications_whatsapp: metadata.notifications_whatsapp ?? false,
  });

  const handleToggle = (key: keyof typeof prefs) => {
    if (saving) return;
    const newValue = !prefs[key];
    setPrefs({ ...prefs, [key]: newValue });
    onSave({ metadata: { [key]: newValue } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Choose how you want to receive notifications about pass requests and approvals.
        </p>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
      </div>

      <div className="space-y-3">
        <label className={clsx(
          'flex items-center justify-between p-3 border border-border rounded-lg transition-colors',
          saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'
        )}>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive updates via email</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={prefs.notifications_email}
            onChange={() => handleToggle('notifications_email')}
            disabled={saving}
            className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
          />
        </label>

        <label className={clsx(
          'flex items-center justify-between p-3 border border-border rounded-lg transition-colors',
          saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'
        )}>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">In-App Notifications</p>
              <p className="text-sm text-muted-foreground">Receive updates within PassOS</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={prefs.notifications_in_app}
            onChange={() => handleToggle('notifications_in_app')}
            disabled={saving}
            className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
          />
        </label>

        <label className={clsx(
          'flex items-center justify-between p-3 border border-border rounded-lg transition-colors',
          saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'
        )}>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">WhatsApp Notifications</p>
              <p className="text-sm text-muted-foreground">Receive updates via WhatsApp (if configured)</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={prefs.notifications_whatsapp}
            onChange={() => handleToggle('notifications_whatsapp')}
            disabled={saving}
            className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
          />
        </label>
      </div>
    </div>
  );
}
