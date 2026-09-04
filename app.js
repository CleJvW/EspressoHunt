/* ================================================================
   EspressoHunt — App-Logik (Vanilla JS, keine Libraries)
   - Lokale Speicherung via localStorage (bleibt nach Neustart erhalten)
   - Hash-Routing:  #/  #/new  #/r/<id>  #/r/<id>/edit
   ================================================================ */

'use strict';

/* ---------------- Konstanten ---------------- */

const STORAGE_KEY = 'espressohunt.ratings.v1';

const METRICS = [
  { key: 'cremig',      label: 'Cremig',      emoji: '☕' },
  { key: 'fruchtig',    label: 'Fruchtig',    emoji: '🍓' },
  { key: 'schokoladig', label: 'Schokoladig', emoji: '🍫' },
  { key: 'geschmack',   label: 'Geschmack',   emoji: '👅' },
  { key: 'ambiente',    label: 'Ambiente',    emoji: '🪑' },
];

const app = document.getElementById('app');

/* ---------------- Speicher ---------------- */

function loadRatings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('Konnte Bewertungen nicht laden:', e);
    return [];
  }
}

function saveRatings(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error('Konnte Bewertungen nicht speichern:', e);
    alert('Speichern nicht möglich. Ist der Browser-Speicher voll oder privat?');
    return false;
  }
}

function getRating(id) {
  return loadRatings().find((r) => r.id === id) || null;
}

function upsertRating(rating) {
  const list = loadRatings();
  const idx = list.findIndex((r) => r.id === rating.id);
  if (idx >= 0) list[idx] = rating;
  else list.unshift(rating);
  saveRatings(list);
}

