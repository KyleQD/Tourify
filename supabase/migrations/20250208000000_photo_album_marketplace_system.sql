-- =============================================================================
-- COMPREHENSIVE PHOTO ALBUM & MARKETPLACE SYSTEM
-- =============================================================================
-- This migration creates a complete photo album system with:
-- - Tiered uploads based on account type
-- - Photo albums with user and event tagging
-- - Photographer marketplace for selling photos
-- - Watermarking and preview system
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PHOTO ALBUMS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS photo_albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Owner information
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('general', 'artist', 'venue', 'organizer', 'photographer')),
  
  -- Album details
  title TEXT NOT NULL,
  description TEXT,
  cover_photo_id UUID, -- References photos table (set later)
  
  -- Organization
  category TEXT CHECK (category IN ('performance', 'studio', 'portrait', 'event', 'behind_scenes', 'tour', 'promotional', 'other')),
  tags TEXT[] DEFAULT '{}',
  
  -- Visibility & Privacy
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Event association (optional)
  event_id UUID, -- Can be null if not associated with an event
  
  -- Stats
  photo_count INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PHOTOS TABLE (Enhanced)
-- =============================================================================

CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Owner information
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('general', 'artist', 'venue', 'organizer', 'photographer')),
  
  -- Photo details
  title TEXT,
  description TEXT,
  alt_text TEXT,
  
  -- File URLs (tiered storage)
  full_res_url TEXT NOT NULL, -- Full resolution (only accessible if owned or purchased)
  preview_url TEXT NOT NULL, -- Compressed/watermarked preview
  thumbnail_url TEXT NOT NULL, -- Small thumbnail
  
  -- File metadata
  file_size BIGINT NOT NULL,
  full_res_size BIGINT, -- Original file size before compression
  dimensions JSONB NOT NULL, -- {"width": 4000, "height": 3000}
  file_format TEXT, -- jpg, png, webp, etc.
  
  -- Photo metadata
  category TEXT CHECK (category IN ('performance', 'studio', 'portrait', 'event', 'behind_scenes', 'tour', 'promotional', 'other')),
  location TEXT,
  photographer_name TEXT,
  camera_info JSONB, -- {"make": "Canon", "model": "EOS R5", "lens": "RF 24-70mm"}
  exif_data JSONB, -- Full EXIF data
  shot_date DATE,
  
  -- Marketplace features (for photographer accounts)
  is_for_sale BOOLEAN DEFAULT false,
  sale_price DECIMAL(10,2),
  license_type TEXT CHECK (license_type IN ('personal', 'commercial', 'editorial', 'exclusive')),
  usage_rights TEXT, -- Description of what buyer can do
  
  -- Watermark info
  has_watermark BOOLEAN DEFAULT false,
  watermark_text TEXT,
  watermark_position TEXT CHECK (watermark_position IN ('center', 'bottom-right', 'bottom-left', 'top-right', 'top-left')),
  
  -- Stats
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  
  -- Visibility
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Event association (optional)
  event_id UUID,
  
  -- Order in album
  order_index INTEGER DEFAULT 0,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for cover_photo_id (must be done after photos table is created)
ALTER TABLE photo_albums 
ADD CONSTRAINT fk_photo_albums_cover_photo 
FOREIGN KEY (cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL;

-- =============================================================================
-- PHOTO TAGS TABLE (User & Event Tags)
-- =============================================================================

CREATE TABLE IF NOT EXISTS photo_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  
  -- Tag type
  tag_type TEXT NOT NULL CHECK (tag_type IN ('user', 'event', 'location', 'keyword')),
  
  -- Tagged entity (can be user, event, or text)
  tagged_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- If tagging a user
  tagged_event_id UUID, -- If tagging an event
  tag_text TEXT, -- For keyword or location tags
  
  -- Tag position (for face tagging, etc.)
  position_x DECIMAL(5,2), -- Percentage from left (0-100)
  position_y DECIMAL(5,2), -- Percentage from top (0-100)
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure at least one tag target is set
  CONSTRAINT check_tag_target CHECK (
    (tagged_user_id IS NOT NULL) OR 
    (tagged_event_id IS NOT NULL) OR 
    (tag_text IS NOT NULL)
  )
);

