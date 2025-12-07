# Database Schema Diagram

Visual representation of the Daily Planner database schema.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          auth.users (Supabase)                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ id (UUID, PK)                                                     │  │
│  │ email                                                             │  │
│  │ created_at                                                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ (1:1)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              profiles                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ id (UUID, PK, FK → auth.users)                                   │  │
│  │ display_name                                                      │  │
│  │ timezone                                                          │  │
│  │ created_at, updated_at                                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
        │ annual_goals  │  │ reading_list  │  │ monthly_data  │
        ├───────────────┤  ├───────────────┤  ├───────────────┤
        │ id (PK)       │  │ id (PK)       │  │ id (PK)       │
        │ user_id (FK)  │  │ user_id (FK)  │  │ user_id (FK)  │
        │ year          │  │ year          │  │ year          │
        │ category      │  │ book_title    │  │ month         │
        │ title         │  │ author        │  │ notes         │
        │ sub_goals     │  │ completed     │  │ checklist     │
        │ progress      │  │ rating        │  │ action_plan   │
        │ created_at    │  │ order_index   │  │ created_at    │
        │ updated_at    │  │ created_at    │  │ updated_at    │
        └───────────────┘  │ updated_at    │  └───────────────┘
                           └───────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│ weekly_goals  │          │ time_blocks   │          │ daily_entries │
├───────────────┤          ├───────────────┤          ├───────────────┤
│ id (PK)       │          │ id (PK)       │          │ id (PK)       │
│ user_id (FK)  │          │ user_id (FK)  │          │ user_id (FK)  │
│ year          │          │ date          │          │ date          │
│ week_number   │          │ start_time    │          │ checklist     │
│ goal_text     │          │ end_time      │          │ journal_text  │
│ priority      │          │ activity      │          │ gratitude_text│
│ completed     │          │ category      │          │ created_at    │
│ created_at    │          │ created_at    │          │ updated_at    │
│ updated_at    │          │ updated_at    │          └───────────────┘
└───────────────┘          └───────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│ daily_habits  │          │ weekly_habits │          │ action_plans  │
├───────────────┤          ├───────────────┤          ├───────────────┤
│ id (PK)       │          │ id (PK)       │          │ id (PK)       │
│ user_id (FK)  │          │ user_id (FK)  │          │ user_id (FK)  │
│ habit_name    │          │ habit_name    │          │ year          │
│ order_index   │          │ target_days   │          │ month         │
│ created_at    │          │ order_index   │          │ life_area     │
│ updated_at    │          │ created_at    │          │ specific_act. │
└───────┬───────┘          │ updated_at    │          │ frequency     │
        │                  └───────┬───────┘          │ success_crit. │
        │ (1:many)                 │ (1:many)         │ progress      │
        ▼                          ▼                  │ evaluation    │
┌───────────────────────┐  ┌───────────────────────┐ │ created_at    │
│ daily_habit_          │  │ weekly_habit_         │ │ updated_at    │
│ completions           │  │ completions           │ └───────────────┘
├───────────────────────┤  ├───────────────────────┤
│ id (PK)               │  │ id (PK)               │
│ habit_id (FK)         │  │ habit_id (FK)         │
│ user_id (FK)          │  │ user_id (FK)          │
│ date                  │  │ date                  │
│ completed             │  │ completed             │
│ created_at            │  │ created_at            │
└───────────────────────┘  └───────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│ mood_tracker  │          │ sleep_tracker │          │ water_tracker │
├───────────────┤          ├───────────────┤          ├───────────────┤
│ id (PK)       │          │ id (PK)       │          │ id (PK)       │
│ user_id (FK)  │          │ user_id (FK)  │          │ user_id (FK)  │
│ date          │          │ date          │          │ date          │
│ mood_emoji    │          │ bedtime       │          │ glasses_cons. │
│ created_at    │          │ wake_time     │          │ goal_glasses  │
│ updated_at    │          │ hours_slept   │          │ created_at    │
└───────────────┘          │ created_at    │          │ updated_at    │
                           │ updated_at    │          └───────────────┘
                           └───────────────┘
