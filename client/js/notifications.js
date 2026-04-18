function formatNotificationDate(value) {
  return new Date(value).toLocaleString();
}

function renderNotifications(notifications) {
  const list = document.getElementById('notifications');
  if (!list) return;

  list.innerHTML = notifications.length
    ? notifications.map((notification) => `
      <li class="notification-item">
        <span>${notification.message}</span>
        <small>${formatNotificationDate(notification.sent_at)}</small>
      </li>
    `).join('')
    : '<li><span>No notifications yet.</span></li>';
}

async function loadLatestNotifications() {
  const list = document.getElementById('notifications');
  if (!list) return;

  const cached = sessionStorage.getItem('dashboard_notifications');
  if (cached) {
    try {
      renderNotifications(JSON.parse(cached));
    } catch (_err) {}
  } else {
    list.innerHTML = '<li><span>Loading notifications...</span></li>';
  }

  try {
    const res = await apiCall('/notifications');
    const notifications = res.data.notifications;
    sessionStorage.setItem('dashboard_notifications', JSON.stringify(notifications));
    renderNotifications(notifications);
  } catch (err) {
    if (!cached) {
      list.innerHTML = `<li><span>${err.message}</span></li>`;
    }
  }
}

async function triggerNotificationAction(endpoint, successMessage) {
  const status = document.getElementById('notificationStatus');
  const buttons = [
    document.getElementById('runDailyChecks'),
    document.getElementById('sendWeeklySummary'),
    document.getElementById('sendMonthlySummary'),
  ].filter(Boolean);
  const activeButton = buttons.find((button) => button.dataset.endpoint === endpoint) || null;

  buttons.forEach((button) => {
    button.disabled = true;
  });
  if (activeButton) {
    activeButton.textContent = 'Running...';
  }
  status.textContent = 'Processing request...';

  try {
    await apiCall(endpoint, 'POST');
    status.textContent = successMessage;
    await loadLatestNotifications();
  } catch (err) {
    status.textContent = err.message;
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
    const daily = document.getElementById('runDailyChecks');
    const weekly = document.getElementById('sendWeeklySummary');
    const monthly = document.getElementById('sendMonthlySummary');
    if (daily) daily.textContent = 'Run Daily';
    if (weekly) weekly.textContent = 'Weekly';
    if (monthly) monthly.textContent = 'Monthly';
  }
}
