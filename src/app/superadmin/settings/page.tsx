'use client';

import { useState } from 'react';
import { Settings, Database, Shield } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

export default function SuperadminSettings() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [platformEnabled, setPlatformEnabled] = useState(true);
  const [selfSignup, setSelfSignup] = useState(false);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Platform Settings
        </h1>
        <p className="text-muted-foreground">
          Configure global platform settings
        </p>
      </div>

      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Shield size={16} className="text-purple-500" />
          <h2 className="font-bold text-foreground">Platform Configuration</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div>
              <p className="font-medium text-foreground">Platform Status</p>
              <p className="text-sm text-muted-foreground">Enable or disable the entire platform</p>
            </div>
            <Toggle
              enabled={platformEnabled}
              onChange={setPlatformEnabled}
              variant="purple"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div>
              <p className="font-medium text-foreground">Allow Self-Service Signup</p>
              <p className="text-sm text-muted-foreground">Let new universities create their own accounts</p>
            </div>
            <Toggle
              enabled={selfSignup}
              onChange={setSelfSignup}
              variant="purple"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div>
              <p className="font-medium text-foreground">Default Plan</p>
              <p className="text-sm text-muted-foreground">Plan assigned to new universities</p>
            </div>
            <select className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground">
              <option value="free">Free</option>
              <option value="starter" selected>Starter</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Database size={16} className="text-purple-500" />
          <h2 className="font-bold text-foreground">Database Information</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Supabase URL</p>
              <p className="font-mono text-foreground mt-1 break-all">
                {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured'}
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Service Role Key</p>
              <p className="font-mono text-foreground mt-1">
                {process.env.SUPABASE_SERVICE_ROLE_KEY ? '••••••••••••••••' : 'Not configured'}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Environment variables are set in <code className="bg-muted px-1.5 py-0.5 rounded">.env.local</code>
          </p>
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Settings size={16} className="text-purple-500" />
          <h2 className="font-bold text-foreground">Audit & Logs</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div>
              <p className="font-medium text-foreground">Superadmin Audit Log</p>
              <p className="text-sm text-muted-foreground">Track all superadmin actions</p>
            </div>
            <a
              href="/admin/audit"
              className="px-4 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              View Logs
            </a>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={async () => {
            setSaving(true);
            await new Promise(r => setTimeout(r, 500));
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-500 transition-colors disabled:opacity-50 shadow-lg shadow-purple-500/20"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
