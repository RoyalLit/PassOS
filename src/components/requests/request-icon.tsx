'use client';

import { Sun, Moon, AlertTriangle, Activity, BookOpen, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';

const iconMap = {
  Sun,
  Moon,
  AlertTriangle,
  Activity,
  BookOpen,
};

interface RequestIconProps {
  iconName: string;
  className?: string;
}

export function RequestIcon({ iconName, className }: RequestIconProps) {
  const IconComponent = iconMap[iconName as keyof typeof iconMap] || HelpCircle;
  
  return <IconComponent className={clsx("shrink-0", className)} />;
}
