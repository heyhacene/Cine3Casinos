export interface CineCasinoNativeBridge {
  isNativePortalSupported: () => boolean;
  openPortal: (url: string, title?: string) => void;
  hidePortal: () => void;
  openExternal?: (url: string) => void;
}

declare global {
  interface Window {
    CineCasinoNative?: CineCasinoNativeBridge;
  }
}

export const APP_CURRENT_VERSION = 'v1.0.1';

export const GITHUB_REPO_OWNER = 'heyhacene';
export const GITHUB_REPO_NAME = 'Cine3Casinos';
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`;
export const GITHUB_APK_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest/download/Cine3Casinos.apk`;
export const PWA_PUBLIC_URL = `https://${GITHUB_REPO_OWNER}.github.io/${GITHUB_REPO_NAME}/`;

export const CINEOFFICE_BASE_URL = 'https://gardanne3casino.cineoffice.fr/vad';
export const CINEOFFICE_TOKEN = '13a26660-66df-4633-bc68-602be92b76fa';
export const CINEMA_WEBSITE_URL = 'https://www.cinema3casino.fr';

export const CINEMA_INFO = {
  name: 'Cinéma Les 3 Casinos',
  shortName: '3 Casinos',
  address: '11 Cours Forbin',
  postalCity: '13120 Gardanne',
  openingNote: 'Le cinéma ouvre ses portes 30 minutes avant chaque séance.',
  paymentNote: 'Cinéchèques et CCU acceptés. Paiement par CB accepté à partir de 5 €.',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cin%C3%A9ma+3+Casino+11+Cours+Forbin+13120+Gardanne',
  accountUrl: 'https://www.cinema3casino.fr/espace-client.html#/',
  websiteUrl: 'https://www.cinema3casino.fr/#/',
};

export interface TariffItem {
  label: string;
  price: string;
  note?: string;
  category: 'seance' | 'abonnement';
}

export const CINEMA_TARIFFS: TariffItem[] = [
  { label: 'Tarif plein', price: '8,50 €', category: 'seance' },
  {
    label: 'Tarif réduit',
    price: '7,00 €',
    note: '+65 ans, chômeur, famille nombreuse, étudiant, travailleur handicapé',
    category: 'seance',
  },
  { label: 'Matinée (pour tous)', price: '5,50 €', category: 'seance' },
  { label: 'Enfant (- 14 ans)', price: '4,50 €', category: 'seance' },
  { label: 'Court-métrage adulte', price: '5,00 €', note: 'Films de moins de 1h', category: 'seance' },
  { label: 'Court-métrage enfant', price: '4,00 €', note: 'Films de moins de 1h', category: 'seance' },
  {
    label: "Carte d'abonnement 6 places",
    price: '36,00 €',
    note: '+4 € si mise en service',
    category: 'abonnement',
  },
  {
    label: "Carte d'abonnement 10 places",
    price: '60,00 €',
    note: '+4 € si mise en service',
    category: 'abonnement',
  },
];

export interface CinemaScreen {
  id: number;
  label: string;
  number: number;
  capacity: number;
  pmrCapacity: number;
}

export type ShowVersion = 'VF' | 'VOST' | 'VO' | 'MUET';

export interface CinemaShowtime {
  id: number;
  mediaId: number;
  screenId: number;
  screenLabel: string;
  showtimeIso: string;
  showendIso: string;
  dateKey: string; // YYYY-MM-DD in Europe/Paris
  timeLabel: string; // HH:mm
  endTimeLabel: string; // HH:mm
  startMs: number;
  endMs: number;
  hasStarted: boolean;
  remainingPlaces: number;
  pmrRemainingPlaces: number;
  isSoldOut: boolean;
  version: ShowVersion;
  is3D: boolean;
  isSme: boolean; // Sous-titré sourds et malentendants
  isAudioDescription: boolean;
  isPremiere: boolean;
  isEvent: boolean;
  labels: string[];
}

export interface CinemaMovie {
  id: number;
  title: string;
  director: string;
  cast: string;
  durationSeconds: number;
  durationLabel: string;
  storyline: string;
  posterUrl: string;
  trailerUrl: string;
  releaseDateIso: string;
  releaseDateLabel: string;
  visaNumber: string;
  allocineId: string;
  year: string;
  genres: string[];
  labels: string[];
  isArtEtEssai: boolean;
  ratingLabel: string;
  ratingShort: string;
  shows: CinemaShowtime[];
}

