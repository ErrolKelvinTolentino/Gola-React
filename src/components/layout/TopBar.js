function TopBar({ date, theme }) {
  return (
    <header className="top-bar">
      <p>{date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      <span>{theme === 'dark' ? 'Night Aurora' : 'Soft Aurora'}</span>
    </header>
  );
}

export default TopBar;
