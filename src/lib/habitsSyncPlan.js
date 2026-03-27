export function computeHabitsSyncPlan({
  normalizedHabits,
  userId,
  existingHabitRows,
  existingCompletionRows,
  existingSkipRows,
  existingAttributeLinkRows
}) {
  const existingHabitIdSet = new Set(existingHabitRows.map((row) => row.id));
  const nextHabitIdSet = new Set(normalizedHabits.map((habit) => habit.id));

  const existingCompletionMap = new Map(
    existingCompletionRows.map((row) => [`${row.habit_id}:${row.completed_on}`, row])
  );
  const existingSkipMap = new Map(
    existingSkipRows.map((row) => [`${row.habit_id}:${row.skipped_on}`, row])
  );
  const existingAttributeLinkMap = new Map(
    existingAttributeLinkRows.map((row) => [`${row.habit_id}:${row.attribute_id}`, row])
  );

  const desiredCompletionMap = new Map();
  const desiredSkipMap = new Map();
  const desiredAttributeLinkMap = new Map();

  for (const habit of normalizedHabits) {
    const habitId = habit.id;

    for (const completedOn of habit.doneDates) {
      desiredCompletionMap.set(`${habitId}:${completedOn}`, {
        user_id: userId,
        habit_id: habitId,
        completed_on: completedOn
      });
    }

    for (const skippedOn of habit.skippedDates) {
      desiredSkipMap.set(`${habitId}:${skippedOn}`, {
        user_id: userId,
        habit_id: habitId,
        skipped_on: skippedOn
      });
    }

    for (const link of Array.isArray(habit.attributeLinks) ? habit.attributeLinks : []) {
      desiredAttributeLinkMap.set(`${habitId}:${link.attributeId}`, {
        user_id: userId,
        habit_id: habitId,
        attribute_id: link.attributeId,
        weight: link.weight
      });
    }
  }

  return {
    habitIdsToDelete: [...existingHabitIdSet].filter((habitId) => !nextHabitIdSet.has(habitId)),
    completionIdsToDelete: existingCompletionRows
      .filter((row) => !desiredCompletionMap.has(`${row.habit_id}:${row.completed_on}`))
      .map((row) => row.id),
    completionRowsToInsert: [...desiredCompletionMap.entries()]
      .filter(([key]) => !existingCompletionMap.has(key))
      .map(([, value]) => value),
    skipIdsToDelete: existingSkipRows
      .filter((row) => !desiredSkipMap.has(`${row.habit_id}:${row.skipped_on}`))
      .map((row) => row.id),
    skipRowsToInsert: [...desiredSkipMap.entries()]
      .filter(([key]) => !existingSkipMap.has(key))
      .map(([, value]) => value),
    attributeLinkIdsToDelete: existingAttributeLinkRows
      .filter((row) => !desiredAttributeLinkMap.has(`${row.habit_id}:${row.attribute_id}`))
      .map((row) => row.id),
    attributeLinkRowsToInsert: [...desiredAttributeLinkMap.entries()]
      .filter(([key, value]) => {
        const existing = existingAttributeLinkMap.get(key);
        if (!existing) return true;
        return Number(existing.weight) !== Number(value.weight);
      })
      .map(([, value]) => value)
  };
}
