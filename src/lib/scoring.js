import { daysBetweenISO } from "./date.js";
import {
  formatFrequencyLabel,
  getApproximateIntervalDays,
  getNextDueISO,
  getQuotaProgress,
  normalizeFrequency
} from "./frequency.js";
import { normalizeImportanceValue } from "./importance.js";

/**
 * Scheduling and scoring:
 * - interval habits become due when their next due date arrives
 * - quota habits become due when they fall behind the current week/month pace
 */
export function scoreHabitForToday({ habit, lastDoneISO, todayISO }) {
  const importance = normalizeImportanceValue(habit.importance);
  const frequency = normalizeFrequency(habit);
  const doneDates = Array.isArray(habit.doneDates) ? habit.doneDates : [];

  if (frequency.frequencyMode === "quota") {
    const progress = getQuotaProgress(doneDates, frequency, todayISO);
    const behindCount = Math.max(0, progress.targetByNow - progress.completedCount);
    const due = importance > 0 && behindCount > 0;
    const priorityScore = importance * (1 + behindCount + progress.targetByNow * 0.1);

    return {
      intervalDays: null,
      daysSinceLastDone: lastDoneISO ? daysBetweenISO(lastDoneISO, todayISO) : null,
      overdueDays: 0,
      behindRatio: due ? behindCount : 0,
      importance,
      priorityScore,
      due,
      frequencyLabel: formatFrequencyLabel(habit),
      statusLabel: due
        ? `Behind pace: ${progress.completedCount}/${progress.targetCount} this ${frequency.frequencyUnit}`
        : `On pace: ${progress.completedCount}/${progress.targetCount} this ${frequency.frequencyUnit}`
    };
  }

  const intervalDays = getApproximateIntervalDays(frequency);
  const daysSinceLastDone = lastDoneISO ? daysBetweenISO(lastDoneISO, todayISO) : intervalDays;
  const behindRatio = daysSinceLastDone / intervalDays;
  const nextDueISO = getNextDueISO(lastDoneISO, frequency);
  const due = importance > 0 && (!lastDoneISO || todayISO >= nextDueISO);
  const overdueDays =
    due && nextDueISO ? Math.max(0, daysBetweenISO(nextDueISO, todayISO) ?? 0) : 0;

  const priorityScore = behindRatio * importance;

  return {
    intervalDays,
    daysSinceLastDone,
    overdueDays,
    behindRatio,
    importance,
    priorityScore,
    due,
    frequencyLabel: formatFrequencyLabel(habit),
    statusLabel: due ? (overdueDays > 0 ? `Behind ${overdueDays}d` : "Due today") : "On schedule"
  };
}
