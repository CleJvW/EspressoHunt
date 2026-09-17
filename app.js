/* ================================================================
   EspressoHunt — App-Logik (Vanilla JS, keine Frameworks)
   - Geteilte Bewertungen in der Cloud (Firestore, siehe db.js)
   - Mehrsprachig: Deutsch, Italienisch, Englisch (i18n.js)
   - Standort je Bewertung, Karten- und Listenansicht (geo.js)
   - Hash-Routing: #/ #/new #/r/<id> #/r/<id>/edit #/friends #/u/<name> #/settings
   ================================================================ */

import {
  getUid, whenReady, subscribeRatings, createRating, updateRating,
  deleteRatingRemote, migrateLocalRatingsIfNeeded,
} from './db.js';
import { t, tn, getLang, setLang, getLocale, LANGUAGES } from './i18n.js';
import {
  getCurrentPosition, getCachedPosition, geocodeAddress, reverseGeocode,
  distanceMeters, formatDistance, loadLeaflet, mapsLink,
} from './geo.js';

/* ---------------- Konstanten ---------------- */

const AUTHOR_KEY = 'espressohunt.author';
const VIEW_KEY = 'espressohunt.view';
const SORT_KEY = 'espressohunt.sort';

const METRICS = [
  { key: 'cremig',      i18n: 'm_cremig',      emoji: '☕' },
  { key: 'fruchtig',    i18n: 'm_fruchtig',    emoji: '🍓' },
  { key: 'schokoladig', i18n: 'm_schokoladig', emoji: '🍫' },
  { key: 'geschmack',   i18n: 'm_geschmack',   emoji: '👅' },
  { key: 'ambiente',    i18n: 'm_ambiente',    emoji: '🪑' },
];

const app = document.getElementById('app');

/* ---------------- Zustand ---------------- */

let ratingsCache = [];
let ratingsReady = false;
let syncError = false;
let myPosition = null;

let viewMode = readStored(VIEW_KEY, 'list');
let sortMode = readStored(SORT_KEY, 'date');

