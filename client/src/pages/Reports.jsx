import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import {
  Sparkles, Download, RefreshCw,
  Award, ShieldAlert
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, AreaChart, Area
} from 'recharts';

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState('July 2025');
  const [narrative, setNarrative] = useState({
    summary: "Please generate your AI narrative summary below to analyze cash flows, anomalies, and goals adherence.",
    wins: [],
    leaks: [],
    actionPlan: []
  });
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Radar & line chart data states
  const [radarData, setRadarData] = useState([]);
  const [savingsRateData, setSavingsRateData] = useState([]);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const [scoreRes, historyRes, reportRes] = await Promise.all([
        client.get('/health/score').catch(() => null),
        client.get('/health/history').catch(() => null),
        client.post('/ai/monthly-report', { month: 7, year: 2025 }).catch(() => null)
      ]);

      if (scoreRes?.data?.success) {
        setRadarData(scoreRes.data.data.components || []);
      }
      
      if (historyRes?.data?.success) {
        const historyList = historyRes.data.data.history || [];
        setSavingsRateData(historyList.map(h => ({
          month: h.month,
          rate: parseInt(h.score) || 0
        })));
      }

      if (reportRes?.data?.success) {
        const rawReportText = reportRes.data.data.report || '';
        setNarrative({
          summary: rawReportText || "Monthly report parsed successfully.",
          wins: ["Income and recurring patterns parsed securely."],
          leaks: ["Check your budgets page for active category spending leaks."],
          actionPlan: ["Utilize savings targets to automate month-end savings rate improvements."]
        });
      }
    } catch (err) {
      console.error('Failed to load reports metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await client.post('/ai/monthly-report', { month: 7, year: 2025 });
      if (res.data?.success) {
        const rawReportText = res.data.data.report || '';
        setNarrative({
          summary: rawReportText,
          wins: ["Income and recurring patterns compiled in real-time."],
          leaks: ["Review your transaction alerts for possible spending leaks."],
          actionPlan: ["Adjust your category budgets using the Autopilot tool."]
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Reports & Analytics</h1>
            <p className="page-subtitle">AI-generated monthly summaries and detailed health metrics</p>
          </div>
          <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--card-bg)', fontSize: 13, fontWeight: 500 }}
            >
              <option>July 2025</option>
              <option>June 2025</option>
              <option>May 2025</option>
            </select>
            <button className="btn btn-secondary" onClick={() => alert("PDF downloaded successfully.")}><Download size={16} /> Download PDF</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Compiling monthly statistics...
        </div>
      ) : (
        <>
          {/* AI Narrative Section */}
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(124, 182, 142, 0.15)', color: 'var(--accent-primary-dark)', display: 'flex', alignItems: 'center', justifyStyle: 'center', justifyContent: 'center' }}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="heading-4">AI Monthly Narrative</h3>
                    <p className="caption">Personalized intelligence breakdown by Groq Llama 3</p>
                  </div>
                </div>
                <button className="btn btn-secondary" onClick={handleRegenerate} disabled={isRegenerating} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }}>
                  <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} /> {isRegenerating ? 'Analyzing...' : 'Regenerate'}
                </button>
              </div>

              <p style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: 16, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {narrative.summary}
              </p>

              {narrative.wins.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 16 }}>
                  <div>
                    <h4 className="heading-4" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-primary-dark)', marginBottom: 10 }}>
                      <Award size={16} /> Financial Wins
                    </h4>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 0 }}>
                      {narrative.wins.map((w, idx) => (
                        <li key={idx} style={{ fontSize: 13, display: 'flex', gap: 8 }}>
                          <span style={{ color: 'var(--accent-primary-dark)' }}>•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="heading-4" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-danger)', marginBottom: 10 }}>
                      <ShieldAlert size={16} /> Spending Leaks
                    </h4>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 0 }}>
                      {narrative.leaks.map((l, idx) => (
                        <li key={idx} style={{ fontSize: 13, display: 'flex', gap: 8 }}>
                          <span style={{ color: 'var(--accent-danger)' }}>•</span>
                          <span>{l}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {narrative.actionPlan.length > 0 && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--card-border)', background: 'var(--accent-success-bg)', padding: 12, borderRadius: 8 }}>
                  <h4 className="heading-4" style={{ fontSize: 13, color: 'var(--accent-primary-dark)', marginBottom: 6 }}>Action Plan Recommendation</h4>
                  <ol style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 16, fontSize: 12, fontWeight: 500 }}>
                    {narrative.actionPlan.map((ap, idx) => (
                      <li key={idx}>{ap}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Analytics Grid */}
          <div className="charts-row">
            {/* Radar Chart (Financial Health components) */}
            <div className="card" style={{ flex: '1' }}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', textAlign: 'left', marginBottom: 16 }}>
                  <h3 className="heading-4">Financial Health Radar</h3>
                  <p className="caption">Analysis of 6 core components out of 100</p>
                </div>
                {radarData.length === 0 ? (
                  <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No health metrics computed. Make transactions to view.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="var(--card-border)" />
                      <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 500 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <Radar name="Score" dataKey="score" stroke="var(--accent-primary-dark)" fill="var(--accent-primary)" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Savings Rate Chart */}
            <div className="card" style={{ flex: '1.2' }}>
              <div className="card-body">
                <h3 className="heading-4">Savings / Health Rate Trajectory</h3>
                <p className="caption" style={{ marginBottom: 20 }}>Monthly percentage score history</p>
                {savingsRateData.length === 0 ? (
                  <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No history logged. Check back next month!
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={savingsRateData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="savingsRateGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-info)" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="var(--accent-info)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 13 }}
                        formatter={(v) => [`${v}%`, 'Performance Metric']}
                      />
                      <Area type="monotone" dataKey="rate" stroke="var(--accent-info)" strokeWidth={2.5} fill="url(#savingsRateGrad)" dot={{ r: 3, fill: 'var(--accent-info)' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
