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

  // Habit Lifespan Limits
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
  
  // One-time task scheduling
  if (task.oneTimeDate) {
    return task.oneTimeDate === dateKey;
  }
  // If unscheduled (Later), active if not completed, or active on the day of completion
  if (!task.completed) {
    return true;
  }
  return !!(task.updatedAt && task.updatedAt.split('T')[0] === dateKey);
}

export function isTaskDoneForDate(task, date) {
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

  // Recurring tasks
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
  if (!goal.tasks || goal.tasks.length === 0) return 0;

  const today = new Date();
  let totalScore = 0;

  for (const task of goal.tasks) {
    if (task.recurrenceType === 'one-time') {
      if (task.completionType === 'quantity') {
        const target = task.targetValue || 10;
        totalScore += Math.min(1, (task.currentValue || 0) / target);
      } else if (task.completionType === 'duration') {
        const target = task.targetValue || 30;
        totalScore += Math.min(1, (task.currentValue || 0) / target);
      } else if (task.completionType === 'subtasks') {
        const subList = task.subtasks || [];
        if (subList.length > 0) {
          const completedSub = subList.filter(s => s.completed).length;
          totalScore += completedSub / subList.length;
        } else {
          totalScore += task.completed ? 1 : 0;
        }
      } else if (task.completionType === 'scale') {
        totalScore += (task.currentValue || 0) > 0 ? 1 : 0;
      } else if (task.completionType === 'multistate') {
        totalScore += (task.currentValue === 3 || task.completed) ? 1 : 0;
      } else {
        totalScore += task.completed ? 1 : 0;
      }
    } else {
      let activeCount = 0;
      let completedCount = 0;
      
      for (let i = 0; i < 14; i++) {
        const d = addDays(today, -i);
        if (isTaskActiveOnDate(task, d)) {
          activeCount++;
          if (isTaskDoneForDate(task, d)) {
            completedCount++;
          }
        }
      }
      
      if (activeCount > 0) {
        totalScore += completedCount / activeCount;
      } else {
        totalScore += (task.completedDates && task.completedDates.length > 0) ? 1 : 0;
      }
    }
  }

  return Math.round((totalScore / goal.tasks.length) * 100);
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

  // 1. Task-level predecessor check
  if (task.predecessorId) {
    const predTask = goal.tasks?.find(p => p.id === task.predecessorId);
    if (predTask && !isTaskDoneForDate(predTask, date)) {
      return { isLocked: true, reason: `Requires predecessor task: "${predTask.title}"` };
    }
  }

  // 2. Phase sequentiality check
  if (goal.roadmap?.phases && Array.isArray(goal.roadmap.phases)) {
    const currentPhaseIndex = goal.roadmap.phases.findIndex(p => p.id === task.phaseId || p.tasks?.some(pt => pt.id === task.id));
    if (currentPhaseIndex > 0) {
      // Check all preceding phases
      for (let i = 0; i < currentPhaseIndex; i++) {
        const precedingPhase = goal.roadmap.phases[i];
        if (!isPhaseCompleted(precedingPhase, goal, date)) {
          return { isLocked: true, reason: `Requires preceding phase "${precedingPhase.label}" to be completed` };
        }
      }
    }
  }

  return { isLocked: false, reason: null };
}

export function isPhaseCompleted(phase, goal, date) {
  if (!phase || !goal) return false;
  
  // Find tasks associated with this phase
  const phaseTasks = goal.tasks?.filter(t => t.phaseId === phase.id || phase.tasks?.some(pt => pt.id === t.id)) || [];
  if (phaseTasks.length === 0) return false;

  for (const t of phaseTasks) {
    if (t.recurrenceType === 'one-time') {
      if (!t.completed) return false;
    } else {
      // Recurring tasks are completed for the phase if they have been completed at least once
      const completedDates = Array.isArray(t.completedDates) ? t.completedDates : [];
      if (completedDates.length === 0) return false;
    }
  }
  return true;
}
