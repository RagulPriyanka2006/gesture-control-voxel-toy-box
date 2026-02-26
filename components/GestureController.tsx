import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Hand, X } from 'lucide-react';
import * as THREE from 'three';

interface GestureControllerProps {
  onGesture: (action: 'punch' | 'swipe' | 'reset', direction?: THREE.Vector3) => void;
  onHandMove?: (x: number, y: number, isFist: boolean) => void;
  isActive: boolean;
  onClose: () => void;
}

export const GestureController: React.FC<GestureControllerProps> = ({ onGesture, onHandMove, isActive, onClose }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detectedGesture, setDetectedGesture] = useState<string>('None');
  const [triggerAction, setTriggerAction] = useState<string | null>(null);

  // Gesture State
  const lastGesture = useRef<string>('None');
  const gestureStartTime = useRef<number>(0);
  const lastPalmPos = useRef<{x: number, y: number, z: number} | null>(null);
  const cooldown = useRef<number>(0);
  const twoHandsStartTime = useRef<number | null>(null);

  const onGestureRef = useRef(onGesture);
  const onHandMoveRef = useRef(onHandMove);
  
  useEffect(() => {
      onGestureRef.current = onGesture;
      onHandMoveRef.current = onHandMove;
  }, [onGesture, onHandMove]);

  useEffect(() => {
      if (triggerAction) {
          const timer = setTimeout(() => setTriggerAction(null), 1000);
          return () => clearTimeout(timer);
      }
  }, [triggerAction]);

  useEffect(() => {
    if (!isActive) return;

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results) => {
        if (!canvasRef.current || !webcamRef.current?.video) return;

        const videoWidth = webcamRef.current.video.videoWidth;
        const videoHeight = webcamRef.current.video.videoHeight;
        
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
        
        const canvasCtx = canvasRef.current.getContext('2d');
        if (!canvasCtx) return;

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Draw video frame
        canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

        const now = Date.now();

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // Draw all hands
            for (const landmarks of results.multiHandLandmarks) {
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
                drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1 });
            }

            // --- PRIORITY GESTURE: REBUILD (Two Hands Visible & Steady) ---
            if (results.multiHandLandmarks.length === 2) {
                // Check for "Clap" (Smash) vs "Praying" (Rebuild)
                // Clap is fast approach. Praying is steady holding.
                
                const hand1 = results.multiHandLandmarks[0];
                const hand2 = results.multiHandLandmarks[1];
                const h1Wrist = hand1[0];
                const h2Wrist = hand2[0];
                const wristDist = Math.hypot(h1Wrist.x - h2Wrist.x, h1Wrist.y - h2Wrist.y);
                
                // CLAP DETECTION (Smash)
                // If hands are very close and moving fast? 
                // Simplified: If hands are close but NOT held steady (i.e. just arrived), maybe trigger?
                // Actually, let's keep it simple: 
                // Rebuild = HOLD for 1.5s.
                // Smash = Fast movement of ANY hand.
                
                // Rebuild Logic
                if (twoHandsStartTime.current === null) {
                    twoHandsStartTime.current = now;
                } else if (now - twoHandsStartTime.current > 1500) { // Increased to 1.5s for safety
                    if (now > cooldown.current) {
                        onGestureRef.current('reset');
                        setTriggerAction('MAGIC REBUILD! ✨');
                        cooldown.current = now + 2000;
                        twoHandsStartTime.current = null;
                    }
                }
                
                const progress = twoHandsStartTime.current ? Math.min(1, (now - twoHandsStartTime.current) / 1500) : 0;
                setDetectedGesture(`🙌 Hold to Fix! ${Math.round(progress * 100)}%`);
                
                // Allow smash processing even with 2 hands (e.g. double slap)
                // But return if rebuilding is imminent
                if (progress > 0.8) {
                    canvasCtx.restore();
                    return;
                }
            } else {
                twoHandsStartTime.current = null;
            }

            // --- SINGLE HAND GESTURES (Smash/Swipe) ---
            const landmarks = results.multiHandLandmarks[0];
            const palm = landmarks[0]; 
            const _isFist = isFist(landmarks);

            // Continuous Hand Tracking
            const ndcX = (palm.x * 2) - 1; 
            const ndcY = -((palm.y * 2) - 1); 

            if (onHandMoveRef.current) {
                onHandMoveRef.current(ndcX, ndcY, _isFist);
            }
            
            if (now < cooldown.current) {
                canvasCtx.restore();
                return;
            }

            setDetectedGesture(_isFist ? '✊ Fist' : '✋ Hand');

            // --- SMASH LOGIC: ANY Fast Movement (Punch or Slap) ---
            if (lastPalmPos.current) {
                const dx = palm.x - lastPalmPos.current.x;
                const dy = palm.y - lastPalmPos.current.y;
                const speed = Math.hypot(dx, dy);
                
                // Kid-friendly threshold: 0.2 is easy to hit with a quick wave/slap
                if (speed > 0.2) {
                    onGestureRef.current('punch');
                    setTriggerAction('POW! 💥'); // Fun text
                    cooldown.current = now + 600; // Faster cooldown for fun
                }
            }

            // --- SWIPE LOGIC ---
            if (lastPalmPos.current && !_isFist) {
                const dx = palm.x - lastPalmPos.current.x;
                const dy = palm.y - lastPalmPos.current.y;
                
                const velocityX = dx; 
                const velocityY = dy; 
                
                const SWIPE_THRESHOLD = 0.15;
                
                if (Math.abs(velocityX) > Math.abs(velocityY)) {
                    if (Math.abs(velocityX) > SWIPE_THRESHOLD) {
                        const direction = velocityX > 0 ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(1, 0, 0);
                        onGestureRef.current('swipe', direction);
                        setTriggerAction(velocityX > 0 ? 'SWIPE LEFT!' : 'SWIPE RIGHT!');
                        cooldown.current = now + 800;
                    }
                } else {
                    if (Math.abs(velocityY) > SWIPE_THRESHOLD) {
                        const direction = velocityY > 0 ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 1, 0);
                        onGestureRef.current('swipe', direction);
                        setTriggerAction(velocityY > 0 ? 'SWIPE DOWN!' : 'SWIPE UP!');
                        cooldown.current = now + 800;
                    }
                }
            }
            
            if (_isFist !== (lastGesture.current === 'Fist')) {
                gestureStartTime.current = now;
            }
            
            lastGesture.current = _isFist ? 'Fist' : 'Open';
            lastPalmPos.current = palm;

        } else {
            setDetectedGesture('No Hand Detected');
            twoHandsStartTime.current = null;
        }
        
        canvasCtx.restore();
    });

    let camera: Camera | null = null;

    if (webcamRef.current && webcamRef.current.video) {
      camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current && webcamRef.current.video) {
            await hands.send({ image: webcamRef.current.video });
          }
        },
        width: 320,
        height: 240
      });
      camera.start()
        .then(() => setLoading(false))
        .catch(err => {
            console.error("Camera start error", err);
            setCameraError(true);
            setLoading(false);
        });
    }

    return () => {
      if (camera) camera.stop();
      hands.close();
    };
  }, [isActive]);

  const isFist = (landmarks: any[]) => {
    // Check if fingers are curled
    // Tip should be closer to wrist than PIP
    const wrist = landmarks[0];
    const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
    const pips = [6, 10, 14, 18];
    const mcps = [5, 9, 13, 17]; // Knuckles

    let curledCount = 0;
    for (let i = 0; i < tips.length; i++) {
        const tip = landmarks[tips[i]];
        const pip = landmarks[pips[i]];
        const mcp = landmarks[mcps[i]];
        
        // Simple distance check to wrist
        const distTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const distPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
        const distMcp = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
        
        // Stricter check: Tip must be closer than PIP AND MCP
        if (distTip < distPip && distTip < distMcp) {
             curledCount++;
        }
    }
    
    return curledCount === 4; // Require all 4 fingers to be tightly curled
  };

  if (!isActive) return null;

  return (
    <>
        {/* Full Screen Feedback Overlay */}
        {triggerAction && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 text-indigo-600 px-12 py-6 rounded-3xl font-black text-5xl shadow-2xl animate-in zoom-in duration-150 border-8 border-indigo-200 transform rotate-[-5deg] backdrop-blur-sm">
                    {triggerAction}
                </div>
            </div>
        )}

        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end animate-in slide-in-from-bottom-10 fade-in duration-300">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-black w-64 h-48">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold bg-slate-800">
                    Starting Camera...
                </div>
            )}
            {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center text-rose-400 font-bold bg-slate-900 p-4 text-center">
                    Camera access denied or unavailable.
                </div>
            )}
            
            <Webcam
            ref={webcamRef}
            audio={false}
            width={320}
            height={240}
            className="absolute inset-0 w-full h-full object-cover opacity-0" // Hide raw video, show canvas
            mirrored={true}
            />
            <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" // Mirror canvas to match webcam mirror
            />
            
            {/* Overlay UI */}
            <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                <div className={`text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm transition-colors ${detectedGesture.includes('Fist') ? 'bg-rose-500/80 text-white' : 'bg-black/60 text-white'}`}>
                    {detectedGesture}
                </div>
            </div>
            
            <button 
                onClick={onClose}
                className="absolute top-2 right-2 p-1 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
            >
                <X size={16} />
            </button>
        </div>
        
        <div className="mt-2 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg text-xs font-medium text-slate-600 max-w-[256px]">
            <div className="flex items-center gap-2 mb-1 text-indigo-600 font-bold">
                <Hand size={14} /> Gesture Controls
            </div>
            <ul className="space-y-1 list-disc list-inside">
                <li><span className="font-bold text-slate-800">Fast Punch:</span> Smash</li>
                <li><span className="font-bold text-slate-800">Swipe:</span> Scatter</li>
                <li><span className="font-bold text-slate-800">Show 2 Hands:</span> Hold to Rebuild</li>
            </ul>
        </div>
        </div>
    </>
  );
};
