import axios from 'axios'
import { demoData } from './demoData'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
})

// Attach JWT token to every request (and handle Demo Mode)
api.interceptors.request.use((config) => {
  // DEMO MODE: If running on GitHub Pages, bypass the real backend
  if (window.location.hostname.includes('github.io')) {
    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/register')) {
      return Promise.reject({
        __demoMock: true,
        data: {
          token: 'demo-token',
          refreshToken: 'demo-refresh',
          user: { id: 'demo-123', name: 'Demo Admin', email: 'admin@secureshare.com', role: 'admin', status: 'active' }
        }
      });
    }
    
    // Serve rich demo data based on endpoint
    let mockData = [];
    if (config.url?.includes('/admin/stats')) mockData = demoData.stats;
    else if (config.url?.includes('/admin/activity')) mockData = demoData.activity;
    else if (config.url?.includes('/admin/logs')) mockData = demoData.logs;
    else if (config.url?.includes('/files')) mockData = demoData.files;
    else if (config.url?.includes('/nodes')) mockData = demoData.nodes;
    else if (config.url?.includes('/admin/users')) mockData = demoData.users;

    // Prevent crashes on the dashboard by returning the mock data
    return Promise.reject({ __demoMock: true, data: mockData });
  }

  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle token expiry and Demo Mode
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // If it's a demo mock, pretend it was a successful server response!
    if (error.__demoMock) {
      return Promise.resolve({ data: error.data, status: 200 });
    }

    if (error.response?.status === 401 && error.config && !error.config._retry) {
      error.config._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken })
          localStorage.setItem('token', data.token)
          error.config.headers.Authorization = `Bearer ${data.token}`
          return api(error.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
