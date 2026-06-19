export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateShort(dateStr);
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning ☀️';
  if (h < 17) return 'Good afternoon 🌤️';
  return 'Good evening 🌙';
}

export function getCurrentMonthYear() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    label: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
}
