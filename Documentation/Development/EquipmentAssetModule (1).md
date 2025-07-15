**Equipment & Asset Management Module**

---

**Purpose:**
Centralized tracking and management of all equipment/assets across warehouses. Provides the foundation for work orders, preventive maintenance scheduling, and asset lifecycle management.

---

**1. Core Features:**

* Equipment registration and classification
* Asset hierarchy and location tracking
* QR code generation for mobile scanning
* Equipment status and lifecycle management
* Maintenance history tracking
* Asset criticality and priority classification

---

**2. Equipment Fields:**

* id (UUID)
* asset_tag (Text) - Unique identifier (e.g., "UAS-001")
* fo_number (Text) - Facility Operations number
* model (Text) - Equipment model/type
* manufacturer (Text)
* serial_number (Text)
* description (Text)
* area (Text) - Physical location/zone
* warehouse_id (UUID FK) - Multi-warehouse support
* status (Enum: active, inactive, maintenance, retired, disposed)
* criticality (Enum: low, medium, high, critical)
* installation_date (Date)
* warranty_expiry (Date)
* purchase_cost (Decimal, optional)
* replacement_cost (Decimal, optional)
* created_at (Timestamp)
* updated_at (Timestamp)
* created_by (UUID FK)
* qr_code_url (Text) - Generated QR code for mobile scanning

---

**3. Equipment Hierarchy:**

* parent_equipment_id (UUID FK, optional) - For sub-components
* hierarchy_level (Integer) - 0 = main equipment, 1+ = sub-components
* component_type (Text) - e.g., Motor, Pump, Sensor, Control Panel

---

**4. Asset Lifecycle Tracking:**

* Track status changes with timestamps
* Maintenance counter (total WOs completed)
* Downtime tracking (total hours out of service)
* Last maintenance date
* Next scheduled PM date

---

**5. Mobile Features:**

* QR code scanning to identify equipment
* Quick asset lookup by tag/model
* View maintenance history
* Create work order from asset scan
* Update asset status/location

---

**6. Integration Points:**

* **Work Orders**: Link WOs to specific equipment via asset_model/fo_number
* **PM Templates**: Auto-generate PMs for active equipment by model
* **Parts Inventory**: Link compatible parts to equipment models
* **Reporting**: Asset performance and reliability metrics

---

**7. QR Code System:**

* Auto-generate QR codes containing: asset_tag, fo_number, basic info
* Mobile app scans QR → auto-populates WO creation form
* QR codes printable for physical asset labeling
* URL format: `/equipment/{id}` for web access

---

**8. Asset Performance Tracking:**

* MTBF (Mean Time Between Failures)
* MTTR (Mean Time To Repair)
* Availability percentage
* Cost per operating hour
* Failure frequency by component

---

**9. User Roles and Access:**

* Technician: View equipment details, scan QR codes, basic info updates
* Supervisor: Full equipment management, status updates, lifecycle control
* Manager: Asset performance analytics, lifecycle planning, cost tracking
* Inventory Clerk: View equipment for parts compatibility
* Admin: Full system access, equipment creation/deletion

---

**10. Reporting Integration:**

* Equipment downtime reports
* Asset utilization metrics
* Maintenance cost per asset
* Equipment reliability rankings
* Replacement planning based on age/condition