function deleteRating(id) {
  saveRatings(loadRatings().filter((r) => r.id !== id));
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
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

function clampInt(v, min, max) {
  v = Math.round(Number(v));
  if (isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

/* ---------------- SVG-Bausteine ---------------- */

function starSvg(filled) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="${filled ? 'star-fill' : 'star-empty'}"
    d="M12 2.4l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.2l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.94L12 2.4z"/></svg>`;
}

function starsDisplay(count, large) {
  let out = `<span class="stars${large ? ' stars--lg' : ''}" role="img" aria-label="${count} von 5 Sternen">`;
  for (let i = 1; i <= 5; i++) out += starSvg(i <= count);
  return out + '</span>';
}

const backIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.5 4.5L8 12l7.5 7.5 1.4-1.42L10.83 12l6.07-6.08z"/></svg>`;

/* ---------------- Router ---------------- */

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'new') return { name: 'new' };
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
  if (route.name === 'home') view = HomeView();
  else if (route.name === 'new') view = FormView(null);
  else if (route.name === 'edit') view = FormView(getRating(route.id));
  else if (route.name === 'detail') view = DetailView(getRating(route.id));

  if (!view) { navigate('/', true); return; }

  app.innerHTML = '';
  app.appendChild(view);
  window.scrollTo(0, 0);
  wireAppbarScroll();
}

window.addEventListener('hashchange', render);

/* ---------------- Appbar-Scroll-Effekt ---------------- */

function wireAppbarScroll() {
  const bar = app.querySelector('.appbar');
  if (!bar) return;
  const onScroll = () => bar.classList.toggle('appbar--scrolled', window.scrollY > 4);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------------- View: Startseite ---------------- */

function HomeView() {
  const ratings = loadRatings();
  const el = document.createElement('div');
  el.className = 'screen';

  el.innerHTML = `
    <header class="appbar">
      <h1 class="appbar__title">EspressoHunt</h1>
    </header>
    <div class="home-hero">
      <h1>Meine Bewertungen</h1>
      <p>${ratings.length
        ? `${ratings.length} ${ratings.length === 1 ? 'Bewertung' : 'Bewertungen'} gespeichert`
        : 'Deine Kaffee-Sammlung'}</p>
    </div>
    <div class="content content--list" id="list"></div>
    <div class="fab-bar">
      <button class="btn btn--primary" id="addBtn">＋ Kaffee bewerten</button>
    </div>
  `;

  const list = el.querySelector('#list');

  if (ratings.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty__icon">☕️</div>
        <h2>Noch keinen Kaffee bewertet.</h2>
        <p>Bewerte deinen ersten Kaffee und entdecke deine Favoriten.</p>
      </div>`;
  } else {
    ratings.forEach((r, i) => {
      const card = document.createElement('button');
      card.className = 'card';
      card.style.animationDelay = Math.min(i * 45, 300) + 'ms';
      card.innerHTML = `
        <div class="card__top">
          <h3 class="card__name">${escapeHtml(r.cafe)}</h3>
          ${formatPrice(r.price) ? `<span class="card__price">${escapeHtml(formatPrice(r.price))}</span>` : ''}
        </div>
        <div class="card__meta">
          ${starsDisplay(r.stars)}
          <span class="card__date">${escapeHtml(formatDate(r.createdAt))}</span>
        </div>
        ${r.notes ? `<p class="card__note">${escapeHtml(r.notes)}</p>` : ''}
      `;
      card.addEventListener('click', () => navigate('/r/' + r.id));
      list.appendChild(card);
    });
    // Platz, damit der FAB nichts verdeckt
    const spacer = document.createElement('div');
    spacer.style.height = '96px';
    list.appendChild(spacer);
  }

  el.querySelector('#addBtn').addEventListener('click', () => navigate('/new'));
  return el;
}

/* ---------------- View: Formular (neu / bearbeiten) ---------------- */

function FormView(existing) {
  const isEdit = !!existing;
  const model = existing
    ? { ...existing }
    : {
        id: uid(),
        cafe: '',
        price: '',
        stars: 0,
        cremig: 5, fruchtig: 5, schokoladig: 5, geschmack: 5, ambiente: 5,
        notes: '',
        createdAt: new Date().toISOString(),
      };

  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <header class="appbar">
      <button class="appbar__back" id="cancel">${backIcon}Abbrechen</button>
      <h1 class="appbar__title">${isEdit ? 'Bewertung bearbeiten' : 'Neue Bewertung'}</h1>
      <span style="width:78px"></span>
    </header>

    <form class="form" id="form" novalidate>
      <div class="field">
        <label class="field__label" for="cafe">Café</label>
        <input class="input" id="cafe" name="cafe" type="text"
          placeholder="Wie heißt das Café?" autocomplete="off"
          enterkeyhint="next" value="${escapeHtml(model.cafe)}" />
        <p class="error-text" id="cafeError" hidden>Bitte gib den Namen des Cafés ein.</p>
      </div>

      <div class="field">
        <label class="field__label" for="price">Preis</label>
        <div class="price-wrap">
          <input class="input" id="price" name="price" type="text"
            inputmode="decimal" placeholder="4,50" enterkeyhint="done"
            value="${escapeHtml(model.price === '' ? '' : String(model.price).replace('.', ','))}" />
          <span class="price-wrap__cur">€</span>
        </div>
        <p class="field__hint">Preis deines Kaffees – optional.</p>
        <p class="error-text" id="priceError" hidden>Bitte gib einen gültigen Preis ein (z. B. 4,50).</p>
      </div>

      <div class="field">
        <span class="field__label">Sterne</span>
        <div class="star-input" id="starInput" role="radiogroup" aria-label="Sternebewertung"></div>
        <p class="error-text" id="starError" hidden>Bitte vergib mindestens einen Stern.</p>
      </div>

      <div class="field">
        <span class="field__label">Eigenschaften</span>
        <div class="card-group" id="sliders"></div>
      </div>

      <div class="field">
        <label class="field__label" for="notes">Bemerkungen</label>
        <textarea class="textarea" id="notes" name="notes"
          placeholder="Was hat dir besonders gefallen – oder nicht?">${escapeHtml(model.notes)}</textarea>
        <p class="field__hint">Optional.</p>
      </div>
    </form>

    <div class="form-actions">
      <button class="btn btn--primary" id="save" form="form">Bewertung speichern</button>
    </div>
  `;

  /* --- Sterne --- */
  const starInput = el.querySelector('#starInput');
  function paintStars() {
    starInput.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === model.stars));
      b.setAttribute('aria-label', i + ' Sterne');
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
        <span class="slider__label"><span class="slider__emoji">${m.emoji}</span>${m.label}</span>
        <span class="slider__value" id="val-${m.key}">${model[m.key]}/10</span>
      </div>
      <input type="range" min="1" max="10" step="1" value="${model[m.key]}"
        id="rng-${m.key}" aria-label="${m.label}" />
    `;
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

  /* --- Feld-Referenzen --- */
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

  /* --- Abbrechen --- */
  el.querySelector('#cancel').addEventListener('click', () => {
    if (isEdit) navigate('/r/' + model.id);
    else navigate('/');
  });

  /* --- Speichern --- */
  el.querySelector('#form').addEventListener('submit', (e) => {
    e.preventDefault();

    let ok = true;
    const cafe = cafeInput.value.trim();
    if (!cafe) {
      cafeError.hidden = false;
      cafeInput.classList.add('input--invalid');
      cafeInput.focus();
      ok = false;
    }

    let priceValue = '';
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

    if (model.stars < 1) {
      starError.hidden = false;
      ok = false;
    }

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
      createdAt: model.createdAt || now,
      updatedAt: now,
    };

    upsertRating(rating);
    showSaveToast(() => navigate(isEdit ? '/r/' + rating.id : '/', true));
  });

  return el;
}

/* ---------------- View: Detailansicht ---------------- */

function DetailView(r) {
  if (!r) return null;

  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `
    <header class="appbar">
      <button class="appbar__back" id="back">${backIcon}Bewertungen</button>
      <h1 class="appbar__title"></h1>
      <button class="appbar__action" id="edit">Bearbeiten</button>
    </header>

    <div class="detail-hero">
      <h1>${escapeHtml(r.cafe)}</h1>
      ${starsDisplay(r.stars, true)}
      <div class="detail-chips">
        ${formatPrice(r.price) ? `<span class="chip">Preis <strong>${escapeHtml(formatPrice(r.price))}</strong></span>` : ''}
        <span class="chip">${escapeHtml(formatDate(r.createdAt))}</span>
      </div>
    </div>

    <div class="section-title">Eigenschaften</div>
    <div class="card-group"><div class="bars" id="bars"></div></div>

    ${r.notes ? `
      <div class="section-title">Bemerkungen</div>
      <div class="note-box">${escapeHtml(r.notes)}</div>
    ` : ''}

    <div class="detail-actions">
      <button class="btn btn--ghost" id="edit2">Bearbeiten</button>
      <button class="btn btn--danger" id="del">Bewertung löschen</button>
    </div>
  `;

  const bars = el.querySelector('#bars');
  METRICS.forEach((m) => {
    const v = clampInt(r[m.key], 1, 10);
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-row__head">
        <span class="bar-row__label"><span>${m.emoji}</span>${m.label}</span>
        <span class="bar-row__value">${v}/10</span>
      </div>
      <div class="bar-track"><div class="bar-fill"></div></div>
    `;
    bars.appendChild(row);
    requestAnimationFrame(() => {
      row.querySelector('.bar-fill').style.width = (v * 10) + '%';
    });
  });

  el.querySelector('#back').addEventListener('click', () => navigate('/'));
  el.querySelector('#edit').addEventListener('click', () => navigate('/r/' + r.id + '/edit'));
  el.querySelector('#edit2').addEventListener('click', () => navigate('/r/' + r.id + '/edit'));
  el.querySelector('#del').addEventListener('click', () => confirmDelete(r));

  return el;
}

