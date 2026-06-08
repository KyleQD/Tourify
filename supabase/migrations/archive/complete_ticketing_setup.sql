-- =============================================================================
-- COMPLETE TICKETING SYSTEM SETUP
-- This script creates all necessary tables and functions
-- Copy and paste this ENTIRE script into your Supabase SQL Editor
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ticket_types table
CREATE TABLE IF NOT EXISTS ticket_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
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

-- Create ticket_sales table
CREATE TABLE IF NOT EXISTS ticket_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_type_id UUID NOT NULL,
  event_id UUID NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  quantity INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  fees DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT DEFAULT 'stripe',
  transaction_id TEXT,
  order_number TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE ticket_types 
ADD CONSTRAINT fk_ticket_types_event_id 
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE ticket_sales 
ADD CONSTRAINT fk_ticket_sales_ticket_type_id 
FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE CASCADE;

ALTER TABLE ticket_sales 
ADD CONSTRAINT fk_ticket_sales_event_id 
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id ON ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_types_is_active ON ticket_types(is_active);
CREATE INDEX IF NOT EXISTS idx_ticket_sales_ticket_type_id ON ticket_sales(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_ticket_sales_event_id ON ticket_sales(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_sales_customer_email ON ticket_sales(customer_email);
CREATE INDEX IF NOT EXISTS idx_ticket_sales_payment_status ON ticket_sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_ticket_sales_order_number ON ticket_sales(order_number);

-- Create function to update ticket sales count
CREATE OR REPLACE FUNCTION update_ticket_sales_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ticket_types 
    SET quantity_sold = quantity_sold + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.ticket_type_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE ticket_types 
    SET quantity_sold = quantity_sold - OLD.quantity + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.ticket_type_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ticket_types 
    SET quantity_sold = quantity_sold - OLD.quantity,
        updated_at = NOW()
    WHERE id = OLD.ticket_type_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_ticket_sales_count_trigger ON ticket_sales;
CREATE TRIGGER update_ticket_sales_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ticket_sales
  FOR EACH ROW EXECUTE FUNCTION update_ticket_sales_count();

-- Enable RLS
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Admins can manage all tickets" ON ticket_types;
CREATE POLICY "Admins can manage all tickets" ON ticket_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage all sales" ON ticket_sales;
CREATE POLICY "Admins can manage all sales" ON ticket_sales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Success message
SELECT 'Ticketing system tables created successfully!' as status; 