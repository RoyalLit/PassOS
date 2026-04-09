'use client';

import { useEffect, ReactNode } from 'react';
import type { Tenant } from '@/types';

interface BrandingProviderProps {
  tenant?: Tenant | null;
  children: ReactNode;
}

/**
 * A client component that injects tenant-specific branding (colors, logos)
 * into the CSS root variables and document metadata.
 */
export function BrandingProvider({ tenant, children }: BrandingProviderProps) {
  useEffect(() => {
    if (!tenant) return;

    const root = document.documentElement;

    // Apply primary brand color if defined
    if (tenant.brand_primary) {
      const primaryColor = tenant.brand_primary;
      root.style.setProperty('--primary', primaryColor);
      
      // Also update ring color (slightly lighter/translucent version of primary)
      root.style.setProperty('--ring', `${primaryColor}80`);
    }

    // Update document title if not a generic one
    if (tenant.name && tenant.slug !== 'default') {
      const originalTitle = document.title;
      document.title = `${tenant.name} | ${originalTitle.split('|')[1] || 'PassOS'}`;
      
      return () => {
        document.title = originalTitle;
      };
    }
  }, [tenant]);

  return <>{children}</>;
}
