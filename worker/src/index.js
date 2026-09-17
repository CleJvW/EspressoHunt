/* ================================================================
   EspressoHunt — Push-Dienst (Cloudflare Worker)

   Zwei Aufgaben:
   1. HTTP: Geräte melden ihr Push-Abo an bzw. ab  (/subscribe, /unsubscribe)
   2. Cron: alle paar Minuten neue Bewertungen aus Firestore holen und
      allen anderen Geräten eine Benachrichtigung schicken.

   Die Bewertungen sind öffentlich lesbar (Firestore-Regel `allow read`),
   deshalb genügt hier der öffentliche API-Key – kein Service-Account.
   Der geheime VAPID-Schlüssel liegt als Worker-Secret (VAPID_PRIVATE_KEY).
   ================================================================ */

import { ApplicationServerKeys, generatePushHTTPRequest } from 'webpush-webcrypto';

const PROJECT = 'espressohunt-554c7';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const APP_URL = 'https://clejvw.github.io/EspressoHunt/';
const MAX_NEW_PER_RUN = 5;

/* ---------------- Texte je Sprache ---------------- */

const TEXTS = {
  de: {
    title: (name) => `☕ ${name} hat einen Kaffee bewertet`,
    body: (cafe, stars, place) =>
      `${cafe} · ${'★'.repeat(stars)}${place ? ` · ${place}` : ''}`,
  },
  it: {
    title: (name) => `☕ ${name} ha valutato un caffè`,
    body: (cafe, stars, place) =>
      `${cafe} · ${'★'.repeat(stars)}${place ? ` · ${place}` : ''}`,
  },
  en: {
    title: (name) => `☕ ${name} rated a coffee`,
    body: (cafe, stars, place) =>
      `${cafe} · ${'★'.repeat(stars)}${place ? ` · ${place}` : ''}`,
  },
};

/* ---------------- Firestore-Werte entpacken ---------------- */

function unwrap(field) {
  if (!field || typeof field !== 'object') return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('nullValue' in field) return null;
  return null;
}

function toRating(doc) {
  const f = doc.fields || {};
  return {
    id: doc.name.split('/').pop(),
    cafe: unwrap(f.cafe) || '',
    author: unwrap(f.author) || '',
    stars: unwrap(f.stars) || 0,
    address: unwrap(f.address) || '',
    ownerUid: unwrap(f.ownerUid) || '',
    createdAt: unwrap(f.createdAt) || '',
  };
}

async function fetchRecentRatings(limit = 10) {
  const url = `${FIRESTORE}/ratings?key=${API_KEY}&pageSize=${limit}&orderBy=${encodeURIComponent('createdAt desc')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firestore ${res.status}`);
  const data = await res.json();
  return (data.documents || []).map(toRating).filter((r) => r.createdAt);
}

const API_KEY = 'AIzaSyB7UbPPK6GCYzylxfylLi2mrXCKDxmWd7w';

/* ---------------- Abos in KV ---------------- */

