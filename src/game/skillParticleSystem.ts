import { CombatEffectPools, PooledParticle, PooledProjectile } from './effectPool';
import { ElementType, SkillDef, SkillVfxKind } from './types';

export interface ElementVfxPalette {
  primary: string;
  bright: string;
  deep: string;
  rim: string;
  runeLabel: string;
}

export const ELEMENT_VFX_PALETTE: Record<ElementType, ElementVfxPalette> = {
  kim: {
    primary: '#F5D061',
    bright: '#FEF9C3',
    deep: '#B45309',
    rim: 'rgba(69, 26, 3, 0.78)',
    runeLabel: '金',
  },
  moc: {
    primary: '#4ADE80',
    bright: '#DCFCE7',
    deep: '#047857',
    rim: 'rgba(6, 78, 59, 0.80)',
    runeLabel: '木',
  },
  thuy: {
    primary: '#38BDF8',
    bright: '#E0F2FE',
    deep: '#0369A1',
    rim: 'rgba(12, 74, 110, 0.78)',
    runeLabel: '水',
  },
  hoa: {
    primary: '#F97316',
    bright: '#FEF08A',
    deep: '#B91C1C',
    rim: 'rgba(124, 45, 18, 0.82)',
    runeLabel: '火',
  },
  tho: {
    primary: '#D9A05B',
    bright: '#FEF3C7',
    deep: '#4338CA',
    rim: 'rgba(30, 41, 59, 0.80)',
    runeLabel: '土',
  },
};

export interface SkillCastParticleParams {
  skill: SkillDef;
  element: ElementType;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  angle: number;
  isUltimate?: boolean;
}

// ---------------------------------------------------------------------------
// 1. BLADE-QI / SWORD-QI / SPEAR-THRUST / MARTIAL SLASH EMITTER
// ---------------------------------------------------------------------------
function emitBladeQiArc(
  pools: CombatEffectPools<any>,
  cx: number,
  cy: number,
  angle: number,
  radius: number,
  color: string,
  accent: string,
  element: ElementType,
  arcCount: number,
  spreadSpan = 1.15,
  speedScale = 1
) {
  const pal = ELEMENT_VFX_PALETTE[element];
  for (let i = 0; i < arcCount; i++) {
    const frac = arcCount === 1 ? 0.5 : i / (arcCount - 1);
    const a = angle - spreadSpan * 0.5 + frac * spreadSpan + (-0.08 + Math.random() * 0.16);
    const r0 = Math.max(14, radius * (0.28 + Math.random() * 0.25));
    const sp = (165 + Math.random() * 140) * speedScale;
    pools.spawnStyledParticle({
      x: cx + Math.cos(a) * r0,
      y: cy + Math.sin(a) * r0 * 0.72,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp * 0.76,
      size: 3.4 + Math.random() * 2.4,
      length: Math.max(22, radius * (0.34 + Math.random() * 0.22)),
      color: i % 2 === 0 ? color : pal.primary,
      accentColor: accent || pal.bright,
      element,
      life: 0.28 + Math.random() * 0.16,
      kind: 'blade_arc',
      rotation: a,
      vRot: (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.4),
      drag: 0.9,
      growRate: 28,
      blendMode: 'lighter',
    });
  }

  // Incandescent metallic sparks flying along the blade sweep
  const sparkCount = Math.min(20, 6 + arcCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    const a = angle + (-spreadSpan * 0.65 + Math.random() * spreadSpan * 1.3);
    const sp = (180 + Math.random() * 210) * speedScale;
    pools.spawnStyledParticle({
      x: cx + Math.cos(a) * (12 + Math.random() * radius * 0.35),
      y: cy + Math.sin(a) * (12 + Math.random() * radius * 0.25),
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 24,
      size: 2 + Math.random() * 1.9,
      color: i % 3 === 0 ? pal.bright : color,
      accentColor: accent || pal.bright,
      element,
      life: 0.24 + Math.random() * 0.22,
      kind: 'spark',
      gravity: 190,
      drag: 0.93,
      blendMode: 'lighter',
    });
  }
}

// ---------------------------------------------------------------------------
// 2. SUPPORT / BUFF / HEAL / SHIELD HALO BURST & CONTINUOUS ORBITING AURA
// ---------------------------------------------------------------------------
export function emitSupportAuraBurst(
  pools: CombatEffectPools<any>,
  x: number,
  y: number,
  radius: number,
  color: string,
  accent: string,
  element: ElementType,
  vfxKind: SkillVfxKind
) {
  const pal = ELEMENT_VFX_PALETTE[element];

  // 2 layered expanding isometric ground halo waves
  for (let w = 0; w < 2; w++) {
    pools.spawnStyledParticle({
      x,
      y: y + 8,
      size: Math.max(18, radius * (0.24 + w * 0.14)),
      color: w === 0 ? color : accent || pal.bright,
      accentColor: pal.bright,
      element,
      life: 0.56 + w * 0.18,
      kind: 'ring_wave',
      scaleY: 0.48,
      growRate: radius * (1.15 + w * 0.35),
      blendMode: 'lighter',
    });
  }

  // Orbiting support halo ribbons circling the hero
  const orbitCount = vfxKind === 'golden_bell' || vfxKind === 'buddha_aegis' || vfxKind === 'north_shield' ? 10 : 8;
  for (let i = 0; i < orbitCount; i++) {
    const startAng = (i * Math.PI * 2) / orbitCount;
    const baseR = 26 + (i % 2) * 12;
    pools.spawnStyledParticle({
      x: x + Math.cos(startAng) * baseR,
      y: y + 4 + Math.sin(startAng) * baseR * 0.48,
      size: 2.6 + (i % 2) * 0.9,
      length: 16 + (i % 3) * 5,
      color: i % 2 === 0 ? color : accent || pal.bright,
      accentColor: pal.bright,
      element,
      life: 0.62 + Math.random() * 0.22,
      kind: vfxKind === 'lotus_heal' || vfxKind === 'frost_stealth' ? 'petal' : 'ribbon',
      scaleY: 0.48,
      isOrbital: true,
      orbitX: x,
      orbitY: y + 4,
      orbitRadius: baseR,
      orbitAngle: startAng,
      orbitSpeed: (i % 2 === 0 ? 1 : -1) * (3.4 + Math.random() * 1.4),
      radialSpeed: 18,
      blendMode: 'lighter',
    });
  }

  // Ascending Ngũ Hành blessing runes & shimmering stars
  const runeCount = 7;
  for (let i = 0; i < runeCount; i++) {
    const ang = (i * Math.PI * 2) / runeCount + Math.random() * 0.35;
    const dist = 12 + Math.random() * Math.min(42, radius * 0.55);
    pools.spawnStyledParticle({
      x: x + Math.cos(ang) * dist,
      y: y + 10 + Math.sin(ang) * dist * 0.42,
      vx: Math.cos(ang) * 14,
      vy: -56 - Math.random() * 44,
      size: 5 + Math.random() * 3,
      color: i % 2 === 0 ? color : pal.bright,
      accentColor: accent || pal.bright,
      element,
      life: 0.65 + Math.random() * 0.3,
      kind: i % 3 === 0 ? 'star' : 'rune',
      drag: 0.97,
      rotation: Math.random() * Math.PI,
      vRot: (-2 + Math.random() * 4),
      blendMode: 'lighter',
    });
  }
}

