# Monthly View Test Verification Guide

## Property-Based Tests Status

### ✅ Test 7.1: Calendar Day Count (Property 31)
**Status**: Implemented, awaiting execution
**Location**: `js/utils.test.js` (lines added)

**What it tests**:
- For any year (1900-2100) and month (1-12), the calendar displays the correct number of days
- Validates leap year calculations
- Ensures days are between 28-31

**To run**:
```bash
npm test
```

**Expected result**: All assertions should pass for 100 random month/year combinations

---

### ✅ Test 7.2: Category Color Mapping (Property 32)
**Status**: Implemented, awaiting execution
**Location**: `js/utils.test.js` (lines added)

**What it tests**:
- All 7 predefined categories have valid hex colors
- Each category has a unique color
- Unknown categories return default gray color
- Category names are case-sensitive

**To run**:
```bash
npm test
```

**Expected result**: All assertions should pass for 100 random category selections

---

## Manual Testing Checklist

### Calendar Rendering
- [ ] Calendar displays correct number of days for current month
- [ ] Days are arranged in 7-column grid (Sun-Sat)
- [ ] Empty cells appear before first day of month
- [ ] Today's date is highlighted
- [ ] Navigation buttons change months correctly
- [ ] Year boundaries work (Dec → Jan, Jan → Dec)

### Category Assignment
- [ ] All 7 categories are visible in legend
- [ ] Each category has a distinct color
- [ ] Clicking a category selects it
- [ ] Clicking a calendar day assigns selected category
- [ ] Category color appears on calendar day
- [ ] Clicking same category deselects it

### Checklist Functionality
- [ ] Add checklist item button works
- [ ] Checklist items can be typed into
- [ ] Checkboxes toggle completion status
- [ ] Delete button removes checklist items
- [ ] Checklist persists after page refresh

### Notes
- [ ] Notes textarea accepts input
- [ ] Notes save when textarea loses focus
- [ ] Notes persist after page refresh

### Action Plan
- [ ] Add action plan button works
- [ ] Goal field accepts text input
- [ ] Progress slider moves from 0-100%
- [ ] Progress percentage displays correctly
- [ ] Evaluation textarea accepts input
- [ ] Delete button removes action plans
- [ ] All fields persist after page refresh

### Data Persistence
- [ ] All changes save to Supabase
- [ ] Data loads correctly on page refresh
- [ ] Different months have separate data
- [ ] Navigation preserves unsaved changes (or prompts to save)

### Responsive Design
- [ ] Layout works on desktop (1920x1080)
- [ ] Layout works on tablet (768x1024)
- [ ] Layout works on mobile (375x667)
- [ ] Calendar remains usable on small screens
- [ ] Touch targets are appropriately sized

---

## Known Limitations

1. **Node.js Required**: Property-based tests require Node.js to be installed and available in PATH
2. **Supabase Configuration**: Application requires valid Supabase credentials in `js/config.js`
3. **Authentication**: User must be signed in to access monthly view

---

## Troubleshooting

### Tests won't run
**Problem**: `node: command not found` or `npm: command not found`
**Solution**: Install Node.js from https://nodejs.org/

### Tests fail
**Problem**: Tests fail with import errors
**Solution**: Ensure `package.json` has `"type": "module"` and run `npm install`

### Calendar doesn't display
**Problem**: Calendar grid is empty
**Solution**: Check browser console for errors, verify Supabase connection

### Data doesn't persist
**Problem**: Changes don't save
**Solution**: 
1. Check Supabase credentials in `js/config.js`
2. Verify user is authenticated
3. Check browser console for database errors
4. Verify RLS policies are set up correctly

---

## Success Criteria

✅ **Task 7 is complete when**:
1. Monthly view displays correctly in the application
2. All manual testing checklist items pass
3. Property-based tests pass (when Node.js is available)
4. Data persists correctly to Supabase
5. No console errors appear during normal usage

---

## Next Steps After Verification

Once all tests pass and manual verification is complete:
1. Mark task 7 as fully verified
2. Proceed to Task 8: Weekly Planning View
3. Consider adding additional edge case tests if issues are found
