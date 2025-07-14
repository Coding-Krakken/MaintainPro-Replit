**Project Structure & Architecture**

---

**Purpose:**
Define the complete directory structure, file organization, and architectural patterns for the CMMS application.

---

**1. Root Directory Structure:**

```
maintainpro-cmms/
├── .env.example
├── .env.local
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tailwind.config.js
├── postcss.config.js
├── README.md
├── DEPLOYMENT.md
├── SECURITY.md
├── CHANGELOG.md
│
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── icons/
│   └── images/
│
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Route components
│   ├── modules/            # Feature modules
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── stores/             # State management
│   ├── services/           # API and external services
│   ├── constants/          # Application constants
│   ├── assets/             # Static assets
│   └── __tests__/          # Test files
│
├── supabase/
│   ├── migrations/         # Database migrations
│   ├── functions/          # Edge Functions
│   ├── seed.sql           # Database seed data
│   ├── config.toml        # Supabase configuration
│   └── types/             # Generated types
│
├── docs/
│   ├── modules/           # Module specifications
│   ├── api/               # API documentation
│   ├── deployment/        # Deployment guides
│   └── user-guides/       # End-user documentation
│
├── scripts/
│   ├── build.sh
│   ├── deploy.sh
│   ├── test.sh
│   └── seed-data.ts
│
└── tests/
    ├── e2e/               # End-to-end tests
    ├── integration/       # Integration tests
    ├── fixtures/          # Test data fixtures
    └── utils/             # Test utilities
```

---

**2. Source Code Organization:**

**2.1. Components Structure:**
```
src/components/
├── ui/                    # Basic UI components
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   ├── Button.stories.tsx
│   │   └── index.ts
│   ├── Input/
│   ├── Modal/
│   ├── Card/
│   └── index.ts
│
├── forms/                 # Form components
│   ├── WorkOrderForm/
│   ├── PartForm/
│   ├── EquipmentForm/
│   └── index.ts
│
├── layout/                # Layout components
│   ├── AppLayout/
│   ├── MobileNavigation/
│   ├── Sidebar/
│   └── Header/
│
└── charts/                # Chart components
    ├── WorkOrderChart/
    ├── ComplianceChart/
    └── index.ts
```

**2.2. Feature Modules Structure:**
```
src/modules/
├── work-orders/
│   ├── components/
│   │   ├── WorkOrderCard/
│   │   ├── WorkOrderList/
│   │   ├── ChecklistItem/
│   │   └── StatusBadge/
│   ├── hooks/
│   │   ├── useWorkOrders.ts
│   │   ├── useWorkOrderMutations.ts
│   │   └── useWorkOrderSync.ts
│   ├── services/
│   │   ├── workOrderService.ts
│   │   └── workOrderSync.ts
│   ├── types/
│   │   └── workOrder.types.ts
│   ├── utils/
│   │   └── workOrderHelpers.ts
│   └── index.ts
│
├── equipment/
├── parts-inventory/
├── preventive-maintenance/
├── vendors/
├── reporting/
├── notifications/
└── auth/
```

**2.3. Hooks Structure:**
```
src/hooks/
├── api/                   # API-related hooks
│   ├── useWorkOrders.ts
│   ├── useEquipment.ts
│   ├── useParts.ts
│   └── useUsers.ts
│
├── auth/                  # Authentication hooks
│   ├── useAuth.ts
│   ├── useRole.ts
│   └── usePermissions.ts
│
├── offline/               # Offline functionality
│   ├── useOfflineSync.ts
│   ├── useNetworkStatus.ts
│   └── useIndexedDB.ts
│
├── ui/                    # UI-related hooks
│   ├── useModal.ts
│   ├── useToast.ts
│   └── useMobile.ts
│
└── utils/                 # Utility hooks
    ├── useLocalStorage.ts
    ├── useDebounce.ts
    └── useClickOutside.ts
```

---

**3. Database Schema Structure:**

**3.1. Migration Files:**
```
supabase/migrations/
├── 20240101000001_initial_schema.sql
├── 20240101000002_create_profiles.sql
├── 20240101000003_create_equipment.sql
├── 20240101000004_create_work_orders.sql
├── 20240101000005_create_parts.sql
├── 20240101000006_create_vendors.sql
├── 20240101000007_create_pm_templates.sql
├── 20240101000008_create_notifications.sql
├── 20240101000009_create_system_logs.sql
├── 20240101000010_create_rls_policies.sql
├── 20240101000011_create_indexes.sql
├── 20240101000012_create_functions.sql
└── 20240101000013_create_triggers.sql
```

**3.2. Edge Functions:**
```
supabase/functions/
├── escalation-checker/
│   ├── index.ts
│   ├── types.ts
│   └── utils.ts
├── notification-sender/
├── pm-scheduler/
├── audit-logger/
├── file-processor/
└── shared/
    ├── database.ts
    ├── email.ts
    └── utils.ts
```

---

**4. Type Definitions:**

**4.1. Database Types:**
```typescript
// src/types/database.types.ts
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      work_orders: {
        Row: WorkOrder;
        Insert: WorkOrderInsert;
        Update: WorkOrderUpdate;
      };
      // ... other tables
    };
    Views: {
      work_order_summary: WorkOrderSummary;
      equipment_health: EquipmentHealth;
    };
    Functions: {
      get_user_work_orders: {
        Args: { user_id: string };
        Returns: WorkOrder[];
      };
    };
    Enums: {
      user_role: 'technician' | 'supervisor' | 'manager' | 'admin';
      wo_status: 'new' | 'assigned' | 'in_progress' | 'completed' | 'verified' | 'closed';
      priority: 'low' | 'medium' | 'high' | 'critical';
    };
  };
}
```

**4.2. Application Types:**
```typescript
// src/types/app.types.ts
export interface User {
  id: string;
  email: string;
  role: UserRole;
  warehouse_id: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface WorkOrderFilters {
  status?: WOStatus[];
  priority?: Priority[];
  assigned_to?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  warehouse_id?: string;
}

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, any>;
  timestamp: string;
  user_id: string;
}
```

---

**5. Configuration Files:**

**5.1. Vite Configuration:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'MaintAInPro CMMS',
        short_name: 'MaintAInPro',
        theme_color: '#0ea5e9',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/modules': path.resolve(__dirname, './src/modules'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js']
  }
});
```

**5.2. ESLint Configuration:**
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended'
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-noninteractive-element-interactions': 'warn'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
```

---

**6. Build & Deployment Scripts:**

**6.1. Package.json Scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext ts,tsx",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write src/**/*.{ts,tsx}",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:reset": "supabase db reset",
    "supabase:generate-types": "supabase gen types typescript --local > src/types/supabase.ts",
    "deploy:staging": "npm run build && vercel --prod --env staging",
    "deploy:production": "npm run build && vercel --prod"
  }
}
```

---

**7. Documentation Structure:**

```
docs/
├── README.md
├── GETTING_STARTED.md
├── CONTRIBUTING.md
├── API_REFERENCE.md
├── DEPLOYMENT_GUIDE.md
├── SECURITY_GUIDE.md
├── modules/
│   ├── work-orders.md
│   ├── equipment.md
│   ├── parts-inventory.md
│   └── ...
├── user-guides/
│   ├── technician-guide.md
│   ├── supervisor-guide.md
│   └── admin-guide.md
└── architecture/
    ├── system-overview.md
    ├── database-design.md
    └── security-model.md
```

This project structure provides a comprehensive foundation for building a maintainable, scalable, and well-organized CMMS application.
