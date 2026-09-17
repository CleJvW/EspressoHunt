/* ================================================================
   EspressoHunt — Mehrsprachigkeit (Deutsch, Italienisch, Englisch)
   Nutzung:  t('home_title')  ·  t('friend_count_other', { n: 5 })
   ================================================================ */

const LANG_KEY = 'espressohunt.lang';

export const LANGUAGES = [
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪', locale: 'de-DE' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', locale: 'it-IT' },
  { code: 'en', label: 'English',  flag: '🇬🇧', locale: 'en-GB' },
];

const STRINGS = {
  de: {
    /* Start */
    home_title: 'Unsere Bewertungen',
    home_sub_one: '1 Bewertung · geteilt mit deinen Freunden',
    home_sub_other: '{n} Bewertungen · geteilt mit deinen Freunden',
    home_sub_empty: 'Geteilt mit deinen Freunden',
    author_link: 'als „{name}“',
    add_button: '＋ Kaffee bewerten',
    empty_title: 'Noch keinen Kaffee bewertet.',
    empty_text: 'Bewerte deinen ersten Kaffee und entdecke eure Favoriten.',
    loading_title: 'Einen Moment …',
    loading_text: 'Bewertungen werden geladen.',
    offline_title: 'Keine Verbindung',
    offline_text: 'Bewertungen können gerade nicht geladen werden. Prüfe deine Internetverbindung.',

    /* Ansicht & Sortierung */
    view_list: 'Liste',
    view_map: 'Karte',
    sort_by: 'Sortieren',
    sort_date: 'Datum',
    sort_price: 'Preis',
    sort_distance: 'Entfernung',
    sort_rating: 'Bewertung',

    /* Formular */
    form_new: 'Neue Bewertung',
    form_edit: 'Bewertung bearbeiten',
    cancel: 'Abbrechen',
    f_cafe: 'Café',
    f_cafe_ph: 'Wie heißt das Café?',
    e_cafe: 'Bitte gib den Namen des Cafés ein.',
    f_price: 'Preis',
    f_price_hint: 'Preis deines Kaffees – optional.',
    e_price: 'Bitte gib einen gültigen Preis ein (z. B. 4,50).',
    f_stars: 'Sterne',
    e_stars: 'Bitte vergib mindestens einen Stern.',
    f_props: 'Eigenschaften',
    f_notes: 'Bemerkungen',
    f_notes_ph: 'Was hat dir besonders gefallen – oder nicht?',
    optional: 'Optional.',
    save: 'Bewertung speichern',
    saving: 'Speichere …',
    save_error: 'Speichern hat nicht geklappt. Prüfe deine Internetverbindung und versuch es noch einmal.',

    /* Standort */
    f_location: 'Standort',
    loc_current: 'Aktuell',
    loc_map: 'Auf Karte',
    loc_map_hint: 'Karte verschieben, bis die Nadel am richtigen Ort steht.',
    map_locate: 'Zu meinem Standort',
    loc_picked: 'Ort auf der Karte gewählt',
    loc_address: 'Adresse',
    loc_none: 'Ohne Standort',
    loc_locating: 'Standort wird ermittelt …',
    loc_ok: 'Standort erfasst',
    loc_denied: 'Kein Zugriff auf den Standort. Gib stattdessen eine Adresse ein.',
    loc_failed: 'Standort konnte nicht ermittelt werden.',
    addr_ph: 'Straße und Ort, z. B. Hauptstraße 1, Dresden',
    addr_search: 'Suchen',
    addr_searching: 'Suche …',
    addr_notfound: 'Adresse nicht gefunden. Versuch es etwas genauer.',
    addr_hint: 'Du kannst den Standort später jederzeit ändern.',

    /* Eigenschaften */
    m_cremig: 'Cremig',
    m_fruchtig: 'Fruchtig',
    m_schokoladig: 'Schokoladig',
    m_geschmack: 'Geschmack',
    m_ambiente: 'Ambiente',

    /* Detail */
    d_back: 'Bewertungen',
    edit: 'Bearbeiten',
    delete_rating: 'Bewertung löschen',
    chip_price: 'Preis',
    by_you: 'von dir',
    by_name: 'von {name}',
    someone: 'jemandem',
    props_title: 'Eigenschaften',
    notes_title: 'Bemerkungen',
    only_owner: 'Nur {name} kann diese Bewertung bearbeiten oder löschen.',
    open_in_maps: 'In Karten öffnen',
    no_location: 'Kein Standort hinterlegt',

    /* Löschen */
    del_title: 'Bewertung löschen?',
    del_text: 'Möchtest du diese Bewertung wirklich löschen? Das kann nicht rückgängig gemacht werden.',
    del_confirm: 'Löschen',
    deleting: 'Lösche …',
    del_error: 'Löschen hat nicht geklappt. Prüfe deine Internetverbindung.',

    /* Name */
    name_title: 'Wie heißt du?',
    name_text: 'Dein Name erscheint bei deinen Bewertungen, damit ihr seht, wer was bewertet hat.',
    name_ph: 'Dein Name',
    name_save: 'Los geht’s',

    /* Freunde */
    friends: 'Freunde',
    friends_title: 'Wer bewertet mit',
    friend_count_one: '1 Bewertung',
    friend_count_other: '{n} Bewertungen',
    friends_empty: 'Noch hat niemand etwas bewertet.',
    avg_stars: 'Ø {v}',
    avg_price: 'Ø {v}',
    you: 'Du',
    fav_cafe: 'Liebstes Café',

    /* Einstellungen */
    settings: 'Einstellungen',
    language: 'Sprache',
    change_name: 'Name ändern',
    notifications: 'Benachrichtigungen',
    notif_enable: 'Benachrichtigen, wenn Freunde bewerten',
    notif_on: 'Benachrichtigungen sind aktiv',
    notif_off: 'Benachrichtigungen sind aus',
    notif_blocked: 'Benachrichtigungen sind im Browser blockiert. Bitte in den Einstellungen deines Browsers erlauben.',
    notif_unsupported: 'Dieses Gerät unterstützt keine Benachrichtigungen.',
    notif_ios_hint: 'Auf dem iPhone musst du die App zuerst zum Home-Bildschirm hinzufügen.',
    notif_working: 'Einen Moment …',
    notif_error: 'Das hat nicht geklappt. Versuch es später noch einmal.',

    /* Installation */
    install_title: 'Als App installieren',
    install_ios: 'Teilen-Symbol tippen und „Zum Home-Bildschirm“ wählen – dann läuft die App im Vollbild.',
    install_other: 'Über das Browser-Menü „Zum Startbildschirm hinzufügen“ wählen – dann läuft die App im Vollbild.',
    install_ok: 'Verstanden',

    /* Karte */
    map_loading: 'Karte wird geladen …',
    map_failed: 'Karte konnte nicht geladen werden. Prüfe deine Internetverbindung.',
    map_empty: 'Noch keine Bewertung mit Standort.',
    map_my_location: 'Mein Standort',
    map_fullscreen: 'Große Karte',
    open_rating: 'Ansehen',
    map_close: 'Schließen',
    map_tap_hint: 'Für die große Karte tippen',
    dist_away: '{d} entfernt',
  },

  it: {
    home_title: 'Le nostre valutazioni',
    home_sub_one: '1 valutazione · condivisa con i tuoi amici',
    home_sub_other: '{n} valutazioni · condivise con i tuoi amici',
    home_sub_empty: 'Condivise con i tuoi amici',
    author_link: 'come «{name}»',
    add_button: '＋ Valuta un caffè',
    empty_title: 'Ancora nessun caffè valutato.',
    empty_text: 'Valuta il tuo primo caffè e scoprite i vostri preferiti.',
    loading_title: 'Un momento …',
    loading_text: 'Caricamento delle valutazioni.',
    offline_title: 'Nessuna connessione',
    offline_text: 'Al momento non è possibile caricare le valutazioni. Controlla la connessione a Internet.',

    view_list: 'Elenco',
    view_map: 'Mappa',
    sort_by: 'Ordina',
    sort_date: 'Data',
    sort_price: 'Prezzo',
    sort_distance: 'Distanza',
    sort_rating: 'Valutazione',

    form_new: 'Nuova valutazione',
    form_edit: 'Modifica valutazione',
    cancel: 'Annulla',
    f_cafe: 'Caffetteria',
    f_cafe_ph: 'Come si chiama la caffetteria?',
    e_cafe: 'Inserisci il nome della caffetteria.',
    f_price: 'Prezzo',
    f_price_hint: 'Il prezzo del tuo caffè – facoltativo.',
    e_price: 'Inserisci un prezzo valido (es. 4,50).',
    f_stars: 'Stelle',
    e_stars: 'Assegna almeno una stella.',
    f_props: 'Caratteristiche',
    f_notes: 'Note',
    f_notes_ph: 'Cosa ti è piaciuto di più – o di meno?',
    optional: 'Facoltativo.',
    save: 'Salva valutazione',
    saving: 'Salvataggio …',
    save_error: 'Salvataggio non riuscito. Controlla la connessione e riprova.',

    f_location: 'Posizione',
    loc_current: 'Attuale',
    loc_map: 'Sulla mappa',
    loc_map_hint: 'Sposta la mappa finché il segnaposto è nel punto giusto.',
    map_locate: 'Vai alla mia posizione',
    loc_picked: 'Punto scelto sulla mappa',
    loc_address: 'Indirizzo',
    loc_none: 'Senza posizione',
    loc_locating: 'Rilevamento della posizione …',
    loc_ok: 'Posizione acquisita',
    loc_denied: 'Nessun accesso alla posizione. Inserisci invece un indirizzo.',
    loc_failed: 'Impossibile rilevare la posizione.',
    addr_ph: 'Via e città, es. Via Roma 1, Milano',
    addr_search: 'Cerca',
    addr_searching: 'Ricerca …',
    addr_notfound: 'Indirizzo non trovato. Prova a essere più preciso.',
    addr_hint: 'Puoi modificare la posizione in qualsiasi momento.',

    m_cremig: 'Cremoso',
    m_fruchtig: 'Fruttato',
    m_schokoladig: 'Cioccolatoso',
    m_geschmack: 'Gusto',
    m_ambiente: 'Ambiente',

    d_back: 'Valutazioni',
    edit: 'Modifica',
    delete_rating: 'Elimina valutazione',
    chip_price: 'Prezzo',
    by_you: 'di te',
    by_name: 'di {name}',
    someone: 'qualcuno',
    props_title: 'Caratteristiche',
    notes_title: 'Note',
    only_owner: 'Solo {name} può modificare o eliminare questa valutazione.',
    open_in_maps: 'Apri nelle mappe',
    no_location: 'Nessuna posizione salvata',

    del_title: 'Eliminare la valutazione?',
    del_text: 'Vuoi davvero eliminare questa valutazione? L’operazione non può essere annullata.',
    del_confirm: 'Elimina',
    deleting: 'Eliminazione …',
    del_error: 'Eliminazione non riuscita. Controlla la connessione a Internet.',

    name_title: 'Come ti chiami?',
    name_text: 'Il tuo nome appare nelle tue valutazioni, così vedete chi ha valutato cosa.',
    name_ph: 'Il tuo nome',
    name_save: 'Iniziamo',

    friends: 'Amici',
    friends_title: 'Chi valuta con voi',
    friend_count_one: '1 valutazione',
    friend_count_other: '{n} valutazioni',
    friends_empty: 'Nessuno ha ancora valutato.',
    avg_stars: 'Ø {v}',
    avg_price: 'Ø {v}',
    you: 'Tu',
    fav_cafe: 'Caffetteria preferita',

    settings: 'Impostazioni',
    language: 'Lingua',
    change_name: 'Cambia nome',
    notifications: 'Notifiche',
    notif_enable: 'Avvisami quando gli amici valutano',
    notif_on: 'Le notifiche sono attive',
    notif_off: 'Le notifiche sono disattivate',
    notif_blocked: 'Le notifiche sono bloccate nel browser. Consentile nelle impostazioni del browser.',
    notif_unsupported: 'Questo dispositivo non supporta le notifiche.',
    notif_ios_hint: 'Su iPhone devi prima aggiungere l’app alla schermata Home.',
    notif_working: 'Un momento …',
    notif_error: 'Non ha funzionato. Riprova più tardi.',

    install_title: 'Installa come app',
    install_ios: 'Tocca l’icona Condividi e scegli «Aggiungi a Home» – così l’app si apre a schermo intero.',
    install_other: 'Scegli «Aggiungi a schermata Home» dal menu del browser – così l’app si apre a schermo intero.',
    install_ok: 'Ho capito',

    map_loading: 'Caricamento della mappa …',
    map_failed: 'Impossibile caricare la mappa. Controlla la connessione a Internet.',
    map_empty: 'Ancora nessuna valutazione con posizione.',
    map_my_location: 'La mia posizione',
    map_fullscreen: 'Mappa grande',
    open_rating: 'Apri',
    map_close: 'Chiudi',
    map_tap_hint: 'Tocca per la mappa grande',
    dist_away: 'a {d}',
  },

  en: {
    home_title: 'Our ratings',
    home_sub_one: '1 rating · shared with your friends',
    home_sub_other: '{n} ratings · shared with your friends',
    home_sub_empty: 'Shared with your friends',
    author_link: 'as “{name}”',
    add_button: '＋ Rate a coffee',
    empty_title: 'No coffee rated yet.',
    empty_text: 'Rate your first coffee and discover your favourites.',
    loading_title: 'One moment …',
    loading_text: 'Loading ratings.',
    offline_title: 'No connection',
    offline_text: 'Ratings can’t be loaded right now. Check your internet connection.',

    view_list: 'List',
    view_map: 'Map',
    sort_by: 'Sort',
    sort_date: 'Date',
    sort_price: 'Price',
    sort_distance: 'Distance',
    sort_rating: 'Rating',

    form_new: 'New rating',
    form_edit: 'Edit rating',
    cancel: 'Cancel',
    f_cafe: 'Café',
    f_cafe_ph: 'What’s the café called?',
    e_cafe: 'Please enter the name of the café.',
    f_price: 'Price',
    f_price_hint: 'The price of your coffee – optional.',
    e_price: 'Please enter a valid price (e.g. 4.50).',
    f_stars: 'Stars',
    e_stars: 'Please give at least one star.',
    f_props: 'Characteristics',
    f_notes: 'Notes',
    f_notes_ph: 'What did you like – or not like?',
    optional: 'Optional.',
    save: 'Save rating',
    saving: 'Saving …',
    save_error: 'Saving failed. Check your internet connection and try again.',

    f_location: 'Location',
    loc_current: 'Current',
    loc_map: 'On map',
    loc_map_hint: 'Move the map until the pin sits on the right spot.',
    map_locate: 'Go to my location',
    loc_picked: 'Spot picked on the map',
    loc_address: 'Address',
    loc_none: 'No location',
    loc_locating: 'Getting location …',
    loc_ok: 'Location captured',
    loc_denied: 'No access to your location. Enter an address instead.',
    loc_failed: 'Could not determine your location.',
    addr_ph: 'Street and city, e.g. Main Street 1, London',
    addr_search: 'Search',
    addr_searching: 'Searching …',
    addr_notfound: 'Address not found. Try being more specific.',
    addr_hint: 'You can change the location at any time later.',

    m_cremig: 'Creamy',
    m_fruchtig: 'Fruity',
    m_schokoladig: 'Chocolatey',
    m_geschmack: 'Taste',
    m_ambiente: 'Ambience',

    d_back: 'Ratings',
    edit: 'Edit',
    delete_rating: 'Delete rating',
    chip_price: 'Price',
    by_you: 'by you',
    by_name: 'by {name}',
    someone: 'someone',
    props_title: 'Characteristics',
    notes_title: 'Notes',
    only_owner: 'Only {name} can edit or delete this rating.',
    open_in_maps: 'Open in Maps',
    no_location: 'No location saved',

    del_title: 'Delete rating?',
    del_text: 'Do you really want to delete this rating? This cannot be undone.',
    del_confirm: 'Delete',
    deleting: 'Deleting …',
    del_error: 'Deleting failed. Check your internet connection.',

    name_title: 'What’s your name?',
    name_text: 'Your name appears on your ratings so you can see who rated what.',
    name_ph: 'Your name',
    name_save: 'Let’s go',

    friends: 'Friends',
    friends_title: 'Who’s rating along',
    friend_count_one: '1 rating',
    friend_count_other: '{n} ratings',
    friends_empty: 'Nobody has rated anything yet.',
    avg_stars: 'avg {v}',
    avg_price: 'avg {v}',
    you: 'You',
    fav_cafe: 'Favourite café',

    settings: 'Settings',
    language: 'Language',
    change_name: 'Change name',
    notifications: 'Notifications',
    notif_enable: 'Notify me when friends rate',
    notif_on: 'Notifications are on',
    notif_off: 'Notifications are off',
    notif_blocked: 'Notifications are blocked in your browser. Please allow them in your browser settings.',
    notif_unsupported: 'This device doesn’t support notifications.',
    notif_ios_hint: 'On iPhone you first need to add the app to your home screen.',
    notif_working: 'One moment …',
    notif_error: 'That didn’t work. Please try again later.',

    install_title: 'Install as an app',
    install_ios: 'Tap the share icon and choose “Add to Home Screen” – then the app runs full screen.',
    install_other: 'Choose “Add to home screen” from the browser menu – then the app runs full screen.',
    install_ok: 'Got it',

    map_loading: 'Loading map …',
    map_failed: 'The map could not be loaded. Check your internet connection.',
    map_empty: 'No rating with a location yet.',
    map_my_location: 'My location',
    map_fullscreen: 'Large map',
    open_rating: 'Open',
    map_close: 'Close',
    map_tap_hint: 'Tap for the large map',
    dist_away: '{d} away',
  },
};

