# Admin UI/UX Visual Reference Guide

## Component Layouts & Styling

### Page Header Section
```
┌─────────────────────────────────────────────────┐
│ Admin Control Center              [➕ New product]
│ Manage product inventory, oversee              │
│ customer accounts, and maintain...             │
└─────────────────────────────────────────────────┘
```

### Status Messages

#### Success (Auto-dismiss after 4 seconds)
```
┌────────────────────────────────────────────────┐
│ ✅ Product created successfully.               │
└────────────────────────────────────────────────┘
```

#### Error (Manual dismiss required)
```
┌─────────────────────────────────────────────────┐
│ ❌ Unable to save product.        [✕ Dismiss]  │
└─────────────────────────────────────────────────┘
```

---

## Table Styling

### Product Catalog Table
```
┌─────────────────────────────────────────────────┐
│ 📦 Product Catalog              [total: 12]     │
├──────────────────────────────────────────────────┤
│ [Search...................................] [🔄] │
├──────────────────────────────────────────────────┤
│ PRODUCT NAME    PRICE    STOCK      ACTIONS     │
├──────────────────────────────────────────────────┤
│ Laptop          $899.99  45 units  [✏️] [🗑️]  │  ← Even row (lighter bg)
│ Monitor         $299.99  12 units  [✏️] [🗑️]  │  ← Odd row (darker bg)
│ Keyboard        $79.99   2 units   [✏️] [🗑️]  │  ← Low stock warning
│ Mouse           $29.99   150 units [✏️] [🗑️]  │
└──────────────────────────────────────────────────┘
  ↑ Hover shows highlight  ↑ Icons indicate actions
```

### User Accounts Table
```
┌─────────────────────────────────────────────────┐
│ 👥 User Accounts                [registered: 8]│
├──────────────────────────────────────────────────┤
│ USERNAME    EMAIL               ROLE      ACTIONS│
├──────────────────────────────────────────────────┤
│ john_doe    john@email.com     [🔑 Admin] [👁️] │
│ jane_smith  jane@email.com     [👤 User] [👁️] │
│ bob_wilson  bob@email.com      [👤 User] [👁️] │
└──────────────────────────────────────────────────┘
     ↑ Different badge colors       ↑ View + Delete
```

---

## Form Section

### Create/Edit Product Form
```
┌──────────────────────────────────────────────────┐
│ ✏️ Edit Product          [EDITING MODE badge]   │
│ Update the catalog entry and save changes.      │
├──────────────────────────────────────────────────┤
│ BASIC INFORMATION                               │
│                                                 │
│ Product Name *                                  │
│ [________________________________] (required) │
│                                                 │
│ Description                                     │
│ [________________________________]             │
│ [________________________________]             │
│ [________________________________]             │
│                                                 │
├──────────────────────────────────────────────────┤
│ PRICING & INVENTORY                             │
│                                                 │
│ Price (USD) *                                   │
│ [____________]      Stock Quantity *            │
│                     [____________]              │
│                                                 │
├──────────────────────────────────────────────────┤
│ MEDIA                                           │
│                                                 │
│ Image URL                                       │
│ [________________________________]             │
│                                                 │
├──────────────────────────────────────────────────┤
│ [💾 Save Changes] [Cancel]                     │
└──────────────────────────────────────────────────┘
```

#### Form States
```
Normal:     [💾 Save Changes]
Saving:     [⏳ Saving…] (disabled)
Editing:    [✏️ Edit Product] + [EDITING MODE] badge
Creating:   [✓ Create Product] + no cancel button
Error:      ⚠️ Error message below field in red
```

---

## Empty States

### No Products
```
┌──────────────────────────────────────────────┐
│                                              │
│               📭                            │
│         No products found                   │
│                                              │
│    Try adjusting your search filters.       │
│                                              │
│      [Create First Product]                │
│                                              │
└──────────────────────────────────────────────┘
```

### Loading State
```
┌──────────────────────────────────────────────┐
│ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮ (animated shimmer)   │
│ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮                       │
│ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮                       │
│ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮                       │
└──────────────────────────────────────────────┘
```

---

## Button Styling

