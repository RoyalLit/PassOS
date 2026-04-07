export const APP_NAME = 'PassOS';
export const APP_DESCRIPTION = 'Smart Gate Pass & Student Mobility System';

export const REQUEST_TYPES = {
  day_outing: { label: 'Day Outing', icon: 'Sun', color: 'blue' },
  overnight: { label: 'Overnight', icon: 'Moon', color: 'purple' },
} as const;

export const PREDEFINED_REASONS = {
  day_outing: [
    "Personal work",
    "Medical appointment",
    "Family visit",
    "Shopping / errands",
    "Academic (exam, college work outside campus)"
  ],
  overnight: [
    "Home visit",
    "Family function/event",
    "Medical (extended)",
    "Tournament / competition"
  ]
} as const;

export const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-muted/50 text-muted-foreground', dot: 'bg-muted-foreground/40' },
  ai_review: { label: 'AI Review', color: 'bg-blue-500/10 text-blue-500', dot: 'bg-blue-500' },
  parent_pending: { label: 'Awaiting Parent', color: 'bg-amber-500/10 text-amber-500', dot: 'bg-amber-500' },
  parent_approved: { label: 'Parent Approved', color: 'bg-emerald-500/10 text-emerald-500', dot: 'bg-emerald-500' },
  parent_rejected: { label: 'Parent Rejected', color: 'bg-red-500/10 text-red-500', dot: 'bg-red-500' },
  admin_pending: { label: 'Awaiting Admin', color: 'bg-violet-500/10 text-violet-500', dot: 'bg-violet-500' },
  approved: { label: 'Approved', color: 'bg-green-500/10 text-green-500', dot: 'bg-green-500' },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-500', dot: 'bg-red-500' },
  cancelled: { label: 'Cancelled', color: 'bg-muted/30 text-muted-foreground/60', dot: 'bg-muted-foreground/20' },
} as const;

export const RISK_COLORS = {
  low: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
} as const;

export const PASS_STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-500/10 text-green-500' },
  used_exit: { label: 'Exited', color: 'bg-blue-500/10 text-blue-500' },
  used_entry: { label: 'Returned', color: 'bg-muted/50 text-muted-foreground' },
  expired: { label: 'Expired', color: 'bg-red-500/10 text-red-500' },
  revoked: { label: 'Revoked', color: 'bg-red-500/10 text-red-500' },
} as const;

export const STUDENT_STATE_CONFIG = {
  inside: { label: 'Inside Campus', color: 'bg-green-500/10 text-green-500', dot: 'bg-green-500' },
  outside: { label: 'Outside Campus', color: 'bg-blue-500/10 text-blue-500', dot: 'bg-blue-500' },
  overdue: { label: 'Overdue', color: 'bg-red-500/10 text-red-500', dot: 'bg-red-500' },
} as const;

export const MAX_REQUESTS_PER_DAY = 3;
export const APPROVAL_TOKEN_EXPIRY_HOURS = 24;
