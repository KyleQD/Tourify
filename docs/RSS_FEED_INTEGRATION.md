# RSS Feed Integration for Music News

This guide explains how to integrate RSS feeds from major music publications to populate the News feed.

## 🎯 Overview

The RSS feed integration fetches real-time music news from popular publications and displays them in the News feed. This provides users with fresh, relevant content from trusted sources.

## 📰 Supported News Sources

The system currently supports RSS feeds from:

- **Billboard** - Music industry news and charts
- **Pitchfork** - Music reviews and culture
- **Rolling Stone** - Music and entertainment news
- **NME** - Music news and reviews
- **Stereogum** - Indie music and culture
- **Consequence** - Music and entertainment

## 🏗️ Architecture

### Components

1. **RSS Feed Service** (`lib/services/rss-feed.service.ts`)
   - Handles RSS feed fetching and parsing
   - Uses CORS proxy to avoid browser restrictions
   - Cleans and normalizes data

2. **API Endpoint** (`app/api/feed/rss-news/route.ts`)
   - Server-side RSS feed processing
   - Caching with Supabase
   - Error handling and rate limiting

3. **Custom Hook** (`hooks/use-rss-news.ts`)
   - React hook for managing RSS news state
   - Auto-refresh capabilities
   - Search and filtering functions

4. **News Component** (`components/feed/rss-news-item.tsx`)
   - Displays individual news items
   - External link handling
   - Share functionality

5. **Cache Table** (`migrations/0014_add_cache_table.sql`)
   - Stores RSS feed data to reduce API calls
   - 5-minute cache invalidation
   - Optimized for performance

## 🚀 Setup Instructions

### 1. Run Database Migration

Execute the cache table migration in your Supabase SQL Editor:

```sql
-- Run scripts/run-rss-migration-fixed.sql in Supabase SQL Editor
```

**Note**: If you encounter policy conflicts, use the fixed migration script that handles existing policies gracefully.

### 2. Environment Variables

Add the following to your `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, set this to your actual domain.

### 3. Update Image Domains

The `next.config.js` has been updated to allow images from RSS feed sources. No additional configuration needed.

## 🔧 Configuration

### Adding New RSS Feeds

To add a new RSS feed source, edit `app/api/feed/rss-news/route.ts`:

```typescript
const musicRSSFeeds = [
  // ... existing feeds
  {
    name: 'New Source',
    url: 'https://newsource.com/feed',
    category: 'music-news'
  }
]
```

### Customizing Cache Duration

Modify the cache duration in `app/api/feed/rss-news/route.ts`:

```typescript
// Change from 5 minutes to your preferred duration
if (cachedData && (Date.now() - new Date(cachedData.updated_at).getTime()) < 10 * 60 * 1000) {
  // 10 minutes cache
}
```

### Filtering by Category

The system supports category-based filtering:

```typescript
// Available categories
- 'music-industry'
- 'music-culture' 
- 'music-news'
- 'indie-music'
```

## 📊 API Endpoints

### GET `/api/feed/rss-news`

Fetches RSS news with optional filtering.

**Query Parameters:**
- `limit` (number): Number of articles to return (default: 20)
- `category` (string): Filter by category
- `source` (string): Filter by specific source

**Example:**
```bash
GET /api/feed/rss-news?limit=10&category=music-industry
```

**Response:**
```json
{
  "success": true,
  "news": [
    {
      "id": "unique-id",
      "title": "Article Title",
      "description": "Article description...",
      "link": "https://source.com/article",
      "pubDate": "2024-01-15T10:00:00Z",
      "author": "Author Name",
      "category": "music-industry",
      "image": "https://source.com/image.jpg",
      "source": "Billboard"
    }
  ],
  "total": 50,
  "sources": ["Billboard", "Pitchfork", "Rolling Stone"]
}
```

## 🎨 Usage Examples

### Using the RSS News Hook

```typescript
import { useRSSNews } from '@/hooks/use-rss-news'

function NewsComponent() {
  const { 
    news, 
    loading, 
    error, 
    refreshNews,
    searchNews 
  } = useRSSNews({
    limit: 20,
    category: 'music-industry',
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  })

  if (loading) return <div>Loading news...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {news.map(item => (
        <RSSNewsItem key={item.id} item={item} />
      ))}
    </div>
  )
}
```

### Displaying News Items

```typescript
import { RSSNewsItem } from '@/components/feed/rss-news-item'

function NewsList({ news }) {
  return (
    <div>
      {news.map((item, index) => (
        <RSSNewsItem
          key={item.id}
          item={item}
          index={index}
          onBookmark={(id) => handleBookmark(id)}
          isBookmarked={bookmarkedItems.has(item.id)}
        />
      ))}
    </div>
  )
}
```

## 🔍 Features

### Automatic Integration
- RSS news automatically appears in the News feed
- Mixed with local platform content
- Sorted by relevance and recency

### Smart Caching
- 5-minute cache to reduce API calls
- Automatic cache invalidation
- Fallback to fresh data if cache fails

### External Link Handling
- Opens articles in new tabs
- Proper security with `noopener,noreferrer`
- Share functionality with native sharing API

### Responsive Design
- Mobile-optimized layout
- Source-specific color coding
- Loading states and error handling

### Search and Filtering
- Search within news content
- Filter by source or category
- Real-time search results

## 🛠️ Troubleshooting

### Common Issues

1. **Policy Conflicts During Migration**
   - **Error**: `policy "Allow authenticated users to read cache" for table "cache" already exists`
   - **Solution**: Use `scripts/run-rss-migration-fixed.sql` instead
   - **Fix**: The fixed script drops existing policies before creating new ones

2. **CORS Errors**
   - The system uses a CORS proxy (`api.allorigins.win`)
   - If issues persist, consider using a different proxy service

3. **Cache Not Updating**
   - Check cache table permissions in Supabase
   - Verify RLS policies are correctly set
   - Run verification script: `scripts/verify-rss-setup.sql`

4. **Images Not Loading**
   - Ensure image domains are added to `next.config.js`
   - Check if RSS feed includes proper image URLs

5. **Rate Limiting**
   - RSS feeds may have rate limits
   - Cache helps reduce API calls
   - Consider implementing exponential backoff

### Testing Your Setup

1. **Run the verification script:**
   ```sql
   -- Execute scripts/verify-rss-setup.sql in Supabase SQL Editor
   ```

2. **Test the API endpoint:**
   ```bash
   curl http://localhost:3000/api/test-rss
   ```

3. **Check the News feed:**
   - Navigate to `/feed`
   - Click the "News" tab
   - Look for RSS content mixed with local posts

### Debug Mode

Enable debug logging by adding to your API route:

```typescript
console.log('RSS Debug:', { feedUrl, response: data })
```

## 🔮 Future Enhancements

### Planned Features
- User preference-based filtering
- RSS feed subscription management
- Content recommendation based on reading history
- Offline caching with service workers
- Push notifications for breaking news

### Customization Options
- User-defined RSS feed sources
- Category-based preferences
- Reading time estimates
- Social sharing analytics

## 📝 Notes

- RSS feeds are fetched server-side to avoid CORS issues
- Content is cached for 5 minutes to improve performance
- External links open in new tabs for better UX
- All RSS content is properly attributed to original sources
- The system gracefully handles RSS feed failures

## 🤝 Contributing

To add new RSS feeds or improve the integration:

1. Add the feed to `musicRSSFeeds` array
2. Update image domains in `next.config.js`
3. Test with the new feed
4. Update documentation

For questions or issues, please refer to the main project documentation. 