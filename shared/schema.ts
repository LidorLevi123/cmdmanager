import { z } from "zod";

// Connected client schema
export const connectedClientSchema = z.object({
  id: z.string(),
  hostname: z.string(),
  classId: z.string(),
  ip: z.string(),
  connectedAt: z.string(),
  connectionDuration: z.string(),
});

export type ConnectedClient = z.infer<typeof connectedClientSchema>;

// Command schema
export const commandSchema = z.object({
  classId: z.string(),
  cmd: z.string(),
});

export type Command = z.infer<typeof commandSchema>;

// Command response schema
export const commandResponseSchema = z.object({
  class: z.string(),
  cmd: z.string(),
  timestamp: z.string(),
});

export type CommandResponse = z.infer<typeof commandResponseSchema>;

// Activity log entry schema
export const activityLogEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['command_dispatched', 'client_connected', 'client_disconnected', 'server_started']),
  timestamp: z.string(),
  title: z.string(),
  description: z.string(),
  metadata: z.record(z.any()).optional(),
});

export type ActivityLogEntry = z.infer<typeof activityLogEntrySchema>;

// Server stats schema
export const serverStatsSchema = z.object({
  commandsDispatched: z.number(),
  totalConnections: z.number(),
  uptime: z.string(),
  startTime: z.string(),
});

export type ServerStats = z.infer<typeof serverStatsSchema>;

// Predefined allowed class IDs
export const ALLOWED_CLASS_IDS = new Set(['58.0.6', '58.1.1', '58.-1.23']);
