const CONVERSION_RATES = {
  INR: 1,
  USD: 83,
  EUR: 90,
  GBP: 105,
};

const getConvertedAmount = (amount, currency = 'INR') => {
  const rate = CONVERSION_RATES[currency] || 1; // Default to 1 (INR) if not found
  return parseFloat((amount * rate).toFixed(2));
};

module.exports = {
  CONVERSION_RATES,
  getConvertedAmount,
};
