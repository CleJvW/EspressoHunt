/* ================================================================
   EspressoHunt — Datenschicht (Firebase Firestore)
   Alle Geräte lesen/schreiben dieselbe Cloud-Sammlung "ratings" und
   sehen sich gegenseitig in Echtzeit. Kein Login nötig: jedes Gerät
   meldet sich anonym an (stabile, unsichtbare Geräte-ID), damit nur
   der Ersteller seine eigene Bewertung bearbeiten/löschen darf.

   Funktioniert auch offline: Firestore speichert lokal zwischen und
   synchronisiert automatisch, sobald wieder Internet da ist.
   ================================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, signInAnonymously, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);

let db;
try {
  db = initializeFirestore(fbApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (e) {
  // Fällt z. B. in privaten/eingeschränkten Browsern auf Standard-Cache zurück
  console.warn('Offline-Cache nicht verfügbar, nutze Standard:', e);
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
  db = getFirestore(fbApp);
}

const ratingsCol = collection(db, 'ratings');

/* ---------------- Anonyme Anmeldung ---------------- */

let currentUid = null;
let resolveReady;
const authReady = new Promise((resolve) => { resolveReady = resolve; });

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUid = user.uid;
    resolveReady(user.uid);
  }
});
signInAnonymously(auth).catch((e) => {
  console.error('Anonyme Anmeldung fehlgeschlagen:', e);
});

export function getUid() {
  return currentUid;
}

export function whenReady() {
  return authReady;
}

/* ---------------- Live-Abo aller Bewertungen ---------------- */

export function subscribeRatings(callback, onError) {
  const q = query(ratingsCol, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error('Firestore-Sync-Fehler:', err);
      if (onError) onError(err);
    }
  );
}

/* ---------------- Schreiben ---------------- */

export async function createRating(rating) {
  await authReady;
  const payload = { ...rating, ownerUid: currentUid };
  delete payload.id;
  await setDoc(doc(ratingsCol, rating.id), payload);
}

export async function updateRating(rating) {
  await authReady;
  const payload = { ...rating };
  delete payload.id;
  delete payload.ownerUid; // Besitzer bleibt unverändert
  await updateDoc(doc(ratingsCol, rating.id), payload);
}

export async function deleteRatingRemote(id) {
  await authReady;
  await deleteDoc(doc(ratingsCol, id));
}

/* ---------------- Einmalige Migration alter, nur-lokaler Daten ---------------- */

const OLD_STORAGE_KEY = 'espressohunt.ratings.v1';
const MIGRATION_FLAG = 'espressohunt.migratedToCloud.v1';

export async function migrateLocalRatingsIfNeeded(author) {
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === '1') return 0;
    const raw = localStorage.getItem(OLD_STORAGE_KEY);
    const local = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(local) || local.length === 0) {
      localStorage.setItem(MIGRATION_FLAG, '1');
      return 0;
    }
    await authReady;
    for (const r of local) {
      const payload = { ...r, author: r.author || author, ownerUid: currentUid };
      delete payload.id;
      await setDoc(doc(ratingsCol, r.id), payload, { merge: true });
    }
    localStorage.setItem(MIGRATION_FLAG, '1');
    return local.length;
  } catch (e) {
    console.error('Migration lokaler Bewertungen fehlgeschlagen:', e);
    return 0;
  }
}
