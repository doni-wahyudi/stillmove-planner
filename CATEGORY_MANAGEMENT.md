# Category Management Feature

## Overview
Users can now manage their own custom categories with personalized colors for time blocks and activities.

## Database Setup

### 1. Run the SQL Migration
Execute the SQL file in your Supabase SQL Editor:
```sql
-- File: database/add-categories-table.sql
```

This creates the `custom_categories` table with:
- User-specific categories
- Custom gradient colors (start and end)
- Default categories that cannot be deleted
- Row Level Security policies

## Features

### View Categories
- Categories are displayed in the Weekly View sidebar
- Each category shows a color gradient preview
- Click a category to filter/select it

### Manage Categories
1. Click the ⚙️ (gear) icon next to "Categories" heading
2. Category Manager modal opens

### Add New Category
1. Click "+ Add New Category" button
2. A new category appears with default gray colors
3. Customize the name and colors

### Edit Category
- **Name**: Click the name field and type a new name
- **Colors**: Click the color pickers to choose start and end colors for the gradient
- Changes save automatically when you click outside the field

### Delete Category
- Click the × button next to a category
- Default categories (Personal, Work, Business, etc.) cannot be deleted
- Confirmation prompt appears before deletion

### Color Gradient
- Each category uses a gradient from start color to end color
- The gradient is displayed in:
  - Category legend
  - Time blocks
  - Category manager preview

## Default Categories

When a user first logs in, these default categories are created:
1. **Personal** - Pink to Red gradient
2. **Work** - Blue to Cyan gradient
3. **Business** - Pink to Yellow gradient
4. **Family** - Yellow to Pink gradient
5. **Education** - Purple to Pink gradient
6. **Social** - Cyan to Blue gradient
7. **Project** - Red to Orange gradient

## Technical Implementation

### Files Modified
- `database/add-categories-table.sql` - New database table
- `js/data-service.js` - Category CRUD methods
- `views/weekly-view.html` - Category manager UI
- `views/weekly-view.js` - Category management logic
- `css/main.css` - Category manager styles

### Data Service Methods
```javascript
await dataService.getCustomCategories()
await dataService.createCustomCategory(category)
await dataService.updateCustomCategory(id, updates)
await dataService.deleteCustomCategory(id)
await dataService.initializeDefaultCategories()
```

### Category Object Structure
```javascript
{
  id: 'uuid',
  user_id: 'uuid',
  name: 'Category Name',
  color_start: '#f093fb',  // Hex color
  color_end: '#f5576c',    // Hex color
  order_index: 0,
  is_default: false,
  created_at: 'timestamp',
  updated_at: 'timestamp'
}
```

## Usage in Other Views

To add category management to other views (Monthly, Annual, etc.):

1. Load categories:
```javascript
this.categories = await dataService.getCustomCategories();
```

2. Render category list:
```javascript
this.categories.forEach(category => {
  const gradient = `linear-gradient(135deg, ${category.color_start} 0%, ${category.color_end} 100%)`;
  // Use gradient in your UI
});
```

3. Update category dropdowns:
```javascript
this.categories.forEach(category => {
  const option = document.createElement('option');
  option.value = category.name;
  option.textContent = category.name;
  selectElement.appendChild(option);
});
```

## Future Enhancements

Potential improvements:
- Drag-and-drop to reorder categories
- Category icons in addition to colors
- Category usage statistics
- Import/export categories
- Category templates/presets
- Category grouping/nesting
