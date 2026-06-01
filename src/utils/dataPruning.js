/**
 * Data pruning utilities to prevent localStorage bloat.
 * Call pruneGoalData periodically (e.g. on app startup or daily rollover).
 */

/**
 * Returns a date key N days ago from today.
 */
function daysAgoKey(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Prunes a dailyProgress or dailySubtasks map to only include
 * keys within the last `retentionDays` days.
 */
function pruneMap(map, retentionDays = 90) {
  if (!map || typeof map !== 'object') return {};
  const cutoff = daysAgoKey(retentionDays);
  const pruned = {};
  for (const [key, value] of Object.entries(map)) {
    if (key >= cutoff) {
      pruned[key] = value;
    }
  }
  return pruned;
}

/**
 * Prunes all goals' tasks to remove old dailyProgress and dailySubtasks entries.
 * @param {Array} goals - array of goal objects
 * @param {number} retentionDays - days to retain (default 90)
 * @returns {Array} pruned goals array
 */
export function pruneGoalData(goals, retentionDays = 90) {
  if (!Array.isArray(goals)) return goals;

  return goals.map(goal => {
    if (!Array.isArray(goal.tasks)) return goal;

    const prunedTasks = goal.tasks.map(task => {
      const updates = {};

      if (task.dailyProgress && Object.keys(task.dailyProgress).length > 0) {
        const pruned = pruneMap(task.dailyProgress, retentionDays);
        if (Object.keys(pruned).length < Object.keys(task.dailyProgress).length) {
          updates.dailyProgress = pruned;
        }
      }

      if (task.dailySubtasks && Object.keys(task.dailySubtasks).length > 0) {
        const pruned = pruneMap(task.dailySubtasks, retentionDays);
        if (Object.keys(pruned).length < Object.keys(task.dailySubtasks).length) {
          updates.dailySubtasks = pruned;
        }
      }

      if (task.postponedDates && Array.isArray(task.postponedDates)) {
        const cutoff = daysAgoKey(retentionDays);
        const pruned = task.postponedDates.filter(e => e?.from >= cutoff || e?.to >= cutoff);
        if (pruned.length < task.postponedDates.length) {
          updates.postponedDates = pruned;
        }
      }

      if (Object.keys(updates).length > 0) {
        return { ...task, ...updates };
      }
      return task;
    });

    return { ...goal, tasks: prunedTasks };
  });
}

/**
 * Run pruning only if it hasn't been run today (stored in localStorage).
 */
export function runDailyPruneIfNeeded(goals, setGoals, persistGoals) {
  const today = new Date().toISOString().slice(0, 10);
  const lastPrune = localStorage.getItem('gola.lastPruneDate');
  if (lastPrune === today) return;

  const pruned = pruneGoalData(goals);

  const hasChanges = JSON.stringify(pruned) !== JSON.stringify(goals);
  if (hasChanges) {
    console.log('[DataPruning] Pruning old dailyProgress/dailySubtasks entries...');
    setGoals(pruned);
    persistGoals(pruned);
  }

  localStorage.setItem('gola.lastPruneDate', today);
}
