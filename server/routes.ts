import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, WaitingClient } from "./storage";
import { commandSchema, ALLOWED_CLASS_IDS } from "@shared/schema";
import { nanoid } from "nanoid";
import { z } from "zod";
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

// Function to get client IP
function getClientIP(req: Request): string {
  // Get the X-Forwarded-For header value if exists
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
  
  // Get direct connection IP
  const directIp = req.socket.remoteAddress;
  
  // Return the most likely real client IP
  return (forwardedIp || directIp || '').trim();
}

// IP Whitelist Middleware
const ipWhitelistMiddleware = (req: Request, res: Response, next: Function) => {
  // Get whitelisted IPs from environment variable
  const WHITELISTED_IPS = process.env.WHITELISTED_IPS ? process.env.WHITELISTED_IPS.split(',').map(ip => ip.trim()) : [];

  // Always allow localhost for development
  if (process.env.NODE_ENV === "development") {
    return next();
  }

  // Get the real client IP from X-Forwarded-For since we're behind a load balancer
  const clientIp = getClientIP(req);
  
  // Check if the client's IP is in our whitelist
  if (!WHITELISTED_IPS.includes(clientIp)) {
    console.log(`Access denied for IP: ${clientIp} (Whitelist: ${WHITELISTED_IPS.join(', ')})`);
    return res.status(403).json({ 
      message: 'Access denied.',
      yourIp: clientIp // Return the IP we detected for debugging
    });
  }

  next();
};

