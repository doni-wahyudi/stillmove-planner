# Supabase Storage Setup Guide

This guide provides step-by-step instructions for setting up Supabase Storage for the Kanban Card Attachments feature.

## Overview

The Kanban Card Enhancements feature uses Supabase Storage to store file attachments associated with Kanban cards. Files are stored securely with Row Level Security (RLS) policies ensuring users can only access files for their own cards.

**Requirements Covered:** 5.2, 5.7

## Prerequisites

- Supabase project already set up (see [README.md](README.md))
- Kanban tables created (run [add-kanban-tables.sql](add-kanban-tables.sql) first)
- Kanban enhancement tables created (run [add-kanban-enhancements-tables.sql](add-kanban-enhancements-tables.sql))

---

## Step 1: Create the Storage Bucket

### Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name:** `kanban-attachments`
   - **Public bucket:** ❌ **Unchecked** (keep private for security)
   - **File size limit:** `10485760` (10MB in bytes)
   - **Allowed MIME types:** Leave empty for now (we'll enforce in application code)
5. Click **Create bucket**

### Via SQL Editor (Alternative)

If you prefer to create the bucket via SQL, run this in the SQL Editor:

```sql
-- Create the kanban-attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
    'kanban-attachments',
    'kanban-attachments',
    false,
    10485760  -- 10MB in bytes
)
ON CONFLICT (id) DO NOTHING;
```

---

## Step 2: Configure Storage Policies

Storage policies control who can upload, download, and delete files. Run the following SQL in the **SQL Editor**:

```sql
-- ============================================================================
-- SUPABASE STORAGE POLICIES FOR KANBAN ATTACHMENTS
-- 
-- These policies ensure users can only access files for their own Kanban cards.
-- The file path structure is: {user_id}/{card_id}/{filename}
-- ============================================================================

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Users can upload attachments to their own cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can view attachments from their own cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete attachments from their own cards" ON storage.objects;

-- ============================================================================
-- UPLOAD POLICY
-- Users can upload files to paths matching their user ID
-- Path format: kanban-attachments/{user_id}/{card_id}/{filename}
-- ============================================================================
CREATE POLICY "Users can upload attachments to their own cards"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kanban-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- DOWNLOAD/VIEW POLICY
-- Users can view/download files from paths matching their user ID
-- ============================================================================
CREATE POLICY "Users can view attachments from their own cards"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kanban-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- DELETE POLICY
-- Users can delete files from paths matching their user ID
-- ============================================================================
CREATE POLICY "Users can delete attachments from their own cards"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'kanban-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Step 3: Verify Setup

### Check Bucket Exists

1. Go to **Storage** in the Supabase Dashboard
2. Verify `kanban-attachments` bucket appears in the list
3. Click on the bucket to view its settings
4. Confirm:
   - Public access is **disabled**
   - File size limit is **10MB** (10485760 bytes)

### Check Policies Exist

1. In the Storage section, click on **Policies** tab
2. You should see 3 policies for `kanban-attachments`:
   - `Users can upload attachments to their own cards` (INSERT)
   - `Users can view attachments from their own cards` (SELECT)
   - `Users can delete attachments from their own cards` (DELETE)

### Test Upload (Optional)

You can test the setup by uploading a small file via the Dashboard:

1. Click on the `kanban-attachments` bucket
2. Create a folder with your user ID (find it in Authentication > Users)
3. Inside that folder, create another folder with any UUID (simulating a card ID)
4. Try uploading a small image file
5. Verify the file appears and can be downloaded

---

## Bucket Configuration Reference

| Setting | Value | Description |
|---------|-------|-------------|
| **Bucket Name** | `kanban-attachments` | Unique identifier for the bucket |
| **Public** | `false` | Files require authentication to access |
| **File Size Limit** | 10MB (10485760 bytes) | Maximum size per file upload |
| **Path Structure** | `{user_id}/{card_id}/{filename}` | Organized by user and card |

---

## Allowed File Types

The application enforces the following MIME types in the `StorageService`:

| Category | MIME Types | Extensions |
|----------|------------|------------|
| **Images** | `image/jpeg`, `image/png`, `image/gif`, `image/webp` | .jpg, .jpeg, .png, .gif, .webp |
| **Documents** | `application/pdf` | .pdf |
| **Word Documents** | `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | .doc, .docx |
| **Text Files** | `text/plain`, `text/csv` | .txt, .csv |
| **Archives** | `application/zip` | .zip |

**Note:** File type validation is enforced at the application level in `js/storage-service.js`, not at the bucket level. This allows for more flexible error messages and validation logic.

---

## File Size Limits

| Limit | Value | Enforced By |
|-------|-------|-------------|
| **Maximum file size** | 10MB | Bucket configuration + Application |
| **Minimum file size** | 0 bytes | No minimum |

Files exceeding 10MB will be rejected by both:
1. The Supabase Storage bucket configuration
2. The `StorageService.validateFile()` method in the application

---

## Security Considerations

### Row Level Security (RLS)

- All storage policies use `auth.uid()` to verify the authenticated user
- File paths include the user ID as the first folder, ensuring isolation
- Users cannot access files in other users' folders

### Path Structure

Files are stored with the following path structure:
```
kanban-attachments/
└── {user_id}/
    └── {card_id}/
        └── {unique_filename}
```

This structure:
- Ensures user isolation at the folder level
- Groups files by card for easy cleanup
- Uses unique filenames to prevent collisions

### Signed URLs

Since the bucket is private, the application uses signed URLs to provide temporary access to files:
- Signed URLs expire after a configurable duration
- Each URL is specific to the authenticated user
- URLs cannot be shared or reused by other users

---

## Troubleshooting

### Issue: "Bucket not found" error

**Solution:** 
1. Verify the bucket name is exactly `kanban-attachments`
2. Check that the bucket was created successfully in the Dashboard
3. Ensure you're using the correct Supabase project

### Issue: "Permission denied" on upload

**Solution:**
1. Verify the user is authenticated
2. Check that the file path starts with the user's ID
3. Verify the storage policies were created correctly
4. Run the policy SQL again to ensure policies exist

### Issue: "File too large" error

**Solution:**
1. Ensure the file is under 10MB
2. Check the bucket's file size limit in Settings
3. The application should validate file size before upload

### Issue: "Invalid file type" error

**Solution:**
1. Check that the file's MIME type is in the allowed list
2. Some files may have incorrect MIME types - verify the actual type
3. The application validates types in `StorageService.validateFile()`

### Issue: Cannot delete files

**Solution:**
1. Verify the delete policy exists
2. Ensure the file path matches the user's ID
3. Check that the user is authenticated
4. Verify the file exists before attempting deletion

---

## Integration with Application

The storage bucket is used by the following application components:

| Component | File | Purpose |
|-----------|------|---------|
| **StorageService** | `js/storage-service.js` | Handles file upload, download, and deletion |
| **KanbanService** | `js/kanban-service.js` | Coordinates attachment operations with card data |
| **AttachmentsComponent** | `views/kanban-view.js` | UI for displaying and managing attachments |

### File Upload Flow

1. User selects a file in the AttachmentsComponent
2. StorageService validates file type and size
3. StorageService uploads to `{user_id}/{card_id}/{unique_filename}`
4. KanbanService creates attachment record in `kanban_attachments` table
5. Activity log entry is created for the upload

### File Deletion Flow

1. User clicks delete on an attachment
2. Confirmation dialog is shown
3. StorageService deletes file from storage bucket
4. KanbanService deletes attachment record from database
5. Activity log entry is created for the deletion

---

## Related Documentation

- [README.md](README.md) - Database setup guide
- [add-kanban-enhancements-tables.sql](add-kanban-enhancements-tables.sql) - Attachment metadata table
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Common database queries
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)

---

## Checklist

Use this checklist to verify your storage setup:

- [ ] Created `kanban-attachments` bucket
- [ ] Bucket is set to **private** (not public)
- [ ] File size limit is set to **10MB**
- [ ] Created INSERT policy for uploads
- [ ] Created SELECT policy for downloads
- [ ] Created DELETE policy for deletions
- [ ] Tested file upload with a small image
- [ ] Tested file download
- [ ] Tested file deletion
- [ ] Verified RLS prevents access to other users' files

---

## Summary

The `kanban-attachments` storage bucket provides secure file storage for Kanban card attachments with:

- ✅ **10MB file size limit** per attachment
- ✅ **Private bucket** with RLS policies
- ✅ **User isolation** via path-based security
- ✅ **Support for images, documents, and archives**
- ✅ **Signed URLs** for secure file access

After completing this setup, the Kanban Card Enhancements feature will be able to upload, display, and delete file attachments securely.
