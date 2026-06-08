# 🖼️ Venue Image Upload System

## Overview
This system adds professional image upload capabilities to venue profiles, replacing URL inputs with drag & drop file uploads. Images are automatically optimized, compressed, and stored in Supabase Storage with proper security policies.

## ✨ Features
- **Drag & Drop Upload**: Users can drag images directly into upload areas
- **Automatic Optimization**: Images are compressed and resized to optimal dimensions
- **File Validation**: Size, type, and dimension checks
- **Real-time Preview**: Instant preview of uploaded images
- **Progress Tracking**: Visual upload progress indicators
- **Error Handling**: User-friendly error messages and recovery
- **Security**: Proper RLS policies and user-based file organization
- **Performance**: WebP conversion and intelligent caching

## 📁 Files Added/Modified

### New Files:
- `supabase/storage_setup.sql` - Storage buckets and policies setup
- `lib/utils/image-upload.ts` - Image upload utilities and validation
- `app/venue/components/image-upload.tsx` - Reusable upload component

### Modified Files:
- `types/database.types.ts` - Added `avatar_url` and `cover_image_url` fields
- `lib/services/venue.service.ts` - Added image upload methods
- `app/venue/hooks/useCurrentVenue.ts` - Updated field mapping for images
- `app/venue/components/edit-profile-modal.tsx` - Replaced URL inputs with upload components
- `app/venue/types/venue-profile.ts` - Added image URL fields to types

## 🛠️ Setup Instructions

### 1. Database & Storage Setup
Run the storage setup script in your Supabase SQL Editor:

```sql
-- Execute this file in Supabase Dashboard > SQL Editor
-- File: supabase/storage_setup.sql
```

This will:
- Create `venue-media` storage bucket (public, 10MB limit, images only)
- Create `venue-documents` storage bucket (private, 50MB limit, documents)
- Set up Row Level Security policies
- Add helper functions for storage operations
- Add `avatar_url` and `cover_image_url` columns to `venue_profiles` table

### 2. Image Upload Configuration

The system is configured with these defaults:
- **Max file size**: 10MB
- **Allowed formats**: JPEG, PNG, WebP, GIF
- **Max dimensions**: 2048x2048 pixels
- **Compression**: 85% quality WebP conversion
- **Organization**: Files stored by user ID (`/user_id/filename`)

### 3. Component Usage

The `ImageUpload` component can be used anywhere in the app:

```tsx
import { ImageUpload } from '@/app/venue/components/image-upload'

<ImageUpload
  userId={user.id}
  currentImageUrl={venue.avatar}
  imageType="avatar" // 'avatar' | 'cover' | 'gallery'
  onUploadComplete={(url) => {
    // Handle successful upload
    updateVenue({ avatarUrl: url })
  }}
  onUploadError={(error) => {
    // Handle upload error
    toast.error(error)
  }}
  onDeleteComplete={() => {
    // Handle image deletion
    updateVenue({ avatarUrl: null })
  }}
/>
```

## 🔒 Security Features

### Storage Policies
- **Public Read**: Anyone can view venue images
- **Authenticated Upload**: Only logged-in users can upload
- **Owner Control**: Users can only manage their own images
- **Path-based Security**: Files organized by user ID

### File Validation
- File type checking (only images allowed)
- File size limits (10MB for images)
- Dimension validation and auto-resize
- MIME type verification

### Error Handling
- Network failure recovery
- Invalid file type warnings
- Size limit notifications
- Upload retry mechanisms

## 📊 Database Schema Changes

### New Columns in `venue_profiles`:
```sql
avatar_url TEXT,
cover_image_url TEXT,
image_metadata JSONB DEFAULT '{}'::jsonb
```

### New Storage Buckets:
- `venue-media` (public) - For venue images
- `venue-documents` (private) - For venue documents

### New Helper Functions:
- `get_venue_image_url(user_id, image_name)` - Get public image URL
- `cleanup_old_venue_image(user_id, old_url)` - Clean up replaced images

