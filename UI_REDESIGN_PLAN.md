# UI/UX Redesign Plan - Stillmove Planner

## Current Issues Identified

### 1. Color & Contrast Problems
- [ ] Dark mode text is unreadable (dark text on dark backgrounds)
- [ ] Section headers ("Weekly Goals", "Categories") invisible in dark mode
- [ ] Category names not visible
- [ ] Input field text hard to read
- [ ] Conflicting CSS rules between main.css and ui-refresh.css

### 2. Layout Issues
- [ ] Layout feels "stiff" and rigid
- [ ] Too many hard borders
- [ ] Insufficient whitespace/breathing room
- [ ] Cards look boxy and dated

### 3. Files to Review/Fix
- [ ] Weekly View - goals, categories, schedule grid, daily sections
- [ ] Monthly View - calendar, checklist, notes, categories
- [ ] Annual View - goals, reflections, reading list
- [ ] Habits View - habit grid, wellness trackers, mood
- [ ] Action Plan View - table layout
- [ ] Pomodoro View - timer display
- [ ] Settings View - forms and sections
- [ ] Navigation - menu items, user dropdown
- [ ] Modals - all modal dialogs
- [ ] Toast notifications

## Solution: Complete CSS Rebuild

### Phase 1: Remove Conflicting Styles
1. Delete ui-refresh.css (too many conflicts)
2. Create new clean theme file: `css/theme.css`

### Phase 2: Establish Design System
- Define clear color palette for light AND dark modes
- Set typography scale
- Define spacing system
- Create component patterns

### Phase 3: Implement Views
- Style each view systematically
- Test both light and dark modes
- Ensure WCAG AA contrast compliance

## Design Tokens

### Light Mode Colors
```
--bg-primary: #faf8f5
--bg-secondary: #ffffff
--bg-card: #ffffff
--text-primary: #1a1a1a
--text-secondary: #5a5a5a
--text-muted: #888888
--accent: #a67c52
--accent-light: #d4a574
--border: rgba(166, 124, 82, 0.15)
```

### Dark Mode Colors
```
--bg-primary: #121212
--bg-secondary: #1e1e1e
--bg-card: #252525
--text-primary: #f0f0f0
--text-secondary: #b0b0b0
--text-muted: #707070
--accent: #d4a574
--accent-light: #e8c9a0
--border: rgba(166, 124, 82, 0.3)
```

## Implementation Status
- [x] Analysis complete
- [x] Phase 1: Remove conflicts (deleted ui-refresh.css)
- [x] Phase 2: Design system (created css/theme.css with CSS variables)
- [x] Phase 3: View styling (all views styled)
- [x] Phase 4: Dark mode force overrides added
- [ ] Phase 5: Final testing

## Files Changed
- `css/ui-refresh.css` - DELETED (was causing conflicts)
- `css/theme.css` - NEW (clean theme with proper dark mode)
- `index.html` - Updated to use theme.css

## Dark Mode Fixes Applied
The main.css file has many hardcoded white/light backgrounds. Added force overrides with:
- `!important` declarations to override main.css
- `body` prefix for higher specificity
- Comprehensive coverage of all components

### Components Fixed:
- [x] Action Plan table inputs
- [x] Habits grid cells and headers
- [x] Annual view textareas (reflection, vision, bucket list)
- [x] Goal cards and inputs
- [x] Schedule grid time slots
- [x] Day headers
- [x] Calendar days
- [x] All item containers (goals, habits, books, etc.)
- [x] Tabs and tab content
- [x] Modals
- [x] Settings inputs
- [x] Status messages
- [x] Pomodoro view - session history card, timer circle
- [x] Time blocks - subtle category colors (left border + 15% tint)

## How to Test
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache if needed
3. Check all views in dark mode:
   - Weekly View
   - Monthly View
   - Annual View
   - Habits View
   - Action Plan View
   - Pomodoro View
   - Settings View
4. Verify all text is readable
5. Verify all inputs have dark backgrounds
6. Verify all cards have dark backgrounds
