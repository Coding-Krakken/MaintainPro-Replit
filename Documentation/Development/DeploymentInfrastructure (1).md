**Deployment & Infrastructure Specification**

---

**Purpose:**
Define deployment strategies, infrastructure requirements, environment configurations, and DevOps practices for the CMMS system.

---

**1. Environment Strategy:**

**1.1. Environment Tiers:**
* **Development**: Local development with Supabase CLI
* **Staging**: Production-like environment for testing
* **Production**: Live environment with high availability
* **Demo**: Sandboxed environment with sample data

**1.2. Environment Configuration:**
```typescript
// Environment-specific configurations
interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  app: {
    name: string;
    version: string;
    debug: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
  features: {
    offlineMode: boolean;
    pushNotifications: boolean;
    analytics: boolean;
  };
  limits: {
    fileUploadMaxSize: number;
    requestRateLimit: number;
    sessionTimeout: number;
  };
}
```

---

**2. Supabase Infrastructure:**

**2.1. Database Configuration:**
* **Production**: Supabase Pro plan with dedicated compute
* **Connection pooling**: PgBouncer for high concurrency
* **Read replicas**: For reporting and analytics queries
* **Backup strategy**: Daily backups with 30-day retention
* **Database monitoring**: Query performance and resource usage

**2.2. Edge Functions:**
```typescript
// Deployment configuration for Edge Functions
const edgeFunctions = {
  'escalation-checker': {
    schedule: '0 */6 * * *', // Every 6 hours
    timeout: 300, // 5 minutes
    memory: 512, // MB
  },
  'notification-sender': {
    schedule: '*/5 * * * *', // Every 5 minutes
    timeout: 60, // 1 minute
    memory: 256,
  },
  'pm-scheduler': {
    schedule: '0 2 * * *', // Daily at 2 AM
    timeout: 600, // 10 minutes
    memory: 1024,
  },
  'file-processor': {
    trigger: 'storage',
    timeout: 180, // 3 minutes
    memory: 512,
  }
};
```

**2.3. Storage Configuration:**
```sql
-- Storage buckets with RLS policies
CREATE POLICY "Public read access for QR codes" ON storage.objects
  FOR SELECT USING (bucket_id = 'qr-codes');

CREATE POLICY "Authenticated users can upload work order attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'wo-attachments' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can only access their warehouse files" ON storage.objects
  FOR ALL USING (
    bucket_id IN ('wo-attachments', 'pm-attachments') 
    AND (storage.foldername(name))[1] = (
      SELECT warehouse_id::text FROM profiles WHERE id = auth.uid()
    )
  );
```

---

**3. Frontend Deployment:**

**3.1. Build & Bundle Configuration:**
```typescript
// Vite production build config
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@supabase/supabase-js'],
          ui: ['@headlessui/react', '@heroicons/react'],
          utils: ['date-fns', 'lodash-es']
        }
      }
    }
  },
  pwa: {
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'supabase-storage',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
            }
          }
        }
      ]
    }
  }
});
```

**3.2. CDN & Hosting:**
* **Primary**: Vercel with edge deployment
* **CDN**: Cloudflare for global distribution
* **SSL**: Automatic HTTPS with Let's Encrypt
* **Compression**: Gzip/Brotli for static assets
* **Caching**: CDN cache with proper headers

---

**4. CI/CD Pipeline:**

**4.1. GitHub Actions Workflow:**
```yaml
name: Deploy CMMS Application

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm run test:ci
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}
      
      - name: Build application
        run: npm run build
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to Staging
        run: |
          npm run deploy:staging
          npm run db:migrate:staging
          npm run db:seed:staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to Production
        run: |
          npm run deploy:production
          npm run db:migrate:production
      
      - name: Run smoke tests
        run: npm run test:smoke:production
      
      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "CMMS Production deployment ${{ job.status }}"
```

**4.2. Database Migration Strategy:**
```sql
-- Migration versioning and rollback support
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rollback_sql TEXT
);

-- Example migration with rollback
INSERT INTO schema_migrations (version, rollback_sql) VALUES (
  '2024_01_15_001_add_escalation_fields',
  'ALTER TABLE work_orders DROP COLUMN escalated, DROP COLUMN escalation_level;'
);
```

---

**5. Monitoring & Observability:**

**5.1. Application Monitoring:**
```typescript
// Error tracking and performance monitoring
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  integrations: [
    new BrowserTracing({
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(
        React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes
      ),
    }),
  ],
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});

// Custom metrics tracking
const trackWorkOrderCompletion = (duration: number, technicianId: string) => {
  Sentry.metrics.increment('work_order.completed', 1, {
    tags: { technician_id: technicianId }
  });
  
  Sentry.metrics.distribution('work_order.completion_time', duration, {
    tags: { technician_id: technicianId }
  });
};
```

**5.2. Infrastructure Monitoring:**
* **Uptime monitoring**: Pingdom/StatusCake for availability
* **Performance monitoring**: Web Vitals tracking
* **Database monitoring**: Supabase built-in metrics
* **Error alerting**: Slack/PagerDuty integration
* **Log aggregation**: Structured logging with correlation IDs

---

**6. Security & Compliance:**

**6.1. Security Headers:**
```typescript
// Security headers configuration
const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' *.supabase.co",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: *.supabase.co",
    "connect-src 'self' *.supabase.co",
    "font-src 'self'",
    "frame-ancestors 'none'"
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)'
};
```

**6.2. Environment Variables Management:**
```bash
# Production environment variables (via CI/CD secrets)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsI...
VITE_APP_VERSION=$GITHUB_SHA
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_APP_ENVIRONMENT=production

# Database secrets (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsI...
DATABASE_URL=postgresql://xxx
```

---

**7. Backup & Disaster Recovery:**

**7.1. Backup Strategy:**
* **Database**: Automated daily backups with point-in-time recovery
* **File storage**: Cross-region replication for attachments
* **Configuration**: Infrastructure as Code (IaC) with Terraform
* **Recovery testing**: Monthly disaster recovery drills

**7.2. Incident Response:**
```yaml
# Incident response runbook
severity_levels:
  P0: System completely down
  P1: Core functionality impaired
  P2: Non-critical features affected
  P3: Minor issues or improvements

response_times:
  P0: 15 minutes
  P1: 1 hour
  P2: 4 hours
  P3: Next business day

escalation_matrix:
  - Primary: On-call engineer
  - Secondary: Tech lead
  - Executive: CTO (P0/P1 only)
```

---

**8. Performance Optimization:**

**8.1. Frontend Optimization:**
* Code splitting by route and feature
* Lazy loading for non-critical components
* Image optimization and WebP support
* Service Worker for offline functionality
* Bundle analysis and size monitoring

**8.2. Database Optimization:**
```sql
-- Critical indexes for performance
CREATE INDEX CONCURRENTLY idx_work_orders_assigned_status 
ON work_orders (assigned_to, status) WHERE status != 'closed';

CREATE INDEX CONCURRENTLY idx_part_transactions_timestamp 
ON part_transactions (timestamp DESC);

CREATE INDEX CONCURRENTLY idx_equipment_warehouse_active 
ON equipment (warehouse_id, status) WHERE status = 'active';

-- Database statistics and query plan monitoring
SELECT * FROM pg_stat_user_tables WHERE schemaname = 'public';
```
