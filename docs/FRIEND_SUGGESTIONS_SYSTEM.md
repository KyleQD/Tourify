# Friend Suggestions System

A comprehensive, scalable friend suggestion system for the Tourify platform with multiple algorithms, real-time updates, and intelligent relevance scoring.

## Overview

The Friend Suggestions System provides users with intelligent recommendations for new connections based on various algorithms and user behavior patterns. It's designed to be scalable, performant, and easy to extend.

## Architecture

### Core Components

1. **FriendSuggestionService** (`lib/services/friend-suggestions.ts`)
   - Central service handling all suggestion logic
   - Multiple algorithm implementations
   - Database optimization and caching

2. **API Endpoints**
   - `/api/social/suggestions` - Get friend suggestions
   - `/api/social/connection-request` - Send connection requests

3. **React Hook** (`hooks/use-friend-suggestions.ts`)
   - Easy-to-use hook for components
   - Real-time updates and state management
   - Error handling and loading states

4. **UI Components**
   - `EnhancedFriendSuggestions` - Full-featured suggestion component
   - `FriendSuggestionsDemo` - Example implementation

## Algorithms

### 1. Popular Users
- Suggests users with high follower counts
- Good for discovering influencers and popular accounts
- Configurable follower count ranges

### 2. Mutual Friends
- Suggests users who share mutual connections
- High relevance score for mutual connections
- Shows mutual friend avatars and counts

### 3. Recent Users
- Suggests newly joined users
- Time-based relevance scoring
- Good for welcoming new community members

### 4. Location-based
- Suggests users in the same geographic area
- Location matching with fuzzy search
- Fallback to popular users if no location matches

## Database Schema

### Tables

```sql
-- Follow requests table
CREATE TABLE follow_requests (
  id UUID PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id),
  target_id UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(requester_id, target_id)
);

-- Follows table (existing)
CREATE TABLE follows (
  id UUID PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id),
  following_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(follower_id, following_id)
);
```

### Indexes

- Optimized indexes for all query patterns
- Composite indexes for complex queries
- Performance monitoring and optimization

## Usage

### Basic Usage

```tsx
import { EnhancedFriendSuggestions } from "@/components/social/enhanced-friend-suggestions"

function MyComponent() {
  return (
    <EnhancedFriendSuggestions
      limit={5}
      algorithm="popular"
      showAlgorithmSelector={true}
      showMutualFriends={true}
      onConnect={(userId) => {
        console.log('Connected to:', userId)
      }}
    />
  )
}
```

### Using the Hook

```tsx
import { useFriendSuggestions } from "@/hooks/use-friend-suggestions"

function CustomComponent() {
  const {
    suggestions,
    loading,
    error,
    sendConnectionRequest,
    refetch
  } = useFriendSuggestions(userId, {
    limit: 10,
    algorithm: 'mutual',
    include_mutual_friends: true
  })

  // Use the data...
}
```

### API Usage

```typescript
// Get suggestions
const response = await fetch('/api/social/suggestions?algorithm=mutual&limit=10')
const data = await response.json()

// Send connection request
const response = await fetch('/api/social/connection-request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ target_user_id: 'user-id' })
})
```

## Configuration

### Algorithm Parameters

```typescript
interface FriendSuggestionParams {
  limit?: number                    // Number of suggestions (default: 10, max: 50)
  offset?: number                   // Pagination offset
  exclude_user_ids?: string[]       // Users to exclude
  include_mutual_friends?: boolean  // Include mutual friend data
  algorithm?: 'popular' | 'mutual' | 'recent' | 'location'
  location?: string                 // Location filter
  min_followers?: number           // Minimum follower count
  max_followers?: number           // Maximum follower count
}
```

### Component Props

```typescript
interface EnhancedFriendSuggestionsProps {
  limit?: number
  algorithm?: 'popular' | 'mutual' | 'recent' | 'location'
  showAlgorithmSelector?: boolean
  showMutualFriends?: boolean
  className?: string
  onConnect?: (userId: string) => void
}
```