## 🎨 UI/UX Features

### Upload Areas
- Responsive drag & drop zones
- Visual feedback for drag operations
- Click-to-upload fallback
- Loading states and progress bars

### Image Preview
- Instant preview after selection
- Proper aspect ratios (square for avatar, 16:9 for cover)
- Hover effects and delete buttons
- Before/after comparison

### User Feedback
- Success/error toast notifications
- Real-time validation messages
- Upload progress indicators
- File size and type information

## 🚀 Performance Optimizations

### Image Processing
- Client-side compression before upload
- WebP conversion for better compression
- Automatic resizing to max dimensions
- Canvas-based optimization

### Caching
- Browser cache headers set to 1 hour
- Service worker ready for offline support
- Intelligent cache invalidation
- Memory management for previews

### Network
- Chunked upload for large files
- Retry logic for failed uploads
- Compression headers
- CDN-ready URLs

## 🧪 Testing

### Manual Testing Checklist
- [ ] Upload various image formats (JPEG, PNG, GIF, WebP)
- [ ] Test drag & drop functionality
- [ ] Verify file size limits (try uploading >10MB)
- [ ] Test upload cancellation
- [ ] Check image preview accuracy
- [ ] Verify delete functionality
- [ ] Test with slow network connections
- [ ] Check mobile responsiveness

### Error Scenarios
- [ ] Network disconnection during upload
- [ ] Invalid file types (PDF, TXT, etc.)
- [ ] Oversized files
- [ ] Corrupted image files
- [ ] Permission errors

## 🔧 Customization

### Upload Limits
Modify limits in `lib/utils/image-upload.ts`:
```typescript
export const IMAGE_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxDimensions: {
    width: 2048,
    height: 2048
  }
}
```

### Storage Buckets
Modify bucket settings in `storage_setup.sql`:
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-media',
  'venue-media',
  true,
  10485760, -- Modify size limit here
  ARRAY['image/jpeg', 'image/png'] -- Modify allowed types here
)
```

## 🐛 Troubleshooting

### Common Issues

**Upload fails with "Permission denied"**
- Check if storage policies are properly created
- Verify user authentication
- Ensure bucket permissions are correct

**Images don't display after upload**
- Check if bucket is set to public
- Verify URL generation is correct
- Check browser network tab for 404s

**Upload is very slow**
- Check image optimization settings
- Verify network connection
- Consider reducing max dimensions

**"Invalid file type" error**
- Check MIME type validation
- Verify browser file type detection
- Update allowed types in config

### Debug Mode
Enable debug logging by adding to browser console:
```javascript
localStorage.setItem('debug-image-upload', 'true')
```

## 📈 Future Enhancements

### Planned Features
- **Bulk Upload**: Multiple images at once
- **Image Editing**: Basic crop/rotate functionality
- **AI Optimization**: Smart compression based on content
- **CDN Integration**: CloudFlare/AWS CloudFront integration
- **Progressive Upload**: Resume interrupted uploads
- **Image Gallery**: Multiple venue images support

### Integration Ideas
- **Social Media Import**: Import images from Instagram/Facebook
- **Stock Photos**: Integration with Unsplash/Pexels
- **AI Generated**: DALL-E integration for venue images
- **Video Support**: Extend to support venue video uploads

## 📞 Support

For questions or issues:
1. Check this documentation first
2. Review browser console for errors
3. Check Supabase dashboard for storage issues
4. Test with different browsers/devices
5. Contact development team with specific error messages

---

## ✅ Quick Setup Checklist

- [ ] Run `storage_setup.sql` in Supabase
- [ ] Verify storage buckets are created
- [ ] Test upload functionality in dev environment
- [ ] Check image display in venue profiles
- [ ] Verify delete functionality works
- [ ] Test on mobile devices
- [ ] Deploy to production
- [ ] Monitor error logs for issues

**🎉 Setup Complete!** Your venue image upload system is ready to use. 