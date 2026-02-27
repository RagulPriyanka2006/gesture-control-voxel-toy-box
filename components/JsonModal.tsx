/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { X, FileJson, Upload, Copy, Check } from 'lucide-react';

interface JsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: string;
  isImport?: boolean;
  onImport?: (json: string) => void;
}

export const JsonModal: React.FC<JsonModalProps> = ({ isOpen, onClose, data = '', isImport = false, onImport }) => {
  const [importText, setImportText] = useState('');
  const [error, setError] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
      if (isOpen) {
          setImportText('');
          setError('');
          setIsCopied(false);
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImportClick = () => {
      if (!importText.trim()) {
          setError('Please paste JSON data first.');
          return;
      }
      try {
          JSON.parse(importText); // Simple validation
          if (onImport) {
              onImport(importText);
              onClose();
          }
      } catch (e) {
          setError('Invalid JSON format. Please check your input.');
      }
  };

  const handleCopy = async () => {
      if (!data) return;
      try {
          await navigator.clipboard.writeText(data);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
          console.error('Failed to copy:', err);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 font-sans">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col h-[70vh] border-4 border-slate-100 animate-in fade-in zoom-in duration-300 scale-95 sm:scale-100 ring-4 ring-white/20">
        
        <div className="flex items-center justify-between p-6 border-b-4 border-slate-100 bg-slate-50/50 rounded-t-[2.5rem]">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-inner ${isImport ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                {isImport ? <Upload size={28} strokeWidth={3} /> : <FileJson size={28} strokeWidth={3} />}
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {isImport ? 'Import Blueprint' : 'Share Model'}
                </h2>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-200 px-2 py-0.5 rounded-full w-fit mt-1">JSON Format</div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 rounded-2xl bg-white text-slate-400 hover:text-rose-500 hover:scale-110 transition-all shadow-sm border-2 border-slate-100"
          >
            <X size={24} strokeWidth={4} />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-hidden bg-white flex flex-col relative">
          <textarea 
            readOnly={!isImport}
            value={isImport ? importText : data}
            onChange={isImport ? (e) => setImportText(e.target.value) : undefined}
            placeholder={isImport ? "Paste your voxel JSON data here..." : ""}
            className={`w-full h-full resize-none bg-slate-50 border-4 rounded-2xl p-5 font-mono text-xs text-slate-600 focus:outline-none transition-all ${isImport ? 'border-emerald-100 focus:border-emerald-300 focus:bg-emerald-50' : 'border-slate-100 focus:border-blue-300 focus:bg-blue-50'}`}
          />
          
          {isImport && error && (
              <div className="absolute bottom-8 left-8 right-8 bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-sm font-bold shadow-lg border-2 border-rose-100 animate-in slide-in-from-bottom-2 flex items-center gap-2">
                  <X size={16} strokeWidth={3} /> {error}
              </div>
          )}
        </div>

        <div className="p-6 border-t-4 border-slate-100 flex justify-end bg-slate-50/50 rounded-b-[2.5rem] gap-4">
          {isImport ? (
              <>
                <button 
                    onClick={onClose}
                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleImportClick}
                    className="px-8 py-3 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white text-sm font-black rounded-2xl hover:brightness-110 transition-all shadow-[0_4px_0_#047857] border-2 border-emerald-600 active:border-b-2 active:translate-y-[2px] active:shadow-none"
                >
                    Import Build
                </button>
              </>
          ) : (
              <>
                <button
                    onClick={handleCopy}
                    className={`
                        flex items-center gap-2 px-8 py-3 text-sm font-black rounded-2xl transition-all border-2 active:border-b-2 active:translate-y-[2px] active:shadow-none
                        ${isCopied 
                            ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white border-emerald-600 shadow-[0_4px_0_#047857]' 
                            : 'bg-gradient-to-b from-blue-400 to-blue-600 text-white border-blue-600 shadow-[0_4px_0_#1d4ed8] hover:brightness-110'}
                    `}
                >
                    {isCopied ? <Check size={20} strokeWidth={4} /> : <Copy size={20} strokeWidth={3} />}
                    {isCopied ? 'Copied!' : 'Copy JSON'}
                </button>
                <button 
                    onClick={onClose}
                    className="px-8 py-3 bg-gradient-to-b from-slate-700 to-slate-800 text-white text-sm font-black rounded-2xl hover:brightness-110 transition-all shadow-[0_4px_0_#0f172a] border-2 border-slate-900 active:border-b-2 active:translate-y-[2px] active:shadow-none"
                >
                    Close
                </button>
              </>
          )}
        </div>

      </div>
    </div>
  );
};
