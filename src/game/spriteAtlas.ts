import { QUALITY_META } from './data';
import { EquipSlot, ItemQuality, MountSpecies, MountSkinStyle } from './types';

export type Direction8 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
// 0: E, 1: SE, 2: S, 3: SW, 4: W, 5: NW, 6: N, 7: NE

// 5 canonical orientation rows stored in each Sprite Atlas sheet.
// Left-facing directions (SW=3, W=4, NW=5) mirror rows (1, 2, 3) horizontally,
// saving 37.5% atlas memory while providing true 8-direction visual fidelity.
export type AtlasOrientationRow = 0 | 1 | 2 | 3 | 4;
// Row 0: S (Front)
// Row 1: SE / SW (Front 3/4 diagonal)
// Row 2: E / W (Side profile)
// Row 3: NE / NW (Back 3/4 diagonal)
// Row 4: N (Back)

export type AnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'attack'
  | 'cast'
  | 'hit'
  | 'death'
  | 'mount'
  | 'alert'
  | 'roar'
  | 'enrage';

export type WeaponVisualKind = 'sword' | 'blade' | 'staff' | 'dart' | 'spear';

export type MonsterArchetype =
  | 'boar'
  | 'bandit'
  | 'bandit_chief'
  | 'swordsman'
  | 'assassin'
  | 'elder_blade'
  | 'frost_wolf'
  | 'armored_cavalry'
  | 'snow_monk'
  | 'vanguard_knight'
  | 'blood_assassin'
  | 'war_general'
  | 'sword_golem'
  | 'dark_demon'
  | 'sword_wraith'
  | 'boss_co_bach'
  | 'boss_dieu_nhu'
  | 'boss_thien_phong'
  | 'boss_huyet_ma'
  | 'dungeon_boss'
  | 'siege_ally'
  | 'siege_enemy'
  | 'gate'
  | 'pillar'
  | 'banner';

export type OrientationView = 'front' | 'front_diag' | 'side' | 'back_diag' | 'back';

export interface Dir8Meta {
  dir: Direction8;
  row: AtlasOrientationRow;
  view: OrientationView;
  flipX: boolean;
  dx: number;
  dy: number;
}

const DIR_VECTORS: [number, number][] = [
  [1, 0], // 0: E
  [0.707, 0.707], // 1: SE
  [0, 1], // 2: S
  [-0.707, 0.707], // 3: SW
  [-1, 0], // 4: W
  [-0.707, -0.707], // 5: NW
  [0, -1], // 6: N
  [0.707, -0.707], // 7: NE
];

const DIR8_META_TABLE: Dir8Meta[] = [
  { dir: 0, row: 2, view: 'side', flipX: false, dx: DIR_VECTORS[0][0], dy: DIR_VECTORS[0][1] },
  { dir: 1, row: 1, view: 'front_diag', flipX: false, dx: DIR_VECTORS[1][0], dy: DIR_VECTORS[1][1] },
  { dir: 2, row: 0, view: 'front', flipX: false, dx: DIR_VECTORS[2][0], dy: DIR_VECTORS[2][1] },
  { dir: 3, row: 1, view: 'front_diag', flipX: true, dx: DIR_VECTORS[3][0], dy: DIR_VECTORS[3][1] },
  { dir: 4, row: 2, view: 'side', flipX: true, dx: DIR_VECTORS[4][0], dy: DIR_VECTORS[4][1] },
  { dir: 5, row: 3, view: 'back_diag', flipX: true, dx: DIR_VECTORS[5][0], dy: DIR_VECTORS[5][1] },
  { dir: 6, row: 4, view: 'back', flipX: false, dx: DIR_VECTORS[6][0], dy: DIR_VECTORS[6][1] },
  { dir: 7, row: 3, view: 'back_diag', flipX: false, dx: DIR_VECTORS[7][0], dy: DIR_VECTORS[7][1] },
];

export const ATLAS_ROW_TO_VIEW: OrientationView[] = [
  'front',
  'front_diag',
  'side',
  'back_diag',
  'back',
];

