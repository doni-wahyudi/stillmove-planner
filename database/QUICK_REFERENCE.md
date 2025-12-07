# Database Quick Reference

Quick reference guide for working with the Daily Planner database schema.

## Table Relationships

```
auth.users (Supabase Auth)
    ↓
profiles (1:1)
    ↓
├── annual_goals (1:many)
├── reading_list (1:many)
├── monthly_data (1:many)
├── weekly_goals (1:many)
├── time_blocks (1:many)
├── daily_entries (1:many)
├── daily_habits (1:many)
│   └── daily_habit_completions (1:many)
├── weekly_habits (1:many)
│   └── weekly_habit_completions (1:many)
├── mood_tracker (1:many)
├── sleep_tracker (1:many)
├── water_tracker (1:many)
└── action_plans (1:many)
```

## Common Query Patterns

### Get Annual Goals for Current Year
```sql
SELECT * FROM annual_goals
WHERE user_id = auth.uid()
  AND year = 2025
ORDER BY created_at;
```

### Get Monthly Data
```sql
SELECT * FROM monthly_data
WHERE user_id = auth.uid()
  AND year = 2025
  AND month = 1;
```

### Get Daily Habits with Completions for a Date Range
```sql
SELECT 
  h.id,
  h.habit_name,
  h.order_index,
  c.date,
  c.completed
FROM daily_habits h
LEFT JOIN daily_habit_completions c ON h.id = c.habit_id
WHERE h.user_id = auth.uid()
  AND c.date BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY h.order_index, c.date;
```

### Calculate Habit Progress for 7 Days
```sql
SELECT 
  h.habit_name,
  COUNT(CASE WHEN c.completed = true THEN 1 END) as completed_days,
  COUNT(*) as total_days,
  ROUND(COUNT(CASE WHEN c.completed = true THEN 1 END)::numeric / COUNT(*) * 100, 1) as progress_percentage
FROM daily_habits h
LEFT JOIN daily_habit_completions c ON h.id = c.habit_id
WHERE h.user_id = auth.uid()
  AND c.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY h.id, h.habit_name;
```

### Get Time Blocks for a Week
```sql
SELECT * FROM time_blocks
WHERE user_id = auth.uid()
  AND date BETWEEN '2025-01-06' AND '2025-01-12'
ORDER BY date, start_time;
```

### Get Mood Distribution for a Month
```sql
SELECT 
  mood_emoji,
  COUNT(*) as count
FROM mood_tracker
WHERE user_id = auth.uid()
  AND date >= '2025-01-01'
  AND date < '2025-02-01'
GROUP BY mood_emoji
ORDER BY count DESC;
```

## Data Types Reference

### JSONB Structures

#### annual_goals.sub_goals
```json
[
  {
    "text": "Sub-goal description",
    "completed": false
  }
]
```

#### monthly_data.checklist
```json
[
  {
    "text": "Checklist item",
    "completed": false
  }
]
```

#### monthly_data.action_plan
```json
[
  {
    "goal": "Goal description",
    "progress": 50,
    "evaluation": "Evaluation notes"
  }
]
```

#### daily_entries.checklist
```json
[
  {
    "text": "Task description",
    "completed": false
  }
]
```

## Field Constraints

### Enums and Valid Values

**time_blocks.category**
- 'Personal'
- 'Work'
- 'Business'
- 'Family'
- 'Education'
- 'Social'
- 'Project'

**weekly_goals.priority**
- 'Urgent'
- 'Medium'
- 'Low'

**mood_tracker.mood_emoji**
- '🥰' (Very Happy)
- '😁' (Happy)
- '😶' (Neutral)
- '😵' (Stressed)
- '😩' (Sad)

