-- ============================================================
-- Supabase Schema for Event Planner Suite (Event Organizer)
-- ============================================================

-- 1. Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES sub_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL DEFAULT 'Conference', -- Conference, Wedding, Concert, Workshop, Corporate, Exhibition, Tournament, Other
    theme TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    venue_name TEXT,
    venue_address TEXT,
    venue_room TEXT,
    target_audience TEXT,
    expected_headcount INTEGER DEFAULT 0,
    actual_headcount INTEGER DEFAULT 0,
    total_budget NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'planning', -- planning, in_progress, ready, live, completed, cancelled
    banner_color TEXT DEFAULT '#2563eb',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Event Rundown / Cue Sheet Table (Minute-by-minute D-Day schedule)
CREATE TABLE IF NOT EXISTS event_rundowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    start_time TEXT NOT NULL, -- e.g. "08:00"
    end_time TEXT NOT NULL,   -- e.g. "08:30"
    duration_mins INTEGER DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT,
    stage_zone TEXT DEFAULT 'Main Stage', -- Main Stage, Hall A, VIP Room, Registration Gate, etc.
    pic_name TEXT, -- Person In Charge
    pic_role TEXT, -- e.g. Stage Manager, MC, Sound Eng
    av_cues TEXT,  -- Technical / Multimedia / Lighting cues
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, skipped
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Event Crew & Divisions Table (Kepanitiaan)
CREATE TABLE IF NOT EXISTS event_crew (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    division TEXT NOT NULL, -- Program/Acara, Logistics/Perlengkapan, Consumption/Konsumsi, Media/Pubdok, Protocol/LO, Security/Field, Ticketing/Sponsorship
    role TEXT NOT NULL DEFAULT 'Member', -- Coordinator, Lead, Member, Volunteer
    phone TEXT,
    email TEXT,
    notes TEXT,
    duty_checklist JSONB DEFAULT '[]'::jsonb,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Event Budget & Expenses (RAB - Rencana Anggaran Biaya)
CREATE TABLE IF NOT EXISTS event_budget (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- Venue, Production/AV, F&B/Catering, Talent/Speakers, Marketing/Merch, Logistics, Contingency
    item_name TEXT NOT NULL,
    estimated_cost NUMERIC NOT NULL DEFAULT 0,
    actual_cost NUMERIC DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid', -- unpaid, dp_paid, fully_paid
    due_date DATE,
    paid_date DATE,
    receipt_notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Event Logistics & Equipment Master Checklist
CREATE TABLE IF NOT EXISTS event_logistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT DEFAULT 'General', -- Audio/Visual, Electrical, Furniture, Stage Decor, Stationery, F&B Tools, Safety
    quantity INTEGER DEFAULT 1,
    source TEXT DEFAULT 'owned', -- owned, rented, venue_provided, sponsor, bought
    division_pic TEXT,
    status TEXT DEFAULT 'needed', -- needed, sourced, ready_on_site, returned
    location_box TEXT,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Event Vendors & Talent / Speakers Directory
CREATE TABLE IF NOT EXISTS event_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- Sound & Lighting, Catering, Stage & Decor, Printing, Photographer, Talent/Band, Speaker, Venue, Other
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    contract_amount NUMERIC DEFAULT 0,
    call_time TEXT, -- Expected arrival time, e.g. "06:30"
    deliverables TEXT,
    status TEXT DEFAULT 'contacted', -- contacted, booked, confirmed, on_site, completed
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Event Milestones Checklist
CREATE TABLE IF NOT EXISTS event_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phase TEXT NOT NULL, -- D-30 Planning, D-14 Confirmations, D-7 Final Briefing, D-1 Rehearsal (GR), D-Day Execution, Post-Event Evaluation
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS) Policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rundowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own events" ON events;
CREATE POLICY "Users can manage their own events" ON events FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own event rundowns" ON event_rundowns;
CREATE POLICY "Users can manage their own event rundowns" ON event_rundowns FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own event crew" ON event_crew;
CREATE POLICY "Users can manage their own event crew" ON event_crew FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own event budget" ON event_budget;
CREATE POLICY "Users can manage their own event budget" ON event_budget FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own event logistics" ON event_logistics;
CREATE POLICY "Users can manage their own event logistics" ON event_logistics FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own event vendors" ON event_vendors;
CREATE POLICY "Users can manage their own event vendors" ON event_vendors FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own event milestones" ON event_milestones;
CREATE POLICY "Users can manage their own event milestones" ON event_milestones FOR ALL USING (auth.uid() = user_id);

-- Indexes for optimal lookup
CREATE INDEX IF NOT EXISTS idx_events_profile ON events(profile_id);
CREATE INDEX IF NOT EXISTS idx_event_rundowns_event ON event_rundowns(event_id);
CREATE INDEX IF NOT EXISTS idx_event_crew_event ON event_crew(event_id);
CREATE INDEX IF NOT EXISTS idx_event_budget_event ON event_budget(event_id);
CREATE INDEX IF NOT EXISTS idx_event_logistics_event ON event_logistics(event_id);
CREATE INDEX IF NOT EXISTS idx_event_vendors_event ON event_vendors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_milestones_event ON event_milestones(event_id);
