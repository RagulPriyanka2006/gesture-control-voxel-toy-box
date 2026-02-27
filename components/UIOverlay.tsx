/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect, useRef } from 'react';
import { AppState, SavedModel, VoxelData } from '../types';
import { Box, Bird, Cat, Rabbit, Users, Code2, Wand2, Hammer, FolderOpen, ChevronUp, FileJson, History, Play, Pause, Info, Wrench, Loader2, Bot, Trees, Car, Ship, Plane, Home, Snowflake, Castle, Zap, Sword, Sparkles, Ghost, Moon, Hand, Grid } from 'lucide-react';

// --- Components ---

interface TactileButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  color: 'slate' | 'rose' | 'sky' | 'emerald' | 'amber' | 'indigo';
  compact?: boolean;
}

const TactileButton: React.FC<TactileButtonProps> = ({ onClick, disabled, icon, label, color, compact }) => {
  const colorStyles = {
    slate:   'bg-gradient-to-b from-slate-100 to-slate-200 text-slate-700 shadow-[0_4px_0_#cbd5e1] hover:brightness-105 border-slate-300',
    rose:    'bg-gradient-to-b from-rose-400 to-rose-500 text-white shadow-[0_4px_0_#be123c] hover:brightness-110 border-rose-600',
    sky:     'bg-gradient-to-b from-sky-400 to-sky-500 text-white shadow-[0_4px_0_#0369a1] hover:brightness-110 border-sky-600',
    emerald: 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-white shadow-[0_4px_0_#047857] hover:brightness-110 border-emerald-600',
    amber:   'bg-gradient-to-b from-amber-300 to-amber-400 text-amber-900 shadow-[0_4px_0_#b45309] hover:brightness-110 border-amber-500',
    indigo:  'bg-gradient-to-b from-indigo-400 to-indigo-500 text-white shadow-[0_4px_0_#4338ca] hover:brightness-110 border-indigo-600',
    violet:  'bg-gradient-to-b from-violet-400 to-violet-500 text-white shadow-[0_4px_0_#6d28d9] hover:brightness-110 border-violet-600',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative flex items-center justify-center gap-2 rounded-2xl font-black tracking-tight text-sm transition-all duration-200
        border-2 border-b-[6px] active:border-b-2 active:translate-y-[4px] active:shadow-none
        hover:-translate-y-1 hover:shadow-[0_6px_0_rgba(0,0,0,0.2)]
        ${compact ? 'p-3 aspect-square' : 'px-5 py-3'}
        ${disabled 
          ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed shadow-none border-b-2' 
          : `${colorStyles[color as keyof typeof colorStyles]}`}
      `}
    >
      {icon}
      {!compact && <span>{label}</span>}
    </button>
  );
};

const BigActionButton: React.FC<{onClick: () => void, icon: React.ReactNode, label: string, color: 'rose'}> = ({ onClick, icon, label, color }) => {
    return (
        <button 
            onClick={onClick}
            className="group relative flex flex-col items-center justify-center w-36 h-36 rounded-[2.5rem] bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-[0_10px_0_#9f1239] border-4 border-rose-300 border-b-[10px] active:border-b-4 active:translate-y-[6px] active:shadow-none hover:scale-105 transition-all duration-200 hover:brightness-110"
        >
            <div className="mb-2 transform group-hover:rotate-12 transition-transform duration-300 drop-shadow-md">{icon}</div>
            <div className="text-lg font-black tracking-widest uppercase drop-shadow-md">{label}</div>
            <div className="absolute inset-0 rounded-[2.5rem] ring-4 ring-white/20 inset-shadow"></div>
        </button>
    )
}

// --- Dropdown Components ---

interface DropdownProps {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
    color: 'indigo' | 'emerald';
    direction?: 'up' | 'down';
    big?: boolean;
}

const DropdownMenu: React.FC<DropdownProps> = ({ icon, label, children, color, direction = 'down', big }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const bgClass = color === 'indigo' 
        ? 'bg-gradient-to-b from-indigo-400 to-indigo-600 border-indigo-700 shadow-[0_6px_0_#3730a3]' 
        : 'bg-gradient-to-b from-emerald-400 to-emerald-600 border-emerald-700 shadow-[0_6px_0_#065f46]';

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-3 font-black text-white rounded-3xl transition-all duration-200
                    border-2 border-b-[6px] active:border-b-2 active:translate-y-[4px] active:shadow-none hover:-translate-y-1
                    ${bgClass}
                    ${big ? 'px-8 py-4 text-xl tracking-wide' : 'px-5 py-3 text-sm tracking-wide'}
                `}
            >
                <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">{icon}</div>
                {label}
                <ChevronUp size={20} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${direction === 'down' ? 'rotate-180' : ''} opacity-60`} />
            </button>

            {isOpen && (
                <div className={`
                    absolute left-0 ${direction === 'up' ? 'bottom-full mb-4' : 'top-full mt-4'} 
                    w-64 max-h-[60vh] overflow-y-auto bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-4 border-white/50 p-3 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200 z-50 ring-1 ring-black/5
                `}>
                    {children}
                </div>
            )}
        </div>
    )
}

const DropdownItem: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, highlight?: boolean, truncate?: boolean }> = ({ onClick, icon, label, highlight, truncate }) => {
    return (
        <button 
            onClick={onClick}
            className={`
                group w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 text-left border-2 border-transparent
                ${highlight 
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-200 hover:shadow-xl hover:scale-[1.02]' 
                    : 'text-slate-600 hover:bg-slate-100 hover:border-slate-200 hover:text-slate-900 hover:scale-[1.02]'}
            `}
        >
            <div className={`shrink-0 transition-transform group-hover:scale-110 ${highlight ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`}>{icon}</div>
            <span className={truncate ? "truncate w-full" : ""}>{label}</span>
        </button>
    )
}

interface UIOverlayProps {
  voxelCount: number;
  appState: AppState;
  currentBaseModel: string;
  customBuilds: SavedModel[];
  customRebuilds: SavedModel[];
  isAutoRotate: boolean;
  isInfoVisible: boolean;
  isGenerating: boolean;
  onDismantle: () => void;
  onRebuild: (type: any) => void;
  onNewScene: (type: any) => void;
  onSelectCustomBuild: (model: SavedModel) => void;
  onSelectCustomRebuild: (model: SavedModel) => void;
  onPromptCreate: () => void;
  onPromptMorph: () => void;
  onShowJson: () => void;
  onImportJson: () => void;
  onToggleRotation: () => void;
  onToggleInfo: () => void;
  onToggleGesture: () => void;
  onToggleGrid: () => void;
  isGestureActive: boolean;
  isGridVisible: boolean;
}

const LOADING_MESSAGES = [
    "Crafting voxels...",
    "Designing structure...",
    "Calculating physics...",
    "Mixing colors...",
    "Assembling geometry...",
    "Applying polish..."
];

export const UIOverlay: React.FC<UIOverlayProps> = ({
  voxelCount,
  appState,
  currentBaseModel,
  customBuilds,
  customRebuilds,
  isAutoRotate,
  isInfoVisible,
  isGenerating,
  onDismantle,
  onRebuild,
  onNewScene,
  onSelectCustomBuild,
  onSelectCustomRebuild,
  onPromptCreate,
  onPromptMorph,
  onShowJson,
  onImportJson,
  onToggleRotation,
  onToggleInfo,
  onToggleGesture,
  onToggleGrid,
  isGestureActive,
  isGridVisible
}) => {
  const isStable = appState === AppState.STABLE;
  const isDismantling = appState === AppState.DISMANTLING;
  const isRebuilding = appState === AppState.REBUILDING;
  
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (isGenerating) {
        const startTime = Date.now();
        const interval = setInterval(() => {
            setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);
        
        const timerInterval = setInterval(() => {
            setElapsedTime((Date.now() - startTime) / 1000);
        }, 100);
        
        return () => {
            clearInterval(interval);
            clearInterval(timerInterval);
        };
    } else {
        setLoadingMsgIndex(0);
        setElapsedTime(0);
    }
  }, [isGenerating]);
  
  // Only show default presets if the current model is the original Eagle
  const isEagle = currentBaseModel === 'Eagle';

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none">
      
      {/* --- Top Bar (Stats & Tools) --- */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        
        {/* Global Scene Controls */}
        <div className="pointer-events-auto flex flex-col gap-2">
            <DropdownMenu 
                icon={<FolderOpen size={20} />}
                label="Builds"
                color="indigo"
            >
                <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">NEW BUILDS</div>
                <DropdownItem onClick={() => onNewScene('Eagle')} icon={<Bird size={16}/>} label="Eagle" />
                <DropdownItem onClick={() => onNewScene('Castle')} icon={<Castle size={16}/>} label="Castle" />
                <DropdownItem onClick={() => onNewScene('Robot')} icon={<Bot size={16}/>} label="Robot" />
                <DropdownItem onClick={() => onNewScene('Tree')} icon={<Trees size={16}/>} label="Tree" />
                <DropdownItem onClick={() => onNewScene('Car')} icon={<Car size={16}/>} label="Car" />
                <DropdownItem onClick={() => onNewScene('Boat')} icon={<Ship size={16}/>} label="Boat" />
                <DropdownItem onClick={() => onNewScene('Plane')} icon={<Plane size={16}/>} label="Plane" />
                <DropdownItem onClick={() => onNewScene('House')} icon={<Home size={16}/>} label="House" />
                <DropdownItem onClick={() => onNewScene('Duck')} icon={<Bird size={16}/>} label="Duck" />
                <DropdownItem onClick={() => onNewScene('Penguin')} icon={<Bird size={16}/>} label="Penguin" />
                <DropdownItem onClick={() => onNewScene('Snowman')} icon={<Snowflake size={16}/>} label="Snowman" />
                
                <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">ANIME</div>
                <DropdownItem onClick={() => onNewScene('Pikachu')} icon={<Zap size={16}/>} label="Pikachu" />
                <DropdownItem onClick={() => onNewScene('Naruto')} icon={<Sparkles size={16}/>} label="Naruto" />
                <DropdownItem onClick={() => onNewScene('Goku')} icon={<Sword size={16}/>} label="Goku" />
                <DropdownItem onClick={() => onNewScene('Totoro')} icon={<Ghost size={16}/>} label="Totoro" />
                <DropdownItem onClick={() => onNewScene('SailorMoon')} icon={<Moon size={16}/>} label="Sailor Moon" />

                <div className="h-px bg-slate-100 my-1" />
                <DropdownItem onClick={onPromptCreate} icon={<Wand2 size={16}/>} label="New build" highlight />
                <div className="h-px bg-slate-100 my-1" />
                
                {customBuilds.length > 0 && (
                    <>
                        <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">YOUR CREATIONS</div>
                        {customBuilds.map((model, idx) => (
                            <DropdownItem 
                                key={`build-${idx}`} 
                                onClick={() => onSelectCustomBuild(model)} 
                                icon={<History size={16}/>} 
                                label={model.name} 
                                truncate
                            />
                        ))}
                        <div className="h-px bg-slate-100 my-1" />
                    </>
                )}

                <DropdownItem onClick={onImportJson} icon={<FileJson size={16}/>} label="Import JSON" />
            </DropdownMenu>

            <div className="flex items-center gap-3 px-5 py-2 bg-white/80 backdrop-blur-md shadow-[0_4px_0_rgba(0,0,0,0.1)] rounded-3xl border-2 border-white text-slate-500 font-bold w-fit mt-3 hover:scale-105 transition-transform duration-200">
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-2 rounded-xl text-white shadow-inner">
                    <Box size={20} strokeWidth={3} />
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] uppercase tracking-wider font-black text-slate-400">Voxels</span>
                    <span className="text-xl text-slate-700 font-black font-mono tracking-tighter">{voxelCount}</span>
                </div>
            </div>
        </div>

        {/* Utilities */}
        <div className="pointer-events-auto flex gap-3">
            <TactileButton
                onClick={onToggleInfo}
                color={isInfoVisible ? 'indigo' : 'slate'}
                icon={<Info size={20} strokeWidth={3} />}
                label="Info"
                compact
            />
            <TactileButton
                onClick={onToggleRotation}
                color={isAutoRotate ? 'sky' : 'slate'}
                icon={isAutoRotate ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                label={isAutoRotate ? "Pause Cam" : "Play Cam"}
                compact
            />
            <TactileButton
                onClick={onToggleGrid}
                color={isGridVisible ? 'indigo' : 'slate'}
                icon={<Grid size={20} strokeWidth={3} />}
                label="Grid"
                compact
            />
            <TactileButton
                onClick={onToggleGesture}
                color={isGestureActive ? 'rose' : 'slate'}
                icon={<Hand size={20} strokeWidth={3} />}
                label="Gestures"
                compact
            />
            <TactileButton
                onClick={onShowJson}
                color="slate"
                icon={<Code2 size={20} strokeWidth={3} />}
                label="Share"
                compact
            />
        </div>
      </div>

      {/* --- Loading Indicator --- */}
      {isGenerating && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300">
              <div className="bg-white/90 backdrop-blur-xl border-4 border-indigo-100 px-10 py-8 rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(79,70,229,0.3)] flex flex-col items-center gap-6 min-w-[320px]">
                  <div className="relative">
                      <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-20"></div>
                      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-4 rounded-2xl shadow-lg text-white animate-bounce">
                        <Loader2 size={40} className="animate-spin" strokeWidth={3} />
                      </div>
                  </div>
                  <div className="text-center space-y-2 w-full">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">Building...</h3>
                      <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                        <p className="text-indigo-600 font-bold text-sm transition-all duration-300 animate-pulse">
                            {LOADING_MESSAGES[loadingMsgIndex]}
                        </p>
                      </div>
                      
                      {/* Timer & Progress Bar */}
                      <div className="w-full mt-2">
                          <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                              <span>Time: {elapsedTime.toFixed(1)}s</span>
                              <span className={elapsedTime > 30 ? "text-rose-500" : "text-emerald-500"}>Target: 30s</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div 
                                  className={`h-full transition-all duration-100 ease-linear ${elapsedTime > 30 ? "bg-rose-500" : "bg-emerald-500"}`}
                                  style={{ width: `${Math.min((elapsedTime / 30) * 100, 100)}%` }}
                              />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- Bottom Control Center --- */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center items-end pointer-events-none">
        
        <div className="pointer-events-auto transition-all duration-500 ease-in-out transform">
            
            {/* STATE 1: STABLE -> DISMANTLE */}
            {isStable && (
                 <div className="animate-in slide-in-from-bottom-10 fade-in duration-300">
                     <BigActionButton 
                        onClick={onDismantle} 
                        icon={<Hammer size={32} strokeWidth={2.5} />} 
                        label="BREAK" 
                        color="rose" 
                     />
                 </div>
            )}

            {/* STATE 2: DISMANTLED -> REBUILD */}
            {/* Hide this menu if we are actively rebuilding (animating) or if we are generating new content */}
            {isDismantling && !isGenerating && (
                <div className="flex items-end gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
                     <DropdownMenu 
                        icon={<Wrench size={24} />}
                        label="Rebuild"
                        color="emerald"
                        direction="up"
                        big
                     >
                        <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">REBUILD</div>
                        
                        {/* Standard Presets */}
                        <DropdownItem onClick={() => onRebuild('Eagle')} icon={<Bird size={18}/>} label="Eagle" />
                        <DropdownItem onClick={() => onRebuild('Cat')} icon={<Cat size={18}/>} label="Cat" />
                        <DropdownItem onClick={() => onRebuild('Rabbit')} icon={<Rabbit size={18}/>} label="Rabbit" />
                        <DropdownItem onClick={() => onRebuild('Twins')} icon={<Users size={18}/>} label="Eagles x2" />
                        <DropdownItem onClick={() => onRebuild('Castle')} icon={<Castle size={18}/>} label="Castle" />
                        <DropdownItem onClick={() => onRebuild('Robot')} icon={<Bot size={18}/>} label="Robot" />
                        <DropdownItem onClick={() => onRebuild('Tree')} icon={<Trees size={18}/>} label="Tree" />
                        <DropdownItem onClick={() => onRebuild('Car')} icon={<Car size={18}/>} label="Car" />
                        <DropdownItem onClick={() => onRebuild('Boat')} icon={<Ship size={18}/>} label="Boat" />
                        <DropdownItem onClick={() => onRebuild('Plane')} icon={<Plane size={18}/>} label="Plane" />
                        <DropdownItem onClick={() => onRebuild('House')} icon={<Home size={18}/>} label="House" />
                        <DropdownItem onClick={() => onRebuild('Duck')} icon={<Bird size={18}/>} label="Duck" />
                        <DropdownItem onClick={() => onRebuild('Penguin')} icon={<Bird size={18}/>} label="Penguin" />
                        <DropdownItem onClick={() => onRebuild('Snowman')} icon={<Snowflake size={18}/>} label="Snowman" />
                        
                        <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">ANIME</div>
                        <DropdownItem onClick={() => onRebuild('Pikachu')} icon={<Zap size={18}/>} label="Pikachu" />
                        <DropdownItem onClick={() => onRebuild('Naruto')} icon={<Sparkles size={18}/>} label="Naruto" />
                        <DropdownItem onClick={() => onRebuild('Goku')} icon={<Sword size={18}/>} label="Goku" />
                        <DropdownItem onClick={() => onRebuild('Totoro')} icon={<Ghost size={18}/>} label="Totoro" />
                        <DropdownItem onClick={() => onRebuild('SailorMoon')} icon={<Moon size={18}/>} label="Sailor Moon" />

                        <div className="h-px bg-slate-100 my-1" />

                        {/* Custom Rebuilds */}
                        {customRebuilds.length > 0 && (
                            <>
                                <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">CUSTOM REBUILDS</div>
                                {customRebuilds.map((model, idx) => (
                                    <DropdownItem 
                                        key={`rebuild-${idx}`} 
                                        onClick={() => onSelectCustomRebuild(model)} 
                                        icon={<History size={18}/>} 
                                        label={model.name}
                                        truncate 
                                    />
                                ))}
                                <div className="h-px bg-slate-100 my-1" />
                            </>
                        )}

                        <DropdownItem onClick={onPromptMorph} icon={<Wand2 size={18}/>} label="New rebuild" highlight />
                     </DropdownMenu>
                </div>
            )}
        </div>
      </div>

    </div>
  );
};
