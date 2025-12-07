# Testing Checklist - Daily Planner

## ✅ Pre-Testing Setup

- [ ] Supabase credentials configured in `js/config.js`
- [ ] Local server running (`python -m http.server 8000`)
- [ ] Browser opened to `http://localhost:8000/auth.html`
- [ ] Browser console open (F12) to check for errors

## 🔐 Authentication Tests

### Sign Up
- [ ] Navigate to auth page
- [ ] Click "Sign Up" tab
- [ ] Enter email and password
- [ ] Click "Create Account"
- [ ] Verify success message
- [ ] Check redirect to main app

### Sign In
- [ ] Navigate to auth page
- [ ] Enter credentials
- [ ] Click "Sign In"
- [ ] Verify success message
- [ ] Check redirect to main app
- [ ] Verify user email shows in nav

### Sign Out
- [ ] Click user menu
- [ ] Click "Sign Out"
- [ ] Verify redirect to auth page
- [ ] Verify session cleared

## 📅 Annual View Tests

### Goals
- [ ] Click "Annual" in navigation
- [ ] Click "Add Goal"
- [ ] Enter goal title
- [ ] Select category
- [ ] Verify goal appears
- [ ] Add sub-goal
- [ ] Check/uncheck sub-goal
- [ ] Verify progress updates
- [ ] Delete sub-goal
- [ ] Delete goal

### Reading List
- [ ] Click "Add Book"
- [ ] Enter book title and author
- [ ] Verify book appears
- [ ] Check "completed" checkbox
- [ ] Rate book (click stars)
- [ ] Delete book

## 📆 Monthly View Tests

### Calendar
- [ ] Click "Monthly" in navigation
- [ ] Navigate between months
- [ ] Click on a date
- [ ] Verify date selection

### Checklist
- [ ] Add checklist item
- [ ] Check/uncheck item
- [ ] Edit item text
- [ ] Delete item

### Notes
- [ ] Type in notes area
- [ ] Verify auto-save
- [ ] Navigate away and back
- [ ] Verify notes persist

## 📊 Weekly View Tests

### Goals
- [ ] Click "Weekly" in navigation
- [ ] Add weekly goal
- [ ] Set priority
- [ ] Mark as complete
- [ ] Delete goal

### Time Blocks
- [ ] Add time block
- [ ] Set start/end time
- [ ] Select category
- [ ] Edit time block
- [ ] Delete time block

## 🎯 Habits View Tests

### Daily Habits
- [ ] Click "Habits" in navigation
- [ ] Click "Daily Habits" tab
- [ ] Click "Add Habit"
- [ ] Enter habit name
- [ ] Verify habit appears in list
- [ ] Check habit for today
- [ ] Verify checkbox in grid
- [ ] Verify progress updates
- [ ] Edit habit name
- [ ] Delete habit

### Weekly Habits
- [ ] Click "Weekly Habits" tab
- [ ] Click "Add Habit"
- [ ] Enter habit name
- [ ] Set target days (1-7)
- [ ] Verify habit appears
- [ ] Check habit for today
- [ ] Verify progress updates
- [ ] Delete habit

### Wellness Tracking
- [ ] Click "Wellness" tab
- [ ] **Mood:** Click a date, select mood
- [ ] **Sleep:** Enter bedtime and wake time, save
- [ ] **Water:** Increase/decrease glasses
- [ ] Verify all data saves
- [ ] Check history lists

## 📋 Action Plan Tests

### CRUD Operations
- [ ] Click "Action Plan" in navigation
- [ ] Click "Add Action Plan"
- [ ] Fill in all fields:
  - [ ] Life Area
  - [ ] Specific Action
  - [ ] Frequency
  - [ ] Success Criteria
  - [ ] Progress (slider)
  - [ ] Evaluation
- [ ] Click "Save"
- [ ] Verify plan appears in table
- [ ] Click "Edit" button
- [ ] Modify fields
- [ ] Save changes
- [ ] Verify updates
- [ ] Click "Delete" button
- [ ] Confirm deletion
- [ ] Verify plan removed

### Navigation
- [ ] Navigate between months
- [ ] Verify plans for each month
- [ ] Check empty state message

## ⏱️ Pomodoro Timer Tests

### Timer Functions
- [ ] Click "Pomodoro" in navigation
- [ ] Click "Start"
- [ ] Verify timer counts down
- [ ] Click "Pause"
- [ ] Verify timer pauses
- [ ] Click "Resume"
- [ ] Verify timer continues
- [ ] Click "Reset"
- [ ] Verify timer resets

### Sessions
- [ ] Complete a focus session
- [ ] Verify break starts
- [ ] Complete break
- [ ] Verify session count increases
- [ ] Check session history

## 🎨 Visual Tests

### Styling
- [ ] Verify gradient background
- [ ] Check Inter font loads
- [ ] Hover over buttons (gradient effect)
- [ ] Hover over cards (lift effect)
- [ ] Focus on inputs (border highlight)
- [ ] Check navigation glassmorphism
- [ ] Verify smooth animations

### Responsive Design
- [ ] Resize browser window
- [ ] Check mobile menu (< 768px)
- [ ] Verify layout adapts
- [ ] Test on mobile device
- [ ] Check tablet view

## 🐛 Error Handling Tests

### Network Errors
- [ ] Disconnect internet
- [ ] Try to add data
- [ ] Verify error message
- [ ] Reconnect internet
- [ ] Verify sync works

### Validation Errors
- [ ] Try to submit empty form
- [ ] Verify validation messages
- [ ] Enter invalid data
- [ ] Verify error feedback

### Authentication Errors
- [ ] Try wrong password
- [ ] Verify error message
- [ ] Try invalid email
- [ ] Verify validation

## ♿ Accessibility Tests

### Keyboard Navigation
- [ ] Tab through all elements
- [ ] Verify focus indicators
- [ ] Press Enter on buttons
- [ ] Use arrow keys in lists
- [ ] Verify skip link (Tab first)

### Screen Reader
- [ ] Enable screen reader
- [ ] Navigate through app
- [ ] Verify ARIA labels
- [ ] Check form labels
- [ ] Verify button descriptions

## 🚀 Performance Tests

### Load Times
- [ ] Measure first load (< 1s)
- [ ] Check view switching (< 200ms)
- [ ] Verify smooth animations (60fps)
- [ ] Test with slow connection

### Data Operations
- [ ] Add 10 habits quickly
- [ ] Verify no lag
- [ ] Add 10 action plans
- [ ] Check performance

## 🔍 Browser Compatibility

### Chrome/Edge
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

### Firefox
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

### Safari
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

## 📊 Final Checks

### Data Persistence
- [ ] Add data
- [ ] Close browser
- [ ] Reopen app
- [ ] Verify data persists

### Session Management
- [ ] Sign in
- [ ] Close browser
- [ ] Reopen app
- [ ] Verify still signed in

### Error Recovery
- [ ] Cause an error
- [ ] Verify error message
- [ ] Verify app recovers
- [ ] Continue using app

## ✅ Sign-Off

- [ ] All tests passed
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] Ready for use

---

**Testing Date:** _______________
**Tester:** _______________
**Result:** ⭐⭐⭐⭐⭐

**Notes:**
_______________________________________
_______________________________________
_______________________________________
