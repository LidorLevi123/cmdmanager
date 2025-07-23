import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, WaitingClient } from "./storage";
import { commandSchema, ALLOWED_CLASS_IDS } from "@shared/schema";
import { nanoid } from "nanoid";

function getClientHostname(req: Request): string {
  // Try to get hostname from headers, fallback to generating one
  const hostname = req.headers['x-hostname'] || 
                  req.headers['host']?.split('.')[0] || 
                  `CLIENT-${Math.floor(Math.random() * 999)}`;
  return hostname.toString().toUpperCase();
}

function getClientIP(req: Request): string {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         (req.connection as any)?.socket?.remoteAddress ||
         '127.0.0.1';
}

export async function registerRoutes(app: Express): Promise<Server> {
  // POST /api/command - Dispatch command to clients
  app.post("/api/command", async (req: Request, res: Response) => {
    try {
      const { classId, cmd } = commandSchema.parse(req.body);
      
      // Validate classId
      if (!ALLOWED_CLASS_IDS.has(classId)) {
        return res.status(400).json({ 
          message: `Invalid classId. Allowed values: ${Array.from(ALLOWED_CLASS_IDS).join(', ')}` 
        });
      }

      console.log(`[${new Date().toISOString()}] Command received: "${cmd}" for class ${classId}`);

      // Find waiting clients for this classId
      const waitingClients = storage.getWaitingClientsByClassId(classId);
      
      if (waitingClients.length === 0) {
        console.log(`[${new Date().toISOString()}] No waiting clients found for class ${classId}`);
        return res.status(202).json({ 
          message: `Command accepted but no clients waiting for class ${classId}`,
          classId,
          cmd,
          clientsNotified: 0
        });
      }

      // Prepare command response
      const commandResponse = {
        class: classId,
        cmd: cmd,
        timestamp: new Date().toISOString()
      };

      // Send command to all waiting clients
      const clientsNotified: string[] = [];
      for (const client of waitingClients) {
        try {
          client.response.json(commandResponse);
          clientsNotified.push(client.hostname);
          storage.removeWaitingClient(client.id);
          console.log(`[${new Date().toISOString()}] Command dispatched to ${client.hostname} (${client.ip})`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Failed to send command to ${client.hostname}: ${error}`);
          storage.removeWaitingClient(client.id);
        }
      }

      // Update stats and log activity
      storage.incrementCommandsDispatched();
      storage.addActivityLogEntry({
        type: 'command_dispatched',
        timestamp: new Date().toISOString(),
        title: 'Command Dispatched',
        description: `Sent "${cmd}" to class ${classId}`,
        metadata: {
          command: cmd,
          classId: classId,
          clientsNotified: clientsNotified,
          clientCount: clientsNotified.length
        }
      });

      console.log(`[${new Date().toISOString()}] Command successfully dispatched to ${clientsNotified.length} clients: ${clientsNotified.join(', ')}`);

      res.status(202).json({
        message: "Command dispatched successfully",
        classId,
        cmd,
        clientsNotified: clientsNotified.length,
        clients: clientsNotified
      });

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error processing command:`, error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Invalid request body" 
      });
    }
  });

  // GET /api/get-command-long-poll/:classId - Long-polling endpoint for clients
  app.get("/api/get-command-long-poll/:classId", (req: Request, res: Response) => {
    const { classId } = req.params;
    
    // Validate classId
    if (!ALLOWED_CLASS_IDS.has(classId)) {
      return res.status(400).json({ 
        message: `Invalid classId. Allowed values: ${Array.from(ALLOWED_CLASS_IDS).join(', ')}` 
      });
    }

    const clientId = nanoid();
    const hostname = getClientHostname(req);
    const ip = getClientIP(req);

    console.log(`[${new Date().toISOString()}] Long-polling connection established: ${hostname} (${ip}) for class ${classId}`);

    // Create waiting client
    const waitingClient: WaitingClient = {
      id: clientId,
      response: res,
      classId,
      hostname,
      ip,
      connectedAt: new Date()
    };

    // Add to waiting clients
    storage.addWaitingClient(waitingClient);

    // Handle client disconnect
    req.on('close', () => {
      storage.removeWaitingClient(clientId);
    });

    req.on('error', () => {
      storage.removeWaitingClient(clientId);
    });

    // Set headers for long-polling
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  });

  // GET /api/clients - Get connected clients
  app.get("/api/clients", (req: Request, res: Response) => {
    const waitingClients = storage.getAllWaitingClients();
    const connectedClients = waitingClients.map(client => {
      const now = new Date();
      const connectedDuration = Math.floor((now.getTime() - client.connectedAt.getTime()) / 1000);
      const minutes = Math.floor(connectedDuration / 60);
      const seconds = connectedDuration % 60;
      
      return {
        id: client.id,
        hostname: client.hostname,
        classId: client.classId,
        ip: client.ip,
        connectedAt: client.connectedAt.toISOString(),
        connectionDuration: minutes > 0 ? `${minutes}m` : `${seconds}s`
      };
    });

    res.json(connectedClients);
  });

  // GET /api/activity-log - Get activity log
  app.get("/api/activity-log", (req: Request, res: Response) => {
    const activityLog = storage.getActivityLog();
    res.json(activityLog);
  });

  // DELETE /api/activity-log - Clear activity log
  app.delete("/api/activity-log", (req: Request, res: Response) => {
    storage.clearActivityLog();
    res.json({ message: "Activity log cleared" });
  });

  // GET /api/stats - Get server statistics
  app.get("/api/stats", (req: Request, res: Response) => {
    const stats = storage.getStats();
    res.json(stats);
  });

  const httpServer = createServer(app);
  return httpServer;
}