async function endpointKey(endpoint) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sub:${hex.slice(0, 32)}`;
}

async function listSubscriptions(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.SUBS.list({ prefix: 'sub:', cursor });
    for (const key of page.keys) {
      const value = await env.SUBS.get(key.name, 'json');
      if (value && value.subscription) out.push({ key: key.name, ...value });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

/* ---------------- Push verschicken ---------------- */

async function sendPush(env, keys, record, payload) {
  const { headers, body, endpoint } = await generatePushHTTPRequest({
    applicationServerKeys: keys,
    payload: JSON.stringify(payload),
    target: record.subscription,
    adminContact: 'mailto:espressohunt@example.com',
    ttl: 60 * 60 * 12,
    urgency: 'normal',
  });

  const res = await fetch(endpoint, { method: 'POST', headers, body });
  // 404/410: Abo ist tot → aufräumen
  if (res.status === 404 || res.status === 410) {
    await env.SUBS.delete(record.key);
    return 'gone';
  }
  return res.ok ? 'ok' : `error ${res.status}`;
}

/* ---------------- Cron: neue Bewertungen prüfen ---------------- */

async function checkAndNotify(env) {
  const keys = await ApplicationServerKeys.fromJSON({
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  });

  const ratings = await fetchRecentRatings(10);
  if (ratings.length === 0) return { sent: 0, reason: 'no ratings' };

  const lastSeen = (await env.SUBS.get('state:lastSeen')) || '';
  const newest = ratings[0].createdAt;

  // Erster Lauf: nur Marke setzen, nicht rückwirkend benachrichtigen
  if (!lastSeen) {
    await env.SUBS.put('state:lastSeen', newest);
    return { sent: 0, reason: 'initialised' };
  }

  const fresh = ratings
    .filter((r) => r.createdAt > lastSeen)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-MAX_NEW_PER_RUN);

  if (fresh.length === 0) return { sent: 0, reason: 'nothing new' };

  const subs = await listSubscriptions(env);
  let sent = 0;

  for (const rating of fresh) {
    for (const record of subs) {
      if (record.ownerUid && record.ownerUid === rating.ownerUid) continue; // nicht sich selbst
      const texts = TEXTS[record.lang] || TEXTS.de;
      const payload = {
        title: texts.title(rating.author || '…'),
        body: texts.body(rating.cafe, rating.stars, rating.address),
        url: `${APP_URL}#/r/${rating.id}`,
        ratingId: rating.id,
      };
      try {
        const result = await sendPush(env, keys, record, payload);
        if (result === 'ok') sent += 1;
      } catch (e) {
        console.log('push failed', record.key, e.message);
      }
    }
  }

  await env.SUBS.put('state:lastSeen', newest);
  return { sent, new: fresh.length, subs: subs.length };
}

/* ---------------- HTTP ---------------- */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (url.pathname === '/health') {
      return json({ ok: true, publicKey: env.VAPID_PUBLIC_KEY });
    }

    if (url.pathname === '/subscribe' && request.method === 'POST') {
      let payload;
      try { payload = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      const sub = payload && payload.subscription;
      if (!sub || !sub.endpoint || !sub.keys) return json({ error: 'bad subscription' }, 400);

      const key = await endpointKey(sub.endpoint);
      await env.SUBS.put(key, JSON.stringify({
        subscription: sub,
        ownerUid: String(payload.ownerUid || ''),
        name: String(payload.name || '').slice(0, 60),
        lang: ['de', 'it', 'en'].includes(payload.lang) ? payload.lang : 'de',
        updatedAt: new Date().toISOString(),
      }));
      return json({ ok: true });
    }

    if (url.pathname === '/unsubscribe' && request.method === 'POST') {
      let payload;
      try { payload = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      if (!payload || !payload.endpoint) return json({ error: 'missing endpoint' }, 400);
      await env.SUBS.delete(await endpointKey(payload.endpoint));
      return json({ ok: true });
    }

    // Nur zum Testen: einen Lauf manuell auslösen
    if (url.pathname === '/run' && request.method === 'POST') {
      if (url.searchParams.get('token') !== env.RUN_TOKEN) return json({ error: 'forbidden' }, 403);
      const result = await checkAndNotify(env);
      return json(result);
    }

    // Testbenachrichtigung an alle Abos
    if (url.pathname === '/test' && request.method === 'POST') {
      if (url.searchParams.get('token') !== env.RUN_TOKEN) return json({ error: 'forbidden' }, 403);
      const keys = await ApplicationServerKeys.fromJSON({
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
      });
      const subs = await listSubscriptions(env);
      const results = [];
      for (const record of subs) {
        const texts = TEXTS[record.lang] || TEXTS.de;
        try {
          results.push(await sendPush(env, keys, record, {
            title: texts.title('EspressoHunt'),
            body: 'Test ✓',
            url: APP_URL,
          }));
        } catch (e) {
          results.push('error ' + e.message);
        }
      }
      return json({ subs: subs.length, results });
    }

    return json({ error: 'not found' }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      checkAndNotify(env)
        .then((r) => console.log('cron', JSON.stringify(r)))
        .catch((e) => console.log('cron failed', e.message))
    );
  },
};
