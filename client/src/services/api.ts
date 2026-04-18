import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gw_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle errors per error-handling skill
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        localStorage.removeItem('gw_token');
        localStorage.removeItem('gw_owner');
        window.location.href = '/login';
        toast.error('Session expired. Please log in again.');
      } else if (status >= 400 && status < 500) {
        toast.error(data?.message || 'Something went wrong');
      } else if (status >= 500) {
        toast.error('Something went wrong. Please try again.');
      }
    } else {
      toast.error('Unable to connect to server.');
    }
    return Promise.reject(error);
  }
);

export default api;