## Performance Optimizations

### Database Optimizations
- Efficient indexes for all query patterns
- Optimized JOIN operations
- Pagination support
- Connection pooling

### Caching Strategy
- Service-level caching for expensive queries
- React Query integration ready
- Configurable cache TTL

### Query Optimization
- Single-query mutual friend detection
- Batch operations for multiple users
- Lazy loading for large datasets

## Error Handling

### Graceful Degradation
- Fallback algorithms when primary fails
- Retry mechanisms with exponential backoff
- User-friendly error messages

### Error Types
- Authentication errors
- Database connection errors
- Rate limiting errors
- Validation errors

## Security

### Row Level Security (RLS)
- Users can only see their own requests
- Protected against unauthorized access
- Audit logging for sensitive operations

### Input Validation
- Sanitized user inputs
- Type checking with TypeScript
- SQL injection prevention

## Monitoring & Analytics

### Metrics Tracked
- Suggestion click-through rates
- Connection request success rates
- Algorithm performance
- User engagement patterns

### Logging
- Structured logging for debugging
- Performance metrics
- Error tracking and alerting

## Extensibility

### Adding New Algorithms

1. Implement algorithm in `FriendSuggestionService`
2. Add to algorithm enum in types
3. Update UI components
4. Add tests

### Custom Scoring

```typescript
// Override relevance scoring
private calculateRelevanceScores(suggestions: FriendSuggestion[]): FriendSuggestion[] {
  return suggestions.map(suggestion => ({
    ...suggestion,
    relevance_score: customScoringLogic(suggestion)
  }))
}
```

## Testing

### Unit Tests
- Service layer testing
- Hook testing with React Testing Library
- Component testing

### Integration Tests
- API endpoint testing
- Database integration tests
- End-to-end user flows

### Performance Tests
- Load testing with large datasets
- Memory usage profiling
- Query performance analysis

## Migration Guide

### From Old System

1. **Update imports**:
   ```typescript
   // Old
   import { SuggestedConnections } from "@/components/social/suggested-connections"
   
   // New
   import { EnhancedFriendSuggestions } from "@/components/social/enhanced-friend-suggestions"
   ```

2. **Update props**:
   ```typescript
   // Old
   <SuggestedConnections limit={5} excludeUserIds={[]} />
   
   // New
   <EnhancedFriendSuggestions 
     limit={5} 
     algorithm="popular"
     showAlgorithmSelector={true}
   />
   ```

3. **Run database migration**:
   ```bash
   # Apply the migration
   supabase db push
   ```

## Troubleshooting

### Common Issues

1. **No suggestions appearing**
   - Check if user has connections
   - Verify database has user data
   - Check algorithm parameters

2. **Connection requests failing**
   - Verify follow_requests table exists
   - Check RLS policies
   - Validate user authentication

3. **Performance issues**
   - Check database indexes
   - Monitor query performance
   - Consider caching strategies

### Debug Mode

Enable debug logging:
```typescript
// In development
localStorage.setItem('debug', 'friend-suggestions:*')
```

## Future Enhancements

### Planned Features
- Machine learning-based suggestions
- Interest-based matching
- Event-based suggestions
- Social graph analysis
- A/B testing framework

### Performance Improvements
- Redis caching layer
- GraphQL API
- Real-time updates with WebSockets
- Advanced pagination strategies

## Contributing

### Development Setup
1. Install dependencies
2. Set up Supabase connection
3. Run database migrations
4. Start development server

### Code Style
- Follow TypeScript best practices
- Use functional programming patterns
- Write comprehensive tests
- Document public APIs

### Pull Request Process
1. Create feature branch
2. Write tests
3. Update documentation
4. Submit PR with description

## Support

For issues and questions:
- Check troubleshooting guide
- Review API documentation
- Open GitHub issue
- Contact development team

