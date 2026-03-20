function TopBar({ date, activePage }) {
  return (
    <header className="top-bar">
      <div className="top-bar-title">
        <small>Workspace</small>
        <h2>{activePage}</h2>
      </div>
      <span className="top-bar-date">{date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
    </header>
  );
}

export default TopBar;