```

## Table Categories

### 👤 User Management
- **profiles**: User profile information

### 🎯 Goal & Planning
- **annual_goals**: Yearly goals with sub-goals
- **reading_list**: Books to read
- **monthly_data**: Monthly notes and checklists
- **weekly_goals**: Weekly goals with priorities
- **action_plans**: Action plans with progress tracking

### 📅 Time Management
- **time_blocks**: 30-minute time blocks for scheduling
- **daily_entries**: Daily checklists, journal, gratitude

### ✅ Habit Tracking
- **daily_habits**: Daily habit definitions
- **daily_habit_completions**: Daily habit completion records
- **weekly_habits**: Weekly habit definitions
- **weekly_habit_completions**: Weekly habit completion records

### 💚 Wellness Tracking
- **mood_tracker**: Daily mood with emoji
- **sleep_tracker**: Sleep hours tracking
- **water_tracker**: Water intake tracking

## Key Relationships

### One-to-One
- `auth.users` ↔ `profiles`

### One-to-Many
- `auth.users` → `annual_goals`
- `auth.users` → `reading_list`
- `auth.users` → `monthly_data`
- `auth.users` → `weekly_goals`
- `auth.users` → `time_blocks`
- `auth.users` → `daily_entries`
- `auth.users` → `daily_habits`
- `auth.users` → `weekly_habits`
- `auth.users` → `mood_tracker`
- `auth.users` → `sleep_tracker`
- `auth.users` → `water_tracker`
- `auth.users` → `action_plans`
- `daily_habits` → `daily_habit_completions`
- `weekly_habits` → `weekly_habit_completions`

## Data Flow

### User Authentication Flow
```
1. User signs up/in → auth.users created by Supabase
2. Profile created → profiles table
3. User creates data → All other tables (with user_id FK)
```

### Habit Tracking Flow
```
1. User creates habit → daily_habits or weekly_habits
2. User marks complete → daily_habit_completions or weekly_habit_completions
3. App calculates progress → Based on completions in date range
```

### Goal Progress Flow
```
1. User creates goal → annual_goals with sub_goals array
2. User marks sub-goal complete → Update sub_goals JSONB
3. App calculates progress → (completed / total) × 100
```

## Security Model

All tables use Row Level Security (RLS) with the following pattern:

```sql
-- SELECT: Users can view their own data
USING (auth.uid() = user_id)

-- INSERT: Users can create their own data
WITH CHECK (auth.uid() = user_id)

-- UPDATE: Users can modify their own data
USING (auth.uid() = user_id)

-- DELETE: Users can delete their own data
USING (auth.uid() = user_id)
```

This ensures complete data isolation between users at the database level.

## Cascade Deletes

When a user is deleted:
- All user data is automatically deleted (CASCADE on user_id FK)

When a habit is deleted:
- All completions for that habit are automatically deleted (CASCADE on habit_id FK)

## Indexes

Performance indexes are created on:
- `user_id` + `year` combinations
- `user_id` + `date` combinations
- `user_id` + `year` + `month` combinations
- `habit_id` + `date` combinations

These ensure fast queries for common access patterns.

## JSONB Fields

### Flexible Data Structures

**annual_goals.sub_goals**
```json
[
  {"text": "Sub-goal 1", "completed": false},
  {"text": "Sub-goal 2", "completed": true}
]
```

**monthly_data.checklist**
```json
[
  {"text": "Task 1", "completed": false},
  {"text": "Task 2", "completed": true}
]
```

**monthly_data.action_plan**
```json
[
  {
    "goal": "Goal description",
    "progress": 50,
    "evaluation": "Notes"
  }
]
```

**daily_entries.checklist**
```json
[
  {"text": "Daily task", "completed": false}
]
```

## Constraints Summary

### CHECK Constraints
- Progress values: 0-100
- Month values: 1-12
- Week numbers: 1-53
- Ratings: 1-5
- Target days per week: 1-7
- Mood emojis: Limited to 5 specific emojis
- Category: Limited to 7 predefined categories
- Priority: Limited to 3 levels

### UNIQUE Constraints
- (user_id, year, month) for monthly_data
- (user_id, date) for daily_entries, mood_tracker, sleep_tracker, water_tracker
- (habit_id, date) for habit completions

### NOT NULL Constraints
- All user_id fields
- All primary keys
- Essential fields like habit_name, goal_text, etc.

## Automatic Features

### Timestamps
- `created_at`: Automatically set on INSERT
- `updated_at`: Automatically updated on UPDATE (via triggers)

### UUIDs
- All primary keys use `uuid_generate_v4()` for automatic UUID generation

### Default Values
- Boolean fields default to `false`
- Progress fields default to `0`
- JSONB arrays default to `[]`
- Numeric fields have sensible defaults (e.g., goal_glasses = 8)
