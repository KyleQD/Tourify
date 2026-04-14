-- =============================================================================
-- LOGISTICS DOMAIN TABLES (consolidated from backup migrations)
-- Covers: Lodging, Rentals (backline), and Travel Coordination
-- Idempotent: safe to run multiple times
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- LODGING TABLES
-- =============================================================================

-- 1. lodging_providers
CREATE TABLE IF NOT EXISTS lodging_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hotel','motel','resort','apartment','house','airbnb','hostel','camping')),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'USA',
  phone TEXT,
  email TEXT,
  website TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  amenities TEXT[] DEFAULT '{}',
  room_types TEXT[] DEFAULT '{}',
  max_capacity INTEGER,
  parking_available BOOLEAN DEFAULT FALSE,
  parking_spaces INTEGER,
  wifi_available BOOLEAN DEFAULT TRUE,
  breakfast_included BOOLEAN DEFAULT FALSE,
  pool_available BOOLEAN DEFAULT FALSE,
  gym_available BOOLEAN DEFAULT FALSE,
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'net_30',
  credit_limit DECIMAL(10,2) DEFAULT 0,
  preferred_vendor BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','suspended','blacklisted')),
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_bookings INTEGER DEFAULT 0,
  last_booking_date DATE,
  notes TEXT,
  special_requirements TEXT,
  cancellation_policy TEXT,
  check_in_time TIME DEFAULT '15:00:00',
  check_out_time TIME DEFAULT '11:00:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. lodging_room_types
CREATE TABLE IF NOT EXISTS lodging_room_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES lodging_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL,
  bed_configuration TEXT,
  amenities TEXT[] DEFAULT '{}',
  base_rate DECIMAL(10,2) NOT NULL,
  weekend_rate DECIMAL(10,2),
  holiday_rate DECIMAL(10,2),
  group_rate DECIMAL(10,2),
  min_stay INTEGER DEFAULT 1,
  max_stay INTEGER,
  available_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. lodging_bookings
CREATE TABLE IF NOT EXISTS lodging_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number TEXT UNIQUE NOT NULL,
  event_id UUID REFERENCES events_v2(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES lodging_providers(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES lodging_room_types(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  rooms_booked INTEGER DEFAULT 1,
  guests_per_room INTEGER DEFAULT 1,
  total_guests INTEGER NOT NULL,
  primary_guest_name TEXT NOT NULL,
  primary_guest_email TEXT,
  primary_guest_phone TEXT,
  special_requests TEXT,
  dietary_restrictions TEXT[] DEFAULT '{}',
  accessibility_needs TEXT[] DEFAULT '{}',
  rate_per_night DECIMAL(10,2) NOT NULL,
  total_nights INTEGER NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  fees DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','checked_in','checked_out','cancelled','no_show')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','partial','paid','refunded','overdue')),
  booking_source TEXT DEFAULT 'direct' CHECK (booking_source IN ('direct','travel_agent','online_travel_agent','corporate','group')),
  confirmation_number TEXT,
  cancellation_policy TEXT,
  cancellation_deadline DATE,
  assigned_by UUID,
  managed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT lodging_valid_dates CHECK (check_out_date > check_in_date),
  CONSTRAINT lodging_valid_guests CHECK (total_guests > 0),
  CONSTRAINT lodging_valid_amounts CHECK (total_amount >= 0 AND paid_amount >= 0)
);

-- 4. lodging_guest_assignments
CREATE TABLE IF NOT EXISTS lodging_guest_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES lodging_bookings(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  guest_type TEXT DEFAULT 'crew' CHECK (guest_type IN ('crew','artist','staff','vendor','guest','vip')),
  team_member_id UUID REFERENCES venue_team_members(id) ON DELETE SET NULL,
  room_number TEXT,
  bed_preference TEXT,
  roommate_preference TEXT,
  dietary_restrictions TEXT[] DEFAULT '{}',
  accessibility_needs TEXT[] DEFAULT '{}',
  special_requests TEXT,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned','confirmed','checked_in','checked_out','cancelled')),
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,
  check_in_notes TEXT,
  check_out_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. lodging_payments
CREATE TABLE IF NOT EXISTS lodging_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES lodging_bookings(id) ON DELETE CASCADE,
  payment_number TEXT UNIQUE NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit','partial','final','refund','cancellation_fee')),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','check','credit_card','bank_transfer','paypal','corporate_account')),
  transaction_id TEXT,
  payment_date TIMESTAMPTZ NOT NULL,
  processed_by UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT lodging_pay_valid_amount CHECK (amount > 0)
);