/* ---------------- Löschen-Dialog ---------------- */

function confirmDelete(r) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlgTitle">
      <h3 id="dlgTitle">Bewertung löschen?</h3>
      <p>Möchtest du diese Bewertung wirklich löschen? Das kann nicht rückgängig gemacht werden.</p>
      <div class="dialog__buttons">
        <button class="btn btn--danger" id="dlgDelete" style="background:var(--danger);color:#fff;">Löschen</button>
        <button class="btn btn--ghost" id="dlgCancel">Abbrechen</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#dlgCancel').addEventListener('click', close);
  overlay.querySelector('#dlgDelete').addEventListener('click', () => {
    deleteRating(r.id);
    close();
    navigate('/', true);
  });
}

/* ---------------- Speicher-Bestätigung ---------------- */

function showSaveToast(done) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast__badge">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path class="check-path" d="M16 33 L28 45 L49 20" />
      </svg>
    </div>`;
  document.body.appendChild(toast);
  if (navigator.vibrate) navigator.vibrate([10, 40, 10]);
  setTimeout(() => { toast.remove(); done && done(); }, 720);
}

function closeOverlays() {
  document.querySelectorAll('.overlay, .toast').forEach((n) => n.remove());
}

/* ---------------- Install-Hinweis (iOS Safari) ---------------- */

function setupInstallHint() {
  const hint = document.getElementById('installHint');
  const text = document.getElementById('installHintText');
  const closeBtn = document.getElementById('installHintClose');
  if (!hint) return;

  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  const dismissed = localStorage.getItem('espressohunt.installHint.dismissed') === '1';
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (standalone || dismissed) return;

  if (!isIOS) {
    text.textContent = 'Über das Browser-Menü „Zum Startbildschirm hinzufügen“ wählen – dann läuft die App im Vollbild.';
  }
  hint.hidden = false;

  const close = () => {
    hint.hidden = true;
    try { localStorage.setItem('espressohunt.installHint.dismissed', '1'); } catch (e) {}
  };
  closeBtn.addEventListener('click', close);
  // Tippen irgendwo auf den Hinweis schließt ihn ebenfalls
  hint.querySelector('.install-hint__inner').addEventListener('click', (e) => {
    if (e.target !== closeBtn) close();
  });
  // Nach kurzer Zeit von selbst ausblenden (nur diese Sitzung)
  setTimeout(() => { hint.hidden = true; }, 12000);
}

/* ---------------- Service Worker ---------------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW-Registrierung fehlgeschlagen:', e));
  });
}

/* ---------------- Start ---------------- */

setupInstallHint();
render();
