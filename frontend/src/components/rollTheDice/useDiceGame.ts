import { useRef, useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GRADE_KEYS, type GradeKey, type DiceRollResult, scoreValue, scoreToGrade } from './types';
import type { DiceLaunchPlan } from '../../api/dice';

// Physics and game constants
const WORLD_STEP = 1 / 120;
const DICE_COUNT = 3;
const DICE_SIZE = 0.28;
const DICE_HALF = DICE_SIZE / 2;
const DICE_PHYSICS_HALF = DICE_HALF + 0.006;
const PLATE_RADIUS = 1.95;
const BOWL_FLOOR_RADIUS = 1.34;
const PLATE_FLOOR_Y = 0.06;
const SLOPE_SEGMENTS = 36;
const SLOPE_HEIGHT = 0.07;
const SLOPE_WIDTH = 0.2;
const WALL_SEGMENTS = 36;
const WALL_HEIGHT = 0.44;
const WALL_THICKNESS = 0.14;
const BASE_LAUNCH_SPEED_MIN = 6.1;
const BASE_LAUNCH_SPEED_MAX = 8.3;
const DIRECTION_SPREAD = 0.09;
const LIVE_SAMPLE_INTERVAL = 0.06;
const TOP_DIR_CONVERGENCE_RAD = THREE.MathUtils.degToRad(1.2);
const TOP_DIR_STABLE_TIME = 0.78;
const MAX_SAMPLE_ANGULAR_SPEED = 0.9;
const ROLL_TIMEOUT = 20;
const GUARD_RADIUS = PLATE_RADIUS + DICE_SIZE * 0.8;
const GUARD_HEIGHT = 1.9;
const GUARD_THICKNESS = 0.07;
const GUARD_SEGMENTS = 56;

const FACE_MAPPING = [
  { axis: new CANNON.Vec3(1, 0, 0), faceIndex: 0 },
  { axis: new CANNON.Vec3(-1, 0, 0), faceIndex: 1 },
  { axis: new CANNON.Vec3(0, 1, 0), faceIndex: 2 },
  { axis: new CANNON.Vec3(0, -1, 0), faceIndex: 3 },
  { axis: new CANNON.Vec3(0, 0, 1), faceIndex: 4 },
  { axis: new CANNON.Vec3(0, 0, -1), faceIndex: 5 }
];

const dieAccentColors = ['#ff8e4b', '#5ca8ff', '#7ac65e'];

interface DiceGameRefs {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls: OrbitControls | null;
  world: CANNON.World | null;
  dice: Array<{ mesh: THREE.Mesh; body: CANNON.Body }> | null;
  fontPreloadAttempted: boolean;
  currentFaceLayout: string[];
  rolling: boolean;
  convergenceTime: number;
  rollingTime: number;
  lastTime: number;
  sampleAccumulator: number;
  hasPreviousSample: boolean;
  liveValues: string[];
  previousTopNormals: CANNON.Vec3[];
  animationId: number | null;
}

export interface UseDiceGameReturn {
  initialize: (container: HTMLDivElement) => void;
  launchDice: (faceDistribution: Record<GradeKey, number>, launchPlan?: DiceLaunchPlan) => boolean;
  isRolling: boolean;
  liveValues: string[];
  currentAverage: string;
  cleanup: () => void;
}

