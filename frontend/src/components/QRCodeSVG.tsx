import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeSVGProps {
  text: string;
  size?: number;
  className?: string;
}

export const QRCodeSVG = ({ text, size = 190, className = '' }: QRCodeSVGProps) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(text, {
      width: size * 2,
      margin: 2,
      color: {
        dark: '#090B10',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setError(false);
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [text, size]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-[#121621] border border-[#262E45] rounded-2xl flex flex-col items-center justify-center p-4 text-center text-xs text-amber-300"
      >
        <span className="break-all line-clamp-4 font-mono">{text}</span>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-[#181D2C] rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-400 border border-[#262E45]"
      >
        Génération du QR Code...
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <img
        src={dataUrl}
        alt="QR Code Ciné 3 Casinos"
        width={size}
        height={size}
        className="rounded-2xl shadow-xl border-4 border-white select-none pointer-events-none bg-white p-1"
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[#090B10] border-2 border-amber-400 shadow-lg flex items-center justify-center p-1 pointer-events-none">
        <img src="./favicon.svg" alt="3 Casinos" className="w-full h-full object-contain" />
      </div>
    </div>
  );
};
