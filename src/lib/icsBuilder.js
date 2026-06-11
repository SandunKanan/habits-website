function escapeICS(str) {
  return String(str ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toICSDate(dateISO) {
  return dateISO.replace(/-/g, "");
}

function nextDayISO(dateISO) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    String(next.getUTCDate()).padStart(2, "0")
  ].join("-");
}

export function buildICSFeed(events, calName = "Habit Tracker") {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Habit Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICS(calName)}`
  ];

  for (const event of events) {
    const description = event.type === "task" ? "One-off task" : escapeICS(event.frequencyLabel ?? "Habit");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@habit-tracker`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toICSDate(event.dateISO)}`,
      `DTEND;VALUE=DATE:${toICSDate(nextDayISO(event.dateISO))}`,
      `SUMMARY:${escapeICS(event.title)}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
