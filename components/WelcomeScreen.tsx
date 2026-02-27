/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';

interface WelcomeScreenProps {
  visible: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ visible }) => {
  return (
    <div className={`
        absolute top-24 left-0 w-full pointer-events-none flex justify-center z-10 select-none
        transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) transform font-sans
        ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-12 scale-90'}
    `}>
      <div className="text-center flex flex-col items-center gap-6 bg-white/90 backdrop-blur-xl p-10 rounded-[3rem] border-4 border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] ring-1 ring-black/5 max-w-2xl mx-4">
        <div>
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 uppercase tracking-tighter mb-2 drop-shadow-sm">
                Voxel Toy Box
            </h1>
            <div className="inline-block bg-indigo-100 text-indigo-600 px-4 py-1 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm">
                Powered by Gemini 3
            </div>
        </div>
        
        <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3 text-xl font-bold text-slate-600 bg-slate-50 px-6 py-3 rounded-2xl border-2 border-slate-100">
                <span className="text-2xl">🧱</span> Build amazing voxel models
            </div>
            <div className="flex items-center gap-3 text-xl font-bold text-slate-600 bg-slate-50 px-6 py-3 rounded-2xl border-2 border-slate-100">
                <span className="text-2xl">💥</span> Smash them apart with physics
            </div>
            <div className="flex items-center gap-3 text-xl font-bold text-slate-600 bg-slate-50 px-6 py-3 rounded-2xl border-2 border-slate-100">
                <span className="text-2xl">✨</span> Rebuild into anything you want
            </div>
        </div>
      </div>
    </div>
  );
};
