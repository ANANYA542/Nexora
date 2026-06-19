import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getGreeting, getCurrentMonthYear, formatRelativeTime } from '../utils/formatDate';
import { formatCurrencyFull, formatCompact } from '../utils/formatCurrency';
import client from '../api/client';
import {
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Sparkles, AlertTriangle, CheckCircle2, Info, ChevronRight,
  UtensilsCrossed, Briefcase, Zap, Globe, Car, Heart, Home, ShoppingBag, CircleDot
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const PERIOD_OPTIONS = ['1M', '3M', '7M', '1Y'];

const ICON_MAP = {
  food: UtensilsCrossed, salary: Briefcase, bills: Zap,
  online: Globe, transport: Car, health: Heart, housing: Home,
  shopping: ShoppingBag, default: CircleDot,
};

const CHART_COLORS = ['#5B8DB8', '#7CB68E', '#E5B567', '#9B7ED8', '#D4A574', '#E07A6A', '#68B5C2'];

export default function Dashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('7M');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('month'); // 'day' or 'month'

  // State populated by live data
  const [stats, setStats] = useState({ totalBalance: 0, monthlyIncome: 0, monthlyExpenses: 0, netSavings: 0 });
  const [monthlyData, setMonthlyData] = useState([]);
  const [spending, setSpending] = useState([]);
  const [netWorth, setNetWorth] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [insights, setInsights] = useState([]);

  const getDateRange = (dateStr, mode) => {
    if (mode === 'day') {
      return { start_date: dateStr, end_date: dateStr };
    }
    const dateObj = new Date(dateStr);
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const firstDay = new Date(Date.UTC(y, m, 1)).toISOString().split('T')[0];
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).toISOString().split('T')[0];
    return { start_date: firstDay, end_date: lastDay };
  };

  const getSubLabel = () => {
    if (period) {
      return `last ${period === '1M' ? '30 days' : period === '3M' ? '90 days' : period === '7M' ? '7 months' : '1 year'}`;
    }
    if (viewMode === 'day') {
      return new Date(selectedDate).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return new Date(selectedDate).toLocaleDateString([], { month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        let params = {};
        let trendParams = null;

        if (period) {
          const now = new Date();
          let days = 30;
          if (period === '3M') days = 90;
          else if (period === '7M') days = 210;
          else if (period === '1Y') days = 365;
          
          const start = new Date();
          start.setDate(now.getDate() - days);
          params.start_date = start.toISOString().split('T')[0];
          params.end_date = now.toISOString().split('T')[0];
        } else {
          const range = getDateRange(selectedDate, viewMode);
          params.start_date = range.start_date;
          params.end_date = range.end_date;

          if (viewMode === 'day') {
            const dateObj = new Date(selectedDate);
            const start7DaysAgo = new Date(dateObj);
            start7DaysAgo.setDate(dateObj.getDate() - 6);
            trendParams = {
              start_date: start7DaysAgo.toISOString().split('T')[0],
              end_date: selectedDate
            };
          }
        }

        const queryStr = new URLSearchParams(params).toString();
        const trendQueryStr = trendParams ? new URLSearchParams(trendParams).toString() : queryStr;

        const promises = [
          client.get(`/dashboard?${queryStr}`),
          client.get('/accounts/net-worth').catch(() => null),
          client.get(`/transactions?limit=5&${queryStr}`).catch(() => null),
          client.get('/ai/recommendations?limit=3').catch(() => null),
          client.get('/reports').catch(() => null)
        ];

        if (trendParams) {
          promises.push(client.get(`/dashboard?${trendQueryStr}`).catch(() => null));
        }

        const responses = await Promise.all(promises);
        const dashRes = responses[0];
        const netWorthRes = responses[1];
        const txRes = responses[2];
        const recommendRes = responses[3];
        const reportRes = responses[4];
        const trendRes = trendParams ? responses[5] : null;

        let totalBalance = 0;
        if (netWorthRes?.data?.success) {
          totalBalance = parseFloat(netWorthRes.data.data.net_worth) || 0;
        }

        if (dashRes.data?.success) {
          const dashData = dashRes.data.data;
          if (!totalBalance) {
            totalBalance = parseFloat(dashData.summary.savings) || 0;
          }

          setStats({
            totalBalance: totalBalance,
            monthlyIncome: parseFloat(dashData.summary.total_income) || 0,
            monthlyExpenses: parseFloat(dashData.summary.total_expense) || 0,
            netSavings: parseFloat(dashData.summary.savings) || 0
          });

          // Map spending breakdown categories
          if (dashData.expense_by_category && dashData.expense_by_category.length > 0) {
            setSpending(dashData.expense_by_category.map((item, index) => ({
              name: item.category_name,
              value: parseFloat(item.total),
              color: CHART_COLORS[index % CHART_COLORS.length]
            })));
          } else {
            setSpending([{ name: 'No expenses yet', value: 0, color: 'var(--text-muted)' }]);
          }

          // Build trend graph based on daily expenses
          const activeTrendData = trendRes?.data?.success ? trendRes.data.data : dashData;
          if (activeTrendData.daily_expenses && activeTrendData.daily_expenses.length > 0) {
            const mapped = activeTrendData.daily_expenses.map(d => ({
              month: new Date(d.date).toLocaleDateString([], { day: 'numeric', month: 'short' }),
              income: 0,
              expenses: parseFloat(d.total_expense)
            }));
            setMonthlyData(mapped);
          } else {
            setMonthlyData([]);
          }
        }

        if (txRes?.data?.success) {
          const fetchedTxList = txRes.data.data.transactions || [];
          setRecentTx(fetchedTxList.map(tx => ({
            id: tx.id,
            description: tx.description || 'Transaction',
            category: tx.category_name || 'General',
            type: tx.type,
            amount: parseFloat(tx.amount),
            date: tx.date,
            icon: tx.type === 'income' ? 'salary' : 'food'
          })));
        }

        if (recommendRes?.data?.success) {
          const recs = recommendRes.data.data.recommendations || [];
          if (recs.length > 0) {
            setInsights(recs.map(r => ({
              type: r.type === 'danger' || r.type === 'warning' ? 'warning' : 'info',
              text: r.content?.recommendation || r.content?.message || 'Insight generated'
            })));
          } else {
            setInsights([
              { type: 'info', text: 'No insights generated yet. Spend some more to get custom AI coaching.' }
            ]);
          }
        }

        // Reconstruct Net Worth Sparkline
        if (reportRes?.data?.success) {
          const reportData = reportRes.data.data.report || [];
          const sortedReports = [...reportData].sort((a, b) => a.month.localeCompare(b.month));
          let currentAssets = totalBalance;
          const sparklineData = [];

          for (let i = sortedReports.length - 1; i >= 0; i--) {
            const rep = sortedReports[i];
            const dateObj = new Date(rep.month + '-01');
            const monthName = dateObj.toLocaleDateString([], { month: 'short' });
            sparklineData.push({
              month: monthName,
              value: currentAssets
            });
            currentAssets -= (parseFloat(rep.savings) || 0);
          }
          setNetWorth(sparklineData.reverse());
        }
      } catch (err) {
        console.error('Failed to load live dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [period, selectedDate, viewMode]);

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <p className="page-greeting">{getGreeting()}</p>
            <h1 className="page-title">{user?.name || 'User'}</h1>
            <p className="page-subtitle">Here's your financial overview for {getSubLabel()}</p>
          </div>
          
          <div className="period-selector" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Quick Presets */}
            <div className="period-presets" style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: 10, padding: 3 }}>
              {PERIOD_OPTIONS.map((p) => (
                <button 
                  key={p} 
                  className={`period-btn${period === p ? ' active' : ''}`} 
                  onClick={() => { setPeriod(p); setViewMode('month'); }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Custom Date Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '4px 12px' }}>
              <select 
                value={viewMode} 
                onChange={(e) => {
                  setViewMode(e.target.value);
                  setPeriod(null);
                }}
                style={{ background: 'transparent', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="month">Month View</option>
                <option value="day">Day View</option>
              </select>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPeriod(null);
                }}
                style={{ background: 'transparent', border: 'none', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }} 
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Retrieving live financial overview...
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="stat-cards-grid">
            <StatCard icon={<Wallet size={22} />} iconColor="blue" label="Total Balance" value={formatCurrencyFull(stats.totalBalance)} sub="Across all accounts" />
            <StatCard icon={<TrendingUp size={22} />} iconColor="green" label="Income" value={formatCurrencyFull(stats.monthlyIncome)} sub={viewMode === 'day' && !period ? 'Selected Day' : 'Selected Period'} />
            <StatCard icon={<TrendingDown size={22} />} iconColor="coral" label="Expenses" value={formatCurrencyFull(stats.monthlyExpenses)} sub={viewMode === 'day' && !period ? 'Selected Day' : 'Selected Period'} />
            <StatCard icon={<Sparkles size={22} />} iconColor="purple" label="Net Savings" value={formatCurrencyFull(stats.netSavings)} sub={viewMode === 'day' && !period ? 'Selected Day' : 'Selected Period'} />
          </div>

          {/* Charts Row */}
          <div className="charts-row">
            {/* Income vs Expenses */}
            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h3 className="heading-4">Income vs Expenses</h3>
                    <p className="caption">{period || viewMode === 'month' ? 'Daily tracking' : 'Last 7 days trend'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 'var(--font-sm)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7CB68E' }} /> Income
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E07A6A' }} /> Expenses
                    </span>
                  </div>
                </div>
                {monthlyData.length === 0 ? (
                  <div style={{ display: 'flex', height: 260, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    No trend data available for this range.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7CB68E" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#7CB68E" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E07A6A" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#E07A6A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}K`} />
                      <Tooltip
                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 13, boxShadow: 'var(--card-shadow-hover)' }}
                        formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, undefined]}
                      />
                      <Area type="monotone" dataKey="income" stroke="#7CB68E" strokeWidth={2.5} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 5, stroke: '#7CB68E', strokeWidth: 2, fill: '#fff' }} />
                      <Area type="monotone" dataKey="expenses" stroke="#E07A6A" strokeWidth={2.5} fill="url(#expenseGrad)" dot={false} activeDot={{ r: 5, stroke: '#E07A6A', strokeWidth: 2, fill: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Spending Breakdown */}
            <div className="card">
              <div className="card-body">
                <h3 className="heading-4">Spending Breakdown</h3>
                <p className="caption" style={{ marginBottom: 16 }}>By category · {getSubLabel()}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={spending} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" stroke="none" paddingAngle={2}>
                        {spending.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, maxHeight: 160, overflowY: 'auto' }}>
                    {spending.map((s) => (
                      <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                          {s.name}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)', marginLeft: 8 }}>{formatCompact(s.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Net Worth + Recent Transactions */}
          <div className="charts-row-equal">
            {/* Net Worth */}
            <div className="card">
              <div className="card-body">
                <h3 className="heading-4">Net Worth</h3>
                <p className="caption">Trajectory Sparkline</p>
                <div style={{ margin: '16px 0 4px' }}>
                  <span className="heading-1">{formatCurrencyFull(stats.totalBalance)}</span>
                </div>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--accent-primary-dark)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                  <ArrowUpRight size={14} /> Total available net assets
                </p>
                {netWorth.length === 0 ? (
                  <div style={{ display: 'flex', height: 100, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    No historical data available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={netWorth} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis hide />
                      <Line type="monotone" dataKey="value" stroke="#7CB68E" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 className="heading-4">Recent Transactions</h3>
                    <p className="caption">{period || viewMode === 'month' ? 'Last 5 transactions' : 'Transactions for this day'}</p>
                  </div>
                  <a href="/transactions" className="view-all-link">View All <ChevronRight size={14} /></a>
                </div>
                {recentTx.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
                    No transactions found for this period.
                  </div>
                ) : (
                  recentTx.map((tx) => {
                    const IconComp = ICON_MAP[tx.icon] || ICON_MAP.default;
                    return (
                      <div className="tx-item" key={tx.id}>
                        <div className={`tx-icon ${tx.icon || 'default'}`}>
                          <IconComp size={18} />
                        </div>
                        <div className="tx-details">
                          <div className="tx-name">{tx.description}</div>
                          <div className="tx-meta">
                            <span className="tx-meta-tag">{tx.category}</span>
                            <span>{formatRelativeTime(tx.date)}</span>
                          </div>
                        </div>
                        <div className="tx-amount">
                          <div className={`tx-amount-value ${tx.type}`}>
                            {tx.type === 'income' ? '+' : ''}₹{tx.amount.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* AI Insights Bar */}
          <div className="ai-insights-bar">
            <div className="ai-insights-header">
              <Sparkles className="ai-insights-icon" size={28} />
              <div>
                <div className="ai-insights-title">AI Financial Insights</div>
              </div>
              <span className="ai-insights-subtitle">Powered by FinSight AI</span>
            </div>
            <div className="ai-insights-cards">
              {insights.map((insight, i) => {
                const iconMap = { warning: AlertTriangle, success: CheckCircle2, info: Info };
                const Icon = iconMap[insight.type] || Info;
                return (
                  <div className="ai-insight-card" key={i}>
                    <Icon className={`ai-insight-card-icon ${insight.type}`} size={28} />
                    <p className="ai-insight-card-text">{insight.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, iconColor, label, value, sub, trend }) {
  return (
    <div className="stat-card animate-fade-in">
      <div className={`stat-card-icon ${iconColor}`}>{icon}</div>
      <div className="stat-card-content">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-sub">{sub}</div>
      </div>
    </div>
  );
}