/* ---------------- Sprache wählen / merken ---------------- */

function detectLanguage() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored && STRINGS[stored]) return stored;
  } catch (e) { /* privater Modus */ }

  const candidates = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || 'de'];
  for (const tag of candidates) {
    const code = String(tag).slice(0, 2).toLowerCase();
    if (STRINGS[code]) return code;
  }
  return 'de';
}

let current = detectLanguage();

export function getLang() {
  return current;
}

export function setLang(code) {
  if (!STRINGS[code]) return;
  current = code;
  try { localStorage.setItem(LANG_KEY, code); } catch (e) {}
  document.documentElement.lang = code;
}

export function getLocale() {
  const entry = LANGUAGES.find((l) => l.code === current);
  return entry ? entry.locale : 'de-DE';
}

/* ---------------- Übersetzen ---------------- */

export function t(key, params) {
  const table = STRINGS[current] || STRINGS.de;
  let text = table[key];
  if (text == null) text = STRINGS.de[key];
  if (text == null) return key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), String(v));
    }
  }
  return text;
}

/* Singular/Plural: t_n('friend_count', 3) → friend_count_other */
export function tn(baseKey, n, params) {
  const suffix = n === 1 ? '_one' : '_other';
  return t(baseKey + suffix, { n, ...(params || {}) });
}

document.documentElement.lang = current;
