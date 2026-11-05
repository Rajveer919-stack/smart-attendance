import axios from 'axios';

// Saare backend calls /api se shuru honge (vite proxy inhe localhost:5000 tak le jayega)
const api = axios.create({ baseURL: '/api' });

// Har request ke saath login ka token apne aap bhej do
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;