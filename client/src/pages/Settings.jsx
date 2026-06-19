import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User, Bell, Settings as SettingsIcon, Save,
  CheckCircle
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile settings state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState(null);

  // Notifications settings state
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [anomalyAlerts, setAnomalyAlerts] = useState(true);
  const [lowBalanceAlerts, setLowBalanceAlerts] = useState(true);
  const [notifMessage, setNotifMessage] = useState(null);

  // App preference settings state
  const [currency, setCurrency] = useState('INR');
  const [prefMessage, setPrefMessage] = useState(null);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
    setTimeout(() => setProfileMessage(null), 3000);
  };

  const handleSaveNotifications = (e) => {
    e.preventDefault();
    setNotifMessage({ type: 'success', text: 'Notification preferences updated!' });
    setTimeout(() => setNotifMessage(null), 3000);
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    setPrefMessage({ type: 'success', text: 'App preferences saved!' });
    setTimeout(() => setPrefMessage(null), 3000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: 24 }}>
      {/* Settings Navigation Menu (Left) */}
      <div className="card" style={{ width: 220, alignSelf: 'flex-start', flexShrink: 0 }}>
        <div className="card-body" style={{ padding: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button 
              className={`sidebar-nav-item${activeTab === 'profile' ? ' active' : ''}`}
              onClick={() => setActiveTab('profile')}
              style={{ display: 'flex', width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, gap: 10, alignItems: 'center' }}
            >
              <User size={16} /> Profile Settings
            </button>
            <button 
              className={`sidebar-nav-item${activeTab === 'notifications' ? ' active' : ''}`}
              onClick={() => setActiveTab('notifications')}
              style={{ display: 'flex', width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, gap: 10, alignItems: 'center' }}
            >
              <Bell size={16} /> Notification Rules
            </button>
            <button 
              className={`sidebar-nav-item${activeTab === 'preferences' ? ' active' : ''}`}
              onClick={() => setActiveTab('preferences')}
              style={{ display: 'flex', width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, gap: 10, alignItems: 'center' }}
            >
              <SettingsIcon size={16} /> App Preferences
            </button>
          </div>
        </div>
      </div>

      {/* Settings Action Content (Right) */}
      <div style={{ flex: 1 }}>
        {activeTab === 'profile' && (
          <div className="card animate-fade-in">
            <div className="card-body">
              <h3 className="heading-3" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={20} color="var(--accent-primary-dark)" />
                Profile Management
              </h3>
              <p className="caption" style={{ marginBottom: 20 }}>Update your basic details and sign-in credentials</p>

              {profileMessage && (
                <div style={{ background: 'var(--accent-success-bg)', border: '1px solid var(--accent-primary-light)', padding: 12, borderRadius: 8, color: 'var(--accent-primary-dark)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} /> {profileMessage.text}
                </div>
              )}

              <form onSubmit={handleSaveProfile}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500, marginBottom: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Full Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Email Address</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                  </div>

                  <hr style={{ border: 0, borderTop: '1px solid var(--card-border)', margin: '8px 0' }} />

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Current Password</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                  </div>
                </div>

                <button type="submit" className="btn btn-dark" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Save size={16} /> Save Profile Changes
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="card animate-fade-in">
            <div className="card-body">
              <h3 className="heading-3" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={20} color="var(--accent-primary-dark)" />
                Notification Control Rules
              </h3>
              <p className="caption" style={{ marginBottom: 20 }}>Toggle smart updates, budget alerts, and anomaly indicators</p>

              {notifMessage && (
                <div style={{ background: 'var(--accent-success-bg)', border: '1px solid var(--accent-primary-light)', padding: 12, borderRadius: 8, color: 'var(--accent-primary-dark)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} /> {notifMessage.text}
                </div>
              )}

              <form onSubmit={handleSaveNotifications} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Monthly Email Narrative Digests</div>
                      <div className="caption">Receive standard AI summaries about your habits automatically</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={smsAlerts} onChange={(e) => setSmsAlerts(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Telegram or SMS Real-time Alerts</div>
                      <div className="caption">Notify instantly when transactions are parsed on phone</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={anomalyAlerts} onChange={(e) => setAnomalyAlerts(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Ensemble Anomaly Warnings</div>
                      <div className="caption">Instant trigger when z-score or rolling average rules are broken</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={lowBalanceAlerts} onChange={(e) => setLowBalanceAlerts(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Low Balance Threshold Reminders</div>
                      <div className="caption">Send warning if bank accounts slide below safety bounds</div>
                    </div>
                  </label>
                </div>

                <button type="submit" className="btn btn-dark" style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
                  <Save size={16} /> Save Preference Rules
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="card animate-fade-in">
            <div className="card-body">
              <h3 className="heading-3" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <SettingsIcon size={20} color="var(--accent-primary-dark)" />
                Application Preferences
              </h3>
              <p className="caption" style={{ marginBottom: 20 }}>Configure display behaviors and default parameters</p>

              {prefMessage && (
                <div style={{ background: 'var(--accent-success-bg)', border: '1px solid var(--accent-primary-light)', padding: 12, borderRadius: 8, color: 'var(--accent-primary-dark)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} /> {prefMessage.text}
                </div>
              )}

              <form onSubmit={handleSavePreferences}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500, marginBottom: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Default Base Currency</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }}>
                      <option value="INR">INR (₹) Indian Rupee</option>
                      <option value="USD">USD ($) US Dollar</option>
                      <option value="EUR">EUR (€) Euro</option>
                      <option value="GBP">GBP (£) British Pound</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn btn-dark" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Save size={16} /> Save Base Settings
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
