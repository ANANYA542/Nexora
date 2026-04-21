
const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
};


const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

module.exports = {
  normalizeEmail,
  isValidEmail
};
