# CSS Consolidation Plan

## Current State (After Phase 1 Cleanup)

| File | Before | After | Removed |
|------|--------|-------|---------|
| main.css | 4,686 | 4,638 | 48 lines |
| theme.css | 7,798 | 7,788 | 10 lines |
| **Total** | **12,484** | **12,426** | **58 lines** |

## Completed Cleanups

### ✅ Removed duplicate `.sr-only` 
- Removed from `main.css:5189` (duplicate)
- Removed from `theme.css:7596` (duplicate)
- Kept single definition in `main.css:221`

### ✅ Removed unused toast styles
- Removed old toast implementation from `main.css:459-500`
- Active toast styles remain at `main.css:4249+` (uses `toast-show` class)

## Remaining Duplicates (Safe to Keep)

### `.modal` (2 definitions - different purposes)
- `main.css:2840` - Base layout (display, position)
- `theme.css:1362` - Theme colors (background, backdrop)
- **Keep both** - they complement each other

### `.skip-to-main` (2 definitions - different purposes)
- `main.css:200` - Layout and positioning
- `theme.css:1530` - Theme colors
- **Keep both** - they complement each other

### `.loading-spinner` (2 definitions - different purposes)
- `main.css:428` - Layout
- `theme.css:1541` - Theme colors
- **Keep both** - they complement each other

## Risk Assessment

Further consolidation would require:
1. Merging `:root` variables (HIGH RISK - could break themes)
2. Reorganizing file sections (HIGH RISK - could break specificity)
3. Removing responsive duplicates (MEDIUM RISK - needs testing)

## Recommendation

The current cleanup is **safe and complete** for Phase 1. Further consolidation should be done:
- With a full test suite
- In a separate branch
- With visual regression testing

## Before/After Summary

```
Before: 12,484 lines total
After:  12,426 lines total
Saved:  58 lines (0.5%)
```

The CSS files are large but well-organized. The duplicates that remain serve different purposes (layout vs theme) and should stay separate.
