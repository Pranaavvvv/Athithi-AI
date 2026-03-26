import axios, { AxiosInstance } from 'axios';

// ==========================================
// 1. BASE URL CONFIGURATION
// ==========================================
// In a full production app, these would come from process.env.NEXT_PUBLIC_...
const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:5555';
const FINANCE_API_URL = process.env.NEXT_PUBLIC_FINANCE_URL || 'http://localhost:8000/api/finance';
const MENU_API_URL = process.env.NEXT_PUBLIC_MENU_URL || 'http://localhost:8000/api/menu';
const OPS_API_URL = process.env.NEXT_PUBLIC_OPS_URL || 'http://localhost:8000/api/ops';
const EMA_API_URL = process.env.NEXT_PUBLIC_EMA_URL || 'http://localhost:5555/ema';
const LIVE_API_URL = process.env.NEXT_PUBLIC_LIVE_URL || 'http://localhost:5555/live';
// Backend guest management routes are mounted under `/gm/*`
const GUEST_API_URL = process.env.NEXT_PUBLIC_GUEST_URL || 'http://localhost:5555/gm';

// ==========================================
// 2. AXIOS INSTANCES
// ==========================================

export const authAPI: AxiosInstance = axios.create({
  baseURL: AUTH_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const financeAPI: AxiosInstance = axios.create({
  baseURL: FINANCE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const menuAPI: AxiosInstance = axios.create({
  baseURL: MENU_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const opsAPI: AxiosInstance = axios.create({
  baseURL: OPS_API_URL, // e.g. /vendor-bill
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const emaAPI: AxiosInstance = axios.create({
  baseURL: EMA_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const liveAPI: AxiosInstance = axios.create({
  baseURL: LIVE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const guestAPI: AxiosInstance = axios.create({
  baseURL: GUEST_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// 3. ERROR HANDLING INTERCEPTORS (Optional)
// ==========================================
const handleAuthError = (error: any) => {
  if (error.response?.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      // Redirect to login could happen here, or handled within the React components
      // window.location.href = '/auth'; 
    }
  }
  return Promise.reject(error);
};

authAPI.interceptors.response.use((res) => res, handleAuthError);
financeAPI.interceptors.response.use((res) => res, handleAuthError);
emaAPI.interceptors.response.use((res) => res, handleAuthError);
guestAPI.interceptors.response.use((res) => res, handleAuthError);
