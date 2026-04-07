import { z } from 'zod';

export const createRequestSchema = z.object({
  request_type: z.enum(['day_outing', 'overnight']),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
  destination: z.string().min(2, 'Destination is required').max(200),
  departure_at: z.string().refine((d) => new Date(d) > new Date(), {
    message: 'Departure must be in the future',
  }),
  return_by: z.string(),
  proof_urls: z.array(z.string().url()).optional(),
  geo_lat: z.number().optional(),
  geo_lng: z.number().optional(),
}).refine((data) => new Date(data.return_by) > new Date(data.departure_at), {
  message: 'Return time must be after departure time',
  path: ['return_by'],
});

export const approvalSchema = z.object({
  request_id: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().max(500).optional(),
  token: z.string().optional(), // For parent approval via link
});

export const scanSchema = z.object({
  qr_payload: z.string().min(1, 'QR payload is required'),
  scan_type: z.enum(['exit', 'entry']),
  geo_lat: z.number().optional(),
  geo_lng: z.number().optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type ApprovalInput = z.infer<typeof approvalSchema>;
export type ScanInput = z.infer<typeof scanSchema>;
