import { addDays, getDateKey, isTaskActiveOnDate, isTaskDoneForDate } from './dateUtils';

export function rolloverIncompleteTasks(goals, fromDate, toDate) {
  const fromKey = getDateKey(fromDate);
  const toKey = getDateKey(toDate);

  let didUpdate = false;
  const nextGoals = goals.map((goal) => {
    const nextTasks = goal.tasks.map((task) => {
      const isActive = isTaskActiveOnDate(task, fromDate, goal);
      const isDone = isTaskDoneForDate(task, fromDate);

      if (!isActive || isDone) return task;

      didUpdate = true;
      const postponedDates = Array.isArray(task.postponedDates) ? [...task.postponedDates] : [];
      postponedDates.push({ from: fromKey, to: toKey });

      if (task.recurrenceType === 'one-time' && task.oneTimeDate === fromKey) {
        return {
          ...task,
          oneTimeDate: toKey,
          completed: false,
          postponedDates,
          updatedAt: new Date().toISOString()
        };
      }

      return {
        ...task,
        postponedDates,
        updatedAt: new Date().toISOString()
      };
    });

    return { ...goal, tasks: nextTasks };
  });

  return {
    goals: nextGoals,
    didUpdate,
    fromDate,
    toDate
  };
}

export function getNextMidnight(date = new Date()) {
  const next = new Date(date);
  next.setHours(24, 0, 0, 0);
  return next;
}

export function getYesterday(date = new Date()) {
  return addDays(date, -1);
}
