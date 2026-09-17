/* ================================================================
   EspressoHunt — Push-Benachrichtigungen (Client-Seite)

   Das Gerät meldet sein Push-Abo beim Cloudflare-Worker an. Der schaut
   alle paar Minuten nach neuen Bewertungen und schickt dann eine
   Benachrichtigung – auch wenn die App geschlossen ist.
   ================================================================ */

import { t, getLang } from './i18n.js';
import { getUid } from './db.js';

export const PUSH_SERVER = 'https://espressohunt-push.espressohunt.workers.dev';
const VAPID_PUBLIC_KEY = 'BD2JHCx-JeKqjo4daOk_v88gxhQHhzxhjGgDGY374hMmyBlZArKym57uRrtgdE_xbvN5cPCj57Z9e8XG_1o53Wk';
const AUTHOR_KEY = 'espressohunt.author';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration() {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg || navigator.serviceWorker.ready;
}

export async function getSubscription() {
  try {
    const reg = await getRegistration();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch (e) {
    return null;
  }
}

export async function enable() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission);

  const reg = await getRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  let name = '';
  try { name = localStorage.getItem(AUTHOR_KEY) || ''; } catch (e) {}

  const res = await fetch(PUSH_SERVER + '/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      ownerUid: getUid() || '',
      name,
      lang: getLang(),
    }),
  });
  if (!res.ok) throw new Error('server ' + res.status);
  return sub;
}

export async function disable() {
  const sub = await getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  try { await sub.unsubscribe(); } catch (e) {}
  try {
    await fetch(PUSH_SERVER + '/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
  } catch (e) { /* offline: Abo ist lokal ohnehin weg */ }
}

/* Schalter in den Einstellungen verkabeln */
export async function wireToggle(btn, hint) {
  let active = !!(await getSubscription()) && Notification.permission === 'granted';

  const paint = () => {
    btn.textContent = active ? t('notif_on') : t('notif_enable');
    btn.classList.toggle('btn--primary', !active);
    btn.classList.toggle('btn--ghost', active);
    hint.textContent = active ? t('notif_on') : t('notif_off');
  };
  paint();

  btn.addEventListener('click', async () => {
    const wasActive = active;
    btn.disabled = true;
    btn.textContent = t('notif_working');
    try {
      if (wasActive) {
        await disable();
        active = false;
      } else {
        await enable();
        active = true;
      }
      hint.textContent = '';
    } catch (e) {
      const reason = String(e.message || e);
      hint.textContent = reason === 'denied' ? t('notif_blocked') : t('notif_error');
    } finally {
      btn.disabled = false;
      paint();
    }
  });
}
