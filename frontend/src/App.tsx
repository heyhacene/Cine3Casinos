import { useCallback, useEffect, useMemo, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  APP_CURRENT_VERSION,
  CINEMA_INFO,
  CINEMA_TARIFFS,
  CinemaDataSnapshot,
  CinemaMovie,
  CinemaShowtime,
  GITHUB_APK_URL,
  GITHUB_RELEASES_API,
  GITHUB_RELEASES_URL,
  buildDaysFromShows,
  compareVersions,
  fetchCinemaProgramming,
  getShowBookingUrl,
  loadCachedProgramming,
  openExternalUrl,
  openInNativeOrBrowser,
} from './types/cinema';
import {
  IconAlertCircle,
  IconCalendar,
  IconClock,
  IconClose,
  IconDownload,
  IconExternalLink,
  IconFilm,
  IconInfo,
  IconMapPin,
  IconPlay,
  IconRefresh,
  IconSearch,
  IconShare,
} from './components/Icons';
import { MovieDetailModal } from './components/MovieDetailModal';
import { ReleaseInfo, UpdateModal } from './components/UpdateModal';
import { ShareModal } from './components/ShareModal';

type MainTab = 'seances' | 'films' | 'infos';
type QuickFilter = 'all' | 'vf' | 'vost' | 'art';
type FilmsSubTab = 'a-laffiche' | 'prochainement';

