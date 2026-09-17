/* ================================================================
   EspressoHunt — Standort, Adresssuche, Entfernung und Kartenladen
   Nutzt ausschliesslich kostenlose, schlüsselfreie Dienste:
   - Geolocation-API des Browsers
   - Nominatim (OpenStreetMap) für Adresse ↔ Koordinaten
   - Leaflet + OpenStreetMap-Kacheln für die Karte
   ================================================================ */

const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const NOMINATIM = 'https://nominatim.openstreetmap.org';

/* ---------------- Aktueller Standort ---------------- */

let cachedPosition = null;
let cachedAt = 0;
const POSITION_MAX_AGE = 5 * 60 * 1000;

export function getCurrentPosition({ force = false } = {}) {
  if (!force && cachedPosition && Date.now() - cachedAt < POSITION_MAX_AGE) {
    return Promise.resolve(cachedPosition);
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        cachedAt = Date.now();
        resolve(cachedPosition);
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

export function getCachedPosition() {
  return cachedPosition;
}

/* ---------------- Adresse → Koordinaten ---------------- */

export async function geocodeAddress(query) {
  const url = `${NOMINATIM}/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('geocode failed');
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const hit = data[0];
  return {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    address: shortenAddress(hit.display_name),
  };
}

/* ---------------- Koordinaten → Adresse ---------------- */

export async function reverseGeocode(lat, lng) {
  try {
    const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return '';
    const data = await res.json();
    return shortenAddress(data.display_name || '');
  } catch (e) {
    return '';
  }
}

/* "Straße 1, Viertel, Stadt, Bezirk, Land" → "Straße 1, Stadt" */
function shortenAddress(displayName) {
  if (!displayName) return '';
  const parts = displayName.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(', ');
  const street = parts[0];
  const city = parts.find((p, i) => i > 0 && /^\D+$/.test(p) && !/^\d/.test(p)) || parts[1];
  return city && city !== street ? `${street}, ${city}` : street;
}

/* ---------------- Entfernung (Haversine, in Metern) ---------------- */

export function distanceMeters(a, b) {
  if (!a || !b) return null;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters, locale) {
  if (meters == null || !Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const km = meters / 1000;
  return `${km.toLocaleString(locale || 'de-DE', {
    minimumFractionDigits: km < 10 ? 1 : 0,
    maximumFractionDigits: km < 10 ? 1 : 0,
  })} km`;
}

/* ---------------- Leaflet bei Bedarf nachladen ---------------- */

let leafletPromise = null;

export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error('leaflet missing')));
    script.onerror = () => {
      leafletPromise = null;
      reject(new Error('leaflet load failed'));
    };
    document.head.appendChild(script);
  });
  return leafletPromise;
}

/* Link in die Karten-App des Geräts (iOS → Apple Karten, sonst OSM) */
export function mapsLink(lat, lng, label) {
  const isApple = /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent);
  const q = encodeURIComponent(label || '');
  return isApple
    ? `https://maps.apple.com/?ll=${lat},${lng}&q=${q}`
    : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
}
