**Reporting & Dashboards Module**

---

**Purpose:**
Provide real-time operational insight, KPIs, compliance metrics, and work performance analytics tailored by user role.

---

**1. Role-Specific Dashboards:**

**Technician:**

* Assigned WOs
* Labor logged today
* PM checklist progress
* Alerts: overdue WOs, follow-ups

**Supervisor:**

* WO funnel (New → Completed)
* PM compliance %
* Downtime summary
* Technician workload
* Alerts: missed PMs, low stock

**Manager:**

* PM completion rate
* Avg. WO time to complete
* Inventory turnover
* Top failing assets or components

**Inventory Clerk:**

* Low stock list
* ASN receiving status
* Part usage trends
* Reorder alerts

---

**2. Reports (Exportable):**

* WO completion logs
* PM history
* Downtime by area/asset
* Part usage report
* Labor logs
* Vendor activity
* Inventory adjustments

Formats: CSV or printable PDF

---

**3. KPIs Tracked:**

* % PM completed on time
* Avg. time to close WO
* Labor cost per WO (if tracked)
* Top used parts
* Repeat WOs by asset/component
* Inventory accuracy (manual vs system)

---

**4. Smart Alerts:**

* Missed PM = flag
* Part on WO is OOS = alert
* Low stock = reorder queue
* WO overdue > 3 days = notify supervisor
* Auto-escalation triggers based on configured rules

---

**4.1. Audit Log System:**

* `system_logs` table with fields:
  * id (UUID)
  * action (Text) - e.g., "WO Status Changed", "Part Used", "User Role Modified"
  * table_name (Text) - Source table for the action
  * record_id (UUID) - ID of the affected record
  * user_id (UUID FK) - Who performed the action
  * timestamp (DateTime)
  * description (Text) - Human-readable description
  * warehouse_id (UUID FK) - Multi-warehouse audit trail

* Tracked actions:
  * WO status changes and assignments
  * Part usage and inventory adjustments
  * PM template modifications
  * User role changes and access grants
  * Critical deletions and data modifications

* Compliance and traceability support for audits

---

**5. Filtering Support:**

* Filter all data by:

  * Date range
  * Area
  * Technician
  * Model
  * Vendor
  * WO type
  * Warehouse (multi-warehouse deployments)

---

**5.1. Multi-Warehouse Reporting:**

* All dashboards and reports scope data by user's warehouse access
* Cross-warehouse reporting available for Manager/Admin roles
* Warehouse-specific KPIs and compliance metrics
* Consolidated multi-site reports for enterprise users

---

**6. Implementation:**

* Use Supabase views/functions for fast aggregation
* Display via custom dashboard UI or integration with Retool/Metabase
* Edge Functions can trigger alerts, email summaries, and auto-escalation
* Real-time updates via Supabase subscriptions for notifications
* Audit log integration for compliance reporting
