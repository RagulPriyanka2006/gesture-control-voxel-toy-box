/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { Sparkles, X, Loader2, Wand2, Hammer } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  mode: 'create' | 'morph';
  onClose: () => void;
  onSubmit: (prompt: string, imageBase64?: string) => Promise<void>;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, mode, onClose, onSubmit }) => {
  const [prompt, setPrompt] = useState('');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setImageBase64(undefined);
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!prompt.trim() && !imageBase64) || isLoading) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await onSubmit(prompt, imageBase64);
      setPrompt('');
      setImageBase64(undefined);
      onClose();
    } catch (err) {
      console.error(err);
      setError('The magic failed! Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isCreate = mode === 'create';
  // Changed from fuchsia to sky/blue
  const themeColor = isCreate ? 'sky' : 'amber';
  const themeBg = isCreate ? 'bg-sky-500' : 'bg-amber-500';
  const themeHover = isCreate ? 'hover:bg-sky-600' : 'hover:bg-amber-600';
  const themeLight = isCreate ? 'bg-sky-100' : 'bg-amber-100';
  const themeText = isCreate ? 'text-sky-600' : 'text-amber-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 font-sans">
      <div className={`bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col border-4 ${isCreate ? 'border-sky-200' : 'border-amber-200'} animate-in fade-in zoom-in duration-300 scale-95 sm:scale-100 overflow-hidden ring-4 ring-white/20`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b-4 ${isCreate ? 'border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50' : 'border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-inner ${themeLight} ${themeText}`}>
                {isCreate ? <Wand2 size={28} strokeWidth={3} /> : <Hammer size={28} strokeWidth={3} />}
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {isCreate ? 'New Build' : 'Rebuild'}
                </h2>
                <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-fit mt-1 ${isCreate ? 'bg-sky-200 text-sky-700' : 'bg-amber-200 text-amber-700'}`}>
                    POWERED BY GEMINI 3
                </div>
            </div>
          </div>
          <button 
            onClick={!isLoading ? onClose : undefined}
            className="p-3 rounded-2xl bg-white/50 text-slate-400 hover:bg-white hover:text-rose-500 hover:scale-110 transition-all disabled:opacity-50"
            disabled={isLoading}
          >
            <X size={24} strokeWidth={4} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 bg-white">
          <p className="text-slate-500 font-bold mb-4 text-lg">
            {isCreate 
                ? "What should we build next?" 
                : "How should we reshape this?"}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isCreate 
                ? "e.g., A medieval castle, a giant robot, a fruit basket..." 
                : "e.g., Turn it into a car, make a pyramid, build a smiley face..."}
              disabled={isLoading}
              className={`w-full h-32 resize-none bg-slate-50 border-4 border-slate-100 rounded-2xl p-5 font-bold text-slate-700 focus:outline-none transition-all placeholder:text-slate-300 placeholder:font-medium text-lg ${isCreate ? 'focus:border-sky-300 focus:bg-sky-50' : 'focus:border-amber-300 focus:bg-amber-50'}`}
              autoFocus
            />

            {/* Image Upload */}
            <div>
                <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full py-4 border-4 border-dashed rounded-2xl flex items-center justify-center gap-3 font-bold transition-all group ${imageBase64 ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                    {imageBase64 ? (
                        <>
                            <div className="bg-emerald-200 p-1 rounded-lg"><Sparkles size={20} className="text-emerald-700" /></div>
                            <span>Image Selected!</span>
                        </>
                    ) : (
                        <>
                            <span className="text-2xl group-hover:scale-110 transition-transform">📷</span> 
                            <span>Upload Reference Photo</span>
                        </>
                    )}
                </button>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-100 text-rose-600 text-sm font-bold flex items-center gap-3 animate-pulse">
                <X size={20} strokeWidth={3} /> {error}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button 
                type="submit"
                disabled={(!prompt.trim() && !imageBase64) || isLoading}
                className={`
                  flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-white text-lg transition-all w-full justify-center
                  border-b-[6px] active:border-b-2 active:translate-y-[4px]
                  ${isLoading 
                    ? 'bg-slate-200 text-slate-400 cursor-wait border-slate-300' 
                    : `${themeBg} ${themeHover} shadow-xl active:shadow-none border-black/10`}
                `}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={24} className="animate-spin" strokeWidth={3} />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles size={24} fill="currentColor" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
