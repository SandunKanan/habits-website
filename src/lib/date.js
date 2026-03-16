export function startOfTodayLocalISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toISODate(d);
}

export function toISODate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(dateISO) {
  return new Date(`${dateISO}T00:00:00`);
}

export function daysBetweenISO(aISO, bISO) {
  if (!aISO || !bISO) return null;
  const a = parseISODate(aISO);
  const b = parseISODate(bISO);
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function addDaysISO(dateISO, dayCount) {
  const date = parseISODate(dateISO);
  date.setDate(date.getDate() + dayCount);
  return toISODate(date);
}

export function addMonthsISO(dateISO, monthCount) {
  const date = parseISODate(dateISO);
  const originalDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + monthCount);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(originalDay, lastDayOfMonth));
  return toISODate(date);
}

export function startOfWeekISO(dateISO) {
  const date = parseISODate(dateISO);
  date.setDate(date.getDate() - date.getDay());
  return toISODate(date);
}

export function startOfMonthISO(dateISO) {
  const date = parseISODate(dateISO);
  date.setDate(1);
  return toISODate(date);
}
