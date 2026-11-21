import { useEffect, useMemo, useState } from 'react';
import {
  CinemaMovie,
  CinemaShowtime,
  formatDayLabels,
  getMovieBookingUrl,
  getShowBookingUrl,
  openInNativeOrBrowser,
} from '../types/cinema';
import {
  IconArrowLeft,
  IconClock,
  IconClose,
  IconExternalLink,
  IconPlay,
  IconTicket,
} from './Icons';

interface MovieDetailModalProps {
  movie: CinemaMovie | null;
  onClose: () => void;
}

export const MovieDetailModal = ({ movie, onClose }: MovieDetailModalProps) => {
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    setShowTrailer(false);
  }, [movie?.id]);

  const groupedByDay = useMemo(() => {
    if (!movie) return [];
    const map = new Map<string, CinemaShowtime[]>();
    for (const s of movie.shows) {
      const list = map.get(s.dateKey) || [];
      list.push(s);
      map.set(s.dateKey, list);
    }
    return Array.from(map.entries()).map(([dateKey, shows]) => ({
      dateKey,
      dayTitle: formatDayLabels(dateKey).fullLabel,
      shows,
    }));
  }, [movie]);

  if (!movie) return null;

  const handleClose = () => {
    setShowTrailer(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm text-white">
      <div className="fixed inset-0" onClick={handleClose} />

      <div className="relative w-full max-w-xl max-h-[94vh] sm:max-h-[88vh] bg-[#121621] border border-[#262E45] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 px-4 py-3.5 border-b border-[#262E45] flex items-center justify-between bg-[#090B10]/95 backdrop-blur-md">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 rounded-xl bg-[#181D2C] hover:bg-[#22283C] text-slate-100 flex items-center gap-1.5 text-xs font-semibold transition"
          >
            <IconArrowLeft size={16} />
            <span>Retour</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer la fiche du film"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-5 py-5 space-y-5 flex-1">
          {/* Poster + Basic info */}
          <div className="flex gap-4 items-start">
            <div className="w-28 sm:w-32 aspect-[2/3] rounded-2xl overflow-hidden bg-[#181D2C] border border-[#262E45] flex-shrink-0 shadow-lg">
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 p-2 text-center">
                  Pas d’affiche
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {movie.isArtEtEssai && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/35">
                    Art &amp; Essai
                  </span>
                )}
                {movie.ratingLabel && movie.ratingShort !== 'TOU' && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/35">
                    {movie.ratingLabel}
                  </span>
                )}
                {movie.year && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#181D2C] text-slate-300 border border-[#262E45]">
                    {movie.year}
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                {movie.title}
              </h2>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                {movie.durationLabel && (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                    <IconClock size={14} />
                    <span>{movie.durationLabel}</span>
                  </span>
                )}
                {movie.genres.length > 0 && (
                  <span className="text-slate-300">{movie.genres.join(', ')}</span>
                )}
              </div>

              {movie.director && (
                <p className="text-xs text-slate-300">
                  <span className="text-slate-400">Réalisation :</span> {movie.director}
                </p>
              )}

              {movie.releaseDateLabel && (
                <p className="text-xs text-slate-400">
                  Sortie : {movie.releaseDateLabel}
                </p>
              )}
            </div>
          </div>

          {/* Embedded Trailer */}
          {movie.trailerUrl && (
            <div className="space-y-2.5">
              {!showTrailer ? (
                <button
                  type="button"
                  onClick={() => setShowTrailer(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-[#181D2C] hover:bg-[#22283C] border border-amber-500/40 text-amber-300 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <IconPlay size={16} />
                  <span>Voir la bande-annonce</span>
                </button>
              ) : (
                <div className="rounded-2xl overflow-hidden border border-[#262E45] bg-black">
                  <video
                    src={movie.trailerUrl}
                    poster={movie.posterUrl || undefined}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="w-full aspect-video max-h-64 bg-black"
                  />
                </div>
              )}
            </div>
          )}

          {/* Cast */}
          {movie.cast && (
            <div className="p-3.5 rounded-2xl bg-[#181D2C]/70 border border-[#262E45]">
              <div className="text-xs font-semibold text-slate-400 mb-1">Avec</div>
              <p className="text-xs text-slate-200 leading-relaxed">{movie.cast}</p>
            </div>
          )}

          {/* Synopsis */}
          {movie.storyline && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-amber-400">Synopsis</h3>
              <p className="text-sm text-slate-200 leading-relaxed max-w-[70ch]">
                {movie.storyline}
              </p>
            </div>
          )}

          {/* Showtimes by day */}
          <div className="space-y-3 pt-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <IconTicket size={17} className="text-amber-400" />
              <span>Séances à venir aux 3 Casinos</span>
            </h3>

            {groupedByDay.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#181D2C] border border-[#262E45] text-xs text-slate-300 space-y-3">
                <p>
                  Aucune séance programmée pour le moment. Ce film est annoncé prochainement ou hors période actuelle.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    openInNativeOrBrowser(getMovieBookingUrl(movie), movie.title)
                  }
                  className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold"
                >
                  <span>Voir la fiche sur le site du cinéma</span>
                  <IconExternalLink size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedByDay.map((group) => (
                  <div
                    key={group.dateKey}
                    className="p-3.5 rounded-2xl bg-[#181D2C]/80 border border-[#262E45] space-y-2.5"
                  >
                    <div className="text-xs font-bold text-slate-200">
                      {group.dayTitle}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.shows.map((show) => (
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
                          className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                            show.isSoldOut
                              ? 'bg-[#090B10]/60 border-[#262E45] opacity-55 cursor-not-allowed'
                              : 'bg-[#090B10] hover:bg-[#1e2538] border-amber-500/35 hover:border-amber-400 active:scale-[0.99]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
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
                              {show.is3D && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                                  3D
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {show.screenLabel} • Fin à {show.endTimeLabel}
                              {show.hasStarted && ' • En cours'}
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            {show.isSoldOut ? (
                              <span className="text-[11px] font-bold text-rose-400">
                                Complet
                              </span>
                            ) : (
                              <>
                                <div className="text-xs font-bold text-white">
                                  Réserver
                                </div>
                                <div className="text-[10px] text-emerald-400">
                                  {show.remainingPlaces} places
                                </div>
                              </>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#090B10] border-t border-[#262E45] px-5 py-3 flex items-center justify-between gap-2 pb-[max(0.875rem,env(safe-area-inset-bottom,14px))]">
          <button
            type="button"
            onClick={() => openInNativeOrBrowser(getMovieBookingUrl(movie), movie.title)}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1.5"
          >
            <span>Page du film</span>
            <IconExternalLink size={14} />
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-[#181D2C] hover:bg-[#22283C] text-white text-xs font-semibold border border-[#262E45]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
