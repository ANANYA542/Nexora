import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app-layout${collapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="app-main">
        <Header />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
