import { daysBetweenISO } from "./date.js";
import { getDoneDates } from "./habitUtils.js";

export function buildAttributeSummaries(attributes, habits, todayISO) {
  const safeAttributes = Array.isArray(attributes) ? attributes : [];
  const safeHabits = Array.isArray(habits) ? habits : [];

  return safeAttributes.map((attribute) => {
    const decayRate = Number(attribute.decayRate ?? 0);
    const contributors = safeHabits
      .map((habit) => {
        const links = Array.isArray(habit.attributeLinks) ? habit.attributeLinks : [];
        const link = links.find((item) => item.attributeId === attribute.id);
        if (!link) return null;

        const weight = Number(link.weight);
        const completionDates = getDoneDates(habit);
        const contribution = completionDates.reduce((sum, completedOn) => {
          const ageInDays = Math.max(0, daysBetweenISO(completedOn, todayISO) ?? 0);
          const decayedContribution =
            decayRate > 0 ? Math.max(0, weight - decayRate * ageInDays) : weight;
          return sum + decayedContribution;
        }, 0);

        return {
          habitId: habit.id,
          habitName: habit.name,
          completionCount: completionDates.length,
          weight,
          contribution
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.contribution - a.contribution || a.habitName.localeCompare(b.habitName));

    const score = contributors.reduce((sum, contributor) => sum + contributor.contribution, 0);

    return {
      attribute,
      score,
      decayRate,
      linkedHabitCount: contributors.length,
      contributors
    };
  });
}
