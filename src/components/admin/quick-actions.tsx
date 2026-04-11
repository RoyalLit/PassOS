'use client';

import { Button } from '@/components/ui/button';
import { Plus, Users, FileText, Settings } from 'lucide-react';
import Link from 'next/link';

export function QuickActions() {
  return (
    <div className="flex gap-2">
      <Link href="/admin/users/new">
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </Link>
      <Link href="/admin/settings">
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </Link>
    </div>
  );
}