export interface DayOption {
  dateKey: string;
  shortLabel: string;
  fullLabel: string;
  showCount: number;
}

export interface CinemaDataSnapshot {
  movies: CinemaMovie[];
  shows: CinemaShowtime[];
  screens: CinemaScreen[];
  fetchedAt: number;
}

const CACHE_STORAGE_KEY = 'cine3casinos_schedule_cache_v1';

export function parseCinemaDate(raw: string): Date {
  if (!raw) return new Date(NaN);
  // Normalize offsets like +0100 or +0200 into +01:00 for strict ISO parsers
  const normalized = raw.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  return new Date(normalized);
}

export function getParisDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function formatShowTime(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(':', 'h');
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const totalMins = Math.round(seconds / 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m} min`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function formatReleaseDate(iso: string): string {
  const d = parseCinemaDate(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatDayLabels(dateKey: string): { shortLabel: string; fullLabel: string } {
  const now = new Date();
  const todayKey = getParisDateKey(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowKey = getParisDateKey(tomorrow);

  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  const refDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  const weekdayShort = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
  })
    .format(refDate)
    .replace('.', '');

  const dayMonth = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: 'numeric',
    month: 'short',
  }).format(refDate);

  const fullFormatted = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(refDate);

  const capitalizedFull = fullFormatted.charAt(0).toUpperCase() + fullFormatted.slice(1);

  if (dateKey === todayKey) {
    return { shortLabel: "Aujourd'hui", fullLabel: `Aujourd'hui • ${dayMonth}` };
  }
  if (dateKey === tomorrowKey) {
    return { shortLabel: 'Demain', fullLabel: `Demain • ${dayMonth}` };
  }
  const capShort = weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1);
  return {
    shortLabel: `${capShort} ${dayMonth}`,
    fullLabel: capitalizedFull,
  };
}

function decodeShowOptions(rawShow: any): {
  version: ShowVersion;
  is3D: boolean;
  isSme: boolean;
  isAudioDescription: boolean;
} {
  const optionIds = new Set<number>();
  if (typeof rawShow?.languagemediaoptionsid === 'number') {
    optionIds.add(rawShow.languagemediaoptionsid);
  }
  if (typeof rawShow?.formatmediaoptionsid === 'number') {
    optionIds.add(rawShow.formatmediaoptionsid);
  }
  if (Array.isArray(rawShow?.showsMediaoptionsCollection)) {
    for (const item of rawShow.showsMediaoptionsCollection) {
      const id = item?.mediaoptionsid?.id;
      if (typeof id === 'number') {
        optionIds.add(id);
      }
    }
  }

  let version: ShowVersion = 'VF';
  if (optionIds.has(19)) {
    version = 'MUET';
  } else if (optionIds.has(17)) {
    version = optionIds.has(9) || optionIds.has(10) ? 'VOST' : 'VO';
  } else if (optionIds.has(16) || optionIds.has(18)) {
    version = 'VF';
  }

  return {
    version,
    is3D: Boolean(rawShow?.threed) || optionIds.has(20),
    isSme: optionIds.has(10),
    isAudioDescription: optionIds.has(8),
  };
}

export function buildDaysFromShows(shows: CinemaShowtime[]): DayOption[] {
  const counts = new Map<string, number>();
  for (const s of shows) {
    counts.set(s.dateKey, (counts.get(s.dateKey) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, showCount]) => {
      const { shortLabel, fullLabel } = formatDayLabels(dateKey);
      return { dateKey, shortLabel, fullLabel, showCount };
    });
}

