function TasksPage({ activeTasksToday, today, isTaskDoneForDate, toggleTaskDoneForToday, getRecurrenceText, prettyDate }) {
  return (
    <section className="page page-enter">
      <h1>Tasks Active Today</h1>
      <p className="lead">Only tasks due today, across all goals, so you can execute without noise.</p>
      <div className="card premium-surface">
        <ul className="task-list interactive">
          {activeTasksToday.length === 0 && <li className="empty-row">No active tasks today.</li>}
          {activeTasksToday.map(({ goalId, goalName, task }) => {
            const done = isTaskDoneForDate(task, today);
            return (
              <li key={`${goalId}-${task.id}`} className={done ? 'done' : ''}>
                <label>
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggleTaskDoneForToday(goalId, task.id)}
                  />
                  <span>{task.title}</span>
                </label>
                <div className="task-meta">
                  <small>{goalName}</small>
                  <small>{getRecurrenceText(task)}</small>
                  <span className="deadline-pill">{prettyDate(task.deadline)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default TasksPage;