function readStored(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
}
function writeStored(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

function getRating(id) {
  return ratingsCache.find((r) => r.id === id) || null;
}

function getAuthorName() {
  try { return localStorage.getItem(AUTHOR_KEY) || ''; } catch (e) { return ''; }
}
function setAuthorName(name) {
  try { localStorage.setItem(AUTHOR_KEY, name); } catch (e) {}
}

/* ---------------- Helfer ---------------- */

function uid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function parsePrice(input) {
  if (input == null) return NaN;
  const cleaned = String(input).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function formatPrice(value) {
  const n = typeof value === 'number' ? value : parsePrice(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString(getLocale(), { style: 'currency', currency: 'EUR' });
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(getLocale(), { day: '2-digit', month: 'long', year: 'numeric' });
}

function clampInt(v, min, max) {
  v = Math.round(Number(v));
  if (isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function hasLocation(r) {
  return Number.isFinite(r?.lat) && Number.isFinite(r?.lng);
}

function ratingDistance(r) {
  if (!myPosition || !hasLocation(r)) return null;
  return distanceMeters(myPosition, { lat: r.lat, lng: r.lng });
}

/* ---------------- SVG-Bausteine ---------------- */

function starSvg(filled) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="${filled ? 'star-fill' : 'star-empty'}"
    d="M12 2.4l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.2l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.94L12 2.4z"/></svg>`;
}

function starsDisplay(count, large) {
  let out = `<span class="stars${large ? ' stars--lg' : ''}" role="img" aria-label="${count}/5">`;
  for (let i = 1; i <= 5; i++) out += starSvg(i <= count);
  return out + '</span>';
}

const backIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.5 4.5L8 12l7.5 7.5 1.4-1.42L10.83 12l6.07-6.08z"/></svg>`;
const gearIcon = `<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path fill="currentColor" d="M12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7zm7.4-2.6l1.8 1.4-1.9 3.3-2.2-.7a7.6 7.6 0 01-1.6.9l-.4 2.2h-3.8l-.4-2.2a7.6 7.6 0 01-1.6-.9l-2.2.7-1.9-3.3 1.8-1.4a7.7 7.7 0 010-1.8L2.8 9.7l1.9-3.3 2.2.7c.5-.36 1-.66 1.6-.9l.4-2.2h3.8l.4 2.2c.56.24 1.1.54 1.6.9l2.2-.7 1.9 3.3-1.8 1.4c.05.6.05 1.2 0 1.8z"/></svg>`;
const pinIcon = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg>`;
const peopleIcon = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M16 11a3 3 0 100-6 3 3 0 000 6zm-8 0a3 3 0 100-6 3 3 0 000 6zm0 2c-2.7 0-8 1.34-8 4v3h10v-3c0-.98.4-1.83 1.05-2.5A13 13 0 008 13zm8 0c-.35 0-.74.02-1.15.06A4.6 4.6 0 0116 17v3h8v-3c0-2.66-5.3-4-8-4z"/></svg>`;

/* ---------------- Router ---------------- */

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'new') return { name: 'new' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'friends') return { name: 'friends' };
  if (parts[0] === 'u' && parts[1]) return { name: 'friend', who: decodeURIComponent(parts[1]) };
  if (parts[0] === 'r' && parts[1] && parts[2] === 'edit') return { name: 'edit', id: parts[1] };
  if (parts[0] === 'r' && parts[1]) return { name: 'detail', id: parts[1] };
  return { name: 'home' };
}

function navigate(hash, replace) {
  if (replace) location.replace('#' + hash);
  else location.hash = hash;
}

function render() {
  const route = parseHash();
  closeOverlays();

  let view;
  if (!ratingsReady) view = LoadingView();
  else if (route.name === 'home') view = HomeView();
  else if (route.name === 'new') view = FormView(null);
  else if (route.name === 'edit') view = FormView(getRating(route.id));
  else if (route.name === 'detail') view = DetailView(getRating(route.id));
  else if (route.name === 'friends') view = FriendsView();
  else if (route.name === 'friend') view = FriendView(route.who);
  else if (route.name === 'settings') view = SettingsView();

  if (!view) { navigate('/', true); return; }

  app.innerHTML = '';
  app.appendChild(view);
  window.scrollTo(0, 0);
  wireAppbarScroll();
}

window.addEventListener('hashchange', render);

function wireAppbarScroll() {
  const bar = app.querySelector('.appbar');
  if (!bar) return;
  const onScroll = () => bar.classList.toggle('appbar--scrolled', window.scrollY > 4);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------------- Sortierung ---------------- */

function sortedRatings() {
  const list = [...ratingsCache];
  if (sortMode === 'price') {
    list.sort((a, b) => {
      const pa = Number.isFinite(a.price) ? a.price : Infinity;
      const pb = Number.isFinite(b.price) ? b.price : Infinity;
      return pa - pb;
    });
  } else if (sortMode === 'rating') {
    list.sort((a, b) => (b.stars || 0) - (a.stars || 0)
      || new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortMode === 'distance') {
    list.sort((a, b) => {
      const da = ratingDistance(a);
      const db = ratingDistance(b);
      return (da == null ? Infinity : da) - (db == null ? Infinity : db);
    });
  } else {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return list;
}

/* ---------------- View: Ladeansicht ---------------- */

function LoadingView() {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <header class="appbar"><h1 class="appbar__title">EspressoHunt</h1></header>
    <div class="empty">
      <div class="empty__icon">☕️</div>
      <h2>${escapeHtml(syncError ? t('offline_title') : t('loading_title'))}</h2>
      <p>${escapeHtml(syncError ? t('offline_text') : t('loading_text'))}</p>
    </div>`;
  return el;
}

/* ---------------- View: Startseite ---------------- */

function HomeView() {
  const ratings = sortedRatings();
  const isMap = viewMode === 'map';
  const el = document.createElement('div');
  el.className = 'screen' + (isMap ? ' screen--map' : '');

  const subtitle = ratings.length
    ? tn('home_sub', ratings.length)
    : t('home_sub_empty');

  el.innerHTML = `
    <header class="appbar">
      <h1 class="appbar__title">EspressoHunt</h1>
      <button class="appbar__icon" id="settingsBtn" aria-label="${escapeHtml(t('settings'))}">${gearIcon}</button>
    </header>

    ${isMap ? '' : `
      <div class="home-hero">
        <h1>${escapeHtml(t('home_title'))}</h1>
        <p>${escapeHtml(subtitle)}</p>
        <div class="hero-links">
          <button type="button" class="pill-link" id="authorLink">${escapeHtml(t('author_link', { name: getAuthorName() }))}</button>
          <button type="button" class="pill-link" id="friendsLink">${peopleIcon} ${escapeHtml(t('friends'))}</button>
        </div>
      </div>`}

    <div class="toolbar">
      <div class="segmented" role="tablist">
        <button role="tab" class="${isMap ? '' : 'is-active'}" id="viewList">${escapeHtml(t('view_list'))}</button>
        <button role="tab" class="${isMap ? 'is-active' : ''}" id="viewMap">${escapeHtml(t('view_map'))}</button>
      </div>
      ${isMap ? '' : `
        <label class="sort-wrap">
          <span class="sr-only">${escapeHtml(t('sort_by'))}</span>
          <select id="sortSelect" class="sort-select" aria-label="${escapeHtml(t('sort_by'))}">
            <option value="date">${escapeHtml(t('sort_date'))}</option>
            <option value="rating">${escapeHtml(t('sort_rating'))}</option>
            <option value="price">${escapeHtml(t('sort_price'))}</option>
            <option value="distance">${escapeHtml(t('sort_distance'))}</option>
          </select>
        </label>`}
    </div>

    ${isMap
      ? `<div class="map-wrap" id="mapWrap"><div class="map-loading">${escapeHtml(t('map_loading'))}</div></div>`
      : `<div class="content content--list" id="list"></div>`}

    <div class="fab-bar">
      <button class="btn btn--primary" id="addBtn">${escapeHtml(t('add_button'))}</button>
    </div>`;

  el.querySelector('#settingsBtn').addEventListener('click', () => navigate('/settings'));
  el.querySelector('#addBtn').addEventListener('click', () => navigate('/new'));
  el.querySelector('#viewList').addEventListener('click', () => switchView('list'));
  el.querySelector('#viewMap').addEventListener('click', () => switchView('map'));

  if (!isMap) {
    el.querySelector('#authorLink').addEventListener('click', () => promptAuthorName(() => render()));
    el.querySelector('#friendsLink').addEventListener('click', () => navigate('/friends'));

    const select = el.querySelector('#sortSelect');
    select.value = sortMode;
    select.addEventListener('change', () => changeSort(select.value));

    renderList(el.querySelector('#list'), ratings, { showAuthor: true });
  } else {
    renderMap(el.querySelector('#mapWrap'), ratings);
  }

  return el;
}

function switchView(mode) {
  viewMode = mode;
  writeStored(VIEW_KEY, mode);
  render();
}

async function changeSort(mode) {
  if (mode === 'distance' && !myPosition) {
    try {
      myPosition = await getCurrentPosition();
    } catch (e) {
      toast(t('loc_denied'));
      return;
    }
  }
  sortMode = mode;
  writeStored(SORT_KEY, mode);
  render();
}

/* ---------------- Liste von Karten ---------------- */

function renderList(list, ratings, { showAuthor } = {}) {
  if (ratings.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty__icon">☕️</div>
        <h2>${escapeHtml(t('empty_title'))}</h2>
        <p>${escapeHtml(t('empty_text'))}</p>
      </div>`;
    return;
  }

  const myUid = getUid();
  ratings.forEach((r, i) => {
    const card = document.createElement('button');
    card.className = 'card';
    card.style.animationDelay = Math.min(i * 45, 300) + 'ms';

    const dist = ratingDistance(r);
    const meta = [];
    if (showAuthor) {
      meta.push(`<span class="chip chip--author">${escapeHtml(
        r.ownerUid === myUid ? t('by_you') : t('by_name', { name: r.author || t('someone') })
      )}</span>`);
    }
    if (r.address) {
      meta.push(`<span class="chip chip--place">${pinIcon} ${escapeHtml(r.address)}</span>`);
    }
    if (dist != null) {
      meta.push(`<span class="chip chip--dist">${escapeHtml(formatDistance(dist, getLocale()))}</span>`);
    }

    card.innerHTML = `
      <div class="card__top">
        <h3 class="card__name">${escapeHtml(r.cafe)}</h3>
        ${formatPrice(r.price) ? `<span class="card__price">${escapeHtml(formatPrice(r.price))}</span>` : ''}
      </div>
      <div class="card__meta">
        ${starsDisplay(r.stars)}
        <span class="card__date">${escapeHtml(formatDate(r.createdAt))}</span>
      </div>
      ${meta.length ? `<div class="card__meta card__meta--wrap">${meta.join('')}</div>` : ''}
      ${r.notes ? `<p class="card__note">${escapeHtml(r.notes)}</p>` : ''}`;

    card.addEventListener('click', () => navigate('/r/' + r.id));
    list.appendChild(card);
  });

  const spacer = document.createElement('div');
  spacer.style.height = '96px';
  list.appendChild(spacer);
}

/* ---------------- Kartenansicht ---------------- */

async function renderMap(wrap, ratings) {
  const withLoc = ratings.filter(hasLocation);

  let L;
  try {
    L = await loadLeaflet();
  } catch (e) {
    wrap.innerHTML = `<div class="empty"><div class="empty__icon">🗺️</div><p>${escapeHtml(t('map_failed'))}</p></div>`;
    return;
  }
  if (!wrap.isConnected) return;

  wrap.innerHTML = '<div class="map" id="mapEl"></div>';
  const mapEl = wrap.querySelector('#mapEl');

  const map = L.map(mapEl, { zoomControl: false, attributionControl: true });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(map);

  const bounds = [];
  withLoc.forEach((r) => {
    const icon = L.divIcon({
      className: 'coffee-pin-wrap',
      html: `<div class="coffee-pin"><span>${r.stars || '☕'}</span></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -32],
    });
    const marker = L.marker([r.lat, r.lng], { icon }).addTo(map);
    const priceLine = formatPrice(r.price) ? ` · ${escapeHtml(formatPrice(r.price))}` : '';
    marker.bindPopup(
      `<strong>${escapeHtml(r.cafe)}</strong><br>${'★'.repeat(r.stars || 0)}${priceLine}<br>` +
      `<a href="#/r/${encodeURIComponent(r.id)}">${escapeHtml(t('edit') === 'Edit' ? 'Open' : t('d_back'))} →</a>`
    );
    bounds.push([r.lat, r.lng]);
  });

  if (myPosition) {
    L.circleMarker([myPosition.lat, myPosition.lng], {
      radius: 7, color: '#2f7cf6', fillColor: '#2f7cf6', fillOpacity: 0.9, weight: 3,
    }).addTo(map).bindPopup(escapeHtml(t('map_my_location')));
    bounds.push([myPosition.lat, myPosition.lng]);
  }

  if (bounds.length === 1) map.setView(bounds[0], 15);
  else if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  else map.setView([51.05, 13.74], 11);

  setTimeout(() => map.invalidateSize(), 60);

  if (withLoc.length === 0) {
    const note = document.createElement('div');
    note.className = 'map-note';
    note.textContent = t('map_empty');
    wrap.appendChild(note);
  }

  // Eigenen Standort im Hintergrund holen und ergänzen
  if (!myPosition) {
    getCurrentPosition().then((pos) => {
      myPosition = pos;
      if (!wrap.isConnected) return;
      L.circleMarker([pos.lat, pos.lng], {
        radius: 7, color: '#2f7cf6', fillColor: '#2f7cf6', fillOpacity: 0.9, weight: 3,
      }).addTo(map).bindPopup(escapeHtml(t('map_my_location')));
    }).catch(() => {});
  }
}

/* ---------------- View: Freunde ---------------- */

function friendStats() {
  const byName = new Map();
  ratingsCache.forEach((r) => {
    const name = (r.author || '').trim() || t('someone');
    if (!byName.has(name)) {
      byName.set(name, { name, count: 0, stars: 0, priceSum: 0, priceCount: 0, best: null, ownerUid: r.ownerUid });
    }
    const s = byName.get(name);
    s.count += 1;
    s.stars += r.stars || 0;
    if (Number.isFinite(r.price)) { s.priceSum += r.price; s.priceCount += 1; }
    if (!s.best || (r.stars || 0) > (s.best.stars || 0)) s.best = r;
  });
  return [...byName.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function FriendsView() {
  const stats = friendStats();
  const myUid = getUid();
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <header class="appbar">
      <button class="appbar__back" id="back">${backIcon}${escapeHtml(t('d_back'))}</button>
      <h1 class="appbar__title">${escapeHtml(t('friends'))}</h1>
      <span style="width:78px"></span>
    </header>
    <div class="home-hero">
      <h1>${escapeHtml(t('friends_title'))}</h1>
      <p>${escapeHtml(tn('friend_count', ratingsCache.length))}</p>
    </div>
    <div class="content content--list" id="list"></div>`;

  const list = el.querySelector('#list');
  if (stats.length === 0) {
    list.innerHTML = `<div class="empty"><div class="empty__icon">👥</div><p>${escapeHtml(t('friends_empty'))}</p></div>`;
  } else {
    stats.forEach((s, i) => {
      const avg = s.count ? (s.stars / s.count) : 0;
      const isMe = s.ownerUid === myUid;
      const card = document.createElement('button');
      card.className = 'card friend-card';
      card.style.animationDelay = Math.min(i * 45, 300) + 'ms';
      card.innerHTML = `
        <div class="friend-avatar">${escapeHtml((s.name[0] || '?').toUpperCase())}</div>
        <div class="friend-body">
          <h3 class="card__name">${escapeHtml(s.name)}${isMe ? ` <span class="tag">${escapeHtml(t('you'))}</span>` : ''}</h3>
          <div class="card__meta card__meta--wrap">
            <span class="chip">${escapeHtml(tn('friend_count', s.count))}</span>
            <span class="chip">${escapeHtml(t('avg_stars', { v: avg.toFixed(1) }))} ★</span>
            ${s.priceCount ? `<span class="chip">${escapeHtml(t('avg_price', { v: formatPrice(s.priceSum / s.priceCount) }))}</span>` : ''}
          </div>
        </div>`;
      card.addEventListener('click', () => navigate('/u/' + encodeURIComponent(s.name)));
      list.appendChild(card);
    });
  }

  el.querySelector('#back').addEventListener('click', () => navigate('/'));
  return el;
}

function FriendView(name) {
  const mine = ratingsCache.filter((r) => ((r.author || '').trim() || t('someone')) === name);
  if (mine.length === 0) return null;

  const avg = mine.reduce((s, r) => s + (r.stars || 0), 0) / mine.length;
  const prices = mine.filter((r) => Number.isFinite(r.price));
  const best = mine.reduce((b, r) => (!b || (r.stars || 0) > (b.stars || 0) ? r : b), null);

  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <header class="appbar">
      <button class="appbar__back" id="back">${backIcon}${escapeHtml(t('friends'))}</button>
      <h1 class="appbar__title"></h1>
      <span style="width:78px"></span>
    </header>
    <div class="detail-hero">
      <div class="friend-avatar friend-avatar--lg">${escapeHtml((name[0] || '?').toUpperCase())}</div>
      <h1>${escapeHtml(name)}</h1>
      <div class="detail-chips">
        <span class="chip">${escapeHtml(tn('friend_count', mine.length))}</span>
        <span class="chip">${escapeHtml(t('avg_stars', { v: avg.toFixed(1) }))} ★</span>
        ${prices.length ? `<span class="chip">${escapeHtml(t('avg_price', {
          v: formatPrice(prices.reduce((s, r) => s + r.price, 0) / prices.length) }))}</span>` : ''}
      </div>
      ${best ? `<p class="detail-sub">${escapeHtml(t('fav_cafe'))}: <strong>${escapeHtml(best.cafe)}</strong></p>` : ''}
    </div>
    <div class="content content--list" id="list"></div>`;

  renderList(el.querySelector('#list'), mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), { showAuthor: false });
  el.querySelector('#back').addEventListener('click', () => navigate('/friends'));
  return el;
}

/* ---------------- View: Einstellungen ---------------- */

function SettingsView() {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <header class="appbar">
      <button class="appbar__back" id="back">${backIcon}${escapeHtml(t('d_back'))}</button>
      <h1 class="appbar__title">${escapeHtml(t('settings'))}</h1>
      <span style="width:78px"></span>
    </header>

    <div class="section-title">${escapeHtml(t('language'))}</div>
    <div class="card-group">
      <div class="lang-list" id="langList"></div>
    </div>

    <div class="section-title">${escapeHtml(t('name_ph'))}</div>
    <div class="card-group">
      <button class="row-btn" id="changeName">
        <span>${escapeHtml(getAuthorName() || '–')}</span>
        <span class="row-btn__action">${escapeHtml(t('change_name'))}</span>
      </button>
    </div>

    <div class="section-title">${escapeHtml(t('notifications'))}</div>
    <div class="card-group">
      <div class="row-static" id="notifRow">
        <span>${escapeHtml(t('notif_enable'))}</span>
        <button class="btn btn--ghost btn--small" id="notifBtn">…</button>
      </div>
      <p class="field__hint" id="notifHint" style="padding:0 16px 14px;"></p>
    </div>`;

  const langList = el.querySelector('#langList');
  LANGUAGES.forEach((l) => {
    const btn = document.createElement('button');
    btn.className = 'lang-item' + (l.code === getLang() ? ' is-active' : '');
    btn.innerHTML = `<span class="lang-flag">${l.flag}</span><span>${escapeHtml(l.label)}</span>
      <span class="lang-check">${l.code === getLang() ? '✓' : ''}</span>`;
    btn.addEventListener('click', () => {
      setLang(l.code);
      render();
    });
    langList.appendChild(btn);
  });

  el.querySelector('#changeName').addEventListener('click', () => promptAuthorName(() => render()));
  el.querySelector('#back').addEventListener('click', () => navigate('/'));

  wireNotificationRow(el.querySelector('#notifBtn'), el.querySelector('#notifHint'));
  return el;
}

/* ---------------- Name-Abfrage ---------------- */

function promptAuthorName(onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="nameTitle">
      <h3 id="nameTitle">${escapeHtml(t('name_title'))}</h3>
      <p>${escapeHtml(t('name_text'))}</p>
      <input class="input" id="nameInput" type="text" placeholder="${escapeHtml(t('name_ph'))}"
        autocomplete="name" enterkeyhint="done" style="margin-bottom:14px;text-align:center;" />
      <div class="dialog__buttons">
        <button class="btn btn--primary" id="nameSave">${escapeHtml(t('name_save'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#nameInput');
  input.value = getAuthorName();
  const save = () => {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    setAuthorName(name);
    overlay.remove();
    onDone && onDone(name);
  };
  overlay.querySelector('#nameSave').addEventListener('click', save);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  setTimeout(() => input.focus(), 60);
}

/* ---------------- View: Formular ---------------- */

function FormView(existing) {
  const isEdit = !!existing;
  const model = existing
    ? { ...existing }
    : {
        id: uid(), cafe: '', price: '', stars: 0,
        cremig: 5, fruchtig: 5, schokoladig: 5, geschmack: 5, ambiente: 5,
        notes: '', createdAt: new Date().toISOString(),
        lat: null, lng: null, address: '',
      };

  // Standort-Modus: bei neuen Bewertungen standardmäßig aktueller Standort
  let locMode = isEdit ? (hasLocation(model) ? 'address' : 'none') : 'current';

  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <header class="appbar">
      <button class="appbar__back" id="cancel">${backIcon}${escapeHtml(t('cancel'))}</button>
      <h1 class="appbar__title">${escapeHtml(isEdit ? t('form_edit') : t('form_new'))}</h1>
      <span style="width:78px"></span>
    </header>

    <form class="form" id="form" novalidate>
      <div class="field">
        <label class="field__label" for="cafe">${escapeHtml(t('f_cafe'))}</label>
        <input class="input" id="cafe" type="text" placeholder="${escapeHtml(t('f_cafe_ph'))}"
          autocomplete="off" enterkeyhint="next" value="${escapeHtml(model.cafe)}" />
        <p class="error-text" id="cafeError" hidden>${escapeHtml(t('e_cafe'))}</p>
      </div>

      <div class="field">
        <span class="field__label">${escapeHtml(t('f_location'))}</span>
        <div class="segmented segmented--full" id="locSeg">
          <button type="button" data-mode="current">${escapeHtml(t('loc_current'))}</button>
          <button type="button" data-mode="address">${escapeHtml(t('loc_address'))}</button>
          <button type="button" data-mode="none">${escapeHtml(t('loc_none'))}</button>
        </div>
        <div id="locBody" class="loc-body"></div>
        <p class="field__hint">${escapeHtml(t('addr_hint'))}</p>
      </div>

      <div class="field">
        <label class="field__label" for="price">${escapeHtml(t('f_price'))}</label>
        <div class="price-wrap">
          <input class="input" id="price" type="text" inputmode="decimal"
            placeholder="4,50" enterkeyhint="done"
            value="${escapeHtml(model.price === '' || model.price == null ? '' : String(model.price).replace('.', ','))}" />
          <span class="price-wrap__cur">€</span>
        </div>
        <p class="field__hint">${escapeHtml(t('f_price_hint'))}</p>
        <p class="error-text" id="priceError" hidden>${escapeHtml(t('e_price'))}</p>
      </div>

      <div class="field">
        <span class="field__label">${escapeHtml(t('f_stars'))}</span>
        <div class="star-input" id="starInput" role="radiogroup" aria-label="${escapeHtml(t('f_stars'))}"></div>
        <p class="error-text" id="starError" hidden>${escapeHtml(t('e_stars'))}</p>
      </div>

      <div class="field">
        <span class="field__label">${escapeHtml(t('f_props'))}</span>
        <div class="card-group" id="sliders"></div>
      </div>

      <div class="field">
        <label class="field__label" for="notes">${escapeHtml(t('f_notes'))}</label>
        <textarea class="textarea" id="notes" placeholder="${escapeHtml(t('f_notes_ph'))}">${escapeHtml(model.notes)}</textarea>
        <p class="field__hint">${escapeHtml(t('optional'))}</p>
      </div>
    </form>

    <div class="form-actions">
      <button class="btn btn--primary" id="save" form="form">${escapeHtml(t('save'))}</button>
    </div>`;

  /* --- Standort-Bereich --- */
  const locSeg = el.querySelector('#locSeg');
  const locBody = el.querySelector('#locBody');

  function paintLocSeg() {
    locSeg.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.mode === locMode);
    });
  }

  function setLocStatus(html, cls) {
    locBody.querySelector('.loc-status').className = 'loc-status ' + (cls || '');
    locBody.querySelector('.loc-status').innerHTML = html;
  }

  function paintLocBody() {
    if (locMode === 'none') {
      locBody.innerHTML = '';
      model.lat = null; model.lng = null; model.address = '';
      return;
    }
    if (locMode === 'current') {
      locBody.innerHTML = `<div class="loc-status">${escapeHtml(t('loc_locating'))}</div>`;
      getCurrentPosition({ force: true })
        .then(async (pos) => {
          if (locMode !== 'current') return;
          model.lat = pos.lat; model.lng = pos.lng;
          myPosition = pos;
          setLocStatus(`${pinIcon} ${escapeHtml(t('loc_ok'))} …`, 'is-ok');
          const addr = await reverseGeocode(pos.lat, pos.lng);
          if (locMode !== 'current') return;
          model.address = addr;
          setLocStatus(`${pinIcon} ${escapeHtml(addr || t('loc_ok'))}`, 'is-ok');
        })
        .catch((err) => {
          if (locMode !== 'current') return;
          model.lat = null; model.lng = null; model.address = '';
          setLocStatus(escapeHtml(err && err.code === 1 ? t('loc_denied') : t('loc_failed')), 'is-error');
        });
      return;
    }
    // address
    locBody.innerHTML = `
      <div class="addr-row">
        <input class="input" id="addrInput" type="text" placeholder="${escapeHtml(t('addr_ph'))}"
          enterkeyhint="search" value="${escapeHtml(model.address || '')}" />
        <button type="button" class="btn btn--ghost btn--small" id="addrBtn">${escapeHtml(t('addr_search'))}</button>
      </div>
      <div class="loc-status">${model.lat != null ? `${pinIcon} ${escapeHtml(model.address || '')}` : ''}</div>`;

    const addrInput = locBody.querySelector('#addrInput');
    const addrBtn = locBody.querySelector('#addrBtn');
    const doSearch = async () => {
      const q = addrInput.value.trim();
      if (!q) return;
      addrBtn.disabled = true;
      setLocStatus(escapeHtml(t('addr_searching')), '');
      try {
        const hit = await geocodeAddress(q);
        if (locMode !== 'address') return;
        if (!hit) {
          model.lat = null; model.lng = null;
          setLocStatus(escapeHtml(t('addr_notfound')), 'is-error');
        } else {
          model.lat = hit.lat; model.lng = hit.lng; model.address = hit.address || q;
          addrInput.value = model.address;
          setLocStatus(`${pinIcon} ${escapeHtml(model.address)}`, 'is-ok');
        }
      } catch (e) {
        setLocStatus(escapeHtml(t('addr_notfound')), 'is-error');
      } finally {
        addrBtn.disabled = false;
      }
    };
    addrBtn.addEventListener('click', doSearch);
    addrInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
    });
  }

  locSeg.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      locMode = b.dataset.mode;
      paintLocSeg();
      paintLocBody();
    });
  });
  paintLocSeg();
  paintLocBody();

  /* --- Sterne --- */
  const starInput = el.querySelector('#starInput');
  function paintStars() {
    starInput.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === model.stars));
      b.setAttribute('aria-label', String(i));
      b.innerHTML = starSvg(i <= model.stars);
      b.addEventListener('click', () => {
        model.stars = i;
        el.querySelector('#starError').hidden = true;
        paintStars();
        const btns = starInput.querySelectorAll('button');
        for (let k = 0; k < i; k++) {
          const bb = btns[k];
          bb.classList.remove('pop');
          void bb.offsetWidth;
          bb.style.animationDelay = (k * 40) + 'ms';
          bb.classList.add('pop');
        }
        if (navigator.vibrate) navigator.vibrate(8);
      });
      starInput.appendChild(b);
    }
  }
  paintStars();

  /* --- Slider --- */
  const sliders = el.querySelector('#sliders');
  METRICS.forEach((m) => {
    const row = document.createElement('div');
    row.className = 'slider';
    row.innerHTML = `
      <div class="slider__head">
        <span class="slider__label"><span class="slider__emoji">${m.emoji}</span>${escapeHtml(t(m.i18n))}</span>
        <span class="slider__value">${model[m.key]}/10</span>
      </div>
      <input type="range" min="1" max="10" step="1" value="${model[m.key]}"
        id="rng-${m.key}" aria-label="${escapeHtml(t(m.i18n))}" />`;
    sliders.appendChild(row);
    const rng = row.querySelector('input');
    const val = row.querySelector('.slider__value');
    const setFill = () => rng.style.setProperty('--fill', ((rng.value - 1) / 9 * 100) + '%');
    setFill();
    rng.addEventListener('input', () => {
      model[m.key] = clampInt(rng.value, 1, 10);
      val.textContent = model[m.key] + '/10';
      setFill();
    });
  });

  /* --- Felder --- */
  const cafeInput = el.querySelector('#cafe');
  const priceInput = el.querySelector('#price');
  const notesInput = el.querySelector('#notes');
  const cafeError = el.querySelector('#cafeError');
  const priceError = el.querySelector('#priceError');
  const starError = el.querySelector('#starError');

  cafeInput.addEventListener('input', () => {
    if (cafeInput.value.trim()) { cafeError.hidden = true; cafeInput.classList.remove('input--invalid'); }
  });
  priceInput.addEventListener('input', () => {
    priceError.hidden = true; priceInput.classList.remove('input--invalid');
  });

  el.querySelector('#cancel').addEventListener('click', () => {
    navigate(isEdit ? '/r/' + model.id : '/');
  });

  /* --- Speichern --- */
  const saveBtn = el.querySelector('#save');
  el.querySelector('#form').addEventListener('submit', async (e) => {
    e.preventDefault();

    let ok = true;
    const cafe = cafeInput.value.trim();
    if (!cafe) {
      cafeError.hidden = false;
      cafeInput.classList.add('input--invalid');
      cafeInput.focus();
      ok = false;
    }

    let priceValue = null;
    if (priceInput.value.trim()) {
      const p = parsePrice(priceInput.value);
      if (!Number.isFinite(p) || p < 0) {
        priceError.hidden = false;
        priceInput.classList.add('input--invalid');
        ok = false;
      } else {
        priceValue = Math.round(p * 100) / 100;
      }
    }

    if (model.stars < 1) { starError.hidden = false; ok = false; }
    if (!ok) return;

    const now = new Date().toISOString();
    const rating = {
      id: model.id,
      cafe,
      price: priceValue,
      stars: clampInt(model.stars, 1, 5),
      cremig: clampInt(model.cremig, 1, 10),
      fruchtig: clampInt(model.fruchtig, 1, 10),
      schokoladig: clampInt(model.schokoladig, 1, 10),
      geschmack: clampInt(model.geschmack, 1, 10),
      ambiente: clampInt(model.ambiente, 1, 10),
      notes: notesInput.value.trim(),
      author: isEdit ? (existing.author || getAuthorName()) : getAuthorName(),
      lat: Number.isFinite(model.lat) ? model.lat : null,
      lng: Number.isFinite(model.lng) ? model.lng : null,
      address: model.address || '',
      createdAt: model.createdAt || now,
      updatedAt: now,
    };

    saveBtn.disabled = true;
    saveBtn.textContent = t('saving');
    try {
      if (isEdit) await updateRating(rating);
      else await createRating(rating);
      showSaveToast(() => navigate(isEdit ? '/r/' + rating.id : '/', true));
    } catch (err) {
      console.error('Speichern fehlgeschlagen:', err);
      saveBtn.disabled = false;
      saveBtn.textContent = t('save');
      alert(t('save_error'));
    }
  });

  return el;
}

/* ---------------- View: Detailansicht ---------------- */

function DetailView(r) {
  if (!r) return null;
  const isOwner = r.ownerUid === getUid();
  const dist = ratingDistance(r);

  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <header class="appbar">
      <button class="appbar__back" id="back">${backIcon}${escapeHtml(t('d_back'))}</button>
      <h1 class="appbar__title"></h1>
      ${isOwner ? `<button class="appbar__action" id="edit">${escapeHtml(t('edit'))}</button>` : `<span style="width:78px"></span>`}
    </header>

    <div class="detail-hero">
      <h1>${escapeHtml(r.cafe)}</h1>
      ${starsDisplay(r.stars, true)}
      <div class="detail-chips">
        ${formatPrice(r.price) ? `<span class="chip">${escapeHtml(t('chip_price'))} <strong>${escapeHtml(formatPrice(r.price))}</strong></span>` : ''}
        <span class="chip">${escapeHtml(formatDate(r.createdAt))}</span>
        <button type="button" class="chip chip--btn" id="authorChip">${escapeHtml(
          isOwner ? t('by_you') : t('by_name', { name: r.author || t('someone') })
        )}</button>
        ${dist != null ? `<span class="chip">${escapeHtml(t('dist_away', { d: formatDistance(dist, getLocale()) }))}</span>` : ''}
      </div>
    </div>

    ${hasLocation(r) ? `
      <div class="section-title">${escapeHtml(t('f_location'))}</div>
      <div class="card-group">
        <div class="detail-map" id="detailMap"></div>
        <a class="row-btn" id="mapsLink" href="${mapsLink(r.lat, r.lng, r.cafe)}" target="_blank" rel="noopener">
          <span>${pinIcon} ${escapeHtml(r.address || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`)}</span>
          <span class="row-btn__action">${escapeHtml(t('open_in_maps'))}</span>
        </a>
      </div>` : ''}

    <div class="section-title">${escapeHtml(t('props_title'))}</div>
    <div class="card-group"><div class="bars" id="bars"></div></div>

    ${r.notes ? `
      <div class="section-title">${escapeHtml(t('notes_title'))}</div>
      <div class="note-box">${escapeHtml(r.notes)}</div>` : ''}

    <div class="detail-actions">
      ${isOwner ? `
        <button class="btn btn--ghost" id="edit2">${escapeHtml(t('edit'))}</button>
        <button class="btn btn--danger" id="del">${escapeHtml(t('delete_rating'))}</button>
      ` : `
        <p class="field__hint" style="text-align:center;">${escapeHtml(t('only_owner', { name: r.author || t('someone') }))}</p>
      `}
    </div>`;

  const bars = el.querySelector('#bars');
  METRICS.forEach((m) => {
    const v = clampInt(r[m.key], 1, 10);
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-row__head">
        <span class="bar-row__label"><span>${m.emoji}</span>${escapeHtml(t(m.i18n))}</span>
        <span class="bar-row__value">${v}/10</span>
      </div>
      <div class="bar-track"><div class="bar-fill"></div></div>`;
    bars.appendChild(row);
    requestAnimationFrame(() => {
      row.querySelector('.bar-fill').style.width = (v * 10) + '%';
    });
  });

  el.querySelector('#back').addEventListener('click', () => navigate('/'));
  el.querySelector('#authorChip').addEventListener('click', () => {
    const who = (r.author || '').trim() || t('someone');
    navigate('/u/' + encodeURIComponent(who));
  });
  if (isOwner) {
    el.querySelector('#edit').addEventListener('click', () => navigate('/r/' + r.id + '/edit'));
    el.querySelector('#edit2').addEventListener('click', () => navigate('/r/' + r.id + '/edit'));
    el.querySelector('#del').addEventListener('click', () => confirmDelete(r));
  }

  if (hasLocation(r)) {
    loadLeaflet().then((L) => {
      const node = el.querySelector('#detailMap');
      if (!node || !node.isConnected) return;
      const map = L.map(node, {
        zoomControl: false, attributionControl: false,
        dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false,
      }).setView([r.lat, r.lng], 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      L.marker([r.lat, r.lng], {
        icon: L.divIcon({
          className: 'coffee-pin-wrap',
          html: `<div class="coffee-pin"><span>${r.stars || '☕'}</span></div>`,
          iconSize: [34, 34], iconAnchor: [17, 34],
        }),
      }).addTo(map);
      setTimeout(() => map.invalidateSize(), 60);
    }).catch(() => {});
  }

  return el;
}

/* ---------------- Löschen-Dialog ---------------- */

function confirmDelete(r) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlgTitle">
      <h3 id="dlgTitle">${escapeHtml(t('del_title'))}</h3>
      <p>${escapeHtml(t('del_text'))}</p>
      <div class="dialog__buttons">
        <button class="btn btn--danger" id="dlgDelete" style="background:var(--danger);color:#fff;">${escapeHtml(t('del_confirm'))}</button>
        <button class="btn btn--ghost" id="dlgCancel">${escapeHtml(t('cancel'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#dlgCancel').addEventListener('click', close);
  overlay.querySelector('#dlgDelete').addEventListener('click', async () => {
    const btn = overlay.querySelector('#dlgDelete');
    btn.disabled = true;
    btn.textContent = t('deleting');
    try {
      await deleteRatingRemote(r.id);
      close();
      navigate('/', true);
    } catch (err) {
      console.error('Löschen fehlgeschlagen:', err);
      close();
      alert(t('del_error'));
    }
  });
}

/* ---------------- Rückmeldungen ---------------- */

function showSaveToast(done) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <div class="toast__badge">
      <svg viewBox="0 0 64 64" aria-hidden="true"><path class="check-path" d="M16 33 L28 45 L49 20" /></svg>
    </div>`;
  document.body.appendChild(el);
  if (navigator.vibrate) navigator.vibrate([10, 40, 10]);
  setTimeout(() => { el.remove(); done && done(); }, 720);
}

function toast(message) {
  const el = document.createElement('div');
  el.className = 'snackbar';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('is-out'), 2600);
  setTimeout(() => el.remove(), 3000);
}

function closeOverlays() {
  document.querySelectorAll('.overlay, .toast, .snackbar').forEach((n) => n.remove());
}

/* ---------------- Benachrichtigungen (Platzhalter bis Worker steht) -------- */

function wireNotificationRow(btn, hint) {
  if (!btn) return;
  const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (!supported) {
    btn.disabled = true;
    btn.textContent = '–';
    hint.textContent = isIOS && !standalone ? t('notif_ios_hint') : t('notif_unsupported');
    return;
  }
  if (Notification.permission === 'denied') {
    btn.disabled = true;
    btn.textContent = '–';
    hint.textContent = t('notif_blocked');
    return;
  }

  import('./push.js')
    .then((push) => push.wireToggle(btn, hint))
    .catch(() => {
      btn.disabled = true;
      btn.textContent = '–';
      hint.textContent = t('notif_off');
    });
}

/* ---------------- Install-Hinweis ---------------- */

function setupInstallHint() {
  const hint = document.getElementById('installHint');
  if (!hint) return;
  const title = document.getElementById('installHintTitle');
  const text = document.getElementById('installHintText');
  const closeBtn = document.getElementById('installHintClose');

  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  let dismissed = false;
  try { dismissed = localStorage.getItem('espressohunt.installHint.dismissed') === '1'; } catch (e) {}
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (standalone || dismissed) return;

  title.textContent = t('install_title');
  text.textContent = isIOS ? t('install_ios') : t('install_other');
  closeBtn.textContent = t('install_ok');
  hint.hidden = false;

  const close = () => {
    hint.hidden = true;
    try { localStorage.setItem('espressohunt.installHint.dismissed', '1'); } catch (e) {}
  };
  closeBtn.addEventListener('click', close);
  hint.querySelector('.install-hint__inner').addEventListener('click', (e) => {
    if (e.target !== closeBtn) close();
  });
  setTimeout(() => { hint.hidden = true; }, 12000);
}

/* ---------------- Service Worker ---------------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW-Registrierung fehlgeschlagen:', e));
  });
}

/* ---------------- Start ---------------- */

function boot() {
  setupInstallHint();

  const start = () => {
    subscribeRatings(
      (list) => {
        ratingsCache = list;
        ratingsReady = true;
        syncError = false;
        render();
      },
      () => {
        syncError = true;
        if (!ratingsReady) render();
      }
    );
  };

  render();

  const go = () => whenReady()
    .then(() => migrateLocalRatingsIfNeeded(getAuthorName()))
    .finally(start);

  if (getAuthorName()) go();
  else promptAuthorName(go);

  // Bereits bekannter Standort (z. B. aus früherer Sitzung im selben Tab)
  const cached = getCachedPosition();
  if (cached) myPosition = cached;
  if (sortMode === 'distance') {
    getCurrentPosition().then((p) => { myPosition = p; render(); }).catch(() => {});
  }
}

boot();
