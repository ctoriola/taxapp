import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Query } from 'firebase-admin/firestore';
import type { UserRecord } from 'firebase-admin/auth';
import type { AdminServices } from './firebaseAdmin.js';
import {
  AdminConfig,
  clearedSessionCookie,
  createSessionToken,
  credentialsMatch,
  readCookie,
  SESSION_COOKIE,
  sessionCookie,
  verifySessionToken,
} from './adminSession.js';
import { lagosDayKey, lastDayKeys, weekStart } from './days.js';

// The admin console API. One endpoint with an "action" field keeps it to a single serverless
// function. Everything except login requires a valid admin session cookie.

export interface AdminRequest {
  cookie: string | null;
  ip: string;
  body: string;
}

export interface AdminResponse {
  status: number;
  body: unknown;
  setCookie?: string;
}

export interface AdminDeps {
  config: AdminConfig | null; // null when ADMIN_EMAIL / ADMIN_PASSWORD aren't set
  services: AdminServices | null; // null when FIREBASE_SERVICE_ACCOUNT isn't set
  apiKey: string; // Firebase web API key, for sending password-reset emails
  authEmulatorHost?: string;
  fetch: typeof fetch;
  now?: () => number;
}

const LIVE_WINDOW_MS = 2 * 60 * 1000;
const MAX_USERS = 2000;

// Slow down password guessing: 10 failed attempts per IP per 15 minutes
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const failedLogins = new Map<string, number[]>();

export function resetLoginLimits() {
  failedLogins.clear();
}

function json(status: number, body: unknown, setCookie?: string): AdminResponse {
  return { status, body, setCookie };
}

const iso = (value: string | undefined) => (value ? new Date(value).toISOString() : null);

async function listAllUsers(services: AdminServices): Promise<UserRecord[]> {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await services.auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken && users.length < MAX_USERS);
  return users;
}

async function countOf(query: Query): Promise<number> {
  return (await query.count().get()).data().count;
}

async function overview(services: AdminServices, now: number) {
  const { db } = services;
  const users = await listAllUsers(services);

  // Sign-ups and activity from Firebase Auth metadata
  const weeks = Array.from(new Set(lastDayKeys(56, now).map(weekStart))).slice(-8);
  const signupsByWeek = new Map(weeks.map((w) => [w, 0]));
  let active7 = 0;
  let active30 = 0;
  for (const user of users) {
    const week = weekStart(lagosDayKey(new Date(user.metadata.creationTime).getTime()));
    if (signupsByWeek.has(week)) signupsByWeek.set(week, signupsByWeek.get(week)! + 1);
    const lastSeen = Math.max(
      Date.parse(user.metadata.lastRefreshTime || '') || 0,
      Date.parse(user.metadata.lastSignInTime || '') || 0
    );
    if (now - lastSeen <= 7 * 86_400_000) active7++;
    if (now - lastSeen <= 30 * 86_400_000) active30++;
  }

  // Visits, recorded per Lagos day by /api/track
  const dayKeys = lastDayKeys(56, now);
  const visitDocs = await db.getAll(...dayKeys.map((d) => db.doc(`stats_visits/${d}`)));
  const visitsByDay = dayKeys.map((day, i) => ({
    day,
    visits: (visitDocs[i].get('visits') as number) || 0,
    uniqueVisitors: (visitDocs[i].get('uniques') as number) || 0,
  }));
  const visitsByWeek = weeks.map((week) => {
    const days = visitsByDay.filter((d) => weekStart(d.day) === week);
    return {
      week,
      visits: days.reduce((t, d) => t + d.visits, 0),
      uniqueVisitors: days.reduce((t, d) => t + d.uniqueVisitors, 0),
    };
  });

  // Live: browsers that checked in within the last two minutes
  const live = await db.collection('presence').where('lastSeen', '>=', Timestamp.fromMillis(now - LIVE_WINDOW_MS)).get();
  const liveSignedIn = live.docs.filter((d) => d.get('signedIn') === true).length;

  const [invoices, customers, expenses, filedReturns] = await Promise.all([
    countOf(db.collectionGroup('invoices')),
    countOf(db.collectionGroup('customers')),
    countOf(db.collectionGroup('expenses')),
    countOf(db.collectionGroup('vatReturns')),
  ]);

  return {
    generatedAt: new Date(now).toISOString(),
    live: { total: live.size, signedIn: liveSignedIn, visitors: live.size - liveSignedIn },
    users: { total: users.length, disabled: users.filter((u) => u.disabled).length, active7, active30 },
    records: { invoices, customers, expenses, filedReturns },
    signupsByWeek: weeks.map((week) => ({ week, signups: signupsByWeek.get(week) || 0 })),
    visitsByDay: visitsByDay.slice(-14),
    visitsByWeek,
  };
}

