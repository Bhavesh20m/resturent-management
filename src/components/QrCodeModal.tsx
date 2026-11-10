import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Download, Copy, Check, ExternalLink, QrCode as QrIcon } from 'lucide-react';

interface QrCodeModalProps {
  tableNumber: number;
  restaurantSlug: string;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  tableNumber,
  restaurantSlug,
  onClose,
}) => {
  const [selectedTable, setSelectedTable] = useState<number>(tableNumber);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://dineflow.app';
  const customerUrl = `${baseUrl}/customer/${restaurantSlug}/table/${selectedTable}`;

  useEffect(() => {
    setSelectedTable(tableNumber);
  }, [tableNumber]);

  useEffect(() => {
    QRCode.toDataURL(customerUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [customerUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(customerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `DineFlow-Table-${selectedTable}-QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <QrIcon className="w-5 h-5 text-slate-800" />
            <h3 className="font-semibold text-slate-900 text-base">
              Table {selectedTable} QR & NFC Link
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(Number(e.target.value))}
              className="text-xs font-semibold py-1 px-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Table {n}
                </option>
              ))}
            </select>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col items-center">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs mb-4">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`Table ${selectedTable} QR Code`}
                className="w-64 h-64 object-contain"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-slate-400 text-sm">
                Generating QR...
              </div>
            )}
          </div>

          <div className="text-center mb-5">
            <span className="inline-block text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md mb-2">
              NFC & Scan Target
            </span>
            <p className="text-xs text-slate-500 font-mono break-all px-2 select-all">
              {customerUrl}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy URL'}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>
            <a
              href={customerUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
              title="Open Customer Menu in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Write this URL to your table's physical NFC tag or print the standee QR card.
          </p>
        </div>
      </div>
    </div>
  );
};
