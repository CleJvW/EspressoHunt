/* Prueft, ob der Push-Dienst standardkonforme Nachrichten baut:
   1. Wir spielen "Browser" und erzeugen ein Abo-Schluesselpaar.
   2. Der Worker-Code verschluesselt eine Nachricht dafuer.
   3. Wir entschluesseln sie nach RFC 8291 (aes128gcm) - kommt der Klartext zurueck?
   4. Ist der VAPID-Token nach RFC 8292 korrekt signiert?
   Beides ist zwingend, damit iOS/Safari die Benachrichtigung annimmt.

   Aufruf:  node crypto-verify.mjs                                          */

globalThis.self = globalThis;
import crypto from 'node:crypto';
import { buildPushPayload } from '@block65/webcrypto-web-push';

/* Der oeffentliche Schluessel darf im Repo stehen, der private NICHT.
   Den privaten beim Aufruf mitgeben:
     VAPID_PRIVATE_KEY=<schluessel> node crypto-verify.mjs
   (er liegt ausserdem als Cloudflare-Secret im Worker)                    */
const VAPID_PUBLIC = 'BHRF1fF5VCtqDg5UqYrTK-Vl3UsLIoCG0TZYpVFfruV-FWwICjyHXwyWiLWiV4bDwv4ozJNRQE0vp86_E5xyiuo';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
if (!VAPID_PRIVATE) {
  console.error('Bitte den privaten Schluessel mitgeben:\n'
    + '  VAPID_PRIVATE_KEY=<schluessel> node crypto-verify.mjs');
  process.exit(2);
}

let failed = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failed++; };
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const SPKI_PREFIX = Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex');
const toPubKey = (raw) => crypto.createPublicKey({
  key: Buffer.concat([SPKI_PREFIX, Buffer.from(raw)]), format: 'der', type: 'spki',
});

/* --- 1. "Browser"-Abo erzeugen ----------------------------------------- */
const subKeys = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const subPubRaw = subKeys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-65);
const authSecret = crypto.randomBytes(16);
const subscription = {
  endpoint: 'https://web.push.apple.com/TESTENDPOINT',
  keys: { p256dh: b64u(subPubRaw), auth: b64u(authSecret) },
};

/* --- 2. Verschluesseln, wie es der Worker tut -------------------------- */
const original = JSON.stringify({
  title: '☕ Clemens hat einen Kaffee bewertet',
  body: 'Bellini · ★★★★ · Piazza Maggiore, Bologna',
  url: 'https://clejvw.github.io/EspressoHunt/#/r/abc',
});

const { headers, body } = await buildPushPayload(
  { data: original, options: { ttl: 3600, urgency: 'normal' } },
  subscription,
  { subject: 'mailto:espressohunt@users.noreply.github.com', publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE }
);

const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
ok(h['content-encoding'] === 'aes128gcm', 'Verschluesselung aes128gcm (von iOS/Safari gefordert): ' + h['content-encoding']);
ok(/^vapid t=[^,]+, ?k=.+/.test(h.authorization || ''), 'VAPID-Schema nach RFC 8292 (von iOS gefordert)');
ok(!h.encryption && !h['crypto-key'], 'Keine veralteten Header (Encryption/Crypto-Key) mehr');

/* --- 3. Als Empfaenger entschluesseln (RFC 8291) ------------------------ */
const payload = Buffer.from(body);
const salt = payload.subarray(0, 16);
const idlen = payload.readUInt8(20);
const serverPubRaw = payload.subarray(21, 21 + idlen);
const ciphertext = payload.subarray(21 + idlen);
ok(idlen === 65, 'Server-Schluessel im Kopf der Nachricht: ' + idlen + ' Byte');

const hkdf = (ikm, saltBuf, info, len) => {
  const prk = crypto.createHmac('sha256', saltBuf).update(ikm).digest();
  return crypto.createHmac('sha256', prk)
    .update(Buffer.concat([info, Buffer.from([1])])).digest().subarray(0, len);
};

const sharedSecret = crypto.diffieHellman({
  privateKey: subKeys.privateKey, publicKey: toPubKey(serverPubRaw),
});
const ikm = hkdf(sharedSecret, authSecret,
  Buffer.concat([Buffer.from('WebPush: info\0'), subPubRaw, serverPubRaw]), 32);
const cek = hkdf(ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
const nonce = hkdf(ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12);

const decipher = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
decipher.setAuthTag(ciphertext.subarray(-16));
let plain = Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()]);
// Padding abschneiden: Nullbytes, dann das Trennbyte 0x02
while (plain.length && plain[plain.length - 1] === 0) plain = plain.subarray(0, -1);
if (plain.length && plain[plain.length - 1] === 2) plain = plain.subarray(0, -1);

const decrypted = plain.toString('utf8');
ok(decrypted === original, 'Empfaenger kann die Nachricht entschluesseln');
if (decrypted === original) console.log('      Klartext: ' + JSON.parse(decrypted).title);
else console.log('      erwartet: ' + original + '\n      erhalten: ' + decrypted);

/* --- 4. VAPID-Signatur pruefen ----------------------------------------- */
const jwt = h.authorization.match(/t=([^,]+)/)[1].trim();
const kParam = h.authorization.match(/k=\s*(.+)$/)[1].trim();
const [jh, jp, jsig] = jwt.split('.');

const rawSig = Buffer.from(jsig, 'base64url');
const trimInt = (b) => {
  let i = 0;
  while (i < b.length - 1 && b[i] === 0) i++;
  b = b.subarray(i);
  return b[0] & 0x80 ? Buffer.concat([Buffer.from([0]), b]) : b;
};
const r = trimInt(rawSig.subarray(0, 32));
const sVal = trimInt(rawSig.subarray(32));
const seq = Buffer.concat([Buffer.from([2, r.length]), r, Buffer.from([2, sVal.length]), sVal]);
const sigDer = Buffer.concat([Buffer.from([0x30, seq.length]), seq]);

const valid = crypto.verify('sha256', Buffer.from(`${jh}.${jp}`),
  { key: toPubKey(Buffer.from(kParam, 'base64url')), dsaEncoding: 'der' }, sigDer);
ok(valid, 'VAPID-Signatur gueltig - der Push-Dienst wird sie akzeptieren');

const claims = JSON.parse(Buffer.from(jp, 'base64url').toString());
ok(claims.aud === 'https://web.push.apple.com', 'Empfaenger im Token korrekt: ' + claims.aud);
ok(claims.exp > Math.floor(Date.now() / 1000), 'Token noch gueltig');
ok(claims.sub && claims.sub.startsWith('mailto:'), 'Kontaktadresse gesetzt: ' + claims.sub);
ok(kParam === VAPID_PUBLIC, 'Schluessel im Header = Schluessel in der App');

console.log(failed === 0
  ? '\n== VERSCHLUESSELUNG UND SIGNATUR SIND iOS-TAUGLICH =='
  : `\n== ${failed} FEHLGESCHLAGEN ==`);
process.exit(failed ? 1 : 0);
