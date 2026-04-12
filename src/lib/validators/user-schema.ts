import { z } from 'zod';

// Base role enum matching DB exactly
export const UserRoleEnum = z.enum(['student', 'parent', 'guard', 'warden', 'admin', 'superadmin']);

export const createUserSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(100, "Full name too long"),
  email: z.string().email("Invalid email format").max(255),
  role: UserRoleEnum,
  phone: z.string().max(20).optional().nullable(),
  hostel: z.string().max(100).optional().nullable(),
  room_number: z.string().max(50).optional().nullable(),
  parent_email: z.string().email("Invalid parent email format").optional().nullable().or(z.literal('')),
});

export const updateUserSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  hostel: z.string().max(100).optional().nullable(),
  room_number: z.string().max(50).optional().nullable(),
  role: UserRoleEnum.optional(),
  new_password: z.string().min(8, "Password must be at least 8 characters").max(100).optional().nullable().or(z.literal('')),
  is_active: z.boolean().optional(),
});

export const deleteUserSchema = z.object({
  user_id: z.string().uuid("Invalid user ID format"),
});
