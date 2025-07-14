# Local Development Setup Guide

## Quick Start for Local Development

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (local or remote)
- Git

### Setup Steps

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd MaintainPro-Replit
   npm install
   ```

2. **Database Setup**
   
   **Option A: Local PostgreSQL**
   ```bash
   # Install PostgreSQL (Ubuntu/Debian)
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # Start PostgreSQL service
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   
   # Create database and user
   sudo -u postgres psql
   CREATE DATABASE maintainpro;
   CREATE USER maintainpro_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE maintainpro TO maintainpro_user;
   \q
   ```
   
   **Option B: Use Docker**
   ```bash
   docker run --name maintainpro-postgres \
     -e POSTGRES_DB=maintainpro \
     -e POSTGRES_USER=maintainpro_user \
     -e POSTGRES_PASSWORD=your_password \
     -p 5432:5432 \
     -d postgres:15
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```
   
   Update `.env` file:
   ```env
   DATABASE_URL=postgresql://maintainpro_user:your_password@localhost:5432/maintainpro
   NODE_ENV=development
   PORT=5000
   ```

4. **Initialize Database**
   ```bash
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   The application will be available at: http://localhost:5000

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Push schema changes to database
- `npm run db:generate` - Generate migrations
- `npm run clean` - Clean build artifacts

## Troubleshooting

### Database Connection Issues
1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Check database credentials in `.env`
3. Ensure database exists: `psql -U maintainpro_user -d maintainpro -h localhost`

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000
# Kill the process
kill -9 <PID>
```

### TypeScript Errors
The application may have some TypeScript warnings but should still build and run. Run:
```bash
npm run check
```
to see all type issues.

## Production Deployment

### Environment Variables
Set these in your production environment:
```env
DATABASE_URL=postgresql://user:password@your-db-host:5432/maintainpro
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-secure-session-secret
```

### Build and Deploy
```bash
npm run build
npm start
```

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start dist/index.js --name "maintainpro"
pm2 startup
pm2 save
```

## Features Verified Working

✅ Frontend React application builds successfully  
✅ Express.js backend server starts  
✅ Database connection (with proper DATABASE_URL)  
✅ Vite development server with HMR  
✅ Production build process  
✅ TypeScript compilation (with warnings)  

## Migration from Replit - Completed

✅ Removed Replit-specific Vite plugins  
✅ Removed Replit banner script  
✅ Removed `.replit` configuration file  
✅ Updated package.json dependencies  
✅ Created local development environment files  
✅ Updated server configuration for local development  
✅ Added comprehensive documentation
