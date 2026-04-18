function formatMoney(value) {
  return `${parseFloat(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR`;
}

async function generateAiSummary() {
  const month = document.getElementById('reportMonth').value.trim();
  const year = document.getElementById('reportYear').value.trim();
  const target = document.getElementById('aiReportSummary');

  if (!month || !year) {
    target.textContent = 'Choose both month and year first.';
    return;
  }

  target.textContent = 'Generating summary...';

  try {
    const res = await apiCall(`/ai/report-summary?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`);
    target.textContent = res.data.summary;
  } catch (err) {
    target.textContent = err.message;
  }
}

async function loadReports() {
  const month = document.getElementById('reportMonth').value.trim();
  const year = document.getElementById('reportYear').value.trim();
  const endpoint = year ? `/reports/monthly?year=${encodeURIComponent(year)}` : '/reports/monthly';

  try {
    const res = await apiCall(endpoint);
    let rows = res.data.report;

    if (month && year) {
      const targetStr = `${year}-${month.padStart(2, '0')}`;
      rows = rows.filter(r => r.month === targetStr);
      if (rows.length === 0) {
        alert(`No transactions exist for ${targetStr}.`);
      }
    }

    document.getElementById('reportsTable').innerHTML = rows.length
      ? rows.map((row) => `
        <tr>
          <td>${row.month}</td>
          <td>${formatMoney(row.total_income)}</td>
          <td>${formatMoney(row.total_expense)}</td>
          <td>${formatMoney(row.savings)}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="4">No report data available.</td></tr>';
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById('applyReportYear').onclick = loadReports;
document.getElementById('generateAiSummary').onclick = generateAiSummary;

document.getElementById('reportMonth').value = new Date().getMonth() + 1;
document.getElementById('reportYear').value = new Date().getFullYear();

loadReports();
