'use client';

import { Button } from '@/components/ui/button';
import { Plus, Users, FileText, Settings } from 'lucide-react';
import Link from 'next/link';

export function QuickActions() {
  return (
    <div className="flex gap-2">
      <Link href="/admin/users?action=add">
        <Button className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold shadow-lg shadow-blue-500/20" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </Link>
      <Link href="/admin/settings">
        <Button className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold shadow-lg shadow-blue-500/20" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </Link>
    </div>
  );
}