-- =============================================================================
-- PHOTO PURCHASES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS photo_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Purchase details
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  buyer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Payment details
  purchase_price DECIMAL(10,2) NOT NULL,
  license_type TEXT NOT NULL CHECK (license_type IN ('personal', 'commercial', 'editorial', 'exclusive')),
  platform_fee DECIMAL(10,2) DEFAULT 0, -- Tourify's fee
  seller_payout DECIMAL(10,2) NOT NULL, -- Amount seller receives
  
  -- Payment processing
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_method TEXT DEFAULT 'stripe',
  transaction_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Purchase fulfillment
  download_url TEXT, -- Secure, time-limited download URL for full-res photo
  download_expires_at TIMESTAMPTZ, -- URL expiration
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 3, -- Allow re-download a few times
  
  -- License details
  license_agreement TEXT, -- Full license text
  license_start_date TIMESTAMPTZ DEFAULT NOW(),
  license_end_date TIMESTAMPTZ, -- NULL for perpetual licenses
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_purchase_price CHECK (purchase_price > 0),
  CONSTRAINT valid_seller_payout CHECK (seller_payout <= purchase_price)
);

-- =============================================================================
-- PHOTO LIKES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS photo_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one like per user per photo
  UNIQUE(photo_id, user_id)
);

-- =============================================================================
-- ALBUM LIKES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS album_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one like per user per album
  UNIQUE(album_id, user_id)
);

-- =============================================================================
-- PHOTO COMMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS photo_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  comment_text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES photo_comments(id) ON DELETE CASCADE, -- For nested replies
  
  -- Stats
  likes INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Photo albums indexes
