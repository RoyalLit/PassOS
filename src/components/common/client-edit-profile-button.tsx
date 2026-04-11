'use client';

import { useState } from 'react';
import { UserCog } from 'lucide-react';
import { EditUserModal } from '@/components/admin/edit-user-modal';
import type { Profile } from '@/types';
import { useRouter } from 'next/navigation';

interface ClientEditProfileButtonProps {
  user: Profile;
  disableRoleChange?: boolean;
  className?: string;
  variant?: 'icon' | 'button';
}

export function ClientEditProfileButton({ 
  user, 
  disableRoleChange = false,
  className = "",
  variant = 'icon'
}: ClientEditProfileButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={`p-2 text-muted-foreground/50 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all ${className}`}
          title="Edit Profile"
        >
          <UserCog className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 text-xs font-bold transition-all ${className}`}
        >
          <UserCog className="w-3.5 h-3.5" />
          Edit Profile
        </button>
      )}

      {isOpen && (
        <EditUserModal
          user={user}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onUpdate={() => router.refresh()}
          disableRoleChange={disableRoleChange}
        />
      )}
    </>
  );
}
