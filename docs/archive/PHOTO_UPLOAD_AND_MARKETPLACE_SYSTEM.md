# 📸 Photo Upload & Marketplace System

## Overview

This comprehensive photo upload and marketplace system provides tiered upload capabilities based on account type, photo album management, user/event tagging, and a photographer marketplace for selling photos with secure payment integration.

## 🎯 Features

### Tiered Upload System
- **General Accounts**: Compressed uploads (<5MB), optimized for web viewing
- **Artist/Venue/Organizer**: Full-size uploads with compression for loading optimization
- **Photographer Accounts**: Full resolution + watermarked previews for marketplace protection

### Photo Albums
- Create and manage photo albums
- Organize photos by category and event
- Public/private visibility options
- Cover photo selection
- View counts and likes
- Photo tagging (users, events, keywords)

### Photographer Marketplace
- List photos for sale with customizable pricing
- Multiple license types (Personal, Commercial, Editorial, Exclusive)
- Watermarked previews to prevent unauthorized downloads
- Secure payment processing via Stripe
- Time-limited download URLs for purchased photos
- Purchase history and download tracking

### Advanced Features
- User tagging in photos
- Event association
- Full EXIF data preservation
- Batch upload support
- Progress tracking
- Responsive image delivery
- SEO-friendly metadata

## 📁 Files Created

### Database & Storage
1. **`supabase/migrations/20250208000000_photo_album_marketplace_system.sql`**
   - Complete database schema
   - Tables: photo_albums, photos, photo_tags, photo_purchases, photo_likes, album_likes, photo_comments
   - RLS policies for security
   - Triggers for auto-updating stats
   - Helper functions

2. **`supabase/setup-photo-storage-buckets.sql`**
   - Storage bucket configuration
   - Buckets: photos-full-res (private), photos-preview (public), photos-thumbnail (public), photos-watermarked (public)
   - RLS policies for storage
   - Helper functions for secure downloads

### Backend (API Routes)
3. **`app/api/photos/albums/route.ts`** - Album listing and creation
4. **`app/api/photos/albums/[id]/route.ts`** - Single album operations (get, update, delete)
5. **`app/api/photos/upload/route.ts`** - Photo upload endpoint
6. **`app/api/photos/[id]/route.ts`** - Single photo operations
7. **`app/api/photos/[id]/tags/route.ts`** - Photo tagging endpoints
8. **`app/api/photos/[id]/like/route.ts`** - Photo liking endpoints
9. **`app/api/photos/marketplace/route.ts`** - Marketplace browsing
10. **`app/api/photos/purchase/route.ts`** - Purchase initiation with Stripe
11. **`app/api/photos/purchase/webhook/route.ts`** - Stripe webhook handler

### Utilities
12. **`lib/utils/photo-upload.ts`**
    - Tiered compression logic
    - Image optimization
    - Watermarking
    - Batch upload support
    - Storage upload functions

### UI Components
13. **`components/photos/photo-album-upload.tsx`**
    - Drag & drop file upload
    - Album creation
    - Photographer options (watermarking, pricing)
    - Batch upload with progress tracking

14. **`components/photos/photo-album-viewer.tsx`**
    - Album display
    - Photo grid view
    - Lightbox preview
    - Like/share functionality
    - Owner edit options

15. **`components/photos/photo-marketplace.tsx`**
    - Marketplace browsing
    - Search and filters
    - License selection
    - Stripe checkout integration

## 🚀 Setup Instructions

### Step 1: Run Database Migration

1. Open your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250208000000_photo_album_marketplace_system.sql`
4. Click **"Run"** to execute the migration

### Step 2: Set Up Storage Buckets

1. In Supabase Dashboard, go to SQL Editor
2. Copy and paste the contents of `supabase/setup-photo-storage-buckets.sql`
3. Click **"Run"** to create storage buckets and policies

**OR** manually create buckets in Storage section:
- `photos-full-res` (private, 100MB limit)
- `photos-preview` (public, 50MB limit)
- `photos-thumbnail` (public, 5MB limit)
- `photos-watermarked` (public, 50MB limit)

### Step 3: Configure Stripe

1. Get your Stripe API keys from https://dashboard.stripe.com/apikeys

2. Add to `.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET_PHOTOS=whsec_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Set up Stripe webhook:
   - Go to Stripe Dashboard > Developers > Webhooks
   - Add endpoint: `https://your-domain.com/api/photos/purchase/webhook`
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET_PHOTOS`

### Step 4: Install Dependencies

If not already installed, add:
```bash
npm install react-dropzone stripe
```

## 📖 Usage Guide

### For General Users

#### Upload Photos
```tsx
import { PhotoAlbumUpload } from '@/components/photos/photo-album-upload'