/**
 * Emits subtle continuous orbiting elemental wisps while a hero has an active
 * buff, shield, invulnerability, or stealth aura.
 */
export function emitActiveAuraParticles(
  pools: CombatEffectPools<any>,
  x: number,
  y: number,
  element: ElementType,
  color: string,
  accent: string,
  mode: 'buff' | 'shield' | 'invuln' | 'stealth'
) {
  const pal = ELEMENT_VFX_PALETTE[element];
  const ang = Math.random() * Math.PI * 2;
  const baseR = mode === 'invuln' ? 28 : mode === 'shield' ? 25 : 22;

  if (mode === 'stealth') {
    pools.spawnStyledParticle({
      x: x + Math.cos(ang) * 14,
      y: y + 6 + Math.sin(ang) * 7,
      vx: -10 + Math.random() * 20,
      vy: -22 - Math.random() * 18,
      size: 5 + Math.random() * 4,
      color: pal.bright,
      accentColor: color,
      element,
      life: 0.48 + Math.random() * 0.2,
      kind: Math.random() < 0.55 ? 'smoke' : 'petal',
      drag: 0.95,
      growRate: 10,
      blendMode: 'normal',
    });
    return;
  }

  pools.spawnStyledParticle({
    x: x + Math.cos(ang) * baseR,
    y: y + 6 + Math.sin(ang) * baseR * 0.48,
    vx: 0,
    vy: -28 - Math.random() * 20,
    size: mode === 'invuln' ? 3.2 : 2.4,
    length: 13,
    color: mode === 'invuln' ? '#FEF08A' : color,
    accentColor: accent || pal.bright,
    element,
    life: 0.44 + Math.random() * 0.22,
    kind: mode === 'shield' ? 'rune' : mode === 'invuln' ? 'star' : element === 'thuy' ? 'petal' : 'ribbon',
    scaleY: 0.48,
    isOrbital: mode !== 'invuln',
    orbitX: x,
    orbitY: y + 4,
    orbitRadius: baseR,
    orbitAngle: ang,
    orbitSpeed: mode === 'shield' ? 3.2 : 2.6,
    radialSpeed: mode === 'shield' ? -6 : 4,
    rotation: ang,
    vRot: 2.5,
    blendMode: 'lighter',
  });
}

// ---------------------------------------------------------------------------
// 3. PULL (VORTEX SUCTION & TETHER) & PUSH (SHOCKWAVE & KNOCKBACK) EMITTERS
// ---------------------------------------------------------------------------
export function emitPullVortexArea(
  pools: CombatEffectPools<any>,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  accent: string,
  element: ElementType
) {
  const pal = ELEMENT_VFX_PALETTE[element];

  // Contracting implosion ring wave (negative growRate pulls ring inward!)
  pools.spawnStyledParticle({
    x: cx,
    y: cy + 6,
    size: Math.max(44, radius * 0.96),
    color,
    accentColor: accent || pal.bright,
    element,
    life: 0.52,
    kind: 'ring_wave',
    scaleY: 0.52,
    growRate: -radius * 1.48,
    blendMode: 'lighter',
  });

  // 14 swirling inward spiral ribbons drawing from perimeter -> vortex center
  const spiralCount = 14;
  for (let i = 0; i < spiralCount; i++) {
    const startAngle = (i * Math.PI * 2) / spiralCount + Math.random() * 0.25;
    const startR = radius * (0.58 + Math.random() * 0.44);
    const life = 0.42 + Math.random() * 0.22;
    pools.spawnStyledParticle({
      x: cx + Math.cos(startAngle) * startR,
      y: cy + 5 + Math.sin(startAngle) * startR * 0.52,
      size: 2.5 + Math.random() * 1.4,
      length: 18 + Math.random() * 12,
      color: i % 2 === 0 ? color : pal.primary,
      accentColor: accent || pal.bright,
      element,
      life,
      kind: 'ribbon',
      scaleY: 0.52,
      isOrbital: true,
      orbitX: cx,
      orbitY: cy + 5,
      orbitRadius: startR,
      orbitAngle: startAngle,
      orbitSpeed: 4.8 + Math.random() * 2.2,
      radialSpeed: -(startR / life) * 0.92,
      blendMode: 'lighter',
    });
  }

  // 6 inward-pointing directional force chevrons around the rim
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6;
    const startR = radius * 0.88;
    const inwardAngle = a + Math.PI;
    const speed = startR * 2.1;
    pools.spawnStyledParticle({
      x: cx + Math.cos(a) * startR,
      y: cy + Math.sin(a) * startR * 0.55,
      vx: Math.cos(inwardAngle) * speed,
      vy: Math.sin(inwardAngle) * speed * 0.55,
      size: 6.5,
      length: 14,
      color: accent || pal.bright,
      accentColor: color,
      element,
      life: 0.34,
      kind: 'chevron',
      rotation: inwardAngle,
      drag: 0.95,
      blendMode: 'lighter',
    });
  }
}

