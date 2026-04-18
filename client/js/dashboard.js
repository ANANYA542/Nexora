const BAR_COLORS = ['#18221f', '#b39b59', '#5a8a7a', '#d4a44c', '#6b7b73', '#c9b88c', '#3d5a4e', '#8c7a5a'];

let localDashboardData = null;
let localBudgetData = null;
let localAnomaliesCount = null;

function formatRelativeTime(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} days ago`;
  return 'last week';
}

function getDashboardCurrency() {
  return document.getElementById('dashboardCurrency').value || 'INR';
}

function formatMoney(value, currency) {
  return `${parseFloat(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function renderBarChart(canvasId, labels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const containerWidth = canvas.parentElement.clientWidth;
  const canvasHeight = 220;
  canvas.width = containerWidth * dpr;
  canvas.height = canvasHeight * dpr;
  canvas.style.width = containerWidth + 'px';
  canvas.style.height = canvasHeight + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, containerWidth, canvasHeight);

  if (labels.length === 0) {
    ctx.fillStyle = '#888';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', containerWidth / 2, canvasHeight / 2);
    return;
  }
  const padding = { top: 20, right: 20, bottom: 50, left: 15 };
  const chartW = containerWidth - padding.left - padding.right;
  const chartH = canvasHeight - padding.top - padding.bottom;
  const maxVal = Math.max(...values, 1);
  const barGap = 12;
  const barWidth = Math.max(16, Math.min(48, (chartW - barGap * (labels.length + 1)) / labels.length));
  const totalBarsWidth = labels.length * barWidth + (labels.length + 1) * barGap;
  const offsetX = padding.left + (chartW - totalBarsWidth) / 2;

  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(containerWidth - padding.right, y);
    ctx.stroke();
  }
  for (let i = 0; i < labels.length; i++) {
    const x = offsetX + barGap + i * (barWidth + barGap);
    const barH = (values[i] / maxVal) * chartH;
    const y = padding.top + chartH - barH;
    ctx.fillStyle = BAR_COLORS[i % BAR_COLORS.length];
    ctx.beginPath();
    const radius = 3;
    ctx.moveTo(x, y + radius);
    ctx.arcTo(x, y, x + barWidth, y, radius);
    ctx.arcTo(x + barWidth, y, x + barWidth, y + barH, radius);
    ctx.lineTo(x + barWidth, padding.top + chartH);
    ctx.lineTo(x, padding.top + chartH);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(parseFloat(values[i]).toLocaleString(undefined, { maximumFractionDigits: 0 }), x + barWidth / 2, y - 6);
    ctx.fillStyle = '#888';
    ctx.font = '10px Inter, sans-serif';
    ctx.save();
    ctx.translate(x + barWidth / 2, padding.top + chartH + 10);
    ctx.rotate(-0.4);
    ctx.textAlign = 'right';
    const label = labels[i].length > 10 ? labels[i].slice(0, 9) + '…' : labels[i];
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
}

function renderMetricList(elementId, items, valueKey, currency) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.innerHTML = items.length
    ? items.map((item) => `<li><span>${item.category_name || new Date(item.date).toLocaleDateString()}</span><strong>${formatMoney(item[valueKey], currency)}</strong></li>`).join('')
    : '<li><span>No data available.</span></li>';
}

