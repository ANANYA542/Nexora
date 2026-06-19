import { useAuth } from '../../context/AuthContext';
import { Search, Bell, ChevronDown } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'US';

  return (
    <header className="header">
      {/* Search */}
      <div className="header-search">
        <Search className="header-search-icon" size={16} />
        <input type="text" placeholder="Search transactions, goals..." />
        <span className="header-search-shortcut">⌘K</span>
      </div>

      {/* Actions */}
      <div className="header-actions">
        {/* Notifications */}
        <button className="header-icon-btn">
          <Bell size={20} />
          <span className="notification-dot" />
        </button>

        {/* Avatar & Log out button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="header-avatar">
            <div className="header-avatar-circle">{initials}</div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </div>
          <button 
            onClick={logout}
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-danger)', background: 'transparent', cursor: 'pointer', padding: '4px 8px', border: '1px solid var(--accent-danger-light)', borderRadius: 6 }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