export default function App() {
  const [snapshot, setSnapshot] = useState<CinemaDataSnapshot | null>(() =>
    loadCachedProgramming()
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Navigation & filters
  const [activeTab, setActiveTab] = useState<MainTab>('seances');
  const [selectedDayKey, setSelectedDayKey] = useState<string>('ALL');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filmsSubTab, setFilmsSubTab] = useState<FilmsSubTab>('a-laffiche');

  // Modals
  const [selectedMovie, setSelectedMovie] = useState<CinemaMovie | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);
  const [detectedRelease, setDetectedRelease] = useState<ReleaseInfo | null>(null);
  const [hasNewUpdate, setHasNewUpdate] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<{
    type: 'info' | 'success' | 'error';
    text: string;
  } | null>(null);

  const showToast = useCallback(
    (type: 'info' | 'success' | 'error', text: string) => {
      setToastMsg({ type, text });
      setTimeout(() => {
        setToastMsg((prev) => (prev?.text === text ? null : prev));
      }, 3200);
    },
    []
  );

  const refreshProgramming = useCallback(
    async (manual = false) => {
      setIsRefreshing(true);
      setFetchError(null);
      try {
        const fresh = await fetchCinemaProgramming();
        setSnapshot(fresh);
        if (manual) {
          showToast('success', 'Programmation mise à jour');
        }
      } catch (err: any) {
        const msg =
          err?.message ||
          'Impossible de joindre le serveur du cinéma. Vérifiez votre connexion.';
        setFetchError(msg);
        if (manual) {
          showToast('error', 'Échec de la mise à jour');
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [showToast]
  );

  // Fetch programming on launch + check app updates
  useEffect(() => {
    refreshProgramming(false);

    const checkAppUpdateOnLaunch = async () => {
      try {
        const sessionChecked = sessionStorage.getItem('c3c_update_checked');
        if (sessionChecked) return;
        sessionStorage.setItem('c3c_update_checked', 'true');

        const res = await fetch(GITHUB_RELEASES_API, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.tag_name) return;

        const apkAsset = data.assets?.find((a: any) =>
          String(a?.name || '').toLowerCase().endsWith('.apk')
        );
        const rel: ReleaseInfo = {
          tag_name: data.tag_name,
          name: data.name || data.tag_name,
          body: data.body || '',
          published_at: data.published_at || '',
          apk_url: apkAsset ? apkAsset.browser_download_url : GITHUB_APK_URL,
          html_url: data.html_url || GITHUB_RELEASES_URL,
        };

        if (compareVersions(rel.tag_name, APP_CURRENT_VERSION) > 0) {
          setDetectedRelease(rel);
          setHasNewUpdate(true);

          const lastNotified = localStorage.getItem('c3c_last_notified_release');
          if (rel.tag_name !== lastNotified) {
            localStorage.setItem('c3c_last_notified_release', rel.tag_name);
            setUpdateModalOpen(true);

            try {
              const perm = await LocalNotifications.checkPermissions();
              if (perm.display === 'granted') {
                await LocalNotifications.schedule({
                  notifications: [
                    {
                      id: 30301,
                      title: `Ciné 3 Casinos ${rel.tag_name} disponible`,
                      body: 'Une mise à jour de l’application est prête à être installée.',
                      smallIcon: 'ic_launcher',
                    },
                  ],
                });
              }
            } catch {}
          }
        }
      } catch {}
    };

    checkAppUpdateOnLaunch();
  }, [refreshProgramming]);

  // Refresh automatically whenever the Android app returns to foreground
  useEffect(() => {
    let stateHandle: { remove: () => Promise<void> } | null = null;
    try {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          refreshProgramming(false);
        }
      }).then((h) => {
        stateHandle = h;
      });
    } catch {}

    return () => {
      if (stateHandle) {
        stateHandle.remove().catch(() => {});
      }
    };
  }, [refreshProgramming]);

  // Android hardware back button handling
  useEffect(() => {
    let backHandle: { remove: () => Promise<void> } | null = null;
    try {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (selectedMovie) {
          setSelectedMovie(null);
        } else if (updateModalOpen) {
          setUpdateModalOpen(false);
        } else if (shareModalOpen) {
          setShareModalOpen(false);
        } else if (activeTab !== 'seances') {
          setActiveTab('seances');
        } else if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      }).then((h) => {
        backHandle = h;
      });
    } catch {}

    return () => {
      if (backHandle) {
        backHandle.remove().catch(() => {});
      }
    };
  }, [selectedMovie, updateModalOpen, shareModalOpen, activeTab]);

  const availableDays = useMemo(
    () => buildDaysFromShows(snapshot?.shows || []),
    [snapshot]
  );

  // Auto-select first available day when data arrives if current selection is invalid
  useEffect(() => {
    if (availableDays.length === 0) return;
    if (selectedDayKey === 'ALL') {
      setSelectedDayKey(availableDays[0].dateKey);
    } else if (
      selectedDayKey !== 'ALL_DAYS' &&
      !availableDays.some((d) => d.dateKey === selectedDayKey)
    ) {
      setSelectedDayKey(availableDays[0].dateKey);
    }
  }, [availableDays, selectedDayKey]);

  // Filtered movies & shows for the "Séances" tab
  const scheduledMoviesForView = useMemo(() => {
    const movies = snapshot?.movies || [];
    const q = searchQuery.trim().toLowerCase();

    return movies
      .map((movie) => {
        if (quickFilter === 'art' && !movie.isArtEtEssai) return null;

        if (q) {
          const haystack = `${movie.title} ${movie.director} ${movie.genres.join(' ')}`.toLowerCase();
          if (!haystack.includes(q)) return null;
        }

        const filteredShows = movie.shows.filter((show) => {
          if (selectedDayKey !== 'ALL_DAYS' && selectedDayKey !== 'ALL') {
            if (show.dateKey !== selectedDayKey) return false;
          }
          if (quickFilter === 'vf' && show.version !== 'VF') return false;
          if (
            quickFilter === 'vost' &&
            show.version !== 'VOST' &&
            show.version !== 'VO'
          ) {
            return false;
          }
          return true;
        });

        if (filteredShows.length === 0) return null;
        return { movie, shows: filteredShows };
      })
      .filter((item): item is { movie: CinemaMovie; shows: CinemaShowtime[] } =>
        Boolean(item)
      );
  }, [snapshot, selectedDayKey, quickFilter, searchQuery]);

  // Movies for "Films" tab
  const moviesPlayingNow = useMemo(
    () => (snapshot?.movies || []).filter((m) => m.shows.length > 0),
    [snapshot]
  );
  const moviesUpcoming = useMemo(
    () => (snapshot?.movies || []).filter((m) => m.shows.length === 0),
    [snapshot]
  );

  const lastUpdatedLabel = useMemo(() => {
    if (!snapshot?.fetchedAt) return null;
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(snapshot.fetchedAt));
  }, [snapshot?.fetchedAt]);

  return (
    <div className="min-h-screen bg-[#090B10] text-slate-100 pb-24">
      {/* Sticky Minimal Header */}
      <header className="cine-header">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="./favicon.svg"
              alt="Ciné 3 Casinos"
              className="w-9 h-9 rounded-xl border border-amber-500/40 bg-[#121621] flex-shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight text-white truncate leading-tight">
                Ciné 3 Casinos
              </h1>
              <p className="text-[11px] text-slate-400 truncate">
                Gardanne
                {lastUpdatedLabel ? ` • Actualisé à ${lastUpdatedLabel}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Dedicated Refresh Programming Button */}
            <button
              type="button"
              onClick={() => refreshProgramming(true)}
              disabled={isRefreshing}
              aria-label="Actualiser la programmation"
              className="px-3 py-2 rounded-xl bg-[#181D2C] hover:bg-[#22283C] border border-[#262E45] text-amber-400 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-70"
            >
              <IconRefresh
                size={15}
                className={isRefreshing ? 'animate-spin' : ''}
              />
              <span>Actualiser</span>
            </button>

            {/* App Update Button with live badge */}
            <button
              type="button"
              onClick={() => setUpdateModalOpen(true)}
              aria-label="Mises à jour de l'application"
              className={`relative p-2 rounded-xl border transition active:scale-95 ${
                hasNewUpdate
                  ? 'bg-rose-600/20 border-rose-500/60 text-rose-300'
                  : 'bg-[#181D2C] hover:bg-[#22283C] border-[#262E45] text-slate-300'
              }`}
              title="Mises à jour de l'appli"
            >
              <IconDownload size={17} />
              {hasNewUpdate && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#090B10]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-3.5 pt-4 space-y-4">
        {/* Toast notification */}
        {toastMsg && (
          <div
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold border shadow-lg transition ${
              toastMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/45 text-emerald-200'
                : toastMsg.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/45 text-rose-200'
                : 'bg-[#181D2C] border-[#262E45] text-slate-200'
            }`}
          >
            {toastMsg.text}
          </div>
        )}

        {/* Update available banner (if dismissed once) */}
        {hasNewUpdate && detectedRelease && !updateModalOpen && (
          <button
            type="button"
            onClick={() => setUpdateModalOpen(true)}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 to-[#181D2C] border border-rose-500/40 flex items-center justify-between gap-3 text-left transition hover:border-rose-400"
          >
            <div>
              <div className="text-xs font-bold text-rose-300">
                Nouvelle version {detectedRelease.tag_name} disponible
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Touchez pour installer la mise à jour de l’application
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold flex-shrink-0">
              Mettre à jour
            </span>
          </button>
        )}

        {/* Error banner when offline / failed */}
        {fetchError && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-rose-200">
              <IconAlertCircle size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Impossible de charger les dernières séances</p>
                <p className="text-rose-200/80 mt-0.5">{fetchError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refreshProgramming(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-xs font-bold text-white flex-shrink-0"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* TAB 1: SÉANCES */}
        {activeTab === 'seances' && (
          <section className="space-y-4">
            {/* Day Selector */}
            {availableDays.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {availableDays.map((day) => {
                  const active = selectedDayKey === day.dateKey;
                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      onClick={() => setSelectedDayKey(day.dateKey)}
                      className={`flex-shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold border transition ${
                        active
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                          : 'bg-[#121621] text-slate-300 border-[#262E45] hover:border-slate-500'
                      }`}
                    >
                      <span>{day.shortLabel}</span>
                      <span
                        className={`ml-1.5 text-[10px] font-mono ${
                          active ? 'text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        {day.showCount}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedDayKey('ALL_DAYS')}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold border transition ${
                    selectedDayKey === 'ALL_DAYS'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                      : 'bg-[#121621] text-slate-300 border-[#262E45] hover:border-slate-500'
                  }`}
                >
                  Tous les jours
                </button>
              </div>
            )}

            {/* Quick Filters + Search */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: 'all', label: 'Tous' },
                    { id: 'vf', label: 'VF' },
                    { id: 'vost', label: 'VOST' },
                    { id: 'art', label: 'Art & Essai' },
                  ] as const
                ).map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setQuickFilter(chip.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      quickFilter === chip.id
                        ? 'bg-white text-slate-950 border-white'
                        : 'bg-[#121621] text-slate-300 border-[#262E45] hover:text-white'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="relative flex-1">
                <IconSearch
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Chercher un film ou réalisateur..."
                  className="w-full bg-[#121621] border border-[#262E45] focus:border-amber-400 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Effacer la recherche"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <IconClose size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Loading skeleton when first load without cache */}
            {isRefreshing && !snapshot && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-36 rounded-2xl bg-[#121621] border border-[#262E45] animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isRefreshing && scheduledMoviesForView.length === 0 && (
              <div className="p-8 rounded-2xl bg-[#121621] border border-[#262E45] text-center space-y-3">
                <p className="text-sm font-semibold text-slate-200">
                  Aucune séance trouvée pour ces critères.
                </p>
                <div className="flex items-center justify-center gap-2">
                  {(quickFilter !== 'all' || searchQuery || selectedDayKey !== 'ALL_DAYS') && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickFilter('all');
                        setSearchQuery('');
                        setSelectedDayKey('ALL_DAYS');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#181D2C] border border-[#262E45] text-xs font-bold text-amber-400"
                    >
                      Tout afficher
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => refreshProgramming(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
                  >
                    Actualiser
                  </button>
                </div>
              </div>
            )}

            {/* Movies List */}
            <div className="space-y-3.5">
              {scheduledMoviesForView.map(({ movie, shows }) => (
                <article
                  key={movie.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-[#121621] border border-[#262E45] space-y-3.5"
                >
                  <div className="flex gap-3.5 items-start">
                    {/* Poster */}
                    <button
                      type="button"
                      onClick={() => setSelectedMovie(movie)}
                      className="w-20 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden bg-[#181D2C] border border-[#262E45] flex-shrink-0 focus:outline-none"
                    >
                      {movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 p-1 text-center">
                          Affiche
                        </div>
                      )}
                    </button>

                    {/* Movie Meta */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedMovie(movie)}
                        className="text-left block w-full"
                      >
                        <h2 className="text-base font-bold text-white leading-snug hover:text-amber-300 transition">
                          {movie.title}
                        </h2>
                      </button>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                        {movie.durationLabel && (
                          <span className="inline-flex items-center gap-1 text-slate-200 font-medium">
                            <IconClock size={13} className="text-amber-400" />
                            <span>{movie.durationLabel}</span>
                          </span>
                        )}
                        {movie.genres.length > 0 && (
                          <span>{movie.genres.slice(0, 2).join(', ')}</span>
                        )}
                      </div>

                      {movie.director && (
                        <p className="text-xs text-slate-400 truncate">
                          De {movie.director}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {movie.isArtEtEssai && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/35">
                            Art &amp; Essai
                          </span>
                        )}
                        {movie.ratingLabel && movie.ratingShort !== 'TOU' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/35">
                            {movie.ratingLabel}
                          </span>
                        )}
                        {movie.trailerUrl && (
                          <button
                            type="button"
                            onClick={() => setSelectedMovie(movie)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#181D2C] hover:bg-[#22283C] text-amber-300 border border-[#262E45] inline-flex items-center gap-1"
                          >
                            <IconPlay size={10} />
                            <span>Bande-annonce</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Showtimes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-[#1E2536]">
                    {shows.map((show) => (
                      <button
                        key={show.id}
                        type="button"
                        disabled={show.isSoldOut}
                        onClick={() =>
                          openInNativeOrBrowser(
                            getShowBookingUrl(movie, show),
                            `${movie.title} • ${show.timeLabel}`
                          )
                        }
                        className={`px-3 py-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 ${
                          show.isSoldOut
                            ? 'bg-[#090B10]/60 border-[#262E45] opacity-55 cursor-not-allowed'
                            : 'bg-[#181D2C] hover:bg-[#20273B] border-[#2B354F] hover:border-amber-400 active:scale-[0.98]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono text-base font-bold text-amber-400">
                            {show.timeLabel}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              show.version === 'VOST' || show.version === 'VO'
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-slate-700/70 text-slate-200'
                            }`}
                          >
                            {show.version}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400">
                          <span className="truncate">
                            {selectedDayKey === 'ALL_DAYS'
                              ? `${show.dateKey.slice(8, 10)}/${show.dateKey.slice(5, 7)} • `
                              : ''}
                            {show.screenLabel}
                          </span>
                          {show.isSoldOut ? (
                            <span className="text-rose-400 font-bold">Complet</span>
                          ) : show.hasStarted ? (
                            <span className="text-amber-300 font-semibold">En cours</span>
                          ) : (
                            <span className="text-emerald-400 font-medium">
                              {show.remainingPlaces} pl.
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* TAB 2: FILMS & PROCHAINEMENT */}
        {activeTab === 'films' && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#121621] border border-[#262E45] rounded-2xl">
              <button
                type="button"
                onClick={() => setFilmsSubTab('a-laffiche')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                  filmsSubTab === 'a-laffiche'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                À l’affiche ({moviesPlayingNow.length})
              </button>
              <button
                type="button"
                onClick={() => setFilmsSubTab('prochainement')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                  filmsSubTab === 'prochainement'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Prochainement ({moviesUpcoming.length})
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(filmsSubTab === 'a-laffiche' ? moviesPlayingNow : moviesUpcoming).map(
                (movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => setSelectedMovie(movie)}
                    className="rounded-2xl bg-[#121621] border border-[#262E45] hover:border-amber-400/60 overflow-hidden text-left flex flex-col transition active:scale-[0.98]"
                  >
                    <div className="relative aspect-[2/3] w-full bg-[#181D2C]">
                      {movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 p-2 text-center">
                          Pas d’affiche
                        </div>
                      )}
                      {movie.isArtEtEssai && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-600/90 text-white shadow">
                          Art &amp; Essai
                        </span>
                      )}
                      {movie.trailerUrl && (
                        <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/75 border border-amber-400/60 flex items-center justify-center text-amber-400">
                          <IconPlay size={12} />
                        </span>
                      )}
                    </div>
                    <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                      <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug">
                        {movie.title}
                      </h3>
                      <div className="text-[11px] text-slate-400 pt-1">
                        {movie.shows.length > 0
                          ? `${movie.shows.length} séance${movie.shows.length > 1 ? 's' : ''}`
                          : movie.releaseDateLabel
                          ? `Sortie : ${movie.releaseDateLabel}`
                          : 'Bientôt'}
                      </div>
                    </div>
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {/* TAB 3: INFOS & TARIFS */}
        {activeTab === 'infos' && (
          <section className="space-y-4">
            {/* Tariffs */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#121621] border border-[#262E45] space-y-3.5">
              <h2 className="text-base font-bold text-white">Tarifs du cinéma</h2>

              <div className="divide-y divide-[#1E2536]">
                {CINEMA_TARIFFS.map((t) => (
                  <div
                    key={t.label}
                    className="py-2.5 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-100">
                        {t.label}
                      </div>
                      {t.note && (
                        <div className="text-xs text-slate-400 mt-0.5">{t.note}</div>
                      )}
                    </div>
                    <span className="font-mono text-sm font-bold text-amber-400 flex-shrink-0">
                      {t.price}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-400 pt-1 border-t border-[#1E2536]">
                {CINEMA_INFO.paymentNote}
              </p>
            </div>

            {/* Address & Practical Info */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#121621] border border-[#262E45] space-y-3.5">
              <h2 className="text-base font-bold text-white">Accès &amp; Salles</h2>

              <div className="flex items-start gap-2.5 text-sm text-slate-200">
                <IconMapPin size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{CINEMA_INFO.name}</div>
                  <div className="text-slate-300">
                    {CINEMA_INFO.address}, {CINEMA_INFO.postalCity}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {CINEMA_INFO.openingNote}
                  </div>
                </div>
              </div>

              {snapshot && snapshot.screens.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {snapshot.screens.map((scr) => (
                    <div
                      key={scr.id}
                      className="p-2.5 rounded-xl bg-[#181D2C] border border-[#262E45] text-center"
                    >
                      <div className="text-xs font-bold text-white">{scr.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {scr.capacity} places
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openExternalUrl(CINEMA_INFO.mapsUrl)}
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <IconMapPin size={15} />
                  <span>Itinéraire Google Maps</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openInNativeOrBrowser(CINEMA_INFO.accountUrl, 'Mon espace client')
                  }
                  className="py-2.5 px-4 rounded-xl bg-[#181D2C] hover:bg-[#22283C] border border-[#262E45] text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
                >
                  <span>Espace client / Billets</span>
                  <IconExternalLink size={14} />
                </button>
              </div>
            </div>

            {/* Application Management & Updates */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#121621] border border-[#262E45] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Application mobile</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Version installée : {APP_CURRENT_VERSION}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUpdateModalOpen(true)}
                  className="py-2.5 px-4 rounded-xl bg-[#181D2C] hover:bg-[#22283C] border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <IconDownload size={15} />
                  <span>Vérifier les mises à jour</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="py-2.5 px-4 rounded-xl bg-[#181D2C] hover:bg-[#22283C] border border-[#262E45] text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition"
                >
                  <IconShare size={15} />
                  <span>Partager l’appli (QR Code)</span>
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="cine-bottom-nav" aria-label="Navigation principale">
        {(
          [
            { id: 'seances', label: 'Séances', icon: IconCalendar },
            { id: 'films', label: 'Films', icon: IconFilm },
            { id: 'infos', label: 'Infos & Tarifs', icon: IconInfo },
          ] as const
        ).map((tab) => {
          const IconComp = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-1 rounded-xl transition ${
                active ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <IconComp size={20} />
              <span className="text-[11px] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      <MovieDetailModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
      />

      <UpdateModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        currentVersion={APP_CURRENT_VERSION}
        initialRelease={detectedRelease}
      />

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
}
