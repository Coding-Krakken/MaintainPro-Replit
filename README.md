# MaintainPro CMMS - Enterprise Maintenance Management System

## Overview

This is an enterprise-grade Computerized Maintenance Management System (CMMS) built with modern web technologies. The system provides comprehensive maintenance operations management including work orders, equipment tracking, inventory management, and preventive maintenance scheduling.

## Tech Stack

- **Frontend**: React 18+ with TypeScript, Vite
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with Shadcn/ui components
- **State Management**: TanStack Query

## Prerequisites

Before running this application locally, ensure you have:

- Node.js 18+ installed
- PostgreSQL database running
- npm or yarn package manager

## Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MaintainPro-Replit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your local database configuration.

4. **Set up PostgreSQL database**
   - Create a new PostgreSQL database named `maintainpro`
   - Update the `DATABASE_URL` in your `.env` file

5. **Run database migrations**
   ```bash
   npm run db:push
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Type check
- `npm run db:push` - Push database schema changes

## Database Configuration

The application uses PostgreSQL with Drizzle ORM. Make sure to:

1. Install PostgreSQL locally or use a cloud provider
2. Create a database named `maintainpro`
3. Set the correct `DATABASE_URL` in your `.env` file
4. Run `npm run db:push` to create the required tables

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables
3. Start the production server:
   ```bash
   npm start
   ```

## Features

- **Work Order Management**: Complete maintenance workflow
- **Equipment Tracking**: Asset management with QR codes
- **Inventory Management**: Parts and supplies tracking
- **Preventive Maintenance**: Template-based scheduling
- **Multi-location Support**: Warehouse management
- **Mobile-friendly**: Responsive design
- **Real-time Updates**: Live data synchronization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
