import { z } from 'zod';

export const serviceInfoSchema = z.object({
  name: z.string(), displayName: z.string(), status: z.string(), canStop: z.boolean()
});

export const portRecordSchema = z.object({
  key: z.string().min(1),
  protocol: z.enum(['TCP', 'UDP']),
  localAddress: z.string().min(1),
  localPort: z.number().int().min(0).max(65535),
  pid: z.number().int().nonnegative(),
  processName: z.string(), processPath: z.string(), commandLine: z.string(), user: z.string(),
  startedAt: z.string(), services: z.array(serviceInfoSchema),
  state: z.enum(['LISTENING', 'BOUND']),
  isElevated: z.boolean(), isCritical: z.boolean()
}).superRefine((value, ctx) => {
  if ((value.protocol === 'TCP' && value.state !== 'LISTENING') || (value.protocol === 'UDP' && value.state !== 'BOUND')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Protocol and state do not match' });
  }
});

export const portSnapshotSchema = z.object({ capturedAt: z.string(), records: z.array(portRecordSchema) });
export type ServiceInfo = z.infer<typeof serviceInfoSchema>;
export type PortRecord = z.infer<typeof portRecordSchema>;
export type PortSnapshot = z.infer<typeof portSnapshotSchema>;

export const processIdentitySchema = z.object({ pid: z.number().int().nonnegative(), processName: z.string(), processPath: z.string(), startedAt: z.string(), isCritical: z.boolean(), user: z.string().optional() });
export type ProcessIdentity = z.infer<typeof processIdentitySchema>;
export const stopRequestSchema = z.object({ key: z.string().min(1).max(512), identity: processIdentitySchema, mode: z.enum(['graceful', 'force']), serviceName: z.string().min(1).max(256).optional() });
export type StopRequest = z.infer<typeof stopRequestSchema>;
export type StopProgress = { stage: 'validating' | 'stopping' | 'verifying'; message: string };
export type StopResult = { status: 'stopped' | 'blocked' | 'failed' | 'unknown'; message: string; requiresForce?: boolean; requiresElevation?: boolean };
