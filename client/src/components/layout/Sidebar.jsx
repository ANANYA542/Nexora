import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, ArrowLeftRight, PiggyBank, Target,
  TrendingUp, BarChart3, Sparkles, Bell, Settings,
  ChevronLeft, Wallet
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/',              label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/transactions',  label: 'Transactions', icon: ArrowLeftRight },
  { path: '/budgets',       label: 'Budgets',      icon: PiggyBank },
  { path: '/goals',         label: 'Goals',        icon: Target },
  { path: '/investments',   label: 'Investments',  icon: TrendingUp },
  { path: '/reports',       label: 'Reports',      icon: BarChart3 },
  { path: '/ai-coach',      label: 'AI Coach',     icon: Sparkles, badge: 'AI' },
];

const FOOTER_ITEMS = [
  { path: '/notifications', label: 'Notifications', icon: Bell, notificationCount: 3 },
  { path: '/settings',      label: 'Settings',      icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const location = useLocation();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AK';

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Wallet size={20} />
        </div>
        <span className="sidebar-brand-text">FinSight</span>
      </div>

      {/* Toggle */}
      <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
        <ChevronLeft size={14} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 250ms' }} />
      </button>

      {/* Main Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
            end={item.path === '/'}
          >
            <item.icon className="nav-icon" size={20} />
            <span className="nav-label">{item.label}</span>
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer Nav */}
      <div className="sidebar-footer">
        {FOOTER_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-footer-item${isActive ? ' active' : ''}`}
          >
            <item.icon className="nav-icon" size={20} />
            <span className="nav-label">{item.label}</span>
            {item.notificationCount && (
              <span className="notification-dot">{item.notificationCount}</span>
            )}
          </NavLink>
        ))}
      </div>

      {/* User */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.name || 'User'}</div>
          <div className="sidebar-user-email">{user?.email || ''}</div>
        </div>
      </div>
    </aside>
  );
}