function UploadPage() {
  return (
    <PhotoAlbumUpload
      accountType="general"
      userId={user.id}
      onUploadComplete={(photos) => {
        console.log('Uploaded:', photos)
      }}
    />
  )
}
```

#### View Albums
```tsx
import { PhotoAlbumViewer } from '@/components/photos/photo-album-viewer'

function AlbumPage() {
  return (
    <PhotoAlbumViewer
      albumId="album-uuid"
      isOwner={true}
      onEditAlbum={() => {/* handle edit */}}
      onDeleteAlbum={() => {/* handle delete */}}
    />
  )
}
```

### For Photographers

#### Upload with Marketplace Options
```tsx
<PhotoAlbumUpload
  accountType="photographer"
  userId={user.id}
  onUploadComplete={(photos) => {
    console.log('Uploaded photos for sale:', photos)
  }}
/>
```

The upload component will automatically show:
- Watermark options
- Pricing fields
- License type selection

#### View Marketplace
```tsx
import { PhotoMarketplace } from '@/components/photos/photo-marketplace'

function MarketplacePage() {
  return <PhotoMarketplace userId={user.id} />
}
```

### API Usage Examples

#### Create Album
```typescript
const response = await fetch('/api/photos/albums', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My Album',
    description: 'Description',
    category: 'performance',
    isPublic: true,
    accountType: 'artist'
  })
})

const { album } = await response.json()
```

#### Upload Photo
```typescript
// 1. Upload files to storage using photo-upload utility
import { uploadPhoto } from '@/lib/utils/photo-upload'

const result = await uploadPhoto({
  file: photoFile,
  accountType: 'photographer',
  userId: user.id,
  albumId: album.id,
  addWatermark: true,
  watermarkText: '© 2025 My Studio'
})

// 2. Create database record
const response = await fetch('/api/photos/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    albumId: album.id,
    accountType: 'photographer',
    fullResUrl: result.fullResUrl,
    previewUrl: result.previewUrl,
    thumbnailUrl: result.thumbnailUrl,
    watermarkedUrl: result.watermarkedUrl,
    fileSize: result.metadata.size,
    dimensions: {
      width: result.metadata.width,
      height: result.metadata.height
    },
    isForSale: true,
    salePrice: 29.99,
    licenseType: 'commercial',
    hasWatermark: true
  })
})
```

#### Purchase Photo
```typescript
const response = await fetch('/api/photos/purchase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    photoId: 'photo-uuid',
    licenseType: 'commercial'
  })
})

