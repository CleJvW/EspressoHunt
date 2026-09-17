# ☕ EspressoHunt

Eine kleine, schnelle Web-App, um Café-Besuche zu bewerten – Sterne, fünf
Geschmacks-Regler, Preis, Standort und Notizen. Läuft komplett im Browser,
kann auf dem iPhone als **Vollbild-App** zum Home-Bildschirm hinzugefügt
werden – und alle, die die App installiert haben, **sehen sich gegenseitig
live** in einer geteilten Bewertungsliste.

**Live:** <https://clejvw.github.io/EspressoHunt/>

## Was die App kann

- **Bewerten**: Café, Preis, 1–5 Sterne, fünf Eigenschaften (cremig, fruchtig,
  schokoladig, Geschmack, Ambiente) und freie Notizen
- **Geteilt in Echtzeit**: neue Bewertungen erscheinen sofort auf allen Geräten
- **Standort** je Bewertung: aktuelle Position, auf der Karte antippen oder
  Adresse eingeben – jederzeit nachträglich änderbar
- **Karte oder Liste**; Liste sortierbar nach Datum, Bewertung, Preis oder
  Entfernung. Eigene Position als blauer Punkt, der der Bewegung folgt
- **Vollbildkarte**: Minikarte in einer Bewertung antippen zeigt alle
  Bewertungen; „In Karten öffnen" führt in die Karten-App des Geräts
- **Freunde**: wer wie viel bewertet hat, Schnitt aus Sternen und Preis
- **Drei Sprachen**: Deutsch, Italienisch, Englisch (Zahnrad oben rechts)
- **Benachrichtigungen**, wenn Freunde etwas Neues bewerten
- **Offline nutzbar**; Änderungen werden nachsynchronisiert

## Technik

Reines HTML, CSS und JavaScript – keine Frameworks, kein Build-Schritt.
Einzige Ausnahme ist Leaflet für die Karten, das nur bei Bedarf vom CDN
nachgeladen wird; ohne Karte läuft die App auch ohne diese Datei.

**Daten** liegen in Firestore (Projekt `espressohunt-554c7`). Jedes Gerät
meldet sich automatisch und unsichtbar anonym an – kein Login, kein Passwort.
Nur wer eine Bewertung erstellt hat, darf sie ändern oder löschen; das
erzwingt `firestore.rules` serverseitig, nicht bloß die Oberfläche. Beim
ersten Start auf einem Gerät mit alten, rein lokalen Bewertungen werden diese
einmalig automatisch übernommen.

**Benachrichtigungen** verschickt ein Cloudflare Worker (`worker/`), der alle
zwei Minuten nach neuen Bewertungen schaut. Die Push-Abos liegen in
Cloudflare KV, nicht in Firestore – so verlässt kein Geheimnis den Server.
Der private VAPID-Schlüssel ist ausschließlich ein Cloudflare-Secret.

> Wichtig für iOS: Web Push muss `aes128gcm` (RFC 8291) mit dem
> `vapid`-Schema (RFC 8292) verwenden. Das ältere `aesgcm`-Format lehnt Safari
> ab. `worker/crypto-verify.mjs` prüft das ohne Netzzugriff nach, indem es die
> selbst erzeugte Nachricht wieder entschlüsselt:
>
> ```
> cd worker && VAPID_PRIVATE_KEY=<schluessel> node crypto-verify.mjs
> ```

Alle Dienste laufen im kostenlosen Kontingent; es ist keine Zahlungsmethode
hinterlegt.

---

## 📁 Diese Dateien gehören ins Repository

```
index.html                   → die App-Seite
styles.css                   → Design
app.js                       → Logik (Navigation, Formulare, Ansichten, Karten)
db.js                        → Cloud-Datenschicht (Firestore, Echtzeit-Sync)
i18n.js                      → Texte in Deutsch, Italienisch und Englisch
geo.js                       → Standort, Adresssuche, Entfernung, Kartenladen
push.js                      → Benachrichtigungen an-/abmelden
firebase-config.js           → Firebase-Projektkonfiguration (nicht geheim)
firestore.rules              → Server-Sicherheitsregeln
firebase.json / .firebaserc  → Firebase-CLI-Projektzuordnung
sw.js                        → Service Worker (Offline + Benachrichtigungen)
manifest.webmanifest         → App-Name & Icons für "zum Home-Bildschirm"
.nojekyll                    → sagt GitHub Pages: Dateien 1:1 ausliefern
icons/                       → App-Icons
tools/make_icons.py          → erzeugt die Icons neu (nur für Entwicklung)
worker/                      → Cloudflare Worker für die Benachrichtigungen
```

