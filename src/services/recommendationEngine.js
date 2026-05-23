const ENERGY_MATCH_BONUS = 30;
const DEADLINE_BONUS = 50;
const DEFAULT_SCORE = 10;

export function getRecommendedTask(tasks, userEnergy, currentHour) {
  if (!Array.isArray(tasks) || tasks.length === 0) return null;

  const hour = typeof currentHour === 'number' ? currentHour : new Date().getHours();
  const energy = userEnergy || 'Medium';

  const scored = tasks.map((task) => {
    const score =
      DEFAULT_SCORE +
      (task.deadline ? DEADLINE_BONUS : 0) +
      (task.energy === energy ? ENERGY_MATCH_BONUS : 0) +
      (hour < 12 && task.energy === 'High' ? 10 : 0) +
      (hour >= 18 && task.energy === 'Low' ? 10 : 0);

    return { task, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.task || null;
}
