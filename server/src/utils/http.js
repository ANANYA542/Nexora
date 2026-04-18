const axios = require('axios');

const apiClient = axios.create({
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

module.exports = apiClient;
