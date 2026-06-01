// Phase & Task Lifecycle Utilities

export function getTaskLifecycleProgress(task) {
  if (!task) return 0;
  if (task.recurrenceType === 'one-time') {
    return task.completed ? 100 : 0;
  }
  
  if (task.targetCount > 0) {
    const completed = Array.isArray(task.completedDates) ? task.completedDates.length : 0;
    return Math.min(100, Math.round((completed / task.targetCount) * 100));
  }
  
  // If no targetCount but has completedDates, return something > 0
  const completed = Array.isArray(task.completedDates) ? task.completedDates.length : 0;
  return completed > 0 ? 100 : 0; // Or keep at 0 for continuous habits
}

export function isTaskGraduated(task) {
  if (!task) return false;
  if (task._graduated) return true;
  if (task.recurrenceType === 'one-time') return false;
  
  if (task.targetCount > 0) {
    const completed = Array.isArray(task.completedDates) ? task.completedDates.length : 0;
    return completed >= task.targetCount;
  }
  return false;
}

export function shouldGraduateTask(task) {
  if (!task) return false;
  return !task._graduated && task.recurrenceType !== 'one-time' && task.targetCount > 0 && 
         (Array.isArray(task.completedDates) ? task.completedDates.length : 0) >= task.targetCount;
}

export function getPhaseProgress(phase, goal) {
  if (!phase || !goal) return 0;
  
  const phaseTasks = goal.tasks?.filter(t => t.phaseId === phase.id) || [];
  if (phaseTasks.length === 0) return 0;

  let totalScore = 0;
  for (const t of phaseTasks) {
    if (t.recurrenceType === 'one-time') {
      totalScore += t.completed ? 100 : 0;
    } else {
      totalScore += getTaskLifecycleProgress(t);
    }
  }
  
  return Math.round(totalScore / phaseTasks.length);
}

export function isPhaseComplete(phase, goal) {
  if (!phase || !goal) return false;
  
  const phaseTasks = goal.tasks?.filter(t => t.phaseId === phase.id) || [];
  if (phaseTasks.length === 0) return false;

  for (const t of phaseTasks) {
    if (t.recurrenceType === 'one-time') {
      if (!t.completed) return false;
    } else {
      if (t.targetCount > 0) {
        if (!isTaskGraduated(t)) return false;
      } else {
        // If it's an ongoing habit without targetCount, require at least one completion
        const completedDates = Array.isArray(t.completedDates) ? t.completedDates : [];
        if (completedDates.length === 0) return false;
      }
    }
  }
  return true;
}

export function isPhaseUnlocked(phase, goal) {
  if (!goal?.roadmap?.phases || goal.roadmap.phases.length === 0) return true;
  
  const phaseIndex = goal.roadmap.phases.findIndex(p => p.id === phase.id);
  if (phaseIndex <= 0) return true; // First phase or not found is always unlocked
  
  // All previous phases must be complete
  for (let i = 0; i < phaseIndex; i++) {
    const prevPhase = goal.roadmap.phases[i];
    if (!isPhaseComplete(prevPhase, goal)) return false;
  }
  return true;
}

export function getPhaseUnlockCriteria(phase, goal) {
  if (isPhaseUnlocked(phase, goal)) return null;
  const phaseIndex = goal.roadmap.phases.findIndex(p => p.id === phase.id);
  
  // Find the first incomplete preceding phase
  for (let i = 0; i < phaseIndex; i++) {
    const prevPhase = goal.roadmap.phases[i];
    if (!isPhaseComplete(prevPhase, goal)) {
      return `Requires completion of Phase ${i + 1}: ${prevPhase.label}`;
    }
  }
  return `Phase locked`;
}

export function getGoalProgressWithLifecycle(goal) {
  if (!goal?.roadmap?.phases || goal.roadmap.phases.length === 0) {
    // If no phases, fallback to traditional method or 0
    return 0; 
  }
  
  let totalScore = 0;
  for (const phase of goal.roadmap.phases) {
    totalScore += getPhaseProgress(phase, goal);
  }
  
  return Math.round(totalScore / goal.roadmap.phases.length);
}
