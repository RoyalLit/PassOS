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
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  ai_review: { label: 'AI Review', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  parent_pending: { label: 'Awaiting Parent', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  parent_approved: { label: 'Parent Approved', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  parent_rejected: { label: 'Parent Rejected', color: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
  admin_pending: { label: 'Awaiting Admin', color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-300' },
} as const;

export const RISK_COLORS = {
  low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
} as const;

export const PASS_STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
  used_exit: { label: 'Exited', color: 'bg-blue-100 text-blue-700' },
  used_entry: { label: 'Returned', color: 'bg-gray-100 text-gray-700' },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-700' },
  revoked: { label: 'Revoked', color: 'bg-red-100 text-red-700' },
} as const;

export const STUDENT_STATE_CONFIG = {
  inside: { label: 'Inside Campus', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  outside: { label: 'Outside Campus', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
} as const;

export const MAX_REQUESTS_PER_DAY = 3;
export const APPROVAL_TOKEN_EXPIRY_HOURS = 24;
