import { ConnectedClient, ActivityLogEntry, ServerStats } from "@shared/schema";
import type { Response } from "express";

export interface WaitingClient {
  id: string;
  response: Response;
  classId: string;
  hostname: string;
  ip: string;
  connectedAt: Date;
}

export interface IStorage {
  // Client management
  addWaitingClient(client: WaitingClient): void;
  removeWaitingClient(clientId: string): void;
  getWaitingClientsByClassId(classId: string): WaitingClient[];
  getAllWaitingClients(): WaitingClient[];
  
  // Activity log
  addActivityLogEntry(entry: Omit<ActivityLogEntry, 'id'>): void;
  getActivityLog(): ActivityLogEntry[];
  clearActivityLog(): void;
  
  // Stats
  incrementCommandsDispatched(): void;
  incrementTotalConnections(): void;
  getStats(): ServerStats;
}

export class MemStorage implements IStorage {
  private waitingClients: Map<string, WaitingClient>;
  private activityLog: ActivityLogEntry[];
  private commandsDispatched: number;
  private totalConnections: number;
  private startTime: Date;

  constructor() {
    this.waitingClients = new Map();
    this.activityLog = [];
    this.commandsDispatched = 0;
    this.totalConnections = 0;
    this.startTime = new Date();
    
    // Add server start log entry
    this.addActivityLogEntry({
      type: 'server_started',
      timestamp: new Date().toISOString(),
      title: 'Server Started',
      description: `Command Dispatcher listening on port ${process.env.PORT || 5000}`,
      metadata: {
        port: process.env.PORT || 5000,
        endpoints: ['POST /api/command', 'GET /api/get-command-long-poll/:classId']
      }
    });
  }

  addWaitingClient(client: WaitingClient): void {
    this.waitingClients.set(client.id, client);
    this.totalConnections++;
    
    this.addActivityLogEntry({
      type: 'client_connected',
      timestamp: new Date().toISOString(),
      title: 'Client Connected',
      description: `${client.hostname} joined class ${client.classId}`,
      metadata: {
        hostname: client.hostname,
        classId: client.classId,
        ip: client.ip
      }
    });
    
    console.log(`[${new Date().toISOString()}] Client connected: ${client.hostname} (${client.ip}) for class ${client.classId}`);
  }

  removeWaitingClient(clientId: string): void {
    const client = this.waitingClients.get(clientId);
    if (client) {
      this.waitingClients.delete(clientId);
      
      this.addActivityLogEntry({
        type: 'client_disconnected',
        timestamp: new Date().toISOString(),
        title: 'Client Disconnected',
        description: `${client.hostname} left class ${client.classId}`,
        metadata: {
          hostname: client.hostname,
          classId: client.classId,
          ip: client.ip
        }
      });
      
      console.log(`[${new Date().toISOString()}] Client disconnected: ${client.hostname} (${client.ip}) from class ${client.classId}`);
    }
  }

  getWaitingClientsByClassId(classId: string): WaitingClient[] {
    return Array.from(this.waitingClients.values()).filter(client => client.classId === classId);
  }

  getAllWaitingClients(): WaitingClient[] {
    return Array.from(this.waitingClients.values());
  }

  addActivityLogEntry(entry: Omit<ActivityLogEntry, 'id'>): void {
    const logEntry: ActivityLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.activityLog.unshift(logEntry); // Add to beginning for newest first
    
    // Keep only last 100 entries
    if (this.activityLog.length > 100) {
      this.activityLog = this.activityLog.slice(0, 100);
    }
  }

  getActivityLog(): ActivityLogEntry[] {
    return [...this.activityLog];
  }

  clearActivityLog(): void {
    this.activityLog = [];
  }

  incrementCommandsDispatched(): void {
    this.commandsDispatched++;
  }

  incrementTotalConnections(): void {
    this.totalConnections++;
  }

  getStats(): ServerStats {
    const uptime = Date.now() - this.startTime.getTime();
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      commandsDispatched: this.commandsDispatched,
      totalConnections: this.totalConnections,
      uptime: `${hours}h ${minutes}m`,
      startTime: this.startTime.toISOString()
    };
  }
}

export const storage = new MemStorage();
