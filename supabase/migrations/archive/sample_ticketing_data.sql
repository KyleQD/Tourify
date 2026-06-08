-- Sample Ticketing Data
-- This script adds sample events, ticket types, and sales for testing

-- Insert sample events (using correct column names)
INSERT INTO events (id, name, description, venue_name, event_date, event_time, status, capacity, ticket_price, created_at, updated_at)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Summer Music Festival 2024',
    'A three-day celebration of music featuring top artists from around the world',
    'Central Park',
    '2024-07-15',
    '18:00:00',
    'confirmed',
    5000,
    75.00,
    NOW(),
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'Jazz Night at The Blue Note',
    'An intimate evening of jazz featuring local and international artists',
    'The Blue Note Jazz Club',
    '2024-06-20',
    '20:00:00',
    'confirmed',
    200,
    45.00,
    NOW(),
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'Rock Concert at Madison Square Garden',
    'Epic rock concert featuring multiple bands',
    'Madison Square Garden',
    '2024-08-10',
    '19:30:00',
    'confirmed',
    20000,
    120.00,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample ticket types
INSERT INTO ticket_types (id, event_id, name, description, price, quantity_available, quantity_sold, max_per_customer, sale_start, sale_end, is_active, created_at, updated_at)
VALUES 
  (
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'General Admission',
    'General admission to the festival grounds',
    75.00,
    3000,
    0,
    10,
    NOW(),
    '2024-07-14 23:59:59',
    TRUE,
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'VIP Pass',
    'VIP access with premium viewing area and exclusive amenities',
    150.00,
    500,
    0,
    4,
    NOW(),
    '2024-07-14 23:59:59',
    TRUE,
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440002',
    'Standard Seating',
    'Standard seating in the main area',
    45.00,
    150,
    0,
    6,
    NOW(),
    '2024-06-19 23:59:59',
    TRUE,
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440002',
    'Premium Seating',
    'Premium seating with table service',
    85.00,
    50,
    0,
    4,
    NOW(),
    '2024-06-19 23:59:59',
    TRUE,
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440003',
    'Floor Seating',
    'Floor seating close to the stage',
    120.00,
    5000,
    0,
    8,
    NOW(),
    '2024-08-09 23:59:59',
    TRUE,
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440003',
    'Upper Level',
    'Upper level seating with great views',
    80.00,
    15000,
    0,
    10,
    NOW(),
    '2024-08-09 23:59:59',
    TRUE,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample ticket sales
INSERT INTO ticket_sales (id, ticket_type_id, event_id, customer_email, customer_name, customer_phone, quantity, total_amount, fees, payment_status, payment_method, transaction_id, order_number, purchase_date, created_at, updated_at)
VALUES 
  (
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'john.doe@example.com',
    'John Doe',
    '+1-555-0101',
    2,
    150.00,
    4.50,
    'paid',
    'stripe',
    'pi_1234567890',
    'TKT20240127001',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'jane.smith@example.com',
    'Jane Smith',
    '+1-555-0102',
    1,
    150.00,
    4.50,
    'paid',
    'stripe',
    'pi_1234567891',
    'TKT20240127002',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440002',
    'mike.johnson@example.com',
    'Mike Johnson',
    '+1-555-0103',
    3,
    135.00,
    4.05,
    'paid',
    'stripe',
    'pi_1234567892',
    'TKT20240127003',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  ),
  (
    '770e8400-e29b-41d4-a716-446655440004',
    '660e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440003',
    'sarah.wilson@example.com',
    'Sarah Wilson',
    '+1-555-0104',
    2,
    240.00,
    7.20,
    'pending',
    'stripe',
    NULL,
    'TKT20240127004',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '770e8400-e29b-41d4-a716-446655440005',
    '660e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440003',
    'david.brown@example.com',
    'David Brown',
    '+1-555-0105',
    4,
    320.00,
    9.60,
    'paid',
    'stripe',
    'pi_1234567893',
    'TKT20240127005',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Log completion
SELECT 'Sample ticketing data inserted successfully!' as status; 