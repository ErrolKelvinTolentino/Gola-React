export function addDays(date, amount) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + amount);
  return clone;
}

export function getDateKey(dateInput) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function prettyDate(dateKey) {
  if (!dateKey) return 'No deadline';
  const todayKey = getDateKey(new Date());
  if (dateKey === todayKey) return 'Today';
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function isTaskActiveOnDate(task, date) {
  const dateKey = getDateKey(date);
  const weekDay = new Date(`${dateKey}T00:00:00`).getDay();

  if (Array.isArray(task.postponedDates)) {
    const override = task.postponedDates.find((entry) => entry?.to === dateKey);
    if (override) return true;
    const skipped = task.postponedDates.find((entry) => entry?.from === dateKey);
    if (skipped) return false;
  }

  if (task.recurrenceType === 'daily') return true;
  if (task.recurrenceType === 'weekly') return Number(task.weeklyDay) === weekDay;
  if (task.recurrenceType === 'specific-days') return task.specificDays.includes(weekDay);
  return task.oneTimeDate === dateKey;
}

export function isTaskDoneForDate(task, date) {
  const dateKey = getDateKey(date);

  if (task.recurrenceType === 'one-time') {
    return task.completed;
  }

  return task.completedDates.includes(dateKey);
}

export function getGoalProgress(goal) {
  if (goal.tasks.length === 0) return 0;

  const completed = goal.tasks.filter((task) => {
    if (task.recurrenceType === 'one-time') return task.completed;
    return task.completedDates.length > 0;
  }).length;

  return Math.round((completed / goal.tasks.length) * 100);
}

export function getRecurrenceText(task, weekDays) {
  if (task.recurrenceType === 'daily') return 'Daily';
  if (task.recurrenceType === 'weekly') return `Weekly • ${weekDays[task.weeklyDay]}`;
  if (task.recurrenceType === 'specific-days') {
    return `Specific • ${task.specificDays.map((day) => weekDays[day]).join(', ')}`;
  }
  return `One-time • ${prettyDate(task.oneTimeDate)}`;
}

export function buildCalendarCells(goals, date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDay; i += 1) {
    cells.push({ day: '', dateKey: '' });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = getDateKey(new Date(date.getFullYear(), date.getMonth(), day));
    const currentDate = new Date(`${dateKey}T00:00:00`);
    const count = goals.reduce(
      (sum, goal) => sum + goal.tasks.filter((task) => isTaskActiveOnDate(task, currentDate)).length,
      0
    );
    cells.push({ day, dateKey, count });
  }

  return cells;
}