-- 6. lodging_calendar_events
CREATE TABLE IF NOT EXISTS lodging_calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES lodging_bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  calendar_type TEXT DEFAULT 'lodging' CHECK (calendar_type IN ('lodging','transportation','event','crew')),
  external_calendar_id TEXT,
  is_all_day BOOLEAN DEFAULT FALSE,
  reminder_minutes INTEGER[] DEFAULT '{1440}',
  notification_sent BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. lodging_availability
CREATE TABLE IF NOT EXISTS lodging_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES lodging_providers(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES lodging_room_types(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  rooms_available INTEGER NOT NULL,
  rooms_reserved INTEGER DEFAULT 0,
  rooms_blocked INTEGER DEFAULT 0,
  base_rate DECIMAL(10,2),
  special_rate DECIMAL(10,2),
  rate_notes TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  blocked_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT avail_valid_date_range CHECK (date_to >= date_from),
  CONSTRAINT avail_valid_room_counts CHECK (rooms_available >= 0 AND rooms_reserved >= 0 AND rooms_blocked >= 0),
  UNIQUE(provider_id, room_type_id, date_from)
);

-- =============================================================================
-- RENTAL TABLES
-- =============================================================================

-- 8. rental_clients
CREATE TABLE IF NOT EXISTS rental_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'USA',
  tax_id TEXT,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  payment_terms TEXT DEFAULT 'net_30',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. rental_agreements
CREATE TABLE IF NOT EXISTS rental_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES rental_clients(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events_v2(id) ON DELETE SET NULL,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pickup_date TIMESTAMPTZ,
  return_date TIMESTAMPTZ,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','confirmed','active','completed','cancelled','overdue')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','partial','paid','overdue')),
  terms_conditions TEXT,
  special_requirements TEXT,
  insurance_required BOOLEAN DEFAULT FALSE,
  insurance_amount DECIMAL(10,2),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  delivery_address TEXT,
  delivery_instructions TEXT,
  pickup_instructions TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT rental_valid_dates CHECK (end_date >= start_date),
  CONSTRAINT rental_valid_amounts CHECK (total_amount >= 0 AND paid_amount >= 0)
);

-- 10. rental_agreement_items
CREATE TABLE IF NOT EXISTS rental_agreement_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_agreement_id UUID NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES venue_equipment(id) ON DELETE SET NULL,
  item_name TEXT,
  item_description TEXT,
  quantity INTEGER DEFAULT 1,
  daily_rate DECIMAL(10,2) NOT NULL,
  total_days INTEGER NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  condition_out TEXT,
  condition_in TEXT,
  damage_notes TEXT,
  damage_photos TEXT[],
  status TEXT DEFAULT 'reserved' CHECK (status IN ('reserved','picked_up','returned','damaged','lost')),
  actual_pickup_date TIMESTAMPTZ,
  actual_return_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT rai_valid_quantities CHECK (quantity > 0),
  CONSTRAINT rai_valid_rates CHECK (daily_rate >= 0),
  CONSTRAINT rai_valid_days CHECK (total_days > 0),
  CONSTRAINT rai_valid_subtotal CHECK (subtotal >= 0)
);

-- 11. rental_payments
CREATE TABLE IF NOT EXISTS rental_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_agreement_id UUID NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
  payment_number TEXT UNIQUE NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit','partial','final','refund','damage_deposit')),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','check','credit_card','bank_transfer','paypal','other')),
  transaction_id TEXT,
  payment_date TIMESTAMPTZ NOT NULL,
  processed_by UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT rental_pay_valid_amount CHECK (amount > 0)
);

-- =============================================================================
-- TRAVEL COORDINATION TABLES
-- =============================================================================

