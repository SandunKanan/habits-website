import { addDaysISO, daysBetweenISO } from "./date.js";
import {
  formatFrequencyLabel,
  getApproximateIntervalDays,
  getFrequencyRatePerDay,
  getNextDueISO,
  normalizeFrequency
} from "./frequency.js";
import { normalizeImportanceValue } from "./importance.js";

/**
 * Scheduling and scoring:
 * - interval habits become due when their next due date arrives
 * - rate habits accrue toward par each day and each completion lowers the score by 1
 */
export function scoreHabitForToday({ habit, lastDoneISO, todayISO }) {
  const importance = normalizeImportanceValue(habit.importance);
  const frequency = normalizeFrequency(habit);
  const doneDates = Array.isArray(habit.doneDates) ? habit.doneDates : [];
  const createdDateISO = habit.createdAt?.slice?.(0, 10) ?? todayISO;

  if (frequency.frequencyMode === "rate") {
    const ratePerDay = getFrequencyRatePerDay(frequency);
    const expectedIntervalDays = 1 / ratePerDay;
    const windowDays = Math.min(21, Math.max(7, Math.round(expectedIntervalDays * 7)));
    const fullWindowStartISO = addDaysISO(todayISO, -(windowDays - 1));
    const windowStartISO = createdDateISO > fullWindowStartISO ? createdDateISO : fullWindowStartISO;
    const activeWindowDays = Math.max(1, (daysBetweenISO(windowStartISO, todayISO) ?? 0) + 1);
    const completionsInWindow = doneDates.filter(
      (dateISO) => dateISO >= windowStartISO && dateISO <= todayISO
    ).length;
    const expectedCompletions = Math.max(1, activeWindowDays * ratePerDay);
    const trackingScore = Math.max(0, expectedCompletions - completionsInWindow);
    const due = importance > 0 && trackingScore >= 1;
    const priorityScore = importance * trackingScore;

    return {
      intervalDays: null,
      nextDueISO: null,
      daysSinceLastDone: lastDoneISO ? daysBetweenISO(lastDoneISO, todayISO) : null,
      overdueDays: 0,
      trackingRatio: trackingScore,
      importance,
      trackingScore,
      priorityScore,
      due,
      frequencyLabel: formatFrequencyLabel(habit),
      statusLabel: due ? (trackingScore > 1 ? "Behind par" : "Due today") : "On schedule"
    };
  }

  const intervalDays = getApproximateIntervalDays(frequency);
  const daysSinceLastDone = lastDoneISO ? daysBetweenISO(lastDoneISO, todayISO) : intervalDays;
  const trackingRatio = daysSinceLastDone / intervalDays;
  const trackingScore = trackingRatio;
  const nextDueISO = getNextDueISO(lastDoneISO, frequency);
  const due = importance > 0 && (!lastDoneISO || todayISO >= nextDueISO);
  const overdueDays =
    due && nextDueISO ? Math.max(0, daysBetweenISO(nextDueISO, todayISO) ?? 0) : 0;

  const priorityScore = trackingScore * importance;

  return {
    intervalDays,
    nextDueISO,
    daysSinceLastDone,
    overdueDays,
    trackingRatio,
    importance,
    trackingScore,
    priorityScore,
    due,
    frequencyLabel: formatFrequencyLabel(habit),
    statusLabel: due ? (trackingScore > 1 ? "Behind par" : "Due today") : "On schedule"
  };
}
