// Client for the admin console API (api/admin.ts). The session lives in an HttpOnly cookie.

export class AdminAuthError extends Error {}

export async function adminCall<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/admin', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch {
    throw new Error('Connection error. Please check your internet and try again.');
  }
  const data = await response.json().catch(() => null);
  if (response.status === 401 && action !== 'login') throw new AdminAuthError(data?.error || 'Please sign in.');
  if (!response.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
  return data as T;
}

export interface AdminOverview {
  generatedAt: string;
  live: { total: number; signedIn: number; visitors: number };
  users: { total: number; disabled: number; active7: number; active30: number };
  records: { invoices: number; customers: number; expenses: number; filedReturns: number };
  signupsByWeek: { week: string; signups: number }[];
  visitsByDay: { day: string; visits: number; uniqueVisitors: number }[];
  visitsByWeek: { week: string; visits: number; uniqueVisitors: number }[];
}

export interface AdminUserRow {
  uid: string;
  email: string | null;
  businessName: string | null;
  disabled: boolean;
  providers: string[];
  createdAt: string | null;
  lastSignInAt: string | null;
  counts: { invoices: number; customers: number; expenses: number };
}

export interface AdminUserRecords {
  account: Omit<AdminUserRow, 'businessName' | 'counts'>;
  profile: Record<string, unknown> | null;
  customers: Record<string, any>[];
  invoices: Record<string, any>[];
  expenses: Record<string, any>[];
  vatReturns: Record<string, any>[];
}
