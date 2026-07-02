import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().min(1),
    password: z.string().min(1),
});

export const userSchema = z.object({
    id: z.number(),
    email: z.string(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    dep_id: z.number().nullable().optional(),
    default_base: z.number().nullable().optional(),
    roles: z.array(z.object({ name: z.string() })).optional(),
});

export const loginResponseSchema = z.object({
    status: z.literal('success'),
    user: userSchema,
});

export const meResponseSchema = userSchema;
