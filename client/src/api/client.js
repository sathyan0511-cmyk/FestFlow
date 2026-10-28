import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('festflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear stored credentials if unauthorized outside auth pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('festflow_token');
        localStorage.removeItem('festflow_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
