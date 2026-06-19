import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyFull, formatCompact } from '../utils/formatCurrency';
import client from '../api/client';
import {
  PiggyBank, Sparkles, AlertTriangle, CheckCircle2,
  TrendingDown, Plus, UtensilsCrossed,
  Briefcase, Zap, Globe, Car, Heart, Home, ShoppingBag, CircleDot
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const ICON_MAP = {
  food: UtensilsCrossed, salary: Briefcase, bills: Zap,
  online: Globe, transport: Car, health: Heart, housing: Home,
  shopping: ShoppingBag, default: CircleDot,
};

const CHART_COLORS = ['#5B8DB8', '#7CB68E', '#E5B567', '#9B7ED8', '#D4A574', '#E07A6A', '#68B5C2'];

export default function Budgets() {
  const [activeTab, setActiveTab] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Budgets structures
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [overBudgetCount, setOverBudgetCount] = useState(0);
  const [onTrackCount, setOnTrackCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  // DB Categories list for options
  const [dbCategories, setDbCategories] = useState([]);

  // Form states for new budget
  const [catId, setCatId] = useState('');
  const [limit, setLimit] = useState('');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const fetchBudgetsData = async () => {
    setLoading(true);
    try {
      const [budRes, catRes] = await Promise.all([
        client.get(`/budgets?month=${currentMonth}&year=${currentYear}`),
        client.get('/categories')
      ]);

      if (catRes.data?.success) {
        setDbCategories(catRes.data.data.categories.filter(c => c.type === 'expense'));
      }

      if (budRes.data?.success) {
        const fetchedBudgets = budRes.data.data.budgets || [];
        
        let sumBudget = 0;
        let sumSpent = 0;
        let overs = 0;
        let ons = 0;

        const mappedCategories = fetchedBudgets.map((b, idx) => {
          const lAmount = parseFloat(b.limit_amount) || 0;
          const aSpent = parseFloat(b.amount_spent) || 0;
          sumBudget += lAmount;
          sumSpent += aSpent;

          const isOver = aSpent > lAmount;
          if (isOver) overs++;
          else ons++;

          return {
            id: b.id,
            name: b.category_name,
            type: 'Essential',
            spent: aSpent,
            limit: lAmount,
            icon: 'food',
            color: CHART_COLORS[idx % CHART_COLORS.length]
          };
        });

        setTotalBudget(sumBudget);
        setTotalSpent(sumSpent);
        setOverBudgetCount(overs);
        setOnTrackCount(ons);
        setCategories(mappedCategories);

        setMonthlyData([
          { month: 'Jul', budget: sumBudget, actual: sumSpent, status: sumSpent > sumBudget ? 'over' : 'on-track' }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetsData();
  }, []);

  const filteredCategories = activeTab === 'All' 
    ? categories 
    : categories.filter(c => c.type === activeTab);

  const percentSpent = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    if (!limit || isNaN(limit)) return;

    try {
      const targetCatId = catId || (dbCategories.length > 0 ? dbCategories[0].id : null);
      if (!targetCatId) {
        alert("Please create a category first or select one.");
        return;
      }

      const payload = {
        category_id: targetCatId,
        limit_amount: Number(limit),
        month: currentMonth,
        year: currentYear
      };

      const res = await client.post('/budgets', payload);
      if (res.data?.success) {
        fetchBudgetsData();
        setShowAddModal(false);
        setLimit('');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to set budget");
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Budgets</h1>
            <p className="page-subtitle">Control your cash flow, design your future</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-dark" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> New Budget
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading active budgets...
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card animate-fade-in stagger-1">
              <div className="stat-card-icon green"><PiggyBank size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Total Limit</div>
                <div className="stat-card-value">{formatCurrencyFull(totalBudget)}</div>
              </div>
            </div>
            <div className="stat-card animate-fade-in stagger-2">
              <div className="stat-card-icon coral"><TrendingDown size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Total Spent</div>
                <div className="stat-card-value">{formatCurrencyFull(totalSpent)}</div>
              </div>
            </div>
            <div className="stat-card animate-fade-in stagger-3">
              <div className="stat-card-icon blue"><Sparkles size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Remaining</div>
                <div className="stat-card-value" style={{ color: totalBudget - totalSpent >= 0 ? 'var(--accent-primary-dark)' : 'var(--accent-danger)' }}>
                  {formatCurrencyFull(Math.max(0, totalBudget - totalSpent))}
                </div>
              </div>
            </div>
          </div>

          {/* Budget Health Bar Card */}
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 className="heading-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Overall Budget Health
                  </h3>
                  <p className="caption">Total spending across all categories this month</p>
                </div>
                <span style={{ fontWeight: 600, fontSize: 'var(--font-lg)', color: percentSpent > 90 ? 'var(--accent-danger)' : percentSpent > 75 ? 'var(--accent-warning)' : 'var(--accent-primary-dark)' }}>
                  {percentSpent}% Spent
                </span>
              </div>

              <div style={{ background: 'var(--bg-primary)', height: 12, borderRadius: 6, overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
                <div style={{ 
                  width: `${percentSpent}%`, 
                  height: '100%', 
                  background: percentSpent > 90 ? 'var(--accent-danger)' : percentSpent > 75 ? 'var(--accent-warning)' : 'var(--accent-primary)',
                  borderRadius: 6,
                  transition: 'width 0.4s ease'
                }} />
              </div>

              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-sm)' }}>
                  <CheckCircle2 size={16} color="var(--accent-primary-dark)" />
                  <span>{onTrackCount} Categories on track</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-sm)' }}>
                  <AlertTriangle size={16} color="var(--accent-danger)" />
                  <span>{overBudgetCount} Categories over budget</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts & Budget Grid */}
          <div className="charts-row">
            {/* Budget vs Actual Chart */}
            <div className="card" style={{ flex: '1.2' }}>
              <div className="card-body">
                <h3 className="heading-4" style={{ marginBottom: 4 }}>Budget vs Actual</h3>
                <p className="caption" style={{ marginBottom: 20 }}>Monthly historical perspective</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}K`} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 13 }}
                      formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, undefined]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, marginTop: 10 }} />
                    <Bar dataKey="budget" name="Budget" fill="var(--bg-primary)" radius={[4, 4, 0, 0]} stroke="var(--card-border)" />
                    <Bar dataKey="actual" name="Actual Spent" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabbed Budget List */}
            <div className="card" style={{ flex: '1' }}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 className="heading-4">Categories</h3>
                  <div className="pill-tabs" style={{ margin: 0 }}>
                    {['All', 'Essential', 'Lifestyle'].map((t) => (
                      <button key={t} className={`pill-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)} style={{ padding: '4px 10px', fontSize: 11 }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {categories.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No active budgets for this period. Click 'New Budget' to create.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '300px', overflowY: 'auto', paddingRight: 4 }}>
                    {filteredCategories.map((c) => {
                      const Icon = ICON_MAP[c.icon] || CircleDot;
                      const ratio = c.limit > 0 ? Math.round((c.spent / c.limit) * 100) : 0;
                      const isOver = c.spent > c.limit;
                      return (
                        <div key={c.id || c.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ 
                                width: 32, 
                                height: 32, 
                                borderRadius: 8, 
                                background: `${c.color || '#7CB68E'}15`, 
                                color: c.color || '#7CB68E', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyStyle: 'center',
                                justifyContent: 'center' 
                              }}>
                                <Icon size={16} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{c.name}</div>
                                <div className="caption">{c.type}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', color: isOver ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                                {formatCompact(c.spent)} / {formatCompact(c.limit)}
                              </div>
                              <div className="caption" style={{ color: isOver ? 'var(--accent-danger)' : 'inherit' }}>
                                {ratio}% spent
                              </div>
                            </div>
                          </div>
                          <div style={{ background: 'var(--bg-primary)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${Math.min(ratio, 100)}%`, 
                              height: '100%', 
                              background: isOver ? 'var(--accent-danger)' : c.color || 'var(--accent-primary)',
                              borderRadius: 3
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Budget Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '400px', transform: 'scale(1)', animation: 'scaleIn 0.2s ease' }}>
            <div className="card-body">
              <h3 className="heading-3" style={{ marginBottom: 16 }}>Create Budget</h3>
              <form onSubmit={handleCreateBudget}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Select Category</label>
                    <select value={catId} onChange={(e) => setCatId(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }}>
                      {dbCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      {dbCategories.length === 0 && <option>No categories available</option>}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Limit Amount (₹)</label>
                    <input type="number" placeholder="e.g. 10000" value={limit} onChange={(e) => setLimit(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-dark">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
