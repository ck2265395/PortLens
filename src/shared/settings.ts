import { z } from 'zod';

export const appSettingsSchema = z.object({
  refreshInterval: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10)]).default(3),
  refreshPaused: z.boolean().default(false), minimizeToTray: z.boolean().default(false), startWithWindows: z.boolean().default(false)
});
export type AppSettings = z.infer<typeof appSettingsSchema>;
export const defaultSettings: AppSettings = { refreshInterval: 3, refreshPaused: false, minimizeToTray: false, startWithWindows: false };
