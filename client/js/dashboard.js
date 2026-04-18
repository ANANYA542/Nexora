const BAR_COLORS = ['#18221f', '#b39b59', '#5a8a7a', '#d4a44c', '#6b7b73', '#c9b88c', '#3d5a4e', '#8c7a5a'];

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

function renderDashboard(data) {
  const currency = data.currency || 'INR';
  document.getElementById('summary').innerHTML = `
    <div class="card">
      <span class="label">Total Income</span>
      <p class="value">${formatMoney(data.summary.total_income, currency)}</p>
    </div>
    <div class="card">
      <span class="label">Total Expense</span>
      <p class="value">${formatMoney(data.summary.total_expense, currency)}</p>
    </div>
    <div class="card-dark">
      <span class="label">Net Savings</span>
      <p class="value">${formatMoney(data.summary.savings, currency)}</p>
    </div>
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
    ? `
      <div class="metric-copy">
        <strong>${new Date(data.highest_spending_day.date).toLocaleDateString()}</strong>
        <span>${formatMoney(data.highest_spending_day.total_expense, currency)}</span>
      </div>
    `
    : 'No spending data yet.';
}

async function loadDashboard() {
  const currency = getDashboardCurrency();
  const cacheKey = `dashboard_data_${currency}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      renderDashboard(JSON.parse(cached));
    } catch (_err) {}
  } else {
    document.getElementById('summary').innerHTML = `
      <div class="card"><span class="label">Total Income</span><p class="value">Loading...</p></div>
      <div class="card"><span class="label">Total Expense</span><p class="value">Loading...</p></div>
      <div class="card-dark"><span class="label">Net Savings</span><p class="value">Loading...</p></div>
    `;
  }

  try {
    const res = await apiCall(`/dashboard?currency=${encodeURIComponent(currency)}`);
    const data = res.data;
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    renderDashboard(data);
  } catch (err) {
    if (!cached) {
      alert(err.message);
    }
  }
}


async function loadRecentTransactions() {
  const tbody = document.getElementById('recentTransactions');
  tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
  try {
    const res = await apiCall('/transactions?limit=6');
    const txns = res.data.transactions;
    if (txns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No transactions yet.</td></tr>';
      return;
    }
    tbody.innerHTML = txns.map((t) => `
      <tr>
        <td>${t.date ? t.date.split('T')[0] : '-'}</td>
        <td><strong>${t.description || '-'}</strong><br><span class="muted-inline">${t.type}</span></td>
        <td>${t.category_name || '-'}</td>
        <td style="color: ${t.type === 'income' ? 'var(--brand-gold)' : '#b24a3a'}; font-weight: 600;">${t.type === 'income' ? '+' : '-'}${parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${t.currency}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">${err.message}</td></tr>`;
  }
}


async function loadBudgetAllocation() {
  const container = document.getElementById('budgetAllocation');
  try {
    const date = new Date();
    const res = await apiCall(`/budgets?month=${date.getMonth() + 1}&year=${date.getFullYear()}`);
    const budgets = res.data.budgets;
    if (budgets.length === 0) {
      container.innerHTML = 'No budgets set for this month.';
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
    container.innerHTML = err.message;
  }
}

async function askAiAdvisor() {
  const input = document.getElementById('aiQuestion');
  const output = document.getElementById('aiReply');
  const button = document.getElementById('askAiButton');
  const message = input.value.trim();

  if (!message) {
    output.textContent = 'Enter a question first.';
    return;
  }

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Thinking...';
  output.textContent = 'Generating answer...';

  try {
    const res = await apiCall('/ai/chat', 'POST', { message });
    output.textContent = res.data.reply;
  } catch (err) {
    output.textContent = err.message;
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function loadAnomalies() {
  const tbody = document.getElementById('anomalyTable');
  tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
  try {
    const res = await apiCall('/transactions/anomalies');
    const anomalies = res.data.anomalies;
    if (anomalies.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No unusual transactions in the last 30 days.</td></tr>';
      return;
    }
    tbody.innerHTML = anomalies.map((a) => `
      <tr>
        <td>${a.date}</td>
        <td>
          <strong>${a.description || '-'}</strong>
          ${a.anomaly_reason ? `<br><span class="muted-inline" style="font-size:12px;line-height:1.4;display:block;margin-top:4px;">${a.anomaly_reason}</span>` : ''}
        </td>
        <td>${a.category || '-'}</td>
        <td style="color:#b24a3a;font-weight:600;">${parseFloat(a.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${a.currency}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">${err.message}</td></tr>`;
  }
}

document.getElementById('runDailyChecks').onclick = () => triggerNotificationAction('/notifications/trigger/daily', 'Daily checks triggered.');
document.getElementById('sendWeeklySummary').onclick = () => triggerNotificationAction('/notifications/trigger/weekly', 'Weekly summary triggered.');
document.getElementById('sendMonthlySummary').onclick = () => triggerNotificationAction('/notifications/trigger/monthly', 'Monthly summary triggered.');
document.getElementById('dashboardCurrency').onchange = loadDashboard;
document.getElementById('askAiButton').onclick = askAiAdvisor;

loadDashboard();
loadLatestNotifications();
loadRecentTransactions();
loadBudgetAllocation();
loadAnomalies();

