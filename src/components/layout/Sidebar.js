import golaLogo from '../../assets/gola-logo.png';

function Sidebar({ navItems, activePage, onChangePage }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src={golaLogo} alt="Gola logo" className="brand-logo" />
        <strong>GOLA</strong>
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
