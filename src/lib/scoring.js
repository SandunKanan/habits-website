import { daysBetweenISO } from "./date.js";

/**
 * MVP scoring:
 * - intervalDays = habit.everyXDays
 * - daysSinceLastDone = if never done => intervalDays (treat as "due now" baseline)
 * - behindRatio = daysSinceLastDone / intervalDays
 * - priorityScore = behindRatio * importance
 *
 * This already ensures:
 * - if importance equal -> more behind wins (higher ratio)
 * - higher importance usually wins even if less behind
 * - but very-behind can outrank a bit-more-important (the "malleability" you mentioned)
 */
export function scoreHabitForToday({ habit, lastDoneISO, todayISO }) {
  const intervalDays = Math.max(1, Number(habit.everyXDays) || 1);

  const daysSinceLastDone =
    lastDoneISO ? daysBetweenISO(lastDoneISO, todayISO) : intervalDays;

  const behindRatio = daysSinceLastDone / intervalDays;
  const rawImportance = Number(habit.importance);
  const importance = Number.isFinite(rawImportance) ? Math.max(0, rawImportance) : 1;

  const priorityScore = behindRatio * importance;

  const due = importance > 0 && daysSinceLastDone >= intervalDays;
  const overdueDays = due ? Math.max(0, daysSinceLastDone - intervalDays) : 0;

  return {
    intervalDays,
    daysSinceLastDone,
    overdueDays,
    behindRatio,
    importance,
    priorityScore,
    due
  };
}
