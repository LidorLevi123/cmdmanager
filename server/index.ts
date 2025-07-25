import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { handleLogin, handleLogout, getCurrentUser, requireAuth } from "./auth";
import { registerRoutes } from "./routes";
import { registerViteDevServer } from "./vite";
import { Request, Response } from "express";

// Get directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

// Get the correct dist path based on environment
const getDistPath = () => {
  if (process.env.NODE_ENV === 'production') {
    // OnRender's project structure
    return '/opt/render/project/src/dist/public';
  }
  // Local development
  return path.join(rootDir, 'dist', 'public');
};

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://replit.com"],
      connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*", "http://localhost:*", "https://localhost:*", "https://replit.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-site" },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later"
});

// Apply rate limiting to auth endpoints
app.use("/api/auth", limiter);

// Session store setup
const SessionStore = MemoryStore(session);

// Session configuration
app.use(session({
  store: new SessionStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  secret: process.env.SESSION_SECRET || "your-super-secret-key-change-this-in-production",
  resave: false,
  saveUninitialized: false,
  name: "session_id", // Don't use the default "connect.sid"
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.json());
app.use(cookieParser());

// Authentication routes
app.post("/api/auth/login", handleLogin);
app.post("/api/auth/logout", handleLogout);
app.get("/api/auth/me", getCurrentUser);

// Protect all API routes except authentication and client connection
app.use("/api", (req, res, next) => {
  // Skip auth for login, logout, and client connection endpoints
  if (
    req.path.startsWith("/auth") ||
    req.path.startsWith("/ws") ||
    req.path.startsWith("/command-output")  // Allow clients to send outputs without auth
  ) {
    return next();
  }
  requireAuth(req, res, next);
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const distPath = getDistPath();
  console.log(`Serving static files from: ${distPath}`);
  
  // Serve only the dist/public folder's contents
  app.use('/', express.static(distPath));

  // Handle React routing, but only for non-API routes
  app.get('/*', (req: Request, res: Response, next: Function) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // Only serve index.html from dist/public folder
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Register other routes
registerRoutes(app).then((httpServer) => {
  // OnRender uses PORT environment variable
  const port = process.env.PORT || 3000;
  
  // Setup Vite in development mode
  if (process.env.NODE_ENV !== "production") {
    registerViteDevServer(app, httpServer).catch(err => {
      console.error("Failed to start Vite dev server:", err);
      process.exit(1);
    });
  }

  httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
