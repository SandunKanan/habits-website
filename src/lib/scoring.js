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

  if (frequency.frequencyMode === "quota") {
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
    const parScore = Math.max(0, expectedCompletions - completionsInWindow);
    const due = importance > 0 && parScore >= 1;
    const priorityScore = importance * parScore;

    return {
      intervalDays: null,
      nextDueISO: null,
      daysSinceLastDone: lastDoneISO ? daysBetweenISO(lastDoneISO, todayISO) : null,
      overdueDays: 0,
      behindRatio: parScore,
      importance,
      parScore,
      priorityScore,
      due,
      frequencyLabel: formatFrequencyLabel(habit),
      statusLabel: due ? (parScore > 1 ? "Behind par" : "Due today") : "On schedule"
    };
  }

  const intervalDays = getApproximateIntervalDays(frequency);
  const daysSinceLastDone = lastDoneISO ? daysBetweenISO(lastDoneISO, todayISO) : intervalDays;
  const behindRatio = daysSinceLastDone / intervalDays;
  const parScore = behindRatio;
  const nextDueISO = getNextDueISO(lastDoneISO, frequency);
  const due = importance > 0 && (!lastDoneISO || todayISO >= nextDueISO);
  const overdueDays =
    due && nextDueISO ? Math.max(0, daysBetweenISO(nextDueISO, todayISO) ?? 0) : 0;

  const priorityScore = parScore * importance;

  return {
    intervalDays,
    nextDueISO,
    daysSinceLastDone,
    overdueDays,
    behindRatio,
    importance,
    parScore,
    priorityScore,
    due,
    frequencyLabel: formatFrequencyLabel(habit),
    statusLabel: due ? (parScore > 1 ? "Behind par" : "Due today") : "On schedule"
  };
}
