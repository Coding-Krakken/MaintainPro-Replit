# Page snapshot

```yaml
- dialog "Create Work Order":
  - heading "Create Work Order" [level=2]
  - text: Equipment
  - combobox: Select equipment or scan QR code
  - button:
    - img
  - text: Description
  - textbox "Description"
  - text: Type
  - combobox: Corrective
  - text: Priority
  - combobox: Medium
  - text: Area
  - textbox "Area"
  - text: Due Date
  - textbox "Due Date"
  - text: Estimated Hours
  - spinbutton "Estimated Hours"
  - text: Additional Notes
  - textbox "Additional Notes"
  - text: Attachments
  - img
  - paragraph: Drop files here or click to upload
  - paragraph: Supports images, PDFs, audio, and video files (max 5MB each)
  - paragraph: Maximum 5 files
  - button "Choose Files"
  - button "Cancel"
  - button "Create Work Order"
  - button "Close":
    - img
    - text: Close
```