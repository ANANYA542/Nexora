import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyFull, formatCompact } from '../utils/formatCurrency';
import client from '../api/client';
import {
  TrendingUp, ArrowUpRight, ArrowDownRight, Plus,
  Layers, Landmark, ShieldAlert, BadgePercent, Coins
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';

const ALLOC_COLORS = ['#7CB68E', '#5B8DB8', '#E5B567', '#9B7ED8', '#E07A6A'];

export default function Investments() {
  const [loading, setLoading] = useState(true);
  
  // Investments state
  const [totalInvested, setTotalInvested] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);
  const [totalReturns, setTotalReturns] = useState(0);
  const [returnPct, setReturnPct] = useState(0);
  const [holdings, setHoldings] = useState([]);
  const [allocation, setAllocation] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for new investment
  const [name, setName] = useState('');
  const [type, setType] = useState('Mutual Fund');
  const [platform, setPlatform] = useState('');
  const [invested, setInvested] = useState('');
  const [current, setCurrent] = useState('');

  const fetchInvestmentsData = async () => {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        client.get('/investments'),
        client.get('/investments/portfolio')
      ]);

      if (summaryRes.data?.success) {
        const sum = summaryRes.data.data;
        setTotalInvested(parseFloat(sum.total_invested) || 0);
        setCurrentValue(parseFloat(sum.current_value) || 0);
        setTotalReturns(parseFloat(sum.total_returns) || 0);
        setReturnPct(parseFloat(sum.return_pct) || 0);
        
        if (sum.allocation && sum.allocation.length > 0) {
          setAllocation(sum.allocation.map((a, idx) => ({
            name: a.type,
            value: parseFloat(a.value),
            color: ALLOC_COLORS[idx % ALLOC_COLORS.length]
          })));
        } else {
          setAllocation([]);
        }
      }

      if (listRes.data?.success) {
        const fetchedHoldings = listRes.data.data.investments || [];
        setHoldings(fetchedHoldings.map(h => ({
          name: h.name,
          type: h.type,
          platform: h.platform || 'Direct',
          invested: parseFloat(h.invested_amount) || 0,
          current: parseFloat(h.current_value) || 0,
          returnPct: parseFloat(h.return_pct) || 0
        })));
      }
    } catch (err) {
      console.error('Failed to load investments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestmentsData();
  }, []);

  const handleAddInvestment = async (e) => {
    e.preventDefault();
    if (!invested || isNaN(invested) || !current || isNaN(current)) return;

    try {
      const payload = {
        name,
        type,
        platform,
        invested_amount: Number(invested),
        current_value: Number(current),
        units: null,
        last_updated: new Date().toISOString()
      };

      const res = await client.post('/investments', payload);
      if (res.data?.success) {
        fetchInvestmentsData();
        setShowAddModal(false);
        // Reset fields
        setName('');
        setType('Mutual Fund');
        setPlatform('');
        setInvested('');
        setCurrent('');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to add asset holding");
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Investments</h1>
            <p className="page-subtitle">Track portfolios, optimize returns, secure wealth</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-dark" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Investment
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Syncing manual asset portfolio...
        </div>
      ) : (
        <>
          {/* Portfolio Stat Cards */}
          <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card animate-fade-in stagger-1">
              <div className="stat-card-icon green"><TrendingUp size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Current Value</div>
                <div className="stat-card-value">{formatCurrencyFull(currentValue)}</div>
              </div>
            </div>
            <div className="stat-card animate-fade-in stagger-2">
              <div className="stat-card-icon blue"><Coins size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Total Invested</div>
                <div className="stat-card-value">{formatCurrencyFull(totalInvested)}</div>
              </div>
            </div>
            <div className="stat-card animate-fade-in stagger-3">
              <div className="stat-card-icon green"><ArrowUpRight size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Total Returns</div>
                <div className="stat-card-value" style={{ color: 'var(--accent-primary-dark)' }}>
                  +{formatCurrencyFull(totalReturns)}
                </div>
              </div>
            </div>
            <div className="stat-card animate-fade-in stagger-4">
              <div className="stat-card-icon purple"><BadgePercent size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Return Rate</div>
                <div className="stat-card-value">{returnPct}%</div>
              </div>
            </div>
          </div>

          {/* Allocation & Info Row */}
          <div className="charts-row">
            {/* Allocation Pie Chart */}
            <div className="card" style={{ flex: '1.2' }}>
              <div className="card-body">
                <h3 className="heading-4" style={{ marginBottom: 4 }}>Asset Allocation</h3>
                <p className="caption" style={{ marginBottom: 20 }}>Current composition of your net investments</p>
                {allocation.length === 0 ? (
                  <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No assets logged. Create your first holding to view allocation.
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', height: '220px' }}>
                    <ResponsiveContainer width="50%" height={100}>
                      <PieChart>
                        <Pie data={allocation} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none" paddingAngle={2}>
                          {allocation.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Value']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ width: '50%', paddingLeft: 20 }}>
                      {allocation.map((entry) => {
                        const pct = currentValue > 0 ? Math.round((entry.value / currentValue) * 100) : 0;
                        return (
                          <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--card-border)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-sm)', fontWeight: 500 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color }} />
                              {entry.name}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>
                              {pct}% ({formatCompact(entry.value)})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Wealth Coach Alert */}
            <div className="card" style={{ flex: '1' }}>
              <div className="card-body">
                <h3 className="heading-4" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Layers size={18} color="var(--accent-primary-dark)" />
                  Wealth Insights
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Landmark size={14} color="var(--accent-primary-dark)" /> Balanced Allocation
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      A proper target mapping mixes growth assets (Mutual Funds) and safety assets (PPF/Gold) matching your risk profile.
                    </p>
                  </div>
                  <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ShieldAlert size={14} color="var(--accent-warning)" /> Rebalancing rules
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Check allocations quarterly. Lock in gains when asset margins shift beyond 10% bounds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Holdings List */}
          <h3 className="heading-3" style={{ margin: 'var(--space-xl) 0 var(--space-md)' }}>Asset Holdings</h3>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              {holdings.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No active holdings found. Select 'Add Investment' above.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-sm)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--bg-primary)' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Asset / Fund Name</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Platform</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Invested</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Current Value</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Returns (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((h, i) => {
                        const isPositive = h.returnPct >= 0;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }} className="tx-item-row">
                            <td style={{ padding: '16px', fontWeight: 600 }}>{h.name}</td>
                            <td style={{ padding: '16px' }}>
                              <span style={{ fontSize: 11, background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: 12 }}>
                                {h.type}
                              </span>
                            </td>
                            <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{h.platform}</td>
                            <td style={{ padding: '16px' }}>₹{h.invested.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '16px', fontWeight: 600 }}>₹{h.current.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: isPositive ? 'var(--accent-primary-dark)' : 'var(--accent-danger)' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {h.returnPct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Investment Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '450px', transform: 'scale(1)', animation: 'scaleIn 0.2s ease' }}>
            <div className="card-body">
              <h3 className="heading-3" style={{ marginBottom: 16 }}>Add Investment Holding</h3>
              <form onSubmit={handleAddInvestment}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Asset / Fund Name</label>
                    <input type="text" placeholder="e.g. Parag Parikh Flexi Cap Fund" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Asset Type</label>
                      <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }}>
                        <option value="Mutual Fund">Mutual Fund</option>
                        <option value="Stocks">Stocks</option>
                        <option value="PPF">PPF</option>
                        <option value="Gold">Gold</option>
                        <option value="Crypto">Crypto</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Platform</label>
                      <input type="text" placeholder="e.g. Groww, Zerodha" value={platform} onChange={(e) => setPlatform(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Invested Amount (₹)</label>
                      <input type="number" placeholder="e.g. 50000" value={invested} onChange={(e) => setInvested(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Current Value (₹)</label>
                      <input type="number" placeholder="e.g. 55000" value={current} onChange={(e) => setCurrent(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-dark">Add Asset</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
