# MaintAInPro CMMS - Enterprise Maintenance Management System

## Overview

This repository contains an enterprise-grade Computerized Maintenance Management System (CMMS) built with modern web technologies. The system provides comprehensive maintenance operations management including work orders, equipment tracking, inventory management, and preventive maintenance scheduling.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a full-stack architecture with clear separation between frontend and backend concerns:

- **Frontend**: React 18+ with TypeScript, using Vite for development and building
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with Shadcn/ui components
- **State Management**: TanStack Query for server state and caching

## Key Components

### Frontend Architecture
- **Component Library**: Shadcn/ui for consistent, accessible UI components
- **Routing**: Wouter for lightweight client-side routing
- **Form Management**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query for server state management
- **Styling**: Tailwind CSS with CSS variables for theming
- **Mobile Support**: Responsive design with mobile-first approach

### Backend Architecture
- **API Layer**: RESTful Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Simple header-based authentication (placeholder for production auth)
- **Storage**: In-memory storage interface with database abstraction

### Database Schema
The application uses a comprehensive schema including:
- **Users & Authentication**: Profile management with role-based access
- **Warehouses**: Multi-location support
- **Equipment**: Asset tracking with QR codes and hierarchy support
- **Work Orders**: Complete maintenance workflow management
- **Parts & Inventory**: Stock management with usage tracking
- **Preventive Maintenance**: Template-based PM scheduling
- **Notifications**: Alert and communication system

## Data Flow

1. **Client Requests**: Frontend makes API calls through TanStack Query
2. **Authentication**: Simple header-based user/warehouse identification
3. **API Processing**: Express routes handle business logic
4. **Data Access**: Storage layer abstracts database operations
5. **Response**: JSON responses with proper error handling
6. **State Management**: TanStack Query caches and synchronizes server state

## External Dependencies

### Production Dependencies
- **Database**: Neon Database (PostgreSQL) via `@neondatabase/serverless`
- **ORM**: Drizzle ORM with Zod integration
- **UI Components**: Radix UI primitives for accessibility
- **Form Validation**: Zod schemas for type-safe validation
- **Date Handling**: date-fns for date formatting and manipulation

### Development Tools
- **Build Tool**: Vite with React plugin
- **TypeScript**: Strict type checking enabled
- **Styling**: PostCSS with Tailwind CSS
- **Code Quality**: ESBuild for production builds

## Deployment Strategy

### Development Environment
- Vite development server with hot module replacement
- Express server running in development mode
- Environment-based configuration

### Production Build
- Vite builds optimized client bundle to `dist/public`
- ESBuild bundles server code to `dist/index.js`
- Static file serving for production deployment

### Database Management
- Drizzle Kit for schema migrations
- Environment variable configuration for database connection
- PostgreSQL dialect with connection pooling

### Key Features Implemented
- **Dashboard**: Real-time metrics and quick actions
- **Work Order Management**: Complete CRUD operations with status tracking
- **Equipment Management**: Asset tracking with QR code support
- **Inventory Management**: Parts tracking with stock level monitoring
- **Authentication**: Role-based access control
- **Mobile Support**: Responsive design for field operations

### Planned Enhancements
- Supabase integration for authentication and real-time features
- Offline functionality with service workers
- Advanced reporting and analytics
- File upload and attachment management
- Push notifications and alerts