-- 12. travel_groups
CREATE TABLE IF NOT EXISTS travel_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL CHECK (group_type IN ('crew','artists','staff','vendors','guests','vip','media','security','catering','technical','management')),
  department TEXT,
  priority_level INTEGER DEFAULT 3 CHECK (priority_level >= 1 AND priority_level <= 5),
  arrival_date DATE,
  departure_date DATE,
  arrival_location TEXT,
  departure_location TEXT,
  total_members INTEGER DEFAULT 0,
  confirmed_members INTEGER DEFAULT 0,
  group_leader_id UUID,
  backup_contact_id UUID,
  special_requirements TEXT[] DEFAULT '{}',
  dietary_restrictions TEXT[] DEFAULT '{}',
  accessibility_needs TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning','confirmed','in_transit','arrived','departed','cancelled')),
  coordination_status TEXT DEFAULT 'pending' CHECK (coordination_status IN ('pending','flights_booked','hotels_booked','transport_arranged','complete')),
  event_id UUID REFERENCES events_v2(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. travel_group_members
CREATE TABLE IF NOT EXISTS travel_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES travel_groups(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_email TEXT,
  member_phone TEXT,
  member_role TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team_member_id UUID REFERENCES venue_team_members(id) ON DELETE SET NULL,
  seat_preference TEXT,
  meal_preference TEXT,
  special_assistance BOOLEAN DEFAULT FALSE,
  wheelchair_required BOOLEAN DEFAULT FALSE,
  mobility_assistance BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','checked_in','in_transit','arrived','no_show','cancelled')),
  check_in_status TEXT DEFAULT 'pending' CHECK (check_in_status IN ('pending','confirmed','checked_in','late_check_in','no_show')),
  actual_arrival_time TIMESTAMPTZ,
  actual_departure_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, member_name, member_email)
);

