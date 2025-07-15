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
  - text: Attach Photo
  - img
  - button "Take Photo"
  - paragraph: or drag and drop a file
  - button "Cancel"
  - button "Create Work Order"
  - button "Close":
    - img
    - text: Close
```