export async function fetchCinemaProgramming(): Promise<CinemaDataSnapshot> {
  const qs = `api_token=${encodeURIComponent(CINEOFFICE_TOKEN)}`;
  const [mediaRes, showsRes, screensRes] = await Promise.all([
    fetch(`${CINEOFFICE_BASE_URL}/media?${qs}`, { cache: 'no-store' }),
    fetch(`${CINEOFFICE_BASE_URL}/shows?${qs}`, { cache: 'no-store' }),
    fetch(`${CINEOFFICE_BASE_URL}/screens?${qs}`, { cache: 'no-store' }),
  ]);

  if (!mediaRes.ok || !showsRes.ok || !screensRes.ok) {
    throw new Error(
      `Erreur serveur cinéma (${mediaRes.status}/${showsRes.status}/${screensRes.status})`
    );
  }

  const [rawMedia, rawShows, rawScreens] = await Promise.all([
    mediaRes.json(),
    showsRes.json(),
    screensRes.json(),
  ]);

  const screens: CinemaScreen[] = (Array.isArray(rawScreens) ? rawScreens : [])
    .filter((s: any) => !s?.deleted)
    .map((s: any) => ({
      id: Number(s.id),
      label: String(s.screenlabel || `Salle ${s.screennumber || s.id}`).trim(),
      number: Number(s.screennumber || s.id),
      capacity: Number(s.persongauge || 0),
      pmrCapacity: Number(s.disabledpersongauge || 0),
    }))
    .sort((a, b) => a.number - b.number);

  const screenMap = new Map<number, CinemaScreen>();
  for (const scr of screens) {
    screenMap.set(scr.id, scr);
  }

  const nowMs = Date.now();
  const parsedShows: CinemaShowtime[] = [];

  for (const rs of Array.isArray(rawShows) ? rawShows : []) {
    if (!rs || rs.deleted || rs.canceled || rs.draft) continue;
    const mediaId = Number(rs?.mediaid?.id);
    if (!mediaId) continue;

    const startDate = parseCinemaDate(rs.showtime);
    const endDate = parseCinemaDate(rs.showend || rs.showtime);
    if (Number.isNaN(startDate.getTime())) continue;

    const startMs = startDate.getTime();
    const endMs = Number.isNaN(endDate.getTime()) ? startMs + 90 * 60 * 1000 : endDate.getTime();

    // Hide shows that already finished
    if (endMs <= nowMs) continue;

    const screenId = Number(rs?.screenid?.id || 0);
    const screen = screenMap.get(screenId);
    const opts = decodeShowOptions(rs);

    const labels: string[] = Array.isArray(rs.showsMedialabelCollection)
      ? rs.showsMedialabelCollection
          .map((item: any) => String(item?.medialabelid?.label || '').trim())
          .filter(Boolean)
      : [];

    const remainingPlaces = Number(rs.remainingplace ?? 0);

    parsedShows.push({
      id: Number(rs.id),
      mediaId,
      screenId,
      screenLabel: screen?.label || (screenId ? `Salle ${screenId}` : 'Salle'),
      showtimeIso: rs.showtime,
      showendIso: rs.showend || rs.showtime,
      dateKey: getParisDateKey(startDate),
      timeLabel: formatShowTime(startDate),
      endTimeLabel: formatShowTime(new Date(endMs)),
      startMs,
      endMs,
      hasStarted: startMs <= nowMs,
      remainingPlaces,
      pmrRemainingPlaces: Number(rs.disabledpersonremainingplace ?? 0),
      isSoldOut: remainingPlaces <= 0,
      version: opts.version,
      is3D: opts.is3D,
      isSme: opts.isSme,
      isAudioDescription: opts.isAudioDescription,
      isPremiere: Boolean(rs.premiere),
      isEvent: Boolean(rs.event),
      labels,
    });
  }

  parsedShows.sort((a, b) => a.startMs - b.startMs);

  const showsByMedia = new Map<number, CinemaShowtime[]>();
  for (const s of parsedShows) {
    const arr = showsByMedia.get(s.mediaId) || [];
    arr.push(s);
    showsByMedia.set(s.mediaId, arr);
  }

  const movies: CinemaMovie[] = [];
  for (const rm of Array.isArray(rawMedia) ? rawMedia : []) {
    if (!rm || rm.deleted || rm.active === false || rm.excludefrominternet) continue;
    const id = Number(rm.id);
    const title = String(rm.displaytitle || rm.title || '').trim();
    if (!id || !title) continue;

    const genres: string[] = Array.isArray(rm.mediaMediagenreCollection)
      ? rm.mediaMediagenreCollection
          .map((g: any) => String(g?.idgenre?.label || '').trim())
          .filter(Boolean)
      : [];

    const labels: string[] = Array.isArray(rm.mediaMedialabelCollection)
      ? rm.mediaMedialabelCollection
          .map((l: any) => String(l?.medialabelid?.label || '').trim())
          .filter(Boolean)
      : [];

    const isArtEtEssai =
      Boolean(rm.rankArt) ||
      labels.some((lbl) => lbl.toLowerCase().includes('art'));

    const durationSeconds = Number(rm.duration || 0);
    const movieShows = showsByMedia.get(id) || [];

    movies.push({
      id,
      title,
      director: String(rm.director || '').trim(),
      cast: String(rm.filmcast || '').trim(),
      durationSeconds,
      durationLabel: formatDuration(durationSeconds),
      storyline: String(rm.storyline || '').trim(),
      posterUrl: String(rm.posterpath || rm.smallposterpath || '').trim(),
      trailerUrl: String(rm.standvideourl || '').trim(),
      releaseDateIso: String(rm.releasedate || ''),
      releaseDateLabel: formatReleaseDate(String(rm.releasedate || '')),
      visaNumber: String(rm.visanumber || '').trim(),
      allocineId: String(rm.allocineid || '').trim(),
      year: String(rm.filmyear || '').trim(),
      genres,
      labels,
      isArtEtEssai,
      ratingLabel: String(rm?.ratingid?.label || 'Tout public').trim(),
      ratingShort: String(rm?.ratingid?.shortlabel || 'TOU').trim(),
      shows: movieShows,
    });
  }

  // Sort: movies with shows first (sorted by earliest show), then upcoming movies by release date
  movies.sort((a, b) => {
    const aHas = a.shows.length > 0;
    const bHas = b.shows.length > 0;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    if (aHas && bHas) {
      return a.shows[0].startMs - b.shows[0].startMs;
    }
    return b.id - a.id;
  });

  const snapshot: CinemaDataSnapshot = {
    movies,
    shows: parsedShows,
    screens,
    fetchedAt: Date.now(),
  };

  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {}

  return snapshot;
}