export function useDiceGame(
  onRollUpdate?: (status: 'rolling' | 'complete', values: string[], average: string) => void,
  onRollComplete?: (result: DiceRollResult) => void
): UseDiceGameReturn {
  const refs = useRef<DiceGameRefs>({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    world: null,
    dice: null,
    fontPreloadAttempted: false,
    currentFaceLayout: ['U', 'U', '3', '4', '5', '5'],
    rolling: false,
    convergenceTime: 0,
    rollingTime: 0,
    lastTime: 0,
    sampleAccumulator: 0,
    hasPreviousSample: false,
    liveValues: ['U', 'U', 'U'],
    previousTopNormals: [new CANNON.Vec3(0, 1, 0), new CANNON.Vec3(0, 1, 0), new CANNON.Vec3(0, 1, 0)],
    animationId: null
  });

  const [isRolling, setIsRolling] = useState(false);
  const [liveValues, setLiveValues] = useState<string[]>(['U', 'U', 'U']);
  const [currentAverage, setCurrentAverage] = useState('U');

  // Detect top face
  const detectTopFace = useCallback((body: CANNON.Body, faceLayout: string[]) => {
    let bestDot = -Infinity;
    let bestValue = 'U';
    const bestNormal = new CANNON.Vec3(0, 1, 0);

    for (let i = 0; i < FACE_MAPPING.length; i++) {
      const info = FACE_MAPPING[i];
      const worldAxis = body.quaternion.vmult(info.axis);
      const dot = worldAxis.y;
      if (dot > bestDot) {
        bestDot = dot;
        bestValue = faceLayout[info.faceIndex];
        bestNormal.copy(worldAxis);
      }
    }

    return { value: bestValue, normal: bestNormal };
  }, []);

  // Finalize roll
  const finalizeRoll = useCallback((gameRefs: DiceGameRefs, _timeout = false) => {
    gameRefs.rolling = false;
    setIsRolling(false);

    if (!gameRefs.dice) return;

    // Final result should come from the settled body orientation at finalize time.
    const values = gameRefs.dice.map((die) =>
      detectTopFace(die.body, gameRefs.currentFaceLayout).value
    );
    gameRefs.liveValues = [...values];

    const numericTotal = values.reduce((sum, value) => sum + scoreValue(value), 0);
    const averageRounded = Math.round(numericTotal / DICE_COUNT);
    const averageLabel = scoreToGrade(averageRounded);

    setLiveValues(values);
    setCurrentAverage(averageLabel);

    if (onRollUpdate) {
      onRollUpdate('complete', values, averageLabel);
    }

    if (onRollComplete) {
      onRollComplete({
        diceValues: values,
        total: numericTotal,
        average: averageRounded,
        grade: averageLabel
      });
    }
  }, [detectTopFace, onRollUpdate, onRollComplete]);

  // Sample live result during rolling
  const sampleLiveResult = useCallback((gameRefs: DiceGameRefs) => {
    let maxDirectionDelta = 0;
    let maxAngularSpeed = 0;

    if (!gameRefs.dice) return false;

    for (let i = 0; i < gameRefs.dice.length; i++) {
      const body = gameRefs.dice[i].body;
      const top = detectTopFace(body, gameRefs.currentFaceLayout);
      gameRefs.liveValues[i] = top.value;
      if (gameRefs.hasPreviousSample) {
        const dot = THREE.MathUtils.clamp(top.normal.dot(gameRefs.previousTopNormals[i]), -1, 1);
        const delta = Math.acos(dot);
        if (delta > maxDirectionDelta) {
          maxDirectionDelta = delta;
        }
      }
      gameRefs.previousTopNormals[i].copy(top.normal);
      maxAngularSpeed = Math.max(maxAngularSpeed, body.angularVelocity.length());
    }

    const numericTotal = gameRefs.liveValues.reduce((sum, value) => sum + scoreValue(value), 0);
    const averageRounded = Math.round(numericTotal / DICE_COUNT);
    const averageLabel = scoreToGrade(averageRounded);

    setLiveValues([...gameRefs.liveValues]);
    setCurrentAverage(averageLabel);

    if (onRollUpdate) {
      onRollUpdate('rolling', [...gameRefs.liveValues], averageLabel);
    }

    if (!gameRefs.hasPreviousSample) {
      gameRefs.hasPreviousSample = true;
      gameRefs.convergenceTime = 0;
      return false;
    }

    if (maxDirectionDelta <= TOP_DIR_CONVERGENCE_RAD && maxAngularSpeed <= MAX_SAMPLE_ANGULAR_SPEED) {
      gameRefs.convergenceTime += LIVE_SAMPLE_INTERVAL;
    } else {
      gameRefs.convergenceTime = 0;
    }

    return gameRefs.convergenceTime >= TOP_DIR_STABLE_TIME;
  }, [detectTopFace, onRollUpdate]);

  // Animation loop
  const animate = useCallback((now: number, gameRefs: DiceGameRefs) => {
    if (!gameRefs.world || !gameRefs.renderer || !gameRefs.scene || !gameRefs.camera) return;

    const dt = gameRefs.lastTime ? Math.min((now - gameRefs.lastTime) / 1000, 0.05) : WORLD_STEP;
    gameRefs.lastTime = now;

    gameRefs.world.step(WORLD_STEP, dt, 8);

    if (gameRefs.dice) {
      for (let i = 0; i < gameRefs.dice.length; i++) {
        const die = gameRefs.dice[i];
        die.mesh.position.set(die.body.position.x, die.body.position.y, die.body.position.z);
        die.mesh.quaternion.set(die.body.quaternion.x, die.body.quaternion.y, die.body.quaternion.z, die.body.quaternion.w);
      }
    }

    if (gameRefs.rolling) {
      gameRefs.rollingTime += dt;
      gameRefs.sampleAccumulator += dt;

      while (gameRefs.sampleAccumulator >= LIVE_SAMPLE_INTERVAL && gameRefs.rolling) {
        gameRefs.sampleAccumulator -= LIVE_SAMPLE_INTERVAL;
        if (sampleLiveResult(gameRefs)) {
          finalizeRoll(gameRefs, false);
        }
      }

      if (gameRefs.rolling && gameRefs.rollingTime >= ROLL_TIMEOUT) {
        finalizeRoll(gameRefs, true);
      }
    }

    if (gameRefs.controls) {
      gameRefs.controls.update();
    }

    gameRefs.renderer.render(gameRefs.scene, gameRefs.camera);
    gameRefs.animationId = requestAnimationFrame((time) => animate(time, gameRefs));
  }, [sampleLiveResult, finalizeRoll]);

  // Initialize the game - stable function
  const initialize = useCallback((container: HTMLDivElement) => {
    if (!container) {
      console.log('[DiceGame] No container provided');
      return;
    }

    if (refs.current.scene) {
      console.log('[DiceGame] Already initialized, skipping');
      return;
    }

    if (container.querySelector('canvas')) {
      console.log('[DiceGame] Canvas already exists, skipping');
      return;
    }

    console.log('[DiceGame] Initializing...');

    const fontSet = document.fonts;

    // Always preload once before first scene initialization so initial dice textures use New Rocker.
    if (fontSet && !refs.current.fontPreloadAttempted) {
      refs.current.fontPreloadAttempted = true;
      void fontSet
        .load('400 120px "New Rocker"', 'U345')
        .then((faces) => {
          if (faces.length > 0) return;
          return fontSet.load('400 120px New Rocker', 'U345');
        })
        .then(() => fontSet.ready)
        .catch(async () => {
          if (typeof FontFace === 'undefined') return;
          const injectedFace = new FontFace(
            'New Rocker',
            'url("/fonts/new-rocker.regular.ttf") format("truetype")',
            { weight: '400', style: 'normal' }
          );
          const loadedFace = await injectedFace.load();
          fontSet.add(loadedFace);
        })
        .finally(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!container.isConnected || refs.current.scene || container.querySelector('canvas')) return;
              initialize(container);
            });
          });
        });
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    console.log('[DiceGame] Container size:', width, height);

    if (width === 0 || height === 0) {
      console.error('[DiceGame] Container has zero size, aborting');
      return;
    }

    // Helper functions defined inside initialize to avoid dependencies
    const createFloorTexture = () => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#131e30');
      grad.addColorStop(1, '#0a1220');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      const tile = 64;
      for (let y = 0; y < size; y += tile) {
        for (let x = 0; x < size; x += tile) {
          const alpha = (x / tile + y / tile) % 2 === 0 ? 0.055 : 0.022;
          ctx.fillStyle = `rgba(66, 156, 233, ${alpha})`;
          ctx.fillRect(x, y, tile, tile);
        }
      }

      for (let i = 0; i < 3200; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const alpha = Math.random() * 0.025;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }

      return new THREE.CanvasTexture(canvas);
    };

    const createPlateTexture = () => {
      const size = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const center = size / 2;

      const radial = ctx.createRadialGradient(center * 0.88, center * 0.78, size * 0.08, center, center, size * 0.56);
      radial.addColorStop(0, '#d6e3f2');
      radial.addColorStop(0.55, '#a8bdd3');
      radial.addColorStop(1, '#7e95ac');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, size, size);

      for (let i = 0; i < 4; i++) {
        const ringR = size * (0.23 + i * 0.13);
        ctx.beginPath();
        ctx.arc(center, center, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.07 - i * 0.012})`;
        ctx.lineWidth = 5;
        ctx.stroke();
      }

      for (let i = 0; i < 3200; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const alpha = Math.random() * 0.03;
        ctx.fillStyle = `rgba(120, 110, 90, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }

      return new THREE.CanvasTexture(canvas);
    };

    const createDiceFaceTexture = (label: string, accent: string) => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.55, '#f3f7fc');
      grad.addColorStop(1, '#e7eef7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      const drawRoundedRectPath = (x: number, y: number, width: number, height: number, radius: number) => {
        const r = Math.min(radius, width * 0.5, height * 0.5);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      drawRoundedRectPath(14, 14, size - 28, size - 28, 44);
      ctx.lineWidth = 20;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.stroke();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 14;
      drawRoundedRectPath(28, 28, size - 56, size - 56, 34);
      ctx.stroke();

      const gloss = ctx.createLinearGradient(0, 0, 0, size * 0.55);
      gloss.addColorStop(0, 'rgba(255,255,255,0.36)');
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gloss;
      drawRoundedRectPath(36, 34, size - 72, size * 0.42, 28);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0e1622';
      ctx.font = `400 ${Math.round(size * 0.64)}px "New Rocker", Georgia, serif`;
      ctx.fillText(label, size / 2, size / 2 + size * 0.045);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
      ctx.lineWidth = 5;
      ctx.strokeText(label, size / 2, size / 2 + size * 0.045);

      return new THREE.CanvasTexture(canvas);
    };

    const createDiceMaterials = (faceLayout: string[], accent: string, maxAnisotropy: number = 16) => {
      return faceLayout.map((label) => {
        const texture = createDiceFaceTexture(label, accent);
        texture.anisotropy = maxAnisotropy;
        return new THREE.MeshPhysicalMaterial({
          map: texture,
          roughness: 0.18,
          metalness: 0.05,
          clearcoat: 1,
          clearcoatRoughness: 0.06,
          sheen: 0.5,
          sheenRoughness: 0.42,
          specularIntensity: 0.8
        });
      });
    };

    const createPlateProfile = () => {
      return [
        new THREE.Vector2(0.0, PLATE_FLOOR_Y),
        new THREE.Vector2(BOWL_FLOOR_RADIUS * 0.86, PLATE_FLOOR_Y),
        new THREE.Vector2(BOWL_FLOOR_RADIUS + 0.22, PLATE_FLOOR_Y + 0.03),
        new THREE.Vector2(PLATE_RADIUS - 0.2, 0.12),
        new THREE.Vector2(PLATE_RADIUS - 0.08, 0.158),
        new THREE.Vector2(PLATE_RADIUS + 0.015, 0.195),
        new THREE.Vector2(PLATE_RADIUS - 0.01, 0.173),
        new THREE.Vector2(PLATE_RADIUS - 0.05, 0.142),
        new THREE.Vector2(PLATE_RADIUS - 0.12, 0.116),
        new THREE.Vector2(PLATE_RADIUS - 0.21, 0.102),
        new THREE.Vector2(PLATE_RADIUS - 0.3, 0.099)
      ];
    };

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.78;
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1020);
    scene.fog = new THREE.Fog(0x0a1020, 7.5, 16);

    // Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 3.1, 2.3);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.24, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.1;
    controls.maxDistance = 5.4;
    controls.maxPolarAngle = Math.PI * 0.43;

    // Lights
    const hemiLight = new THREE.HemisphereLight(0x74bfef, 0x070f1f, 0.46);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xe0f2ff, 0.72);
    keyLight.position.set(3.2, 5.2, 3.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    keyLight.shadow.camera.near = 0.4;
    keyLight.shadow.camera.far = 20;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x2f95d8, 0.42, 10, 2);
    rimLight.position.set(-2.2, 2.8, -2.7);
    scene.add(rimLight);

    // Floor
    const floorTexture = createFloorTexture();
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(9, 9);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({
        map: floorTexture,
        roughness: 0.9,
        metalness: 0.06
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Backdrop
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 8),
      new THREE.MeshStandardMaterial({ color: 0x0d1628, roughness: 0.96, metalness: 0.05 })
    );
    backdrop.position.set(0, 3, -4.1);
    scene.add(backdrop);

    // Plate
    const plateGroup = new THREE.Group();
    scene.add(plateGroup);

    const plateTexture = createPlateTexture();
    const plateLathe = new THREE.Mesh(
      new THREE.LatheGeometry(createPlateProfile(), 200),
      new THREE.MeshPhysicalMaterial({
        color: 0xbecfe0,
        roughness: 0.38,
        metalness: 0.01,
        clearcoat: 0.74,
        clearcoatRoughness: 0.28,
        side: THREE.DoubleSide
      })
    );
    plateLathe.castShadow = true;
    plateLathe.receiveShadow = true;
    plateGroup.add(plateLathe);

    const innerGlaze = new THREE.Mesh(
      new THREE.CircleGeometry(BOWL_FLOOR_RADIUS * 0.98, 128),
      new THREE.MeshPhysicalMaterial({
        color: 0xc5d8eb,
        map: plateTexture,
        roughness: 0.3,
        metalness: 0.01,
        clearcoat: 0.74,
        clearcoatRoughness: 0.24
      })
    );
    innerGlaze.rotation.x = -Math.PI / 2;
    innerGlaze.position.y = PLATE_FLOOR_Y + 0.001;
    innerGlaze.receiveShadow = true;
    plateGroup.add(innerGlaze);

    const rimStripe = new THREE.Mesh(
      new THREE.TorusGeometry(PLATE_RADIUS - 0.06, 0.008, 16, 144),
      new THREE.MeshStandardMaterial({ color: 0x2d83bf, roughness: 0.36, metalness: 0.09 })
    );
    rimStripe.position.y = 0.165;
    rimStripe.rotation.x = Math.PI / 2;
    plateGroup.add(rimStripe);

    // Physics world
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    world.allowSleep = true;
    world.broadphase = new CANNON.SAPBroadphase(world);

    const diceMaterial = new CANNON.Material('dice');
    const platePhysicsMaterial = new CANNON.Material('plate');
    const guardPhysicsMaterial = new CANNON.Material('guard-wall');

    world.defaultContactMaterial.friction = 0.22;
    world.defaultContactMaterial.restitution = 0.3;

    world.addContactMaterial(
      new CANNON.ContactMaterial(diceMaterial, platePhysicsMaterial, {
        friction: 0.19,
        restitution: 0.42,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3
      })
    );

    world.addContactMaterial(
      new CANNON.ContactMaterial(diceMaterial, diceMaterial, {
        friction: 0.15,
        restitution: 0.5,
        contactEquationStiffness: 8e7,
        contactEquationRelaxation: 3
      })
    );

    world.addContactMaterial(
      new CANNON.ContactMaterial(diceMaterial, guardPhysicsMaterial, {
        friction: 0.06,
        restitution: 0.7,
        contactEquationStiffness: 8e7,
        contactEquationRelaxation: 3
      })
    );

    // Floor body
    const floorBody = new CANNON.Body({
      mass: 0,
      material: platePhysicsMaterial,
      shape: new CANNON.Plane()
    });
    floorBody.position.set(0, -0.35, 0);
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);

    // Plate base
    const plateBaseBody = new CANNON.Body({
      mass: 0,
      material: platePhysicsMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(BOWL_FLOOR_RADIUS, 0.03, BOWL_FLOOR_RADIUS)),
      position: new CANNON.Vec3(0, PLATE_FLOOR_Y - 0.03, 0)
    });
    world.addBody(plateBaseBody);

    // Slope segments
    const slopeRadius = (BOWL_FLOOR_RADIUS + (PLATE_RADIUS - 0.28)) * 0.5;
    const slopeHalf = ((Math.PI * 2 * slopeRadius) / SLOPE_SEGMENTS) * 0.36;
    const slopeTilt = THREE.MathUtils.degToRad(10);
    for (let i = 0; i < SLOPE_SEGMENTS; i++) {
      const theta = (i / SLOPE_SEGMENTS) * Math.PI * 2;
      const x = Math.cos(theta) * slopeRadius;
      const z = Math.sin(theta) * slopeRadius;
      const tangent = new CANNON.Vec3(-Math.sin(theta), 0, Math.cos(theta));

      const slopeBody = new CANNON.Body({
        mass: 0,
        material: platePhysicsMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(slopeHalf, SLOPE_HEIGHT / 2, SLOPE_WIDTH / 2)),
        position: new CANNON.Vec3(x, 0.078, z)
      });
      slopeBody.quaternion.setFromAxisAngle(tangent, slopeTilt);
      world.addBody(slopeBody);
    }

    // Wall segments
    const wallRadius = PLATE_RADIUS - 0.03;
    const wallHalfLength = ((Math.PI * 2 * wallRadius) / WALL_SEGMENTS) * 0.56;
    const inwardLean = THREE.MathUtils.degToRad(-11);
    const yAxis = new CANNON.Vec3(0, 1, 0);
    for (let i = 0; i < WALL_SEGMENTS; i++) {
      const theta = (i / WALL_SEGMENTS) * Math.PI * 2;
      const x = Math.cos(theta) * wallRadius;
      const z = Math.sin(theta) * wallRadius;
      const tangent = new CANNON.Vec3(-Math.sin(theta), 0, Math.cos(theta));
      const yaw = new CANNON.Quaternion();
      const lean = new CANNON.Quaternion();

      yaw.setFromAxisAngle(yAxis, theta + Math.PI / 2);
      lean.setFromAxisAngle(tangent, inwardLean);

      const wallBody = new CANNON.Body({
        mass: 0,
        material: platePhysicsMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(wallHalfLength, WALL_HEIGHT / 2, WALL_THICKNESS / 2)),
        position: new CANNON.Vec3(x, 0.145 + WALL_HEIGHT / 2, z)
      });
      wallBody.quaternion.copy(lean.mult(yaw));
      world.addBody(wallBody);
    }

    // Guard cylinder
    const guardHalfLength = ((Math.PI * 2 * GUARD_RADIUS) / GUARD_SEGMENTS) * 0.52;
    for (let i = 0; i < GUARD_SEGMENTS; i++) {
      const theta = (i / GUARD_SEGMENTS) * Math.PI * 2;
      const x = Math.cos(theta) * GUARD_RADIUS;
      const z = Math.sin(theta) * GUARD_RADIUS;
      const guardBody = new CANNON.Body({
        mass: 0,
        material: guardPhysicsMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(guardHalfLength, GUARD_HEIGHT / 2, GUARD_THICKNESS / 2)),
        position: new CANNON.Vec3(x, GUARD_HEIGHT / 2, z)
      });
      guardBody.quaternion.setFromEuler(0, theta + Math.PI / 2, 0);
      world.addBody(guardBody);
    }

    // Dice
    const defaultLayout = ['U', 'U', '3', '4', '5', '5'];
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const dice: Array<{ mesh: THREE.Mesh; body: CANNON.Body }> = [];
    for (let i = 0; i < DICE_COUNT; i++) {
      const mesh = new THREE.Mesh(
        new RoundedBoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE, 7, DICE_SIZE * 0.15),
        createDiceMaterials(defaultLayout, dieAccentColors[i], maxAnisotropy)
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const body = new CANNON.Body({
        mass: 0.26,
        material: diceMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(DICE_PHYSICS_HALF, DICE_PHYSICS_HALF, DICE_PHYSICS_HALF)),
        linearDamping: 0.075,
        angularDamping: 0.09,
        sleepSpeedLimit: 0.06,
        sleepTimeLimit: 1.2
      });
      body.position.set((i - 1) * 0.34, 1.02 + i * 0.08, (i - 1) * 0.14);
      world.addBody(body);

      dice.push({ mesh, body });
    }

    // Store refs
    refs.current = {
      ...refs.current,
      scene,
      camera,
      renderer,
      controls,
      world,
      dice,
      currentFaceLayout: defaultLayout
    };

    // Handle resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Start animation
    refs.current.animationId = requestAnimationFrame((time) => animate(time, refs.current));

    // Cleanup function for this initialization
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only create once

  // Launch dice
  const launchDice = useCallback((faceDistribution: Record<GradeKey, number>, launchPlan?: DiceLaunchPlan) => {
    const r = refs.current;
    if (!r.world || !r.dice) return false;

    // Helper function inside launchDice
    const createDiceFaceTexture = (label: string, accent: string) => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.55, '#f3f7fc');
      grad.addColorStop(1, '#e7eef7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      const drawRoundedRectPath = (x: number, y: number, width: number, height: number, radius: number) => {
        const rad = Math.min(radius, width * 0.5, height * 0.5);
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.lineTo(x + width - rad, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + rad);
        ctx.lineTo(x + width, y + height - rad);
        ctx.quadraticCurveTo(x + width, y + height, x + width - rad, y + height);
        ctx.lineTo(x + rad, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - rad);
        ctx.lineTo(x, y + rad);
        ctx.quadraticCurveTo(x, y, x + rad, y);
        ctx.closePath();
      };

      drawRoundedRectPath(14, 14, size - 28, size - 28, 44);
      ctx.lineWidth = 20;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.stroke();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 14;
      drawRoundedRectPath(28, 28, size - 56, size - 56, 34);
      ctx.stroke();

      const gloss = ctx.createLinearGradient(0, 0, 0, size * 0.55);
      gloss.addColorStop(0, 'rgba(255,255,255,0.36)');
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gloss;
      drawRoundedRectPath(36, 34, size - 72, size * 0.42, 28);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0e1622';
      ctx.font = `400 ${Math.round(size * 0.64)}px "New Rocker", Georgia, serif`;
      ctx.fillText(label, size / 2, size / 2 + size * 0.045);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
      ctx.lineWidth = 5;
      ctx.strokeText(label, size / 2, size / 2 + size * 0.045);

      return new THREE.CanvasTexture(canvas);
    };

    const createDiceMaterials = (faceLayout: string[], accent: string, maxAnisotropy: number = 16) => {
      return faceLayout.map((label) => {
        const texture = createDiceFaceTexture(label, accent);
        texture.anisotropy = maxAnisotropy;
        return new THREE.MeshPhysicalMaterial({
          map: texture,
          roughness: 0.18,
          metalness: 0.05,
          clearcoat: 1,
          clearcoatRoughness: 0.06,
          sheen: 0.5,
          sheenRoughness: 0.42,
          specularIntensity: 0.8
        });
      });
    };

    // Expand face distribution to layout (or use server-provided layout)
    const layout: string[] =
      launchPlan?.face_layout && launchPlan.face_layout.length === 6
        ? [...launchPlan.face_layout]
        : (() => {
            const localLayout: string[] = [];
            for (const key of GRADE_KEYS) {
              const count = faceDistribution[key] || 0;
              for (let n = 0; n < count; n++) {
                localLayout.push(key);
              }
            }
            return localLayout;
          })();

    if (layout.length !== 6) {
      console.error('Invalid face distribution, must sum to 6');
      return false;
    }

    // Apply face layout to dice
    r.currentFaceLayout = [...layout];
    for (let i = 0; i < r.dice.length; i++) {
      const mesh = r.dice[i].mesh;
      const oldMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = createDiceMaterials(r.currentFaceLayout, dieAccentColors[i], 16);
      for (const material of oldMaterials) {
        if ((material as THREE.MeshPhysicalMaterial)?.map) {
          (material as THREE.MeshPhysicalMaterial).map?.dispose();
        }
        (material as THREE.Material)?.dispose?.();
      }
    }

    // Reset state
    r.rolling = true;
    r.convergenceTime = 0;
    r.rollingTime = 0;
    r.sampleAccumulator = 0;
    r.hasPreviousSample = false;
    r.liveValues = ['U', 'U', 'U'];
    setIsRolling(true);

    // Launch each die
    for (let i = 0; i < r.dice.length; i++) {
      const die = r.dice[i].body;
      die.velocity.set(0, 0, 0);
      die.angularVelocity.set(0, 0, 0);
      die.force.set(0, 0, 0);
      die.torque.set(0, 0, 0);

      const serverPlan = launchPlan?.dice_states?.[i];
      if (serverPlan) {
        die.position.set(serverPlan.position[0], serverPlan.position[1], serverPlan.position[2]);
        die.quaternion.setFromEuler(
          serverPlan.rotation_euler[0],
          serverPlan.rotation_euler[1],
          serverPlan.rotation_euler[2]
        );
        die.velocity.set(serverPlan.velocity[0], serverPlan.velocity[1], serverPlan.velocity[2]);
        die.angularVelocity.set(
          serverPlan.angular_velocity[0],
          serverPlan.angular_velocity[1],
          serverPlan.angular_velocity[2]
        );
      } else {
        const launchX = -1.35 + THREE.MathUtils.randFloatSpread(0.18);
        const launchY = 1.2 + i * 0.12 + THREE.MathUtils.randFloat(0, 0.1);
        const launchZ = (i - 1) * 0.28 + THREE.MathUtils.randFloatSpread(0.18);

        die.position.set(launchX, launchY, launchZ);
        die.quaternion.setFromEuler(
          THREE.MathUtils.randFloat(0, Math.PI * 2),
          THREE.MathUtils.randFloat(0, Math.PI * 2),
          THREE.MathUtils.randFloat(0, Math.PI * 2)
        );

        const target = new CANNON.Vec3(
          THREE.MathUtils.randFloat(-0.1, 0.1),
          0.26,
          THREE.MathUtils.randFloat(-0.24, 0.24)
        );
        const direction = target.vsub(die.position);
        direction.normalize();
        direction.x += THREE.MathUtils.randFloatSpread(DIRECTION_SPREAD);
        direction.y += THREE.MathUtils.randFloat(-0.03, 0.06);
        direction.z += THREE.MathUtils.randFloatSpread(DIRECTION_SPREAD);
        direction.normalize();

        const speed = THREE.MathUtils.randFloat(BASE_LAUNCH_SPEED_MIN, BASE_LAUNCH_SPEED_MAX);
        die.velocity.set(
          direction.x * speed,
          direction.y * speed + THREE.MathUtils.randFloat(1.35, 2.35),
          direction.z * speed
        );
        die.angularVelocity.set(
          THREE.MathUtils.randFloat(-48, 48),
          THREE.MathUtils.randFloat(-44, 44),
          THREE.MathUtils.randFloat(-48, 48)
        );
      }

      die.wakeUp();
    }
    return true;
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    const r = refs.current;
    if (r.animationId) {
      cancelAnimationFrame(r.animationId);
    }
    if (r.controls) {
      r.controls.dispose();
    }
    if (r.renderer) {
      r.renderer.dispose();
      if (r.renderer.domElement.parentElement) {
        r.renderer.domElement.parentElement.removeChild(r.renderer.domElement);
      }
    }
    if (r.world) {
      r.world.bodies.forEach(body => r.world!.removeBody(body));
    }
    refs.current = {
      ...r,
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      world: null,
      dice: null,
      fontPreloadAttempted: false,
      animationId: null
    };
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    initialize,
    launchDice,
    isRolling,
    liveValues,
    currentAverage,
    cleanup
  };
}
