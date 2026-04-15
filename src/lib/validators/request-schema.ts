import { z } from 'zod';

export const createRequestSchema = z.object({
  request_type: z.enum(['day_outing', 'overnight']),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
  destination: z.string().min(2, 'Destination is required').max(200),
  departure_at: z.string(),
  return_by: z.string(),
  // Cap at 10 proof URLs to prevent storage abuse
  proof_urls: z.array(z.string().url()).max(10, 'Maximum 10 proof files allowed').optional(),
  geo_lat: z.number().optional(),
  geo_lng: z.number().optional(),
}).refine((data) => new Date(data.return_by) > new Date(data.departure_at), {
  message: 'Return time must be after departure time',
  path: ['return_by'],
});

export const timeLimitSchema = z.object({
  pass_type: z.enum(['day_outing', 'overnight', 'emergency', 'medical', 'academic']),
  enabled: z.boolean().default(true),
  allowed_start: z.string().nullable().optional(), // HH:MM format
  allowed_end: z.string().nullable().optional(),   // HH:MM format
  max_duration_hours: z.number().nullable().optional(),
});

export const approvalSchema = z.object({
  request_id: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().max(500).optional(),
  token: z.string().optional(), // For parent approval via link
});

export const scanSchema = z.object({
  // JWTs are typically ~300-500 chars; 2048 is a safe upper bound
  qr_payload: z.string().min(1, 'QR payload is required').max(2048, 'QR payload too large'),
  scan_type: z.enum(['exit', 'entry']),
  geo_lat: z.number().optional(),
  geo_lng: z.number().optional(),
});

export const bulkApprovalSchema = z.object({
  requestIds: z.array(z.string().uuid()).min(1),
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().max(500).optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type TimeLimitInput = z.infer<typeof timeLimitSchema>;
export type ApprovalInput = z.infer<typeof approvalSchema>;
export type BulkApprovalInput = z.infer<typeof bulkApprovalSchema>;
export type ScanInput = z.infer<typeof scanSchema>;
