**User Roles & Permissions System**

---

**Purpose:**
Restrict or grant access to features and data across the CMMS application based on a user's assigned role. Supports clean mobile UI, secure access, and operational control.

---

**1. Roles:**

* Technician
* Supervisor
* Manager
* Inventory Clerk
* Contractor (external)
* Requester (optional)
* Admin

---

**2. Role Capabilities Summary:**

| Role            | Capabilities                                              |
| --------------- | --------------------------------------------------------- |
| Technician      | View/complete assigned WOs, log labor/parts, complete PMs |
| Supervisor      | Assign/verify WOs, manage PM schedules, see dashboards    |
| Manager         | Full system access and reports                            |
| Inventory Clerk | Manage parts, ASN, stock levels                           |
| Contractor      | View assigned WOs, upload checklist/photos                |
| Requester       | Submit WO request, view own requests                      |
| Admin           | Full privileges, including user creation and RLS control  |

---

**3. Auth Integration:**

* Supabase `auth.users`
* `profiles` table extends with `role` column and `warehouse_id` for multi-warehouse support
* Enforce access via Supabase RLS and client logic

---

**3.1. Notifications System:**

* `notifications` table with fields:
  * id (UUID)
  * user_id (UUID FK)
  * type (Enum: wo_assigned, part_out_of_stock, missed_pm, wo_escalation, wo_overdue)
  * message (Text)
  * read (Boolean, default false)
  * created_at (Timestamp)
  * work_order_id (optional UUID FK)
  * part_id (optional UUID FK)

* Role-based notification delivery:
  * Technicians: WO assignments, escalations, follow-ups
  * Supervisors: Missed PMs, low stock alerts, overdue WOs
  * Inventory Clerks: Part stock alerts, ASN updates
  * Managers: Critical system alerts, compliance issues

---

**4. Multi-Warehouse Support:**

* `profiles` table includes `warehouse_id` field
* All role-based access scoped by warehouse
* Cross-warehouse access restricted to Manager/Admin roles only
* Optional multi-site permissions for enterprise users

---

**5. UI Context Switching:**

* Landing pages and menus adapt by role
* Technician: Assigned WOs first
* Clerk: ASN and Inventory
* Supervisor: WO dashboard

---

**6. Mobile Role Simplification:**

* Technician and Contractor views have minimal options
* Checklist UI, quick status updates, camera upload only

---

**7. Permissions Enforcement:**
All CRUD actions mapped to roles via:

* Supabase RLS policies on tables
* Role-aware client logic
* Optional external contractor login portal
