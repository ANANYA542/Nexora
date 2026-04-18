const CONVERSION_RATES = {
  INR: 1,
  USD: 93,
  EUR: 108,
  GBP: 124,
};

const getConvertedAmount = (amount, currency = 'INR') => {
  const rate = CONVERSION_RATES[currency] || 1;
  return parseFloat((amount * rate).toFixed(2));
};

const convertFromINR = (amount, currency = 'INR') => {
  const rate = CONVERSION_RATES[currency] || 1;
  return parseFloat((amount / rate).toFixed(2));
};

module.exports = {
  CONVERSION_RATES,
  getConvertedAmount,
  convertFromINR,
};