### Numeric Constraints

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| annual_goals.progress | 0 | 100 | Percentage |
| reading_list.rating | 1 | 5 | Star rating |
| monthly_data.month | 1 | 12 | Calendar month |
| weekly_goals.week_number | 1 | 53 | ISO week number |
| weekly_habits.target_days_per_week | 1 | 7 | Days per week |
| water_tracker.glasses_consumed | 0 | ∞ | Non-negative |
| water_tracker.goal_glasses | 1 | ∞ | Positive |
| action_plans.progress | 0 | 100 | Percentage |
| action_plans.month | 1 | 12 | Calendar month |

## Unique Constraints

These combinations must be unique per user:

- `monthly_data`: (user_id, year, month)
- `daily_entries`: (user_id, date)
- `daily_habit_completions`: (habit_id, date)
- `weekly_habit_completions`: (habit_id, date)
- `mood_tracker`: (user_id, date)
- `sleep_tracker`: (user_id, date)
- `water_tracker`: (user_id, date)

## Cascade Deletes

When a user is deleted from `auth.users`, all their data is automatically deleted (CASCADE).

When a habit is deleted:
- All completions for that habit are automatically deleted (CASCADE)

## Automatic Timestamps

These fields are automatically managed:

- `created_at`: Set on INSERT (never changes)
- `updated_at`: Set on INSERT and updated on every UPDATE

You don't need to set these manually in your application code.

## Performance Tips

1. **Use indexes**: All common query patterns have indexes
2. **Batch operations**: Use bulk inserts when creating multiple records
3. **Limit results**: Use LIMIT and pagination for large datasets
4. **Use JSONB operators**: For querying JSONB fields efficiently
5. **Cache frequently accessed data**: Cache user profile and habit definitions

## Security Notes

1. **RLS is always enforced**: You cannot bypass RLS from the client
2. **auth.uid() is secure**: It's provided by Supabase Auth
3. **Always use user_id**: Include user_id in all INSERT operations
4. **Anon key is safe**: The anon key can be public; security is in RLS
5. **Service role key is secret**: Never expose service role key in client code

## Common Errors and Solutions

### Error: "new row violates row-level security policy"
**Cause**: Trying to insert data with wrong user_id or not authenticated
**Solution**: Ensure user is authenticated and user_id matches auth.uid()

### Error: "duplicate key value violates unique constraint"
**Cause**: Trying to insert duplicate (user_id, date) or (habit_id, date)
**Solution**: Use UPSERT (INSERT ... ON CONFLICT) or check if record exists first

### Error: "null value in column 'user_id' violates not-null constraint"
**Cause**: Not providing user_id in INSERT
**Solution**: Always include user_id = auth.uid() in INSERT statements

### Error: "foreign key constraint violation"
**Cause**: Referencing non-existent habit_id or user_id
**Solution**: Ensure parent record exists before creating child record

## Example: Complete CRUD Operations

### Create
```javascript
const { data, error } = await supabase
  .from('annual_goals')
  .insert([{
    year: 2025,
    category: 'Career',
    title: 'Learn new skill',
    sub_goals: [],
    progress: 0
  }])
  .select();
```

### Read
```javascript
const { data, error } = await supabase
  .from('annual_goals')
  .select('*')
  .eq('year', 2025)
  .order('created_at');
```

### Update
```javascript
const { data, error } = await supabase
  .from('annual_goals')
  .update({ progress: 50 })
  .eq('id', goalId)
  .select();
```

### Delete
```javascript
const { error } = await supabase
  .from('annual_goals')
  .delete()
  .eq('id', goalId);
```

### Upsert (Insert or Update)
```javascript
const { data, error } = await supabase
  .from('daily_entries')
  .upsert({
    date: '2025-01-15',
    journal_text: 'Today was great!',
    gratitude_text: 'Grateful for family'
  }, {
    onConflict: 'user_id,date'
  })
  .select();
```

## Real-Time Subscriptions

### Subscribe to Changes
```javascript
const subscription = supabase
  .channel('annual_goals_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'annual_goals',
      filter: `year=eq.2025`
    },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();
```

### Unsubscribe
```javascript
subscription.unsubscribe();
```
