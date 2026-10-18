import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AdminServices } from './firebaseAdmin.js';
import { lagosDayKey } from './days.js';

// Anonymous usage counting for the admin console.
// - visit: once per browser session per day. Counts visits, and unique visitors per day.
// - ping: every minute while a tab is visible, so the admin can see who's online now.
// Nothing here identifies a person: the visitor id is a random value stored in the browser.

const VISITOR_ID = /^[A-Za-z0-9-]{8,64}$/;
const MIN_PING_INTERVAL_MS = 20_000;
const lastPing = new Map<string, { at: number; signedIn: boolean }>();

export function resetTrackLimits() {
  lastPing.clear();
}

export async function handleTrack(rawBody: string, services: AdminServices | null, now = Date.now()): Promise<number> {
  if (!services) return 204; // tracking not configured; never an error for visitors

  let body: { type?: unknown; visitorId?: unknown; signedIn?: unknown };
  try {
    body = JSON.parse(rawBody || '{}');
  } catch {
    return 400;
  }
  const visitorId = typeof body.visitorId === 'string' ? body.visitorId : '';
  if (!VISITOR_ID.test(visitorId)) return 400;
  const { db } = services;

  if (body.type === 'visit') {
    const day = lagosDayKey(now);
    let isNewVisitor = true;
    try {
      // create() fails if this visitor was already counted today
      await db.doc(`stats_visitors/${day}_${visitorId}`).create({ day, at: Timestamp.fromMillis(now) });
    } catch {
      isNewVisitor = false;
    }
    await db.doc(`stats_visits/${day}`).set(
      { day, visits: FieldValue.increment(1), uniques: FieldValue.increment(isNewVisitor ? 1 : 0) },
      { merge: true }
    );
    return 204;
  }

  if (body.type === 'ping') {
    const signedIn = body.signedIn === true;
    const previous = lastPing.get(visitorId);
    // Throttle repeats, but always record signing in or out
    if (previous && previous.signedIn === signedIn && now - previous.at < MIN_PING_INTERVAL_MS) return 204;
    lastPing.set(visitorId, { at: now, signedIn });
    // Each state keeps its own timestamp, so pings that land out of order can't undo a sign-in
    const at = Timestamp.fromMillis(now);
    await db.doc(`presence/${visitorId}`).set({ lastSeen: at, [signedIn ? 'signedInSeen' : 'anonymousSeen']: at }, { merge: true });
    return 204;
  }

  return 400;
}
