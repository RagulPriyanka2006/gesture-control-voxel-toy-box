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
  const velocityHistory = useRef<{x: number, y: number}[]>([]);
  const cooldown = useRef<number>(0);
  const twoHandsFrameCount = useRef<number>(0); // Counter for stable 2-hand detection

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

            // --- PRIORITY GESTURE: REBUILD (Two Hands Visible) ---
            if (results.multiHandLandmarks.length === 2) {
                // User Request: "rebuild = only when am showing both hands"
                // FIX: "rebuild is automically rebuilded without showing two hands"
                // We now require 2 hands to be detected for multiple consecutive frames (stability check)
                twoHandsFrameCount.current++;

                if (twoHandsFrameCount.current > 10) { // Approx 0.3-0.5s of stable detection
                    if (now > cooldown.current) {
                        onGestureRef.current('reset');
                        setTriggerAction('REBUILDING!');
                        cooldown.current = now + 2000;
                        twoHandsFrameCount.current = 0; // Reset after trigger
                    }
                    setDetectedGesture('🙌 Rebuild Detected');
                } else {
                     setDetectedGesture('🙌 Hold for Rebuild...');
                }
                
                canvasCtx.restore();
                return; // Stop processing other gestures
            } else {
                twoHandsFrameCount.current = 0; // Reset if not 2 hands
            }

            // --- SINGLE HAND GESTURES (Shake/Swipe) ---
            const landmarks = results.multiHandLandmarks[0];
            const palm = landmarks[0]; // Wrist/Palm base
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

            // Continuous State Update
            setDetectedGesture(_isFist ? '✊ Fist' : '✋ Open');

            // --- SMASH LOGIC: Punch or Fast Swing ---
            // User Request: "smash when was punch , and the punch was not easy it complex"
            if (lastPalmPos.current) {
                const dx = palm.x - lastPalmPos.current.x;
                const dy = palm.y - lastPalmPos.current.y;
                const dz = palm.z - lastPalmPos.current.z; // Depth change (negative is closer to camera)
                
                // Add to history
                velocityHistory.current.push({x: dx, y: dy});
                if (velocityHistory.current.length > 10) velocityHistory.current.shift();

                const speed = Math.sqrt(dx*dx + dy*dy);

                // SIMPLIFIED SMASH DETECTION
                // Trigger if:
                // 1. Punching towards screen (negative Z)
                // 2. OR Moving very fast in any direction (Swing)
                // AND must be a fist
                
                const isPunching = dz < -0.04; // Relaxed from -0.05
                const isFastSwing = speed > 0.3; // Fast lateral movement
                
                if (_isFist && (isPunching || isFastSwing)) {
                     onGestureRef.current('punch');
                     setTriggerAction('SMASH!');
                     cooldown.current = now + 800; // Reduced cooldown slightly
                     velocityHistory.current = [];
                     canvasCtx.restore();
                     return;
                }

                // 3. SHAKE DETECTION (Backup)
                // Analyze Shake: high velocity with frequent direction reversals
                let reversalsX = 0;
                let reversalsY = 0;
                let totalMotion = 0;

                for (let i = 1; i < velocityHistory.current.length; i++) {
                    const v = velocityHistory.current[i];
                    const prev = velocityHistory.current[i-1];
                    
                    if (Math.abs(v.x) > 0.05 && Math.abs(prev.x) > 0.05 && Math.sign(v.x) !== Math.sign(prev.x)) reversalsX++;
                    if (Math.abs(v.y) > 0.05 && Math.abs(prev.y) > 0.05 && Math.sign(v.y) !== Math.sign(prev.y)) reversalsY++;
                    
                    totalMotion += Math.abs(v.x) + Math.abs(v.y);
                }

                if ((reversalsX >= 2 || reversalsY >= 2) && totalMotion > 0.45) {
                    onGestureRef.current('punch');
                    setTriggerAction('SMASH!');
                    cooldown.current = now + 1000;
                    velocityHistory.current = [];
                }
            }

            // --- SWIPE LOGIC ---
            if (lastPalmPos.current && !_isFist) {
                const dx = palm.x - lastPalmPos.current.x;
                const dy = palm.y - lastPalmPos.current.y;
                
                const velocityX = dx; 
                const velocityY = dy; 
                
                // Increased swipe threshold to 0.2 to prevent "spilling" (accidental swipes)
                const SWIPE_THRESHOLD = 0.2;
                
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
            velocityHistory.current = []; // Reset history if hand lost
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
                <div className="bg-white text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600 px-16 py-8 rounded-[3rem] font-black text-8xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in duration-200 border-[12px] border-white transform -rotate-6 backdrop-blur-md ring-8 ring-black/5">
                    {triggerAction}
                </div>
            </div>
        )}

        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-[6px] border-white bg-slate-900 w-72 h-52 ring-4 ring-black/5">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold bg-slate-800 animate-pulse">
                        Starting Camera...
                    </div>
                )}
                {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center text-rose-400 font-bold bg-slate-900 p-6 text-center">
                        Camera access denied or unavailable.
                    </div>
                )}
                
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    width={320}
                    height={240}
                    className="absolute inset-0 w-full h-full object-cover opacity-40" // Show slightly faded video in box
                    mirrored={true}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={1}
                    videoConstraints={{ facingMode: "user" }}
                    disablePictureInPicture={true}
                    forceScreenshotSourceSize={true}
                    imageSmoothing={true}
                    onUserMedia={() => {}}
                    onUserMediaError={() => {}}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" // Mirror canvas to match webcam mirror
                />
                
                {/* Overlay UI */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
                    <div className={`text-xs font-black px-3 py-1.5 rounded-full backdrop-blur-md transition-all shadow-sm border border-white/20 ${detectedGesture.includes('Fist') ? 'bg-rose-500 text-white animate-pulse' : 'bg-black/60 text-white'}`}>
                        {detectedGesture}
                    </div>
                </div>
                
                <button 
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-rose-500 rounded-full text-white transition-all backdrop-blur-sm border border-white/20 hover:scale-110"
                >
                    <X size={16} strokeWidth={3} />
                </button>
            </div>
            
            <div className="mt-4 bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] text-xs font-medium text-slate-600 max-w-[280px] border-2 border-white ring-1 ring-black/5">
                <div className="flex items-center gap-2 mb-3 text-indigo-600 font-black uppercase tracking-wider text-[10px]">
                    <Hand size={14} strokeWidth={3} /> Gesture Controls
                </div>
                <ul className="space-y-2">
                    <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-800">Punch / Swing</span> 
                        <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">SMASH</span>
                    </li>
                    <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-800">Swipe</span>
                        <span className="text-[10px] font-black bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full">SCATTER</span>
                    </li>
                    <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-800">Two Hands</span>
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">REBUILD</span>
                    </li>
                </ul>
            </div>
        </div>
    </>
  );
};