`tools/` und `.nojekyll` sind optional bzw. nur für Entwickler – schaden aber
nicht, wenn sie mit hochgeladen werden.

---

## 🚀 App in einen GitHub-Account laden (einfachster Weg, ganz ohne Kommandozeile)

### 1. Repository anlegen
1. Auf <https://github.com> einloggen.
2. Oben rechts auf **+** → **New repository**.
3. **Repository name:** `EspressoHunt`
4. Sichtbarkeit: **Public** (nötig, damit GitHub Pages kostenlos funktioniert).
5. Haken bei **Add a README file** *nicht* setzen (wir laden ein eigenes hoch).
6. **Create repository**.

### 2. Dateien hochladen
1. Im leeren Repository auf **uploading an existing file** klicken
   (oder **Add file → Upload files**).
2. Den **kompletten Inhalt dieses Ordners** in das Browserfenster ziehen:
   `index.html`, `styles.css`, `app.js`, `db.js`, `firebase-config.js`,
   `firestore.rules`, `firebase.json`, `.firebaserc`, `sw.js`,
   `manifest.webmanifest`, `.nojekyll` **und den ganzen Ordner `icons/`**.
   > Wichtig: Die Dateien einzeln bzw. den Ordner `icons` mit hineinziehen –
   > **nicht** den übergeordneten Ordner `EspressoHunt` selbst, sonst liegt
   > später alles eine Ebene zu tief.
3. Unten **Commit changes** klicken.

### 3. GitHub Pages einschalten
1. Im Repository oben auf **Settings**.
2. Links im Menü auf **Pages**.
3. Unter **Build and deployment → Source**: **Deploy from a branch** wählen.
4. **Branch:** `main`, Ordner: `/ (root)` → **Save**.
5. Kurz warten (ca. 1 Minute), Seite neu laden. Oben erscheint:
   **"Your site is live at `https://<dein-name>.github.io/EspressoHunt/`"**

Diese URL ist die App. 🎉

### 4. (Bei jeder späteren Änderung)
Datei im Repository öffnen → Stift-Symbol → ändern → **Commit changes**.
Nach ~1 Minute ist die neue Version online.
Wenn sich App-Dateien geändert haben, in `sw.js` die Zeile
`const CACHE = 'espressohunt-vN';` um eins hochzählen – dann lädt das iPhone
die neue Version sicher nach.

---

## 📱 Auf dem iPhone als Vollbild-App installieren

1. Die Pages-URL in **Safari** öffnen (nicht Chrome – nur Safari kann auf iOS
   Web-Apps zum Home-Bildschirm hinzufügen).
2. Unten auf das **Teilen-Symbol** (Quadrat mit Pfeil nach oben) tippen.
3. **„Zum Home-Bildschirm"** wählen → **Hinzufügen**.
4. Die App liegt jetzt mit eigenem Icon auf dem Home-Bildschirm und startet
   **ohne Adressleiste und ohne Safari-Leisten** im Vollbild.

Beim ersten Öffnen im Browser blendet die App unten einen kurzen Hinweis dazu
ein; nach dem Hinzufügen verschwindet er.

Die Bewertungen liegen in der geteilten Cloud-Datenbank und sind auf jedem
Gerät verfügbar – nach App schließen, Neustart und auch auf einem neuen
Handy. Nur der Name, die Sprache und die Ansichtseinstellungen werden je
Gerät gemerkt.

### Benachrichtigungen einschalten

Zahnrad oben rechts → **Benachrichtigungen** → Schalter antippen und die
Nachfrage von iOS bestätigen. Auf dem iPhone geht das **erst, wenn die App
zum Home-Bildschirm hinzugefügt wurde** – im normalen Safari-Tab bietet iOS
keine Web-Benachrichtigungen an.

---

## 🔧 Lokal testen (optional, am Rechner)

Ein Doppelklick auf `index.html` reicht **nicht** – der Service Worker braucht
einen echten Server. Am einfachsten mit Python:

```bash
cd EspressoHunt
python -m http.server 8000
```

Dann <http://localhost:8000> im Browser öffnen.

## Icons neu erzeugen (optional)

```bash
pip install pillow
python tools/make_icons.py
```