export function emitTargetPullStream(
  pools: CombatEffectPools<any>,
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  color: string,
  accent: string,
  element: ElementType
) {
  const dx = originX - targetX;
  const dy = originY - targetY;
  const dist = Math.max(12, Math.hypot(dx, dy));
  const ang = Math.atan2(dy, dx);
  const pal = ELEMENT_VFX_PALETTE[element];

  // Tether energy stream + directional pull chevron racing from target back toward caster
  const steps = Math.min(6, Math.max(3, Math.floor(dist / 36)));
  for (let i = 0; i < steps; i++) {
    const frac = i / steps;
    const px = targetX + dx * frac + (-4 + Math.random() * 8);
    const py = targetY + dy * frac + (-4 + Math.random() * 8);
    const sp = 210 + Math.random() * 90;
    pools.spawnStyledParticle({
      x: px,
      y: py,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      size: i === 0 ? 7 : 2.6,
      length: 18,
      color: i % 2 === 0 ? color : pal.bright,
      accentColor: accent || pal.bright,
      element,
      life: 0.28 + Math.random() * 0.14,
      kind: i === 0 || i === Math.floor(steps / 2) ? 'chevron' : 'ribbon',
      rotation: ang,
      drag: 0.96,
      blendMode: 'lighter',
    });
  }
}

export function emitPushShockwaveArea(
  pools: CombatEffectPools<any>,
  cx: number,
  cy: number,
  radius: number,
  angle: number,
  color: string,
  accent: string,
  element: ElementType,
  directionalOnly = false
) {
  const pal = ELEMENT_VFX_PALETTE[element];

  // Rapid expanding shockwave ring
  pools.spawnStyledParticle({
    x: cx,
    y: cy + 5,
    size: 16,
    color,
    accentColor: accent || pal.bright,
    element,
    life: 0.4,
    kind: 'ring_wave',
    scaleY: 0.54,
    growRate: Math.max(180, radius * 2.3),
    blendMode: 'lighter',
  });

  // Outward directional push chevrons + wind-gust ribbons
  const count = directionalOnly ? 5 : 8;
  for (let i = 0; i < count; i++) {
    const a = directionalOnly
      ? angle - 0.65 + (i / Math.max(1, count - 1)) * 1.3
      : (i * Math.PI * 2) / count;
    const sp = 250 + Math.random() * 140;
    pools.spawnStyledParticle({
      x: cx + Math.cos(a) * 18,
      y: cy + Math.sin(a) * 14,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp * (directionalOnly ? 0.85 : 0.62),
      size: 7.5,
      length: 18,
      color: i % 2 === 0 ? pal.bright : color,
      accentColor: accent || pal.bright,
      element,
      life: 0.32 + Math.random() * 0.12,
      kind: 'chevron',
      rotation: a,
      drag: 0.91,
      blendMode: 'lighter',
    });

    pools.spawnStyledParticle({
      x: cx + Math.cos(a) * 12,
      y: cy + Math.sin(a) * 10,
      vx: Math.cos(a) * (sp * 0.82),
      vy: Math.sin(a) * (sp * 0.82) * (directionalOnly ? 0.85 : 0.62),
      size: 3.1,
      length: 22,
      color,
      accentColor: pal.bright,
      element,
      life: 0.34,
      kind: 'blade_arc',
      rotation: a,
      drag: 0.9,
      growRate: 24,
      blendMode: 'lighter',
    });
  }
}

export function emitTargetPushBurst(
  pools: CombatEffectPools<any>,
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  color: string,
  accent: string,
  element: ElementType
) {
  const ang = Math.atan2(targetY - originY, targetX - originX);
  const pal = ELEMENT_VFX_PALETTE[element];

  // High-impact directional chevron + dust kickback behind pushed target
  for (let i = 0; i < 2; i++) {
    const sp = 185 + i * 75;
    pools.spawnStyledParticle({
      x: targetX + Math.cos(ang) * (i * 8),
      y: targetY + Math.sin(ang) * (i * 8),
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      size: 7.2 - i * 1.4,
      length: 16,
      color: i === 0 ? pal.bright : color,
      accentColor: accent || pal.bright,
      element,
      life: 0.28 + i * 0.08,
      kind: 'chevron',
      rotation: ang,
      drag: 0.9,
      blendMode: 'lighter',
    });
  }

  // Kicked-up ground dust clouds + sparks along knockback trajectory
  for (let i = 0; i < 4; i++) {
    const spread = ang + (-0.45 + Math.random() * 0.9);
    const sp = 75 + Math.random() * 95;
    pools.spawnStyledParticle({
      x: targetX,
      y: targetY + 10,
      vx: Math.cos(spread) * sp,
      vy: Math.sin(spread) * sp * 0.65 - 12,
      size: 4.5 + Math.random() * 3.5,
      color: i % 2 === 0 ? color : '#E2E8F0',
      accentColor: pal.deep,
      element,
      life: 0.36 + Math.random() * 0.18,
      kind: 'smoke',
      drag: 0.92,
      growRate: 14,
      blendMode: 'normal',
    });
  }
}

