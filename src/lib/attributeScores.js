import { daysBetweenISO } from "./date.js";
import { getDoneDates } from "./habitUtils.js";

export function getHabitAttributeGains(habit, attributes) {
  const safeLinks = Array.isArray(habit?.attributeLinks) ? habit.attributeLinks : [];
  const safeAttributes = Array.isArray(attributes) ? attributes : [];

  return safeLinks
    .map((link) => {
      const attribute = safeAttributes.find((item) => item.id === link.attributeId);
      const weight = Number(link.weight);
      if (!attribute || !Number.isFinite(weight) || weight <= 0) {
        return null;
      }

      return {
        attributeId: attribute.id,
        attributeName: attribute.name,
        weight
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.weight - a.weight || a.attributeName.localeCompare(b.attributeName));
}

export function buildTodayAttributeGainSummary(habits, attributes) {
  const totals = new Map();

  for (const habit of Array.isArray(habits) ? habits : []) {
    for (const gain of getHabitAttributeGains(habit, attributes)) {
      const current = totals.get(gain.attributeId);
      if (current) {
        current.weight += gain.weight;
      } else {
        totals.set(gain.attributeId, {
          attributeId: gain.attributeId,
          attributeName: gain.attributeName,
          weight: gain.weight
        });
      }
    }
  }

  return [...totals.values()].sort(
    (a, b) => b.weight - a.weight || a.attributeName.localeCompare(b.attributeName)
  );
}

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