const { checkoutUrl } = await response.json()
// Redirect user to Stripe checkout
window.location.href = checkoutUrl
```

#### Tag Users in Photo
```typescript
await fetch(`/api/photos/${photoId}/tags`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tagType: 'user',
    taggedUserId: 'user-uuid',
    positionX: 35.5, // percentage from left
    positionY: 60.2  // percentage from top
  })
})
```

## 🔒 Security Features

### Row Level Security (RLS)
- Users can only modify their own content
- Private albums are only visible to owners
- Full-res photos are only accessible to owners and purchasers
- Watermarked previews protect photographer's work

### Payment Security
- Stripe handles all payment processing
- Secure webhook verification
- Time-limited download URLs
- Download count tracking
- Platform fee calculation

### Storage Security
- Private full-res bucket
- User-based folder structure
- Signed URLs for purchased content
- Automatic expiration of download links

## 💰 Pricing & Fees

### Platform Fee
- 15% platform fee on all photo sales
- Automatically calculated during purchase
- Seller receives 85% of sale price

### License Pricing (Suggested Multipliers)
- Personal Use: 1x base price
- Commercial Use: 2x base price
- Editorial Use: 1.5x base price
- Exclusive Rights: 5x base price

## 📊 Database Schema

### Key Tables

**photo_albums**
- Album metadata
- Owner information
- Visibility settings
- Stats (photo count, views, likes)

**photos**
- Full photo metadata
- Tiered URLs (full-res, preview, thumbnail, watermarked)
- Marketplace info (price, license, sale status)
- Stats (views, likes, purchases)

**photo_tags**
- User tags
- Event tags
- Location tags
- Position coordinates for face tagging

**photo_purchases**
- Purchase records
- Payment status
- License information
- Download tracking
- Secure download URLs

## 🎨 Compression Tiers

### General Accounts
- Max size: 5MB after compression
- Max dimensions: 2048x2048px
- Quality: 85%
- Format: WebP

### Artist/Venue/Organizer
- Max size: 50MB (full-res preserved)
- Max dimensions: 4096x4096px
- Quality: 90%
- Format: WebP for preview, original for full-res

### Photographer
- Max size: 100MB (full-res preserved)
- Max dimensions: 8192x8192px
- Quality: 95%
- Format: WebP for preview, original for full-res
- Watermark: Applied to preview and watermarked versions

## 🧪 Testing Checklist

### Upload Testing
- [ ] General account: Upload should compress to <5MB
- [ ] Artist account: Full-res should be preserved
- [ ] Photographer account: Watermark should be applied
- [ ] Batch upload: Multiple files should upload with progress
- [ ] Error handling: Invalid files should be rejected

### Album Testing
- [ ] Create album with photos
- [ ] Set cover photo
- [ ] Toggle public/private
- [ ] View album as owner
- [ ] View album as public user
- [ ] Edit album details
- [ ] Delete album

### Marketplace Testing
- [ ] List photo for sale
- [ ] Browse marketplace
- [ ] Filter by category/price
- [ ] Search for photos
- [ ] Purchase photo (Stripe test mode)
- [ ] Receive download link
- [ ] Download purchased photo
- [ ] Verify watermark is NOT on purchased version

### Security Testing
- [ ] Cannot access private albums of other users
- [ ] Cannot access full-res photos without purchase
- [ ] Download URLs expire after 24 hours
- [ ] RLS policies prevent unauthorized access

## 🐛 Troubleshooting

### Storage Upload Fails
- Verify storage buckets exist in Supabase
- Check RLS policies are applied
- Ensure user is authenticated
- Check file size limits

### Purchase Fails
- Verify Stripe keys are correct
- Check webhook is configured
- Ensure webhook secret matches
- Test in Stripe test mode first

### Watermark Not Showing
- Check `addWatermark` is set to `true`
- Verify `accountType` is `'photographer'`
- Check `watermarkText` is provided
- Ensure watermarked URL is being used for display

### Download URL Expired
- Download URLs expire after 24 hours
- User can regenerate download link from purchases page
- Check `download_count` < `max_downloads` (default: 3)

## 🔄 Future Enhancements

### Planned Features
- Advanced photo editing tools
- AI-powered tagging and categorization
- Face recognition for automatic user tagging
- Photo collections/portfolios
- Bulk pricing/discounts
- Subscription model for photographers
- Advanced analytics for photographers
- Social sharing integration
- Print-on-demand integration
- Rights management dashboard

## 📝 Notes

### Important Considerations
1. **Storage Costs**: Monitor Supabase storage usage as photos accumulate
2. **CDN**: Consider adding a CDN for better image delivery performance
3. **Image Processing**: Consider using an image processing service like Cloudinary or Imgix for advanced features
4. **Backups**: Implement regular backups of both database and storage
5. **GDPR Compliance**: Ensure user data handling complies with privacy regulations

### Best Practices
- Always provide alt text for accessibility
- Use responsive image loading
- Implement lazy loading for photo grids
- Compress images appropriately for account type
- Use watermarks for marketplace photos
- Set appropriate license terms
- Monitor download counts
- Provide clear usage rights information

## 🆘 Support

If you encounter issues:
1. Check this documentation
2. Review the troubleshooting section
3. Check Supabase logs
4. Verify environment variables
5. Test in development mode first

## ✅ System is Ready!

All components are implemented and ready to use. Follow the setup instructions above to get started.

**Next Steps:**
1. Run the database migration
2. Set up storage buckets
3. Configure Stripe
4. Test the upload flow
5. Test the marketplace
6. Launch! 🚀

