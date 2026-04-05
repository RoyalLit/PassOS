import { clsx } from 'clsx';
import { RISK_COLORS } from '@/lib/constants';
import { ShieldAlert, ShieldCheck, Shield, AlertTriangle } from 'lucide-react';
import type { RiskLevel } from '@/types';

export function RiskBadge({ level, score }: { level: RiskLevel, score?: number }) {
  const config = RISK_COLORS[level];
  
  const getIcon = () => {
    switch (level) {
      case 'low': return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'medium': return <Shield className="w-3.5 h-3.5" />;
      case 'high': return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'critical': return <ShieldAlert className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className={clsx(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border",
      config.bg, config.text, config.border
    )}>
      {getIcon()}
      <span className="capitalize">{level} Risk</span>
      {score !== undefined && (
        <span className="opacity-75 ml-1 border-l border-current pl-1.5">
          {(score * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}
