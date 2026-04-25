import { addMonthsISO, parseISODate, startOfMonthISO, toISODate } from "./date.js";

export const TIMELINE_LANES = [
  { value: "location", label: "Living location", accent: "rgba(143, 211, 255, 0.22)" },
  { value: "main_focus", label: "Main focus", accent: "rgba(255, 210, 143, 0.22)" },
  { value: "career", label: "Career", accent: "rgba(82, 214, 195, 0.22)" },
  { value: "relationships", label: "Relationships", accent: "rgba(248, 113, 113, 0.18)" },
  { value: "health", label: "Health", accent: "rgba(140, 242, 174, 0.2)" },
  { value: "hobbies", label: "Hobbies", accent: "rgba(214, 187, 251, 0.2)" },
  { value: "financial", label: "Financial chapter", accent: "rgba(255, 240, 163, 0.18)" }
];

export const TIMELINE_VIEW_OPTIONS = [
  { value: "1m", label: "1 month", months: 1 },
  { value: "1y", label: "1 year", months: 12 },
  { value: "5y", label: "5 years", months: 60 },
  { value: "20y", label: "20 years", months: 240 },
  { value: "life", label: "Whole life", months: 720 }
];

export function normalizeTimelineLane(value) {
  return TIMELINE_LANES.some((lane) => lane.value === value) ? value : TIMELINE_LANES[0].value;
}

export function getTimelineLaneMeta(value) {
  return TIMELINE_LANES.find((lane) => lane.value === normalizeTimelineLane(value)) ?? TIMELINE_LANES[0];
}

export function toMonthInputValue(dateISO) {
  return String(dateISO ?? "").slice(0, 7);
}

export function normalizeMonthInput(value) {
  const monthValue = String(value ?? "").trim().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(monthValue) ? `${monthValue}-01` : "";
}

export function getTimelineFrame(todayISO, viewKey) {
  const view = TIMELINE_VIEW_OPTIONS.find((option) => option.value === viewKey) ?? TIMELINE_VIEW_OPTIONS[1];
  const startISO = startOfMonthISO(todayISO);
  const endISO = addMonthsISO(startISO, view.months);

  return {
    view,
    startISO,
    endISO
  };
}

export function buildTimelineTicks(startISO, monthCount) {
  const tickCount = monthCount <= 12 ? monthCount : monthCount <= 60 ? 6 : monthCount <= 240 ? 8 : 10;
  const step = Math.max(1, Math.floor(monthCount / tickCount));
  const ticks = [];

  for (let offset = 0; offset < monthCount; offset += step) {
    ticks.push(addMonthsISO(startISO, offset));
  }

  const lastTick = addMonthsISO(startISO, monthCount - 1);
  if (ticks[ticks.length - 1] !== lastTick) {
    ticks.push(lastTick);
  }

  return ticks;
}

export function formatTimelineTick(dateISO, monthCount) {
  const options =
    monthCount <= 12
      ? { month: "short", year: "numeric" }
      : monthCount <= 60
        ? { month: "short", year: "2-digit" }
        : { year: "numeric" };

  return new Intl.DateTimeFormat(undefined, options).format(parseISODate(dateISO));
}

export function getBlockViewportStyle(block, frameStartISO, monthCount) {
  const frameStart = parseISODate(frameStartISO);
  const frameEnd = parseISODate(addMonthsISO(frameStartISO, monthCount));
  const blockStart = parseISODate(block.startMonth);
  const blockEnd = parseISODate(addMonthsISO(block.endMonth, 1));
  const visibleStart = blockStart < frameStart ? frameStart : blockStart;
  const visibleEnd = blockEnd > frameEnd ? frameEnd : blockEnd;

  if (visibleEnd <= frameStart || visibleStart >= frameEnd || visibleEnd <= visibleStart) {
    return null;
  }

  const totalMs = frameEnd.getTime() - frameStart.getTime();
  const left = ((visibleStart.getTime() - frameStart.getTime()) / totalMs) * 100;
  const width = ((visibleEnd.getTime() - visibleStart.getTime()) / totalMs) * 100;

  return {
    left: `${left}%`,
    width: `${width}%`
  };
}

export function formatTimelineRange(block) {
  const start = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(
    parseISODate(block.startMonth)
  );
  const end = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(
    parseISODate(block.endMonth)
  );
  return `${start} - ${end}`;
}

export function groupBlocksByLane(blocks) {
  const groups = new Map(TIMELINE_LANES.map((lane) => [lane.value, []]));

  for (const block of Array.isArray(blocks) ? blocks : []) {
    const lane = normalizeTimelineLane(block.lane);
    const items = groups.get(lane) ?? [];
    items.push(block);
    groups.set(lane, items);
  }

  return TIMELINE_LANES.map((lane) => ({
    lane,
    blocks: [...(groups.get(lane.value) ?? [])].sort((a, b) => a.startMonth.localeCompare(b.startMonth))
  }));
}

export function layoutTimelineLaneBlocks(blocks, frameStartISO, monthCount) {
  const rows = [];
  const visibleBlocks = [];

  for (const block of Array.isArray(blocks) ? blocks : []) {
    const style = getBlockViewportStyle(block, frameStartISO, monthCount);
    if (!style) continue;

    const start = parseFloat(style.left);
    const width = parseFloat(style.width);
    const end = start + width;

    let rowIndex = 0;
    while (rows[rowIndex] != null && start < rows[rowIndex]) {
      rowIndex += 1;
    }

    rows[rowIndex] = end;
    visibleBlocks.push({
      ...block,
      style,
      rowIndex,
      widthPercent: width
    });
  }

  return {
    rowCount: Math.max(rows.length, 1),
    blocks: visibleBlocks
  };
}