export function loadCachedProgramming(): CinemaDataSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CinemaDataSnapshot;
    if (!parsed || !Array.isArray(parsed.movies) || !Array.isArray(parsed.shows)) {
      return null;
    }
    const nowMs = Date.now();
    const validShows = parsed.shows.filter((s) => s.endMs > nowMs).map((s) => ({
      ...s,
      hasStarted: s.startMs <= nowMs,
    }));
    const validMap = new Map<number, CinemaShowtime[]>();
    for (const s of validShows) {
      const arr = validMap.get(s.mediaId) || [];
      arr.push(s);
      validMap.set(s.mediaId, arr);
    }
    return {
      ...parsed,
      shows: validShows,
      movies: parsed.movies.map((m) => ({
        ...m,
        shows: validMap.get(m.id) || [],
      })),
    };
  } catch {
    return null;
  }
}

export function getShowBookingUrl(movie: CinemaMovie, show: CinemaShowtime): string {
  const params = new URLSearchParams();
  params.set('showId', String(show.id));
  params.set('title', movie.title);
  if (movie.visaNumber) {
    params.set('visanumber', movie.visaNumber);
  }
  return `${CINEMA_WEBSITE_URL}/film.html#/m-media/${movie.id}?${params.toString()}`;
}

export function getMovieBookingUrl(movie: CinemaMovie): string {
  const params = new URLSearchParams();
  params.set('title', movie.title);
  if (movie.visaNumber) {
    params.set('visanumber', movie.visaNumber);
  }
  return `${CINEMA_WEBSITE_URL}/film.html#/m-media/${movie.id}?${params.toString()}`;
}

export function isNativePortalSupported(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      window.CineCasinoNative &&
      window.CineCasinoNative.isNativePortalSupported()
  );
}

export function openInNativeOrBrowser(url: string, title = 'Billetterie 3 Casinos'): void {
  if (typeof window === 'undefined') return;
  if (window.CineCasinoNative && window.CineCasinoNative.isNativePortalSupported()) {
    window.CineCasinoNative.openPortal(url, title);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function openExternalUrl(url: string): void {
  if (typeof window === 'undefined') return;
  if (
    window.CineCasinoNative &&
    typeof window.CineCasinoNative.openExternal === 'function'
  ) {
    window.CineCasinoNative.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function compareVersions(remoteTag: string, currentTag: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split('.')
      .map((n) => parseInt(n.replace(/\D.*$/, ''), 10) || 0);

  const a = parse(remoteTag);
  const b = parse(currentTag);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const numA = a[i] || 0;
    const numB = b[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}
