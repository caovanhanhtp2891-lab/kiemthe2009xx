import { ElementType, SkillVfxKind } from './types';

// ---------------------------------------------------------------------------
// GENERIC ZERO-GC OBJECT POOL (Dense Backing Array + O(1) Swap-and-Pop)
// ---------------------------------------------------------------------------
export class ObjectPool<T> {
  readonly items: T[];
  activeCount = 0;
  readonly capacity: number;
  private readonly resetFn: (item: T) => void;

  constructor(capacity: number, factory: () => T, resetFn: (item: T) => void) {
    this.capacity = capacity;
    this.resetFn = resetFn;
    this.items = new Array<T>(capacity);
    for (let i = 0; i < capacity; i++) {
      this.items[i] = factory();
    }
  }

  /**
   * Acquires a pooled instance in O(1) with zero heap allocations.
   * When full, recycles slot 0 (oldest/front) cleanly so critical combat VFX never drop.
   */
  acquire(): T {
    let item: T;
    if (this.activeCount < this.capacity) {
      item = this.items[this.activeCount];
      this.activeCount += 1;
    } else {
      // Recycle slot 0 by rotating it to the active tail in O(1) swap
      item = this.items[0];
      const lastIdx = this.capacity - 1;
      this.items[0] = this.items[lastIdx];
      this.items[lastIdx] = item;
    }
    this.resetFn(item);
    return item;
  }

  /**
   * Releases an active item at `index` in O(1) via swap-and-pop (no array splice/shift).
   */
  releaseAt(index: number) {
    const lastIdx = this.activeCount - 1;
    if (index < 0 || index > lastIdx) return;
    const released = this.items[index];
    this.resetFn(released);
    if (index !== lastIdx) {
      this.items[index] = this.items[lastIdx];
      this.items[lastIdx] = released;
    }
    this.activeCount = lastIdx;
  }

  clear() {
    for (let i = 0; i < this.activeCount; i++) {
      this.resetFn(this.items[i]);
    }
    this.activeCount = 0;
  }
}

// ---------------------------------------------------------------------------
// POOLED COMBAT EFFECT INTERFACES
// ---------------------------------------------------------------------------
export type ParticleKind =
  | 'dot'
  | 'spark'
  | 'star'
  | 'shard'
  | 'blade_arc'
  | 'ribbon'
  | 'petal'
  | 'ember'
  | 'lightning'
  | 'smoke'
  | 'ring_wave'
  | 'chevron'
  | 'rune'
  | 'drop';

export interface PooledParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  accentColor: string;
  element: ElementType;
  life: number;
  maxLife: number;
  kind: ParticleKind;
  gravity: number;
  drag: number;
  rotation: number;
  vRot: number;
  length: number;
  scaleY: number;
  growRate: number;
  blendMode: 'normal' | 'lighter';
  // Optional polar orbital/vortex motion (used when orbitSpeed !== 0 or radialSpeed !== 0)
  isOrbital: boolean;
  orbitX: number;
  orbitY: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  radialSpeed: number;
}

export interface PooledSkillRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  accent: string;
  life: number;
  maxLife: number;
  kind: SkillVfxKind;
  angle: number;
  element: ElementType;
  sourceX: number;
  sourceY: number;
}

export interface PooledProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  accent: string;
  team: 'ally' | 'enemy';
  damage: number;
  crit: boolean;
  element: ElementType;
  life: number;
  pierce: boolean;
  poisonDps: number;
  slow: boolean;
  stunSec: number;
  pushStrength: number;
  pullStrength: number;
  drainRatio: number;
  movePoisonSec: number;
  vfxKind: SkillVfxKind;
  hitIds: Set<string>;
}

export interface PooledFloatingText {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  text: string;
  subText: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
  isCrit: boolean;
  critTint: 'gold' | 'crimson_gold';
}

export interface PooledRainRipple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
}

export interface PooledDrawItem<TUnit> {
  y: number;
  isPlayer: boolean;
  unit: TUnit | null;
  deathProgress: number;
}

// ---------------------------------------------------------------------------
// CENTRALIZED COMBAT EFFECT POOLS FOR BATTLECANVAS
// ---------------------------------------------------------------------------
export class CombatEffectPools<TUnit = unknown> {
  readonly particles: ObjectPool<PooledParticle>;
  readonly rings: ObjectPool<PooledSkillRing>;
  readonly projectiles: ObjectPool<PooledProjectile>;
  readonly floatTexts: ObjectPool<PooledFloatingText>;
  readonly rainRipples: ObjectPool<PooledRainRipple>;
  readonly drawOrder: PooledDrawItem<TUnit>[] = [];
  drawOrderCount = 0;