// ---------------------------------------------------------------------------
// 4. MASTER 72-SKILL CAST PARTICLE CHOREOGRAPHER
// ---------------------------------------------------------------------------
export function emitSkillCastParticles(
  pools: CombatEffectPools<any>,
  params: SkillCastParticleParams
) {
  const { skill, element, originX, originY, targetX, targetY, angle, isUltimate } = params;
  const pal = ELEMENT_VFX_PALETTE[element];
  const color = skill.color || pal.primary;
  const accent = skill.accentColor || pal.bright;
  const kind = skill.vfxKind || 'ring';
  const rad = Math.max(54, skill.radius || 75);
  const mult = isUltimate ? 1.35 : 1;

  // A. Dash / Blink origin & destination afterimage smoke & wind ribbons
  if (skill.dashToTarget) {
    const dx = targetX - originX;
    const dy = targetY - originY;
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      pools.spawnStyledParticle({
        x: originX + dx * t + (-6 + Math.random() * 12),
        y: originY + dy * t + (-6 + Math.random() * 12),
        vx: Math.cos(angle) * (60 + Math.random() * 80),
        vy: Math.sin(angle) * (60 + Math.random() * 80) - 10,
        size: 3.2 + Math.random() * 2,
        length: 20 + Math.random() * 10,
        color: i % 2 === 0 ? color : accent,
        accentColor: pal.bright,
        element,
        life: 0.34 + Math.random() * 0.16,
        kind: i % 3 === 0 ? 'smoke' : 'ribbon',
        rotation: angle,
        drag: 0.91,
        growRate: 10,
        blendMode: i % 3 === 0 ? 'normal' : 'lighter',
      });
    }
  }

  // B. Automatic Pull / Push force field particles whenever skill has pullStrength / pushStrength
  if (skill.pullStrength && skill.pullStrength > 0) {
    emitPullVortexArea(pools, targetX, targetY, rad, color, accent, element);
  }
  if (skill.pushStrength && skill.pushStrength > 0) {
    const isDirectional = skill.type === 'projectile' || kind === 'giant_sword_push';
    emitPushShockwaveArea(pools, targetX, targetY, rad, angle, color, accent, element, isDirectional);
  }

  // C. Support / Buff / Heal / Shield / Stealth / Invuln halo choreography
  if (
    skill.type === 'buff' ||
    skill.type === 'heal' ||
    skill.type === 'shield' ||
    Boolean(skill.buffStat) ||
    Boolean(skill.invulnSec) ||
    Boolean(skill.stealthSec) ||
    kind === 'golden_bell' ||
    kind === 'buddha_aegis' ||
    kind === 'lotus_heal' ||
    kind === 'north_shield' ||
    kind === 'gear_aura' ||
    kind === 'compact_buff' ||
    kind === 'evasion_ring' ||
    kind === 'spear_whirl_shield'
  ) {
    emitSupportAuraBurst(pools, originX, originY, rad, color, accent, element, kind);
  }

  // D. Signature 72-Skill VFX Kind Choreography
  switch (kind) {
    // --- BLADE-QI & SWORD-QI ARCS (Thiếu Lâm Đao, Ngũ Độc Đao, Thúy Yên Đao, Võ Đang Kiếm, Đoàn Thị Kiếm...) ---
    case 'blade_arc':
    case 'slash_single':
    case 'slash': {
      const hits = Math.max(1, skill.hits || 1);
      emitBladeQiArc(pools, targetX, targetY, angle, rad, color, accent, element, Math.round(4 * mult) + hits * 2, 1.35, 1.05);
      break;
    }

    case 'blade_wave_line':
    case 'giant_sword_push':
    case 'ocean_wave': {
      emitBladeQiArc(pools, originX + Math.cos(angle) * 26, originY + Math.sin(angle) * 26, angle, rad * 1.1, color, accent, element, Math.round(6 * mult), 0.72, 1.35);
      if (kind === 'ocean_wave') {
        for (let i = 0; i < 10; i++) {
          const a = angle + (-0.55 + Math.random() * 1.1);
          const sp = 140 + Math.random() * 150;
          pools.spawnStyledParticle({
            x: originX + Math.cos(a) * 24,
            y: originY + Math.sin(a) * 24,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 28,
            size: 3.2 + Math.random() * 2.2,
            color: i % 2 === 0 ? '#E0F2FE' : color,
            accentColor: '#FFFFFF',
            element,
            life: 0.42 + Math.random() * 0.18,
            kind: 'drop',
            gravity: 240,
            drag: 0.94,
          });
        }
      }
      break;
    }

    case 'sword_dash_triple':
    case 'sword_triple':
    case 'twin_spirit_swords':
    case 'six_swords':
    case 'finger_seal': {
      emitBladeQiArc(pools, targetX, targetY, angle, rad, color, accent, element, Math.round(5 * mult), 0.85, 1.25);
      for (let i = 0; i < 8; i++) {
        const a = angle + (-0.42 + Math.random() * 0.84);
        const sp = 220 + Math.random() * 180;
        pools.spawnStyledParticle({
          x: targetX,
          y: targetY - 6,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          size: 4 + Math.random() * 2.5,
          color: i % 2 === 0 ? color : pal.bright,
          accentColor: accent,
          element,
          life: 0.3 + Math.random() * 0.18,
          kind: i % 2 === 0 ? 'shard' : 'star',
          rotation: a,
          vRot: (-5 + Math.random() * 10),
          drag: 0.92,
          blendMode: 'lighter',
        });
      }
      break;
    }

    // --- SPEAR THRUST & WHIRL (Thiên Vương Thương, Thiên Nhẫn Thương) ---
    case 'spear_charge':
    case 'spear_flurry':
    case 'crimson_spear_dash':
    case 'spear_tether_pull': {
      const flurry = Math.round((kind === 'spear_flurry' ? 14 : 9) * mult);
      for (let i = 0; i < flurry; i++) {
        const a = angle + (-0.28 + Math.random() * 0.56);
        const sp = 260 + Math.random() * 210;
        pools.spawnStyledParticle({
          x: originX + Math.cos(angle) * (10 + i * 4),
          y: originY + Math.sin(angle) * (10 + i * 4),
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          size: 2.6 + Math.random() * 1.8,
          length: 24 + Math.random() * 14,
          color: i % 3 === 0 ? pal.bright : color,
          accentColor: accent,
          element,
          life: 0.24 + Math.random() * 0.16,
          kind: i % 2 === 0 ? 'ribbon' : 'spark',
          rotation: a,
          drag: 0.92,
          blendMode: 'lighter',
        });
      }
      // Crisp metallic impact flash cross-stars
      for (let i = 0; i < 4; i++) {
        pools.spawnStyledParticle({
          x: targetX + (-14 + Math.random() * 28),
          y: targetY + (-10 + Math.random() * 20),
          size: 6 + Math.random() * 4,
          color: pal.bright,
          accentColor: color,
          element,
          life: 0.28 + Math.random() * 0.12,
          kind: 'star',
          rotation: Math.random() * Math.PI,
          vRot: 4,
          blendMode: 'lighter',
        });
      }
      break;
    }

    // --- SPINNING STAFF & SPEAR HALO (Thiếu Lâm Côn, Cái Bang Bổng, Thiên Vương Bôn Lôi) ---
    case 'star_staff_spin':
    case 'staff_sweep':
    case 'staff_array':
    case 'spear_whirl_shield': {
      const ringCount = Math.round(14 * mult);
      for (let i = 0; i < ringCount; i++) {
        const a = (i * Math.PI * 2) / ringCount;
        const rOrbit = rad * (0.45 + (i % 3) * 0.22);
        pools.spawnStyledParticle({
          x: targetX + Math.cos(a) * rOrbit,
          y: targetY + Math.sin(a) * rOrbit * 0.52,
          size: 3 + Math.random() * 1.6,
          length: 22,
          color: i % 2 === 0 ? color : pal.bright,
          accentColor: accent,
          element,
          life: 0.48 + Math.random() * 0.22,
          kind: i % 3 === 0 ? 'star' : 'blade_arc',
          scaleY: 0.52,
          isOrbital: true,
          orbitX: targetX,
          orbitY: targetY,
          orbitRadius: rOrbit,
          orbitAngle: a,
          orbitSpeed: 6.2 + (i % 2) * 1.8,
          radialSpeed: 24,
          blendMode: 'lighter',
        });
      }
      break;
    }

    // --- HEAVY HAMMER / GROUND SHATTER / METEOR / LION ROAR ---
    case 'hammer_heavy':
    case 'ground_shatter':
    case 'tiger_hammer':
    case 'meteor_strike':
    case 'lion_roar':
    case 'knockback_ring': {
      pools.spawnStyledParticle({
        x: targetX,
        y: targetY + 6,
        size: 18,
        color,
        accentColor: accent,
        element,
        life: 0.46,
        kind: 'ring_wave',
        scaleY: 0.52,
        growRate: rad * 2.1,
        blendMode: 'lighter',
      });
      const debris = Math.round(16 * mult);
      for (let i = 0; i < debris; i++) {
        const a = (i * Math.PI * 2) / debris + Math.random() * 0.2;
        const sp = 110 + Math.random() * 195;
        const isSmoke = i % 3 === 0;
        pools.spawnStyledParticle({
          x: targetX + Math.cos(a) * 14,
          y: targetY + Math.sin(a) * 8,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp * 0.55 - (isSmoke ? 24 : 78),
          size: isSmoke ? 6 + Math.random() * 5 : 3.8 + Math.random() * 2.6,
          color: isSmoke ? '#E2E8F0' : i % 2 === 0 ? color : pal.bright,
          accentColor: accent,
          element,
          life: 0.42 + Math.random() * 0.28,
          kind: isSmoke ? 'smoke' : i % 2 === 0 ? 'shard' : 'spark',
          gravity: isSmoke ? -18 : 320,
          drag: 0.94,
          rotation: Math.random() * Math.PI * 2,
          vRot: -8 + Math.random() * 16,
          growRate: isSmoke ? 14 : 0,
          blendMode: isSmoke ? 'normal' : 'lighter',
        });
      }
      break;
    }

    // --- DRAGONS, FLAME WALLS & SACRED FIRE (Cái Bang, Thiên Nhẫn, Minh Giáo) ---
    case 'dragon':
    case 'dragon_palm':
    case 'fire_wall':
    case 'fire_lotus_pull':
    case 'sacred_fire_rain': {
      const embers = Math.round(22 * mult);
      for (let i = 0; i < embers; i++) {
        const a = Math.random() * Math.PI * 2;
        const dist = Math.random() * rad * 0.85;
        pools.spawnStyledParticle({
          x: targetX + Math.cos(a) * dist,
          y: targetY + Math.sin(a) * dist * 0.55,
          vx: (-36 + Math.random() * 72) + Math.cos(angle) * 40,
          vy: -75 - Math.random() * 115,
          size: 3.2 + Math.random() * 3,
          length: 16,
          color: i % 3 === 0 ? pal.bright : i % 2 === 0 ? color : accent,
          accentColor: pal.bright,
          element,
          life: 0.48 + Math.random() * 0.36,
          kind: i % 4 === 0 ? 'ribbon' : 'ember',
          gravity: -35,
          drag: 0.96,
          rotation: -Math.PI / 2,
          vRot: -3 + Math.random() * 6,
          blendMode: 'lighter',
        });
      }
      break;
    }

    // --- VENOM, TRAPS, POISON MIST & NEEDLES (Đường Môn, Ngũ Độc) ---
    case 'needle_barrage':
    case 'poison_trap':
    case 'venom_palm':
    case 'venom_curse':
    case 'toad_curse':
    case 'yin_wind':
    case 'soul_drain':
    case 'dispel_seal': {
      const count = Math.round(18 * mult);
      for (let i = 0; i < count; i++) {
        const a = kind === 'needle_barrage' ? angle + (-0.42 + Math.random() * 0.84) : Math.random() * Math.PI * 2;
        const dist = kind === 'needle_barrage' ? 12 + Math.random() * 28 : Math.random() * rad * 0.82;
        const sp = kind === 'needle_barrage' ? 240 + Math.random() * 160 : 50 + Math.random() * 90;
        const isMist = kind !== 'needle_barrage' && i % 3 === 0;
        pools.spawnStyledParticle({
          x: targetX + Math.cos(a) * dist,
          y: targetY + Math.sin(a) * dist * 0.56,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp * 0.7 - (isMist ? 26 : 12),
          size: isMist ? 7 + Math.random() * 5 : 3 + Math.random() * 2.2,
          color: i % 3 === 0 ? accent : color,
          accentColor: pal.bright,
          element,
          life: 0.44 + Math.random() * 0.32,
          kind: isMist ? 'smoke' : kind === 'needle_barrage' ? 'spark' : i % 2 === 0 ? 'drop' : 'petal',
          gravity: isMist ? -15 : 140,
          drag: 0.93,
          rotation: a,
          vRot: -4 + Math.random() * 8,
          growRate: isMist ? 12 : 0,
          blendMode: isMist ? 'normal' : 'lighter',
        });
      }
      break;
    }

    // --- FROST, ICE PILLARS, LOTUS PETALS & SNOW (Nga Mi, Thúy Yên, Đoàn Thị) ---
    case 'lotus':
    case 'four_palms':
    case 'frost_shatter':
    case 'frost_stealth':
    case 'ice_pillars':
    case 'ice_needles':
    case 'frost_beam':
    case 'water_steps': {
      const frostCount = Math.round(20 * mult);
      for (let i = 0; i < frostCount; i++) {
        const a = (i * Math.PI * 2) / frostCount + Math.random() * 0.25;
        const dist = Math.random() * rad * 0.8;
        const sp = 70 + Math.random() * 135;
        pools.spawnStyledParticle({
          x: targetX + Math.cos(a) * dist,
          y: targetY + Math.sin(a) * dist * 0.54,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp * 0.55 - 32,
          size: 4 + Math.random() * 3.2,
          color: i % 3 === 0 ? '#FFFFFF' : i % 2 === 0 ? color : accent,
          accentColor: '#E0F2FE',
          element,
          life: 0.48 + Math.random() * 0.34,
          kind: i % 3 === 0 ? 'shard' : i % 3 === 1 ? 'petal' : 'star',
          gravity: 85,
          drag: 0.94,
          rotation: Math.random() * Math.PI * 2,
          vRot: -6 + Math.random() * 12,
          blendMode: 'lighter',
        });
      }
      break;
    }

    // --- SWORD RAIN / TAIJI DOMAIN / THUNDER & STORM (Võ Đang, Côn Lôn) ---
    case 'swords':
    case 'sword_rain':
    case 'sword_converge':
    case 'taiji_domain':
    case 'thunder_strike':
    case 'thunder_cluster':
    case 'wind_lightning': {
      const isLightning = kind === 'thunder_strike' || kind === 'thunder_cluster' || kind === 'wind_lightning';
      const count = Math.round(18 * mult);
      for (let i = 0; i < count; i++) {
        const a = (i * Math.PI * 2) / count + Math.random() * 0.3;
        const dist = Math.random() * rad * 0.88;
        if (isLightning) {
          pools.spawnStyledParticle({
            x: targetX + Math.cos(a) * dist,
            y: targetY + Math.sin(a) * dist * 0.55 - (i % 3 === 0 ? 35 : 0),
            vx: Math.cos(a) * 110,
            vy: Math.sin(a) * 70 - 25,
            size: 2.2 + Math.random() * 1.4,
            length: 20 + Math.random() * 18,
            color: i % 2 === 0 ? color : pal.bright,
            accentColor: '#FFFFFF',
            element,
            life: 0.24 + Math.random() * 0.18,
            kind: i % 2 === 0 ? 'lightning' : 'spark',
            rotation: Math.random() * Math.PI * 2,
            drag: 0.92,
            blendMode: 'lighter',
          });
        } else {
          pools.spawnStyledParticle({
            x: targetX + Math.cos(a) * dist,
            y: targetY + Math.sin(a) * dist * 0.52 - 55 * Math.random(),
            vx: Math.cos(a) * (kind === 'sword_converge' ? -95 : 35),
            vy: kind === 'sword_rain' ? 165 + Math.random() * 110 : -30 + Math.random() * 60,
            size: 4.5 + Math.random() * 2.5,
            color: i % 2 === 0 ? color : pal.bright,
            accentColor: accent,
            element,
            life: 0.44 + Math.random() * 0.24,
            kind: i % 3 === 0 ? 'rune' : 'shard',
            rotation: kind === 'sword_rain' ? Math.PI * 0.52 : a,
            vRot: kind === 'sword_rain' ? 0 : 4,
            drag: 0.95,
            blendMode: 'lighter',
          });
        }
      }
      break;
    }

    // --- VORTEX PULL / SHADOW BLINK / DEFAULT ELEMENTAL RING ---
    case 'vortex_pull': {
      if (!skill.pullStrength) {
        emitPullVortexArea(pools, targetX, targetY, rad, color, accent, element);
      }
      break;
    }

    case 'shadow_blink': {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 55 + Math.random() * 90;
        pools.spawnStyledParticle({
          x: targetX + Math.cos(a) * 14,
          y: targetY + Math.sin(a) * 10,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 18,
          size: 6 + Math.random() * 4.5,
          color: i % 2 === 0 ? color : pal.bright,
          accentColor: pal.deep,
          element,
          life: 0.42 + Math.random() * 0.22,
          kind: i % 2 === 0 ? 'smoke' : 'ribbon',
          rotation: a,
          drag: 0.91,
          growRate: 12,
          blendMode: i % 2 === 0 ? 'normal' : 'lighter',
        });
      }
      break;
    }

    default: {
      emitBladeQiArc(pools, targetX, targetY, angle, rad * 0.85, color, accent, element, Math.round(4 * mult), 1.6, 0.95);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// 5. PROJECTILE IN-FLIGHT TRAIL & IMPACT PARTICLE EMITTERS
// ---------------------------------------------------------------------------
export function emitProjectileTrailParticle(
  pools: CombatEffectPools<any>,
  proj: PooledProjectile
) {
  const ang = Math.atan2(proj.vy, proj.vx);
  const pal = ELEMENT_VFX_PALETTE[proj.element];
  const jitter = (-proj.radius * 0.45) + Math.random() * (proj.radius * 0.9);
  const perp = ang + Math.PI / 2;
  const px = proj.x + Math.cos(perp) * jitter;
  const py = proj.y + Math.sin(perp) * jitter;

  if (proj.vfxKind === 'blade_wave_line' || proj.vfxKind === 'giant_sword_push') {
    pools.spawnStyledParticle({
      x: px,
      y: py,
      vx: -proj.vx * 0.14,
      vy: -proj.vy * 0.14,
      size: 2.8,
      length: Math.max(18, proj.radius * 1.9),
      color: proj.color,
      accentColor: proj.accent || pal.bright,
      element: proj.element,
      life: 0.2,
      kind: 'blade_arc',
      rotation: ang,
      drag: 0.9,
      blendMode: 'lighter',
    });
  } else if (proj.vfxKind === 'dragon_palm' || proj.element === 'hoa') {
    pools.spawnStyledParticle({
      x: px,
      y: py,
      vx: -proj.vx * 0.12 + (-22 + Math.random() * 44),
      vy: -proj.vy * 0.12 - 28 - Math.random() * 25,
      size: 3 + Math.random() * 2.2,
      color: Math.random() < 0.4 ? '#FEF08A' : proj.color,
      accentColor: '#FFFFFF',
      element: proj.element,
      life: 0.28 + Math.random() * 0.16,
      kind: 'ember',
      gravity: -28,
      drag: 0.94,
      blendMode: 'lighter',
    });
  } else if (proj.vfxKind === 'venom_palm' || proj.vfxKind === 'venom_curse' || proj.poisonDps > 0) {
    pools.spawnStyledParticle({
      x: px,
      y: py,
      vx: -proj.vx * 0.08 + (-15 + Math.random() * 30),
      vy: -14 - Math.random() * 20,
      size: 4.5 + Math.random() * 3,
      color: Math.random() < 0.4 ? '#A855F7' : proj.color,
      accentColor: pal.bright,
      element: proj.element,
      life: 0.34 + Math.random() * 0.14,
      kind: Math.random() < 0.55 ? 'smoke' : 'drop',
      drag: 0.93,
      growRate: 8,
      blendMode: 'normal',
    });
  } else if (proj.vfxKind === 'wind_lightning') {
    pools.spawnStyledParticle({
      x: px,
      y: py,
      vx: -proj.vx * 0.1,
      vy: -proj.vy * 0.1,
      size: 1.9,
      length: 16,
      color: proj.color,
      accentColor: '#FFFFFF',
      element: proj.element,
      life: 0.16,
      kind: 'lightning',
      rotation: ang + (-0.4 + Math.random() * 0.8),
      drag: 0.9,
      blendMode: 'lighter',
    });
  } else if (proj.element === 'thuy' || proj.vfxKind === 'ocean_wave' || proj.vfxKind === 'ice_pillars' || proj.vfxKind === 'ice_needles') {
    pools.spawnStyledParticle({
      x: px,
      y: py,
      vx: -proj.vx * 0.12,
      vy: -proj.vy * 0.12 - 12,
      size: 3 + Math.random() * 2,
      color: Math.random() < 0.45 ? '#FFFFFF' : proj.color,
      accentColor: '#E0F2FE',
      element: proj.element,
      life: 0.24 + Math.random() * 0.14,
      kind: proj.vfxKind === 'ocean_wave' ? 'drop' : 'shard',
      rotation: ang,
      vRot: 5,
      drag: 0.92,
      blendMode: 'lighter',
    });
  } else {
    pools.spawnStyledParticle({
      x: px,
      y: py,
      vx: -proj.vx * 0.16,
      vy: -proj.vy * 0.16,
      size: 2.2 + Math.random() * 1.4,
      length: 14,
      color: proj.color,
      accentColor: proj.accent || pal.bright,
      element: proj.element,
      life: 0.18 + Math.random() * 0.1,
      kind: 'spark',
      drag: 0.92,
      blendMode: 'lighter',
    });
  }
}

export function emitProjectileImpactParticles(
  pools: CombatEffectPools<any>,
  proj: PooledProjectile,
  hitX: number,
  hitY: number,
  casterX: number,
  casterY: number
) {
  const pal = ELEMENT_VFX_PALETTE[proj.element];
  const ang = Math.atan2(proj.vy, proj.vx);

  for (let i = 0; i < 6; i++) {
    const a = ang + Math.PI + (-1.1 + Math.random() * 2.2);
    const sp = 95 + Math.random() * 145;
    pools.spawnStyledParticle({
      x: hitX,
      y: hitY,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 24,
      size: 2.6 + Math.random() * 2,
      color: i % 2 === 0 ? proj.color : pal.bright,
      accentColor: proj.accent || pal.bright,
      element: proj.element,
      life: 0.24 + Math.random() * 0.16,
      kind: proj.element === 'thuy' ? 'shard' : proj.element === 'hoa' ? 'ember' : 'spark',
      gravity: 160,
      drag: 0.93,
      rotation: a,
      vRot: 6,
      blendMode: 'lighter',
    });
  }

  if (proj.pushStrength > 0) {
    emitTargetPushBurst(pools, hitX - Math.cos(ang) * 40, hitY - Math.sin(ang) * 40, hitX, hitY, proj.color, proj.accent, proj.element);
  } else if (proj.pullStrength > 0) {
    emitTargetPullStream(pools, casterX, casterY, hitX, hitY, proj.color, proj.accent, proj.element);
  }
}

// ---------------------------------------------------------------------------
// 6. ZERO-GC PHYSICS UPDATER (LINEAR + POLAR SPIRAL / VORTEX / ORBIT)
// ---------------------------------------------------------------------------
export function updatePooledParticles(pools: CombatEffectPools<any>, dt: number) {
  const particlePool = pools.particles;
  for (let i = particlePool.activeCount - 1; i >= 0; i--) {
    const pt = particlePool.items[i];
    if (pt.isOrbital) {
      pt.orbitAngle += pt.orbitSpeed * dt;
      pt.orbitRadius = Math.max(2, pt.orbitRadius + pt.radialSpeed * dt);
      const nextX = pt.orbitX + Math.cos(pt.orbitAngle) * pt.orbitRadius;
      const nextY = pt.orbitY + Math.sin(pt.orbitAngle) * pt.orbitRadius * pt.scaleY;
      pt.vx = (nextX - pt.x) / Math.max(0.004, dt);
      pt.vy = (nextY - pt.y) / Math.max(0.004, dt);
      pt.x = nextX;
      pt.y = nextY;
      pt.rotation = Math.atan2(pt.vy, pt.vx);
    } else {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.gravity !== 0) {
        pt.vy += pt.gravity * dt;
      }
      pt.vx *= pt.drag;
      pt.vy *= pt.drag;
      if (pt.vRot !== 0) {
        pt.rotation += pt.vRot * dt;
      }
    }

    if (pt.growRate !== 0) {
      pt.size = Math.max(1.5, pt.size + pt.growRate * dt);
    }

    pt.life -= dt;
    if (pt.life <= 0) {
      particlePool.releaseAt(i);
    }
  }
}

