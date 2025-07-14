**API Specification & Data Flow**

---

**Purpose:**
Define the complete API surface, data flow patterns, and integration points for the CMMS system using Supabase.

---

**1. Core Database Tables:**

```sql
-- Users and Authentication
profiles (extends auth.users)
  - id (UUID, FK to auth.users)
  - role (user_role_enum)
  - warehouse_id (UUID, FK)
  - first_name (TEXT)
  - last_name (TEXT)
  - phone (TEXT)
  - created_at (TIMESTAMP)

-- Equipment & Assets
equipment
  - id (UUID, PK)
  - asset_tag (TEXT, UNIQUE)
  - fo_number (TEXT)
  - model (TEXT)
  - manufacturer (TEXT)
  - serial_number (TEXT)
  - description (TEXT)
  - area (TEXT)
  - warehouse_id (UUID, FK)
  - status (equipment_status_enum)
  - criticality (criticality_enum)
  - installation_date (DATE)
  - warranty_expiry (DATE)
  - parent_equipment_id (UUID, FK, NULLABLE)
  - hierarchy_level (INTEGER)
  - qr_code_url (TEXT)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)

-- Work Orders
work_orders
  - id (UUID, PK)
  - fo_number (TEXT, UNIQUE)
  - type (wo_type_enum)
  - description (TEXT)
  - area (TEXT)
  - asset_model (TEXT)
  - equipment_id (UUID, FK, NULLABLE)
  - status (wo_status_enum)
  - priority (priority_enum)
  - requested_by (UUID, FK)
  - assigned_to (UUID[])
  - created_at (TIMESTAMP)
  - due_date (DATE)
  - completed_at (TIMESTAMP)
  - verified_by (UUID, FK, NULLABLE)
  - warehouse_id (UUID, FK)
  - escalated (BOOLEAN)
  - escalation_level (INTEGER)
  - last_updated (TIMESTAMP)
  - follow_up (BOOLEAN)

-- Work Order Details
wo_checklist_items
  - id (UUID, PK)
  - work_order_id (UUID, FK)
  - component (TEXT)
  - action (TEXT)
  - status (checklist_status_enum)
  - notes (TEXT)
  - custom_field_data (JSONB)
  - created_at (TIMESTAMP)
  - completed_at (TIMESTAMP)
  - completed_by (UUID, FK, NULLABLE)

wo_time_logs
  - id (UUID, PK)
  - work_order_id (UUID, FK)
  - user_id (UUID, FK)
  - start_time (TIMESTAMP)
  - end_time (TIMESTAMP)
  - description (TEXT)
  - created_at (TIMESTAMP)

wo_attachments
  - id (UUID, PK)
  - work_order_id (UUID, FK)
  - checklist_item_id (UUID, FK, NULLABLE)
  - file_url (TEXT)
  - file_name (TEXT)
  - file_type (TEXT)
  - file_size (INTEGER)
  - uploaded_by (UUID, FK)
  - created_at (TIMESTAMP)

-- Parts & Inventory
parts
  - id (UUID, PK)
  - part_number (TEXT, UNIQUE)
  - original_number (TEXT)
  - description (TEXT)
  - vendor_id (UUID, FK)
  - quantity_on_hand (INTEGER)
  - reorder_point (INTEGER)
  - model_compatibility (TEXT[])
  - default_bin (TEXT)
  - warehouse_id (UUID, FK)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)

part_transactions
  - id (UUID, PK)
  - part_id (UUID, FK)
  - work_order_id (UUID, FK, NULLABLE)
  - type (transaction_type_enum)
  - quantity (INTEGER)
  - performed_by (UUID, FK)
  - timestamp (TIMESTAMP)
  - notes (TEXT)

-- PM Templates
pm_templates
  - id (UUID, PK)
  - model (TEXT)
  - component (TEXT)
  - action (TEXT)
  - frequency (frequency_enum)
  - custom_fields (JSONB)
  - warehouse_id (UUID, FK)
  - active (BOOLEAN)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)

-- Vendors & Contractors
vendors
  - id (UUID, PK)
  - name (TEXT)
  - type (vendor_type_enum)
  - email (TEXT)
  - phone (TEXT)
  - address (TEXT)
  - warehouse_id (UUID, FK)
  - active (BOOLEAN)
  - created_at (TIMESTAMP)

-- Notifications
notifications
  - id (UUID, PK)
  - user_id (UUID, FK)
  - type (notification_type_enum)
  - message (TEXT)
  - read (BOOLEAN)
  - created_at (TIMESTAMP)
  - work_order_id (UUID, FK, NULLABLE)
  - part_id (UUID, FK, NULLABLE)

-- System Logs (Audit Trail)
system_logs
  - id (UUID, PK)
  - action (TEXT)
  - table_name (TEXT)
  - record_id (UUID)
  - user_id (UUID, FK)
  - timestamp (TIMESTAMP)
  - description (TEXT)
  - warehouse_id (UUID, FK)
  - before_data (JSONB, NULLABLE)
  - after_data (JSONB, NULLABLE)
```

---

**2. Supabase RLS Policies:**

```sql
-- Example RLS policies for multi-warehouse access
CREATE POLICY "Users can only see their warehouse data" ON work_orders
  FOR ALL USING (
    warehouse_id = (
      SELECT warehouse_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers can see cross-warehouse data" ON work_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );
```

---

**3. Supabase Edge Functions:**

```javascript
// Functions to implement:
1. escalation-checker: Periodic check for WO escalations
2. notification-sender: Handle notification delivery
3. pm-scheduler: Generate PM work orders
4. audit-logger: Centralized audit logging
5. file-processor: Image compression and metadata
```

---

**4. Real-time Subscriptions:**

```javascript
// Key real-time channels:
- work_orders: For status updates
- notifications: For user alerts
- part_transactions: For inventory changes
- system_logs: For audit trail (admin only)
```

---

**5. Offline Data Strategy:**

```javascript
// IndexedDB Schema (using Dexie.js):
- work_orders: Full WO data for assigned technicians
- checklist_items: Checklist data for offline completion
- parts: Basic part info for scanning/selection
- equipment: Equipment data for QR code lookups
- sync_queue: Pending changes to upload
```

---

**6. File Upload Flow:**

```javascript
// Supabase Storage buckets:
- wo-attachments: Work order files
- pm-attachments: PM checklist files
- vendor-documents: Vendor/contractor docs
- equipment-photos: Asset images
- qr-codes: Generated QR codes

// File processing:
1. Client-side compression (images)
2. Upload to Supabase Storage
3. Store metadata in wo_attachments table
4. Generate thumbnails (Edge Function)
```

---

**7. Mobile PWA Configuration:**

```json
// manifest.json
{
  "name": "MaintAInPro CMMS",
  "short_name": "MaintAInPro",
  "theme_color": "#0ea5e9",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/",
  "icons": [...],
  "categories": ["productivity", "utilities"]
}
```

---

**8. Performance Considerations:**

* Use Supabase views for complex reporting queries
* Implement pagination for large datasets
* Cache static data (equipment models, vendors) locally
* Use database indexes on frequently queried columns
* Implement lazy loading for attachments and images
* Use Supabase connection pooling for high concurrency
