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

export function daysBetweenISO(aISO, bISO) {
  if (!aISO || !bISO) return null;
  const a = new Date(`${aISO}T00:00:00`);
  const b = new Date(`${bISO}T00:00:00`);
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
