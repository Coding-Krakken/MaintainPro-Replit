# MaintainPro CMMS - Development Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 13+ (for production)
- Git

### Quick Start
```bash
# Clone repository
git clone [repository-url]
cd MaintainPro-Replit

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test:all
```

## 🏗️ Architecture Overview

### Frontend (React + TypeScript)
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS with Shadcn/ui component library
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for lightweight routing
- **Forms**: React Hook Form with Zod validation

### Backend (Express + TypeScript)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Header-based with role validation
- **API**: RESTful endpoints with proper error handling
- **File Storage**: Local storage with configurable options

### Database Schema
- **Multi-tenant**: Warehouse-based data isolation
- **Relational**: Proper foreign key relationships
- **Scalable**: Designed for enterprise-level data volumes
- **Extensible**: Easy to add new modules and features

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── ui/       # Base UI components (Shadcn/ui)
│   │   │   ├── layout/   # Layout components
│   │   │   ├── work-orders/ # Work order components
│   │   │   ├── equipment/   # Equipment components
│   │   │   └── inventory/   # Inventory components
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript definitions
│   │   ├── lib/           # Utility libraries
│   │   └── utils/         # Helper functions
├── server/                # Express.js backend
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Data access layer
│   ├── index.ts           # Server entry point
│   └── services/          # Business logic services
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema definitions
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── e2e/              # End-to-end tests
│   └── utils/            # Test utilities
└── Documentation/         # Project documentation
```

## 🧪 Testing Strategy

### Test Types
1. **Unit Tests** - Individual component and function testing
2. **Integration Tests** - API and database integration
3. **E2E Tests** - Full user journey testing
4. **Accessibility Tests** - WCAG compliance testing
5. **Performance Tests** - Load and response time testing

### Test Environment Setup
- **Sample Data**: Consistent test data with fixed IDs
- **Mock Services**: MSW for API mocking
- **Test IDs**: Comprehensive `data-testid` attributes
- **Cross-Browser**: Chrome, Firefox, Safari, Mobile testing

### Running Tests
```bash
# All tests
npm run test:all

# Specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:accessibility

# Interactive testing
npm run test:ui
npm run test:e2e:ui
```

## 🔧 Development Workflow

### 1. Feature Development
1. Create feature branch from `main`
2. Implement feature with tests
3. Run full test suite
4. Create pull request
5. Review and merge

### 2. Testing Workflow
1. Write unit tests for new components/functions
2. Add integration tests for API endpoints
3. Update E2E tests for new user flows
4. Ensure accessibility compliance
5. Run performance tests for critical paths

### 3. Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality checks

## 📊 Key Modules

### 1. Authentication & Authorization
- **File**: `client/src/hooks/useAuth.tsx`
- **Features**: Role-based access, multi-warehouse support
- **Roles**: Admin, Manager, Supervisor, Technician, etc.

### 2. Work Order Management
- **Components**: `client/src/components/work-orders/`
- **API**: `/api/work-orders`
- **Features**: Lifecycle management, mobile support, QR integration

### 3. Equipment Tracking
- **Components**: `client/src/components/equipment/`
- **API**: `/api/equipment`
- **Features**: Asset tracking, QR codes, maintenance history

### 4. Inventory Management
- **Components**: `client/src/components/inventory/`
- **API**: `/api/parts`
- **Features**: Stock tracking, reorder alerts, usage monitoring

## 🛠️ Configuration

### Environment Variables
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/maintainpro
```

### Development Tools
- **Vite**: Fast development server and building
- **TypeScript**: Type safety and better developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Server state management
- **Drizzle ORM**: Type-safe database operations

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Configuration
- **Development**: SQLite with sample data
- **Production**: PostgreSQL with proper credentials
- **Testing**: In-memory database for fast tests

## 📈 Performance Considerations

### Frontend Optimization
- **Code Splitting**: Lazy loading for routes
- **Bundle Analysis**: Webpack bundle analyzer
- **Image Optimization**: Proper image formats and sizes
- **Caching**: Browser caching strategies

### Backend Optimization
- **Database Indexing**: Proper indexes for queries
- **Connection Pooling**: Efficient database connections
- **Caching**: Redis for session and data caching
- **Compression**: Gzip compression for responses

## 🔒 Security

### Authentication
- **JWT Tokens**: Secure token-based authentication
- **Role-Based Access**: Granular permission system
- **Session Management**: Secure session handling

### Data Protection
- **Input Validation**: Zod schema validation
- **SQL Injection**: Parameterized queries
- **XSS Protection**: Content Security Policy
- **HTTPS**: Secure transport layer

## 📚 Additional Resources

- **API Documentation**: See `/api` endpoints in routes.ts
- **Database Schema**: See `shared/schema.ts`
- **Component Library**: Shadcn/ui documentation
- **Testing Guide**: See `tests/README.md`
- **Roadmap**: See `ROADMAP.md` for future features

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Run test suite
5. Submit pull request
6. Code review and merge

## 📝 License

MIT License - see LICENSE file for details.