function checkRenderHealthScore() {
  if (!localDashboardData || !localBudgetData || localAnomaliesCount === null) return;
  let score = 0;
  const inc = parseFloat(localDashboardData.summary.total_income || 0);
  const exp = parseFloat(localDashboardData.summary.total_expense || 0);
  const rate = inc > 0 ? ((inc - exp) / inc) * 100 : 0;
  
  if (rate >= 20) score += 25;
  else if (rate >= 10) score += 15;

  let exceededCount = 0;
  localBudgetData.forEach(b => { if(parseFloat(b.amount_spent) > parseFloat(b.limit_amount)) exceededCount++; });
  if(localBudgetData.length > 0 && exceededCount === 0) score += 25;
  else if(localBudgetData.length > 0 && exceededCount < 2) score += 15;

  if (inc > 0 || exp > 0) {
    if(inc > exp) score += 25;
    else if(inc >= exp * 0.9) score += 15;
    
    if(localAnomaliesCount === 0) score += 25;
    else if(localAnomaliesCount <= 1) score += 15;
  }

  let color = '#b24a3a'; 
  let label = 'At Risk';
  
  if (inc === 0 && exp === 0) { 
    score = 0; 
    color = '#94a3b8'; 
    label = 'Not Enough Data'; 
  } else if(score >= 80) { 
    color = '#5a8a7a'; 
    label = 'Good'; 
  } else if(score >= 50) { 
    color = '#d4a44c'; 
    label = 'Needs Attention'; 
  }

  document.getElementById('healthScoreNum').innerHTML = `Financial Health Score: <span style="color:${color}">${score}/100</span>`;
  const lbl = document.getElementById('healthScoreLabel');
  lbl.innerHTML = label;
  lbl.style.color = color;
  
  const bar = document.getElementById('healthScoreBar');
  bar.style.width = `${score}%`;
  bar.style.background = color;

  document.getElementById('badgeSavings').innerHTML = `Savings: ${rate.toFixed(0)}%`;
  document.getElementById('badgeBudgets').innerHTML = `Budgets: ${localBudgetData.length > 0 ? (localBudgetData.length - exceededCount) + '/' + localBudgetData.length : '0/0'} on track`;
  document.getElementById('badgeAnomalies').innerHTML = `Anomalies: ${localAnomaliesCount} this month`;
  document.getElementById('badgeIncome').innerHTML = `Income Sources: ${localDashboardData.income_by_category.length}`;
}

function renderDashboard(data) {
  localDashboardData = data;
  const currency = data.currency || 'INR';
  document.getElementById('summary').innerHTML = `
    <div class="card"><span class="label">Total Income</span><p class="value">${formatMoney(data.summary.total_income, currency)}</p></div>
    <div class="card"><span class="label">Total Expense</span><p class="value">${formatMoney(data.summary.total_expense, currency)}</p></div>
    <div class="card-dark"><span class="label">Net Savings</span><p class="value">${formatMoney(data.summary.savings, currency)}</p></div>
  `;
  const expLabels = data.expense_by_category.map((c) => c.category_name);
  const expValues = data.expense_by_category.map((c) => parseFloat(c.total));
  renderBarChart('expenseChart', expLabels, expValues);
  const incLabels = data.income_by_category.map((c) => c.category_name);
  const incValues = data.income_by_category.map((c) => parseFloat(c.total));
  renderBarChart('incomeChart', incLabels, incValues);
  renderMetricList('expenseByCategory', data.expense_by_category, 'total', currency);
  renderMetricList('incomeByCategory', data.income_by_category, 'total', currency);
  const highestSpendingDay = document.getElementById('highestSpendingDay');
  highestSpendingDay.innerHTML = data.highest_spending_day
    ? `<div class="metric-copy"><strong>${new Date(data.highest_spending_day.date).toLocaleDateString()}</strong><span>${formatMoney(data.highest_spending_day.total_expense, currency)}</span></div>`
    : '<div class="empty-state">No spending data yet.</div>';
  
  checkRenderHealthScore();
}

async function loadDashboard() {
  const currency = getDashboardCurrency();
  const timeframe = document.getElementById('dashboardTimeframe') ? document.getElementById('dashboardTimeframe').value : 'all';
  const cacheKey = `dashboard_data_${currency}_${timeframe}`;
  
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try { renderDashboard(JSON.parse(cached)); } catch (_err) {}
  } else {
    document.getElementById('summary').innerHTML = `
      <div class="card"><span class="label">Total Income</span><p class="value"><div class="skeleton" style="height:32px; width:120px;"></div></p></div>
      <div class="card"><span class="label">Total Expense</span><p class="value"><div class="skeleton" style="height:32px; width:120px;"></div></p></div>
      <div class="card-dark"><span class="label">Net Savings</span><p class="value"><div class="skeleton" style="height:32px; width:120px;"></div></p></div>
    `;
  }
  try {
    let endpoint = `/dashboard?currency=${encodeURIComponent(currency)}`;
    
    if (timeframe !== 'all') {
      const year = new Date().getFullYear();
      const monthIdx = parseInt(timeframe, 10);
      const start = new Date(year, monthIdx - 1, 1).toISOString().split('T')[0];
      const end = new Date(year, monthIdx, 0).toISOString().split('T')[0];
      endpoint += `&start_date=${start}&end_date=${end}`;
    }

    const res = await apiCall(endpoint);
    const data = res.data;
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    renderDashboard(data);
  } catch (err) {
    document.getElementById('summary').innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align:center; padding:24px;">⚠️ Could not load summary. <a href="#" onclick="loadDashboard()">Retry →</a></div>`;
    localDashboardData = { summary: { total_income: 0, total_expense: 0 }, income_by_category: [], expense_by_category: [] };
    checkRenderHealthScore();
  }
}

