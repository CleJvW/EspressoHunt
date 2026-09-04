# ☕ EspressoHunt

Eine kleine, schnelle Web-App, um Café-Besuche zu bewerten – Sterne, fünf
Geschmacks-Regler, Preis und Notizen. Läuft komplett im Browser, speichert alle
Bewertungen **lokal auf dem Gerät** (kein Server, kein Login, keine Cloud) und
kann auf dem iPhone als **Vollbild-App** zum Home-Bildschirm hinzugefügt werden.

Technik: reines HTML, CSS und JavaScript. Keine Frameworks, keine Build-Tools,
keine externen Libraries. Zusätzlich ein Service Worker, damit die App auch
offline funktioniert.

---

## 📁 Diese Dateien gehören ins Repository

```
index.html            → die App-Seite
styles.css            → Design
app.js                → Logik (Speichern, Navigation, Formulare …)
sw.js                 → Service Worker (Offline-Betrieb)
manifest.webmanifest  → App-Name & Icons für "zum Home-Bildschirm"
.nojekyll             → sagt GitHub Pages: Dateien 1:1 ausliefern
icons/                → App-Icons (192, 512, Apple-Touch-Icon, Favicon)
tools/make_icons.py   → erzeugt die Icons neu (optional, nur für Entwicklung)
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
   `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`,
   `.nojekyll` **und den ganzen Ordner `icons/`**.
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
Wenn sich `app.js`, `styles.css` oder `index.html` geändert haben, in `sw.js`
die Zeile `const CACHE = 'espressohunt-v1';` auf `-v2`, `-v3` … hochzählen –
dann lädt das iPhone die neue Version sicher nach.

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

Die Bewertungen bleiben erhalten – auch nach App schließen, Neustart der App
und Neustart des iPhones. (Sie liegen im Speicher der Home-Bildschirm-App.
Deshalb: erst zum Home-Bildschirm hinzufügen, dann Bewertungen eingeben.)

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
