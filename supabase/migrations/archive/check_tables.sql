-- =============================================================================
-- TICKETING SYSTEM SETUP
-- This script creates the essential tables for the ticketing system
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TICKETING SYSTEM TABLES
-- =============================================================================

-- Ticket types/categories
CREATE TABLE IF NOT EXISTS ticket_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  quantity_available INTEGER NOT NULL,
  quantity_sold INTEGER DEFAULT 0,
  max_per_customer INTEGER DEFAULT NULL,
  sale_start TIMESTAMPTZ,
  sale_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket sales tracking
CREATE TABLE IF NOT EXISTS ticket_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  quantity INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  fees DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_method TEXT,
  transaction_id TEXT,
  order_number TEXT UNIQUE NOT NULL,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Ticketing indexes
CREATE INDEX IF NOT EXISTS idx_ticket_sales_event ON ticket_sales(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_sales_date ON ticket_sales(purchase_date);
CREATE INDEX IF NOT EXISTS idx_ticket_sales_status ON ticket_sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_ticket_types_event ON ticket_types(event_id);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_ticket_types_updated_at BEFORE UPDATE ON ticket_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_sales_updated_at BEFORE UPDATE ON ticket_sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update ticket sales count
CREATE OR REPLACE FUNCTION update_ticket_sales_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ticket_types 
        SET quantity_sold = quantity_sold + NEW.quantity
        WHERE id = NEW.ticket_type_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND OLD.quantity != NEW.quantity THEN
        UPDATE ticket_types 
        SET quantity_sold = quantity_sold + (NEW.quantity - OLD.quantity)
        WHERE id = NEW.ticket_type_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ticket_types 
        SET quantity_sold = quantity_sold - OLD.quantity
        WHERE id = OLD.ticket_type_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply ticket sales trigger
CREATE TRIGGER update_ticket_sales_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON ticket_sales
    FOR EACH ROW EXECUTE FUNCTION update_ticket_sales_count();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on ticketing tables
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_sales ENABLE ROW LEVEL SECURITY;

-- Admin access policies (admins can access everything)
CREATE POLICY "Admins can manage all tickets" ON ticket_types FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE)
);

CREATE POLICY "Admins can manage all sales" ON ticket_sales FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE)
);

-- Public read access for ticket types (for customers to view available tickets)
CREATE POLICY "Public can view active ticket types" ON ticket_types FOR SELECT USING (
    is_active = TRUE
);

-- Log completion
SELECT 'Ticketing system setup completed successfully!' as status; 