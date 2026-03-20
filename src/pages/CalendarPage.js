import lumiFocused from '../assets/lumi-focused.png';

function CalendarPage({ monthName, year, weekDays, calendarCells, todayKey, compactCalendar }) {
  return (
    <section className="page page-enter">
      <h1>Calendar</h1>
      <p className="lead">Monthly view with number of active tasks per day.</p>
      <article className="card premium-surface">
        <div className="calendar-header">
          <h3>{monthName} {year}</h3>
          <img src={lumiFocused} alt="Lumi focused" className="calendar-lumi" />
        </div>
        <div className="calendar-grid labels">
          {weekDays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className={`calendar-grid days ${compactCalendar ? 'compact' : ''}`}>
          {calendarCells.map((cell, index) => (
            <div
              key={`${cell.dateKey}-${index}`}
              className={cell.dateKey === todayKey ? 'day-cell today' : 'day-cell'}
            >
              <strong>{cell.day}</strong>
              {!!cell.day && <small>{cell.count} tasks</small>}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export default CalendarPage;