let currentTxPage = 1;
async function loadRecentTransactions(page = 1) {
  currentTxPage = page;
  const tbody = document.getElementById('recentTransactions');
  const pagLabel = document.getElementById('txPaginationLabel');
  const btnPrev = document.getElementById('btnTxPrev');
  const btnNext = document.getElementById('btnTxNext');
  
  tbody.innerHTML = `
    <tr><td colspan="4"><div class="skeleton" style="height:40px; margin-bottom:8px"></div></td></tr>
    <tr><td colspan="4"><div class="skeleton" style="height:40px; margin-bottom:8px"></div></td></tr>
    <tr><td colspan="4"><div class="skeleton" style="height:40px"></div></td></tr>
  `;
  btnPrev.disabled = true; btnNext.disabled = true;
  
  try {
    const res = await apiCall(`/transactions?page=${page}&limit=5`);
    const txns = res.data.transactions;
    const pag = res.data.pagination;
    
    if (txns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--text-muted)">No transactions yet.</td></tr>';
      pagLabel.innerText = 'Showing 0-0 of 0 transactions';
      return;
    }

    tbody.innerHTML = txns.map((t) => {
      const isAnom = t.is_anomaly;
      const amountFmt = parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) + ' ' + t.currency;
      const desc = isAnom ? `<span class="anomaly-icon">! <span class="anomaly-tooltip">${t.anomaly_reason || 'Anomaly detected'}</span></span>${t.description}` : t.description;
      const color = t.type === 'income' ? '#5a8a7a' : '#121212';
      
      return `
        <tr class="${isAnom ? 'row-anomaly' : ''}">
          <td>${t.date ? t.date.split('T')[0] : '-'}</td>
          <td><strong>${desc || '-'}</strong><br><span class="muted-inline" style="font-size:11px; text-transform:uppercase">${t.type}</span></td>
          <td>${t.category_name || '-'}</td>
          <td style="color:${color}; font-weight:600;">${t.type === 'income' ? '+' : '-'}${amountFmt}</td>
        </tr>
      `;
    }).join('');
    
    const startIdx = ((pag.page - 1) * pag.limit) + 1;
    const endIdx = Math.min(pag.page * pag.limit, pag.total);
    pagLabel.innerText = `Showing ${startIdx}-${endIdx} of ${pag.total} transactions`;
    
    btnPrev.disabled = pag.page <= 1;
    btnNext.disabled = pag.page >= pag.totalPages;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">Could not load transactions. <a href="#" onclick="loadRecentTransactions(${page})">Retry</a></td></tr>`;
  }
}

function changeTxPage(change) {
  loadRecentTransactions(currentTxPage + change);
}

async function loadBudgetAllocation() {
  const container = document.getElementById('budgetAllocation');
  container.innerHTML = '<div class="skeleton" style="height:60px;"></div>';
  try {
    const timeframe = document.getElementById('dashboardTimeframe') ? document.getElementById('dashboardTimeframe').value : 'all';
    
    let endpoint = '/budgets';
    if (timeframe !== 'all') {
      const year = new Date().getFullYear();
      endpoint += `?month=${timeframe}&year=${year}`;
    }

    const res = await apiCall(endpoint);
    const budgets = res.data.budgets;
    localBudgetData = budgets;
    checkRenderHealthScore();
    if (budgets.length === 0) {
      container.innerHTML = `<div class="empty-state">No budgets set for ${timeframe === 'all' ? 'any timeframe' : 'this month'}.</div>`;
      return;
    }
    container.innerHTML = '<ul class="budget-bars">' + budgets.map((b) => {
      const limit = parseFloat(b.limit_amount);
      const spent = parseFloat(b.amount_spent);
      const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
      const overBudget = spent > limit;
      return `
        <li class="budget-bar-item">
          <div class="budget-bar-header">
            <span>${b.category_name}</span>
            <span>${spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ${limit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="budget-track">
            <div class="budget-fill" style="width: ${pct}%; background: ${overBudget ? '#b24a3a' : 'var(--brand-dark)'}"></div>
          </div>
        </li>
      `;
    }).join('') + '</ul>';
  } catch (err) {
    container.innerHTML = `Could not load. <a href="#" onclick="loadBudgetAllocation()">Retry</a>`;
    localBudgetData = [];
    checkRenderHealthScore();
  }
}