-- 14. flight_coordination
CREATE TABLE IF NOT EXISTS flight_coordination (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_number TEXT NOT NULL,
  airline TEXT NOT NULL,
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_time TIMESTAMPTZ NOT NULL,
  aircraft_type TEXT,
  total_seats INTEGER,
  booked_seats INTEGER DEFAULT 0,
  available_seats INTEGER,
  group_id UUID REFERENCES travel_groups(id) ON DELETE SET NULL,
  is_group_flight BOOLEAN DEFAULT FALSE,
  booking_reference TEXT,
  ticket_class TEXT DEFAULT 'economy' CHECK (ticket_class IN ('economy','premium_economy','business','first')),
  fare_type TEXT DEFAULT 'standard' CHECK (fare_type IN ('standard','flexible','refundable','group')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','boarding','in_flight','landed','delayed','cancelled')),
  gate TEXT,
  terminal TEXT,
  ticket_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','partial','paid','refunded')),
  event_id UUID REFERENCES events_v2(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. flight_passenger_assignments
CREATE TABLE IF NOT EXISTS flight_passenger_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_id UUID NOT NULL REFERENCES flight_coordination(id) ON DELETE CASCADE,
  group_member_id UUID NOT NULL REFERENCES travel_group_members(id) ON DELETE CASCADE,
  seat_number TEXT,
  seat_class TEXT DEFAULT 'economy' CHECK (seat_class IN ('economy','premium_economy','business','first')),
  ticket_number TEXT,
  ticket_cost DECIMAL(10,2),
  ticket_status TEXT DEFAULT 'pending' CHECK (ticket_status IN ('pending','issued','checked_in','used','cancelled')),
  boarding_time TIMESTAMPTZ,
  boarding_group TEXT,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_time TIMESTAMPTZ,
  special_meal TEXT,
  special_assistance BOOLEAN DEFAULT FALSE,
  wheelchair_assistance BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','checked_in','boarded','no_show','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(flight_id, group_member_id)
);

-- 16. ground_transportation_coordination
CREATE TABLE IF NOT EXISTS ground_transportation_coordination (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transport_type TEXT NOT NULL CHECK (transport_type IN ('shuttle_bus','limo','van','car','train','subway','walking')),
  provider_name TEXT,
  vehicle_details JSONB DEFAULT '{}',
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  pickup_time TIMESTAMPTZ NOT NULL,
  estimated_dropoff_time TIMESTAMPTZ NOT NULL,
  actual_dropoff_time TIMESTAMPTZ,
  vehicle_capacity INTEGER,
  assigned_passengers INTEGER DEFAULT 0,
  group_id UUID REFERENCES travel_groups(id) ON DELETE SET NULL,
  driver_name TEXT,
  driver_phone TEXT,
  driver_license TEXT,
  vehicle_plate TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','en_route','arrived','completed','delayed','cancelled')),
  tracking_enabled BOOLEAN DEFAULT FALSE,
  current_location TEXT,
  cost_per_person DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','partial','paid','refunded')),
  event_id UUID REFERENCES events_v2(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  flight_id UUID REFERENCES flight_coordination(id) ON DELETE SET NULL,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. transportation_passenger_assignments
CREATE TABLE IF NOT EXISTS transportation_passenger_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transportation_id UUID NOT NULL REFERENCES ground_transportation_coordination(id) ON DELETE CASCADE,
  group_member_id UUID NOT NULL REFERENCES travel_group_members(id) ON DELETE CASCADE,
  pickup_instructions TEXT,
  dropoff_instructions TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','picked_up','in_transit','dropped_off','no_show','cancelled')),
  pickup_confirmed BOOLEAN DEFAULT FALSE,
  pickup_time TIMESTAMPTZ,
  dropoff_time TIMESTAMPTZ,
  special_assistance BOOLEAN DEFAULT FALSE,
  wheelchair_required BOOLEAN DEFAULT FALSE,
  luggage_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transportation_id, group_member_id)
);

-- 18. hotel_room_assignments
CREATE TABLE IF NOT EXISTS hotel_room_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lodging_booking_id UUID NOT NULL REFERENCES lodging_bookings(id) ON DELETE CASCADE,
  group_member_id UUID NOT NULL REFERENCES travel_group_members(id) ON DELETE CASCADE,
  room_number TEXT,
  room_type TEXT,
  bed_configuration TEXT,
  roommate_preference TEXT,
  floor_preference TEXT,
  accessibility_required BOOLEAN DEFAULT FALSE,
  check_in_status TEXT DEFAULT 'pending' CHECK (check_in_status IN ('pending','confirmed','checked_in','late_check_in','no_show')),
  check_out_status TEXT DEFAULT 'pending' CHECK (check_out_status IN ('pending','checked_out','late_check_out','extended')),
  actual_check_in_time TIMESTAMPTZ,
  actual_check_out_time TIMESTAMPTZ,
  dietary_restrictions TEXT[] DEFAULT '{}',
  accessibility_needs TEXT[] DEFAULT '{}',
  special_requests TEXT,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned','confirmed','checked_in','checked_out','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lodging_booking_id, group_member_id)
);

