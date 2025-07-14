**Technical Stack & Architecture**

---

## 💻 TECHNICAL STACK & REQUIREMENTS

### 🏗️ ARCHITECTURE PRINCIPLES

**Apply these architectural patterns consistently:**
- **Domain-Driven Design (DDD)**: Organize code by business domains, not technical layers
- **CQRS Pattern**: Separate read/write operations for optimal performance
- **Event Sourcing**: Track all state changes for audit and debugging
- **Hexagonal Architecture**: Decouple business logic from external dependencies
- **Micro-frontends**: Modular, independently deployable UI components
- **API-First Design**: Design APIs before implementing features
- **Twelve-Factor App**: Cloud-native application principles
- **Progressive Enhancement**: Mobile-first with graceful degradation

### 🎨 Frontend Architecture:
- **React 18+** with TypeScript (Strict mode enabled)
- **Vite 5+** for lightning-fast development and optimized builds
- **Tailwind CSS 3+** with custom design system and component tokens
- **Headless UI** for accessible, unstyled components
- **Framer Motion** for smooth animations and micro-interactions
- **React Query v4** (TanStack Query) for state management and caching
- **React Hook Form** with Zod validation for type-safe forms
- **React Router 6** with lazy loading and code splitting
- **React Testing Library** for component testing
- **Storybook 7** for component development and documentation

### 🔧 Advanced Frontend Tools:
- **MSW (Mock Service Worker)** for API mocking during development
- **Chromatic** for visual regression testing
- **React DevTools Profiler** for performance optimization
- **Bundle Analyzer** for optimizing bundle sizes
- **Lighthouse CI** for automated performance auditing
- **Axe-core** for accessibility testing automation
- **React Error Boundary** for graceful error handling
- **React Suspense** for progressive loading states

### 🗄️ Backend & Database:
- **Supabase** (Latest version) for backend-as-a-service
- **PostgreSQL 15+** with advanced indexing and query optimization
- **Row Level Security (RLS)** for fine-grained access control
- **Supabase Edge Functions** (Deno runtime) for serverless computing
- **PostgREST** for auto-generated RESTful APIs
- **Supabase Realtime** for live data synchronization
- **Supabase Storage** with CDN and image transformations

### 📱 Mobile & PWA Features:
- **Progressive Web App (PWA)** with full offline support
- **IndexedDB** via Dexie.js for client-side database
- **Service Worker** for background sync and caching
- **Web Push Notifications** for real-time alerts
- **WebRTC** for camera access and QR code scanning
- **Geolocation API** for location-based features
- **Device Orientation** for mobile-optimized interactions

### 🔧 Development Tools:
- **TypeScript 5+** with strict configuration
- **ESLint** with custom rules and auto-fixing
- **Prettier** for consistent code formatting
- **Husky** for Git hooks and pre-commit validation
- **lint-staged** for staged file linting
- **Commitizen** for standardized commit messages
- **Release-it** for automated versioning and releases

### 📊 Monitoring & Analytics:
- **Sentry** for error tracking and performance monitoring
- **LogRocket** for session replay and debugging
- **Mixpanel** for user behavior analytics
- **Hotjar** for user experience insights
- **Google Analytics 4** for web analytics
- **Supabase Analytics** for database performance monitoring

### 📈 Performance Optimization:
- **Database indexing strategy** for optimal query performance
- **Query optimization** with EXPLAIN ANALYZE monitoring
- **Connection pooling** for efficient resource utilization
- **Caching layers** (Redis) for frequently accessed data
- **CDN integration** for static asset delivery
- **Image optimization** with WebP and AVIF formats
- **Code splitting** for reduced initial bundle sizes
- **Lazy loading** for components and routes
- **Tree shaking** for unused code elimination
- **Bundle compression** with Brotli and Gzip
