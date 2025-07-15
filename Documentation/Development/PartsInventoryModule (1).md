**Parts & Inventory Management Module**

---

**Purpose:**
Track, consume, reorder, and receive all maintenance parts across work orders. Includes support for ASN, PO workflows, vendor integration (Siggins), and part usage tracking.

---

**1. Core Features:**

* Live quantity tracking of parts
* Part linking to WO and asset models
* ASN intake with PO validation
* Vendor integration with support for automated emails
* Transaction logs for every inventory event

---

**2. Part Fields:**

* id (UUID)
* part\_number (Text) → e.g., HYT106.0432
* original\_number (Text) → e.g., 106.0432
* description (Text)
* vendor\_id (UUID)
* quantity\_on\_hand (Integer)
* reorder\_point (Integer)
* model\_compatibility (Array of model names)
* default\_bin (Text)
* warehouse\_id (UUID FK) - Multi-warehouse inventory tracking

---

**3. ASN Receipt Fields:**

* id (UUID)
* asn\_number (Text)
* po\_number (Text)
* parts\[] (Array of part\_id + qty)
* received\_by (UserRef)
* status (Enum: new, verified, completed)
* date\_received (Date)

---

**4. Part Transaction Log:**

* id (UUID)
* part\_id (UUID)
* work\_order\_id (optional UUID)
* type (Enum: inbound, used, adjustment)
* quantity (Integer)
* performed\_by (UserRef)
* timestamp (DateTime)

---

**5. WO Integration:**

* Technician selects part(s) during WO completion
* System decrements quantity and logs transaction
* Alert if stock is below reorder\_point
* Notifications sent to inventory clerks for low stock
* Cross-warehouse part lookup (if user has multi-site access)

---

**6. Reorder Automation:**

* List of low-stock parts
* Auto-generate email order drafts (for Siggins)
* Include PO#, ASN#, and part lines
* Configurable format per vendor

---

**7. Mobile Features:**

* Scan-to-add part usage
* View part bin and live qty
* Log adjustments (e.g., loss, damage)
* Receive ASN from dock with quantity check
