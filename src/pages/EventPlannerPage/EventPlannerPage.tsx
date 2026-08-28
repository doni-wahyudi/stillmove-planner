import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/Toast/Toast';
import dataService from '@/services/DataService';
import type {
  PlannerEvent,
  EventRundownItem,
  EventCrewMember,
  EventBudgetItem,
  EventLogisticsItem,
  EventVendor,
  EventMilestone,
  EventType,
  EventStatus,
  CrewRole,
  PaymentStatus,
  LogisticsStatus,
  LogisticsSource,
  VendorStatus,
} from '@/types/event';
import './EventPlannerPage.css';

type EventModuleTab =
  | 'overview'
  | 'rundown'
  | 'crew'
  | 'budget'
  | 'logistics'
  | 'vendors'
  | 'milestones';

const EVENT_TYPES: EventType[] = [
  'Conference',
  'Wedding',
  'Concert',
  'Workshop',
  'Corporate',
  'Exhibition',
  'Tournament',
  'Festival',
  'Party',
  'Other',
];

const CREW_DIVISIONS = [
  'Program / Acara',
  'Logistics / Perlengkapan',
  'Consumption / F&B',
  'Media & Pubdok',
  'Protocol & LO / VIP',
  'Security & Field',
  'Ticketing & Sponsorship',
  'General Committee',
];

const BUDGET_CATEGORIES = [
  'Venue & Facilities',
  'Production & Sound / Lighting',
  'F&B / Catering',
  'Talent, MC & Speakers',
  'Marketing, Print & Merch',
  'Logistics & Transportation',
  'Contingency & Emergency Buffer',
];

const LOGISTICS_CATEGORIES = [
  'Audio & Visual (AV)',
  'Electrical & Cables',
  'Furniture & Seating',
  'Stage & Decor',
  'Stationery & Badges',
  'F&B Tools & Servers',
  'Safety & First Aid',
  'Other',
];

const VENDOR_CATEGORIES = [
  'Sound & Lighting',
  'Catering & F&B',
  'Stage & Decor',
  'Printing & Signage',
  'Photographer / Videographer',
  'Talent / Band / DJ',
  'Keynote Speaker / Trainer',
  'Venue Management',
  'Security & Permits',
  'Other',
];

const MILESTONE_PHASES = [
  'Phase 1: D-30 Concept & Planning',
  'Phase 2: D-14 Bookings & Contracts',
  'Phase 3: D-7 Final Briefing & Production',
  'Phase 4: D-1 Technical Rehearsal (GR)',
  'Phase 5: D-Day Live Execution',
  'Phase 6: Post-Event Evaluation & LPJ',
];

const formatIDR = (amount: number | null | undefined): string => {
  const val = Number(amount || 0);
  return `Rp ${val.toLocaleString('id-ID')}`;
};

