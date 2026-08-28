/**
 * Event Planner Suite Types for Event Organizer (EO) Teams
 */

export type EventStatus =
  | 'planning'
  | 'in_progress'
  | 'ready'
  | 'live'
  | 'completed'
  | 'cancelled';

export type EventType =
  | 'Conference'
  | 'Wedding'
  | 'Concert'
  | 'Workshop'
  | 'Corporate'
  | 'Exhibition'
  | 'Tournament'
  | 'Festival'
  | 'Party'
  | 'Other';

export interface PlannerEvent {
  id: string;
  user_id?: string;
  profile_id?: string;
  title: string;
  description?: string | null;
  event_type: EventType;
  theme?: string | null;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  venue_room?: string | null;
  target_audience?: string | null;
  expected_headcount?: number;
  actual_headcount?: number;
  total_budget?: number;
  status: EventStatus;
  banner_color?: string;
  created_at?: string;
  updated_at?: string;
}

export type RundownStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface EventRundownItem {
  id: string;
  event_id: string;
  user_id?: string;
  order_index: number;
  start_time: string; // e.g. "08:00"
  end_time: string;   // e.g. "08:30"
  duration_mins: number;
  title: string;
  description?: string | null;
  stage_zone: string; // Main Stage, Hall A, VIP Room, Registration Gate
  pic_name?: string | null;
  pic_role?: string | null;
  av_cues?: string | null; // e.g. "Play Intro Bumper, Spotlight MC"
  status: RundownStatus;
  created_at?: string;
}

export type CrewRole = 'Coordinator' | 'Lead' | 'Member' | 'Volunteer';

export interface CrewDutyItem {
  id: string;
  task: string;
  is_done: boolean;
}

export interface EventCrewMember {
  id: string;
  event_id: string;
  user_id?: string;
  name: string;
  division: string; // Program/Acara, Logistics/Perlengkapan, F&B/Konsumsi, Media/Pubdok, Protocol/LO, Security/Field, Ticketing/Sponsorship
  role: CrewRole;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  duty_checklist?: CrewDutyItem[];
  order_index?: number;
  created_at?: string;
}

export type PaymentStatus = 'unpaid' | 'dp_paid' | 'fully_paid';

export interface EventBudgetItem {
  id: string;
  event_id: string;
  user_id?: string;
  category: string; // Venue, Production/AV, F&B/Catering, Talent/Speakers, Marketing/Merch, Logistics, Contingency
  item_name: string;
  estimated_cost: number;
  actual_cost: number;
  quantity?: number;
  unit_price?: number;
  payment_status: PaymentStatus;
  due_date?: string | null;
  paid_date?: string | null;
  receipt_notes?: string | null;
  order_index?: number;
  created_at?: string;
}

export type LogisticsSource = 'owned' | 'rented' | 'venue_provided' | 'sponsor' | 'bought';
export type LogisticsStatus = 'needed' | 'sourced' | 'ready_on_site' | 'returned';

export interface EventLogisticsItem {
  id: string;
  event_id: string;
  user_id?: string;
  item_name: string;
  category: string; // Audio/Visual, Electrical, Furniture, Stage Decor, Stationery, F&B Tools, Safety
  quantity: number;
  source: LogisticsSource;
  division_pic?: string | null;
  status: LogisticsStatus;
  location_box?: string | null;
  notes?: string | null;
  order_index?: number;
  created_at?: string;
}

export type VendorStatus = 'contacted' | 'booked' | 'confirmed' | 'on_site' | 'completed';

export interface EventVendor {
  id: string;
  event_id: string;
  user_id?: string;
  name: string;
  category: string; // Sound & Lighting, Catering, Stage & Decor, Printing, Photographer, Talent/Band, Speaker, Venue, Other
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  contract_amount?: number;
  call_time?: string | null;
  deliverables?: string | null;
  status: VendorStatus;
  order_index?: number;
  created_at?: string;
}

export interface EventMilestone {
  id: string;
  event_id: string;
  user_id?: string;
  phase: string; // D-30 Planning, D-14 Confirmations, D-7 Final Briefing, D-1 Rehearsal, D-Day Execution, Post-Event
  title: string;
  is_completed: boolean;
  due_date?: string | null;
  completed_at?: string | null;
  order_index?: number;
  created_at?: string;
}
