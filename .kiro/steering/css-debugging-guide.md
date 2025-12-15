# CSS Debugging Guide - Critical Lessons Learned

## ⚠️ CRITICAL WARNING

Before making ANY CSS changes, **ALWAYS search for ALL rules affecting the target class/element across the ENTIRE codebase**. Failure to do this can result in hours of wasted debugging.

---

## The Mistake That Was Made

### Problem
Action Plan table rows were displaying with vertical text (character by character) instead of normal horizontal text. The table layout was completely broken.

### What Went Wrong
Multiple attempts were made to fix the issue by:
- Changing `table-layout` property (fixed vs auto)
- Adding/removing `min-width` constraints
- Using `<colgroup>` with percentage widths
- Adding inline styles to `<th>` elements
- Various combinations of the above

**None of these worked because the ROOT CAUSE was never identified.**

### The Actual Root Cause
```css
/* This rule in main.css (line ~1722) */
.action-plan-row {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
}
```

This CSS rule was intended for the **Monthly View** action plan section, but it was also applying to **Action Plan View** table rows because:
- The JavaScript creates table rows with: `row.className = 'action-plan-row'`
- The CSS selector `.action-plan-row` matched BOTH use cases
- `display: flex` on a `<tr>` element breaks table layout completely

### The Fix
```css
/* Make the rule specific to Monthly View only */
.action-plan-item .action-plan-row {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
}

/* Ensure table rows display correctly */
.action-plan-table tr.action-plan-row {
    display: table-row;
}
```

---

## Debugging CSS Issues - Mandatory Steps

### Step 1: Identify ALL Affected Classes
Before making any changes, search for ALL CSS rules that might affect the element:

```bash
# Search for the class name across all CSS files
grep -r "class-name" --include="*.css"
```

Or use the `grepSearch` tool:
```
query: "class-name"
includePattern: "**/*.css"
```

### Step 2: Check for Conflicting Display Properties
Common culprits that break layouts:
- `display: flex` on table elements (`<tr>`, `<td>`, `<th>`)
- `display: grid` on table elements
- `display: block` on inline elements
- `display: none` hiding elements unexpectedly

### Step 3: Check Class Name Collisions
The same class name might be used in different contexts:
- Search for the class in HTML files
- Search for the class in JavaScript files (dynamic class assignment)
- Verify each usage is for the same purpose

### Step 4: Check CSS Specificity
Rules with higher specificity override lower ones:
1. Inline styles (`style="..."`) - highest
2. IDs (`#id`)
3. Classes, attributes, pseudo-classes (`.class`, `[attr]`, `:hover`)
4. Elements, pseudo-elements (`div`, `::before`) - lowest

### Step 5: Check CSS File Load Order
Later files override earlier ones:
- `main.css` loads first (base styles)
- `theme.css` loads second (overrides)
- Inline styles override both

---

## Common CSS Pitfalls in This Project

### 1. Shared Class Names
Classes used in multiple components:
- `.action-plan-row` - Used in Monthly View AND Action Plan View
- Always use more specific selectors when styles differ

### 2. Table Layout Issues
When tables display incorrectly:
- Check for `display: flex` or `display: grid` on `<tr>` or `<td>`
- Check for `table-layout: fixed` without proper column widths
- Check for conflicting width calculations

### 3. Dark Mode Conflicts
Dark mode styles in `theme.css` use `@media (prefers-color-scheme: dark)`:
- These rules have same specificity as light mode rules
- Use `!important` sparingly and consistently
- Test in both light and dark modes

### 4. Full-Width Layout Overrides
The full-width layout section (around line 3710 in theme.css):
- Uses `!important` extensively
- Can conflict with base styles in main.css
- Check both files when debugging layout issues

---

## CSS Architecture in This Project

```
css/
├── main.css      # Base styles, component styles, layout
├── theme.css     # Design tokens, dark mode, overrides
├── habits-fixes.css
└── weekly-fixes.css
```

### main.css Structure
- Lines 1-1000: Base styles, typography, buttons
- Lines 1000-2000: Monthly view, calendar, habits
- Lines 2000-3000: Action Plan view, Pomodoro, Settings
- Lines 3000+: Responsive breakpoints

### theme.css Structure
- Lines 1-500: CSS variables (design tokens)
- Lines 500-1000: Component theme overrides
- Lines 1000-2000: Dark mode styles
- Lines 3700+: Full-width layout system

---

## Checklist Before Making CSS Changes

- [ ] Searched for ALL rules affecting the target class/element
- [ ] Checked for class name collisions across components
- [ ] Verified no `display` property conflicts
- [ ] Checked both `main.css` and `theme.css`
- [ ] Checked dark mode section if applicable
- [ ] Checked responsive media queries
- [ ] Tested with hard refresh (Ctrl+Shift+R)

---

## Red Flags That Indicate Wrong Approach

1. **Making the same type of change multiple times** - Stop and search for root cause
2. **Text displaying vertically** - Almost always a `display` property issue
3. **Columns not aligning** - Check for flex/grid on table elements
4. **Styles not applying** - Check specificity and load order
5. **Works in one view, breaks another** - Check for shared class names

---

## Key Takeaway

> **NEVER assume you know the cause. ALWAYS search the entire codebase first.**

The 10 minutes spent searching upfront saves hours of trial-and-error debugging.