export function EventPlannerPage() {
  const { activeProfile } = useProfile();
  const { t } = useLanguage();
  const { showToast } = useToast();

  // Selected Event & Active Module Tab
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<EventModuleTab>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Module Data States
  const [rundown, setRundown] = useState<EventRundownItem[]>([]);
  const [crew, setCrew] = useState<EventCrewMember[]>([]);
  const [budget, setBudget] = useState<EventBudgetItem[]>([]);
  const [logistics, setLogistics] = useState<EventLogisticsItem[]>([]);
  const [vendors, setVendors] = useState<EventVendor[]>([]);
  const [milestones, setMilestones] = useState<EventMilestone[]>([]);

  // Filter States
  const [crewDivisionFilter, setCrewDivisionFilter] = useState('All');
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState('All');
  const [logisticsStatusFilter, setLogisticsStatusFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null);
  const [showRundownModal, setShowRundownModal] = useState(false);
  const [editingRundown, setEditingRundown] = useState<EventRundownItem | null>(null);
  const [showCrewModal, setShowCrewModal] = useState(false);
  const [editingCrew, setEditingCrew] = useState<EventCrewMember | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<EventBudgetItem | null>(null);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [editingLogistics, setEditingLogistics] = useState<EventLogisticsItem | null>(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<EventVendor | null>(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showLiveStageModal, setShowLiveStageModal] = useState(false);

  // Live Clock for D-Day Mode
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Load Events ---
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getEvents();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to load events:', e);
      showToast('Failed to load events list', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedEventId, showToast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents, activeProfile?.id]);

  // Current active event
  const currentEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  // --- Load Event Details ---
  const loadEventDetails = useCallback(async (eventId: string) => {
    if (!eventId) return;
    try {
      const [
        rundownData,
        crewData,
        budgetData,
        logisticsData,
        vendorsData,
        milestonesData,
      ] = await Promise.all([
        dataService.getEventRundown(eventId),
        dataService.getEventCrew(eventId),
        dataService.getEventBudget(eventId),
        dataService.getEventLogistics(eventId),
        dataService.getEventVendors(eventId),
        dataService.getEventMilestones(eventId),
      ]);
      setRundown(rundownData);
      setCrew(crewData);
      setBudget(budgetData);
      setLogistics(logisticsData);
      setVendors(vendorsData);
      setMilestones(milestonesData);
    } catch (e) {
      console.error('Failed to load event details:', e);
      showToast('Failed to load event modules', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedEventId) {
      loadEventDetails(selectedEventId);
    }
  }, [selectedEventId, loadEventDetails]);

  // --- D-Day Countdown Calculation ---
  const countdownInfo = useMemo(() => {
    if (!currentEvent?.start_date) return { label: 'Date not set', days: 0, isToday: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventStart = new Date(currentEvent.start_date);
    eventStart.setHours(0, 0, 0, 0);

    const diffTime = eventStart.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { label: `🔥 ${t('events.dDayToday')}`, days: 0, isToday: true };
    } else if (diffDays > 0) {
      return { label: t('events.dDayLabel', { days: diffDays }), days: diffDays, isToday: false };
    } else {
      return { label: t('events.dDayAfter', { days: Math.abs(diffDays) }), days: diffDays, isToday: false };
    }
  }, [currentEvent, t]);

  // --- KPI Calculations ---
  const kpis = useMemo(() => {
    const totalEstBudget = budget.reduce((acc, b) => acc + Number(b.estimated_cost || 0), 0);
    const totalActualBudget = budget.reduce((acc, b) => acc + Number(b.actual_cost || 0), 0);
    const budgetPct = totalEstBudget > 0 ? Math.round((totalActualBudget / totalEstBudget) * 100) : 0;

    const totalRundownMins = rundown.reduce((acc, r) => acc + Number(r.duration_mins || 0), 0);
    const rundownHours = (totalRundownMins / 60).toFixed(1);

    const readyLogistics = logistics.filter((l) => l.status === 'ready_on_site' || l.status === 'returned').length;
    const logisticsPct = logistics.length > 0 ? Math.round((readyLogistics / logistics.length) * 100) : 0;

    const confirmedVendors = vendors.filter((v) => v.status === 'confirmed' || v.status === 'on_site' || v.status === 'completed').length;

    const completedMilestones = milestones.filter((m) => m.is_completed).length;
    const milestonePct = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

    const expectedHeadcount = Number(currentEvent?.expected_headcount || 0);
    const actualHeadcount = Number(currentEvent?.actual_headcount || 0);
    const remainingSlots = Math.max(0, expectedHeadcount - actualHeadcount);
    const isOverQuota = expectedHeadcount > 0 && actualHeadcount > expectedHeadcount;
    const attendancePct = expectedHeadcount > 0 ? Math.round((actualHeadcount / expectedHeadcount) * 100) : 0;

    return {
      totalEstBudget,
      totalActualBudget,
      budgetPct,
      rundownHours,
      rundownCount: rundown.length,
      crewCount: crew.length,
      readyLogistics,
      logisticsTotal: logistics.length,
      logisticsPct,
      confirmedVendors,
      vendorTotal: vendors.length,
      completedMilestones,
      milestoneTotal: milestones.length,
      milestonePct,
      expectedHeadcount,
      actualHeadcount,
      remainingSlots,
      isOverQuota,
      attendancePct,
    };
  }, [budget, rundown, crew, logistics, vendors, milestones, currentEvent]);

  // --- Quick Adjust Headcount ---
  const handleQuickAdjustHeadcount = async (delta: number) => {
    if (!currentEvent) return;
    const newCount = Math.max(0, (currentEvent.actual_headcount || 0) + delta);
    try {
      const updated = await dataService.updateEvent(currentEvent.id, { actual_headcount: newCount });
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      showToast(`${t('events.actualHeadcount')}: ${newCount}`, 'success');
    } catch {
      showToast('Failed to update headcount', 'error');
    }
  };

  const handleDirectSetHeadcount = async (count: number) => {
    if (!currentEvent) return;
    const newCount = Math.max(0, count);
    try {
      const updated = await dataService.updateEvent(currentEvent.id, { actual_headcount: newCount });
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      showToast(`${t('events.actualHeadcount')}: ${newCount}`, 'success');
    } catch {
      showToast('Failed to update headcount', 'error');
    }
  };

  // --- Spreadsheet / Google Sheets Sync ---
  const [showSheetSyncModal, setShowSheetSyncModal] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);

  const handleSyncGoogleSheet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentEvent || !sheetUrlInput.trim()) return;

    let targetUrl = sheetUrlInput.trim();
    // Convert regular Google Sheet URL to published CSV URL if needed
    if (targetUrl.includes('docs.google.com/spreadsheets/d/')) {
      const sheetIdMatch = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetIdMatch && !targetUrl.includes('export?format=csv') && !targetUrl.includes('pub?output=csv')) {
        targetUrl = `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv`;
      }
    }

    setIsSyncingSheet(true);
    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const csvText = await response.text();
      const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      
      // Assume line 0 is the table header (e.g. Timestamp, Name, Email)
      const participantCount = Math.max(0, lines.length - 1);
      
      const updated = await dataService.updateEvent(currentEvent.id, {
        actual_headcount: participantCount,
      });
      setEvents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      showToast(`✅ Synced ${participantCount} attendees from Google Sheets!`, 'success');
      setShowSheetSyncModal(false);
    } catch (err: any) {
      console.error('Google Sheets Sync error:', err);
      showToast('Could not fetch sheet. Ensure sheet is Published to Web as CSV.', 'error');
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // --- CSV / Spreadsheet Export Utilities ---
  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAllCSV = () => {
    if (!currentEvent) return;
    const safeTitle = currentEvent.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // 1. Overview & Attendance
    let csv = `Event Summary & Attendance: ${currentEvent.title}\n`;
    csv += `Date,${currentEvent.start_date} to ${currentEvent.end_date}\n`;
    csv += `Venue,${currentEvent.venue_name || 'TBD'}\n`;
    csv += `Target Quota (Expected),${currentEvent.expected_headcount || 0}\n`;
    csv += `Registered (Actual),${currentEvent.actual_headcount || 0}\n`;
    csv += `Remaining Slots,${kpis.remainingSlots}\n`;
    csv += `Fill Rate,${kpis.attendancePct}%\n\n`;

    // 2. Rundown
    csv += `RUNDOWN & CUE SHEET\n`;
    csv += `Start Time,End Time,Duration (Mins),Segment Title,Zone/Stage,PIC,AV & Tech Cues,Status\n`;
    rundown.forEach((r) => {
      csv += `"${r.start_time}","${r.end_time}",${r.duration_mins || 0},"${(r.title || '').replace(/"/g, '""')}","${r.stage_zone || ''}","${r.pic_name || ''}","${(r.av_cues || '').replace(/"/g, '""')}","${r.status}"\n`;
    });
    csv += `\n`;

    // 3. Budget (RAB)
    csv += `BUDGET & EXPENSES (RAB)\n`;
    csv += `Category,Item Name,Quantity,Est. Cost (Rp),Actual Cost (Rp),Variance (Rp),Payment Status,Notes\n`;
    budget.forEach((b) => {
      const v = Number(b.estimated_cost || 0) - Number(b.actual_cost || 0);
      csv += `"${b.category}","${(b.item_name || '').replace(/"/g, '""')}",${b.quantity || 1},${b.estimated_cost || 0},${b.actual_cost || 0},${v},"${b.payment_status}","${(b.receipt_notes || '').replace(/"/g, '""')}"\n`;
    });
    csv += `\n`;

    // 4. Crew
    csv += `COMMITTEE & CREW\n`;
    csv += `Name,Division,Role,Phone,Email,Notes\n`;
    crew.forEach((c) => {
      csv += `"${c.name}","${c.division}","${c.role}","${c.phone || ''}","${c.email || ''}","${(c.notes || '').replace(/"/g, '""')}"\n`;
    });

    downloadCSV(`Stillmove_Event_${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    showToast('Exported complete event data to CSV/Excel!', 'success');
  };

  // --- Current Live Rundown Segment ---
  const activeLiveSegment = useMemo(() => {
    if (!rundown.length) return null;
    const timeStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
    const found = rundown.find((r) => r.start_time <= timeStr && r.end_time >= timeStr);
    return found || rundown.find((r) => r.status === 'in_progress') || rundown[0];
  }, [rundown, currentTime]);

  // --- Handlers: Event CRUD ---
  const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    if (!title.trim()) {
      showToast('Event title is required', 'warning');
      return;
    }

    const payload = {
      title: title.trim(),
      description: (formData.get('description') as string) || null,
      event_type: (formData.get('event_type') as EventType) || 'Conference',
      theme: (formData.get('theme') as string) || null,
      start_date: (formData.get('start_date') as string) || new Date().toISOString().slice(0, 10),
      end_date: (formData.get('end_date') as string) || new Date().toISOString().slice(0, 10),
      start_time: (formData.get('start_time') as string) || null,
      end_time: (formData.get('end_time') as string) || null,
      venue_name: (formData.get('venue_name') as string) || null,
      venue_address: (formData.get('venue_address') as string) || null,
      venue_room: (formData.get('venue_room') as string) || null,
      target_audience: (formData.get('target_audience') as string) || null,
      expected_headcount: Number(formData.get('expected_headcount')) || 0,
      actual_headcount: Number(formData.get('actual_headcount')) || 0,
      total_budget: Number(formData.get('total_budget')) || 0,
      status: (formData.get('status') as EventStatus) || 'planning',
      banner_color: (formData.get('banner_color') as string) || '#2563eb',
    };

    try {
      if (editingEvent) {
        const updated = await dataService.updateEvent(editingEvent.id, payload);
        setEvents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        showToast('Event updated successfully', 'success');
      } else {
        const created = await dataService.createEvent(payload);
        setEvents((prev) => [...prev, created]);
        setSelectedEventId(created.id);
        showToast('Event created successfully', 'success');
      }
      setShowEventModal(false);
      setEditingEvent(null);
    } catch {
      showToast('Failed to save event', 'error');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event and all its modules?')) return;
    try {
      await dataService.deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (selectedEventId === id) {
        const remaining = events.filter((e) => e.id !== id);
        setSelectedEventId(remaining[0]?.id || '');
      }
      showToast('Event deleted', 'success');
    } catch {
      showToast('Failed to delete event', 'error');
    }
  };

  // --- Handlers: Rundown CRUD ---
  const handleSaveRundown = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEventId) return;
    const formData = new FormData(e.currentTarget);

    const startTime = (formData.get('start_time') as string) || '09:00';
    const endTime = (formData.get('end_time') as string) || '09:30';

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;

    const payload = {
      event_id: selectedEventId,
      title: (formData.get('title') as string) || 'Untitled Segment',
      description: (formData.get('description') as string) || null,
      start_time: startTime,
      end_time: endTime,
      duration_mins: diff || Number(formData.get('duration_mins')) || 30,
      stage_zone: (formData.get('stage_zone') as string) || 'Main Stage',
      pic_name: (formData.get('pic_name') as string) || null,
      pic_role: (formData.get('pic_role') as string) || null,
      av_cues: (formData.get('av_cues') as string) || null,
      status: (formData.get('status') as any) || 'pending',
      order_index: rundown.length,
    };

    try {
      if (editingRundown) {
        const updated = await dataService.updateRundownItem(editingRundown.id, payload);
        setRundown((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        showToast('Rundown cue updated', 'success');
      } else {
        const created = await dataService.createRundownItem(payload);
        setRundown((prev) => [...prev, created].sort((a, b) => a.start_time.localeCompare(b.start_time)));
        showToast('Rundown cue added', 'success');
      }
      setShowRundownModal(false);
      setEditingRundown(null);
    } catch {
      showToast('Failed to save rundown item', 'error');
    }
  };

  const handleToggleRundownStatus = async (item: EventRundownItem) => {
    const states: any[] = ['pending', 'in_progress', 'completed', 'skipped'];
    const nextIdx = (states.indexOf(item.status) + 1) % states.length;
    const nextStatus = states[nextIdx];
    try {
      const updated = await dataService.updateRundownItem(item.id, { status: nextStatus });
      setRundown((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDeleteRundown = async (id: string) => {
    try {
      await dataService.deleteRundownItem(id);
      setRundown((prev) => prev.filter((r) => r.id !== id));
      showToast('Cue removed', 'success');
    } catch {
      showToast('Failed to delete cue', 'error');
    }
  };

  // --- Handlers: Crew CRUD ---
  const handleSaveCrew = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEventId) return;
    const formData = new FormData(e.currentTarget);

    const payload = {
      event_id: selectedEventId,
      name: (formData.get('name') as string) || 'Crew Member',
      division: (formData.get('division') as string) || 'Program / Acara',
      role: (formData.get('role') as CrewRole) || 'Member',
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      notes: (formData.get('notes') as string) || null,
      order_index: crew.length,
    };

    try {
      if (editingCrew) {
        const updated = await dataService.updateCrewMember(editingCrew.id, payload);
        setCrew((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        showToast('Crew member updated', 'success');
      } else {
        const created = await dataService.createCrewMember(payload);
        setCrew((prev) => [...prev, created]);
        showToast('Crew member added', 'success');
      }
      setShowCrewModal(false);
      setEditingCrew(null);
    } catch {
      showToast('Failed to save crew member', 'error');
    }
  };

  const handleDeleteCrew = async (id: string) => {
    try {
      await dataService.deleteCrewMember(id);
      setCrew((prev) => prev.filter((c) => c.id !== id));
      showToast('Crew member removed', 'success');
    } catch {
      showToast('Failed to delete crew member', 'error');
    }
  };

  // --- Handlers: Budget CRUD ---
  const handleSaveBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEventId) return;
    const formData = new FormData(e.currentTarget);

    const est = Number(formData.get('estimated_cost')) || 0;
    const act = Number(formData.get('actual_cost')) || 0;

    const payload = {
      event_id: selectedEventId,
      category: (formData.get('category') as string) || 'Venue & Facilities',
      item_name: (formData.get('item_name') as string) || 'Expense Item',
      estimated_cost: est,
      actual_cost: act,
      quantity: Number(formData.get('quantity')) || 1,
      unit_price: Number(formData.get('unit_price')) || 0,
      payment_status: (formData.get('payment_status') as PaymentStatus) || 'unpaid',
      due_date: (formData.get('due_date') as string) || null,
      receipt_notes: (formData.get('receipt_notes') as string) || null,
      order_index: budget.length,
    };

    try {
      if (editingBudget) {
        const updated = await dataService.updateBudgetItem(editingBudget.id, payload);
        setBudget((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        showToast('Budget item updated', 'success');
      } else {
        const created = await dataService.createBudgetItem(payload);
        setBudget((prev) => [...prev, created]);
        showToast('Budget item added', 'success');
      }
      setShowBudgetModal(false);
      setEditingBudget(null);
    } catch {
      showToast('Failed to save budget item', 'error');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      await dataService.deleteBudgetItem(id);
      setBudget((prev) => prev.filter((b) => b.id !== id));
      showToast('Budget item removed', 'success');
    } catch {
      showToast('Failed to delete budget item', 'error');
    }
  };

  // --- Handlers: Logistics CRUD ---
  const handleSaveLogistics = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEventId) return;
    const formData = new FormData(e.currentTarget);

    const payload = {
      event_id: selectedEventId,
      item_name: (formData.get('item_name') as string) || 'Equipment Item',
      category: (formData.get('category') as string) || 'General',
      quantity: Number(formData.get('quantity')) || 1,
      source: (formData.get('source') as LogisticsSource) || 'owned',
      division_pic: (formData.get('division_pic') as string) || null,
      status: (formData.get('status') as LogisticsStatus) || 'needed',
      location_box: (formData.get('location_box') as string) || null,
      notes: (formData.get('notes') as string) || null,
      order_index: logistics.length,
    };

    try {
      if (editingLogistics) {
        const updated = await dataService.updateLogisticsItem(editingLogistics.id, payload);
        setLogistics((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        showToast('Logistics item updated', 'success');
      } else {
        const created = await dataService.createLogisticsItem(payload);
        setLogistics((prev) => [...prev, created]);
        showToast('Logistics item added', 'success');
      }
      setShowLogisticsModal(false);
      setEditingLogistics(null);
    } catch {
      showToast('Failed to save logistics item', 'error');
    }
  };

  const handleToggleLogisticsStatus = async (item: EventLogisticsItem) => {
    const pipeline: LogisticsStatus[] = ['needed', 'sourced', 'ready_on_site', 'returned'];
    const nextIdx = (pipeline.indexOf(item.status) + 1) % pipeline.length;
    const nextStatus = pipeline[nextIdx];
    try {
      const updated = await dataService.updateLogisticsItem(item.id, { status: nextStatus });
      setLogistics((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDeleteLogistics = async (id: string) => {
    try {
      await dataService.deleteLogisticsItem(id);
      setLogistics((prev) => prev.filter((l) => l.id !== id));
      showToast('Logistics item removed', 'success');
    } catch {
      showToast('Failed to delete logistics item', 'error');
    }
  };

  // --- Handlers: Vendors CRUD ---
  const handleSaveVendor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEventId) return;
    const formData = new FormData(e.currentTarget);

    const payload = {
      event_id: selectedEventId,
      name: (formData.get('name') as string) || 'Vendor / Talent',
      category: (formData.get('category') as string) || 'Sound & Lighting',
      contact_person: (formData.get('contact_person') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      contract_amount: Number(formData.get('contract_amount')) || 0,
      call_time: (formData.get('call_time') as string) || null,
      deliverables: (formData.get('deliverables') as string) || null,
      status: (formData.get('status') as VendorStatus) || 'contacted',
      order_index: vendors.length,
    };

    try {
      if (editingVendor) {
        const updated = await dataService.updateVendor(editingVendor.id, payload);
        setVendors((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        showToast('Vendor / Talent updated', 'success');
      } else {
        const created = await dataService.createVendor(payload);
        setVendors((prev) => [...prev, created]);
        showToast('Vendor / Talent added', 'success');
      }
      setShowVendorModal(false);
      setEditingVendor(null);
    } catch {
      showToast('Failed to save vendor', 'error');
    }
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      await dataService.deleteVendor(id);
      setVendors((prev) => prev.filter((v) => v.id !== id));
      showToast('Vendor removed', 'success');
    } catch {
      showToast('Failed to delete vendor', 'error');
    }
  };

  // --- Handlers: Milestones ---
  const handleSaveMilestone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEventId) return;
    const formData = new FormData(e.currentTarget);

    const payload = {
      event_id: selectedEventId,
      phase: (formData.get('phase') as string) || MILESTONE_PHASES[0],
      title: (formData.get('title') as string) || 'Milestone Task',
      is_completed: false,
      due_date: (formData.get('due_date') as string) || null,
      order_index: milestones.length,
    };

    try {
      const created = await dataService.createMilestone(payload);
      setMilestones((prev) => [...prev, created]);
      showToast('Milestone created', 'success');
      setShowMilestoneModal(false);
    } catch {
      showToast('Failed to create milestone', 'error');
    }
  };

  const handleToggleMilestone = async (id: string, currentVal: boolean) => {
    try {
      const updated = await dataService.toggleMilestone(id, !currentVal);
      setMilestones((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch {
      showToast('Failed to update milestone', 'error');
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    try {
      await dataService.deleteMilestone(id);
      setMilestones((prev) => prev.filter((m) => m.id !== id));
      showToast('Milestone deleted', 'success');
    } catch {
      showToast('Failed to delete milestone', 'error');
    }
  };

  // --- JSON Export & Import ---
  const handleExportTemplate = () => {
    if (!currentEvent) return;
    const exportData = {
      version: 1,
      type: 'stillmove_event_template',
      event: currentEvent,
      rundown,
      crew,
      budget,
      logistics,
      vendors,
      milestones,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEvent.title.replace(/\s+/g, '_')}_Plan.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Event template exported', 'success');
  };

  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.type !== 'stillmove_event_template' || !data.event) {
          showToast('Invalid event template file', 'error');
          return;
        }
        const newEvent = await dataService.createEvent({
          ...data.event,
          title: `${data.event.title} (Imported)`,
        });

        // Import child items
        if (Array.isArray(data.rundown)) {
          for (const r of data.rundown) {
            await dataService.createRundownItem({ ...r, event_id: newEvent.id });
          }
        }
        if (Array.isArray(data.crew)) {
          for (const c of data.crew) {
            await dataService.createCrewMember({ ...c, event_id: newEvent.id });
          }
        }
        if (Array.isArray(data.budget)) {
          for (const b of data.budget) {
            await dataService.createBudgetItem({ ...b, event_id: newEvent.id });
          }
        }
        if (Array.isArray(data.logistics)) {
          for (const l of data.logistics) {
            await dataService.createLogisticsItem({ ...l, event_id: newEvent.id });
          }
        }
        if (Array.isArray(data.vendors)) {
          for (const v of data.vendors) {
            await dataService.createVendor({ ...v, event_id: newEvent.id });
          }
        }
        if (Array.isArray(data.milestones)) {
          for (const m of data.milestones) {
            await dataService.createMilestone({ ...m, event_id: newEvent.id });
          }
        }

        await loadEvents();
        setSelectedEventId(newEvent.id);
        showToast('Event template imported successfully!', 'success');
      } catch (err) {
        console.error('Import error:', err);
        showToast('Failed to import event template', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Print Cue Sheet ---
  const handlePrintCueSheet = () => {
    window.print();
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="event-planner-page">
        <div className="dashboard-loading">
          <div className="spinner" />
          <p>Loading Event Organizer workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-planner-page">
      {/* Top Header / Selector */}
      <header className="event-planner-header">
        <div className="event-planner-header__left">
          <div className="event-title-badge">🎪 {t('events.suiteTitle')}</div>
          <h2>{currentEvent?.title || t('events.suiteTitle')}</h2>
          <p>{currentEvent?.theme || currentEvent?.description || t('events.subtitle')}</p>
        </div>

        <div className="event-planner-header__actions">
          <select
            className="form-select event-selector"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            aria-label="Select Active Event"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({ev.event_type})
              </option>
            ))}
          </select>

          {currentEvent && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setEditingEvent(currentEvent);
                setShowEventModal(true);
              }}
              title={t('events.editEvent')}
            >
              ⚙️ {t('events.editEvent')}
            </button>
          )}

          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingEvent(null);
              setShowEventModal(true);
            }}
          >
            {t('events.newEvent')}
          </button>

          <label className="btn btn-secondary btn-sm import-template-btn" title="Import Event Plan JSON">
            📥 {t('events.importPlan')}
            <input type="file" accept=".json" onChange={handleImportTemplate} style={{ display: 'none' }} />
          </label>

          {currentEvent && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSheetUrlInput('');
                  setShowSheetSyncModal(true);
                }}
                title={t('events.spreadsheetSync')}
              >
                📊 {t('events.spreadsheetSync')}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleExportAllCSV} title={t('events.exportCsv')}>
                📥 {t('events.exportCsv')}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleExportTemplate} title="Export Event Plan as Reusable JSON Template">
                📤 {t('events.exportPlan')}
              </button>
              <button className="btn btn-secondary btn-sm print-cue-btn" onClick={handlePrintCueSheet} title="Print / Save PDF Run of Show">
                🖨️ {t('events.printCueSheet')}
              </button>
            </>
          )}
        </div>
      </header>

      {/* No Events Empty State */}
      {events.length === 0 ? (
        <div className="event-empty-state">
          <div className="empty-icon">🎪</div>
          <h3>No events planned yet</h3>
          <p>Create your first event to start organizing rundowns, crew rosters, budgets, and logistics.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingEvent(null);
              setShowEventModal(true);
            }}
          >
            + Create First Event
          </button>
        </div>
      ) : (
        <>
          {/* D-Day Countdown & Venue Banner */}
          {currentEvent && (
            <section className="event-countdown-banner" style={{ borderLeftColor: currentEvent.banner_color || '#2563eb' }}>
              <div className="countdown-pill-wrap">
                <span className={`countdown-pill ${countdownInfo.isToday ? 'today' : ''}`}>
                  {countdownInfo.label}
                </span>
                <span className={`event-status-tag status-${currentEvent.status}`}>
                  {currentEvent.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="event-key-info">
                <div className="info-chip">
                  <span className="info-icon">📅</span>
                  <span>{currentEvent.start_date} {currentEvent.start_time ? `(${currentEvent.start_time})` : ''} to {currentEvent.end_date}</span>
                </div>
                {currentEvent.venue_name && (
                  <div className="info-chip">
                    <span className="info-icon">📍</span>
                    <span>{currentEvent.venue_name} {currentEvent.venue_room ? `(${currentEvent.venue_room})` : ''}</span>
                  </div>
                )}
                <div className="info-chip">
                  <span className="info-icon">👥</span>
                  <span>
                    {t('events.registeredAttendees')}: <strong>{kpis.actualHeadcount}</strong> / {kpis.expectedHeadcount || 0} pax
                    {' '}({kpis.isOverQuota ? t('events.overQuota', { count: kpis.actualHeadcount - kpis.expectedHeadcount }) : t('events.slotsLeft', { count: kpis.remainingSlots })})
                  </span>
                </div>
              </div>

              {/* Stage Mode Launcher */}
              <button className="btn-stage-mode" onClick={() => setShowLiveStageModal(true)}>
                ⚡ {t('events.liveStageMonitor')}
              </button>
            </section>
          )}

          {/* KPI Summary Cards with Attendance & Remaining Quota */}
          <section className="event-kpi-grid">
            {/* 1. Attendee / Headcount & Remaining Quota Tracker */}
            <div className="kpi-card kpi-card--highlight">
              <div className="kpi-card-head">
                <span className="kpi-label">👥 {t('events.registeredAttendees')}</span>
                <span className="kpi-sub-badge" style={{ background: kpis.isOverQuota ? '#ef4444' : '#10b981' }}>
                  {kpis.isOverQuota
                    ? t('events.overQuota', { count: kpis.actualHeadcount - kpis.expectedHeadcount })
                    : t('events.slotsLeft', { count: kpis.remainingSlots })}
                </span>
              </div>
              <div className="kpi-val">
                {kpis.actualHeadcount} <span className="kpi-sub">/ {kpis.expectedHeadcount} pax ({kpis.attendancePct}%)</span>
              </div>
              <div className="kpi-bar-track">
                <div
                  className="kpi-bar-fill"
                  style={{
                    width: `${Math.min(100, kpis.attendancePct)}%`,
                    background: kpis.isOverQuota ? '#ef4444' : kpis.attendancePct >= 90 ? '#f59e0b' : '#10b981',
                  }}
                />
              </div>
              {/* Quick Counter Adjustment Controls */}
              <div className="kpi-quick-actions">
                <span className="quick-action-label">{t('events.quickAddAttendee')}:</span>
                <button className="btn-quick-counter" onClick={() => handleQuickAdjustHeadcount(-1)} title="-1 Attendee">-1</button>
                <button className="btn-quick-counter" onClick={() => handleQuickAdjustHeadcount(1)} title="+1 Attendee">+1</button>
                <button className="btn-quick-counter" onClick={() => handleQuickAdjustHeadcount(5)} title="+5 Attendees">+5</button>
                <button className="btn-quick-counter" onClick={() => handleQuickAdjustHeadcount(10)} title="+10 Attendees">+10</button>
                <button className="btn-quick-counter btn-quick-sync" onClick={() => setShowSheetSyncModal(true)} title="Sync from Google Sheets">📊</button>
              </div>
            </div>

            {/* 2. Budget RAB */}
            <div className="kpi-card">
              <span className="kpi-label">💰 {t('events.tabBudget')}</span>
              <div className="kpi-val">{formatIDR(kpis.totalActualBudget)} <span className="kpi-sub">/ {formatIDR(kpis.totalEstBudget)}</span></div>
              <div className="kpi-bar-track">
                <div className="kpi-bar-fill" style={{ width: `${Math.min(100, kpis.budgetPct)}%`, background: kpis.budgetPct > 100 ? '#ef4444' : '#10b981' }} />
              </div>
            </div>

            {/* 3. Rundown */}
            <div className="kpi-card">
              <span className="kpi-label">🕒 {t('events.tabRundown')}</span>
              <div className="kpi-val">{kpis.rundownCount} <span className="kpi-sub">cues ({kpis.rundownHours} hrs)</span></div>
              <div className="kpi-bar-track">
                <div className="kpi-bar-fill" style={{ width: '100%', background: '#3b82f6' }} />
              </div>
            </div>

            {/* 4. Crew */}
            <div className="kpi-card">
              <span className="kpi-label">👥 {t('events.tabCrew')}</span>
              <div className="kpi-val">{kpis.crewCount} <span className="kpi-sub">crew</span></div>
              <div className="kpi-bar-track">
                <div className="kpi-bar-fill" style={{ width: '100%', background: '#8b5cf6' }} />
              </div>
            </div>

            {/* 5. Logistics */}
            <div className="kpi-card">
              <span className="kpi-label">📦 {t('events.tabLogistics')}</span>
              <div className="kpi-val">{kpis.readyLogistics}/{kpis.logisticsTotal} <span className="kpi-sub">({kpis.logisticsPct}%)</span></div>
              <div className="kpi-bar-track">
                <div className="kpi-bar-fill" style={{ width: `${kpis.logisticsPct}%`, background: '#f59e0b' }} />
              </div>
            </div>
          </section>

          {/* Module Navigation Tabs */}
          <nav className="event-module-tabs">
            <button className={`module-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              📊 {t('events.tabOverview')}
            </button>
            <button className={`module-tab ${activeTab === 'rundown' ? 'active' : ''}`} onClick={() => setActiveTab('rundown')}>
              🕒 {t('events.tabRundown')} ({rundown.length})
            </button>
            <button className={`module-tab ${activeTab === 'crew' ? 'active' : ''}`} onClick={() => setActiveTab('crew')}>
              👥 {t('events.tabCrew')} ({crew.length})
            </button>
            <button className={`module-tab ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => setActiveTab('budget')}>
              💰 {t('events.tabBudget')} ({budget.length})
            </button>
            <button className={`module-tab ${activeTab === 'logistics' ? 'active' : ''}`} onClick={() => setActiveTab('logistics')}>
              📦 {t('events.tabLogistics')} ({logistics.length})
            </button>
            <button className={`module-tab ${activeTab === 'vendors' ? 'active' : ''}`} onClick={() => setActiveTab('vendors')}>
              🎤 {t('events.tabVendors')} ({vendors.length})
            </button>
            <button className={`module-tab ${activeTab === 'milestones' ? 'active' : ''}`} onClick={() => setActiveTab('milestones')}>
              📋 {t('events.tabMilestones')} ({kpis.completedMilestones}/{kpis.milestoneTotal})
            </button>
          </nav>

          {/* ============================================================ */}
          {/* TAB 1: OVERVIEW & BRIEF */}
          {/* ============================================================ */}
          {activeTab === 'overview' && currentEvent && (
            <div className="event-tab-pane">
              <div className="overview-grid">
                <div className="overview-card">
                  <h3>🎪 {t('events.tabOverview')}</h3>
                  <div className="overview-detail-list">
                    <div className="detail-item"><strong>{t('common.name')}:</strong> {currentEvent.title}</div>
                    <div className="detail-item"><strong>{t('common.category')}:</strong> {currentEvent.event_type}</div>
                    {currentEvent.theme && <div className="detail-item"><strong>{t('events.theme')}:</strong> {currentEvent.theme}</div>}
                    {currentEvent.description && <div className="detail-item"><strong>{t('common.description')}:</strong> {currentEvent.description}</div>}
                    <div className="detail-item"><strong>{t('common.date')}:</strong> {currentEvent.start_date} to {currentEvent.end_date}</div>
                    {currentEvent.target_audience && <div className="detail-item"><strong>Target:</strong> {currentEvent.target_audience}</div>}
                    <div className="detail-item"><strong>{t('events.expectedHeadcount')}:</strong> {currentEvent.expected_headcount || 0} pax</div>
                  </div>
                </div>

                <div className="overview-card">
                  <h3>📍 {t('events.venue')}</h3>
                  <div className="overview-detail-list">
                    <div className="detail-item"><strong>{t('events.venue')}:</strong> {currentEvent.venue_name || 'TBD (Belum Ditentukan)'}</div>
                    {currentEvent.venue_room && <div className="detail-item"><strong>{t('events.room')}:</strong> {currentEvent.venue_room}</div>}
                    {currentEvent.venue_address && <div className="detail-item"><strong>Alamat:</strong> {currentEvent.venue_address}</div>}
                    <div className="detail-item"><strong>{t('events.duration')}:</strong> {kpis.rundownHours} {t('common.hours')} ({rundown.length} cues)</div>
                    <div className="detail-item"><strong>{t('events.tabCrew')}:</strong> {crew.length} crew</div>
                    <div className="detail-item"><strong>{t('events.estimatedCost')}:</strong> {formatIDR(kpis.totalEstBudget || currentEvent.total_budget)}</div>
                    <div className="detail-item"><strong>{t('events.actualCost')}:</strong> {formatIDR(kpis.totalActualBudget)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: RUNDOWN & RUN-OF-SHOW CUE SHEET */}
          {/* ============================================================ */}
          {activeTab === 'rundown' && (
            <div className="event-tab-pane">
              <div className="pane-action-bar">
                <div className="pane-filters">
                  <select
                    className="form-select filter-select"
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                  >
                    <option value="All">{t('common.all')} Stage / Zone</option>
                    {Array.from(new Set(rundown.map((r) => r.stage_zone).filter(Boolean))).map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                <div className="pane-buttons">
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowLiveStageModal(true)}>
                    ⚡ {t('events.liveStageMonitor')}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setEditingRundown(null);
                      setShowRundownModal(true);
                    }}
                  >
                    {t('events.addCue')}
                  </button>
                </div>
              </div>

              {rundown.length === 0 ? (
                <div className="module-empty-state">
                  <p>{t('common.noData')}</p>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowRundownModal(true)}>
                    {t('events.addCue')}
                  </button>
                </div>
              ) : (
                <div className="table-responsive printable-rundown">
                  <table className="planner-data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '110px' }}>{t('events.timeRange')}</th>
                        <th style={{ width: '70px' }}>{t('events.duration')}</th>
                        <th>{t('events.segmentTitle')}</th>
                        <th style={{ width: '130px' }}>{t('events.stageZone')}</th>
                        <th style={{ width: '140px' }}>{t('events.pic')}</th>
                        <th>{t('events.avCues')}</th>
                        <th style={{ width: '110px' }}>{t('common.status')}</th>
                        <th style={{ width: '100px' }} className="no-print">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rundown
                        .filter((r) => stageFilter === 'All' || r.stage_zone === stageFilter)
                        .map((r) => (
                          <tr key={r.id} className={`rundown-row status-${r.status}`}>
                            <td className="time-cell">
                              <strong>{r.start_time}</strong> - {r.end_time}
                            </td>
                            <td>{r.duration_mins}m</td>
                            <td>
                              <div className="segment-title">{r.title}</div>
                              {r.description && <div className="segment-desc">{r.description}</div>}
                            </td>
                            <td><span className="zone-tag">{r.stage_zone}</span></td>
                            <td>
                              <div className="pic-name">{r.pic_name || '-'}</div>
                              {r.pic_role && <div className="pic-role">{r.pic_role}</div>}
                            </td>
                            <td className="av-cues-cell">
                              {r.av_cues ? <span className="av-cue-text">{r.av_cues}</span> : <span className="text-muted">-</span>}
                            </td>
                            <td>
                              <button
                                className={`status-pill pill-${r.status}`}
                                onClick={() => handleToggleRundownStatus(r)}
                                title="Click to cycle status"
                              >
                                {r.status}
                              </button>
                            </td>
                            <td className="no-print">
                              <div className="row-actions">
                                <button
                                  className="action-icon-btn"
                                  onClick={() => {
                                    setEditingRundown(r);
                                    setShowRundownModal(true);
                                  }}
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="action-icon-btn delete-btn"
                                  onClick={() => handleDeleteRundown(r.id)}
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: CREW & DIVISIONS (KEPANITIAAN) */}
          {/* ============================================================ */}
          {activeTab === 'crew' && (
            <div className="event-tab-pane">
              <div className="pane-action-bar">
                <div className="pane-filters">
                  <select
                    className="form-select filter-select"
                    value={crewDivisionFilter}
                    onChange={(e) => setCrewDivisionFilter(e.target.value)}
                  >
                    <option value="All">{t('common.all')} ({crew.length})</option>
                    {CREW_DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} ({crew.filter((c) => c.division === d).length})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingCrew(null);
                    setShowCrewModal(true);
                  }}
                >
                  {t('events.addCrew')}
                </button>
              </div>

              {crew.length === 0 ? (
                <div className="module-empty-state">
                  <p>No crew roster configured yet. Add committee leads and team members.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCrewModal(true)}>
                    + Add First Crew Member
                  </button>
                </div>
              ) : (
                <div className="crew-cards-grid">
                  {crew
                    .filter((c) => crewDivisionFilter === 'All' || c.division === crewDivisionFilter)
                    .map((c) => (
                      <div key={c.id} className="crew-card">
                        <div className="crew-card-header">
                          <div className="crew-avatar">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="crew-identity">
                            <h4>{c.name}</h4>
                            <span className={`role-badge role-${c.role.toLowerCase()}`}>{c.role}</span>
                          </div>
                        </div>

                        <div className="crew-division-tag">
                          📁 {c.division}
                        </div>

                        {c.notes && <p className="crew-notes">{c.notes}</p>}

                        <div className="crew-contact-bar">
                          {c.phone ? (
                            <a
                              href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-wa-link"
                              title="Chat on WhatsApp"
                            >
                              💬 WA: {c.phone}
                            </a>
                          ) : (
                            <span className="text-muted">No phone</span>
                          )}

                          <div className="row-actions">
                            <button
                              className="action-icon-btn"
                              onClick={() => {
                                setEditingCrew(c);
                                setShowCrewModal(true);
                              }}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="action-icon-btn delete-btn"
                              onClick={() => handleDeleteCrew(c.id)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: BUDGET & EXPENSES (RAB) */}
          {/* ============================================================ */}
          {activeTab === 'budget' && (
            <div className="event-tab-pane">
              <div className="pane-action-bar">
                <div className="pane-filters">
                  <select
                    className="form-select filter-select"
                    value={budgetCategoryFilter}
                    onChange={(e) => setBudgetCategoryFilter(e.target.value)}
                  >
                    <option value="All">{t('common.all')} ({budget.length})</option>
                    {BUDGET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingBudget(null);
                    setShowBudgetModal(true);
                  }}
                >
                  {t('events.addExpense')}
                </button>
              </div>

              <div className="table-responsive">
                <table className="planner-data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Expense Item</th>
                      <th style={{ width: '60px' }}>Qty</th>
                      <th>Est. Cost (Rp)</th>
                      <th>Actual Cost (Rp)</th>
                      <th>Variance (Rp)</th>
                      <th style={{ width: '120px' }}>Payment</th>
                      <th style={{ width: '100px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget
                      .filter((b) => budgetCategoryFilter === 'All' || b.category === budgetCategoryFilter)
                      .map((b) => {
                        const variance = Number(b.estimated_cost || 0) - Number(b.actual_cost || 0);
                        return (
                          <tr key={b.id}>
                            <td><span className="category-tag">{b.category}</span></td>
                            <td>
                              <strong>{b.item_name}</strong>
                              {b.receipt_notes && <div className="receipt-notes">📝 {b.receipt_notes}</div>}
                            </td>
                            <td>{b.quantity || 1}</td>
                            <td>{formatIDR(b.estimated_cost)}</td>
                            <td>{formatIDR(b.actual_cost)}</td>
                            <td style={{ color: variance < 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                              {variance < 0 ? `-${formatIDR(Math.abs(variance))}` : `+${formatIDR(variance)}`}
                            </td>
                            <td>
                              <span className={`payment-badge badge-${b.payment_status}`}>
                                {b.payment_status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  className="action-icon-btn"
                                  onClick={() => {
                                    setEditingBudget(b);
                                    setShowBudgetModal(true);
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="action-icon-btn delete-btn"
                                  onClick={() => handleDeleteBudget(b.id)}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: LOGISTICS MASTER CHECKLIST */}
          {/* ============================================================ */}
          {activeTab === 'logistics' && (
            <div className="event-tab-pane">
              <div className="pane-action-bar">
                <div className="pane-filters">
                  <select
                    className="form-select filter-select"
                    value={logisticsStatusFilter}
                    onChange={(e) => setLogisticsStatusFilter(e.target.value)}
                  >
                    <option value="All">{t('common.all')} ({logistics.length})</option>
                    <option value="needed">{t('events.pipelineNeeded')}</option>
                    <option value="sourced">{t('events.pipelineSourced')}</option>
                    <option value="ready_on_site">{t('events.pipelineReady')}</option>
                    <option value="returned">{t('events.pipelineReturned')}</option>
                  </select>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingLogistics(null);
                    setShowLogisticsModal(true);
                  }}
                >
                  {t('events.addLogistics')}
                </button>
              </div>

              <div className="table-responsive">
                <table className="planner-data-table">
                  <thead>
                    <tr>
                      <th>Equipment / Item</th>
                      <th>Category</th>
                      <th style={{ width: '70px' }}>Qty</th>
                      <th>Source</th>
                      <th>PIC</th>
                      <th>Box / Location</th>
                      <th style={{ width: '140px' }}>Status Pipeline</th>
                      <th style={{ width: '90px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logistics
                      .filter((l) => logisticsStatusFilter === 'All' || l.status === logisticsStatusFilter)
                      .map((l) => (
                        <tr key={l.id}>
                          <td>
                            <strong>{l.item_name}</strong>
                            {l.notes && <div className="receipt-notes">{l.notes}</div>}
                          </td>
                          <td><span className="category-tag">{l.category}</span></td>
                          <td>{l.quantity}</td>
                          <td><span className="source-tag">{l.source}</span></td>
                          <td>{l.division_pic || '-'}</td>
                          <td>{l.location_box || '-'}</td>
                          <td>
                            <button
                              className={`logistics-status-btn status-${l.status}`}
                              onClick={() => handleToggleLogisticsStatus(l)}
                              title="Click to advance status: Needed ➔ Sourced ➔ Ready ➔ Returned"
                            >
                              {l.status.replace(/_/g, ' ')}
                            </button>
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                className="action-icon-btn"
                                onClick={() => {
                                  setEditingLogistics(l);
                                  setShowLogisticsModal(true);
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                className="action-icon-btn delete-btn"
                                onClick={() => handleDeleteLogistics(l.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 6: VENDORS & TALENT DIRECTORY */}
          {/* ============================================================ */}
          {activeTab === 'vendors' && (
            <div className="event-tab-pane">
              <div className="pane-action-bar">
                <div />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingVendor(null);
                    setShowVendorModal(true);
                  }}
                >
                  {t('events.addVendor')}
                </button>
              </div>

              <div className="crew-cards-grid">
                {vendors.map((v) => (
                  <div key={v.id} className="crew-card vendor-card">
                    <div className="crew-card-header">
                      <div className="crew-avatar vendor-avatar">🏢</div>
                      <div className="crew-identity">
                        <h4>{v.name}</h4>
                        <span className={`role-badge role-${v.status}`}>{v.status.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="crew-division-tag">
                      🏷️ {v.category}
                    </div>

                    <div className="vendor-specs">
                      {v.contact_person && <div>👤 Contact: <strong>{v.contact_person}</strong></div>}
                      {v.call_time && <div>⏰ Call Time: <strong>{v.call_time}</strong></div>}
                      {v.contract_amount ? <div>💵 Fee: <strong>{formatIDR(v.contract_amount)}</strong></div> : null}
                      {v.deliverables && <div className="vendor-deliverables">📦 {v.deliverables}</div>}
                    </div>

                    <div className="crew-contact-bar">
                      {v.phone ? (
                        <a
                          href={`https://wa.me/${v.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-wa-link"
                        >
                          💬 WA: {v.phone}
                        </a>
                      ) : (
                        <span className="text-muted">No phone</span>
                      )}

                      <div className="row-actions">
                        <button
                          className="action-icon-btn"
                          onClick={() => {
                            setEditingVendor(v);
                            setShowVendorModal(true);
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          className="action-icon-btn delete-btn"
                          onClick={() => handleDeleteVendor(v.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 7: MILESTONES CHECKLIST */}
          {/* ============================================================ */}
          {activeTab === 'milestones' && (
            <div className="event-tab-pane">
              <div className="pane-action-bar">
                <div className="milestone-progress-text">
                  {t('common.completed')}: <strong>{kpis.completedMilestones} / {kpis.milestoneTotal} ({kpis.milestonePct}%)</strong>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowMilestoneModal(true)}
                >
                  {t('events.addMilestone')}
                </button>
              </div>

              <div className="milestone-phases-stack">
                {MILESTONE_PHASES.map((phase) => {
                  const phaseTasks = milestones.filter((m) => m.phase === phase);
                  return (
                    <div key={phase} className="milestone-phase-card">
                      <div className="phase-header">
                        <h4>{phase}</h4>
                        <span>{phaseTasks.filter((t) => t.is_completed).length}/{phaseTasks.length} Done</span>
                      </div>

                      <div className="phase-tasks-list">
                        {phaseTasks.length === 0 ? (
                          <div className="text-muted" style={{ fontSize: '0.84rem' }}>No tasks assigned in this phase.</div>
                        ) : (
                          phaseTasks.map((t) => (
                            <div key={t.id} className={`milestone-task-item ${t.is_completed ? 'completed' : ''}`}>
                              <label className="milestone-checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={t.is_completed}
                                  onChange={() => handleToggleMilestone(t.id, t.is_completed)}
                                />
                                <span className="task-title">{t.title}</span>
                              </label>

                              {t.due_date && <span className="task-due">Due: {t.due_date}</span>}

                              <button
                                className="action-icon-btn delete-btn"
                                onClick={() => handleDeleteMilestone(t.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}

      {/* Event Modal */}
      {showEventModal && (
        <div className="planner-modal-backdrop" onClick={() => setShowEventModal(false)}>
          <div className="planner-modal event-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="planner-modal-header">
              <h3>{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
              <button className="modal-close" onClick={() => setShowEventModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveEvent} className="event-modal-form">
              <div className="form-group">
                <label>Event Title *</label>
                <input type="text" name="title" className="form-input" defaultValue={editingEvent?.title || ''} required autoFocus />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Event Type</label>
                  <select name="event_type" className="form-select" defaultValue={editingEvent?.event_type || 'Conference'}>
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" className="form-select" defaultValue={editingEvent?.status || 'planning'}>
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="ready">Ready</option>
                    <option value="live">Live / D-Day</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Theme / Tagline</label>
                <input type="text" name="theme" className="form-input" defaultValue={editingEvent?.theme || ''} placeholder="e.g. Innovate Together 2026" />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input type="date" name="start_date" className="form-input" defaultValue={editingEvent?.start_date || new Date().toISOString().slice(0, 10)} required />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input type="date" name="end_date" className="form-input" defaultValue={editingEvent?.end_date || new Date().toISOString().slice(0, 10)} required />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Venue Name (Optional)</label>
                  <input type="text" name="venue_name" className="form-input" defaultValue={editingEvent?.venue_name || ''} placeholder="e.g. Grand Ballroom, Hilton (TBD if undecided)" />
                </div>
                <div className="form-group">
                  <label>Room / Hall (Optional)</label>
                  <input type="text" name="venue_room" className="form-input" defaultValue={editingEvent?.venue_room || ''} placeholder="e.g. Hall B3" />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Expected Headcount (Optional)</label>
                  <input type="number" name="expected_headcount" className="form-input" defaultValue={editingEvent?.expected_headcount ?? ''} placeholder="e.g. 100" />
                </div>
                <div className="form-group">
                  <label>Total Budget (Rp / IDR - Optional)</label>
                  <input type="number" name="total_budget" className="form-input" defaultValue={editingEvent?.total_budget ?? ''} placeholder="e.g. 15000000" />
                </div>
              </div>

              <div className="form-group">
                <label>Description & Notes (Optional)</label>
                <textarea name="description" className="form-input" rows={2} defaultValue={editingEvent?.description || ''} placeholder="Add background, objectives, or unconfirmed items..." />
              </div>

              <div className="modal-footer-actions">
                {editingEvent && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteEvent(editingEvent.id)}
                  >
                    Delete Event
                  </button>
                )}
                <div className="action-right">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEventModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    {editingEvent ? 'Save Changes' : 'Create Event'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rundown Cue Modal */}
      {showRundownModal && (
        <div className="planner-modal-backdrop" onClick={() => setShowRundownModal(false)}>
          <div className="planner-modal event-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="planner-modal-header">
              <h3>{editingRundown ? 'Edit Rundown Cue' : 'Add Rundown Cue'}</h3>
              <button className="modal-close" onClick={() => setShowRundownModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveRundown} className="event-modal-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label>Start Time (HH:MM) *</label>
                  <input type="time" name="start_time" className="form-input" defaultValue={editingRundown?.start_time || '09:00'} required />
                </div>
                <div className="form-group">
                  <label>End Time (HH:MM) *</label>
                  <input type="time" name="end_time" className="form-input" defaultValue={editingRundown?.end_time || '09:30'} required />
                </div>
              </div>

              <div className="form-group">
                <label>Segment / Activity Title *</label>
                <input type="text" name="title" className="form-input" defaultValue={editingRundown?.title || ''} placeholder="e.g. Opening Keynote Speech" required autoFocus />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Stage / Zone</label>
                  <input type="text" name="stage_zone" className="form-input" defaultValue={editingRundown?.stage_zone || 'Main Stage'} placeholder="e.g. Main Stage, Gate 1" />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" className="form-select" defaultValue={editingRundown?.status || 'pending'}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>PIC Name (Person In Charge)</label>
                  <input type="text" name="pic_name" className="form-input" defaultValue={editingRundown?.pic_name || ''} placeholder="e.g. Sarah / MC Dave" />
                </div>
                <div className="form-group">
                  <label>PIC Role</label>
                  <input type="text" name="pic_role" className="form-input" defaultValue={editingRundown?.pic_role || ''} placeholder="e.g. Stage Manager, MC" />
                </div>
              </div>

              <div className="form-group">
                <label>AV, Lighting & Technical Cues</label>
                <textarea name="av_cues" className="form-input" rows={2} defaultValue={editingRundown?.av_cues || ''} placeholder="e.g. Play bumper video on LED screen, dim house lights, Mic 2 ON" />
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRundownModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Cue</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crew Modal */}
      {showCrewModal && (
        <div className="planner-modal-backdrop" onClick={() => setShowCrewModal(false)}>
          <div className="planner-modal event-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="planner-modal-header">
              <h3>{editingCrew ? 'Edit Crew Member' : 'Add Committee Member'}</h3>
              <button className="modal-close" onClick={() => setShowCrewModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveCrew} className="event-modal-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" name="name" className="form-input" defaultValue={editingCrew?.name || ''} required autoFocus />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Division</label>
                  <select name="division" className="form-select" defaultValue={editingCrew?.division || 'Program / Acara'}>
                    {CREW_DIVISIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select name="role" className="form-select" defaultValue={editingCrew?.role || 'Member'}>
                    <option value="Coordinator">Coordinator / Lead</option>
                    <option value="Lead">Sub-Lead</option>
                    <option value="Member">Member</option>
                    <option value="Volunteer">Volunteer</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Phone / WhatsApp</label>
                  <input type="text" name="phone" className="form-input" defaultValue={editingCrew?.phone || ''} placeholder="e.g. +62812345678" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" className="form-input" defaultValue={editingCrew?.email || ''} />
                </div>
              </div>

              <div className="form-group">
                <label>Assigned Duties & Notes</label>
                <textarea name="notes" className="form-input" rows={2} defaultValue={editingCrew?.notes || ''} placeholder="e.g. In charge of VIP hospitality and stage mic switching." />
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCrewModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="planner-modal-backdrop" onClick={() => setShowBudgetModal(false)}>
          <div className="planner-modal event-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="planner-modal-header">
              <h3>{editingBudget ? 'Edit Expense Item' : 'Add Expense Item (RAB)'}</h3>
              <button className="modal-close" onClick={() => setShowBudgetModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveBudget} className="event-modal-form">
              <div className="form-group">
                <label>Category</label>
                <select name="category" className="form-select" defaultValue={editingBudget?.category || BUDGET_CATEGORIES[0]}>
                  {BUDGET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Item Name *</label>
                <input type="text" name="item_name" className="form-input" defaultValue={editingBudget?.item_name || ''} placeholder="e.g. Sound System Rental 10kW" required autoFocus />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Estimated Cost (Rp) *</label>
                  <input type="number" name="estimated_cost" className="form-input" defaultValue={editingBudget?.estimated_cost ?? ''} placeholder="e.g. 2500000" required />
                </div>
                <div className="form-group">
                  <label>Actual Cost (Rp)</label>
                  <input type="number" name="actual_cost" className="form-input" defaultValue={editingBudget?.actual_cost ?? ''} placeholder="e.g. 2400000" />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" name="quantity" className="form-input" defaultValue={editingBudget?.quantity || 1} />
                </div>
                <div className="form-group">
                  <label>Payment Status</label>
                  <select name="payment_status" className="form-select" defaultValue={editingBudget?.payment_status || 'unpaid'}>
                    <option value="unpaid">Unpaid</option>
                    <option value="dp_paid">DP / Down Payment</option>
                    <option value="fully_paid">Fully Paid</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Receipt Notes & Invoice #</label>
                <input type="text" name="receipt_notes" className="form-input" defaultValue={editingBudget?.receipt_notes || ''} placeholder="e.g. Invoice #INV-2026-08, DP 50% paid via BCA" />
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBudgetModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logistics Modal */}
      {showLogisticsModal && (
        <div className="planner-modal-backdrop" onClick={() => setShowLogisticsModal(false)}>
          <div className="planner-modal event-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="planner-modal-header">
              <h3>{editingLogistics ? 'Edit Equipment Item' : 'Add Equipment Item'}</h3>
              <button className="modal-close" onClick={() => setShowLogisticsModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveLogistics} className="event-modal-form">
              <div className="form-group">
                <label>Item Name *</label>
                <input type="text" name="item_name" className="form-input" defaultValue={editingLogistics?.item_name || ''} placeholder="e.g. Wireless Microphones (Shure SLX)" required autoFocus />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Category</label>
                  <select name="category" className="form-select" defaultValue={editingLogistics?.category || LOGISTICS_CATEGORIES[0]}>
                    {LOGISTICS_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" name="quantity" className="form-input" defaultValue={editingLogistics?.quantity || 1} min={1} />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Source</label>
                  <select name="source" className="form-select" defaultValue={editingLogistics?.source || 'owned'}>
                    <option value="owned">Owned</option>
                    <option value="rented">Rented</option>
                    <option value="venue_provided">Venue Provided</option>
                    <option value="sponsor">Sponsor</option>
                    <option value="bought">Bought</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status Pipeline</label>
                  <select name="status" className="form-select" defaultValue={editingLogistics?.status || 'needed'}>
                    <option value="needed">Needed</option>
                    <option value="sourced">Sourced</option>
                    <option value="ready_on_site">Ready On Site</option>
                    <option value="returned">Returned</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Division PIC</label>
                  <input type="text" name="division_pic" className="form-input" defaultValue={editingLogistics?.division_pic || ''} placeholder="e.g. Perlengkapan / Dave" />
                </div>
                <div className="form-group">
                  <label>Storage Box / Location</label>
                  <input type="text" name="location_box" className="form-input" defaultValue={editingLogistics?.location_box || ''} placeholder="e.g. Box AV-02 backstage" />
                </div>
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowLogisticsModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Modal */}
      {showVendorModal && (
        <div className="planner-modal-backdrop" onClick={() => setShowVendorModal(false)}>
          <div className="planner-modal event-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="planner-modal-header">
              <h3>{editingVendor ? 'Edit Vendor / Talent' : 'Add Vendor / Talent'}</h3>
              <button className="modal-close" onClick={() => setShowVendorModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveVendor} className="event-modal-form">
              <div className="form-group">
                <label>Vendor / Talent Name *</label>
                <input type="text" name="name" className="form-input" defaultValue={editingVendor?.name || ''} required autoFocus />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Category</label>
                  <select name="category" className="form-select" defaultValue={editingVendor?.category || VENDOR_CATEGORIES[0]}>
                    {VENDOR_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" className="form-select" defaultValue={editingVendor?.status || 'contacted'}>
                    <option value="contacted">Contacted</option>
                    <option value="booked">Booked</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="on_site">On-Site</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Contact Person</label>
                  <input type="text" name="contact_person" className="form-input" defaultValue={editingVendor?.contact_person || ''} />
                </div>
                <div className="form-group">
                  <label>Phone / WhatsApp</label>
                  <input type="text" name="phone" className="form-input" defaultValue={editingVendor?.phone || ''} />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Call Time / Arrival Time</label>
                  <input type="time" name="call_time" className="form-input" defaultValue={editingVendor?.call_time || ''} />
                </div>
                <div className="form-group">
                  <label>Contract Amount (Rp)</label>
                  <input type="number" name="contract_amount" className="form-input" defaultValue={editingVendor?.contract_amount ?? ''} placeholder="e.g. 5000000" />
                </div>
              </div>

              <div className="form-group">
                <label>Deliverables & Rider</label>
                <textarea name="deliverables" className="form-input" rows={2} defaultValue={editingVendor?.deliverables || ''} placeholder="e.g. 5x Wireless IEM, 2x Stage Monitor, 500x Lunch boxes by 11:30" />
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowVendorModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {showMilestoneModal && (
        <div className="planner-modal-backdrop" onClick={() => setShowMilestoneModal(false)}>
          <div className="planner-modal event-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="planner-modal-header">
              <h3>Add Milestone Task</h3>
              <button className="modal-close" onClick={() => setShowMilestoneModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveMilestone} className="event-modal-form">
              <div className="form-group">
                <label>Phase</label>
                <select name="phase" className="form-select">
                  {MILESTONE_PHASES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Task Title *</label>
                <input type="text" name="title" className="form-input" placeholder="e.g. Finalize Catering menu selection" required autoFocus />
              </div>

              <div className="form-group">
                <label>Due Date</label>
                <input type="date" name="due_date" className="form-input" />
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowMilestoneModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Add Milestone</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Stage Monitor Modal */}
      {showLiveStageModal && (
        <div className="planner-modal-backdrop" onClick={() => setShowLiveStageModal(false)}>
          <div className="planner-modal live-stage-monitor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="live-stage-header">
              <div className="live-badge">🔴 LIVE D-DAY STAGE MONITOR</div>
              <div className="live-clock">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </div>
              <button className="modal-close" onClick={() => setShowLiveStageModal(false)}>×</button>
            </div>

            <div className="live-stage-body">
              {activeLiveSegment ? (
                <div className="active-segment-card">
                  <span className="live-sub-tag">{t('events.currentLiveSegment')}</span>
                  <h1 className="live-segment-title">{activeLiveSegment.title}</h1>
                  <div className="live-time-range">
                    🕒 {activeLiveSegment.start_time} - {activeLiveSegment.end_time} ({activeLiveSegment.duration_mins} {t('common.minutes')})
                  </div>
                  <div className="live-pic-tag">
                    👤 {t('events.pic')}: <strong>{activeLiveSegment.pic_name || 'PIC'}</strong> {activeLiveSegment.pic_role ? `(${activeLiveSegment.pic_role})` : ''} | 📍 {activeLiveSegment.stage_zone}
                  </div>
                  {activeLiveSegment.av_cues && (
                    <div className="live-av-cues">
                      🎬 {t('events.avCues')}: <strong>{activeLiveSegment.av_cues}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className="active-segment-card text-center">
                  <h2>{t('common.noData')}</h2>
                </div>
              )}

              {/* Upcoming Segments List */}
              <div className="upcoming-cues-section">
                <h3>{t('events.upcomingCues')}</h3>
                <div className="upcoming-cues-list">
                  {rundown
                    .filter((r) => r.id !== activeLiveSegment?.id)
                    .slice(0, 5)
                    .map((r) => (
                      <div key={r.id} className="upcoming-cue-item">
                        <span className="cue-time">{r.start_time}</span>
                        <span className="cue-title">{r.title}</span>
                        <span className="cue-pic">{r.pic_name || '-'}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Sync Modal */}
      {showSheetSyncModal && (
        <div className="planner-modal-backdrop" onClick={() => setShowSheetSyncModal(false)}>
          <div className="planner-modal event-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="planner-modal-header">
              <h3>📊 {t('events.spreadsheetSync')}</h3>
              <button className="modal-close" onClick={() => setShowSheetSyncModal(false)}>×</button>
            </div>
            <form onSubmit={handleSyncGoogleSheet} className="event-modal-form">
              <div className="sheet-sync-guide">
                <h4>{t('events.howToSyncSheet')}</h4>
                <p>{t('events.howToSyncStep1')}</p>
                <p>{t('events.howToSyncStep2')}</p>
                <p>{t('events.howToSyncStep3')}</p>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>{t('events.spreadsheetUrl')} *</label>
                <input
                  type="url"
                  className="form-input"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                  required
                  autoFocus
                />
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSheetSyncModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSyncingSheet}>
                  {isSyncingSheet ? 'Syncing...' : t('events.syncNow')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventPlannerPage;
