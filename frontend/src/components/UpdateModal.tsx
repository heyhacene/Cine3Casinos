import { useEffect, useState } from 'react';
import {
  APP_CURRENT_VERSION,
  GITHUB_APK_URL,
  GITHUB_RELEASES_API,
  GITHUB_RELEASES_URL,
  compareVersions,
  openExternalUrl,
} from '../types/cinema';
import {
  IconArrowLeft,
  IconCheck,
  IconClose,
  IconDownload,
  IconExternalLink,
  IconRefresh,
  IconShield,
  IconSparkles,
} from './Icons';

export interface ReleaseInfo {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  apk_url?: string;
  html_url: string;
  isSimulated?: boolean;
}

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion?: string;
  initialRelease?: ReleaseInfo | null;
}

export const UpdateModal = ({
  isOpen,
  onClose,
  currentVersion = APP_CURRENT_VERSION,
  initialRelease = null,
}: UpdateModalProps) => {
  const [loading, setLoading] = useState(false);
  const [release, setRelease] = useState<ReleaseInfo | null>(initialRelease);
  const [error, setError] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(Boolean(initialRelease));

  useEffect(() => {
    if (initialRelease) {
      setRelease(initialRelease);
      setHasChecked(true);
      setError(null);
    }
  }, [initialRelease]);

  const fetchLatestRelease = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(GITHUB_RELEASES_API, { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Aucune release publiée pour le moment sur GitHub.');
        }
        throw new Error(`Erreur serveur (${res.status})`);
      }
      const data = await res.json();
      const apkAsset = data.assets?.find((a: any) =>
        String(a?.name || '').toLowerCase().endsWith('.apk')
      );
      setRelease({
        tag_name: data.tag_name,
        name: data.name || data.tag_name,
        body: data.body || '',
        published_at: data.published_at || '',
        apk_url: apkAsset ? apkAsset.browser_download_url : GITHUB_APK_URL,
        html_url: data.html_url || GITHUB_RELEASES_URL,
      });
      setHasChecked(true);
    } catch (e: any) {
      setError(
        e?.message ||
          'Impossible de vérifier les mises à jour (vérifiez votre connexion Internet).'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateUpdate = () => {
    const parts = currentVersion.replace(/^v/i, '').split('.');
    const patch = (parseInt(parts[2] || '1', 10) || 1) + 1;
    const nextTag = `v${parts[0] || '1'}.${parts[1] || '0'}.${patch}`;
    setError(null);
    setRelease({
      tag_name: nextTag,
      name: `Ciné 3 Casinos ${nextTag}`,
      body: [
        'Nouveautés de cette mise à jour :',
        '- Synchronisation plus rapide de la programmation',
        '- Amélioration de l’affichage des séances et bandes-annonces',
        '- Correctifs de confort sur Android',
      ].join('\n'),
      published_at: new Date().toISOString(),
      apk_url: GITHUB_APK_URL,
      html_url: GITHUB_RELEASES_URL,
      isSimulated: true,
    });
  };

  useEffect(() => {
    if (isOpen && !hasChecked) {
      fetchLatestRelease();
    }
  }, [isOpen, hasChecked]);

  if (!isOpen) return null;

  const isNewer = release ? compareVersions(release.tag_name, currentVersion) > 0 : false;
  const isUpToDate = release ? !isNewer : false;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm text-white">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] bg-[#121621] border border-[#262E45] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#262E45] flex items-center justify-between bg-[#090B10]">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-[#181D2C] hover:bg-[#22283C] text-slate-200 flex items-center gap-1.5 text-xs font-semibold transition"
            >
              <IconArrowLeft size={16} />
              <span>Retour</span>
            </button>
            <div>
              <h2 className="text-base font-bold text-white leading-tight flex items-center gap-1.5">
                <IconSparkles size={16} className="text-amber-400" />
                <span>Mise à jour de l’appli</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Suivi automatique des versions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-5 space-y-4 flex-1">
          <div className="p-4 rounded-2xl bg-[#181D2C] border border-[#262E45] flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-amber-400">
                Version installée
              </div>
              <div className="text-xl font-bold text-white font-mono mt-0.5">
                {currentVersion}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Ciné 3 Casinos • Android
              </div>
            </div>

            <button
              type="button"
              onClick={fetchLatestRelease}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl bg-[#090B10] hover:bg-[#1f263b] text-amber-300 border border-amber-500/35 transition flex items-center gap-2 text-xs font-bold disabled:opacity-60"
            >
              <IconRefresh size={15} className={loading ? 'animate-spin' : ''} />
              <span>Vérifier</span>
            </button>
          </div>

          {loading && (
            <div className="p-6 rounded-2xl bg-[#181D2C] border border-[#262E45] flex flex-col items-center justify-center text-center space-y-3">
              <IconRefresh size={26} className="animate-spin text-amber-400" />
              <p className="text-sm font-semibold text-slate-200">
                Recherche d’une nouvelle version...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          {!loading && release && isUpToDate && (
            <div className="p-5 rounded-2xl bg-emerald-950/35 border border-emerald-500/40 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <IconCheck size={18} />
                <span>Votre application est à jour</span>
              </div>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Vous utilisez déjà la dernière version publiée (<span className="font-mono font-bold">{release.tag_name}</span>). Lorsqu’une nouvelle version sera disponible, cette fenêtre s’ouvrira automatiquement au lancement.
              </p>
            </div>
          )}

          {!loading && release && isNewer && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1b1f2e] to-[#121621] border border-amber-500/50 space-y-4 shadow-lg">
              <div>
                <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600/20 text-rose-300 border border-rose-500/40">
                  {release.isSimulated ? 'Aperçu pop-up de mise à jour' : 'Nouvelle version disponible'}
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  {release.name}
                </h3>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  {currentVersion} → <span className="text-amber-400 font-bold">{release.tag_name}</span>
                </p>
              </div>

              {release.apk_url && (
                <button
                  type="button"
                  onClick={() => openExternalUrl(release.apk_url!)}
                  className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition shadow-lg"
                >
                  <IconDownload size={18} />
                  <span>Télécharger la mise à jour (APK)</span>
                </button>
              )}

              {release.body && (
                <div className="pt-2 border-t border-[#262E45]">
                  <div className="text-xs font-semibold text-amber-300 mb-1.5">
                    Nouveautés
                  </div>
                  <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto bg-[#090B10] p-3 rounded-xl border border-[#262E45]">
                    {release.body}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <IconShield size={14} />
                <span>APK signé automatiquement</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => openExternalUrl(GITHUB_RELEASES_URL)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300"
            >
              <span>Toutes les versions sur GitHub</span>
              <IconExternalLink size={14} />
            </button>

            <button
              type="button"
              onClick={handleSimulateUpdate}
              className="px-3 py-1.5 rounded-lg bg-[#181D2C] hover:bg-[#22283C] text-slate-300 hover:text-white border border-[#262E45] text-[11px] font-semibold transition"
            >
              Simuler une mise à jour
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#090B10] border-t border-[#262E45] px-5 py-3.5 flex items-center justify-between pb-[max(0.875rem,env(safe-area-inset-bottom,14px))]">
          <span className="text-xs text-slate-400 font-mono">
            {currentVersion}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#181D2C] hover:bg-[#22283C] text-white font-semibold text-xs rounded-xl border border-[#262E45] transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
