**System Configuration & Settings Module**

---

**Purpose:**
Centralized configuration management for system-wide settings, escalation rules, notification preferences, and warehouse-specific configurations.

---

**1. Core Configuration Areas:**

* **Escalation Rules**: Configurable timeframes and triggers
* **Notification Settings**: User and role-based preferences
* **Warehouse Settings**: Location-specific configurations
* **System Parameters**: Global application settings
* **Integration Settings**: External service configurations

---

**2. Escalation Configuration:**

* `escalation_rules` table:
  * id (UUID)
  * wo_type (Enum: PM, Corrective, Emergency)
  * priority (Enum: low, medium, high, critical)
  * timeout_hours (Integer)
  * escalation_action (Enum: notify_supervisor, notify_manager, auto_reassign)
  * warehouse_id (UUID FK, optional)
  * active (Boolean)

---

**3. Notification Preferences:**

* `notification_settings` table:
  * id (UUID)
  * user_id (UUID FK)
  * notification_type (Text)
  * email_enabled (Boolean)
  * push_enabled (Boolean)
  * sms_enabled (Boolean, future)
  * quiet_hours_start (Time, optional)
  * quiet_hours_end (Time, optional)

---

**4. Warehouse Configuration:**

* `warehouse_settings` table:
  * id (UUID)
  * warehouse_id (UUID FK)
  * name (Text)
  * address (Text)
  * timezone (Text)
  * operating_hours_start (Time)
  * operating_hours_end (Time)
  * emergency_contact (Text)
  * default_escalation_enabled (Boolean)

---

**5. System Parameters:**

* `system_settings` table:
  * key (Text, Primary Key)
  * value (JSONB)
  * description (Text)
  * category (Text)
  * editable_by_role (Array of roles)

* Example settings:
  * `file_upload_max_size`: 5MB
  * `auto_archive_completed_wo_days`: 90
  * `default_pm_lead_time_days`: 7
  * `qr_code_base_url`: Domain for QR code generation

---

**6. Admin Interface:**

* Role-based access to configuration sections
* Real-time validation of settings changes
* Audit trail for configuration modifications
* Import/export of configuration sets
* Environment-specific settings (dev/staging/prod)

---

**7. Mobile Offline Sync:**

* Cache critical settings locally
* Sync settings changes when online
* Fallback to default values when offline
* Settings versioning for conflict resolution

---

**8. Integration Points:**

* **All Modules**: Reference system settings for operational parameters
* **Notifications**: Use user preferences for delivery methods
* **Escalations**: Apply warehouse-specific rules
* **Audit Log**: Track all configuration changes
