import { useState, useEffect } from 'react';
import client from '../api/client';
import {
  Bell, AlertTriangle, CheckCircle2, CircleDot, Check,
  Trash2, BellRing
} from 'lucide-react';

const ICON_MAP = {
  budget_exceeded: { icon: AlertTriangle, color: 'var(--accent-danger)' },
  anomaly_detected: { icon: AlertTriangle, color: 'var(--accent-warning)' },
  savings_milestone: { icon: CheckCircle2, color: 'var(--accent-primary-dark)' },
  default: { icon: Bell, color: 'var(--accent-info)' }
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await client.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data.notifications.map(n => ({
          id: n.id,
          type: n.type,
          message: n.message,
          time: new Date(n.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(n.sent_at).toLocaleDateString([], { day: 'numeric', month: 'short' }),
          read: true // logs are generally marked sent
        })));
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleClearAll = () => {
    setNotifications([]);
  };

  const filtered = notifications.filter(n => {
    if (activeTab === 'Unread') return !n.read;
    if (activeTab === 'Read') return n.read;
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: 750, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BellRing size={28} /> Notifications
            </h1>
            <p className="page-subtitle">Real-time alerts, health achievements, and anomaly warnings</p>
          </div>
          <div className="page-header-actions" style={{ display: 'flex', gap: 8 }}>
            {notifications.length > 0 && (
              <button className="btn btn-secondary" onClick={handleClearAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12 }}>
                <Trash2 size={14} /> Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Retrieving real-time alerts...
        </div>
      ) : (
        <>
          {/* Tabs Menu */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body" style={{ padding: '12px' }}>
              <div className="pill-tabs" style={{ margin: 0 }}>
                {['All', 'Unread', 'Read'].map(t => (
                  <button key={t} className={`pill-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="card">
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: filtered.length === 0 ? '48px 24px' : '20px' }}>
              {filtered.map(n => {
                const config = ICON_MAP[n.type] || ICON_MAP.default;
                const Icon = config.icon;
                return (
                  <div 
                    key={n.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      border: '1px solid var(--card-border)',
                      borderRadius: 10,
                      padding: '16px 20px',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 38, 
                        height: 38, 
                        borderRadius: '50%', 
                        background: `${config.color}15`, 
                        color: config.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {n.message}
                        </p>
                        <span className="caption" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CircleDot size={8} fill="none" stroke="var(--text-muted)" />
                          {n.time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="empty-state" style={{ textAlign: 'center' }}>
                  <Bell className="empty-state-icon" style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} size={48} />
                  <div className="empty-state-title">No notifications</div>
                  <p className="empty-state-text">You are fully up to date!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
