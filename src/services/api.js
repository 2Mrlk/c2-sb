import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status} ao chamar ${path}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getTransactions: () => request('/api/transactions'),
  getSummary: () => request('/api/transactions/summary'),
  createTransaction: (payload) =>
    request('/api/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  deleteTransaction: (id) =>
    request(`/api/transactions/${id}`, { method: 'DELETE' }),

  getCategories: () => request('/api/categories'),
  createCategory: (payload) =>
    request('/api/categories', { method: 'POST', body: JSON.stringify(payload) }),
};