  constructor() {
    this.particles = new ObjectPool<PooledParticle>(
      900,
      () => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 2,
        color: '#FFFFFF',
        accentColor: '#FFFFFF',
        element: 'kim',
        life: 0,
        maxLife: 1,
        kind: 'dot',
        gravity: 0,
        drag: 0.94,
        rotation: 0,
        vRot: 0,
        length: 14,
        scaleY: 1,
        growRate: 0,
        blendMode: 'normal',
        isOrbital: false,
        orbitX: 0,
        orbitY: 0,
        orbitRadius: 0,
        orbitAngle: 0,
        orbitSpeed: 0,
        radialSpeed: 0,
      }),
      (p) => {
        p.life = 0;
        p.kind = 'dot';
        p.accentColor = '#FFFFFF';
        p.element = 'kim';
        p.gravity = 0;
        p.drag = 0.94;
        p.rotation = 0;
        p.vRot = 0;
        p.length = 14;
        p.scaleY = 1;
        p.growRate = 0;
        p.blendMode = 'normal';
        p.isOrbital = false;
        p.orbitX = 0;
        p.orbitY = 0;
        p.orbitRadius = 0;
        p.orbitAngle = 0;
        p.orbitSpeed = 0;
        p.radialSpeed = 0;
      }
    );

    this.rings = new ObjectPool<PooledSkillRing>(
      72,
      () => ({
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 0,
        color: '#F5D061',
        accent: '#FFFFFF',
        life: 0,
        maxLife: 1,
        kind: 'ring',
        angle: 0,
        element: 'kim',
        sourceX: 0,
        sourceY: 0,
      }),
      (r) => {
        r.life = 0;
        r.angle = 0;
        r.sourceX = 0;
        r.sourceY = 0;
      }
    );

    this.projectiles = new ObjectPool<PooledProjectile>(
      128,
      () => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 8,
        color: '#F5D061',
        accent: '#FFFFFF',
        team: 'ally',
        damage: 0,
        crit: false,
        element: 'kim',
        life: 0,
        pierce: false,
        poisonDps: 0,
        slow: false,
        stunSec: 0,
        pushStrength: 0,
        pullStrength: 0,
        drainRatio: 0,
        movePoisonSec: 0,
        vfxKind: 'ring',
        hitIds: new Set<string>(),
      }),
      (proj) => {
        proj.life = 0;
        proj.pierce = false;
        proj.poisonDps = 0;
        proj.slow = false;
        proj.stunSec = 0;
        proj.pushStrength = 0;
        proj.pullStrength = 0;
        proj.drainRatio = 0;
        proj.movePoisonSec = 0;
        proj.vfxKind = 'ring';
        proj.hitIds.clear();
      }
    );

    this.floatTexts = new ObjectPool<PooledFloatingText>(
      72,
      () => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        gravity: 0,
        text: '',
        subText: '',
        color: '#FFFFFF',
        scale: 1,
        life: 0,
        maxLife: 1,
        isCrit: false,
        critTint: 'gold',
      }),
      (ft) => {
        ft.life = 0;
        ft.vx = 0;
        ft.gravity = 0;
        ft.text = '';
        ft.subText = '';
        ft.isCrit = false;
        ft.critTint = 'gold';
      }
    );

    this.rainRipples = new ObjectPool<PooledRainRipple>(
      32,
      () => ({ x: 0, y: 0, r: 0, maxR: 12, alpha: 0 }),
      (rp) => {
        rp.alpha = 0;
      }
    );
  }

  spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    color: string,
    life: number,
    maxLife = life,
    kind: ParticleKind = 'dot',
    gravity = 0,
    drag = 0.94,
    rotation = 0,
    vRot = 0
  ) {
    const pt = this.particles.acquire();
    pt.x = x;
    pt.y = y;
    pt.vx = vx;
    pt.vy = vy;
    pt.size = size;
    pt.color = color;
    pt.life = life;
    pt.maxLife = maxLife;
    pt.kind = kind;
    pt.gravity = gravity;
    pt.drag = drag;
    pt.rotation = rotation;
    pt.vRot = vRot;
    return pt;
  }

  spawnStyledParticle(params: {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    size: number;
    color: string;
    accentColor?: string;
    element?: ElementType;
    life: number;
    kind: ParticleKind;
    gravity?: number;
    drag?: number;
    rotation?: number;
    vRot?: number;
    length?: number;
    scaleY?: number;
    growRate?: number;
    blendMode?: 'normal' | 'lighter';
    isOrbital?: boolean;
    orbitX?: number;
    orbitY?: number;
    orbitRadius?: number;
    orbitAngle?: number;
    orbitSpeed?: number;
    radialSpeed?: number;
  }): PooledParticle {
    const pt = this.particles.acquire();
    pt.x = params.x;
    pt.y = params.y;
    pt.vx = params.vx ?? 0;
    pt.vy = params.vy ?? 0;
    pt.size = params.size;
    pt.color = params.color;
    pt.accentColor = params.accentColor ?? '#FFFFFF';
    pt.element = params.element ?? 'kim';
    pt.life = params.life;
    pt.maxLife = params.life;
    pt.kind = params.kind;
    pt.gravity = params.gravity ?? 0;
    pt.drag = params.drag ?? 0.94;
    pt.rotation = params.rotation ?? 0;
    pt.vRot = params.vRot ?? 0;
    pt.length = params.length ?? 16;
    pt.scaleY = params.scaleY ?? 1;
    pt.growRate = params.growRate ?? 0;
    pt.blendMode = params.blendMode ?? 'normal';
    pt.isOrbital = Boolean(params.isOrbital);
    pt.orbitX = params.orbitX ?? params.x;
    pt.orbitY = params.orbitY ?? params.y;
    pt.orbitRadius = params.orbitRadius ?? 0;
    pt.orbitAngle = params.orbitAngle ?? 0;
    pt.orbitSpeed = params.orbitSpeed ?? 0;
    pt.radialSpeed = params.radialSpeed ?? 0;
    return pt;
  }

  spawnBurst(x: number, y: number, color: string, count: number, speed = 130) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.35 + Math.random() * 0.85);
      this.spawnParticle(
        x,
        y,
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        2 + Math.random() * 3.5,
        color,
        0.35 + Math.random() * 0.35,
        0.7
      );
    }
  }

  /**
   * High-impact golden Critical Hit splatter burst (molten sparks, twinkling 4-point stars,
   * and spinning golden shards) drawn straight from the zero-GC Particle Object Pool.
   */
  spawnCritSplatter(x: number, y: number, fromEnemy = false) {
    const sparkPalette = fromEnemy
      ? ['#FFFBEB', '#FEF08A', '#F5D061', '#FB923C', '#EF4444']
      : ['#FFFFFF', '#FFFBEB', '#FEF08A', '#F5D061', '#F59E0B'];

    // 1. High-velocity molten golden sparks arcing & splattering with gravity
    const sparkCount = 16;
    for (let i = 0; i < sparkCount; i++) {
      const baseAngle = (i / sparkCount) * Math.PI * 2 + (-0.18 + Math.random() * 0.36);
      const speed = 175 + Math.random() * 210;
      const life = 0.36 + Math.random() * 0.3;
      const color = sparkPalette[i % sparkPalette.length];
      this.spawnParticle(
        x + (-4 + Math.random() * 8),
        y + (-4 + Math.random() * 8),
        Math.cos(baseAngle) * speed,
        Math.sin(baseAngle) * speed - 48,
        2.2 + Math.random() * 2.2,
        color,
        life,
        life,
        'spark',
        340 + Math.random() * 140,
        0.955
      );
    }

    // 2. Spinning golden diamond impact shards
    const shardCount = 7;
    for (let i = 0; i < shardCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 95 + Math.random() * 145;
      const life = 0.42 + Math.random() * 0.28;
      this.spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 35,
        3.6 + Math.random() * 2.6,
        i % 2 === 0 ? '#FEF08A' : '#F5D061',
        life,
        life,
        'shard',
        260,
        0.96,
        Math.random() * Math.PI * 2,
        (-9 + Math.random() * 18)
      );
    }

    // 3. Radiant 4-pointed golden starburst flashes around impact core
    const starCount = 5;
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 6 + Math.random() * 16;
      const life = 0.28 + Math.random() * 0.22;
      this.spawnParticle(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        Math.cos(angle) * 42,
        Math.sin(angle) * 42 - 20,
        5.5 + Math.random() * 4.5,
        i === 0 ? '#FFFFFF' : '#FEF08A',
        life,
        life,
        'star',
        0,
        0.92,
        Math.random() * Math.PI,
        (-4 + Math.random() * 8)
      );
    }
  }

  spawnRing(params: {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    color: string;
    accent: string;
    life: number;
    maxLife?: number;
    kind: PooledSkillRing['kind'];
    angle?: number;
    element: ElementType;
    sourceX?: number;
    sourceY?: number;
  }) {
    const r = this.rings.acquire();
    r.x = params.x;
    r.y = params.y;
    r.radius = params.radius;
    r.maxRadius = params.maxRadius;
    r.color = params.color;
    r.accent = params.accent;
    r.life = params.life;
    r.maxLife = params.maxLife ?? params.life;
    r.kind = params.kind;
    r.angle = params.angle ?? 0;
    r.element = params.element;
    r.sourceX = params.sourceX ?? params.x;
    r.sourceY = params.sourceY ?? params.y;
  }

  spawnProjectile(params: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    accent: string;
    team: 'ally' | 'enemy';
    damage: number;
    crit: boolean;
    element: ElementType;
    life: number;
    pierce?: boolean;
    poisonDps?: number;
    slow?: boolean;
    stunSec?: number;
    pushStrength?: number;
    pullStrength?: number;
    drainRatio?: number;
    movePoisonSec?: number;
    vfxKind?: SkillVfxKind;
  }) {
    const proj = this.projectiles.acquire();
    proj.x = params.x;
    proj.y = params.y;
    proj.vx = params.vx;
    proj.vy = params.vy;
    proj.radius = params.radius;
    proj.color = params.color;
    proj.accent = params.accent;
    proj.team = params.team;
    proj.damage = params.damage;
    proj.crit = params.crit;
    proj.element = params.element;
    proj.life = params.life;
    proj.pierce = Boolean(params.pierce);
    proj.poisonDps = params.poisonDps ?? 0;
    proj.slow = Boolean(params.slow);
    proj.stunSec = params.stunSec ?? 0;
    proj.pushStrength = params.pushStrength ?? 0;
    proj.pullStrength = params.pullStrength ?? 0;
    proj.drainRatio = params.drainRatio ?? 0;
    proj.movePoisonSec = params.movePoisonSec ?? 0;
    proj.vfxKind = params.vfxKind ?? 'ring';
  }

  spawnFloatText(
    x: number,
    y: number,
    text: string,
    color: string,
    scale = 1,
    life = 0.95
  ) {
    const ft = this.floatTexts.acquire();
    ft.x = x;
    ft.y = y;
    ft.vx = 0;
    ft.vy = -44 - Math.random() * 14;
    ft.gravity = 0;
    ft.text = text;
    ft.subText = '';
    ft.color = color;
    ft.scale = scale;
    ft.life = life;
    ft.maxLife = life;
    ft.isCrit = false;
    ft.critTint = 'gold';
  }

  /**
   * Spawns an oversized radiant golden Critical Hit floating number with explosive
   * pop-up arc physics and optional martial header ("CHÍ MẠNG!").
   */
  spawnCritFloatText(
    x: number,
    y: number,
    damageText: string,
    headerText = 'CHÍ MẠNG!',
    scale = 1.55,
    critTint: 'gold' | 'crimson_gold' = 'gold',
    life = 1.22
  ) {
    const ft = this.floatTexts.acquire();
    ft.x = x;
    ft.y = y;
    ft.vx = (-34 + Math.random() * 68);
    ft.vy = -128 - Math.random() * 24;
    ft.gravity = 165;
    ft.text = damageText;
    ft.subText = headerText;
    ft.color = '#F5D061';
    ft.scale = scale;
    ft.life = life;
    ft.maxLife = life;
    ft.isCrit = true;
    ft.critTint = critTint;
  }

  spawnRainRipple(x: number, y: number, r: number, maxR: number, alpha: number) {
    if (this.rainRipples.activeCount >= this.rainRipples.capacity) return;
    const rp = this.rainRipples.acquire();
    rp.x = x;
    rp.y = y;
    rp.r = r;
    rp.maxR = maxR;
    rp.alpha = alpha;
  }

  /**
   * Zero-allocation Y-depth draw queue builder for 2.5D character/monster sorting at 60fps.
   */
  beginDrawOrder() {
    this.drawOrderCount = 0;
  }

  pushDrawOrder(y: number, isPlayer: boolean, unit: TUnit | null, deathProgress: number) {
    let slot = this.drawOrder[this.drawOrderCount];
    if (!slot) {
      slot = { y, isPlayer, unit, deathProgress };
      this.drawOrder.push(slot);
    } else {
      slot.y = y;
      slot.isPlayer = isPlayer;
      slot.unit = unit;
      slot.deathProgress = deathProgress;
    }
    this.drawOrderCount += 1;
  }

  /**
   * In-place insertion sort on the active prefix [0..drawOrderCount) —
   * optimal O(N) for nearly-sorted frame-to-frame Y coordinates with ZERO allocations.
   */
  sortDrawOrder() {
    const arr = this.drawOrder;
    const n = this.drawOrderCount;
    for (let i = 1; i < n; i++) {
      const key = arr[i];
      const keyY = key.y;
      let j = i - 1;
      while (j >= 0 && arr[j].y > keyY) {
        arr[j + 1] = arr[j];
        j -= 1;
      }
      arr[j + 1] = key;
    }
  }

  resetAll() {
    this.particles.clear();
    this.rings.clear();
    this.projectiles.clear();
    this.floatTexts.clear();
    this.rainRipples.clear();
    for (let i = 0; i < this.drawOrder.length; i++) {
      this.drawOrder[i].unit = null;
    }
    this.drawOrderCount = 0;
  }
}
