# Supabase Storage Buckets Setup Guide

This guide will help you set up and configure Supabase storage buckets for handling media uploads in your Tourify application.

## 🚀 Quick Setup

### 1. Run the Storage Setup Script

1. **Open your Supabase dashboard** → Go to your project
2. **Navigate to SQL Editor** (left sidebar)
3. **Copy and paste** the contents of `supabase/setup-storage-buckets.sql`
4. **Click "Run"** to execute the script

This will create all necessary storage buckets and security policies.

### 2. Verify Storage Buckets

After running the script, verify the buckets were created:

1. **Go to Storage** in your Supabase dashboard
2. **You should see these buckets**:
   - `avatars` (public) - Profile pictures
   - `post-media` (public) - Social media posts
   - `venue-media` (public) - Venue photos
   - `event-media` (public) - Event photos  
   - `documents` (private) - User documents

## 📁 Storage Bucket Structure

```
avatars/
├── {user-id}/
│   └── avatar-{timestamp}.{ext}

post-media/
├── {user-id}/
│   └── post-{timestamp}-{random}.{ext}

venue-media/
├── {user-id}/
│   └── venue-{timestamp}-{random}.{ext}

event-media/
├── {user-id}/
│   └── event-{timestamp}-{random}.{ext}

documents/
├── {user-id}/
│   └── doc-{timestamp}-{random}.{ext}
```

## 🔒 Security Features

### Row Level Security (RLS)
- ✅ **Public Access**: Images are publicly viewable
- ✅ **User Isolation**: Users can only upload/modify their own files
- ✅ **Authentication**: All uploads require authentication
- ✅ **File Type Validation**: Server-side validation of file types

### File Restrictions
- **Avatars**: Max 10MB, Images only (JPG, PNG, GIF, WebP)
- **Post Media**: Max 50MB, Images only
- **Venue Media**: Max 50MB, Images only
- **Event Media**: Max 50MB, Images only
- **Documents**: Max 25MB, Documents only (PDF, DOC, DOCX, TXT)

## 💻 Using the Media Upload System

### Basic Upload Example

```typescript
import { useMediaUpload } from '@/lib/utils/media-upload'

function MyComponent() {
  const { uploadFile } = useMediaUpload()
  
  const handleFileUpload = async (file: File, userId: string) => {
    const result = await uploadFile({
      userId: userId,
      file: file,
      mediaType: 'avatar' // or 'post', 'venue', 'event', 'document'
    })
    
    if (result.success) {
      console.log('File uploaded:', result.url)
    } else {
      console.error('Upload failed:', result.error)
    }
  }
}
```

### Advanced Upload with Progress

```typescript
const result = await uploadFile({
  userId: user.id,
  file: selectedFile,
  mediaType: 'post',
  maxSizeMB: 25, // Override default size limit
  onProgress: (progress) => {
    setUploadProgress(progress)
  }
})
```

### Delete Files

```typescript
import { useMediaUpload, extractFilePathFromUrl } from '@/lib/utils/media-upload'

const { deleteFile } = useMediaUpload()

const handleDelete = async (fileUrl: string) => {
  const filePath = extractFilePathFromUrl(fileUrl, 'avatars')
  if (filePath) {
    const success = await deleteFile(filePath, 'avatar')
    console.log('Deleted:', success)
  }
}
```

## 🛠 Troubleshooting

### Common Issues

**1. "Bucket does not exist" error**
- Make sure you ran the setup SQL script
- Check that buckets are visible in Supabase dashboard

**2. "Upload failed" with authentication error**
- Verify user is logged in: `const { user } = useAuth()`
- Check if RLS policies are active

**3. "File type not allowed" error**
- Check file validation in `lib/utils/media-upload.ts`
- Ensure file MIME type is in allowed list

**4. "File too large" error**
- Check size limits in the utility
- Compress images before uploading

### Debug Mode

Enable debug logging in the media upload utility:

```typescript
// In lib/utils/media-upload.ts, the console.log statements will help debug
console.log(`Uploading ${mediaType} file:`, fileName, 'to bucket:', bucketName)
```

## 🎨 UI Components Using Storage

### Avatar Upload (Profile Settings)
- **Location**: `components/settings/profile-settings.tsx`
- **Bucket**: `avatars`
- **Features**: File validation, old file cleanup, real-time preview

### Post Media Upload (Coming Soon)
- **Location**: `components/feed/post-creator.tsx`
- **Bucket**: `post-media`
- **Features**: Multiple files, drag & drop, image preview

### Venue Photos (Coming Soon)
- **Location**: `components/venue/media-uploader.tsx`
- **Bucket**: `venue-media`
- **Features**: Gallery view, bulk upload

## 📊 Storage Management

### Monitor Usage
1. Go to **Settings** → **Usage** in Supabase dashboard
2. Monitor storage usage and bandwidth
3. Set up alerts for usage limits

### Cleanup Orphaned Files
```sql
-- Run this periodically to clean up unreferenced files
SELECT cleanup_orphaned_files();
```

### Backup Strategy
- Supabase automatically backs up your storage
- For additional backup, use the Supabase CLI:
```bash
supabase db dump --include-data > backup.sql
```

## 🚨 Important Notes

1. **Environment Variables**: Make sure your Supabase keys are properly configured
2. **CORS Settings**: Storage buckets inherit CORS from your Supabase project
3. **CDN**: Supabase automatically serves files via CDN for better performance
4. **Versioning**: The system uses timestamps to avoid filename conflicts

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify the Supabase dashboard for bucket status
3. Ensure RLS policies are properly configured
4. Test with small files first

---

**✅ Setup Complete!** Your storage system is now ready to handle all media uploads securely and efficiently. 