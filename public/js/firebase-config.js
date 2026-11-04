/**
 * NEXORA Firebase & API Client Configuration
 * E.G.S. Pillay Engineering College
 */

// Determine active API base endpoint
function getInitialApiBase() {
  if (typeof window !== 'undefined') {
    if (window.NEXORA_API_URL) return window.NEXORA_API_URL.replace(/\/$/, '');
    const stored = localStorage.getItem('nexora_api_base');
    if (stored) return stored.replace(/\/$/, '');
  }
  return '/api';
}

const NEXORA_CONFIG = {
  institution: 'E.G.S. Pillay Engineering College, Nagapattinam',
  apiBase: getInitialApiBase(),
  firebase: {
    projectId: "nexora-egspec-2026",
    appId: "1:797942464436:web:2a146d8e2a6f790676fce1",
    storageBucket: "nexora-egspec-2026.firebasestorage.app",
    apiKey: "AIzaSyCbEDGiqkeEgOy2wSVb5ub2rrWdgbOrg8Q",
    authDomain: "nexora-egspec-2026.firebaseapp.com",
    messagingSenderId: "797942464436",
    projectNumber: "797942464436"
  }
};

// Unified Network & Session Manager
const NexoraAPI = {
  getToken: () => localStorage.getItem('nexora_token'),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem('nexora_user'));
    } catch (e) {
      return null;
    }
  },
  setSession: (token, user) => {
    localStorage.setItem('nexora_token', token);
    localStorage.setItem('nexora_user', JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem('nexora_token');
    localStorage.removeItem('nexora_user');
  },
  setApiBase: (url) => {
    if (!url) {
      localStorage.removeItem('nexora_api_base');
      NEXORA_CONFIG.apiBase = '/api';
    } else {
      const cleanUrl = url.replace(/\/$/, '');
      localStorage.setItem('nexora_api_base', cleanUrl);
      NEXORA_CONFIG.apiBase = cleanUrl;
    }
  },
  getApiBase: () => NEXORA_CONFIG.apiBase,
  request: async (endpoint, options = {}) => {
    const token = NexoraAPI.getToken();
    const user = NexoraAPI.getUser();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}`, 'x-session-token': token } : {}),
      ...(user ? { 'x-user-role': user.role, 'x-user-id': user.id, 'x-user-email': user.email } : {}),
      ...(options.headers || {})
    };

    const base = NEXORA_CONFIG.apiBase || '/api';
    const targetUrl = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    try {
      const response = await fetch(targetUrl, {
        ...options,
        headers
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      return data;
    } catch (err) {
      throw err;
    }
  }
};

window.NexoraAPI = NexoraAPI;
window.NEXORA_CONFIG = NEXORA_CONFIG;