async function loadAnomalies() {
  const tbody = document.getElementById('anomalyTable');
  if (tbody) tbody.innerHTML = '<tr><td colspan="4"><div class="skeleton" style="height:40px;"></div></td></tr>';
  try {
    const res = await apiCall('/transactions/anomalies');
    const anomalies = res.data.anomalies || [];
    localAnomaliesCount = anomalies.length;
    checkRenderHealthScore();
    if (tbody) {
      if (anomalies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="border:none; text-align:center;">No unusual transactions in the last 30 days.</td></tr>';
        return;
      }
      tbody.innerHTML = anomalies.map((a) => `
        <tr>
          <td>${a.date}</td>
          <td><strong>${a.description || '-'}</strong>${a.anomaly_reason ? `<br><span class="muted-inline" style="font-size:12px;line-height:1.4;display:block;margin-top:4px;">${a.anomaly_reason}</span>` : ''}</td>
          <td>${a.category || '-'}</td>
          <td style="color:#b24a3a;font-weight:600;">${parseFloat(a.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${a.currency}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="4">Could not load. <a href="#" onclick="loadAnomalies()">Retry</a></td></tr>`;
    localAnomaliesCount = 0;
    checkRenderHealthScore();
  }
}

/* AI INSIGHTS HUB LOGIC */

let currentAiPage = 1;
let currentAiFilter = '';

function switchAITab(tabIndex) {
  sessionStorage.setItem('dashboard_active_tab', tabIndex);
  for(let i=1; i<=3; i++) {
    const btn = document.getElementById(`tabBtn${i}`);
    const tab = document.getElementById(`aiTab${i}`);
    if (btn) btn.classList.toggle('active', i === tabIndex);
    if (tab) tab.style.display = (i === tabIndex) ? 'block' : 'none';
  }
}

function setAIFilter(btn) {
  document.querySelectorAll('#aiFilters .pill-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  currentAiFilter = btn.getAttribute('data-filter');
  loadAIFeed(1);
}

const ICON_MAP = {
  'budget_overrun': 'Budget Alert',
  'anomaly': 'Unusual Transaction',
  'monthly_report': 'Monthly Report',
  'weekly_proactive': 'Weekly Insights',
  'budget_advice': 'Budget Advice',
  'pattern_analysis': 'Spending Pattern',
  'income_insight': 'Income Analysis'
};

async function markAllAiRead() {
  await loadAIFeed(1);
}

async function loadAIFeed(page = 1) {
  if (page < 1) return;
  currentAiPage = page;
  const container = document.getElementById('aiFeedContainer');
  const banner = document.getElementById('unreadBanner');
  const pagBlock = document.getElementById('aiPaginationBlock');
  
  container.innerHTML = `
    <div class="skeleton" style="height:88px; margin-bottom:12px"></div>
    <div class="skeleton" style="height:88px; margin-bottom:12px"></div>
    <div class="skeleton" style="height:88px"></div>
  `;
  document.getElementById('btnAiPrev').disabled = true;
  document.getElementById('btnAiNext').disabled = true;

  try {
    const res = await apiCall(`/ai/recommendations?page=${page}&limit=5${currentAiFilter ? '&type='+currentAiFilter : ''}`);
    const data = res.data;
    
    if (data.recommendations.length === 0) {
      container.innerHTML = `
        <div class="empty-state-full">
          <div style="font-size:16px; color:var(--text-dark); font-weight:500; margin-bottom:8px;">No insights yet</div>
          <div style="font-size:14px; color:var(--text-muted); margin-bottom:16px;">Add transactions and set budgets to get personalized AI insights.</div>
          <button class="secondary small" onclick="switchAITab(2)">Generate your first insight</button>
        </div>
      `;
      pagBlock.style.display = 'none';
      banner.style.display = 'none';
      return;
    }
    
    pagBlock.style.display = 'flex';
    const startIdx = ((data.pagination.page - 1) * data.pagination.limit) + 1;
    const endIdx = Math.min(data.pagination.page * data.pagination.limit, data.pagination.total);
    document.getElementById('aiPaginationLabel').innerText = `Showing ${startIdx}-${endIdx} of ${data.pagination.total} insights`;
    
    document.getElementById('btnAiPrev').disabled = data.pagination.page <= 1;
    document.getElementById('btnAiNext').disabled = endIdx >= data.pagination.total;

    let unreadCount = 0;

    container.innerHTML = data.recommendations.map(r => {
      let bodyText = '';
      try {
        const c = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
        if(c.recommendations) bodyText = c.recommendations.join('<br><br>');
        else if(c.report) bodyText = c.report.replace(/\\n/g, '<br>');
        else if(c.pattern) bodyText = `PATTERN:<br>${c.pattern}<br><br>SHIFT:<br>${c.shift}<br><br>PEAK:<br>${c.peak}<br><br>OPPORTUNITY:<br>${c.opportunity}`;
        else Object.keys(c).forEach(k => { if(c[k]) bodyText += `<strong>${k.toUpperCase()}</strong>:<br>${c[k]}<br><br>` });
      } catch(e) { bodyText = r.content; }
      
      const isUnread = !r.is_read;
      if(isUnread) unreadCount++;
      const typeStr = ICON_MAP[r.type] || ((r.type || 'insight').toUpperCase().replace('_', ' '));
      const dt = formatRelativeTime(r.created_at);
      
      return `
        <div class="insight-card ${isUnread ? 'unread' : ''}">
          ${isUnread ? '<span class="new-badge">NEW</span>' : ''}
          <div class="insight-meta">
            <span>${typeStr}</span>
            <span>${dt}</span>
          </div>
          <div class="insight-body">${bodyText.trim()}</div>
        </div>
      `;
    }).join('');

    if (unreadCount > 0 && page === 1) {
      banner.style.display = 'flex';
      banner.innerText = `── ${unreadCount} new insights since your last visit ──`;
    } else {
      banner.style.display = 'none';
    }

  } catch (err) {
    container.innerHTML = `<div class="empty-state-full">Could not load insights. <a href="#" onclick="loadAIFeed(${page})">Retry</a></div>`;
  }
}

async function generateAI(endpoint, btn, title) {
  const ogText = btn.textContent;
  btn.innerHTML = 'Analyzing...';
  btn.disabled = true;
  document.getElementById('aiGenResultArea').style.display = 'none';
  try {
    const res = await apiCall(`/ai/${endpoint}`, 'POST');
    renderAIResult(res.data, title);
    loadAIFeed(1);
  } catch(err) {
    alert('Could not load analysis: ' + err.message);
  } finally {
    btn.textContent = ogText;
    btn.disabled = false;
  }
}

function renderAIResult(data, title) {
  const area = document.getElementById('aiGenResultArea');
  document.getElementById('resultIconType').innerText = title;
  const contentBox = document.getElementById('aiGenContent');
  
  if (!data) {
    contentBox.innerHTML = '<div class="sub-block">No actionable insights could be generated right now. You may need more transaction history before AI can process patterns.</div>';
    area.style.display = 'block';
    return;
  }
  
  let html = '';
  if (data.recommendations) {
    html = data.recommendations.map(r => {
       if(r.includes('[OPTIMIZE]')) return `<div class="sub-block"><span class="badge-optimize">OPTIMIZE</span><div style="margin-top:8px">${r.replace('[OPTIMIZE]', '')}</div></div>`;
       if(r.includes('[CREATE]')) return `<div class="sub-block"><span class="badge-create">CREATE</span><div style="margin-top:8px">${r.replace('[CREATE]', '')}</div></div>`;
       if(r.includes('[REALLOCATE]')) return `<div class="sub-block"><span class="badge-reallocate">REALLOCATE</span><div style="margin-top:8px">${r.replace('[REALLOCATE]', '')}</div></div>`;
       return `<div class="sub-block">${r}</div>`;
    }).join('');
  } else if (data.pattern) {
    html = `
      <div class="sub-block"><strong>PATTERN</strong><br>${data.pattern}</div>
      <div class="sub-block"><strong>SHIFT</strong><br>${data.shift}</div>
      <div class="sub-block"><strong>PEAK</strong><br>${data.peak}</div>
      <div class="sub-block"><strong>OPPORTUNITY</strong><br>${data.opportunity}</div>
    `;
  } else if (data.report) {
    html = data.report.replace(/\\n\\n/g, '<br><br>');
  } else {
    Object.keys(data).forEach(k => {
      html += `<div class="sub-block"><strong style="text-transform:uppercase">${k}</strong><br>${data[k]}</div>`;
    });
  }

  contentBox.innerHTML = html;
  area.style.display = 'block';
}

function showReportPicker() {
  document.getElementById('reportDesc').style.display = 'none';
  document.getElementById('btnShowPicker').style.display = 'none';
  
  const yr = document.getElementById('reportYear');
  yr.innerHTML = '';
  const currentY = new Date().getFullYear();
  for(let i=0; i<3; i++) yr.innerHTML += `<option value="${currentY - i}">${currentY - i}</option>`;
  
  document.getElementById('reportPicker').style.display = 'block';
}

function cancelReportPicker(e) {
  e.preventDefault();
  document.getElementById('reportPicker').style.display = 'none';
  document.getElementById('reportDesc').style.display = 'block';
  document.getElementById('btnShowPicker').style.display = 'block';
}

async function submitAIReport(btn) {
  const m = document.getElementById('reportMonth').value;
  const y = document.getElementById('reportYear').value;
  
  const ogText = btn.textContent;
  btn.innerHTML = 'Analyzing...';
  btn.disabled = true;
  document.getElementById('aiGenResultArea').style.display = 'none';
  try {
    const res = await apiCall('/ai/monthly-report', 'POST', { month: parseInt(m), year: parseInt(y) });
    renderAIResult(res.data, 'Monthly Report');
    loadAIFeed(1); 
  } catch(err) {
    alert('Could not load report: ' + err.message);
  } finally {
    btn.textContent = ogText;
    btn.disabled = false;
    cancelReportPicker(new Event('click'));
  }
}

function closeResult() {
  document.getElementById('aiGenResultArea').style.display = 'none';
}

function copyResult() {
  const text = document.getElementById('aiGenContent').innerText;
  navigator.clipboard.writeText(text);
  const btn = document.getElementById('btnCopyResult');
  btn.innerText = 'Copied!';
  setTimeout(() => btn.innerText = 'Copy', 2000);
}

// Chat functions
function handleChatEnter(e) {
  if (e.key === 'Enter') askAiAdvisor();
}
function fillChat(q) {
  document.getElementById('aiQuestion').value = q;
}
async function askAiAdvisor() {
  const input = document.getElementById('aiQuestion');
  const hist = document.getElementById('chatHistory');
  const typing = document.getElementById('chatTyping');
  const btn = document.querySelector('.chat-send-btn');
  const message = input.value.trim();

  if (!message) return;
  
  document.getElementById('chatSuggestions').style.display = 'none';

  // Append user bubble
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-bubble-user';
  userDiv.innerHTML = `${message} <span class="chat-time">${formatRelativeTime(new Date())}</span>`;
  hist.appendChild(userDiv);
  
  input.value = '';
  typing.style.display = 'inline-block';
  btn.disabled = true;
  hist.scrollTop = hist.scrollHeight;

  try {
    const res = await apiCall('/ai/chat', 'POST', { message });
    typing.style.display = 'none';
    
    // Append AI bubble
    const aiDiv = document.createElement('div');
    aiDiv.className = 'chat-bubble-ai';
    aiDiv.innerHTML = `<strong>AI:</strong> ${res.data.reply} <span class="chat-time">${formatRelativeTime(new Date())}</span>`;
    hist.appendChild(aiDiv);
  } catch (err) {
    typing.style.display = 'none';
    const errDiv = document.createElement('div');
    errDiv.className = 'chat-bubble-ai';
    errDiv.style.color = '#b24a3a';
    errDiv.innerHTML = `Error: ${err.message}`;
    hist.appendChild(errDiv);
  } finally {
    btn.disabled = false;
    hist.scrollTop = hist.scrollHeight;
  }
}


/* INITIALIZATION */
document.getElementById('runDailyChecks').onclick = () => triggerNotificationAction('/notifications/trigger/daily', 'Daily checks triggered.');
document.getElementById('sendWeeklySummary').onclick = () => triggerNotificationAction('/notifications/trigger/weekly', 'Weekly summary triggered.');
document.getElementById('sendMonthlySummary').onclick = () => triggerNotificationAction('/notifications/trigger/monthly', 'Monthly summary triggered.');
document.getElementById('dashboardCurrency').onchange = loadDashboard;

const savedTab = sessionStorage.getItem('dashboard_active_tab') || 1;
switchAITab(parseInt(savedTab));

loadAIFeed(1);
loadDashboard();
loadLatestNotifications();
loadRecentTransactions(1);
loadBudgetAllocation();
loadAnomalies();
