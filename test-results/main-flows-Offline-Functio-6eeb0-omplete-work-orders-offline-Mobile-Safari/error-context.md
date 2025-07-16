# Page snapshot

```yaml
- region "Notifications (F8)":
  - list
- banner:
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button "JS":
    - text: JS
    - img
- main:
  - heading "Work Orders" [level=1]
  - paragraph: Manage and track all maintenance work orders
  - button "New Work Order":
    - img
    - text: New Work Order
  - text: Filters
  - img
  - textbox "Search work orders..."
  - combobox: All Status
  - combobox: All Priority
  - button "Clear":
    - img
    - text: Clear
  - text: Work Orders (0)
  - paragraph: No work orders found
  - button "Create First Work Order"
```