export function angleToDir8(rad: number): Direction8 {
  const norm = ((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const idx = Math.round(norm / (Math.PI / 4)) % 8;
  return idx as Direction8;
}

export function getDir8Meta(dir: Direction8): Dir8Meta {
  return DIR8_META_TABLE[dir] || DIR8_META_TABLE[2];
}

// ---------------------------------------------------------------------------
// STATE-DRIVEN SPRITE ANIMATION CONTROLLER (Idle / Walk / Run / Attack / Cast / Hit / Death)
// ---------------------------------------------------------------------------
export interface AnimClipDef {
  frames: number;
  fps: number;
  loop: boolean;
  priority: number; // Higher priority interrupts lower priority clips
}

export const ANIM_CLIPS: Record<AnimState, AnimClipDef> = {
  idle: { frames: 4, fps: 5, loop: true, priority: 0 },
  mount: { frames: 4, fps: 8, loop: true, priority: 1 },
  alert: { frames: 4, fps: 8, loop: true, priority: 1 },
  walk: { frames: 6, fps: 9, loop: true, priority: 2 },
  run: { frames: 6, fps: 13, loop: true, priority: 3 },
  enrage: { frames: 4, fps: 10, loop: false, priority: 4 },
  attack: { frames: 5, fps: 15, loop: false, priority: 5 },
  cast: { frames: 6, fps: 14, loop: false, priority: 6 },
  roar: { frames: 4, fps: 9, loop: false, priority: 6 },
  hit: { frames: 3, fps: 14, loop: false, priority: 7 },
  death: { frames: 4, fps: 7, loop: false, priority: 10 },
};

export interface SpriteAnimMachine {
  state: AnimState;
  dir8: Direction8;
  smoothAngle: number;
  frameIndex: number;
  frameTime: number;
  clipElapsed: number;
  clipDuration: number;
  normalizedTime: number; // 0..1 progress through active clip
  speedScale: number;
  hitFlashTimer: number;
  mountPhase: number;
}

export function createAnimMachine(
  initialFacing = 0,
  initialState: AnimState = 'idle'
): SpriteAnimMachine {
  const clip = ANIM_CLIPS[initialState];
  const dur = clip.frames / clip.fps;
  return {
    state: initialState,
    dir8: angleToDir8(initialFacing),
    smoothAngle: initialFacing,
    frameIndex: 0,
    frameTime: 0,
    clipElapsed: 0,
    clipDuration: dur,
    normalizedTime: 0,
    speedScale: 1,
    hitFlashTimer: 0,
    mountPhase: Math.random() * Math.PI * 2,
  };
}

/**
 * Explicitly triggers an action/reaction state (attack, cast, hit, roar, death)
 * with clip-priority arbitration so state changes never stutter inside the render loop.
 */
export function triggerAnimState(
  anim: SpriteAnimMachine,
  nextState: AnimState,
  opts?: { durationSec?: number; force?: boolean; hitFlashSec?: number }
) {
  if (anim.state === 'death' && nextState !== 'death' && !opts?.force) return;

  const curClip = ANIM_CLIPS[anim.state];
  const nextClip = ANIM_CLIPS[nextState];

  if (opts?.hitFlashSec && opts.hitFlashSec > 0) {
    anim.hitFlashTimer = Math.max(anim.hitFlashTimer, opts.hitFlashSec);
  }

  // Respect priority unless forced or re-triggering the same non-looping action
  const isSameAction = anim.state === nextState && !nextClip.loop;
  if (!opts?.force && !isSameAction && nextClip.priority < curClip.priority && !curClip.loop) {
    return;
  }

  const baseDuration = nextClip.frames / nextClip.fps;
  const targetDuration = opts?.durationSec && opts.durationSec > 0 ? opts.durationSec : baseDuration;

  anim.state = nextState;
  anim.frameIndex = 0;
  anim.frameTime = 0;
  anim.clipElapsed = 0;
  anim.clipDuration = targetDuration;
  anim.normalizedTime = 0;
  anim.speedScale = baseDuration / targetDuration;
}

/**
 * Smoothly rotates entity facing angle and applies angular hysteresis (~11 deg)
 * so 8-direction transitions never flicker on 45-degree diagonals.
 */
export function updateSmoothDir8(
  anim: SpriteAnimMachine,
  desiredAngle: number,
  dt: number,
  turnSpeed = 16
): Direction8 {
  let diff = desiredAngle - anim.smoothAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  const step = Math.min(1, dt * turnSpeed);
  anim.smoothAngle += diff * step;

  const norm = ((anim.smoothAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const sectorFloat = norm / (Math.PI / 4);
  const curCenter = anim.dir8;
  let sectorDist = Math.abs(sectorFloat - curCenter);
  if (sectorDist > 4) sectorDist = 8 - sectorDist;

  // Hysteresis threshold: only switch direction when past 0.58 of a sector (~26 deg from center)
  if (sectorDist > 0.58) {
    anim.dir8 = (Math.round(sectorFloat) % 8) as Direction8;
  }
  return anim.dir8;
}

export interface AnimUpdateInput {
  dt: number;
  desiredFacing: number;
  isMoving: boolean;
  isRunning?: boolean;
  isMounted?: boolean;
  isDead?: boolean;
  turnSpeed?: number;
}

/**
 * Advances the animation state machine strictly inside the simulation step.
 * Handles smooth 8-direction facing, one-shot clip completion, and automatic
 * locomotion transitions (Idle <-> Walk <-> Run <-> Mount).
 */
export function updateAnimMachine(anim: SpriteAnimMachine, input: AnimUpdateInput) {
  const { dt, desiredFacing, isMoving, isRunning = false, isMounted = false, isDead = false } = input;

  anim.hitFlashTimer = Math.max(0, anim.hitFlashTimer - dt);
  anim.mountPhase += dt * (isMoving ? 10.5 : 4.2);

  if (isDead) {
    if (anim.state !== 'death') {
      triggerAnimState(anim, 'death', { force: true });
    }
  } else {
    updateSmoothDir8(anim, desiredFacing, dt, input.turnSpeed ?? 18);
  }

  const clip = ANIM_CLIPS[anim.state];
  const effectiveFps = clip.fps * anim.speedScale;
  const frameDuration = 1 / Math.max(1, effectiveFps);

  anim.clipElapsed += dt;
  anim.frameTime += dt;

  if (clip.loop) {
    // Locomotion state machine transitions
    const desiredLocomotion: AnimState = isMounted
      ? 'mount'
      : isRunning
      ? 'run'
      : isMoving
      ? 'walk'
      : 'idle';

    if (anim.state !== desiredLocomotion && anim.state !== 'death') {
      anim.state = desiredLocomotion;
      const nextClip = ANIM_CLIPS[desiredLocomotion];
      anim.frameIndex = anim.frameIndex % nextClip.frames;
      anim.frameTime = 0;
      anim.clipElapsed = 0;
      anim.clipDuration = nextClip.frames / nextClip.fps;
      anim.speedScale = 1;
    }

    const activeClip = ANIM_CLIPS[anim.state];
    const activeFrameDur = 1 / Math.max(1, activeClip.fps);
    while (anim.frameTime >= activeFrameDur) {
      anim.frameTime -= activeFrameDur;
      anim.frameIndex = (anim.frameIndex + 1) % activeClip.frames;
    }
    anim.normalizedTime = (anim.frameIndex + anim.frameTime / activeFrameDur) / activeClip.frames;
  } else {
    // Non-looping action / reaction clips (Attack, Cast, Hit, Roar, Death)
    while (anim.frameTime >= frameDuration && anim.frameIndex < clip.frames - 1) {
      anim.frameTime -= frameDuration;
      anim.frameIndex += 1;
    }
    anim.normalizedTime = Math.min(1, anim.clipElapsed / Math.max(0.05, anim.clipDuration));

    // Automatically return to locomotion once one-shot clip finishes (except death)
    if (anim.state !== 'death' && anim.clipElapsed >= anim.clipDuration) {
      const returnState: AnimState = isMounted
        ? 'mount'
        : isRunning
        ? 'run'
        : isMoving
        ? 'walk'
        : 'idle';
      anim.state = returnState;
      const nextClip = ANIM_CLIPS[returnState];
      anim.frameIndex = 0;
      anim.frameTime = 0;
      anim.clipElapsed = 0;
      anim.clipDuration = nextClip.frames / nextClip.fps;
      anim.speedScale = 1;
      anim.normalizedTime = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// ENTITY & ITEM CLASSIFICATION HELPERS
// ---------------------------------------------------------------------------
export function inferWeaponKind(itemName?: string, sectId?: string): WeaponVisualKind {
  const n = (itemName || '').toLowerCase();
  if (n.includes('đao')) return 'blade';
  if (n.includes('côn') || n.includes('bổng') || n.includes('chùy')) return 'staff';
  if (n.includes('thương') || n.includes('kích')) return 'spear';
  if (n.includes('tiễn') || n.includes('ám') || n.includes('cung') || n.includes('phi tiêu')) return 'dart';
  if (n.includes('kiếm')) return 'sword';
  if (sectId === 'thieu_lam' || sectId === 'cai_bang') return 'staff';
  if (sectId === 'thien_vuong' || sectId === 'thien_nhan') return 'spear';
  if (sectId === 'duong_mon') return 'dart';
  if (sectId === 'ngu_doc' || sectId === 'thuy_yen') return 'blade';
  return 'sword';
}

export function resolveMountSpecies(
  species?: MountSpecies,
  illusionStyle?: MountSkinStyle
): MountSpecies {
  if (illusionStyle) {
    if (illusionStyle === 'white_tiger') return 'white_tiger';
    if (illusionStyle === 'snow_wolf') return 'snow_wolf';
    if (illusionStyle === 'spirit_fox') return 'spirit_fox';
    if (illusionStyle === 'qilin_flame' || illusionStyle === 'frost_qilin') return 'qilin';
    if (illusionStyle === 'imperial_dragon_steed') return 'divine_beast';
    return 'horse';
  }
  return species || 'horse';
}

export function resolveMonsterArchetype(name: string, kind: string): MonsterArchetype {
  if (kind === 'gate') return 'gate';
  if (kind === 'pillar') return 'pillar';
  if (kind === 'banner') return 'banner';
  if (kind === 'ally_npc') return 'siege_ally';
  if (kind === 'enemy_npc') return 'siege_enemy';

  const n = name.toLowerCase();
  if (n.includes('cổ bách')) return 'boss_co_bach';
  if (n.includes('diệu như')) return 'boss_dieu_nhu';
  if (n.includes('thiên phong')) return 'boss_thien_phong';
  if (n.includes('huyết ma')) return 'boss_huyet_ma';
  if (kind === 'boss') return 'dungeon_boss';

  if (n.includes('trư')) return 'boar';
  if (n.includes('đầu mục')) return 'bandit_chief';
  if (n.includes('thảo khấu') || n.includes('sơn tặc')) return 'bandit';
  if (n.includes('kiếm nô') || n.includes('kiếm đồng')) return 'swordsman';
  if (n.includes('thích khách')) return 'assassin';
  if (n.includes('cuồng kiếm') || n.includes('trưởng lão')) return 'elder_blade';
  if (n.includes('lang')) return 'frost_wolf';
  if (n.includes('thiết kỵ')) return 'armored_cavalry';
  if (n.includes('ma tăng')) return 'snow_monk';
  if (n.includes('tiên phong') || n.includes('hộ vệ') || n.includes('hộ pháp')) return 'vanguard_knight';
  if (n.includes('huyết y') || n.includes('sát thủ')) return 'blood_assassin';
  if (n.includes('tướng quân')) return 'war_general';
  if (n.includes('khôi lỗi')) return 'sword_golem';
  if (n.includes('huyền ma')) return 'dark_demon';
  if (n.includes('tàn hồn') || n.includes('kiếm tôn')) return 'sword_wraith';
  return kind === 'elite' ? 'war_general' : 'bandit';
}

// Helper for crisp integer pixel rectangles
export function pxRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// ---------------------------------------------------------------------------
// PRE-BAKED 8-DIRECTION SPRITE SHEET ATLAS MANAGER WITH ASYNC PRELOADING & LRU
// ---------------------------------------------------------------------------
export interface SpriteSheetEntry {
  canvas: HTMLCanvasElement;
  cellW: number;
  cellH: number;
  cols: number; // Frame count
  rows: number; // 5 canonical orientation rows (S, SE, E, NE, N)
  anchorX: number; // Origin X inside each cell
  anchorY: number; // Origin Y inside each cell
  oversample?: number; // Pixel supersampling factor (e.g. 2 for crisp HD 2.5D sprites)
}

class SpriteAtlasManager {
  private cache = new Map<string, HTMLCanvasElement>();
  private sheetCache = new Map<string, SpriteSheetEntry>();
  private iconUrlCache = new Map<string, string>();
  private preloadedMaps = new Set<string>();
  private preloadQueue: Array<() => void> = [];
  private preloadScheduled = false;
  private readonly maxEntries = 320;
  private readonly maxSheets = 180;

  getSprite(
    key: string,
    width: number,
    height: number,
    builder: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ): HTMLCanvasElement {
    const existing = this.cache.get(key);
    if (existing) {
      this.cache.delete(key);
      this.cache.set(key, existing);
      return existing;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      try {
        builder(ctx, width, height);
      } catch {
        this.drawFallbackSprite(ctx, width, height);
      }
    }

    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest) {
        const oldCanvas = this.cache.get(oldest);
        if (oldCanvas) {
          oldCanvas.width = 0;
          oldCanvas.height = 0;
        }
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, canvas);
    return canvas;
  }

  /**
   * Retrieves or synchronously bakes a 2D Sprite Atlas Sheet [rows = 5 orientations, cols = frames].
   * Cached with LRU eviction for O(1) GPU drawImage blits during the 60fps render loop.
   */
  getOrBakeSheet(
    key: string,
    spec: {
      cellW: number;
      cellH: number;
      cols: number;
      rows: number;
      anchorX: number;
      anchorY: number;
      oversample?: number;
    },
    frameRenderer: (
      ctx: CanvasRenderingContext2D,
      row: AtlasOrientationRow,
      frameIndex: number,
      totalFrames: number
    ) => void
  ): SpriteSheetEntry {
    const existing = this.sheetCache.get(key);
    if (existing) {
      // Refresh LRU position
      this.sheetCache.delete(key);
      this.sheetCache.set(key, existing);
      return existing;
    }

    const ov = spec.oversample ?? 1;
    const canvas = document.createElement('canvas');
    canvas.width = spec.cellW * spec.cols * ov;
    canvas.height = spec.cellH * spec.rows * ov;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = ov > 1;
      if (ov > 1) ctx.imageSmoothingQuality = 'high';
      for (let r = 0; r < spec.rows; r++) {
        for (let f = 0; f < spec.cols; f++) {
          ctx.save();
          const ox = f * spec.cellW * ov;
          const oy = r * spec.cellH * ov;
          ctx.beginPath();
          ctx.rect(ox, oy, spec.cellW * ov, spec.cellH * ov);
          ctx.clip();
          ctx.translate(ox + spec.anchorX * ov, oy + spec.anchorY * ov);
          if (ov !== 1) ctx.scale(ov, ov);
          try {
            frameRenderer(ctx, r as AtlasOrientationRow, f, spec.cols);
          } catch {
            this.drawFallbackSprite(ctx, 24, 24);
          }
          ctx.restore();
        }
      }
    }

    const entry: SpriteSheetEntry = {
      canvas,
      cellW: spec.cellW,
      cellH: spec.cellH,
      cols: spec.cols,
      rows: spec.rows,
      anchorX: spec.anchorX,
      anchorY: spec.anchorY,
      oversample: ov,
    };

    if (this.sheetCache.size >= this.maxSheets) {
      const oldestKey = this.sheetCache.keys().next().value;
      if (oldestKey) {
        const old = this.sheetCache.get(oldestKey);
        if (old) {
          old.canvas.width = 0;
          old.canvas.height = 0;
        }
        this.sheetCache.delete(oldestKey);
      }
    }

    this.sheetCache.set(key, entry);
    return entry;
  }

  hasSheet(key: string): boolean {
    return this.sheetCache.has(key);
  }

  /**
   * Queues non-blocking chunked sprite sheet pre-baking so entering a map or changing
   * equipment warms up 8-dir sheets without frame drops.
   */
  enqueuePreload(task: () => void) {
    if (this.preloadQueue.length > 48) return;
    this.preloadQueue.push(task);
    if (!this.preloadScheduled) {
      this.preloadScheduled = true;
      this.scheduleNextPreloadChunk();
    }
  }

  private scheduleNextPreloadChunk() {
    const runChunk = () => {
      const start = performance.now();
      // Spend at most 4ms per idle slice to maintain locked 60fps
      while (this.preloadQueue.length > 0 && performance.now() - start < 4.0) {
        const job = this.preloadQueue.shift();
        if (job) {
          try {
            job();
          } catch {
            // Safe ignore
          }
        }
      }
      if (this.preloadQueue.length > 0) {
        this.scheduleNextPreloadChunk();
      } else {
        this.preloadScheduled = false;
      }
    };

    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback;
    if (typeof ric === 'function') {
      ric(runChunk, { timeout: 120 });
    } else {
      window.setTimeout(runChunk, 16);
    }
  }

  /**
   * Fast O(1) blit of a single frame from a cached 8-direction Sprite Sheet.
   */
  blitSheetFrame(
    ctx: CanvasRenderingContext2D,
    sheet: SpriteSheetEntry,
    dir8: Direction8,
    frameIndex: number,
    x: number,
    y: number,
    scale = 1,
    alpha = 1
  ) {
    const meta = getDir8Meta(dir8);
    const col = Math.max(0, Math.min(sheet.cols - 1, frameIndex));
    const row = Math.min(sheet.rows - 1, meta.row);
    const ov = sheet.oversample ?? 1;
    const sx = col * sheet.cellW * ov;
    const sy = row * sheet.cellH * ov;
    const sw = sheet.cellW * ov;
    const sh = sheet.cellH * ov;
    const dw = Math.round(sheet.cellW * scale);
    const dh = Math.round(sheet.cellH * scale);
    const ox = Math.round(sheet.anchorX * scale);
    const oy = Math.round(sheet.anchorY * scale);

    ctx.save();
    ctx.imageSmoothingEnabled = ov > 1;
    if (ov > 1) ctx.imageSmoothingQuality = 'high';
    if (alpha < 1) ctx.globalAlpha *= alpha;
    ctx.translate(Math.round(x), Math.round(y));
    if (meta.flipX) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(sheet.canvas, sx, sy, sw, sh, -ox, -oy, dw, dh);
    ctx.restore();
  }

  private drawFallbackSprite(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    pxRect(ctx, cx - 5, cy - 8, 10, 14, '#785A34');
    pxRect(ctx, cx - 4, cy - 7, 8, 12, '#D4AF37');
    pxRect(ctx, cx - 2, cy - 4, 4, 4, '#FEF3C7');
  }

  preloadMapAssets(mapId: string) {
    if (this.preloadedMaps.has(mapId)) return;
    this.preloadedMaps.add(mapId);
    const slots: EquipSlot[] = ['weapon', 'armor', 'bracer', 'ring', 'jade', 'boots'];
    const qualities: ItemQuality[] = ['green', 'blue', 'purple', 'gold', 'mythic'];
    this.enqueuePreload(() => {
      for (const s of slots) {
        for (const q of qualities) {
          this.getItemIconCanvas(s, q, s === 'weapon' ? 'sword' : undefined);
        }
      }
    });
  }

  getItemIconCanvas(
    slot: EquipSlot | 'stone' | 'potion',
    quality: ItemQuality,
    weaponKind: WeaponVisualKind = 'sword'
  ): HTMLCanvasElement {
    const key = `icon_${slot}_${quality}_${weaponKind}`;
    return this.getSprite(key, 16, 16, (ctx) => {
      const qColor = QUALITY_META[quality]?.color || '#E5E0D5';
      const darkOutline = '#140E0B';
      const shine = '#FFFDF5';
      const metalMid =
        quality === 'mythic'
          ? '#F43F5E'
          : quality === 'gold'
          ? '#F59E0B'
          : quality === 'purple'
          ? '#A855F7'
          : quality === 'blue'
          ? '#38BDF8'
          : quality === 'green'
          ? '#22C55E'
          : '#CBD5E1';
      const metalDark =
        quality === 'mythic'
          ? '#881337'
          : quality === 'gold'
          ? '#92400E'
          : quality === 'purple'
          ? '#581C87'
          : quality === 'blue'
          ? '#1E3A8A'
          : quality === 'green'
          ? '#14532D'
          : '#475569';

      if (slot === 'stone') {
        pxRect(ctx, 6, 1, 4, 2, darkOutline);
        pxRect(ctx, 4, 3, 8, 10, darkOutline);
        pxRect(ctx, 6, 13, 4, 2, darkOutline);
        pxRect(ctx, 6, 2, 4, 12, '#A855F7');
        pxRect(ctx, 5, 4, 6, 8, '#C084FC');
        pxRect(ctx, 5, 4, 3, 5, '#F3E8FF');
        pxRect(ctx, 6, 3, 2, 2, shine);
        pxRect(ctx, 8, 8, 2, 4, '#6B21A8');
        pxRect(ctx, 2, 3, 1, 1, '#FDE047');
        pxRect(ctx, 13, 5, 1, 1, '#FDE047');
        pxRect(ctx, 12, 12, 1, 1, '#FDE047');
        return;
      }

      if (slot === 'potion') {
        pxRect(ctx, 6, 1, 4, 2, '#92400E');
        pxRect(ctx, 5, 3, 6, 4, '#14532D');
        pxRect(ctx, 6, 4, 4, 2, '#4ADE80');
        pxRect(ctx, 3, 7, 10, 7, '#14532D');
        pxRect(ctx, 4, 8, 8, 5, '#22C55E');
        pxRect(ctx, 5, 9, 3, 2, '#BBF7D0');
        pxRect(ctx, 5, 6, 6, 1, '#F59E0B');
        return;
      }

      if (slot === 'weapon') {
        if (weaponKind === 'blade') {
          for (let i = 0; i < 8; i++) {
            pxRect(ctx, 4 + i, 10 - i, 3, 2, darkOutline);
            pxRect(ctx, 5 + i, 9 - i, 2, 2, metalMid);
            pxRect(ctx, 6 + i, 8 - i, 1, 1, qColor);
          }
          pxRect(ctx, 11, 2, 3, 3, shine);
          pxRect(ctx, 3, 10, 4, 2, '#F5D061');
          pxRect(ctx, 2, 12, 2, 2, '#7C2D12');
          pxRect(ctx, 1, 13, 2, 2, '#F59E0B');
        } else if (weaponKind === 'staff') {
          for (let i = 0; i < 12; i++) {
            pxRect(ctx, 2 + i, 13 - i, 2, 2, darkOutline);
            pxRect(ctx, 2 + i, 12 - i, 2, 2, i < 3 || i > 9 ? '#F5D061' : metalMid);
          }
          pxRect(ctx, 12, 1, 3, 3, qColor);
          pxRect(ctx, 13, 2, 1, 1, shine);
          pxRect(ctx, 1, 12, 3, 3, '#F59E0B');
        } else if (weaponKind === 'dart') {
          pxRect(ctx, 7, 1, 2, 14, darkOutline);
          pxRect(ctx, 1, 7, 14, 2, darkOutline);
          pxRect(ctx, 4, 4, 8, 8, metalDark);
          pxRect(ctx, 7, 2, 2, 12, metalMid);
          pxRect(ctx, 2, 7, 12, 2, metalMid);
          pxRect(ctx, 6, 6, 4, 4, qColor);
          pxRect(ctx, 7, 7, 2, 2, shine);
          pxRect(ctx, 7, 1, 2, 2, '#4ADE80');
          pxRect(ctx, 13, 7, 2, 2, '#4ADE80');
        } else {
          for (let i = 0; i < 9; i++) {
            pxRect(ctx, 4 + i, 11 - i, 2, 2, darkOutline);
            pxRect(ctx, 5 + i, 10 - i, 2, 1, qColor);
            pxRect(ctx, 5 + i, 11 - i, 1, 1, metalMid);
          }
          pxRect(ctx, 12, 2, 2, 2, shine);
          pxRect(ctx, 3, 9, 5, 2, '#F5D061');
          pxRect(ctx, 4, 10, 2, 2, '#FDE047');
          pxRect(ctx, 2, 12, 2, 2, '#7F1D1D');
          pxRect(ctx, 1, 13, 2, 2, '#F5D061');
        }
        return;
      }

      if (slot === 'armor') {
        pxRect(ctx, 3, 2, 10, 12, darkOutline);
        pxRect(ctx, 1, 3, 3, 6, darkOutline);
        pxRect(ctx, 12, 3, 3, 6, darkOutline);
        pxRect(ctx, 4, 3, 8, 10, metalDark);
        pxRect(ctx, 2, 4, 2, 4, metalMid);
        pxRect(ctx, 12, 4, 2, 4, metalMid);
        pxRect(ctx, 5, 4, 6, 7, metalMid);
        pxRect(ctx, 6, 3, 4, 2, '#140E0B');
        pxRect(ctx, 5, 8, 6, 2, '#F5D061');
        pxRect(ctx, 7, 8, 2, 2, shine);
        pxRect(ctx, 5, 5, 2, 2, qColor);
        return;
      }

      if (slot === 'bracer') {
        pxRect(ctx, 3, 3, 10, 10, darkOutline);
        pxRect(ctx, 4, 4, 8, 8, metalDark);
        pxRect(ctx, 5, 5, 6, 6, metalMid);
        pxRect(ctx, 4, 6, 8, 2, '#F5D061');
        pxRect(ctx, 7, 6, 2, 2, qColor);
        pxRect(ctx, 5, 4, 2, 1, shine);
        return;
      }

      if (slot === 'ring') {
        pxRect(ctx, 4, 5, 8, 8, darkOutline);
        pxRect(ctx, 5, 6, 6, 6, '#F59E0B');
        pxRect(ctx, 6, 7, 4, 4, darkOutline);
        pxRect(ctx, 6, 2, 4, 4, darkOutline);
        pxRect(ctx, 7, 3, 2, 3, qColor);
        pxRect(ctx, 7, 3, 1, 1, shine);
        return;
      }

      if (slot === 'jade') {
        pxRect(ctx, 7, 1, 2, 2, '#F5D061');
        pxRect(ctx, 4, 3, 8, 8, darkOutline);
        pxRect(ctx, 5, 4, 6, 6, metalMid);
        pxRect(ctx, 6, 5, 4, 4, qColor);
        pxRect(ctx, 6, 5, 2, 2, shine);
        pxRect(ctx, 7, 11, 2, 4, '#DC2626');
        pxRect(ctx, 6, 13, 1, 2, '#EF4444');
        pxRect(ctx, 9, 13, 1, 2, '#EF4444');
        return;
      }

      pxRect(ctx, 4, 2, 6, 8, darkOutline);
      pxRect(ctx, 3, 9, 10, 5, darkOutline);
      pxRect(ctx, 5, 3, 4, 7, metalDark);
      pxRect(ctx, 4, 10, 8, 3, metalMid);
      pxRect(ctx, 5, 3, 4, 2, '#F5D061');
      pxRect(ctx, 9, 10, 3, 2, qColor);
      pxRect(ctx, 10, 10, 1, 1, shine);
    });
  }

  getItemIconDataUrl(
    slot: EquipSlot | 'stone' | 'potion',
    quality: ItemQuality,
    weaponKind: WeaponVisualKind = 'sword'
  ): string {
    const key = `url_${slot}_${quality}_${weaponKind}`;
    const existing = this.iconUrlCache.get(key);
    if (existing) return existing;
    const canvas = this.getItemIconCanvas(slot, quality, weaponKind);
    const url = canvas.toDataURL();
    this.iconUrlCache.set(key, url);
    return url;
  }
}

export const spriteAtlas = new SpriteAtlasManager();

// ---------------------------------------------------------------------------
// CENTRALIZED BATTLE SPRITE ATLAS & 8-DIR ANIMATION SYNCHRONIZATION HUB
// ---------------------------------------------------------------------------
export class BattleSpriteAtlasHub {
  private readonly animRegistry = new Map<string, SpriteAnimMachine>();
  private readonly warmedSignatures = new Set<string>();
  globalPhase = 0;

  advanceClock(dt: number) {
    this.globalPhase += dt * 5;
  }

  /**
   * Registers an entity (player, wanderer, rival, mob, elite, boss) into the
   * centralized 8-dir animation registry and schedules deduplicated Sprite Atlas warmups.
   */
  register(
    entityId: string,
    initialFacing = 0,
    initialState: AnimState = 'idle',
    warmup?: { signature: string; tasks: Array<() => void> }
  ): SpriteAnimMachine {
    let machine = this.animRegistry.get(entityId);
    if (!machine) {
      machine = createAnimMachine(initialFacing, initialState);
      this.animRegistry.set(entityId, machine);
    }
    if (warmup) {
      this.ensureWarmedUp(warmup.signature, warmup.tasks);
    }
    return machine;
  }

  /**
   * Deduplicates Sprite Atlas pre-bake requests per visual signature so spawning
   * dozens of identical mobs or siege soldiers never queues redundant work.
   */
  ensureWarmedUp(signature: string, tasks: Array<() => void>) {
    if (this.warmedSignatures.has(signature)) return;
    this.warmedSignatures.add(signature);
    for (const task of tasks) {
      spriteAtlas.enqueuePreload(task);
    }
  }

  getAnim(entityId: string, fallbackFacing = 0): SpriteAnimMachine {
    let machine = this.animRegistry.get(entityId);
    if (!machine) {
      machine = createAnimMachine(fallbackFacing, 'idle');
      this.animRegistry.set(entityId, machine);
    }
    return machine;
  }

  trigger(
    entityId: string,
    nextState: AnimState,
    opts?: { durationSec?: number; force?: boolean; hitFlashSec?: number }
  ) {
    const machine = this.animRegistry.get(entityId);
    if (!machine) return;
    triggerAnimState(machine, nextState, opts);
  }

  stepEntity(entityId: string, input: AnimUpdateInput): SpriteAnimMachine {
    const machine = this.getAnim(entityId, input.desiredFacing);
    updateAnimMachine(machine, input);
    return machine;
  }

  /**
   * Transfers a defeated entity's exact 8-direction facing into a dying slot
   * and triggers its death collapse clip smoothly.
   */
  transferToDying(liveEntityId: string, dyingEntityId: string, durationSec: number): SpriteAnimMachine {
    const prev = this.animRegistry.get(liveEntityId);
    const deadMachine: SpriteAnimMachine = prev
      ? { ...prev }
      : createAnimMachine(0, 'death');
    this.animRegistry.delete(liveEntityId);
    triggerAnimState(deadMachine, 'death', { durationSec, force: true });
    this.animRegistry.set(dyingEntityId, deadMachine);
    return deadMachine;
  }

  unregister(entityId: string) {
    this.animRegistry.delete(entityId);
  }

  clear() {
    this.animRegistry.clear();
    this.warmedSignatures.clear();
    this.globalPhase = 0;
  }
}

