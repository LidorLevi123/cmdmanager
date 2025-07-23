# Command Dispatcher Application

## Overview

This is a real-time command dispatcher application for managing a fleet of client computers using a long-polling architecture. The system allows administrators to send commands to specific groups of clients and provides a comprehensive dashboard for monitoring connections and activities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

This is a full-stack web application built with a modern TypeScript stack:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: PostgreSQL-backed sessions
- **Real-time Communication**: Long-polling for command distribution

## Key Components

### Command Dispatcher Core
The heart of the system implements a long-polling architecture where:
- Client computers connect to `/api/get-command-long-poll/:classId` and wait for commands
- Administrators send commands via `/api/command` POST endpoint
- Commands are immediately dispatched to waiting clients matching the class ID
- Connection management prevents memory leaks through proper cleanup

### Dashboard Interface
- **Command Form**: Interface for sending commands to specific client classes
- **Connected Clients**: Real-time display of active client connections
- **Activity Log**: Comprehensive logging of all system activities
- **Server Statistics**: Performance metrics and uptime information

### Data Storage
- **In-Memory Storage**: Active client connections and real-time state
- **Database Schema**: Activity logging, statistics, and persistent data
- **Shared Types**: Type-safe communication between frontend and backend

## Data Flow

1. **Client Connection**: Clients connect to the long-polling endpoint with their class ID
2. **Command Submission**: Administrators submit commands through the web interface
3. **Command Validation**: System validates class ID against allowed values
4. **Command Distribution**: Commands are immediately sent to matching waiting clients
5. **Activity Logging**: All actions are logged for audit and monitoring
6. **Real-time Updates**: Dashboard updates automatically via polling intervals

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe SQL toolkit and ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/**: Accessible UI component primitives
- **nanoid**: Unique ID generation
- **zod**: Runtime type validation

### Development Tools
- **Vite**: Build tool with React plugin
- **Replit**: Development environment with specific plugins
- **ESBuild**: Production bundling for server code

## Deployment Strategy

### Development
- Vite dev server for frontend with HMR
- tsx for TypeScript execution in development
- Replit-specific tooling for development environment

### Production Build
- Frontend: Vite builds optimized static assets
- Backend: ESBuild bundles server code for Node.js
- Database: Drizzle migrations for schema management

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- PostgreSQL dialect configuration in Drizzle
- Port configuration with fallback to 5000

### Architecture Decisions

**Long-Polling Choice**: Selected over WebSockets for simplicity and reliability in varied network conditions. Long-polling provides real-time communication while being more firewall-friendly and easier to debug.

**In-Memory State Management**: Waiting client connections are stored in memory for immediate command dispatch. This provides the fastest response times but requires proper cleanup to prevent memory leaks.

**PostgreSQL for Persistence**: Despite using in-memory state for real-time operations, PostgreSQL provides reliable persistence for activity logs, statistics, and session management.

**Shared Schema**: TypeScript schemas are shared between frontend and backend to ensure type safety across the entire application stack.

**Component Architecture**: Modular React components with clear separation of concerns, making the codebase maintainable and the UI consistent.