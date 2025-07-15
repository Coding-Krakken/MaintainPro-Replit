**Vendor & Contractor Management Module**

---

**Purpose:**
Track, assign, and communicate with all external suppliers and contractors. Centralized vendor records, external WO assignment, and part ordering automation.

---

**1. Vendor Fields:**

* id (UUID)
* name (Text)
* type (Enum: supplier, contractor)
* email (Text)
* phone (Text)
* address (Text)
* documents (Array of Supabase Storage URLs)
* warehouse\_id (UUID FK) - Multi-warehouse vendor relationships

---

**2. Contractor Fields:**

* id (UUID)
* vendor\_id (UUID FK)
* name (Text)
* certifications\[] (Text\[])
* work\_authorization (URL to file)
* available (Boolean)

---

**3. Features:**

* Assign contractors to WOs
* Upload documents (insurance, W9, certifications)
* Filter vendors by type, activity, or rating
* Archive inactive vendors

---

**4. Integration with WO System:**

* Contractors appear in technician assignment
* Can view checklist and upload notes/files (limited access)
* Mark work complete from contractor account

---

**5. Email Automation:**

* For suppliers: Generate part order email with line items
* For contractors: Send WO assignments with task scope
* Optional attachments (e.g., checklist PDF, contract)

---

**6. Reporting:**

* Work completed by contractor
* Cost tracking (future)
* Document expiration alerts (insurance/cert expiring)
* Vendor activity heatmaps (most-used suppliers)
