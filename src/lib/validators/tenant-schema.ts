import { z } from 'zod';

export const TenantStatusEnum = z.enum(['active', 'trial', 'suspended', 'inactive']);
export const TenantPlanEnum = z.enum(['free', 'pro', 'enterprise']);

export const createTenantSchema = z.object({
  name: z.string().min(2, "University name is required").max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and hyphens only"),
  status: TenantStatusEnum.default('trial'),
  plan: TenantPlanEnum.default('free'),
  domains: z.array(z.string().min(3)).optional().default([]),
  settings: z.record(z.string(), z.any()).optional().default({})
});

export const updateTenantSchema = createTenantSchema.partial();
