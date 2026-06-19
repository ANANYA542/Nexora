import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyFull, formatCompact } from '../utils/formatCurrency';
import client from '../api/client';
import {
  Search, SlidersHorizontal, ArrowUpRight, ArrowDownRight, Wallet,
  Upload, Plus, UtensilsCrossed, Briefcase, Zap, Globe, Car,
  Heart, Home, ShoppingBag, CircleDot, ChevronDown
} from 'lucide-react';

const ICON_MAP = {
  food: UtensilsCrossed, salary: Briefcase, bills: Zap,
  online: Globe, transport: Car, health: Heart, housing: Home,
  shopping: ShoppingBag, default: CircleDot,
};

const CATEGORY_FILTERS = [
  'All', 'Food', 'Transport', 'Utilities', 'Rent', 'Entertainment', 'Healthcare', 'Shopping'
];

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Date');
  const [loading, setLoading] = useState(true);

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form states for new transaction
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleUploadClick = () => {
    document.getElementById('receipt-upload-input').click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const res = await client.post('/ai/receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.success) {
        const { extracted } = res.data.data;
        alert(`Successfully parsed & added transaction!\n\nMerchant/Recipient: ${extracted.merchant}\nAmount: ₹${extracted.amount}\nCategory: ${extracted.category}\nDate: ${extracted.date}`);
        fetchData();
      } else {
        throw new Error(res.data?.message || 'Failed to parse file');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Failed to upload and parse receipt/screenshot');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Fetch transactions and categories
  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, catRes] = await Promise.all([
        client.get('/transactions?limit=100'),
        client.get('/categories')
      ]);

      if (txRes.data?.success) {
        setTransactions(txRes.data.data.transactions || []);
      }
      if (catRes.data?.success) {
        setCategories(catRes.data.data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load transaction data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter logic
  const filtered = transactions.filter((tx) => {
    const descText = tx.description || '';
    const matchSearch = !search || descText.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeFilter === 'All' || tx.category_name === activeFilter;
    return matchSearch && matchCategory;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'Date') {
      return new Date(b.date) - new Date(a.date);
    } else {
      return b.amount - a.amount;
    }
  });

  const totalCredits = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalDebits = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const netFlow = totalCredits - totalDebits;

  // Add transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) return;

    try {
      const targetCatId = categoryId || (categories.length > 0 ? categories[0].id : null);
      if (!targetCatId) {
        alert("Please create a category first or wait for initial categories to load.");
        return;
      }

      const payload = {
        description: desc,
        amount: Number(amount),
        type,
        category_id: targetCatId,
        date
      };

      const res = await client.post('/transactions', payload);
      if (res.data?.success) {
        fetchData();
        setShowAddModal(false);
        setDesc('');
        setAmount('');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create transaction");
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Transactions</h1>
            <p className="page-subtitle">Track every rupee, every time</p>
          </div>
          <div className="page-header-actions">
            <input 
              type="file" 
              id="receipt-upload-input" 
              accept="image/*" 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
            <button 
              className="btn btn-secondary" 
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              <Upload size={16} /> {isUploading ? 'Uploading...' : 'Upload'}
            </button>
            <button className="btn btn-dark" onClick={() => setShowAddModal(true)}><Plus size={16} /> Add</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Syncing transactions from server...
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card animate-fade-in stagger-1">
              <div className="stat-card-icon green"><ArrowUpRight size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Total Credits</div>
                <div className="stat-card-value">{formatCompact(totalCredits)}</div>
              </div>
            </div>
            <div className="stat-card animate-fade-in stagger-2">
              <div className="stat-card-icon coral"><ArrowDownRight size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Total Debits</div>
                <div className="stat-card-value">{formatCompact(totalDebits)}</div>
              </div>
            </div>
            <div className="stat-card animate-fade-in stagger-3">
              <div className="stat-card-icon blue"><Wallet size={22} /></div>
              <div className="stat-card-content">
                <div className="stat-card-label">Net Flow</div>
                <div className="stat-card-value" style={{ color: netFlow >= 0 ? 'var(--accent-primary-dark)' : 'var(--accent-danger)' }}>
                  {netFlow >= 0 ? '+' : ''}{formatCompact(netFlow)}
                </div>
              </div>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="card-body">
              <div className="transactions-search">
                <div className="transactions-search-input">
                  <Search className="search-icon" size={18} />
                  <input type="text" placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <button className="transactions-filter-btn" onClick={() => alert("Advanced filters enabled.")}>
                  <SlidersHorizontal size={16} /> Filters
                </button>
              </div>

              <div className="pill-tabs">
                {CATEGORY_FILTERS.map((cat) => (
                  <button key={cat} className={`pill-tab${activeFilter === cat ? ' active' : ''}`} onClick={() => setActiveFilter(cat)}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="card">
            <div className="card-body">
              <div className="transactions-list-header">
                <span className="transactions-count">{sorted.length} transactions</span>
                <button className="transactions-sort" onClick={() => setSortBy(sortBy === 'Date' ? 'Amount' : 'Date')}>
                  Sort by: {sortBy} <ChevronDown size={14} />
                </button>
              </div>

              {sorted.map((tx) => {
                const isIncome = tx.type === 'income';
                const iconKey = isIncome ? 'salary' : 'food';
                const IconComp = ICON_MAP[iconKey] || ICON_MAP.default;
                return (
                  <div className="tx-item" key={tx.id}>
                    <div className={`tx-icon ${iconKey}`}>
                      <IconComp size={18} />
                    </div>
                    <div className="tx-details">
                      <div className="tx-name">{tx.description}</div>
                      <div className="tx-meta">
                        <span className="tx-meta-tag">{tx.category_name || 'General'}</span>
                        {tx.is_anomaly && (
                          <span className="tx-meta-tag" style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)', fontWeight: 600 }}>
                            ⚠️ Anomaly
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="tx-amount">
                      <div className={`tx-amount-value ${tx.type}`}>
                        {isIncome ? '+' : '-'}₹{parseFloat(tx.amount || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="tx-amount-date">
                        {new Date(tx.date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {sorted.length === 0 && (
                <div className="empty-state">
                  <Search className="empty-state-icon" />
                  <div className="empty-state-title">No transactions found</div>
                  <p className="empty-state-text">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '450px', transform: 'scale(1)', animation: 'scaleIn 0.2s ease' }}>
            <div className="card-body">
              <h3 className="heading-3" style={{ marginBottom: 16 }}>Add Transaction</h3>
              <form onSubmit={handleAddTransaction}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Description</label>
                    <input type="text" placeholder="e.g. Swiggy Lunch, Rent Payment" value={desc} onChange={(e) => setDesc(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Amount (₹)</label>
                      <input type="number" placeholder="e.g. 500" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Date</label>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Type</label>
                      <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }}>
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Category</label>
                      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)' }}>
                        {categories.filter(c => c.type === type).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-dark">Save Transaction</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