### Primary Buttons
```
[➕ New Product]  - Prominent blue, creates new item
[💾 Save Changes] - Full action, highlighted
[✓ Create Product] - Confirmation action
```
- Background: Blue (#2563eb)
- Hover: Darker blue, slight lift effect
- Active: Pressed state
- Disabled: Reduced opacity, no pointer

### Ghost Buttons (Secondary)
```
[🔄 Refresh]   - Subtle action
[✏️ Edit]       - Edit action
[🗑️ Delete]    - Danger action (red text)
[👁️ View]      - View details
[Cancel]       - Dismiss action
```
- Background: Transparent
- Border: None
- Text Color: Varies by type
- Hover: Light background highlight

### Danger Buttons
```
[🗑️ Delete] - Red text color
```
- Color: #dc2626 (danger red)
- Hover: Lighter red background
- Requires confirmation dialog

---

## Badge & Tag Styling

### Role Badges
```
[🔑 Admin]  - Blue background, dark blue text
[👤 User]   - Purple background, purple text
```

### Status Badges
```
[45 units]        - Green, normal stock
[2 units]         - Red warning, low stock
[📦 Product Catalog] - Tag count
```

### Edit Mode
```
[EDITING MODE]  - Amber background, uppercase
```

---

## Responsive Behavior

### Desktop (> 768px)
```
┌─────────────────────────────────────┐
│  PRODUCTS      │      FORM          │
│                │                    │
│  TABLE         │    CREATE/EDIT     │
│                │                    │
├─────────────────────────────────────┤
│  USERS         │    USER DETAILS    │
│                │                    │
│  TABLE         │    DETAILS VIEW    │
│                │                    │
└─────────────────────────────────────┘
```

### Tablet (480px - 768px)
```
┌──────────────────────┐
│    PRODUCTS          │
│                      │
│    TABLE             │
├──────────────────────┤
│    CREATE/EDIT FORM  │
│                      │
├──────────────────────┤
│    USERS             │
│                      │
│    TABLE             │
├──────────────────────┤
│    USER DETAILS      │
│                      │
└──────────────────────┘
```

### Mobile (< 480px)
```
┌──────────────┐
│  PRODUCTS    │
├──────────────┤
│ [Table      ]│
│ [scrolls ← ]│
│ [right    →]│
├──────────────┤
│ CREATE FORM  │
│ [Full       ]│
│ [width    ]│
├──────────────┤
│   USERS      │
├──────────────┤
│ [Table      ]│
│ [scrolls ← ]│
│ [right    →]│
└──────────────┘
```

---

## Interaction Patterns

### Delete Product Flow
```
1. User clicks [🗑️ Delete]
   ↓
2. Confirmation dialog:
   "Are you sure you want to delete this product? 
    This action cannot be undone."
   ↓
3a. User clicks "Cancel" → Back to table
3b. User clicks "Delete" → Product removed
   ↓
4. Success message appears and auto-dismisses after 4 seconds
   "✅ Product deleted."
```

### Create Product Flow
```
1. User clicks [➕ New product]
   ↓
2. Form clears and becomes active
   Edit mode badge shows: [EDITING MODE]
   ↓
3. User fills form (with real-time validation)
   ↓
4. User clicks [💾 Save Changes]
   Button becomes: [⏳ Saving…] (disabled)
   ↓
5a. Success → Form resets, message shows
5b. Error → Error message persists, form keeps data
```

### Edit Product Flow
```
1. User clicks [✏️ Edit] on a product
   ↓
2. Form populates with product data
   Edit mode badge shows: [EDITING MODE]
   Cancel button appears
   ↓
3. User modifies fields
   ↓
4. User clicks [💾 Save Changes] or [Cancel]
   Save → Same as Create success
   Cancel → Form resets, editing mode ends
```

---

## Accessibility Features

### Keyboard Navigation
```
Tab       - Move between form fields
Shift+Tab - Move backwards between fields
Enter     - Submit form or activate button
Escape    - Cancel/dismiss dialog (future)
Space     - Toggle checkbox or button
```

### Screen Reader Support
```
✅ Semantic HTML (<label>, <fieldset>, <legend>)
✅ ARIA labels (role="status", aria-live="polite")
✅ Form error associations
✅ Heading hierarchy (h1, h2)
✅ Button purposes clearly labeled
✅ Table headers with <th>
```

### Visual Accessibility
```
✅ Color not sole indicator (icons + text)
✅ High contrast text (WCAG AA compliant)
✅ Focus visible states
✅ Error messages don't rely on color alone
✅ Sufficient touch target sizes (44px minimum)
```

---

## Color Reference

### Semantic Colors
```
Primary Blue        #2563eb   - Actions, focus
Primary Dark Blue   #1e4ed8   - Hover states
Success Green       #22c55e   - Positive feedback
Error Red          #dc2626   - Errors, danger
Warning Amber      #fbbf24   - Editing, caution
Muted Gray         #5c6c80   - Secondary text
```

### Backgrounds
```
Primary Surface    #ffffff    - Main content
Soft Surface       rgba(...) - Subtle backgrounds
Background         #f5f7fb   - Page background
Overlay            rgba(...) - Disabled states
```

---

## Typography Scale

```
Page Title     2.75rem / 700 weight  - Main heading
Section Title  1.25rem / 700 weight  - Secondary heading
Form Legend    0.95rem / 700 weight  - Fieldset labels
Body Text      1rem / 400 weight     - Default text
Form Hint      0.95rem / 400 weight  - Descriptive text
Error Text     0.85rem / 600 weight  - Error messages
Table Header   0.8rem / 700 weight   - Column headers
Tag/Badge      0.78rem / 600 weight  - Status badges
```

---

## Animation & Motion

### Transitions
```
Standard        0.2s ease   - Hover, focus states
Message Slide   0.3s ease   - Status message appear
Skeleton Shimmer 1.5s infinite - Loading animation
Button Lift     0.18s ease   - Button hover effects
```

### Disabled States
```
Opacity: 0.7
Cursor: not-allowed
No hover effects
No transitions
```

