import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { MongoClient, Db } from "mongodb";
import type { User } from "@shared/schema";

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface UserWithPassword extends User {
  passwordHash: string;
}

class DatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect() {
    if (process.env.NODE_ENV === 'production') {
      const mongoUrl = process.env.MONGODB_URI;
      const dbName = process.env.MONGODB_DB_NAME;

      if (!mongoUrl || !dbName) {
        throw new Error('MongoDB connection parameters not provided. Please set MONGODB_URI and MONGODB_DB_NAME environment variables.');
      }

      try {
        this.client = new MongoClient(mongoUrl);
        await this.client.connect();
        this.db = this.client.db(dbName);
        console.log('Connected to MongoDB Atlas');
      } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
      }
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from MongoDB Atlas');
    }
  }

  async getUsers(): Promise<UserWithPassword[]> {
    if (process.env.NODE_ENV === 'production') {
      if (!this.db) {
        throw new Error('Database not connected');
      }
      
      const collection = this.db.collection('users');
      const users = await collection.find({}).toArray();
      return users as UserWithPassword[];
    } else {
      // Development: Read from JSON file
      const usersPath = join(__dirname, "users.json");
      const usersFile = readFileSync(usersPath, "utf-8");
      const data = JSON.parse(usersFile);
      return data.users;
    }
  }

  async findUserByUsername(username: string): Promise<UserWithPassword | null> {
    const users = await this.getUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  async findUserById(id: string): Promise<UserWithPassword | null> {
    const users = await this.getUsers();
    return users.find(u => u.id === id) || null;
  }

  async updateUserLastLogin(userId: string, lastLogin: Date) {
    if (process.env.NODE_ENV === 'production') {
      if (!this.db) {
        throw new Error('Database not connected');
      }
      
      const collection = this.db.collection('users');
      await collection.updateOne(
        { id: userId },
        { $set: { lastLogin } }
      );
    }
    // In development, we don't update the JSON file for now
  }
}

export const dbService = new DatabaseService(); 