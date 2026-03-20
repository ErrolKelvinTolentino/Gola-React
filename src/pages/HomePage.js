import lumiWave from '../assets/lumi-wave.png';

function HomePage({ goalsCount, allTaskCount, activeTasksCount, completionRate, completedToday, selectedGoal, today }) {
  return (
    <section className="page page-enter">
      <div className="hero-wrap card premium-surface">
        <img src={lumiWave} alt="Lumi mascot waving" className="hero-lumi" />
        <div>
          <h1>Welcome to Gola Web</h1>
          <p className="lead">A premium focus cockpit crafted for elegant daily execution.</p>
          <div className="hero-pills">
            <span>{goalsCount} goals</span>
            <span>{allTaskCount} total tasks</span>
            <span>{activeTasksCount} active today</span>
          </div>
        </div>
      </div>

      <div className="cards-grid">
        <article className="card feature-card">
          <p className="eyebrow">Today Completion</p>
          <h2>{completionRate}%</h2>
          <p>{completedToday} of {activeTasksCount || 0} active tasks done.</p>
        </article>
        <article className="card metric-card">
          <p className="eyebrow">Focused Goal</p>
          <h2>{selectedGoal ? selectedGoal.name : 'No goal selected'}</h2>
          <p>{selectedGoal ? selectedGoal.vision : 'Create your first goal to get started.'}</p>
        </article>
        <article className="card metric-card">
          <p className="eyebrow">Date</p>
          <h2>{today.toLocaleDateString('en-US', { weekday: 'long' })}</h2>
          <p>{today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </article>
      </div>
    </section>
  );
}

export default HomePage;
