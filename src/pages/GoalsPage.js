import { getGoalProgress } from '../utils/dateUtils';

function GoalTaskForm({ goalId, form, updateTaskForm, addTaskToGoal, toggleSpecificDay, weekDays }) {
  return (
    <form className="task-form" onSubmit={(event) => addTaskToGoal(goalId, event)}>
      <div className="section-head">
        <h3>Add Task</h3>
        <p>Compose one-time or recurring actions for this goal.</p>
      </div>

      <input
        type="text"
        placeholder="Task name"
        value={form.title}
        onChange={(event) => updateTaskForm(goalId, { title: event.target.value })}
        required
      />

      <div className="task-form-row">
        <label>
          Recurrence
          <select
            value={form.recurrenceType}
            onChange={(event) => updateTaskForm(goalId, { recurrenceType: event.target.value })}
          >
            <option value="one-time">One-time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="specific-days">Specific days</option>
          </select>
        </label>

        <label>
          Deadline
          <input
            type="date"
            value={form.deadline}
            onChange={(event) => updateTaskForm(goalId, { deadline: event.target.value })}
          />
        </label>
      </div>

      {form.recurrenceType === 'one-time' && (
        <label>
          Task date
          <input
            type="date"
            value={form.oneTimeDate}
            onChange={(event) => updateTaskForm(goalId, { oneTimeDate: event.target.value })}
          />
        </label>
      )}

      {form.recurrenceType === 'weekly' && (
        <label>
          Weekly on
          <select
            value={form.weeklyDay}
            onChange={(event) => updateTaskForm(goalId, { weeklyDay: Number(event.target.value) })}
          >
            {weekDays.map((day, dayIndex) => (
              <option key={day} value={dayIndex}>{day}</option>
            ))}
          </select>
        </label>
      )}

      {form.recurrenceType === 'specific-days' && (
        <div className="week-picker">
          {weekDays.map((day, dayIndex) => (
            <button
              key={day}
              type="button"
              className={form.specificDays.includes(dayIndex) ? 'day-chip active' : 'day-chip'}
              onClick={() => toggleSpecificDay(goalId, dayIndex)}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      <button className="primary-btn" type="submit">Add Task</button>
    </form>
  );
}

function GoalsPage({
  goals,
  selectedGoal,
  selectedGoalId,
  setSelectedGoalId,
  allTaskCount,
  getTaskForm,
  updateTaskForm,
  addTaskToGoal,
  toggleSpecificDay,
  weekDays,
  isTaskActiveOnDate,
  isTaskDoneForDate,
  toggleTaskDoneForToday,
  getRecurrenceText,
  prettyDate,
  today,
  isGoalModalOpen,
  openGoalModal,
  closeGoalModal,
  goalName,
  setGoalName,
  goalVision,
  setGoalVision,
  addGoal
}) {
  return (
    <section className="page page-enter goals-page">
      <div className="goals-head">
        <div>
          <h1>Goals Workspace</h1>
          <p className="lead">Select a goal to plan tasks, cadence, and execution details.</p>
        </div>
        <div className="goals-summary card">
          <strong>{goals.length}</strong>
          <span>Goals</span>
          <strong>{allTaskCount}</strong>
          <span>Tasks</span>
        </div>
      </div>

      <div className="goal-layout premium-layout">
        <aside className="card goal-list-pane premium-surface">
          <div className="section-head compact">
            <h3>Your Goals</h3>
            <p>Pick one to open details.</p>
          </div>
          {goals.map((goal) => {
            const progress = getGoalProgress(goal);
            return (
              <button
                key={goal.id}
                type="button"
                className={selectedGoalId === goal.id ? 'goal-nav active' : 'goal-nav'}
                onClick={() => setSelectedGoalId(goal.id)}
              >
                <div className="goal-nav-top">
                  <strong>{goal.name}</strong>
                  <span>{progress}%</span>
                </div>
                <small>{goal.tasks.length} tasks</small>
                <div className="goal-progress">
                  <div style={{ width: `${progress}%` }} />
                </div>
              </button>
            );
          })}
        </aside>

        <div className="card goal-detail-pane premium-surface">
          {!selectedGoal && <p>Select a goal to view its tasks.</p>}
          {selectedGoal && (
            <>
              <div className="goal-head">
                <h2>{selectedGoal.name}</h2>
                <p>{selectedGoal.vision}</p>
              </div>

              <GoalTaskForm
                goalId={selectedGoal.id}
                form={getTaskForm(selectedGoal.id)}
                updateTaskForm={updateTaskForm}
                addTaskToGoal={addTaskToGoal}
                toggleSpecificDay={toggleSpecificDay}
                weekDays={weekDays}
              />

              <div className="section-head compact">
                <h3>Tasks in Goal</h3>
                <p>Mark progress for today directly from this view.</p>
              </div>

              <ul className="task-list interactive">
                {selectedGoal.tasks.length === 0 && <li className="empty-row">No tasks yet for this goal.</li>}
                {selectedGoal.tasks.map((task) => {
                  const activeToday = isTaskActiveOnDate(task, today);
                  const doneToday = isTaskDoneForDate(task, today);
                  return (
                    <li key={task.id} className={doneToday ? 'done' : ''}>
                      <label>
                        <input
                          type="checkbox"
                          checked={doneToday}
                          onChange={() => toggleTaskDoneForToday(selectedGoal.id, task.id)}
                        />
                        <span>{task.title}</span>
                      </label>
                      <div className="task-meta">
                        <small>{getRecurrenceText(task)}</small>
                        <span className={activeToday ? 'status-pill live' : 'status-pill'}>
                          {activeToday ? 'Active today' : 'Not today'}
                        </span>
                        <span className="deadline-pill">{prettyDate(task.deadline)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      <button type="button" className="fab-goal" onClick={openGoalModal} aria-label="Add goal">
        +
      </button>

      {isGoalModalOpen && (
        <div className="modal-backdrop" onClick={closeGoalModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Create New Goal</h3>
            <p>Define your target, then start attaching actionable tasks.</p>
            <form className="modal-form" onSubmit={addGoal}>
              <label>
                Goal name
                <input
                  type="text"
                  placeholder="Enter goal"
                  value={goalName}
                  onChange={(event) => setGoalName(event.target.value)}
                  required
                />
              </label>
              <label>
                Vision
                <textarea
                  rows="3"
                  placeholder="What does success look like?"
                  value={goalVision}
                  onChange={(event) => setGoalVision(event.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={closeGoalModal}>Cancel</button>
                <button type="submit" className="primary-btn">Create Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default GoalsPage;
