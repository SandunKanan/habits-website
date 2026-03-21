export function computeHabitsSyncPlan({
  normalizedHabits,
  userId,
  existingHabitRows,
  currentHabitRows,
  existingCompletionRows,
  existingSkipRows
}) {
  const existingSlugSet = new Set(existingHabitRows.map((row) => row.slug));
  const nextSlugSet = new Set(normalizedHabits.map((habit) => habit.slug ?? habit.id));
  const habitIdBySlug = new Map(currentHabitRows.map((row) => [row.slug, row.id]));

  const existingCompletionMap = new Map(
    existingCompletionRows.map((row) => [`${row.habit_id}:${row.completed_on}`, row])
  );
  const existingSkipMap = new Map(
    existingSkipRows.map((row) => [`${row.habit_id}:${row.skipped_on}`, row])
  );

  const desiredCompletionMap = new Map();
  const desiredSkipMap = new Map();

  for (const habit of normalizedHabits) {
    const habitSlug = habit.slug ?? habit.id;
    const habitId = habitIdBySlug.get(habitSlug);
    if (!habitId) continue;

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
    habitSlugsToDelete: [...existingSlugSet].filter((slug) => !nextSlugSet.has(slug)),
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
