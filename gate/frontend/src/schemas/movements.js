import { z } from 'zod';

export const movementCheckPayloadSchema = z.object({
    qrcode: z.string().min(1),
    base_id: z.union([z.number(), z.string()]),
    gate_id: z.union([z.number(), z.string()]).optional(),
    mvtype: z.enum(['Check-In', 'Check-Out']),
    platenumber: z.string().max(20).optional(),
    autocheck: z.boolean().optional(),
    createdby_id: z.number().optional(),
});

export const movementCheckResponseSchema = z.object({
    emp_id: z.number(),
    military_number: z.union([z.string(), z.number()]).optional(),
    photo: z.string().nullable().optional(),
    fullname_en: z.string().nullable().optional(),
    fullname_ar: z.string().nullable().optional(),
    remarks: z.string().nullable().optional(),
    bloodtype: z.string().nullable().optional(),
    department: z.string().optional(),
    rank: z.string().optional(),
    rank_name_ar: z.string().optional(),
    rank_category: z.string().nullable().optional(),
    qrcode: z.string().optional(),
    base: z.string().optional(),
    expiry_date: z.string().nullable().optional(),
    last_movement_type: z.enum(['in', 'out']).nullable().optional(),
    access: z.number().optional(),
    timing: z.union([z.number(), z.string()]).optional(),
    alerts: z.array(z.object({
        type: z.string(),
        severity: z.string(),
        message: z.string(),
    })).optional(),
    is_expired: z.boolean().optional(),
});

export const movementSubmitPayloadSchema = z.object({
    client_request_id: z.string().uuid(),
    emp_id: z.number(),
    mvtype: z.enum(['Check-In', 'Check-Out']),
    base_id: z.union([z.number(), z.string()]),
    gate_id: z.union([z.number(), z.string()]),
    platenumber: z.string().max(20).optional(),
    createdby_id: z.number().optional(),
    qrcode: z.string().optional(),
    mvdate: z.string().optional(),
    mvtime: z.string().optional(),
});

export const movementSubmitResponseSchema = z.object({
    success: z.boolean(),
    queued: z.boolean().optional(),
    duplicate: z.boolean().optional(),
});

export const offlineMovementSchema = movementSubmitPayloadSchema.extend({
    client_request_id: z.string().uuid(),
    queued_at: z.string(),
    mode: z.enum(['auto', 'manual']).default('auto'),
});

export const movementRecordSchema = z.object({
    id: z.number().optional(),
    emp_id: z.number().optional(),
    mvtype: z.string().optional(),
    mvdate: z.string().optional(),
    mvtime: z.string().optional(),
    createdby_id: z.number().nullable().optional(),
    operator_name: z.string().nullable().optional(),
});
