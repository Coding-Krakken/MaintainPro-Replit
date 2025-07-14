**Preventive Maintenance Module**

---

**Purpose:**
Automate the scheduling, tracking, and execution of standardized preventive maintenance tasks for all equipment models based on pre-defined frequencies and templates.

---

**1. Core Features:**

* Define PM templates per equipment model, component, and action
* Automatically generate WOs based on schedule
* Track compliance rates and missed tasks
* Checklist-based UI for PM execution
* Link task data to equipment and WO system

---

**2. PM Template Fields:**

* id (UUID)
* model (Text)
* component (Text)
* action (Text)
* frequency (Enum: daily, weekly, monthly, etc.)
* custom_fields (JSONB) - Admin-configurable metadata (oil type, serial tags, etc.)
* warehouse_id (UUID FK) - Multi-warehouse support

---

**3. PM Work Order Generation:**

* Use PM template + active equipment of matching model
* Schedule WO with attached checklist items
* Link WO to PM history
* Auto-skips inactive assets

---

**4. PM Checklist Execution:**

* Render checklist inside WO UI (component + action pairs)
* Status toggle: Done / Skipped / Issue
* Note field and file upload (image/audio) with compression
* File size validation (max 5MB per file)
* Store file type metadata for reporting
* If issue → trigger follow-up WO or flag
* Custom field data entry based on template configuration

---

**4.1. Custom Field Support:**

* Admin/Supervisor can define custom fields per PM template
* Field types: Text, Number, Date, Boolean, Dropdown
* Examples: Oil type, Serial number, Temperature reading
* Custom fields rendered in mobile checklist UI
* Data stored in JSONB format for flexible querying

---

**5. Supervisor Controls:**

* View PM calendar by model/area/date
* Adjust schedule intervals
* Enable/disable auto-generation per asset
* View PM logs and compliance charts

---

**6. Reporting:**

* PM compliance percentage (weekly/monthly)
* Missed PMs (by equipment/model)
* Time taken to complete PM WOs
* Checklist completion rate per tech

---

**7. Integration:**

* PM WOs live in the same WO table with `type = PM`
* Checklist data integrated into WO checklist items
* Alerts for missed PMs push to Supervisor Dashboard
