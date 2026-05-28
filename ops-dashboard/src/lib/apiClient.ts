// Shared API client for ops-dashboard
// All fetch calls go through here to ensure consistent auth headers + base URL handling.

export const IDENTITY_BASE  = import.meta.env.VITE_IDENTITY_API_BASE  ?? 'http://localhost:3001';
export const CORRIDOR_BASE  = import.meta.env.VITE_CORRIDOR_API_BASE  ?? 'http://localhost:3003';
export const LIQUIDITY_BASE = import.meta.env.VITE_LIQUIDITY_API_BASE ?? 'http://localhost:3004';
export const INCIDENT_BASE  = import.meta.env.VITE_INCIDENT_API_BASE  ?? 'http://localhost:3006';
export const DATA_BASE      = import.meta.env.VITE_DATA_API_BASE      ?? 'http://localhost:3008';
export const FRAUD_BASE     = import.meta.env.VITE_FRAUD_API_BASE     ?? 'http://localhost:3009';
export const DISPATCH_BASE  = import.meta.env.VITE_DISPATCH_API_BASE  ?? 'http://localhost:3015';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

export async function apiGet<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? body?.message ?? `Request failed (${res.status})`);
  }
  const body = await res.json();
  return (body?.data ?? body) as T;
}

export async function apiPut<T = unknown>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? body?.message ?? `Request failed (${res.status})`);
  }
  const body = await res.json();
  return (body?.data ?? body) as T;
}
