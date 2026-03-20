import golaLogo from '../../assets/gola-logo.png';

function Sidebar({ navItems, activePage, onChangePage }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src={golaLogo} alt="Gola logo" className="brand-logo" />
        <div>
          <strong>Gola</strong>
          <p>Premium Focus System</p>
        </div>
      </div>

      <nav>
        {navItems.map((item) => (
          <button
            key={item}
            type="button"
            className={activePage === item ? 'nav-item active' : 'nav-item'}
            onClick={() => onChangePage(item)}
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
