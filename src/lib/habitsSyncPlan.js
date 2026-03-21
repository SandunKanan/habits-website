export function computeHabitsSyncPlan({
  normalizedHabits,
  userId,
  existingHabitRows,
  existingCompletionRows,
  existingSkipRows
}) {
  const existingHabitIdSet = new Set(existingHabitRows.map((row) => row.id));
  const nextHabitIdSet = new Set(normalizedHabits.map((habit) => habit.id));

  const existingCompletionMap = new Map(
    existingCompletionRows.map((row) => [`${row.habit_id}:${row.completed_on}`, row])
  );
  const existingSkipMap = new Map(
    existingSkipRows.map((row) => [`${row.habit_id}:${row.skipped_on}`, row])
  );

  const desiredCompletionMap = new Map();
  const desiredSkipMap = new Map();

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
      .map(([, value]) => value)
  };
}
