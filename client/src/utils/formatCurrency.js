export function formatCurrency(value, currency = 'INR') {
  const num = parseFloat(value) || 0;
  if (currency === 'INR') {
    const abs = Math.abs(num);
    if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `₹${(abs / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `₹${abs.toLocaleString('en-IN')}`;
    return `₹${abs.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(abs);
}

export function formatCurrencyFull(value, currency = 'INR') {
  const num = parseFloat(value) || 0;
  if (currency === 'INR') {
    return `₹${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Math.abs(num));
}

export function formatCompact(value) {
  const abs = Math.abs(parseFloat(value) || 0);
  if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(abs / 1000).toFixed(1)}K`;
  return `₹${abs}`;
}