-- 19. travel_coordination_timeline
CREATE TABLE IF NOT EXISTS travel_coordination_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('flight','transport','hotel_checkin','hotel_checkout','meeting','meal','activity')),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  location TEXT,
  location_details TEXT,
  group_id UUID REFERENCES travel_groups(id) ON DELETE CASCADE,
  affected_members INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','delayed','cancelled')),
  event_id UUID REFERENCES events_v2(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Lodging providers
CREATE INDEX IF NOT EXISTS idx_lodging_providers_type ON lodging_providers(type);
CREATE INDEX IF NOT EXISTS idx_lodging_providers_city_state ON lodging_providers(city, state);
CREATE INDEX IF NOT EXISTS idx_lodging_providers_status ON lodging_providers(status);
CREATE INDEX IF NOT EXISTS idx_lodging_providers_rating ON lodging_providers(rating);
CREATE INDEX IF NOT EXISTS idx_lodging_providers_name_search ON lodging_providers USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lodging_providers_address_search ON lodging_providers USING gin(address gin_trgm_ops);

-- Lodging room types
CREATE INDEX IF NOT EXISTS idx_lodging_room_types_provider_id ON lodging_room_types(provider_id);
CREATE INDEX IF NOT EXISTS idx_lodging_room_types_capacity ON lodging_room_types(capacity);
CREATE INDEX IF NOT EXISTS idx_lodging_room_types_active ON lodging_room_types(is_active);

-- Lodging bookings
CREATE INDEX IF NOT EXISTS idx_lodging_bookings_event_id ON lodging_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_lodging_bookings_tour_id ON lodging_bookings(tour_id);
CREATE INDEX IF NOT EXISTS idx_lodging_bookings_provider_id ON lodging_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_lodging_bookings_dates ON lodging_bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_lodging_bookings_status ON lodging_bookings(status);
CREATE INDEX IF NOT EXISTS idx_lodging_bookings_payment_status ON lodging_bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_lodging_bookings_guest_name ON lodging_bookings USING gin(primary_guest_name gin_trgm_ops);

-- Lodging guest assignments
CREATE INDEX IF NOT EXISTS idx_lodging_guest_assignments_booking_id ON lodging_guest_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_lodging_guest_assignments_guest_type ON lodging_guest_assignments(guest_type);
CREATE INDEX IF NOT EXISTS idx_lodging_guest_assignments_status ON lodging_guest_assignments(status);

-- Lodging payments
CREATE INDEX IF NOT EXISTS idx_lodging_payments_booking_id ON lodging_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_lodging_payments_payment_date ON lodging_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_lodging_payments_status ON lodging_payments(status);

-- Lodging calendar events
CREATE INDEX IF NOT EXISTS idx_lodging_calendar_events_booking_id ON lodging_calendar_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_lodging_calendar_events_dates ON lodging_calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_lodging_calendar_events_calendar_type ON lodging_calendar_events(calendar_type);

-- Lodging availability
CREATE INDEX IF NOT EXISTS idx_lodging_availability_provider_room ON lodging_availability(provider_id, room_type_id);
CREATE INDEX IF NOT EXISTS idx_lodging_availability_dates ON lodging_availability(date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_lodging_availability_blocked ON lodging_availability(is_blocked);

-- Rental clients
CREATE INDEX IF NOT EXISTS idx_rental_clients_name_search ON rental_clients USING gin(name gin_trgm_ops);

-- Rental agreements
CREATE INDEX IF NOT EXISTS idx_rental_agreements_client_id ON rental_agreements(client_id);
CREATE INDEX IF NOT EXISTS idx_rental_agreements_status ON rental_agreements(status);
CREATE INDEX IF NOT EXISTS idx_rental_agreements_dates ON rental_agreements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_rental_agreements_payment_status ON rental_agreements(payment_status);

-- Rental agreement items
CREATE INDEX IF NOT EXISTS idx_rental_agreement_items_agreement_id ON rental_agreement_items(rental_agreement_id);
CREATE INDEX IF NOT EXISTS idx_rental_agreement_items_equipment_id ON rental_agreement_items(equipment_id);
CREATE INDEX IF NOT EXISTS idx_rental_agreement_items_status ON rental_agreement_items(status);

-- Rental payments
CREATE INDEX IF NOT EXISTS idx_rental_payments_agreement_id ON rental_payments(rental_agreement_id);
CREATE INDEX IF NOT EXISTS idx_rental_payments_date ON rental_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_rental_payments_status ON rental_payments(status);

-- Travel groups
CREATE INDEX IF NOT EXISTS idx_travel_groups_type ON travel_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_travel_groups_department ON travel_groups(department);
CREATE INDEX IF NOT EXISTS idx_travel_groups_status ON travel_groups(status);
CREATE INDEX IF NOT EXISTS idx_travel_groups_coordination_status ON travel_groups(coordination_status);
CREATE INDEX IF NOT EXISTS idx_travel_groups_dates ON travel_groups(arrival_date, departure_date);
CREATE INDEX IF NOT EXISTS idx_travel_groups_event_tour ON travel_groups(event_id, tour_id);
CREATE INDEX IF NOT EXISTS idx_travel_groups_name_search ON travel_groups USING gin(name gin_trgm_ops);

-- Travel group members
CREATE INDEX IF NOT EXISTS idx_travel_group_members_group_id ON travel_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_travel_group_members_status ON travel_group_members(status);
CREATE INDEX IF NOT EXISTS idx_travel_group_members_name_search ON travel_group_members USING gin(member_name gin_trgm_ops);

-- Flight coordination
CREATE INDEX IF NOT EXISTS idx_flight_coordination_group_id ON flight_coordination(group_id);
CREATE INDEX IF NOT EXISTS idx_flight_coordination_dates ON flight_coordination(departure_time, arrival_time);
CREATE INDEX IF NOT EXISTS idx_flight_coordination_status ON flight_coordination(status);
CREATE INDEX IF NOT EXISTS idx_flight_coordination_airports ON flight_coordination(departure_airport, arrival_airport);
CREATE INDEX IF NOT EXISTS idx_flight_coordination_event_tour ON flight_coordination(event_id, tour_id);

-- Flight passenger assignments
CREATE INDEX IF NOT EXISTS idx_flight_passenger_flight_id ON flight_passenger_assignments(flight_id);
CREATE INDEX IF NOT EXISTS idx_flight_passenger_member_id ON flight_passenger_assignments(group_member_id);
CREATE INDEX IF NOT EXISTS idx_flight_passenger_status ON flight_passenger_assignments(status);

-- Ground transportation
CREATE INDEX IF NOT EXISTS idx_ground_transport_group_id ON ground_transportation_coordination(group_id);
CREATE INDEX IF NOT EXISTS idx_ground_transport_dates ON ground_transportation_coordination(pickup_time, estimated_dropoff_time);
CREATE INDEX IF NOT EXISTS idx_ground_transport_status ON ground_transportation_coordination(status);
CREATE INDEX IF NOT EXISTS idx_ground_transport_type ON ground_transportation_coordination(transport_type);
CREATE INDEX IF NOT EXISTS idx_ground_transport_event_tour ON ground_transportation_coordination(event_id, tour_id);

-- Transportation passenger assignments
CREATE INDEX IF NOT EXISTS idx_transport_passenger_transport_id ON transportation_passenger_assignments(transportation_id);
CREATE INDEX IF NOT EXISTS idx_transport_passenger_member_id ON transportation_passenger_assignments(group_member_id);
CREATE INDEX IF NOT EXISTS idx_transport_passenger_status ON transportation_passenger_assignments(status);

-- Hotel room assignments
CREATE INDEX IF NOT EXISTS idx_hotel_room_assign_booking_id ON hotel_room_assignments(lodging_booking_id);
CREATE INDEX IF NOT EXISTS idx_hotel_room_assign_member_id ON hotel_room_assignments(group_member_id);
CREATE INDEX IF NOT EXISTS idx_hotel_room_assign_status ON hotel_room_assignments(status);
CREATE INDEX IF NOT EXISTS idx_hotel_room_assign_checkin ON hotel_room_assignments(check_in_status);

-- Travel coordination timeline
CREATE INDEX IF NOT EXISTS idx_travel_timeline_dates ON travel_coordination_timeline(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_travel_timeline_type ON travel_coordination_timeline(entry_type);
CREATE INDEX IF NOT EXISTS idx_travel_timeline_group_id ON travel_coordination_timeline(group_id);
CREATE INDEX IF NOT EXISTS idx_travel_timeline_status ON travel_coordination_timeline(status);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE lodging_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lodging_room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE lodging_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lodging_guest_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lodging_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lodging_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lodging_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_agreement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_coordination ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_passenger_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ground_transportation_coordination ENABLE ROW LEVEL SECURITY;
ALTER TABLE transportation_passenger_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_coordination_timeline ENABLE ROW LEVEL SECURITY;

-- Idempotent policy creation via DO blocks
DO $$ BEGIN
  -- Lodging providers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_providers' AND policyname='lodging_providers_select') THEN
    CREATE POLICY lodging_providers_select ON lodging_providers FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_providers' AND policyname='lodging_providers_manage') THEN
    CREATE POLICY lodging_providers_manage ON lodging_providers FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Lodging room types
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_room_types' AND policyname='lodging_room_types_select') THEN
    CREATE POLICY lodging_room_types_select ON lodging_room_types FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_room_types' AND policyname='lodging_room_types_manage') THEN
    CREATE POLICY lodging_room_types_manage ON lodging_room_types FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Lodging bookings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_bookings' AND policyname='lodging_bookings_select') THEN
    CREATE POLICY lodging_bookings_select ON lodging_bookings FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_bookings' AND policyname='lodging_bookings_manage') THEN
    CREATE POLICY lodging_bookings_manage ON lodging_bookings FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Lodging guest assignments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_guest_assignments' AND policyname='lodging_guest_assignments_select') THEN
    CREATE POLICY lodging_guest_assignments_select ON lodging_guest_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_guest_assignments' AND policyname='lodging_guest_assignments_manage') THEN
    CREATE POLICY lodging_guest_assignments_manage ON lodging_guest_assignments FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Lodging payments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_payments' AND policyname='lodging_payments_select') THEN
    CREATE POLICY lodging_payments_select ON lodging_payments FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_payments' AND policyname='lodging_payments_manage') THEN
    CREATE POLICY lodging_payments_manage ON lodging_payments FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Lodging calendar events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_calendar_events' AND policyname='lodging_calendar_events_select') THEN
    CREATE POLICY lodging_calendar_events_select ON lodging_calendar_events FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_calendar_events' AND policyname='lodging_calendar_events_manage') THEN
    CREATE POLICY lodging_calendar_events_manage ON lodging_calendar_events FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Lodging availability
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_availability' AND policyname='lodging_availability_select') THEN
    CREATE POLICY lodging_availability_select ON lodging_availability FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lodging_availability' AND policyname='lodging_availability_manage') THEN
    CREATE POLICY lodging_availability_manage ON lodging_availability FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Rental clients
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rental_clients' AND policyname='rental_clients_select') THEN
    CREATE POLICY rental_clients_select ON rental_clients FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rental_clients' AND policyname='rental_clients_manage') THEN
    CREATE POLICY rental_clients_manage ON rental_clients FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Rental agreements
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rental_agreements' AND policyname='rental_agreements_select') THEN
    CREATE POLICY rental_agreements_select ON rental_agreements FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rental_agreements' AND policyname='rental_agreements_manage') THEN
    CREATE POLICY rental_agreements_manage ON rental_agreements FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Rental agreement items
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rental_agreement_items' AND policyname='rental_agreement_items_select') THEN
    CREATE POLICY rental_agreement_items_select ON rental_agreement_items FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rental_agreement_items' AND policyname='rental_agreement_items_manage') THEN
    CREATE POLICY rental_agreement_items_manage ON rental_agreement_items FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Rental payments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rental_payments' AND policyname='rental_payments_select') THEN
    CREATE POLICY rental_payments_select ON rental_payments FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rental_payments' AND policyname='rental_payments_manage') THEN
    CREATE POLICY rental_payments_manage ON rental_payments FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Travel groups
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='travel_groups' AND policyname='travel_groups_select') THEN
    CREATE POLICY travel_groups_select ON travel_groups FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='travel_groups' AND policyname='travel_groups_manage') THEN
    CREATE POLICY travel_groups_manage ON travel_groups FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Travel group members
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='travel_group_members' AND policyname='travel_group_members_select') THEN
    CREATE POLICY travel_group_members_select ON travel_group_members FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='travel_group_members' AND policyname='travel_group_members_manage') THEN
    CREATE POLICY travel_group_members_manage ON travel_group_members FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Flight coordination
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='flight_coordination' AND policyname='flight_coordination_select') THEN
    CREATE POLICY flight_coordination_select ON flight_coordination FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='flight_coordination' AND policyname='flight_coordination_manage') THEN
    CREATE POLICY flight_coordination_manage ON flight_coordination FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Flight passenger assignments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='flight_passenger_assignments' AND policyname='flight_passenger_assignments_select') THEN
    CREATE POLICY flight_passenger_assignments_select ON flight_passenger_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='flight_passenger_assignments' AND policyname='flight_passenger_assignments_manage') THEN
    CREATE POLICY flight_passenger_assignments_manage ON flight_passenger_assignments FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Ground transportation coordination
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ground_transportation_coordination' AND policyname='ground_transportation_select') THEN
    CREATE POLICY ground_transportation_select ON ground_transportation_coordination FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ground_transportation_coordination' AND policyname='ground_transportation_manage') THEN
    CREATE POLICY ground_transportation_manage ON ground_transportation_coordination FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Transportation passenger assignments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transportation_passenger_assignments' AND policyname='transport_passenger_select') THEN
    CREATE POLICY transport_passenger_select ON transportation_passenger_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transportation_passenger_assignments' AND policyname='transport_passenger_manage') THEN
    CREATE POLICY transport_passenger_manage ON transportation_passenger_assignments FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Hotel room assignments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hotel_room_assignments' AND policyname='hotel_room_assignments_select') THEN
    CREATE POLICY hotel_room_assignments_select ON hotel_room_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hotel_room_assignments' AND policyname='hotel_room_assignments_manage') THEN
    CREATE POLICY hotel_room_assignments_manage ON hotel_room_assignments FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  -- Travel coordination timeline
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='travel_coordination_timeline' AND policyname='travel_timeline_select') THEN
    CREATE POLICY travel_timeline_select ON travel_coordination_timeline FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='travel_coordination_timeline' AND policyname='travel_timeline_manage') THEN
    CREATE POLICY travel_timeline_manage ON travel_coordination_timeline FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- =============================================================================
