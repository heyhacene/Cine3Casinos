import { useState } from 'react';
import {
  GITHUB_APK_URL,
  GITHUB_RELEASES_URL,
  PWA_PUBLIC_URL,
  openExternalUrl,
} from '../types/cinema';
import { QRCodeSVG } from './QRCodeSVG';
import {
  IconArrowLeft,
  IconCheck,
  IconClose,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconShare,
} from './Icons';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal = ({ isOpen, onClose }: ShareModalProps) => {
  const [targetMode, setTargetMode] = useState<'apk' | 'pwa'>('apk');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUrl = targetMode === 'apk' ? GITHUB_APK_URL : PWA_PUBLIC_URL;
  const shareText =
    "Installe l'application Ciné 3 Casinos (Gardanne) pour voir la programmation et les horaires du cinéma :";

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ciné 3 Casinos • Gardanne',
          text: shareText,
          url: currentUrl,
        });
        return;
      } catch {
        // Cancelled by user
      }
    }
    handleCopy(targetMode, currentUrl);
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm text-white">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[90vh] bg-[#121621] border border-[#262E45] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10">
        <div className="px-5 py-4 border-b border-[#262E45] flex items-center justify-between bg-[#090B10]">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-[#181D2C] hover:bg-[#22283C] text-slate-200 flex items-center gap-1.5 text-xs font-semibold"
            >
              <IconArrowLeft size={16} />
              <span>Retour</span>
            </button>
            <h2 className="text-base font-bold text-white">Partager l’application</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <IconClose size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#090B10] border border-[#262E45] rounded-2xl">
            <button
              type="button"
              onClick={() => setTargetMode('apk')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                targetMode === 'apk'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              APK Android direct
            </button>
            <button
              type="button"
              onClick={() => setTargetMode('pwa')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                targetMode === 'pwa'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Version Web (PWA)
            </button>
          </div>

          <div className="bg-[#181D2C] border border-[#262E45] rounded-2xl p-5 flex flex-col items-center text-center">
            <p className="text-xs font-semibold text-amber-400 mb-3">
              {targetMode === 'apk'
                ? 'Scanner pour télécharger Cine3Casinos.apk'
                : 'Scanner pour ouvrir l’appli web'}
            </p>
            <QRCodeSVG text={currentUrl} size={175} />

            <div className="mt-4 w-full bg-[#090B10] border border-[#262E45] rounded-xl p-2.5 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-300 font-mono truncate select-all">
                {currentUrl}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(targetMode, currentUrl)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 flex-shrink-0"
              >
                {copiedKey === targetMode ? <IconCheck size={14} /> : <IconCopy size={14} />}
                <span>{copiedKey === targetMode ? 'Copié' : 'Copier'}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition"
          >
            <IconShare size={17} />
            <span>Envoyer le lien</span>
          </button>

          <div className="flex items-center justify-between gap-2 text-xs pt-1">
            <button
              type="button"
              onClick={() => openExternalUrl(GITHUB_APK_URL)}
              className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold"
            >
              <IconDownload size={15} />
              <span>Télécharger l’APK</span>
            </button>
            <button
              type="button"
              onClick={() => openExternalUrl(GITHUB_RELEASES_URL)}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-white font-semibold"
            >
              <span>Releases GitHub</span>
              <IconExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
