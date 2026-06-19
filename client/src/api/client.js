import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('finsight_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('finsight_token');
      localStorage.removeItem('finsight_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