// Frontend protection middleware - protects the main app
const frontendProtectionMiddleware = (req: Request, res: Response, next: Function) => {
  // Skip protection for client connection endpoints
  const unprotectedPaths = [
    '/api/ws',
    '/api/command-output'  // Allow clients to send command outputs
  ];

  // Check if the request path starts with any of the unprotected paths
  if (unprotectedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Apply IP whitelist protection for all other paths
  return ipWhitelistMiddleware(req, res, next);
};

function getClientHostnameWs(req: IncomingMessage): string {
  // Try to get hostname from headers, fallback to generating one
  const hostname = req.headers['x-hostname'] || 
                  req.headers['host']?.split('.')[0] || 
                  `CLIENT-${Math.floor(Math.random() * 999)}`;
  return hostname.toString().toUpperCase();
}

function getClientIPWs(req: IncomingMessage): string {
  return req.headers['x-ip']?.toString() || 
         req.socket.remoteAddress || 
         '127.0.0.1';
}

// Function to handle WebSocket ping messages
function handlePing(ws: WebSocket) {
  try {
    ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending pong:`, error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply frontend protection to all routes
  app.use(frontendProtectionMiddleware);

  // POST /api/command - Dispatch command to clients
  app.post("/api/command", async (req: Request, res: Response) => {
    try {
      const { classId, cmd, clientId } = commandSchema.parse(req.body);
      
      // Validate classId
      if (!ALLOWED_CLASS_IDS.has(classId)) {
        return res.status(400).json({ 
          message: `Invalid classId. Allowed values: ${Array.from(ALLOWED_CLASS_IDS).join(', ')}` 
        });
      }

      console.log(`[${new Date().toISOString()}] Command received:
        Command: "${cmd}"
        Class: ${classId}
        Client: ${clientId || 'all'}
        Body: ${JSON.stringify(req.body, null, 2)}
      `);

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

      // Filter clients if clientId is specified
      const targetClients = clientId 
        ? waitingClients.filter(client => client.id === clientId)
        : waitingClients;

      if (clientId && targetClients.length === 0) {
        console.log(`[${new Date().toISOString()}] Client ${clientId} not found in waiting clients for class ${classId}`);
        return res.status(404).json({
          message: `Specified client ${clientId} not found or not connected`,
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

      console.log(`[${new Date().toISOString()}] Sending command response:
        ${JSON.stringify(commandResponse, null, 2)}
        To clients: ${targetClients.map(c => `${c.hostname} (${c.ip})`).join(', ')}
      `);

      // Send command to target clients
      const clientsNotified: string[] = [];
      const outputs: Record<string, string> = {};  // Store outputs for each client

      for (const client of targetClients) {
        try {
          // If this is a class change command, update the class in storage first
          if (cmd.includes('echo') && cmd.includes('class.txt')) {
            const newClass = cmd.split('echo ')[1].split(' >')[0].trim();
            storage.updateClientClass(client.id, newClass);
          }

          // Send the command based on connection type
          if (client.connectionType === 'websocket' && client.ws?.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(commandResponse));
            clientsNotified.push(client.hostname);
          } else if (client.connectionType === 'longpoll' && client.response && 'json' in client.response) {
            (client.response as Response).json(commandResponse);
            clientsNotified.push(client.hostname);
            storage.removeWaitingClient(client.id);
          }

          console.log(`[${new Date().toISOString()}] Command sent to ${client.hostname} (${client.ip}) via ${client.connectionType}`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Failed to send command to ${client.hostname}: ${error}`);
          storage.removeWaitingClient(client.id);
        }
      }

      // Update stats and log activity
      storage.incrementCommandsDispatched();
      const logEntry = {
        type: 'command_dispatched' as const,
        timestamp: new Date().toISOString(),
        title: 'Command Dispatched',
        description: clientId 
          ? `Sent "${cmd}" to client ${clientsNotified[0]} (class ${classId})`
          : `Sent "${cmd}" to class ${classId}`,
        metadata: {
          command: cmd,
          classId: classId,
          clientId: clientId,
          clientsNotified: clientsNotified,
          clientCount: clientsNotified.length,
          outputs: {}
        }
      };
      storage.addActivityLogEntry(logEntry);

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

  // POST /api/clients/:clientId/change-class - Change client class
  app.post("/api/clients/:clientId/change-class", async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const schema = z.object({ newClass: z.string() });
      const { newClass } = schema.parse(req.body);

      // Validate newClass
      if (!ALLOWED_CLASS_IDS.has(newClass)) {
        return res.status(400).json({ 
          message: `Invalid class. Allowed values: ${Array.from(ALLOWED_CLASS_IDS).join(', ')}` 
        });
      }

      // Find the client
      const client = storage.getWaitingClientById(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Update the client's class
      const oldClass = client.classId;
      client.classId = newClass;

      // Send command to update class.txt
      const updateCommand = `echo ${newClass} > C:\\cmdmanager\\class.txt`;
      
      // Prepare command response
      const commandResponse = {
        class: oldClass, // Use old class since client hasn't updated yet
        cmd: updateCommand,
        timestamp: new Date().toISOString()
      };

      // Send command to client
      try {
        client.response?.json(commandResponse);
        storage.removeWaitingClient(clientId);
        console.log(`[${new Date().toISOString()}] Class update command sent to ${client.hostname} (${client.ip})`);
        
        // Update stats
        storage.incrementCommandsDispatched();
        
        // Log command dispatch
        storage.addActivityLogEntry({
          type: 'command_dispatched',
          timestamp: new Date().toISOString(),
          title: 'Class Update Command Dispatched',
          description: `Sent class update command to ${client.hostname}`,
          metadata: {
            command: updateCommand,
            clientId,
            hostname: client.hostname,
            oldClass,
            newClass
          }
        });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to send class update command to ${client.hostname}: ${error}`);
        storage.removeWaitingClient(clientId);
        return res.status(500).json({ message: "Failed to send class update command to client" });
      }

      // Log the class change
      storage.addActivityLogEntry({
        type: 'class_changed',
        timestamp: new Date().toISOString(),
        title: 'Client Class Changed',
        description: `Changed class for ${client.hostname} from ${oldClass} to ${newClass}`,
        metadata: {
          clientId,
          hostname: client.hostname,
          oldClass,
          newClass
        }
      });

      res.json({ 
        message: "Client class updated successfully",
        client: {
          id: client.id,
          hostname: client.hostname,
          classId: client.classId,
          ip: client.ip
        }
      });

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error changing client class:`, error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Invalid request" 
      });
    }
  });

  // POST /api/clients/:clientId/remove - Remove a client by sending a kill command
  app.post("/api/clients/:clientId/remove", async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      
      // Find the client
      const client = storage.getWaitingClientById(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Send a kill command to the client
      const commandResponse = {
        class: client.classId,
        cmd: "taskkill /F /PID $PID",
        timestamp: new Date().toISOString()
      };

      try {
        if (client.connectionType === 'websocket' && client.ws?.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify(commandResponse));
        } else if (client.connectionType === 'longpoll' && client.response) {
          client.response.json(commandResponse);
        }
        
        // Remove client from storage
        storage.removeWaitingClient(clientId);
        
        // Log the removal
        storage.addActivityLogEntry({
          type: 'client_disconnected',
          timestamp: new Date().toISOString(),
          title: 'Client Removed',
          description: `Client ${client.hostname} was removed by admin`,
          metadata: {
            hostname: client.hostname,
            classId: client.classId,
            ip: client.ip
          }
        });

        res.json({ 
          message: "Client removal command sent successfully",
          client: {
            id: client.id,
            hostname: client.hostname,
            classId: client.classId,
            ip: client.ip
          }
        });

      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to send removal command to ${client.hostname}: ${error}`);
        storage.removeWaitingClient(clientId);
        return res.status(500).json({ message: "Failed to send removal command to client" });
      }

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error removing client:`, error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Invalid request" 
      });
    }
  });

  // POST /api/command-output - Receive command output from clients
  app.post("/api/command-output", async (req: Request, res: Response) => {
    try {
      const { command, output, timestamp, isError } = req.body;
      const hostname = req.headers['x-hostname'] as string;
      const ip = req.headers['x-ip'] as string;

      // Find the most recent command_dispatched log entry for this command
      const recentLogs = storage.getActivityLog().slice(0, 10); // Look at last 10 entries
      const commandLog = recentLogs.find(log => 
        log.type === 'command_dispatched' && 
        log.metadata?.command === command
      );

      if (commandLog && commandLog.metadata) {
        // Create a new metadata object with updated outputs
        const updatedMetadata = {
          ...commandLog.metadata,
          outputs: {
            ...(commandLog.metadata.outputs || {}),
            [hostname]: {
              output,
              timestamp,
              isError: !!isError,
              ip
            }
          }
        };

        // Create a new log entry with the updated metadata
        const updatedLog = {
          ...commandLog,
          metadata: updatedMetadata
        };

        // Update the log entry
        storage.updateActivityLogEntry(commandLog.id, updatedLog);
      }

      res.json({ message: "Output received" });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error processing command output:`, error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Invalid request" 
      });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server with a specific path prefix
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/ws'  // Add specific path prefix for our WebSocket connections
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // Extract classId from URL query parameters instead of path
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const classId = url.searchParams.get('classId');
    
    if (!classId || !ALLOWED_CLASS_IDS.has(classId)) {
      ws.close(1008, 'Invalid classId');
      return;
    }

    // Get client info
    const clientId = nanoid();
    const hostname = getClientHostnameWs(req);
    const ip = getClientIPWs(req);

    console.log(`[${new Date().toISOString()}] WebSocket connection established: ${hostname} (${ip}) for class ${classId}`);

    // Setup ping interval
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error sending ping to ${hostname}:`, error);
        }
      }
    }, 30000);

    // If this client was previously connected with a different class, log the change
    const existingClient = storage.getWaitingClientByHostname(hostname);
    if (existingClient) {
      console.log(`[${new Date().toISOString()}] Client ${hostname} reconnected with new class: ${classId} (was: ${existingClient.classId})`);
      storage.removeWaitingClient(existingClient.id);
    }

    // Create waiting client
    const waitingClient: WaitingClient = {
      id: clientId,
      ws,
      classId,
      hostname,
      ip,
      connectedAt: new Date(),
      connectionType: 'websocket'
    };

    // Add to waiting clients
    storage.addWaitingClient(waitingClient);

    // Handle WebSocket messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'ping') {
          handlePing(ws);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing message from ${hostname}:`, error);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      clearInterval(pingInterval);
      storage.removeWaitingClient(clientId);
    });

    ws.on('error', () => {
      clearInterval(pingInterval);
      storage.removeWaitingClient(clientId);
    });

    // Send initial connection confirmation
    try {
      ws.send(JSON.stringify({
        type: 'connection_established',
        clientId,
        classId,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error sending connection confirmation to ${hostname}:`, error);
    }
  });

  return httpServer;
}
