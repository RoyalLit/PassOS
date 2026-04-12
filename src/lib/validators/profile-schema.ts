import { z } from 'zod';

export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  hostel: z.string().max(100).optional().nullable(),
  room_number: z.string().max(50).optional().nullable(),
  avatar_url: z.string().url().max(1000).optional().nullable(),
  metadata: z.record(z.string(), z.any())
    .refine((data) => JSON.stringify(data).length < 5000, "Metadata too large")
    .optional(),
});

export const uploadAvatarSchema = z.object({
  file_name: z.string().min(1).max(255),
  file_type: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp'], {
    message: "Only JPEG, PNG, GIF, and WebP images are allowed"
  }),
  file_size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
  file_data: z.string().min(1, "File data is required"),
});

