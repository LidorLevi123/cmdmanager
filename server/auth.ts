import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { loginSchema } from "@shared/schema";
import type { User } from "@shared/schema";
import { dbService, type UserWithPassword } from "./database";
import 'express-session';

// Extend Express.Session type
declare module 'express-session' {
  interface SessionData {
    userId: string;
    userRole: string;
  }
}

// Authentication middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Login route handler
export const handleLogin = async (req: Request, res: Response) => {
  try {
    const credentials = loginSchema.parse(req.body);
    
    const user = await dbService.findUserByUsername(credentials.username);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Update last login in production
    await dbService.updateUserLastLogin(user.id, new Date());

    // Set session
    req.session.userId = user.id;
    req.session.userRole = user.role;

    // Return user info (excluding password hash)
    const { passwordHash, ...userInfo } = user;
    
    res.json({
      success: true,
      message: "Login successful",
      user: userInfo
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({ 
      success: false,
      message: error instanceof Error ? error.message : "Invalid request" 
    });
  }
};

// Logout route handler
export const handleLogout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ 
        success: false,
        message: "Failed to logout" 
      });
    }
    res.clearCookie("session_id"); // Use the correct cookie name
    res.json({ 
      success: true,
      message: "Logged out successfully" 
    });
  });
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ 
      success: false,
      message: "Not authenticated" 
    });
  }

  const user = await dbService.findUserById(req.session.userId);
  
  if (!user) {
    return res.status(404).json({ 
      success: false,
      message: "User not found" 
    });
  }

  const { passwordHash, ...userInfo } = user;
  res.json({
    success: true,
    user: userInfo
  });
}; 