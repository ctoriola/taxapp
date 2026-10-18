import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Anonymous usage counting for the admin console (see server/track.ts). Sends a random browser
// id, never who the user is; failures are ignored so tracking can't affect the app.

const VISITOR_KEY = 'vatclear:visitorId';
const PING_INTERVAL_MS = 60_000;

function storageGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Private mode or storage disabled: tracking just counts less precisely
  }
}

function visitorId(): string {
  let id = storageGet(localStorage, VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    storageSet(localStorage, VISITOR_KEY, id);
  }
  return id;
}

function send(body: Record<string, unknown>) {
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

export function startAnalytics(): () => void {
  if (typeof window === 'undefined' || !('randomUUID' in crypto)) return () => {};
  if (window.location.pathname.startsWith('/admin')) return () => {}; // don't count the admin
  const id = visitorId();

  // One visit per browser session per Lagos day (UTC+1, matching the server's buckets)
  const today = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
  const visitKey = `vatclear:visit:${today}`;
  if (!storageGet(sessionStorage, visitKey)) {
    storageSet(sessionStorage, visitKey, '1');
    send({ type: 'visit', visitorId: id });
  }

  const ping = () => {
    if (document.visibilityState === 'visible') send({ type: 'ping', visitorId: id, signedIn: !!auth.currentUser });
  };
  // Also fires once Firebase has restored the session, so signed-in users show as signed in
  const stopAuthListener = onAuthStateChanged(auth, ping);
  const timer = window.setInterval(ping, PING_INTERVAL_MS);
  document.addEventListener('visibilitychange', ping);
  return () => {
    stopAuthListener();
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', ping);
  };
}