-- SEQUENCES (for auto-generated booking/payment/agreement numbers)
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS lodging_booking_seq START 1;
CREATE SEQUENCE IF NOT EXISTS lodging_payment_seq START 1;
CREATE SEQUENCE IF NOT EXISTS rental_agreement_seq START 1;

-- =============================================================================
-- FUNCTIONS & TRIGGERS (wrapped in conditional blocks)
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_lodging_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_number IS NULL OR NEW.booking_number = '' THEN
    NEW.booking_number := 'LODG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(nextval('lodging_booking_seq') AS TEXT), 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_generate_lodging_booking_number') THEN
    CREATE TRIGGER trigger_generate_lodging_booking_number
      BEFORE INSERT ON lodging_bookings
      FOR EACH ROW
      EXECUTE FUNCTION generate_lodging_booking_number();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION generate_lodging_payment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
    NEW.payment_number := 'LPAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(nextval('lodging_payment_seq') AS TEXT), 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_generate_lodging_payment_number') THEN
    CREATE TRIGGER trigger_generate_lodging_payment_number
      BEFORE INSERT ON lodging_payments
      FOR EACH ROW
      EXECUTE FUNCTION generate_lodging_payment_number();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION generate_rental_agreement_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.agreement_number IS NULL OR NEW.agreement_number = '' THEN
    NEW.agreement_number := 'RENT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(nextval('rental_agreement_seq') AS TEXT), 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_generate_rental_agreement_number') THEN
    CREATE TRIGGER trigger_generate_rental_agreement_number
      BEFORE INSERT ON rental_agreements
      FOR EACH ROW
      EXECUTE FUNCTION generate_rental_agreement_number();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_travel_group_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE travel_groups SET total_members = total_members + 1, updated_at = NOW() WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE travel_groups SET total_members = total_members - 1, updated_at = NOW() WHERE id = OLD.group_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_travel_group_counts') THEN
    CREATE TRIGGER trigger_update_travel_group_counts
      AFTER INSERT OR DELETE ON travel_group_members
      FOR EACH ROW
      EXECUTE FUNCTION update_travel_group_counts();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_flight_passenger_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE flight_coordination SET booked_seats = booked_seats + 1, available_seats = GREATEST(COALESCE(available_seats,0) - 1, 0), updated_at = NOW() WHERE id = NEW.flight_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE flight_coordination SET booked_seats = GREATEST(booked_seats - 1, 0), available_seats = COALESCE(available_seats,0) + 1, updated_at = NOW() WHERE id = OLD.flight_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_flight_passenger_counts') THEN
    CREATE TRIGGER trigger_update_flight_passenger_counts
      AFTER INSERT OR DELETE ON flight_passenger_assignments
      FOR EACH ROW
      EXECUTE FUNCTION update_flight_passenger_counts();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_transportation_passenger_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ground_transportation_coordination SET assigned_passengers = assigned_passengers + 1, updated_at = NOW() WHERE id = NEW.transportation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ground_transportation_coordination SET assigned_passengers = GREATEST(assigned_passengers - 1, 0), updated_at = NOW() WHERE id = OLD.transportation_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_transportation_passenger_counts') THEN
    CREATE TRIGGER trigger_update_transportation_passenger_counts
      AFTER INSERT OR DELETE ON transportation_passenger_assignments
      FOR EACH ROW
      EXECUTE FUNCTION update_transportation_passenger_counts();
  END IF;
END $$;
