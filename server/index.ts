import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import helmet from "helmet";

const app = express();

// IP Whitelist Configuration
const WHITELISTED_IPS = process.env.WHITELISTED_IPS ? process.env.WHITELISTED_IPS.split(',') : [];

// Function to get client IP
function getClientIp(req: Request): string {
  // Get the X-Forwarded-For header value if exists
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
  
  // Get direct connection IP
  const directIp = req.socket.remoteAddress;
  
  // Log both IPs for debugging
  const timestamp = new Date().toISOString();
  log(`[${timestamp}] Request IPs - Forwarded: ${forwardedIp || 'none'}, Direct: ${directIp || 'none'}`);
  
  // Return the most likely real client IP
  return (forwardedIp || directIp || '').trim();
}

// IP Whitelist Middleware
export function ipWhitelistMiddleware(req: Request, res: Response, next: NextFunction) {
  // Always allow localhost for development
  if (app.get("env") === "development") {
    return next();
  }

  const clientIp = getClientIp(req);
  
  // Check if the client's IP is in our whitelist
  if (!WHITELISTED_IPS.includes(clientIp)) {
    log(`Access denied for IP: ${clientIp} (Whitelist: ${WHITELISTED_IPS.join(', ')})`);
    return res.status(403).json({ 
      message: 'Access denied. Your IP is not whitelisted.',
      yourIp: clientIp // Return the IP we detected for debugging
    });
  }

  next();
}

// Security headers in production
if (app.get("env") === "production") {
  app.use(helmet());
  
  // Force HTTPS in production
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(['https://', req.get('Host'), req.url].join(''));
    }
    next();
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Trust proxy settings
app.set('trust proxy', true);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 3000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen(port, '0.0.0.0', () => {  // Changed from '127.0.0.1' to '0.0.0.0' to accept all connections
    log(`serving on port ${port}`);
  });
})();