CREATE INDEX IF NOT EXISTS idx_photo_albums_user ON photo_albums(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_albums_type ON photo_albums(account_type);
CREATE INDEX IF NOT EXISTS idx_photo_albums_event ON photo_albums(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photo_albums_public ON photo_albums(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_photo_albums_featured ON photo_albums(is_featured) WHERE is_featured = true;

-- Photos indexes
CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_type ON photos(account_type);
CREATE INDEX IF NOT EXISTS idx_photos_event ON photos(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_sale ON photos(is_for_sale) WHERE is_for_sale = true;
CREATE INDEX IF NOT EXISTS idx_photos_public ON photos(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_photos_order ON photos(album_id, order_index);

-- Photo tags indexes
CREATE INDEX IF NOT EXISTS idx_photo_tags_photo ON photo_tags(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_user ON photo_tags(tagged_user_id) WHERE tagged_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photo_tags_event ON photo_tags(tagged_event_id) WHERE tagged_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photo_tags_type ON photo_tags(tag_type);

-- Photo purchases indexes
CREATE INDEX IF NOT EXISTS idx_photo_purchases_photo ON photo_purchases(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_purchases_buyer ON photo_purchases(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_photo_purchases_seller ON photo_purchases(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_photo_purchases_status ON photo_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_photo_purchases_transaction ON photo_purchases(transaction_id);

-- Photo likes indexes
CREATE INDEX IF NOT EXISTS idx_photo_likes_photo ON photo_likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_user ON photo_likes(user_id);

-- Album likes indexes
CREATE INDEX IF NOT EXISTS idx_album_likes_album ON album_likes(album_id);
CREATE INDEX IF NOT EXISTS idx_album_likes_user ON album_likes(user_id);

-- Photo comments indexes
CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON photo_comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_user ON photo_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_parent ON photo_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

-- Photo Albums Policies
CREATE POLICY "Public albums are viewable by everyone"
  ON photo_albums FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own albums"
  ON photo_albums FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own albums"
  ON photo_albums FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own albums"
  ON photo_albums FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own albums"
  ON photo_albums FOR DELETE
  USING (auth.uid() = user_id);

-- Photos Policies
CREATE POLICY "Public photos are viewable by everyone"
  ON photos FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own photos"
  ON photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Buyers can view photos they purchased"
  ON photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM photo_purchases
      WHERE photo_purchases.photo_id = photos.id
      AND photo_purchases.buyer_user_id = auth.uid()
      AND photo_purchases.payment_status = 'completed'
    )
  );

CREATE POLICY "Users can create their own photos"
  ON photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos"
  ON photos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
  ON photos FOR DELETE
  USING (auth.uid() = user_id);

-- Photo Tags Policies
CREATE POLICY "Tags are viewable if photo is viewable"
  ON photo_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM photos
      WHERE photos.id = photo_tags.photo_id
      AND (photos.is_public = true OR photos.user_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create tags"
  ON photo_tags FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete tags they created"
  ON photo_tags FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "Photo owners can delete any tags on their photos"
  ON photo_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM photos
      WHERE photos.id = photo_tags.photo_id
      AND photos.user_id = auth.uid()
    )
  );

-- Photo Purchases Policies
CREATE POLICY "Users can view their purchases"
  ON photo_purchases FOR SELECT
  USING (auth.uid() = buyer_user_id);

CREATE POLICY "Sellers can view sales of their photos"
  ON photo_purchases FOR SELECT
  USING (auth.uid() = seller_user_id);

CREATE POLICY "Users can create purchases"
  ON photo_purchases FOR INSERT
  WITH CHECK (auth.uid() = buyer_user_id);

-- Photo Likes Policies
CREATE POLICY "Anyone can view photo likes"
  ON photo_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like photos"
  ON photo_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike photos they liked"
  ON photo_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Album Likes Policies
CREATE POLICY "Anyone can view album likes"
  ON album_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like albums"
  ON album_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike albums they liked"
  ON album_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Photo Comments Policies
CREATE POLICY "Comments are viewable if photo is viewable"
  ON photo_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM photos
      WHERE photos.id = photo_comments.photo_id
      AND (photos.is_public = true OR photos.user_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can comment on photos"
  ON photo_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON photo_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON photo_comments FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGERS FOR AUTO-UPDATING STATS
-- =============================================================================

-- Function to update photo count in album
CREATE OR REPLACE FUNCTION update_album_photo_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photo_albums
    SET photo_count = photo_count + 1,
        updated_at = NOW()
    WHERE id = NEW.album_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photo_albums
    SET photo_count = GREATEST(photo_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.album_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_album_photo_count
AFTER INSERT OR DELETE ON photos
FOR EACH ROW
EXECUTE FUNCTION update_album_photo_count();

-- Function to update photo likes count
CREATE OR REPLACE FUNCTION update_photo_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photos
    SET likes = likes + 1
    WHERE id = NEW.photo_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photos
    SET likes = GREATEST(likes - 1, 0)
    WHERE id = OLD.photo_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_photo_likes_count
AFTER INSERT OR DELETE ON photo_likes
FOR EACH ROW
EXECUTE FUNCTION update_photo_likes_count();

-- Function to update album likes count
CREATE OR REPLACE FUNCTION update_album_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photo_albums
    SET total_likes = total_likes + 1
    WHERE id = NEW.album_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photo_albums
    SET total_likes = GREATEST(total_likes - 1, 0)
    WHERE id = OLD.album_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_album_likes_count
AFTER INSERT OR DELETE ON album_likes
FOR EACH ROW
EXECUTE FUNCTION update_album_likes_count();

-- Function to update purchase count
CREATE OR REPLACE FUNCTION update_photo_purchases_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.payment_status = 'completed' THEN
    UPDATE photos
    SET purchases = purchases + 1
    WHERE id = NEW.photo_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.payment_status != 'completed' AND NEW.payment_status = 'completed' THEN
    UPDATE photos
    SET purchases = purchases + 1
    WHERE id = NEW.photo_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_photo_purchases_count
AFTER INSERT OR UPDATE ON photo_purchases
FOR EACH ROW
EXECUTE FUNCTION update_photo_purchases_count();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get user's photos by album
CREATE OR REPLACE FUNCTION get_album_photos(album_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  preview_url TEXT,
  thumbnail_url TEXT,
  dimensions JSONB,
  likes INTEGER,
  views INTEGER,
  is_for_sale BOOLEAN,
  sale_price DECIMAL,
  order_index INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.preview_url,
    p.thumbnail_url,
    p.dimensions,
    p.likes,
    p.views,
    p.is_for_sale,
    p.sale_price,
    p.order_index,
    p.created_at
  FROM photos p
  WHERE p.album_id = album_uuid
  AND (p.is_public = true OR p.user_id = auth.uid())
  ORDER BY p.order_index ASC, p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's purchased photos
CREATE OR REPLACE FUNCTION get_purchased_photos(user_uuid UUID)
RETURNS TABLE (
  photo_id UUID,
  title TEXT,
  full_res_url TEXT,
  download_url TEXT,
  download_expires_at TIMESTAMPTZ,
  download_count INTEGER,
  max_downloads INTEGER,
  license_type TEXT,
  purchased_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.full_res_url,
    pp.download_url,
    pp.download_expires_at,
    pp.download_count,
    pp.max_downloads,
    pp.license_type,
    pp.purchased_at
  FROM photos p
  INNER JOIN photo_purchases pp ON pp.photo_id = p.id
  WHERE pp.buyer_user_id = user_uuid
  AND pp.payment_status = 'completed'
  ORDER BY pp.purchased_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE photo_albums IS 'Stores photo albums with support for all account types';
COMMENT ON TABLE photos IS 'Stores photos with tiered storage (preview, full-res) and marketplace features';
COMMENT ON TABLE photo_tags IS 'Stores tags for photos including user tags, event tags, and keywords';
COMMENT ON TABLE photo_purchases IS 'Stores photo purchase transactions for photographer marketplace';
COMMENT ON TABLE photo_likes IS 'Stores user likes on photos';
COMMENT ON TABLE album_likes IS 'Stores user likes on albums';
COMMENT ON TABLE photo_comments IS 'Stores comments on photos';

-- =============================================================================
-- COMPLETE
-- =============================================================================

