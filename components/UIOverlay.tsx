/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect, useRef } from 'react';
import { AppState, SavedModel, VoxelData } from '../types';
import { Box, Bird, Cat, Rabbit, Users, Code2, Wand2, Hammer, FolderOpen, ChevronUp, FileJson, History, Play, Pause, Info, Wrench, Loader2, Bot, Trees, Car, Ship, Plane, Home, Snowflake, Castle, Zap, Sword, Sparkles, Ghost, Moon, Hand } from 'lucide-react';

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
    slate:   'bg-slate-100 text-slate-600 border-slate-300 shadow-slate-200 hover:bg-slate-200',
    rose:    'bg-rose-400 text-white border-rose-600 shadow-rose-200 hover:bg-rose-500',
    sky:     'bg-sky-400 text-white border-sky-600 shadow-sky-200 hover:bg-sky-500',
    emerald: 'bg-emerald-400 text-white border-emerald-600 shadow-emerald-200 hover:bg-emerald-500',
    amber:   'bg-amber-400 text-white border-amber-600 shadow-amber-200 hover:bg-amber-500',
    indigo:  'bg-indigo-400 text-white border-indigo-600 shadow-indigo-200 hover:bg-indigo-500',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative flex items-center justify-center gap-2 rounded-2xl font-black text-sm transition-all duration-150
        border-b-[6px] active:border-b-0 active:translate-y-[6px] active:shadow-none
        ${compact ? 'p-3' : 'px-6 py-4'}
        ${disabled 
          ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed shadow-none border-b-0' 
          : `${colorStyles[color]} shadow-xl`}
      `}
    >
      {icon}
      {!compact && <span className="uppercase tracking-wider">{label}</span>}
    </button>
  );
};

const BigActionButton: React.FC<{onClick: () => void, icon: React.ReactNode, label: string, color: 'rose'}> = ({ onClick, icon, label, color }) => {
    return (
        <button 
            onClick={onClick}
            className="group relative flex flex-col items-center justify-center w-40 h-40 rounded-[2rem] bg-rose-500 hover:bg-rose-400 text-white shadow-2xl shadow-rose-900/40 border-b-[12px] border-rose-800 active:border-b-0 active:translate-y-[12px] active:shadow-none transition-all duration-150"
        >
            <div className="mb-2 transform group-hover:scale-110 transition-transform duration-200">{icon}</div>
            <div className="text-xl font-black tracking-widest uppercase">{label}</div>
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

    const bgClass = color === 'indigo' ? 'bg-indigo-400 hover:bg-indigo-500 border-indigo-600' : 'bg-emerald-400 hover:bg-emerald-500 border-emerald-600';
    const shadowClass = color === 'indigo' ? 'shadow-indigo-200' : 'shadow-emerald-200';

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 font-black text-white shadow-xl rounded-2xl transition-all active:scale-95 active:shadow-none
                    ${bgClass} ${shadowClass}
                    ${big ? 'px-8 py-5 text-xl border-b-[8px] active:border-b-0 active:translate-y-[8px]' : 'px-6 py-4 text-sm border-b-[6px] active:border-b-0 active:translate-y-[6px]'}
                `}
            >
                {icon}
                <span className="uppercase tracking-wider">{label}</span>
                <ChevronUp size={20} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${direction === 'down' ? 'rotate-180' : ''}`} strokeWidth={3} />
            </button>

            {isOpen && (
                <div className={`
                    absolute left-0 ${direction === 'up' ? 'bottom-full mb-4' : 'top-full mt-4'} 
                    w-64 max-h-[60vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border-4 border-slate-100 p-3 flex flex-col gap-2 animate-in fade-in zoom-in duration-200 z-50
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
                w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left
                ${highlight 
                    ? 'bg-sky-100 text-sky-600 hover:bg-sky-200' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}
            `}
        >
            <div className="shrink-0">{icon}</div>
            <span className={truncate ? "truncate w-full uppercase" : "uppercase"}>{label}</span>
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
  isGestureActive: boolean;
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
  isGestureActive
}) => {
  const isStable = appState === AppState.STABLE;
  const isDismantling = appState === AppState.DISMANTLING;
  const isRebuilding = appState === AppState.REBUILDING;
  
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  useEffect(() => {
    if (isGenerating) {
        const interval = setInterval(() => {
            setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);
        return () => clearInterval(interval);
    } else {
        setLoadingMsgIndex(0);
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

            <div className="flex items-center gap-4 px-6 py-3 bg-white shadow-xl rounded-2xl border-b-[6px] border-slate-200 text-slate-500 font-bold w-fit mt-2">
                <div className="bg-blue-100 p-2 rounded-xl text-blue-500 shadow-inner">
                    <Box size={24} strokeWidth={3} />
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Voxels</span>
                    <span className="text-2xl text-slate-700 font-black font-mono tracking-tighter">{voxelCount}</span>
                </div>
            </div>
        </div>

        {/* Utilities */}
        <div className="pointer-events-auto flex gap-2">
            <TactileButton
                onClick={onToggleInfo}
                color={isInfoVisible ? 'indigo' : 'slate'}
                icon={<Info size={18} strokeWidth={2.5} />}
                label="Info"
                compact
            />
            <TactileButton
                onClick={onToggleRotation}
                color={isAutoRotate ? 'sky' : 'slate'}
                icon={isAutoRotate ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                label={isAutoRotate ? "Pause Cam" : "Play Cam"}
                compact
            />
            <TactileButton
                onClick={onToggleGesture}
                color={isGestureActive ? 'rose' : 'slate'}
                icon={<Hand size={18} strokeWidth={2.5} />}
                label="Gestures"
                compact
            />
            <TactileButton
                onClick={onShowJson}
                color="slate"
                icon={<Code2 size={18} strokeWidth={2.5} />}
                label="Share"
            />
        </div>
      </div>

      {/* --- Loading Indicator --- */}
      {isGenerating && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300">
              <div className="bg-white/90 backdrop-blur-md border-2 border-indigo-100 px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 min-w-[280px]">
                  <div className="relative">
                      <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-20"></div>
                      <Loader2 size={48} className="text-indigo-500 animate-spin" />
                  </div>
                  <div className="text-center">
                      <h3 className="text-lg font-extrabold text-slate-800">Gemini is Building...</h3>
                      <p className="text-slate-500 font-bold text-sm transition-all duration-300">
                          {LOADING_MESSAGES[loadingMsgIndex]}
                      </p>
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