async function listUsers(services: AdminServices) {
  const { db } = services;
  const users = await listAllUsers(services);
  const profiles = users.length ? await db.getAll(...users.map((u) => db.doc(`users/${u.uid}`))) : [];
  const counts = await Promise.all(
    users.map(async (u) => {
      const [invoices, customers, expenses] = await Promise.all([
        countOf(db.collection(`users/${u.uid}/invoices`)),
        countOf(db.collection(`users/${u.uid}/customers`)),
        countOf(db.collection(`users/${u.uid}/expenses`)),
      ]);
      return { invoices, customers, expenses };
    })
  );
  return {
    users: users
      .map((u, i) => ({
        uid: u.uid,
        email: u.email || null,
        businessName: (profiles[i]?.get('business_name') as string) || null,
        disabled: u.disabled,
        providers: u.providerData.map((p) => p.providerId),
        createdAt: iso(u.metadata.creationTime),
        lastSignInAt: iso(u.metadata.lastSignInTime),
        counts: counts[i],
      }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    truncated: users.length >= MAX_USERS,
  };
}

async function userRecords(services: AdminServices, uid: string) {
  const { db, auth } = services;
  let user: UserRecord;
  try {
    user = await auth.getUser(uid);
  } catch {
    return null;
  }
  const docs = async (name: string) =>
    (await db.collection(`users/${uid}/${name}`).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  const [profile, customers, invoices, expenses, vatReturns] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    docs('customers'),
    docs('invoices'),
    docs('expenses'),
    docs('vatReturns'),
  ]);
  return {
    account: {
      uid,
      email: user.email || null,
      disabled: user.disabled,
      providers: user.providerData.map((p) => p.providerId),
      createdAt: iso(user.metadata.creationTime),
      lastSignInAt: iso(user.metadata.lastSignInTime),
    },
    profile: profile.exists ? { ...profile.data(), logo_url: undefined } : null,
    customers,
    invoices,
    expenses,
    vatReturns,
  };
}

async function sendPasswordReset(deps: AdminDeps, email: string): Promise<boolean> {
  const base = deps.authEmulatorHost ? `http://${deps.authEmulatorHost}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com';
  const response = await deps.fetch(`${base}/v1/accounts:sendOobCode?key=${encodeURIComponent(deps.apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
  });
  return response.ok;
}

async function logAdminAction(services: AdminServices, entry: Record<string, unknown>) {
  await services.db.collection('adminLog').add({ ...entry, at: FieldValue.serverTimestamp() });
}

export async function handleAdmin(request: AdminRequest, deps: AdminDeps): Promise<AdminResponse> {
  const now = (deps.now ?? Date.now)();
  if (!deps.config || !deps.services) {
    return json(503, { error: 'The admin console isn\'t set up. Add ADMIN_EMAIL, ADMIN_PASSWORD and FIREBASE_SERVICE_ACCOUNT in Vercel.' });
  }
  const { config, services } = deps;

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(request.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request.' });
  }
  const action = body.action;

  if (action === 'login') {
    const recent = (failedLogins.get(request.ip) || []).filter((t) => now - t < LOGIN_WINDOW_MS);
    if (recent.length >= LOGIN_LIMIT) return json(429, { error: 'Too many attempts. Try again in 15 minutes.' });
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!credentialsMatch(config, email, password)) {
      failedLogins.set(request.ip, [...recent, now]);
      return json(401, { error: 'Incorrect email or password.' });
    }
    failedLogins.delete(request.ip);
    return json(200, { ok: true, email: config.email }, sessionCookie(await createSessionToken(config, now)));
  }

  if (action === 'logout') return json(200, { ok: true }, clearedSessionCookie());

  const token = readCookie(request.cookie, SESSION_COOKIE);
  if (!token || !(await verifySessionToken(config, token))) {
    return json(401, { error: 'Please sign in.' });
  }

  switch (action) {
    case 'session':
      return json(200, { ok: true, email: config.email });

    case 'overview':
      return json(200, await overview(services, now));

    case 'users':
      return json(200, await listUsers(services));

    case 'user': {
      if (typeof body.uid !== 'string' || !body.uid) return json(400, { error: 'Missing user.' });
      const records = await userRecords(services, body.uid);
      return records ? json(200, records) : json(404, { error: 'User not found.' });
    }

    case 'setDisabled': {
      if (typeof body.uid !== 'string' || typeof body.disabled !== 'boolean') return json(400, { error: 'Invalid request.' });
      await services.auth.updateUser(body.uid, { disabled: body.disabled });
      // Disabling also signs them out everywhere at their next token refresh
      if (body.disabled) await services.auth.revokeRefreshTokens(body.uid);
      await logAdminAction(services, { action: body.disabled ? 'disable_user' : 'enable_user', uid: body.uid });
      return json(200, { ok: true });
    }

    case 'sendPasswordReset': {
      if (typeof body.uid !== 'string') return json(400, { error: 'Invalid request.' });
      const user = await services.auth.getUser(body.uid).catch(() => null);
      if (!user?.email) return json(404, { error: 'That user has no email address.' });
      if (!(await sendPasswordReset(deps, user.email))) return json(502, { error: 'Firebase couldn\'t send the email. Try again.' });
      await logAdminAction(services, { action: 'send_password_reset', uid: body.uid });
      return json(200, { ok: true, email: user.email });
    }

    case 'deleteInvoice': {
      if (typeof body.uid !== 'string' || typeof body.invoiceId !== 'string') return json(400, { error: 'Invalid request.' });
      const ref = services.db.doc(`users/${body.uid}/invoices/${body.invoiceId}`);
      const snapshot = await ref.get();
      if (!snapshot.exists) return json(404, { error: 'Invoice not found.' });
      await ref.delete();
      await logAdminAction(services, {
        action: 'delete_invoice',
        uid: body.uid,
        invoiceId: body.invoiceId,
        invoiceNumber: snapshot.get('invoice_number') ?? null,
        totalAmount: snapshot.get('total_amount') ?? null,
      });
      return json(200, { ok: true });
    }

    default:
      return json(400, { error: 'Unknown action.' });
  }
}
