// Shared AccessHours helpers used by both #03 property-info and #05 space-list.
// The properties API returns, per property, an `AccessHours` array with one
// section per `type` (office / gate / call_center); each section has a 7-day
// schedule. These helpers derive the live open/closed status and a grouped,
// human-readable weekly schedule for a section.

export interface AccessHour {
  day: string;              // "monday"
  open_time: string;        // "09:00:00 AM"
  close_time: string;       // "06:00:00 PM"
  is_always_open: boolean;
  appointment_only?: boolean;
}

export interface AccessHoursSection {
  type: string;             // "office" | "gate" | "call_center"
  hours: AccessHour[];
  enabled: boolean;
}

/** Live open/closed state for one section. */
export interface HoursStatus {
  isOpen: boolean;
  label: string;   // "Office Open" | "Gate Closed"
  note: string;    // "Closes 6:00pm" | "Opens 9:00am" | "Open 24 hours"
}

/** One line of the expanded schedule, e.g. { days: "Mon – Fri", hours: "9:00am – 6:00pm" }. */
export interface ScheduleRow {
  days: string;
  hours: string;
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

/** "09:00:00 AM" → minutes since midnight (0–1439); null if unparseable. */
function parseTime(t: string): number | null {
  const m = t?.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

/** "06:00:00 PM" → "6:00pm". */
function fmtTime(t: string): string {
  const mins = parseTime(t);
  if (mins == null) return t;
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  h %= 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')}${ap}`;
}

/** Current weekday + minutes-since-midnight in the given timezone (viewer-local fallback). */
function nowInZone(tz?: string): { day: string; minutes: number } {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false,
  };
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { ...opts, timeZone: tz }).formatToParts(new Date());
  } catch {
    parts = new Intl.DateTimeFormat('en-US', opts).formatToParts(new Date());
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = get('weekday').toLowerCase();
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(get('minute'), 10);
  return { day, minutes: hour * 60 + minute };
}

/** One day's hours as display text: "9:00am – 6:00pm" | "Open 24 hours" | "Closed". */
function dayHoursText(h: AccessHour | undefined): string {
  if (!h) return 'Closed';
  if (h.is_always_open) return 'Open 24 hours';
  const open = parseTime(h.open_time);
  const close = parseTime(h.close_time);
  if (open == null || close == null || open === close) return 'Closed';
  return `${fmtTime(h.open_time)} – ${fmtTime(h.close_time)}`;
}

/** Derive live open/closed status for one section from today's schedule. */
export function computeStatus(section: AccessHoursSection | undefined, label: string, tz?: string): HoursStatus | null {
  if (!section?.enabled || !Array.isArray(section.hours)) return null;

  const { day, minutes } = nowInZone(tz);
  const today = section.hours.find((h) => h.day?.toLowerCase() === day);
  if (!today) return null;

  if (today.is_always_open) {
    return { isOpen: true, label: `${label} Open`, note: 'Open 24 hours' };
  }

  const open = parseTime(today.open_time);
  const close = parseTime(today.close_time);
  // 12:00AM–12:00AM (open === close) means no real hours today → closed.
  if (open == null || close == null || open === close) {
    return { isOpen: false, label: `${label} Closed`, note: '' };
  }

  const isOpen = minutes >= open && minutes < close;
  return isOpen
    ? { isOpen: true, label: `${label} Open`, note: `Closes ${fmtTime(today.close_time)}` }
    : { isOpen: false, label: `${label} Closed`, note: `Opens ${fmtTime(today.open_time)}` };
}

/**
 * Group the week (Mon→Sun) into rows, collapsing consecutive days that share the
 * same hours: e.g. Mon–Fri 9–6, Sat 9–5, Sun Closed. Returns [] when disabled.
 */
export function formatSchedule(section: AccessHoursSection | undefined): ScheduleRow[] {
  if (!section?.enabled || !Array.isArray(section.hours)) return [];

  const byDay = new Map(section.hours.map((h) => [h.day?.toLowerCase(), h]));
  const rows: ScheduleRow[] = [];

  let start: string | null = null;
  let prev: string | null = null;
  let text = '';

  const flush = () => {
    if (start == null || prev == null) return;
    const days = start === prev ? DAY_SHORT[start] : `${DAY_SHORT[start]} – ${DAY_SHORT[prev]}`;
    rows.push({ days, hours: text });
  };

  for (const day of DAY_ORDER) {
    const cur = dayHoursText(byDay.get(day));
    if (cur === text) {
      prev = day;              // extend the current run
    } else {
      flush();                 // close the previous run
      start = day;
      prev = day;
      text = cur;
    }
  }
  flush();

  return rows;
}

// formatScheduleByDay (one ungrouped row per day, full day names) was removed
// once the "See all Hours" modals in #03 and #05 moved to the grouped
// formatSchedule above — it had no callers left. Recoverable from git history if
// an ungrouped listing is ever wanted again.
