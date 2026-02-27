
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AppState, SimulationVoxel, RebuildTarget, VoxelData } from '../types';
import { CONFIG, COLORS } from '../utils/voxelConstants';

export class VoxelEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private instanceMesh: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  private gridHelper: THREE.GridHelper;
  
  private voxels: SimulationVoxel[] = [];
  private rebuildTargets: RebuildTarget[] = [];
  private rebuildStartTime: number = 0;
  private dismantleStartTime: number = 0;
  
  private state: AppState = AppState.STABLE;
  private onStateChange: (state: AppState) => void;
  private onCountChange: (count: number) => void;
  private animationId: number = 0;
  
  private handAttractor: THREE.Vector3 | null = null;
  private lastHandUpdate: number = 0;
  private shakeIntensity: number = 0;

  constructor(
    container: HTMLElement, 
    onStateChange: (state: AppState) => void,
    onCountChange: (count: number) => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onCountChange = onCountChange;

    // Init Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.BG_COLOR);
    this.scene.fog = new THREE.Fog(CONFIG.BG_COLOR, 60, 140); // Reduced haze

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Zoomed in start position - Closer to reduce empty space
    this.camera.position.set(10, 10, 20);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.target.set(0, 5, 0);

    // Lights
    // 1. Ambient - Lower intensity for better contrast
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    // 2. Hemisphere - Soft fill
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.5);
    hemiLight.position.set(0, 200, 0);
    this.scene.add(hemiLight);

    // 3. Key Light (Directional) - Stronger, slightly warmer
    const dirLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.bias = -0.0001;
    dirLight.shadow.radius = 2; // Soft shadows
    this.scene.add(dirLight);

    // 4. Rim Light (Spot) - Cool backlight to separate model from background
    const rimLight = new THREE.SpotLight(0xddeeff, 3.0);
    rimLight.position.set(-40, 50, -40);
    rimLight.lookAt(0, 0, 0);
    rimLight.penumbra = 1;
    this.scene.add(rimLight);

    // Floor
    const planeMat = new THREE.MeshStandardMaterial({ 
        color: 0xe2e8f0, 
        roughness: 0.8,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = CONFIG.FLOOR_Y;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Grid Helper (Optional Overlay)
    this.gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0xcccccc);
    this.gridHelper.position.y = CONFIG.FLOOR_Y + 0.05; // Slightly above floor
    this.gridHelper.visible = false; // Hidden by default
    this.scene.add(this.gridHelper);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  public loadInitialModel(data: VoxelData[]) {
    this.createVoxels(data);
    this.onCountChange(this.voxels.length);
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
  }

  private createVoxels(data: VoxelData[]) {
    // Clear existing
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
      if (Array.isArray(this.instanceMesh.material)) {
          this.instanceMesh.material.forEach(m => m.dispose());
      } else {
          this.instanceMesh.material.dispose();
      }
    }

    this.voxels = data.map((v, i) => {
        const c = new THREE.Color(v.color);
        // Subtle color variation for realism
        c.offsetHSL(0, 0, (Math.random() * 0.06) - 0.03);
        return {
            id: i,
            x: v.x, y: v.y, z: v.z, color: c,
            vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0,
            rvx: 0, rvy: 0, rvz: 0,
            dismantleDelay: 0
        };
    });

    // Beveled box for realism
    const geometry = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE - 0.02, CONFIG.VOXEL_SIZE - 0.02, CONFIG.VOXEL_SIZE - 0.02);
    
    // Generate realistic texture
    const texture = this.createNoiseTexture();

    // Plastic-like material with texture
    const material = new THREE.MeshStandardMaterial({ 
        roughness: 0.5, // Slightly smoother for better highlights
        metalness: 0.1,
        map: texture,
        roughnessMap: texture,
        bumpMap: texture,
        bumpScale: 0.04, // Increased bump for more pop
        flatShading: false 
    });
    
    this.instanceMesh = new THREE.InstancedMesh(geometry, material, this.voxels.length);
    this.instanceMesh.castShadow = true;
    this.instanceMesh.receiveShadow = true;
    this.scene.add(this.instanceMesh);

    this.centerCamera();
    this.draw();
  }

  private centerCamera() {
      if (this.voxels.length === 0) return;

      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

      this.voxels.forEach(v => {
          minX = Math.min(minX, v.x);
          minY = Math.min(minY, v.y);
          minZ = Math.min(minZ, v.z);
          maxX = Math.max(maxX, v.x);
          maxY = Math.max(maxY, v.y);
          maxZ = Math.max(maxZ, v.z);
      });

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;

      const sizeX = maxX - minX;
      const sizeY = maxY - minY;
      const sizeZ = maxZ - minZ;
      const maxDim = Math.max(sizeX, sizeY, sizeZ);

      // Update controls target to center of model
      this.controls.target.set(centerX, centerY, centerZ);

      // Zoom in close ("Very Big")
      // Distance factor 1.0 ensures it fills the screen but stays within frame
      // Reduced from typical ~2.5 to 1.0 to make it look huge and reduce empty space
      const distance = Math.max(maxDim * 1.0, 10); 

      // Maintain a nice viewing angle
      const direction = new THREE.Vector3(0.5, 0.5, 1).normalize(); 
      const newPos = new THREE.Vector3(centerX, centerY, centerZ).add(direction.multiplyScalar(distance));

      this.camera.position.copy(newPos);
      this.controls.update();
  }

  private createNoiseTexture(): THREE.Texture {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
          // Base
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, size, size);
          
          // Noise
          for (let i = 0; i < 80000; i++) {
              const v = Math.floor(Math.random() * 40) + 215; // 215-255
              ctx.fillStyle = `rgb(${v},${v},${v})`;
              ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
          }

          // Scratches
          ctx.strokeStyle = 'rgba(0,0,0,0.05)';
          ctx.lineWidth = 1;
          for(let i=0; i<150; i++) {
               ctx.beginPath();
               const x = Math.random() * size;
               const y = Math.random() * size;
               ctx.moveTo(x, y);
               ctx.lineTo(x + (Math.random() - 0.5) * 100, y + (Math.random() - 0.5) * 100);
               ctx.stroke();
          }
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
  }

  private draw() {
    if (!this.instanceMesh) return;
    this.voxels.forEach((v, i) => {
        this.dummy.position.set(v.x, v.y, v.z);
        this.dummy.rotation.set(v.rx, v.ry, v.rz);
        this.dummy.updateMatrix();
        this.instanceMesh!.setMatrixAt(i, this.dummy.matrix);
        this.instanceMesh!.setColorAt(i, v.color);
    });
    this.instanceMesh.instanceMatrix.needsUpdate = true;
    this.instanceMesh.instanceColor!.needsUpdate = true;
  }

  public setHandPosition(ndcX: number, ndcY: number, isFist: boolean) {
      // ndcX, ndcY are -1 to 1
      this.lastHandUpdate = Date.now();
      
      // Project to world space at z=0 (or center of model)
      // We want the particles to follow the hand on a plane facing the camera
      // Or just unproject to a fixed distance from camera
      
      const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
      vector.unproject(this.camera);
      
      const dir = vector.sub(this.camera.position).normalize();
      const distance = -this.camera.position.z / dir.z; // Intersection with Z=0 plane if camera is looking at Z=0
      
      // Better: Intersection with plane at model center
      // Let's assume model center is roughly (0, 5, 0)
      // Plane normal is camera direction? No, let's use a plane parallel to camera at model distance.
      
      const targetDistance = this.camera.position.distanceTo(this.controls.target);
      const pos = this.camera.position.clone().add(dir.multiplyScalar(targetDistance));
      
      this.handAttractor = pos;
  }

  public applyForce(direction: THREE.Vector3, strength: number = 0.5) {
    // Allow force application even if stable (to wake up?) or dismantling
    // But mostly for particles
    if (this.state === AppState.STABLE) {
        // Maybe slight shake?
        return;
    }
    
    this.voxels.forEach(v => {
        // Apply force with some noise
        v.vx += direction.x * strength * (0.8 + Math.random() * 0.4);
        v.vy += direction.y * strength * (0.8 + Math.random() * 0.4);
        v.vz += direction.z * strength * (0.8 + Math.random() * 0.4);
        
        // Add spin
        v.rvx += (Math.random() - 0.5) * 0.2;
        v.rvy += (Math.random() - 0.5) * 0.2;
        v.rvz += (Math.random() - 0.5) * 0.2;
    });
  }

  public dismantle(type: 'explode' | 'swipe' = 'explode', direction: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    if (this.state !== AppState.STABLE) return;
    this.state = AppState.DISMANTLING;
    this.onStateChange(this.state);
    
    this.dismantleStartTime = Date.now();

    // Calculate centroid for radial explosion
    let cx = 0, cy = 0, cz = 0;
    this.voxels.forEach(v => { cx += v.x; cy += v.y; cz += v.z; });
    cx /= this.voxels.length;
    cy /= this.voxels.length;
    cz /= this.voxels.length;

    // Determine dismantle order: Top blocks generally fall first
    const sortedWithNoise = this.voxels.map((v, i) => ({
        id: i,
        // Higher Y = higher score = earlier in array = less delay
        score: v.y + (Math.random() * 5) 
    })).sort((a, b) => b.score - a.score);

    const totalDuration = 1200; 
    const delays = new Map<number, number>();
    sortedWithNoise.forEach((item, index) => {
        // Non-linear delay for "collapse" feel (starts slow, accelerates)
        const progress = index / this.voxels.length;
        delays.set(item.id, Math.pow(progress, 1.2) * totalDuration);
    });

    this.voxels.forEach(v => {
        let vx = 0, vy = 0, vz = 0;

        if (type === 'swipe') {
            // Directional force based on swipe
            const force = 0.5 + Math.random() * 0.5;
            vx = direction.x * force + (Math.random() - 0.5) * 0.2;
            vy = Math.random() * 0.3 + 0.1; // Slight lift
            vz = direction.z * force + (Math.random() - 0.5) * 0.2;
        } else {
            // Explosive radial force (default punch/smash)
            const dx = v.x - cx;
            const dz = v.z - cz;
            const dist = Math.sqrt(dx*dx + dz*dz) || 0.1;
            
            // Increased force for more impact
            const force = 0.8 + Math.random() * 0.8;
            
            vx = (dx / dist) * force + (Math.random() - 0.5) * 0.5;
            vy = Math.random() * 0.8 + 0.4; // Higher pop up
            vz = (dz / dist) * force + (Math.random() - 0.5) * 0.5;
            
            // Trigger screen shake
            this.shakeIntensity = 2.5;
        }
        
        v.vx = vx;
        v.vy = vy;
        v.vz = vz;
        
        // Heavy rotation
        v.rvx = (Math.random() - 0.5) * 0.4;
        v.rvy = (Math.random() - 0.5) * 0.4;
        v.rvz = (Math.random() - 0.5) * 0.4;
        
        v.dismantleDelay = delays.get(v.id) || 0;
    });
  }

  private getColorDist(c1: THREE.Color, hex2: number): number {
    const c2 = new THREE.Color(hex2);
    const r = (c1.r - c2.r) * 0.3;
    const g = (c1.g - c2.g) * 0.59;
    const b = (c1.b - c2.b) * 0.11;
    return Math.sqrt(r * r + g * g + b * b);
  }

  public rebuild(targetModel: VoxelData[]) {
    if (this.state === AppState.REBUILDING) return;

    const available = this.voxels.map((v, i) => ({ index: i, color: v.color, taken: false }));
    const mappings: RebuildTarget[] = new Array(this.voxels.length).fill(null);

    // Simple greedy matching for colors
    targetModel.forEach(target => {
        let bestDist = 9999;
        let bestIdx = -1;

        for (let i = 0; i < available.length; i++) {
            if (available[i].taken) continue;

            const d = this.getColorDist(available[i].color, target.color);
            // Penalties for wrong material types (green vs wood)
            const isLeafOrWood = (available[i].color.g > 0.4) || (available[i].color.r < 0.25 && available[i].color.b < 0.25);
            const targetIsGreen = target.color === COLORS.GREEN || target.color === COLORS.WOOD;
            const penalty = (isLeafOrWood && !targetIsGreen) ? 100 : 0;

            if (d + penalty < bestDist) {
                bestDist = d + penalty;
                bestIdx = i;
                if (d < 0.01) break; // Perfect match
            }
        }

        if (bestIdx !== -1) {
            available[bestIdx].taken = true;
            const h = Math.max(0, (target.y - CONFIG.FLOOR_Y) / 15);
            mappings[available[bestIdx].index] = {
                x: target.x, y: target.y, z: target.z,
                delay: h * 300 // Faster rebuild (was 800)
            };
        }
    });

    // Leftover voxels become rubble
    for (let i = 0; i < this.voxels.length; i++) {
        if (!mappings[i]) {
            mappings[i] = {
                x: this.voxels[i].x, y: this.voxels[i].y, z: this.voxels[i].z,
                isRubble: true, delay: 0
            };
        }
    }

    this.rebuildTargets = mappings;
    this.rebuildStartTime = Date.now();
    this.state = AppState.REBUILDING;
    this.onStateChange(this.state);
  }

  private updatePhysics() {
    if (this.state === AppState.DISMANTLING) {
        const now = Date.now();
        const elapsed = now - this.dismantleStartTime;
        const isHandActive = (now - this.lastHandUpdate) < 300;

        this.voxels.forEach(v => {
            // Wait for individual delay before applying physics
            if (elapsed < v.dismantleDelay) return;

            // Hand Attraction
            if (isHandActive && this.handAttractor) {
                // Organic Swarm Behavior: No fixed structure
                // Each particle has a random offset that evolves slowly or is just random
                // To avoid "ring" or "sphere" shell, we use random point inside sphere
                
                // Use a pseudo-random offset based on ID but mixed to be less structured
                const seed = v.id * 137.508; // Golden angle-ish
                const phi = Math.acos(1 - 2 * ((seed % 100) / 100)); // 0 to PI
                const theta = 2 * Math.PI * ((seed * 3.7) % 1); // 0 to 2PI
                const r = 4 + (seed % 12); // Random radius 4-16
                
                // Add some time-based noise for "living" feel
                const time = now * 0.001;
                const noiseX = Math.sin(time + v.id) * 2;
                const noiseY = Math.cos(time + v.id * 0.5) * 2;
                const noiseZ = Math.sin(time * 0.8 + v.id * 0.2) * 2;

                const targetX = this.handAttractor.x + (r * Math.sin(phi) * Math.cos(theta)) + noiseX;
                const targetY = this.handAttractor.y + (r * Math.cos(phi)) + noiseY;
                const targetZ = this.handAttractor.z + (r * Math.sin(phi) * Math.sin(theta)) + noiseZ;

                const dx = targetX - v.x;
                const dy = targetY - v.y;
                const dz = targetZ - v.z;
                
                // Snappy but fluid movement
                const force = 0.06; 
                v.vx += dx * force;
                v.vy += dy * force;
                v.vz += dz * force;
                
                // Damping
                v.vx *= 0.88;
                v.vy *= 0.88;
                v.vz *= 0.88;

                // Counteract gravity
                v.vy += 0.04; 
            }

            v.vy -= 0.04; // Gravity
            v.x += v.vx; v.y += v.vy; v.z += v.vz;
            v.rx += v.rvx; v.ry += v.rvy; v.rz += v.rvz;

            // Floor collision
            if (v.y < CONFIG.FLOOR_Y + 0.5) {
                v.y = CONFIG.FLOOR_Y + 0.5;
                v.vy *= -0.4; // Dampened bounce
                v.vx *= 0.8; // Friction
                v.vz *= 0.8; // Friction
                v.rvx *= 0.8; 
                v.rvy *= 0.8; 
                v.rvz *= 0.8;
            }
        });

        // Camera Tracking
        if (isHandActive && this.handAttractor) {
            // Smoothly look at the hand/swarm center
            const currentTarget = this.controls.target;
            const lerpFactor = 0.05;
            
            currentTarget.x += (this.handAttractor.x - currentTarget.x) * lerpFactor;
            currentTarget.y += (this.handAttractor.y - currentTarget.y) * lerpFactor;
            currentTarget.z += (this.handAttractor.z - currentTarget.z) * lerpFactor;
            
            // Optional: Move camera position slightly to follow?
            // Let's keep position relative but follow target
            // Actually, if the swarm moves far left, we might want to pan
            // OrbitControls handles rotation around target, so moving target pans the camera.
        }
    } else if (this.state === AppState.REBUILDING) {
        const now = Date.now();
        const elapsed = now - this.rebuildStartTime;
        let allDone = true;

        this.voxels.forEach((v, i) => {
            const t = this.rebuildTargets[i];
            if (t.isRubble) return;

            if (elapsed < t.delay) {
                allDone = false;
                return;
            }

            const speed = 0.25; // Faster flight (was 0.12)
            v.x += (t.x - v.x) * speed;
            v.y += (t.y - v.y) * speed;
            v.z += (t.z - v.z) * speed;
            // Rotate back to zero
            v.rx += (0 - v.rx) * speed;
            v.ry += (0 - v.ry) * speed;
            v.rz += (0 - v.rz) * speed;

            // Check if reached
            if ((t.x - v.x) ** 2 + (t.y - v.y) ** 2 + (t.z - v.z) ** 2 > 0.01) {
                allDone = false;
            } else {
                // Snap to grid
                v.x = t.x; v.y = t.y; v.z = t.z;
                v.rx = 0; v.ry = 0; v.rz = 0;
            }
        });

        if (allDone) {
            this.state = AppState.STABLE;
            this.onStateChange(this.state);
        }
    }
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.updatePhysics();
    
    // Optimize: only draw if moving
    if (this.state !== AppState.STABLE || this.controls.autoRotate || this.shakeIntensity > 0) {
        this.draw();
    }
    
    // Screen Shake
    const originalPos = this.camera.position.clone();
    if (this.shakeIntensity > 0.05) {
        const shake = new THREE.Vector3(
            (Math.random() - 0.5) * this.shakeIntensity,
            (Math.random() - 0.5) * this.shakeIntensity,
            (Math.random() - 0.5) * this.shakeIntensity
        );
        this.camera.position.add(shake);
        this.shakeIntensity *= 0.9; // Decay
    } else {
        this.shakeIntensity = 0;
    }

    this.renderer.render(this.scene, this.camera);
    
    // Restore camera position so OrbitControls doesn't drift
    if (this.shakeIntensity > 0) {
        this.camera.position.copy(originalPos);
    }
  }

  public handleResize() {
      if (this.camera && this.renderer) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
  }
  
  public setAutoRotate(enabled: boolean) {
    if (this.controls) {
        this.controls.autoRotate = enabled;
    }
  }

  public setGridVisible(visible: boolean) {
      if (this.gridHelper) {
          this.gridHelper.visible = visible;
      }
  }

  public getJsonData(): string {
      const data = this.voxels.map((v, i) => ({
          id: i,
          x: +v.x.toFixed(2),
          y: +v.y.toFixed(2),
          z: +v.z.toFixed(2),
          c: '#' + v.color.getHexString()
      }));
      return JSON.stringify(data, null, 2);
  }
  
  public getUniqueColors(): string[] {
    const colors = new Set<string>();
    this.voxels.forEach(v => {
        colors.add('#' + v.color.getHexString());
    });
    return Array.from(colors);
  }

  public cleanup() {
    cancelAnimationFrame(this.animationId);
    this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
  }
}
