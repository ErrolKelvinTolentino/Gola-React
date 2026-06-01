import { getGoalProgressWithLifecycle, isPhaseUnlocked, getPhaseUnlockCriteria } from './phaseUtils';

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
  if (!task) return false;
  const dateKey = getDateKey(date);
  const weekDay = new Date(`${dateKey}T00:00:00`).getDay();

  if (task._graduated) return false;

  if (task.endDate && dateKey > task.endDate) {
    return false;
  }
  if (task.targetCount && Array.isArray(task.completedDates) && task.completedDates.length >= task.targetCount) {
    return false;
  }

  if (Array.isArray(task.postponedDates)) {
    const skipped = task.postponedDates.find((entry) => entry?.from === dateKey);
    if (skipped) return false;
    const override = task.postponedDates.find((entry) => entry?.to === dateKey);
    if (override) return true;
  }

  if (task.recurrenceType === 'daily') return true;
  if (task.recurrenceType === 'weekly') return Number(task.weeklyDay) === weekDay;
  if (task.recurrenceType === 'specific-days') return task.specificDays.includes(weekDay);
  
  if (task.oneTimeDate) {
    return task.oneTimeDate === dateKey;
  }
  if (!task.completed) {
    return true;
  }
  return !!(task.updatedAt && task.updatedAt.split('T')[0] === dateKey);
}

export function isTaskDoneForDate(task, date) {
  if (!task) return false;
  if (task._graduated) return true;
  const dateKey = getDateKey(date);

  if (task.recurrenceType === 'one-time') {
    if (task.completionType === 'quantity') {
      return (task.currentValue || 0) >= (task.targetValue || 10);
    }
    if (task.completionType === 'duration') {
      return (task.currentValue || 0) >= (task.targetValue || 30);
    }
    if (task.completionType === 'subtasks') {
      return Array.isArray(task.subtasks) && task.subtasks.length > 0 && task.subtasks.every(s => s.completed);
    }
    if (task.completionType === 'scale') {
      return (task.currentValue || 0) > 0;
    }
    if (task.completionType === 'multistate') {
      return (task.currentValue === 3) || task.stateLabel === 'Done' || task.completed;
    }
    return task.completed;
  }

  if (task.completionType === 'quantity') {
    const dailyCount = task.dailyProgress?.[dateKey] || 0;
    const target = task.targetValue || 10;
    return dailyCount >= target;
  }
  if (task.completionType === 'duration') {
    const dailyTime = task.dailyProgress?.[dateKey] || 0;
    const target = task.targetValue || 30;
    return dailyTime >= target;
  }
  if (task.completionType === 'subtasks') {
    const subList = task.dailySubtasks?.[dateKey] || task.subtasks || [];
    return Array.isArray(subList) && subList.length > 0 && subList.every(s => s.completed);
  }
  if (task.completionType === 'scale') {
    const dailyVal = task.dailyProgress?.[dateKey] || 0;
    return dailyVal > 0;
  }
  if (task.completionType === 'multistate') {
    const dailyState = task.dailyProgress?.[dateKey];
    return dailyState === 3;
  }

  return Array.isArray(task.completedDates) && task.completedDates.includes(dateKey);
}

export function getGoalProgress(goal) {
  if (!goal?.tasks || goal.tasks.length === 0) return 0;

  if (goal.roadmap?.phases?.length > 0) {
    return getGoalProgressWithLifecycle(goal, new Date());
  }

  return getGoalProgressWithLifecycle(goal, new Date());
}

export function getGoalProgressDaily(goal) {
  const totalTasks = goal?.tasks?.length || 0;
  if (totalTasks === 0) return 0;
  const completedToday = goal.tasks.filter(
    (task) => task.completed || (task.completedDates || []).length > 0
  ).length;
  return Math.round((completedToday / totalTasks) * 100);
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
    
    let count = 0;
    let completedCount = 0;

    for (const goal of goals) {
      for (const task of goal.tasks) {
        if (isTaskActiveOnDate(task, currentDate)) {
          count++;
          if (isTaskDoneForDate(task, currentDate)) {
            completedCount++;
          }
        }
      }
    }

    cells.push({ day, dateKey, count, completedCount });
  }

  return cells;
}

export function getTaskLockStatus(task, goal, date) {
  if (!task || !goal) return { isLocked: false, reason: null };

  if (task.predecessorId) {
    const predTask = goal.tasks?.find(p => p.id === task.predecessorId);
    if (predTask && !isTaskDoneForDate(predTask, date)) {
      return { isLocked: true, reason: `Requires predecessor task: "${predTask.title}"` };
    }
  }

  if (goal.roadmap?.phases && Array.isArray(goal.roadmap.phases)) {
    const currentPhaseIndex = goal.roadmap.phases.findIndex(p => p.id === task.phaseId || p.tasks?.some(pt => pt.id === task.id));
    if (currentPhaseIndex > 0) {
      const phase = goal.roadmap.phases[currentPhaseIndex];
      if (!isPhaseUnlocked(phase, goal)) {
        const reason = getPhaseUnlockCriteria(phase, goal) || 'Phase is locked';
        return { isLocked: true, reason };
      }
    }
  }

  return { isLocked: false, reason: null };
}