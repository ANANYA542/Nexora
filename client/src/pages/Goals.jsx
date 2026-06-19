import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyFull, formatCompact } from '../utils/formatCurrency';
import client from '../api/client';
import {
  Target, Sparkles, Plus, Calendar, AlertCircle,
  Shield, Plane, Laptop, GraduationCap, Coins
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

const CATEGORY_MAP = {
  emergency_fund: { label: 'Safety', color: 'var(--accent-info)', icon: Shield },
  travel: { label: 'Leisure', color: 'var(--accent-warning)', icon: Plane },
  purchase: { label: 'Spend', color: 'var(--accent-purple)', icon: Laptop },
  education: { label: 'Growth', color: 'var(--accent-primary)', icon: GraduationCap },
  default: { label: 'Goal', color: 'var(--accent-primary)', icon: Target }
};

const SAVINGS_TREND_DATA = [
  { month: 'Jan', savings: 25000 },
  { month: 'Feb', savings: 32000 },
  { month: 'Mar', savings: 28000 },
  { month: 'Apr', savings: 35000 },
  { month: 'May', savings: 40000 },
  { month: 'Jun', savings: 38000 },
  { month: 'Jul', savings: 45000 },
];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contribAmount, setContribAmount] = useState('');

  // Form states for new goal
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎯');
  const [newTarget, setNewTarget] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newCategory, setNewCategory] = useState('emergency_fund');
  const [newMonthly, setNewMonthly] = useState('');

  const fetchGoalsData = async () => {
    setLoading(true);
    try {
      const res = await client.get('/goals');
      if (res.data?.success) {
        const fetchedGoals = res.data.data.goals || [];
        setGoals(fetchedGoals.map(g => ({
          id: g.id,
          name: g.name,
          emoji: '🎯',
          current: parseFloat(g.current_amount) || 0,
          target: parseFloat(g.target_amount) || 0,
          deadline: g.deadline ? g.deadline.split('T')[0] : '2025-12-31',
          priority: g.priority,
          monthlyContribution: parseFloat(g.auto_save_amount) || 0,
          category: g.category
        })));
      }
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalsData();
  }, []);

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!selectedGoal || !contribAmount || isNaN(contribAmount)) return;

    try {
      const res = await client.post(`/goals/${selectedGoal.id}/contribute`, { amount: Number(contribAmount) });
      if (res.data?.success) {
        fetchGoalsData();
        setContribAmount('');
        setSelectedGoal(null);
        setShowContributeModal(false);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to make contribution");
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newTarget || isNaN(newTarget)) return;

    try {
      const payload = {
        name: newName,
        target_amount: Number(newTarget),
        deadline: newDeadline,
        priority: newPriority,
        category: newCategory,
        auto_save_amount: Number(newMonthly || 0),
        current_amount: 0
      };

      const res = await client.post('/goals', payload);
      if (res.data?.success) {
        fetchGoalsData();
        setShowAddModal(false);
        // Reset form
        setNewName('');
        setNewEmoji('🎯');
        setNewTarget('');
        setNewDeadline('');
        setNewPriority('medium');
        setNewCategory('emergency_fund');
        setNewMonthly('');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create goal");
    }
  };

  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Savings Goals</h1>
            <p className="page-subtitle">Build habits, reach milestones, live dynamically</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-dark" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Goal
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Retrieving financial targets...
        </div>
      ) : (
        <>
          {/* Progress Cards */}
          <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card animate-fade-in stagger-1">
              <div className="stat-card-icon green"><Target size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Total Target</div>
                <div className="stat-card-value">{formatCurrencyFull(totalTarget)}</div>
              </div>
            </div>
            <div className="stat-card animate-fade-in stagger-2">
              <div className="stat-card-icon blue"><Coins size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Total Saved</div>
                <div className="stat-card-value">{formatCurrencyFull(totalSaved)}</div>
              </div>
            </div>
            <div className="stat-card animate-fade-in stagger-3">
              <div className="stat-card-icon purple"><Sparkles size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Overall Progress</div>
                <div className="stat-card-value">{overallProgress}%</div>
              </div>
            </div>
          </div>

          {/* Goal savings trajectory and stats */}
          <div className="charts-row">
            {/* Trend Area Chart */}
            <div className="card" style={{ flex: '1.5' }}>
              <div className="card-body">
                <h3 className="heading-4">Savings Velocity</h3>
                <p className="caption" style={{ marginBottom: 20 }}>Total money saved towards all goals month-over-month</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={SAVINGS_TREND_DATA} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="goalTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-purple)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="var(--accent-purple)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}K`} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 13 }}
                      formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Savings']}
                    />
                    <Area type="monotone" dataKey="savings" stroke="var(--accent-purple)" strokeWidth={2.5} fill="url(#goalTrendGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Action / Goal Coach Board */}
            <div className="card" style={{ flex: '1' }}>
              <div className="card-body">
                <h3 className="heading-4" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={18} color="var(--accent-purple)" />
                  Goal Assistant
                </h3>
                <p className="caption" style={{ marginBottom: 16 }}>Smart savings suggestions based on your deadlines</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertCircle size={18} color="var(--accent-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>Safety buffer checks</div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Make sure to fund your Emergency Fund first. This provides an essential downside cushion.
                      </p>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertCircle size={18} color="var(--accent-primary-dark)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>Automatic Auto-save</div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Setting up auto-saves ensures that savings occur naturally at month-start.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Goals Grid */}
          <h3 className="heading-3" style={{ margin: 'var(--space-xl) 0 var(--space-md)' }}>Active Goals</h3>
          {goals.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
              No goals created yet. Click 'Add Goal' to set your first target.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {goals.map((g) => {
                const cfg = CATEGORY_MAP[g.category] || CATEGORY_MAP.default;
                const IconComp = cfg.icon;
                const pct = g.target > 0 ? Math.min(Math.round((g.current / g.target) * 100), 100) : 0;
                return (
                  <div className="card" key={g.id}>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', minHeight: 200 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div style={{ fontSize: 28 }}>{g.emoji}</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{ 
                              fontSize: 10, 
                              fontWeight: 600, 
                              background: `${cfg.color}15`, 
                              color: cfg.color, 
                              padding: '2px 8px', 
                              borderRadius: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <IconComp size={10} />
                              {cfg.label}
                            </span>
                            <span style={{ 
                              fontSize: 10, 
                              fontWeight: 600, 
                              background: g.priority === 'high' ? 'var(--accent-danger-bg)' : g.priority === 'medium' ? 'var(--accent-warning-bg)' : 'var(--bg-primary)', 
                              color: g.priority === 'high' ? 'var(--accent-danger)' : g.priority === 'medium' ? 'var(--accent-warning)' : 'var(--text-secondary)',
                              padding: '2px 8px', 
                              borderRadius: 12 
                            }}>
                              {g.priority}
                            </span>
                          </div>
                        </div>

                        <h4 className="heading-4" style={{ marginBottom: 4 }}>{g.name}</h4>
                        <p className="caption" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                          <Calendar size={12} /> Target Date: {g.deadline}
                        </p>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-sm)', fontWeight: 600, marginBottom: 4 }}>
                          <span>{formatCompact(g.current)}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{formatCompact(g.target)}</span>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                          <div style={{ 
                            width: `${pct}%`, 
                            height: '100%', 
                            background: cfg.color,
                            borderRadius: 3
                          }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="caption">₹{g.monthlyContribution.toLocaleString('en-IN')}/mo</span>
                          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => { setSelectedGoal(g); setShowContributeModal(true); }}>
                            Save Money
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* New Goal Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '450px', transform: 'scale(1)', animation: 'scaleIn 0.2s ease' }}>
            <div className="card-body">
              <h3 className="heading-3" style={{ marginBottom: 16 }}>Create New Savings Goal</h3>
              <form onSubmit={handleAddGoal}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Emoji</label>
                      <input type="text" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', textAlign: 'center', fontSize: 18, background: 'var(--input-bg)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Goal Name</label>
                      <input type="text" placeholder="e.g. New iPhone, House Downpayment" value={newName} onChange={(e) => setNewName(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Target Amount (₹)</label>
                      <input type="number" placeholder="e.g. 50000" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Target Date</label>
                      <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Category</label>
                      <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }}>
                        <option value="emergency_fund">Emergency Fund</option>
                        <option value="travel">Travel & Leisure</option>
                        <option value="purchase">Purchase</option>
                        <option value="education">Education / Growth</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Priority</label>
                      <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }}>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Planned Monthly Auto-Save (₹)</label>
                    <input type="number" placeholder="e.g. 5000" value={newMonthly} onChange={(e) => setNewMonthly(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-dark">Create Goal</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Contribute to Goal Modal */}
      {showContributeModal && selectedGoal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '400px', transform: 'scale(1)', animation: 'scaleIn 0.2s ease' }}>
            <div className="card-body">
              <h3 className="heading-3" style={{ marginBottom: 4 }}>Add Savings</h3>
              <p className="caption" style={{ marginBottom: 16 }}>Add money towards: {selectedGoal.name}</p>
              <form onSubmit={handleContribute}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Contribution Amount (₹)</label>
                    <input type="number" placeholder="e.g. 5000" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} required autoFocus style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setSelectedGoal(null); setShowContributeModal(false); }}>Cancel</button>
                  <button type="submit" className="btn btn-dark">Confirm Transfer</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
