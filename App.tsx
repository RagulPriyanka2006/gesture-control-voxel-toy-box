/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useEffect, useRef, useState } from 'react';
import { VoxelEngine } from './services/VoxelEngine';
import { UIOverlay } from './components/UIOverlay';
import { JsonModal } from './components/JsonModal';
import { PromptModal } from './components/PromptModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { GestureController } from './components/GestureController';
import { Generators } from './utils/voxelGenerators';
import { AppState, VoxelData, SavedModel } from './types';
import { GoogleGenAI, Type } from "@google/genai";
import * as THREE from 'three';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  
  const [appState, setAppState] = useState<AppState>(AppState.STABLE);
  const [voxelCount, setVoxelCount] = useState<number>(0);
  
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonModalMode, setJsonModalMode] = useState<'view' | 'import'>('view');
  
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptMode, setPromptMode] = useState<'create' | 'morph'>('create');
  
  const [showWelcome, setShowWelcome] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [jsonData, setJsonData] = useState('');
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [isGridVisible, setIsGridVisible] = useState(false);

  // --- State for Custom Models ---
  const [currentBaseModel, setCurrentBaseModel] = useState<string>('Eagle');
  const [customBuilds, setCustomBuilds] = useState<SavedModel[]>([]);
  const [customRebuilds, setCustomRebuilds] = useState<SavedModel[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Engine
    const engine = new VoxelEngine(
      containerRef.current,
      (newState) => setAppState(newState),
      (count) => setVoxelCount(count)
    );

    engineRef.current = engine;

    // Initial Model Load
    engine.loadInitialModel(Generators.Eagle());

    // Resize Listener
    const handleResize = () => engine.handleResize();
    window.addEventListener('resize', handleResize);

    // Auto-hide welcome screen after interaction (optional, but sticking to simple toggle for now)
    // For now, just auto-hide after 5s or user dismiss
    const timer = setTimeout(() => setShowWelcome(false), 5000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
      engine.cleanup();
    };
  }, []);

  const handleDismantle = () => {
    engineRef.current?.dismantle();
  };

  const handleNewScene = (type: keyof typeof Generators | string) => {
    const animeCharacters = ['Pikachu', 'Naruto', 'Goku', 'Totoro', 'SailorMoon'];
    
    if (animeCharacters.includes(type)) {
        // Use AI for high-fidelity anime characters
        setPromptMode('create');
        // We need to wait for state update or pass override. 
        // Since we can't easily wait, we'll modify handlePromptSubmit to accept mode.
        generateWithAI(type, 'create');
        return;
    }

    const generator = Generators[type as keyof typeof Generators];
    if (generator && engineRef.current) {
      engineRef.current.loadInitialModel(generator());
      setCurrentBaseModel(type);
    }
  };

  const handleSelectCustomBuild = (model: SavedModel) => {
      if (engineRef.current) {
          engineRef.current.loadInitialModel(model.data);
          setCurrentBaseModel(model.name);
      }
  };

  const handleRebuild = (type: keyof typeof Generators | string) => {
    const animeCharacters = ['Pikachu', 'Naruto', 'Goku', 'Totoro', 'SailorMoon'];

    if (animeCharacters.includes(type)) {
        setPromptMode('morph');
        generateWithAI(type, 'morph');
        return;
    }

    const generator = Generators[type as keyof typeof Generators];
    if (generator && engineRef.current) {
      engineRef.current.rebuild(generator());
    }
  };

  // Helper to bypass the modal and trigger AI directly
  const generateWithAI = async (character: string, mode: 'create' | 'morph') => {
      if (!process.env.API_KEY) return;
      
      setIsGenerating(true);
      
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        // OPTIMIZATION: Use Flash model for speed (<30s target)
        const model = 'gemini-3-flash-preview';
        
        let systemContext = "";
        if (mode === 'morph' && engineRef.current) {
            const availableColors = engineRef.current.getUniqueColors().join(', ');
            systemContext = `
                CONTEXT: You are re-assembling an existing pile of lego-like voxels.
                The current pile consists of these colors: [${availableColors}].
                TRY TO USE THESE COLORS if they fit the requested shape.
                If the requested shape absolutely requires different colors, you may use them, but prefer the existing palette to create a "rebuilding" effect.
                The model should be roughly the same volume as the previous one.
            `;
        } else {
            systemContext = `
                CONTEXT: You are a master voxel artist creating "100% REAL" high-fidelity models.
                STYLE: Photorealistic, highly detailed, anatomically accurate.
                - TEXTURE: Use color variations to simulate texture (e.g., fur patterns, skin shading, metal rust).
                - PROPORTIONS: Ensure character proportions are accurate to their source material (anime/realism).
                - LIGHTING: Use lighter/darker shades of the same color to bake in ambient occlusion and lighting.
                - COLOR: Use a rich, grounded palette. Avoid flat primary colors.
            `;
        }

        const prompt = `A 100% REALISTIC, HIGH-FIDELITY, ANATOMICALLY ACCURATE voxel model of ${character}. Capture every detail, correct colors, and signature pose.`;

        const response = await ai.models.generateContent({
            model,
            contents: `
                    ${systemContext}
                    
                    Task: ${prompt}
                    
                    Strict Rules:
                    1. Use approximately 100 to 300 voxels for EXTREME SPEED.
                    2. The model must be centered at x=0, z=0.
                    3. The bottom of the model must be at y=0 or slightly higher.
                    4. Ensure the structure is physically plausible (connected).
                    5. Coordinates should be integers.
                    6. CRITICAL: Use gradient colors to simulate curvature and depth.
                    7. Prioritize face detail and signature features.
                    
                    Return ONLY a JSON array of objects.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            x: { type: Type.INTEGER },
                            y: { type: Type.INTEGER },
                            z: { type: Type.INTEGER },
                            color: { type: Type.STRING, description: "Hex color code e.g. #FF5500" }
                        },
                        required: ["x", "y", "z", "color"]
                    }
                }
            }
        });

        if (response.text) {
            const rawData = JSON.parse(response.text);
            const voxelData: VoxelData[] = rawData.map((v: any) => {
                let colorStr = v.color;
                if (colorStr.startsWith('#')) colorStr = colorStr.substring(1);
                const colorInt = parseInt(colorStr, 16);
                return {
                    x: v.x, y: v.y, z: v.z,
                    color: isNaN(colorInt) ? 0xCCCCCC : colorInt
                };
            });

            if (engineRef.current) {
                if (mode === 'create') {
                    engineRef.current.loadInitialModel(voxelData);
                    setCustomBuilds(prev => [...prev, { name: character, data: voxelData }]);
                    setCurrentBaseModel(character);
                } else {
                    engineRef.current.rebuild(voxelData);
                    setCustomRebuilds(prev => [...prev, { 
                        name: character, 
                        data: voxelData,
                        baseModel: currentBaseModel 
                    }]);
                }
            }
        }
      } catch (err) {
          console.error("AI Generation failed", err);
          alert("Failed to generate realistic model. Please try again.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSelectCustomRebuild = (model: SavedModel) => {
      if (engineRef.current) {
          engineRef.current.rebuild(model.data);
      }
  };

  const handleShowJson = () => {
    if (engineRef.current) {
      setJsonData(engineRef.current.getJsonData());
      setJsonModalMode('view');
      setIsJsonModalOpen(true);
    }
  };

  const handleImportClick = () => {
      setJsonModalMode('import');
      setIsJsonModalOpen(true);
  };

  const handleJsonImport = (jsonStr: string) => {
      try {
          const rawData = JSON.parse(jsonStr);
          if (!Array.isArray(rawData)) throw new Error("JSON must be an array");

          const voxelData: VoxelData[] = rawData.map((v: any) => {
              let colorVal = v.c || v.color;
              let colorInt = 0xCCCCCC;

              if (typeof colorVal === 'string') {
                  if (colorVal.startsWith('#')) colorVal = colorVal.substring(1);
                  colorInt = parseInt(colorVal, 16);
              } else if (typeof colorVal === 'number') {
                  colorInt = colorVal;
              }

              return {
                  x: Number(v.x) || 0,
                  y: Number(v.y) || 0,
                  z: Number(v.z) || 0,
                  color: isNaN(colorInt) ? 0xCCCCCC : colorInt
              };
          });
          
          if (engineRef.current) {
              engineRef.current.loadInitialModel(voxelData);
              setCurrentBaseModel('Imported Build');
          }
      } catch (e) {
          console.error("Failed to import JSON", e);
          alert("Failed to import JSON. Please ensure the format is correct.");
      }
  };

  const openPrompt = (mode: 'create' | 'morph') => {
      setPromptMode(mode);
      setIsPromptModalOpen(true);
  }
  
  const handleToggleRotation = () => {
      const newState = !isAutoRotate;
      setIsAutoRotate(newState);
      if (engineRef.current) {
          engineRef.current.setAutoRotate(newState);
      }
  }

  const handleToggleGrid = () => {
      const newState = !isGridVisible;
      setIsGridVisible(newState);
      if (engineRef.current) {
          engineRef.current.setGridVisible(newState);
      }
  }

  const handleHandMove = (x: number, y: number, isFist: boolean) => {
      if (engineRef.current) {
          engineRef.current.setHandPosition(x, y, isFist);
      }
  };

  const handleGesture = (action: 'punch' | 'swipe' | 'reset', direction?: THREE.Vector3) => {
      if (!engineRef.current) return;

      if (action === 'punch') {
          engineRef.current.dismantle('explode');
      } else if (action === 'swipe') {
          if (engineRef.current.state === AppState.DISMANTLING) {
              // If already dismantling, apply force to particles
              if (direction) engineRef.current.applyForce(direction, 0.8);
          } else {
              // If stable, DO NOTHING. User requested: "dont break the model when swipe"
          }
      } else if (action === 'reset') {
          // Auto-rebuild the current model
          const generator = Generators[currentBaseModel as keyof typeof Generators];
          if (generator) {
              engineRef.current.rebuild(generator());
          } else {
              // If it's a custom model (AI generated), we need to find it in customBuilds/Rebuilds
              const custom = customBuilds.find(c => c.name === currentBaseModel) || customRebuilds.find(c => c.name === currentBaseModel);
              if (custom) {
                  engineRef.current.rebuild(custom.data);
              }
          }
      }
  };

  const handlePromptSubmit = async (prompt: string, imageBase64?: string) => {
    if (!process.env.API_KEY) {
        throw new Error("API Key not found");
    }

    setIsGenerating(true);
    // Close modal immediately so we can show the main loading indicator
    setIsPromptModalOpen(false);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        // OPTIMIZATION: Use Flash model for speed (<30s target)
        const model = 'gemini-3-flash-preview';
        
        let systemContext = "";
        if (promptMode === 'morph' && engineRef.current) {
            const availableColors = engineRef.current.getUniqueColors().join(', ');
            systemContext = `
                CONTEXT: You are re-assembling an existing pile of lego-like voxels.
                The current pile consists of these colors: [${availableColors}].
                TRY TO USE THESE COLORS if they fit the requested shape.
                If the requested shape absolutely requires different colors, you may use them, but prefer the existing palette to create a "rebuilding" effect.
                The model should be roughly the same volume as the previous one.
            `;
        } else {
            systemContext = `
                CONTEXT: You are a master voxel artist creating "100% REAL" high-fidelity models.
                STYLE: Photorealistic, highly detailed, anatomically accurate.
                - TEXTURE: Use color variations to simulate texture (e.g., fur patterns, skin shading, metal rust).
                - PROPORTIONS: Ensure character proportions are accurate to their source material (anime/realism).
                - LIGHTING: Use lighter/darker shades of the same color to bake in ambient occlusion and lighting.
                - COLOR: Use a rich, grounded palette. Avoid flat primary colors.
            `;
        }

        const parts: any[] = [];
        
        if (imageBase64) {
            const mimeType = imageBase64.split(';')[0].split(':')[1];
            const data = imageBase64.split(',')[1];
            parts.push({
                inlineData: {
                    mimeType,
                    data
                }
            });
        }

        parts.push({
            text: `
                    ${systemContext}
                    
                    Task: Generate a 100% REALISTIC, HIGH-FIDELITY voxel model that looks like a high-quality PLASTIC TOY.
                    ${prompt ? `User Request: "${prompt}"` : ''}
                    ${imageBase64 ? 'REFERENCE IMAGE PROVIDED: You MUST analyze the attached image and recreate it as a 3D voxel model. Capture the pose, colors, and proportions exactly.' : ''}
                    
                    Strict Rules:
                    1. Use approximately 100 to 300 voxels for EXTREME SPEED.
                    2. The model must be centered at x=0, z=0.
                    3. The bottom of the model must be at y=0 or slightly higher.
                    4. Ensure the structure is physically plausible (connected).
                    5. Coordinates should be integers.
                    6. CRITICAL: Use VIBRANT, SATURATED colors to look like a toy.
                    7. If the subject is a character (e.g., Anime), prioritize face detail and signature features.
                    8. Avoid dark or muddy colors. Use bright primaries and pastels.
                    
                    Return ONLY a JSON array of objects.`
        });

        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            x: { type: Type.INTEGER },
                            y: { type: Type.INTEGER },
                            z: { type: Type.INTEGER },
                            color: { type: Type.STRING, description: "Hex color code e.g. #FF5500" }
                        },
                        required: ["x", "y", "z", "color"]
                    }
                }
            }
        });

        if (response.text) {
            const rawData = JSON.parse(response.text);
            
            // Validate and transform to VoxelData
            const voxelData: VoxelData[] = rawData.map((v: any) => {
                let colorStr = v.color;
                if (colorStr.startsWith('#')) colorStr = colorStr.substring(1);
                const colorInt = parseInt(colorStr, 16);
                
                return {
                    x: v.x,
                    y: v.y,
                    z: v.z,
                    color: isNaN(colorInt) ? 0xCCCCCC : colorInt
                };
            });

            if (engineRef.current) {
                const name = prompt || "Image Build";
                if (promptMode === 'create') {
                    engineRef.current.loadInitialModel(voxelData);
                    setCustomBuilds(prev => [...prev, { name, data: voxelData }]);
                    setCurrentBaseModel(name);
                } else {
                    engineRef.current.rebuild(voxelData);
                    // Store baseModel to scope this rebuild to the current scene
                    setCustomRebuilds(prev => [...prev, { 
                        name, 
                        data: voxelData,
                        baseModel: currentBaseModel 
                    }]);
                }
            }
        }
    } catch (err) {
        console.error("Generation failed", err);
        alert("Oops! Something went wrong generating the model.");
    } finally {
        setIsGenerating(false);
    }
  };

  // Filter rebuilds to only show those relevant to the current base model
  const relevantRebuilds = customRebuilds.filter(
      r => r.baseModel === currentBaseModel
  );

  return (
    <div className="relative w-full h-screen bg-[#f0f2f5] overflow-hidden">
      {/* 3D Container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      {/* UI Overlay */}
      <UIOverlay 
        voxelCount={voxelCount}
        appState={appState}
        currentBaseModel={currentBaseModel}
        customBuilds={customBuilds}
        customRebuilds={relevantRebuilds} 
        isAutoRotate={isAutoRotate}
        isInfoVisible={showWelcome}
        isGenerating={isGenerating}
        onDismantle={handleDismantle}
        onRebuild={handleRebuild}
        onNewScene={handleNewScene}
        onSelectCustomBuild={handleSelectCustomBuild}
        onSelectCustomRebuild={handleSelectCustomRebuild}
        onPromptCreate={() => openPrompt('create')}
        onPromptMorph={() => openPrompt('morph')}
        onShowJson={handleShowJson}
        onImportJson={handleImportClick}
        onToggleRotation={handleToggleRotation}
        onToggleInfo={() => setShowWelcome(!showWelcome)}
        onToggleGesture={() => setIsGestureActive(!isGestureActive)}
        onToggleGrid={handleToggleGrid}
        isGestureActive={isGestureActive}
        isGridVisible={isGridVisible}
      />

      <GestureController 
        isActive={isGestureActive}
        onGesture={handleGesture}
        onHandMove={handleHandMove}
        onClose={() => setIsGestureActive(false)}
      />

      {/* Modals & Screens */}
      
      <WelcomeScreen visible={showWelcome} />

      <JsonModal 
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        data={jsonData}
        isImport={jsonModalMode === 'import'}
        onImport={handleJsonImport}
      />

      <PromptModal
        isOpen={isPromptModalOpen}
        mode={promptMode}
        onClose={() => setIsPromptModalOpen(false)}
        onSubmit={handlePromptSubmit}
      />
    </div>
  );
};

export default App;
