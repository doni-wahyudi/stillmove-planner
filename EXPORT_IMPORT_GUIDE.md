# Data Export and Import Guide

## Overview

The Daily Planner Application includes a comprehensive data export and import feature that allows you to backup your planning data and transfer it between devices or accounts.

## Accessing Export/Import

1. Click on your email address in the top-right corner of the application
2. Select "Settings" from the dropdown menu
3. You'll see two sections: "Export Data" and "Import Data"

## Exporting Your Data

### How to Export

1. Navigate to Settings
2. Click the "Export All Data" button
3. A JSON file will be automatically downloaded to your computer
4. The filename will be in the format: `planner-export-YYYY-MM-DD.json`

### What Gets Exported

The export includes ALL your planner data:
- User profile (display name, timezone)
- Annual goals and sub-goals
- Reading list
- Monthly data (notes, checklists, action plans)
- Weekly goals
- Time blocks
- Daily entries (checklists, journal, gratitude)
- Daily habits and completions
- Weekly habits and completions
- Mood tracker entries
- Sleep tracker entries
- Water tracker entries
- Action plans

### Export File Format

The exported file is a JSON file with the following structure:

```json
{
  "version": "1.0",
  "exportDate": "2025-12-04T10:30:00.000Z",
  "userId": "your-user-id",
  "userEmail": "your@email.com",
  "data": {
    "profile": { ... },
    "annualGoals": [ ... ],
    "readingList": [ ... ],
    ...
  }
}
```

## Importing Data

### How to Import

1. Navigate to Settings
2. Click the "Choose File" button in the Import Data section
3. Select a previously exported JSON file
4. Choose your import mode:
   - **Merge with existing data**: Adds imported data to your current data
   - **Replace existing data**: Replaces all current data with imported data (use with caution!)
5. Click "Import Data"
6. Confirm the action when prompted

### Import Validation

The system validates imported files to ensure they have the correct format:
- Checks for required fields (version, data structure)
- Validates that array fields are actually arrays
- Ensures all required data categories are present
- Rejects invalid JSON files

If validation fails, you'll see an error message explaining what's wrong.

### Import Modes

#### Merge Mode (Recommended)
- Adds imported data to your existing data
- Existing data is preserved
- New items are created from the import
- Safer option for most use cases

#### Replace Mode (Use with Caution)
- Currently works the same as merge mode
- In future versions, may delete existing data first
- Use only when you want to completely restore from a backup

### Import Statistics

After a successful import, you'll see:
- Number of items imported
- Number of items updated
- Number of items skipped
- Any errors that occurred during import

## Use Cases

### Backup Your Data
Export your data regularly to create backups. Store the JSON files in a safe location (cloud storage, external drive, etc.).

### Transfer Between Devices
1. Export data from Device A
2. Transfer the JSON file to Device B (email, USB, cloud storage)
3. Import the file on Device B

### Migrate to a New Account
1. Export data from your old account
2. Sign in with your new account
3. Import the data

### Share Planning Templates
Export your goal structures, habit lists, or action plans and share them with others (note: this will include your personal data, so review the file first).

## Troubleshooting

### Export Fails
- **Error: "User not authenticated"**: Sign in again
- **Error: "Failed to save data"**: Check your internet connection
- **No download happens**: Check your browser's download settings and popup blocker

### Import Fails
- **Error: "Invalid JSON file format"**: The file is corrupted or not a valid JSON file
- **Error: "Missing required fields"**: The file structure doesn't match the expected format
- **Error: "Invalid field type"**: One or more fields have the wrong data type

### File Won't Open
- Make sure you're selecting a `.json` file
- Don't edit the exported file manually (it may break the format)
- If you need to edit, use a proper JSON editor

## Security and Privacy

### What's Safe to Share
- The export file contains ALL your personal planning data
- Only share export files with people you trust
- Consider creating a "clean" export by deleting personal data first

### Data Storage
- Export files are stored locally on your device
- They are not automatically uploaded anywhere
- You control where the files are stored and who has access

### Sensitive Information
Export files may contain:
- Personal goals and reflections
- Journal entries
- Sleep and mood data
- Action plans and evaluations

Be mindful of where you store and share these files.

## Best Practices

1. **Regular Backups**: Export your data weekly or monthly
2. **Version Control**: Keep multiple dated backups
3. **Test Imports**: Test importing on a test account first
4. **Secure Storage**: Store backups in encrypted cloud storage
5. **Before Major Changes**: Export before making significant changes to your data

## Technical Details

### File Size
- Export files are typically small (< 1 MB for most users)
- Size depends on how much data you have
- Large reading lists or many habits will increase file size

### Compatibility
- Export format version: 1.0
- Future versions will maintain backward compatibility
- Older exports should work with newer app versions

### Performance
- Export typically takes 1-5 seconds
- Import time depends on data size (usually < 10 seconds)
- Large imports may take longer

## Support

If you encounter issues with export/import:
1. Check this guide for troubleshooting steps
2. Verify your internet connection
3. Try signing out and back in
4. Contact support with the error message and export file (if safe to share)

---

**Last Updated**: December 2025
**Version**: 1.0