// ---------------------------------------------------------------------------
// 7. HIGH-CONTRAST DAYTIME CANVAS 2D PARTICLE RENDERER (ALL 14 KINDS)
// ---------------------------------------------------------------------------
export function renderPooledParticles(
  ctx: CanvasRenderingContext2D,
  pools: CombatEffectPools<any>
) {
  const ptItems = pools.particles.items;
  const count = pools.particles.activeCount;

  for (let i = 0; i < count; i++) {
    const pt: PooledParticle = ptItems[i];
    const alpha = Math.max(0, Math.min(1, pt.life / Math.max(0.01, pt.maxLife)));
    const pal = ELEMENT_VFX_PALETTE[pt.element || 'kim'];

    switch (pt.kind) {
      case 'dot': {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'spark': {
        ctx.save();
        ctx.globalAlpha = alpha;
        const tailX = pt.x - pt.vx * 0.036;
        const tailY = pt.y - pt.vy * 0.036;
        ctx.lineCap = 'round';
        // Subtle dark contrast backing for bright daytime maps
        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = Math.max(2.2, pt.size * alpha * 1.45);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = Math.max(1.2, pt.size * alpha);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(1, pt.size * 0.52 * alpha), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'shard': {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rotation);
        ctx.globalAlpha = alpha;
        const s = pt.size * (0.55 + alpha * 0.45);
        ctx.fillStyle = pt.color;
        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.4);
        ctx.lineTo(s * 0.65, 0);
        ctx.lineTo(0, s * 1.4);
        ctx.lineTo(-s * 0.65, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, -s * 0.2, Math.max(0.9, s * 0.24), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'star': {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rotation);
        ctx.globalAlpha = alpha;
        const rOuter = pt.size * (0.65 + alpha * 0.55);
        const rInner = rOuter * 0.24;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const rad = k % 2 === 0 ? rOuter : rInner;
          const ang = (k * Math.PI) / 4;
          const px = Math.cos(ang) * rad;
          const py = Math.sin(ang) * rad;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1.1, rInner * 0.8), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'blade_arc': {
        // Tapered martial crescent blade-qi streak with dark contrast rim + glowing elemental edge + white core
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rotation);
        ctx.globalAlpha = alpha;
        const arcR = Math.max(10, pt.length * 0.72);
        const span = 0.76 + (1 - alpha) * 0.24;
        ctx.lineCap = 'round';

        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = Math.max(3.6, pt.size * 1.45 * alpha + 1.4);
        ctx.beginPath();
        ctx.arc(-arcR * 0.45, 0, arcR, -span, span);
        ctx.stroke();

        ctx.strokeStyle = pt.color;
        ctx.lineWidth = Math.max(2.2, pt.size * alpha + 0.9);
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = pt.accentColor || '#FFFFFF';
        ctx.lineWidth = Math.max(1.1, pt.size * 0.44 * alpha + 0.4);
        ctx.beginPath();
        ctx.arc(-arcR * 0.4, 0, arcR * 0.98, -span * 0.72, span * 0.72);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'ribbon': {
        // Flowing directional qi / vortex / tether ribbon aligned with velocity
        ctx.save();
        const ang = pt.vx !== 0 || pt.vy !== 0 ? Math.atan2(pt.vy, pt.vx) : pt.rotation;
        const speed = Math.hypot(pt.vx, pt.vy);
        const len = Math.max(10, Math.min(34, pt.length * (0.7 + Math.min(1, speed / 260) * 0.5)));
        ctx.translate(pt.x, pt.y);
        ctx.rotate(ang);
        ctx.globalAlpha = alpha * 0.94;
        ctx.lineCap = 'round';

        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = Math.max(2.6, pt.size * 1.35 * alpha + 1);
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.quadraticCurveTo(-len * 0.45, -pt.size * 0.7, 2, 0);
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = Math.max(1.6, pt.size * alpha + 0.6);
        ctx.stroke();

        ctx.strokeStyle = pt.accentColor || '#FFFFFF';
        ctx.lineWidth = Math.max(0.9, pt.size * 0.42 * alpha);
        ctx.beginPath();
        ctx.moveTo(-len * 0.65, 0);
        ctx.lineTo(2, 0);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'petal': {
        // Lotus petal / snow blossom / jade leaf tumbling gently
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rotation);
        ctx.globalAlpha = alpha * 0.92;
        const s = pt.size * (0.7 + alpha * 0.35);
        ctx.fillStyle = pt.color;
        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(s * 1.25, 0);
        ctx.quadraticCurveTo(0, -s * 0.78, -s * 1.15, 0);
        ctx.quadraticCurveTo(0, s * 0.78, s * 1.25, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = pt.accentColor || '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(s * 0.2, 0, s * 0.42, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'ember': {
        // Buoyant glowing fire/qi ember with flickering incandescent core
        ctx.save();
        const wobble = Math.sin(pt.life * 26 + pt.x * 0.1) * 2.2;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pal.rim;
        ctx.beginPath();
        ctx.ellipse(pt.x + wobble, pt.y, pt.size * 1.1, pt.size * 1.45, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.ellipse(pt.x + wobble, pt.y, pt.size * 0.85, pt.size * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(pt.x + wobble, pt.y, Math.max(0.9, pt.size * 0.42), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'lightning': {
        // Jagged micro-lightning bolt segment
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rotation);
        ctx.globalAlpha = alpha;
        const l = pt.length;
        ctx.lineJoin = 'bevel';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-l * 0.5, 0);
        ctx.lineTo(-l * 0.18, -4.5);
        ctx.lineTo(l * 0.16, 4.5);
        ctx.lineTo(l * 0.5, 0);

        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = pt.size * 2.1;
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = pt.size * 1.3;
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(1, pt.size * 0.55);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'smoke': {
        // Soft poison mist / stealth fog / ground impact dust cloud
        ctx.save();
        ctx.globalAlpha = alpha * 0.48;
        const grad = ctx.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, pt.size);
        grad.addColorStop(0, pt.color);
        grad.addColorStop(0.65, `${pt.color}66`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'ring_wave': {
        // Isometric expanding/contracting ground halo ring (support aura / push / pull)
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.scale(1, pt.scaleY || 0.5);
        ctx.globalAlpha = alpha * 0.88;
        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = 4.6 * alpha + 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(2, pt.size), 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 2.8 * alpha + 0.9;
        ctx.stroke();

        ctx.strokeStyle = pt.accentColor || '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(2, pt.size * 0.94), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'chevron': {
        // Unmistakable directional force arrow for Push (outward) and Pull (inward)
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rotation);
        ctx.globalAlpha = alpha * 0.96;
        const s = pt.size * (0.72 + alpha * 0.35);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = 4.6;
        ctx.beginPath();
        ctx.moveTo(-s, -s * 0.85);
        ctx.lineTo(s * 0.45, 0);
        ctx.lineTo(-s, s * 0.85);
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 2.6;
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'rune': {
        // Floating Ngũ Hành geometric diamond seal ascending around supported hero
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rotation * 0.25);
        ctx.globalAlpha = alpha * 0.92;
        const s = pt.size * (0.75 + alpha * 0.28);
        ctx.fillStyle = pal.rim;
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.85, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.85, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = pt.accentColor || '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1.2, s * 0.28), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'drop': {
        // Water splash / venom droplet aligned with motion
        ctx.save();
        const ang = pt.vx !== 0 || pt.vy !== 0 ? Math.atan2(pt.vy, pt.vx) : pt.rotation;
        ctx.translate(pt.x, pt.y);
        ctx.rotate(ang);
        ctx.globalAlpha = alpha * 0.92;
        const s = pt.size;
        ctx.fillStyle = pt.color;
        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(s * 1.3, 0);
        ctx.quadraticCurveTo(0, -s * 0.8, -s, 0);
        ctx.quadraticCurveTo(0, s * 0.8, s * 1.3, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
}
