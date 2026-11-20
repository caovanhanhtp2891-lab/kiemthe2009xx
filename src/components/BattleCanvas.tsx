import React, { useEffect, useImperativeHandle, useRef } from 'react';
import {
  ASSET_PATHS,
  CHEST_TIER_META,
  DUNGEONS,
  ELEMENT_META,
  MANTLES,
  MAPS,
  MOUNTS,
  MOUNT_ILLUSIONS,
  QUALITY_META,
  SECTS,
  TITLES,
  WORLD_BOSSES,
} from '../game/data';
import {
  computeSpecFinalDamage,
  generateEquipment,
  getCharacterRealm,
  getElementMultiplier,
  getPlayerHotbarSkills,
  getSkillRankFactor,
} from '../game/engine';
import {
  CATALOG_BY_ID,
  catalogSkillToSkillDef,
  getBranchTriggerPassives,
} from '../game/fullSkillCatalog';
import { CombatEffectPools } from '../game/effectPool';
import {
  drawMapGroundLayer,
  drawSceneryProp,
  generateMapScenery,
} from '../game/mapScenery';
import {
  createHeroAtlasWarmup,
  createMonsterAtlasWarmup,
  createMountAtlasWarmup,
  drawDynamicLightPool,
  drawDynamicShadow,
  drawFiveElementSkillVfx,
  drawPixelHero,
  drawPixelMonster,
  drawPixelMount,
  preloadBattleSpriteAtlases,
} from '../game/pixelRenderer';
import {
  ELEMENT_VFX_PALETTE,
  emitActiveAuraParticles,
  emitProjectileImpactParticles,
  emitProjectileTrailParticle,
  emitSkillCastParticles,
  emitTargetPullStream,
  emitTargetPushBurst,
  renderPooledParticles,
  updatePooledParticles,
} from '../game/skillParticleSystem';
import {
  SpriteVfxPool,
  drawVfxSheetFrame,
  preloadAllVfxSheets,
  resolveProjectileCell,
} from '../game/vfxSpriteSheetEngine';
import { soundEngine } from '../game/sound';
import {
  BattleSpriteAtlasHub,
  MonsterArchetype,
  SpriteAnimMachine,
  createAnimMachine,
  inferWeaponKind,
  resolveMonsterArchetype,
  spriteAtlas,
} from '../game/spriteAtlas';
import {
  BattleContext,
  BattleResultSummary,
  ChestTier,
  ComputedStats,
  ElementType,
  EquipSlot,
  EquipmentItem,
  GuildInfo,
  ItemQuality,
  MountDef,
  MountIllusionDef,
  PkMode,
  PlayerState,
  ResourceTerritory,
  SectId,
  SiegeCity,
  SimulatedMaster,
  SkillDef,
  WeatherType,
} from '../game/types';

export interface RadarDot {
  x: number; // 0..1
  y: number; // 0..1
  kind: 'mob' | 'boss' | 'rival' | 'ally' | 'chest';
}

export interface HudTargetSnapshot {
  name: string;
  title?: string;
  hp: number;
  maxHp: number;
  element: ElementType;
  kind: 'mob' | 'elite' | 'boss' | 'rival' | 'ally_npc' | 'enemy_npc' | 'gate' | 'pillar' | 'banner' | 'wanderer';
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  shield: number;
  cooldowns: number[]; // remaining seconds for skills 0..3
  dashCooldown: number;
  objectiveLabel: string;
  objectiveProgress: number; // 0..1
  timerSec: number | null;
  playerCoord?: { x: number; y: number };
  playerNorm?: { x: number; y: number };
  camRect?: { x: number; y: number; w: number; h: number };
  radarDots?: RadarDot[];
  target?: HudTargetSnapshot | null;
}

export interface BattleCanvasHandle {
  castSkill: (skillIndex: number) => void;
  previewSkillVfx: (skillId: string) => void;
  useDash: () => void;
  usePotion: () => boolean;
}

interface BattleCanvasProps {
  player: PlayerState;
  stats: ComputedStats;
  guild: GuildInfo | null;
  battle: BattleContext;
  cities: SiegeCity[];
  territories: ResourceTerritory[];
  masters: SimulatedMaster[];
  weather: WeatherType;
  autoBattle: boolean;
  paused: boolean;
  onHudUpdate: (snap: HudSnapshot) => void;
  onWildKill: (payload: {
    exp: number;
    silver: number;
    stones: number;
    item?: EquipmentItem;
    mobName: string;
  }) => void;
  onPkKill: (payload: {
    victimName: string;
    victimSect: SectId;
    silver: number;
    merit: number;
    stones: number;
    item?: EquipmentItem;
  }) => void;
  onWildPlayerDefeated: (payload: { killerName: string; byPlayer: boolean }) => void;
  onBattleComplete: (result: BattleResultSummary) => void;
  onPotionConsumed: () => void;
  onCollectChest: (tier: ChestTier, mobName: string, openImmediately: boolean) => void;
}

interface Unit {
  id: string;
  name: string;
  title?: string;
  guildTag?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  element: ElementType;
  color: string;
  accentColor: string;
  team: 'ally' | 'enemy' | 'neutral';
  kind: 'mob' | 'elite' | 'boss' | 'rival' | 'ally_npc' | 'enemy_npc' | 'gate' | 'pillar' | 'banner' | 'wanderer';
  speed: number;
  attackCd: number;
  attackRange: number;
  hitFlash: number;
  slowTimer: number;
  stunTimer: number;
  poisonTimer: number;
  poisonDps: number;
  movePoisonTimer?: number;
  movePoisonDps?: number;
  burnTimer?: number;
  burnDps?: number;
  prevX?: number;
  prevY?: number;
  mantleId?: number;
  masterSect?: SectId;
  masterLevel?: number;
  guildRole?: string;
  aggro?: boolean;
  patrolX?: number;
  patrolY?: number;
  // Telegraphing for bosses/rivals
  telegraphTimer: number;
  telegraphMax: number;
  telegraphX: number;
  telegraphY: number;
  telegraphRadius: number;
  expReward?: number;
  silverReward?: number;
  facing: number;
  // Pixel Art HD Animation & Visual Behavior (#5, #6, #7)
  archetype?: MonsterArchetype;
  attackTimer?: number;
  attackMax?: number;
  alertTimer?: number;
  roarTimer?: number;
  enraged?: boolean;
  knockbackX?: number;
  knockbackY?: number;
  isMoving?: boolean;
  spottedPlayer?: boolean;
  patrolWait?: number;
  anim?: SpriteAnimMachine;
}

interface DyingUnit {
  dyingId: string;
  unit: Unit;
  progress: number;
  maxDuration: number;
}

interface LootOrb {
  x: number;
  y: number;
  color: string;
  label: string;
  life: number;
  quality?: ItemQuality;
  slot?: EquipSlot | 'stone';
  itemName?: string;
  sectId?: SectId;
  age?: number;
}

interface FieldChest {
  id: string;
  x: number;
  y: number;
  tier: ChestTier;
  sourceName: string;
  age: number;
  bounce: number;
}

interface AmbientMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

interface SnowFlake {
  x: number;
  y: number;
  r: number;
  vy: number;
  driftAmp: number;
  driftPhase: number;
  alpha: number;
}

interface MistBank {
  x: number;
  y: number;
  rx: number;
  ry: number;
  vx: number;
  alpha: number;
}

interface WindStreak {
  x: number;
  y: number;
  len: number;
  speed: number;
  color: string;
  alpha: number;
}

type ComboMultiplier = 1 | 2 | 3 | 5;

interface ComboTierSpec {
  mult: ComboMultiplier;
  damageBonus: number;
  label: string;
  bonusText: string;
  primary: string;
  accent: string;
  glow: string;
  windowSec: number;
}

interface ComboState {
  count: number;
  tier: ComboMultiplier;
  bestCount: number;
  totalDamage: number;
  timer: number;
  maxTimer: number;
  popScale: number;
  tierFlash: number;
  breakTimer: number;
  brokenCount: number;
  brokenTier: ComboMultiplier;
  brokenByHit: boolean;
}

function resolveComboTier(hits: number): ComboTierSpec {
  if (hits >= 25) {
    return {
      mult: 5,
      damageBonus: 2.15,
      label: 'VÔ SONG BÁ CHỦ',
      bonusText: '+115% ST',
      primary: '#EF4444',
      accent: '#FEF08A',
      glow: 'rgba(239, 68, 68, 0.92)',
      windowSec: 3.3,
    };
  }
  if (hits >= 12) {
    return {
      mult: 3,
      damageBonus: 1.62,
      label: 'PHÁ QUÂN LIÊN KÍCH',
      bonusText: '+62% ST',
      primary: '#FB923C',
      accent: '#FDE047',
      glow: 'rgba(249, 115, 22, 0.85)',
      windowSec: 3.6,
    };
  }
  if (hits >= 5) {
    return {
      mult: 2,
      damageBonus: 1.28,
      label: 'LIÊN HOÀN TRẢM',
      bonusText: '+28% ST',
      primary: '#F5D061',
      accent: '#FFFBEB',
      glow: 'rgba(245, 208, 97, 0.78)',
      windowSec: 3.9,
    };
  }
  return {
    mult: 1,
    damageBonus: 1.0,
    label: 'LIÊN KÍCH',
    bonusText: 'TÍCH LŨY',
    primary: '#DCE7EE',
    accent: '#94A3B8',
    glow: 'rgba(186, 212, 228, 0.5)',
    windowSec: 4.1,
  };
}

interface LevelUpFxState {
  active: boolean;
  elapsed: number;
  duration: number;
  level: number;
  levelsGained: number;
  statSummary: string;
  unlockedLabel: string | null;
  needsBurst: boolean;
}

export const BattleCanvas = React.forwardRef<BattleCanvasHandle, BattleCanvasProps>(
  function BattleCanvas(props, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const propsRef = useRef(props);
    propsRef.current = props;

    const levelUpFxRef = useRef<LevelUpFxState>({
      active: false,
      elapsed: 0,
      duration: 2.9,
      level: props.player.level,
      levelsGained: 1,
      statSummary: '',
      unlockedLabel: null,
      needsBurst: false,
    });
    const prevHeroIdentityRef = useRef({
      name: props.player.name,
      sect: props.player.sect,
      level: props.player.level,
    });

    // Imperative queue for React UI buttons -> 60fps loop
    const pendingActionsRef = useRef<{
      castIndex: number | null;
      previewSkillId: string | null;
      dash: boolean;
      potion: boolean;
    }>({ castIndex: null, previewSkillId: null, dash: false, potion: false });

    const playerRuntimeRef = useRef({
      x: 340,
      y: 300,
      hp: props.stats.maxHp,
      mp: props.stats.maxMp,
      shield: 0,
      facing: 0,
      cooldowns: [0, 0, 0, 0, 0, 0],
      dashCd: 0,
      dashTimer: 0,
      stealthTimer: 0,
      invulnTimer: 0,
      cheatDeathLockUntil: 0,
      lowHpProcLockUntil: 0,
      buffTimer: 0,
      buffAtkPct: 0,
      buffDefPct: 0,
      buffCrit: 0,
      buffDodge: 0,
      buffSpeedPct: 0,
      buffDmgReducePct: 0,
      buffLabel: '',
      buffColor: '',
      buffAccent: '',
      auraTick: 0,
      hitFlash: 0,
      animPhase: 0,
      attackTimer: 0,
      attackMax: 0.34,
      castTimer: 0,
      castMax: 0.45,
      isMoving: false,
      isRunning: false,
      deathTimer: 0,
      moveTarget: null as { x: number; y: number } | null,
      targetUnitId: null as string | null,
      anim: createAnimMachine(0, 'idle'),
    });

    useImperativeHandle(ref, () => ({
      castSkill(idx: number) {
        pendingActionsRef.current.castIndex = idx;
      },
      previewSkillVfx(skillId: string) {
        pendingActionsRef.current.previewSkillId = skillId;
      },
      useDash() {
        pendingActionsRef.current.dash = true;
      },
      usePotion() {
        if (propsRef.current.player.potions <= 0) return false;
        pendingActionsRef.current.potion = true;
        return true;
      },
    }));

    // Reset arena entities whenever battle context or map changes
    const battleKey = `${props.battle.mode}_${props.battle.bossId ?? ''}_${props.battle.dungeonId ?? ''}_${props.battle.dungeonFloor ?? ''}_${props.battle.arenaOpponent?.id ?? ''}_${props.battle.siegeCityId ?? ''}_${props.battle.guildWarTerritoryId ?? ''}_${props.player.currentMapId}`;

    // Warm up updated hero/mount 8-dir Sprite Atlas sheets whenever gear or mount changes
    const heroVisualKey = `${props.player.sect}_${props.player.mantleId}_${props.player.level}_${props.player.isMounted ? 1 : 0}_${props.player.activeMountId ?? ''}_${props.player.activeMountIllusionId ?? ''}_${props.player.equipment.weapon?.id ?? ''}_${props.player.equipment.weapon?.enhance ?? 0}_${props.player.equipment.armor?.id ?? ''}_${props.player.equipment.boots?.id ?? ''}_${props.player.equipment.bracer?.id ?? ''}_${props.player.equipment.jade?.id ?? ''}`;
    useEffect(() => {
      const p = propsRef.current.player;
      const realm = getCharacterRealm(p);
      const mantle = MANTLES.find((m) => m.id === p.mantleId) || MANTLES[0];
      const mount =
        p.isMounted && p.activeMountId
          ? MOUNTS.find((m) => m.id === p.activeMountId) || null
          : null;
      const illusion =
        mount && p.activeMountIllusionId
          ? MOUNT_ILLUSIONS.find((x) => x.id === p.activeMountIllusionId) || null
          : null;
      const illusionStars = illusion ? p.mountIllusions?.[illusion.id] || 1 : 0;

      preloadBattleSpriteAtlases({
        heroParams: {
          sectId: p.sect,
          equipment: p.equipment,
          realmTier: realm.tier,
          mantleId: mantle.id,
          mantleColor: mantle.color,
          isMounted: Boolean(mount),
        },
        mount,
        illusion,
        illusionStars,
        monsters: [],
      });
    }, [heroVisualKey]);

    // Detect character level-up and fire iconic Kiếm Thế 2009 Golden Ascension VFX
    useEffect(() => {
      const prev = prevHeroIdentityRef.current;
      const curName = props.player.name;
      const curSect = props.player.sect;
      const curLevel = props.player.level;

      if (prev.name === curName && prev.sect === curSect && curLevel > prev.level) {
        const gained = curLevel - prev.level;
        const sectDef = SECTS[curSect];
        const hpGain = Math.round(sectDef.growthPerLevel.hp * gained);
        const atkGain = Math.round(sectDef.growthPerLevel.atk * gained);
        const defGain = Math.round(sectDef.growthPerLevel.def * gained);

        const newSkill = sectDef.skills.find(
          (sk) => prev.level < sk.unlockLevel && curLevel >= sk.unlockLevel
        );
        const newPassive = sectDef.passives.find(
          (ps) => prev.level < ps.unlockLevel && curLevel >= ps.unlockLevel
        );
        const unlockedLabel = newSkill
          ? `Mở Tuyệt Học: ${newSkill.name}`
          : newPassive
          ? `Lĩnh Ngộ: ${newPassive.name}`
          : null;

        levelUpFxRef.current = {
          active: true,
          elapsed: 0,
          duration: 2.95,
          level: curLevel,
          levelsGained: gained,
          statSummary: `+${hpGain} HP · +${atkGain} Công · +${defGain} Thủ`,
          unlockedLabel,
          needsBurst: true,
        };
      }

      prevHeroIdentityRef.current = {
        name: curName,
        sect: curSect,
        level: curLevel,
      };
    }, [props.player.level, props.player.name, props.player.sect]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Load backdrop images once
      const wildImg = new Image();
      wildImg.src = ASSET_PATHS.arenaWild;
      const siegeImg = new Image();
      siegeImg.src = ASSET_PATHS.arenaSiege;

      let width = canvas.clientWidth || 1000;
      let height = canvas.clientHeight || 560;
      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        width = Math.max(480, Math.floor(rect.width));
        height = Math.max(320, Math.floor(rect.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener('resize', resize);

      // Preload Sprite Atlas assets for current map (#15)
      spriteAtlas.preloadMapAssets(propsRef.current.player.currentMapId);

      const mode = propsRef.current.battle.mode;
      const worldW =
        mode === 'WILD'
          ? Math.max(width, 2400)
          : mode === 'ARENA'
          ? Math.max(width, 1180)
          : Math.max(width, 1620);
      const worldH =
        mode === 'WILD'
          ? Math.max(height, 1600)
          : mode === 'ARENA'
          ? Math.max(height, 780)
          : Math.max(height, 1060);

      const scenery = generateMapScenery(
        propsRef.current.player.currentMapId,
        mode,
        worldW,
        worldH
      );

      // Initialize runtime state for this battle
      const pr = playerRuntimeRef.current;
      const initStats = propsRef.current.stats;
      pr.x =
        mode === 'WILD'
          ? Math.round(worldW * 0.5)
          : mode === 'SIEGE' || mode === 'GUILD_WAR'
          ? Math.round(worldW * 0.16)
          : Math.round(worldW * 0.30);
      pr.y = Math.round(worldH * 0.52);

      let camX = Math.max(0, Math.min(Math.max(0, worldW - width), pr.x - width * 0.5));
      let camY = Math.max(0, Math.min(Math.max(0, worldH - height), pr.y - height * 0.5));
      pr.hp = initStats.maxHp;
      pr.mp = initStats.maxMp;
      pr.shield = 0;
      pr.cooldowns = [0, 0, 0, 0, 0, 0];
      pr.dashCd = 0;
      pr.dashTimer = 0;
      pr.stealthTimer = 0;
      pr.invulnTimer = 0;
      pr.buffTimer = 0;
      pr.buffAtkPct = 0;
      pr.buffDefPct = 0;
      pr.buffCrit = 0;
      pr.buffDodge = 0;
      pr.buffSpeedPct = 0;
      pr.buffDmgReducePct = 0;
      pr.buffLabel = '';
      pr.buffColor = '';
      pr.buffAccent = '';
      pr.auraTick = 0;
      pr.attackTimer = 0;
      pr.castTimer = 0;
      pr.isMoving = false;
      pr.isRunning = false;
      pr.deathTimer = 0;
      pr.moveTarget = null;
      pr.targetUnitId = null;

      // Centralized Sprite Atlas & 8-Direction Animation Hub + Zero-GC Combat Object Pools
      const PLAYER_ENTITY_ID = '__player__';
      const atlasHub = new BattleSpriteAtlasHub();
      const effectPools = new CombatEffectPools<Unit>();
      pr.anim = atlasHub.register(PLAYER_ENTITY_ID, pr.facing, 'idle');

      const registerUnitInAtlasHub = (u: Unit): SpriteAnimMachine => {
        if (u.anim) return u.anim;
        let warmup: { signature: string; tasks: Array<() => void> } | undefined;
        if ((u.kind === 'wanderer' || u.kind === 'rival') && u.masterSect) {
          const mantleDef = MANTLES.find((m) => m.id === (u.mantleId || 0)) || MANTLES[0];
          warmup = createHeroAtlasWarmup({
            sectId: u.masterSect,
            realmTier: u.kind === 'rival' ? Math.max(2, u.mantleId || 2) : Math.max(1, u.mantleId || 1),
            mantleId: u.mantleId || 0,
            mantleColor: mantleDef.color,
            isMounted: false,
          });
        } else {
          const archetype = u.archetype || resolveMonsterArchetype(u.name, u.kind);
          warmup =
            createMonsterAtlasWarmup({
              archetype,
              color: u.color,
              accentColor: u.accentColor,
              isElite: u.kind === 'elite',
              enraged: Boolean(u.enraged),
            }) || undefined;
        }
        const machine = atlasHub.register(u.id, u.facing, 'idle', warmup);
        u.anim = machine;
        return machine;
      };

      let units: Unit[] = [];
      const dyingUnits: DyingUnit[] = [];
      const lootOrbs: LootOrb[] = [];
      const fieldChests: FieldChest[] = [];
      const ambientMotes: AmbientMote[] = [];

      for (let i = 0; i < 36; i++) {
        ambientMotes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: -14 + Math.random() * 28,
          vy: 10 + Math.random() * 24,
          size: 1.5 + Math.random() * 2.6,
          alpha: 0.25 + Math.random() * 0.45,
        });
      }

      // Dynamic Weather Particle Pools
      const rainDrops: RainDrop[] = Array.from({ length: 95 }, () => ({
        x: Math.random() * (width + 180),
        y: Math.random() * height,
        len: 14 + Math.random() * 14,
        speed: 520 + Math.random() * 220,
        alpha: 0.22 + Math.random() * 0.34,
      }));
      const snowFlakes: SnowFlake[] = Array.from({ length: 80 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1.4 + Math.random() * 3.1,
        vy: 34 + Math.random() * 44,
        driftAmp: 18 + Math.random() * 26,
        driftPhase: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.52,
      }));
      const mistBanks: MistBank[] = Array.from({ length: 9 }, (_, idx) => ({
        x: (idx / 9) * (width + 360) - 180,
        y: height * (0.14 + (idx % 3) * 0.32) + (-25 + Math.random() * 50),
        rx: 170 + Math.random() * 140,
        ry: 58 + Math.random() * 42,
        vx: 14 + Math.random() * 18,
        alpha: 0.14 + Math.random() * 0.12,
      }));
      const windStreaks: WindStreak[] = Array.from({ length: 58 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        len: 26 + Math.random() * 48,
        speed: 260 + Math.random() * 220,
        color: Math.random() < 0.38 ? '#FB923C' : '#D6B896',
        alpha: 0.18 + Math.random() * 0.32,
      }));
      let lastWeather: WeatherType = propsRef.current.weather;
      let weatherFade = 1;
      let weatherClock = 0;
      let lightningFlash = 0;

      let hitstopTimer = 0;
      let shakeIntensity = 0;
      let battleFinished = false;
      let dungeonWave = 1;
      let battleTimer: number | null = null;
      let respawnTicker = 0;
      let hudSyncTimer = 0;
      let objectiveLabel = '';
      let objectiveProgress = 0;

      // Uninterrupted Combo Damage System (x2, x3, x5)
      const combo: ComboState = {
        count: 0,
        tier: 1,
        bestCount: 0,
        totalDamage: 0,
        timer: 0,
        maxTimer: 4.1,
        popScale: 1,
        tierFlash: 0,
        breakTimer: 0,
        brokenCount: 0,
        brokenTier: 1,
        brokenByHit: false,
      };

      const resetCombo = (interruptedByHit: boolean) => {
        if (combo.count >= 5) {
          combo.breakTimer = 0.95;
          combo.brokenCount = combo.count;
          combo.brokenTier = combo.tier;
          combo.brokenByHit = interruptedByHit;
          if (interruptedByHit) {
            addFloatText(pr.x, pr.y - 44, `BỊ NGẮT COMBO (${combo.count}x)!`, '#F87171', 1.08);
          }
        }
        combo.count = 0;
        combo.tier = 1;
        combo.totalDamage = 0;
        combo.timer = 0;
        combo.popScale = 1;
        combo.tierFlash = 0;
      };

      const vfxSheetPool = new SpriteVfxPool(128, 48);
      preloadAllVfxSheets();

      const addParticles = (x: number, y: number, color: string, count: number, speed = 130) => {
        effectPools.spawnBurst(x, y, color, count, speed);
      };

      const addFloatText = (x: number, y: number, text: string, color: string, scale = 1) => {
        const safeX = Math.max(48, Math.min(worldW - 48, x + (-12 + Math.random() * 24)));
        const safeY = Math.max(54, Math.min(worldH - 48, y));
        effectPools.spawnFloatText(safeX, safeY, text, color, scale, 0.92);
      };

      const addCritFloatText = (
        x: number,
        y: number,
        damageText: string,
        headerText = 'CHÍ MẠNG!',
        scale = 1.42,
        critTint: 'gold' | 'crimson_gold' = 'gold'
      ) => {
        const safeX = Math.max(60, Math.min(worldW - 60, x + (-9 + Math.random() * 18)));
        const safeY = Math.max(64, Math.min(worldH - 54, y));
        effectPools.spawnCritFloatText(safeX, safeY, damageText, headerText, scale, critTint, 1.18);
      };

      const clampArena = (x: number, y: number, pad = 56) => ({
        x: Math.max(pad, Math.min(worldW - pad, x)),
        y: Math.max(64, Math.min(worldH - 64, y)),
      });

      const spawnWildMob = (nearPlayer = false) => {
        const map =
          MAPS.find((m) => m.id === propsRef.current.player.currentMapId) || MAPS[0];
        const mobPool = map.mobs;
        const pick =
          Math.random() < 0.18
            ? mobPool[mobPool.length - 1]
            : mobPool[Math.floor(Math.random() * (mobPool.length - 1))];
        let spawnX: number;
        let spawnY: number;
        if (nearPlayer) {
          const ang = Math.random() * Math.PI * 2;
          const dist = 160 + Math.random() * 270;
          spawnX = pr.x + Math.cos(ang) * dist;
          spawnY = pr.y + Math.sin(ang) * dist * 0.72;
        } else {
          spawnX = 110 + Math.random() * (worldW - 220);
          spawnY = 110 + Math.random() * (worldH - 220);
        }
        const pos = clampArena(spawnX, spawnY);
        units.push({
          id: `mob_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: pick.name,
          x: pos.x,
          y: pos.y,
          vx: 0,
          vy: 0,
          radius: pick.isElite ? 22 : 17,
          hp: pick.hp,
          maxHp: pick.hp,
          atk: pick.atk,
          def: pick.def,
          element: map.element,
          color: pick.color,
          accentColor: '#FDE68A',
          team: 'enemy',
          kind: pick.isElite ? 'elite' : 'mob',
          speed: pick.isElite ? 68 : 76,
          attackCd: 0.6 + Math.random() * 0.6,
          attackRange: 52,
          hitFlash: 0,
          slowTimer: 0,
          stunTimer: 0,
          poisonTimer: 0,
          poisonDps: 0,
          telegraphTimer: 0,
          telegraphMax: 0,
          telegraphX: 0,
          telegraphY: 0,
          telegraphRadius: 0,
          expReward: pick.exp,
          silverReward: pick.silver,
          facing: Math.PI,
          archetype: resolveMonsterArchetype(pick.name, pick.isElite ? 'elite' : 'mob'),
          patrolX: pos.x + (-75 + Math.random() * 150),
          patrolY: pos.y + (-55 + Math.random() * 110),
          patrolWait: 0.4 + Math.random() * 1.2,
          spottedPlayer: false,
        });
      };

      const spawnWildWanderer = () => {
        const map = MAPS.find((m) => m.id === propsRef.current.player.currentMapId) || MAPS[0];
        if (map.isSafeZone) return;
        const activeNames = new Set(units.filter((u) => u.kind === 'wanderer').map((u) => u.name));
        const pool = propsRef.current.masters.filter((m) => !activeNames.has(m.name));
        if (pool.length === 0) return;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const mSect = SECTS[pick.sect];
        const refMob = map.mobs[map.mobs.length - 1] || map.mobs[0];
        const hp = Math.round(refMob.hp * 1.65);
        const atk = Math.round(refMob.atk * 1.28);
        const def = Math.round(refMob.def * 1.12);
        const pos = clampArena(
          140 + Math.random() * Math.max(160, worldW - 280),
          130 + Math.random() * Math.max(140, worldH - 260)
        );
        units.push({
          id: `wanderer_${pick.id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          name: pick.name,
          title: pick.titleName || `Tân Vương ${mSect.name}`,
          guildTag: pick.guildName,
          guildRole: pick.rank <= 5 ? 'Bang chủ' : 'Thành viên',
          x: pos.x,
          y: pos.y,
          vx: 0,
          vy: 0,
          radius: 16,
          hp,
          maxHp: hp,
          atk,
          def,
          element: mSect.element,
          color: mSect.color,
          accentColor: '#FDE68A',
          team: 'neutral',
          kind: 'wanderer',
          speed: 78,
          attackCd: 0.9,
          attackRange: pick.sect === 'duong_mon' || pick.sect === 'nga_mi' ? 165 : 74,
          hitFlash: 0,
          slowTimer: 0,
          stunTimer: 0,
          poisonTimer: 0,
          poisonDps: 0,
          mantleId: pick.mantleId,
          masterSect: pick.sect,
          masterLevel: pick.level,
          aggro: false,
          patrolX: 140 + Math.random() * Math.max(160, worldW - 280),
          patrolY: 130 + Math.random() * Math.max(140, worldH - 260),
          telegraphTimer: 0,
          telegraphMax: 0,
          telegraphX: 0,
          telegraphY: 0,
          telegraphRadius: 0,
          silverReward: Math.round(refMob.silver * 3.2),
          facing: Math.PI,
        });
      };

      const isUnitHostileToPlayer = (u: Unit): boolean => {
        if (u.hp <= 0) return false;
        if (u.team === 'enemy') return true;
        if (u.kind === 'wanderer') {
          if (u.aggro) return true;
          if (propsRef.current.battle.mode === 'WILD') {
            const curMap =
              MAPS.find((m) => m.id === propsRef.current.player.currentMapId) || MAPS[0];
            if (!curMap.isSafeZone && propsRef.current.player.pkMode === 'slaughter') {
              return true;
            }
          }
        }
        return false;
      };

      const setupDungeonWave = (waveNum: number) => {
        const dId = propsRef.current.battle.dungeonId || 'tang_kiem';
        const floor = propsRef.current.battle.dungeonFloor || 1;
        const dungeon = DUNGEONS.find((d) => d.id === dId) || DUNGEONS[0];
        const scale = Math.pow(1.24, floor - 1);
        const baseHp = Math.round(dungeon.basePower * 0.55 * scale);
        const baseAtk = Math.round(dungeon.basePower * 0.068 * scale);
        const baseDef = Math.round(dungeon.basePower * 0.025 * scale);

        if (waveNum <= 2) {
          objectiveLabel = `${dungeon.name} · Tầng ${floor} (Đợt ${waveNum}/3)`;
          for (let i = 0; i < 4; i++) {
            const pos = clampArena(worldW * 0.60 + (i % 2) * 125, worldH * 0.36 + Math.floor(i / 2) * 190);
            units.push({
              id: `d_mob_${waveNum}_${i}`,
              name: `${dungeon.name.split(' ')[0]} Hộ Vệ`,
              x: pos.x,
              y: pos.y,
              vx: 0,
              vy: 0,
              radius: 16,
              hp: baseHp,
              maxHp: baseHp,
              atk: baseAtk,
              def: baseDef,
              element: dungeon.element,
              color: ELEMENT_META[dungeon.element].color,
              accentColor: '#FDE68A',
              team: 'enemy',
              kind: 'mob',
              speed: 80,
              attackCd: 0.9,
              attackRange: 54,
              hitFlash: 0,
              slowTimer: 0,
              stunTimer: 0,
              poisonTimer: 0,
              poisonDps: 0,
              telegraphTimer: 0,
              telegraphMax: 0,
              telegraphX: 0,
              telegraphY: 0,
              telegraphRadius: 0,
              facing: Math.PI,
            });
          }
        } else {
          const bossName = dungeon.bossNames[Math.min(dungeon.bossNames.length - 1, Math.floor((floor - 1) / 2))];
          objectiveLabel = `${dungeon.name} · Thủ Lĩnh Tầng ${floor}: ${bossName}`;
          soundEngine.playWarDrum();
          units.push({
            id: `d_boss_${floor}`,
            name: bossName,
            title: `Thủ Lĩnh Tầng ${floor}`,
            x: worldW * 0.66,
            y: worldH * 0.52,
            vx: 0,
            vy: 0,
            radius: 28,
            hp: Math.round(baseHp * 3.1),
            maxHp: Math.round(baseHp * 3.1),
            atk: Math.round(baseAtk * 1.45),
            def: Math.round(baseDef * 1.2),
            element: dungeon.element,
            color: '#F59E0B',
            accentColor: '#DC2626',
            team: 'enemy',
            kind: 'boss',
            speed: 74,
            attackCd: 1.2,
            attackRange: 72,
            hitFlash: 0,
            slowTimer: 0,
            stunTimer: 0,
            poisonTimer: 0,
            poisonDps: 0,
            telegraphTimer: 0,
            telegraphMax: 0,
            telegraphX: 0,
            telegraphY: 0,
            telegraphRadius: 0,
            facing: Math.PI,
            archetype: resolveMonsterArchetype(bossName, 'boss'),
            roarTimer: 0.85,
            enraged: false,
            spottedPlayer: true,
          });
        }
      };

      const spawnSiegeNpc = (team: 'ally' | 'enemy', city: SiegeCity) => {
        const isAlly = team === 'ally';
        const pStats = propsRef.current.stats;
        const hp = isAlly
          ? Math.round(pStats.maxHp * 0.65)
          : Math.round(city.enemyWavePower * 0.42);
        const atk = isAlly
          ? Math.round(pStats.atk * 0.55)
          : Math.round(city.enemyWavePower * 0.048);
        const def = isAlly
          ? Math.round(pStats.def * 0.55)
          : Math.round(city.enemyWavePower * 0.02);
        const allyNames = ['Hộ Pháp Bang Ta', 'Tiên Phong Kiếm Sĩ', 'Đệ Tử Tinh Nhuệ', 'Chưởng Pháp Đường'];
        const enemyNames = ['Thủ Thành Thiết Kỵ', 'Cấm Vệ Thành Chủ', 'Huyết Sát Thủ Vệ', 'Cung Thủ Thành Lầu'];
        const nameList = isAlly ? allyNames : enemyNames;
        units.push({
          id: `siege_${team}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: nameList[Math.floor(Math.random() * nameList.length)],
          x: isAlly ? 120 + Math.random() * 140 : worldW - 260 - Math.random() * 130,
          y: 160 + Math.random() * (worldH - 320),
          vx: 0,
          vy: 0,
          radius: 14,
          hp,
          maxHp: hp,
          atk,
          def,
          element: isAlly ? 'kim' : 'hoa',
          color: isAlly ? '#60A5FA' : '#EF4444',
          accentColor: isAlly ? '#FDE68A' : '#FCA5A5',
          team,
          kind: isAlly ? 'ally_npc' : 'enemy_npc',
          speed: 86,
          attackCd: 0.7 + Math.random() * 0.5,
          attackRange: 50,
          hitFlash: 0,
          slowTimer: 0,
          stunTimer: 0,
          poisonTimer: 0,
          poisonDps: 0,
          telegraphTimer: 0,
          telegraphMax: 0,
          telegraphX: 0,
          telegraphY: 0,
          telegraphRadius: 0,
          facing: isAlly ? 0 : Math.PI,
        });
      };

      const spawnGuildWarNpc = (team: 'ally' | 'enemy', territory: ResourceTerritory) => {
        const isAlly = team === 'ally';
        const pStats = propsRef.current.stats;
        const hp = isAlly
          ? Math.round(pStats.maxHp * 0.62)
          : Math.round(territory.enemyWavePower * 0.44);
        const atk = isAlly
          ? Math.round(pStats.atk * 0.54)
          : Math.round(territory.enemyWavePower * 0.046);
        const def = isAlly
          ? Math.round(pStats.def * 0.52)
          : Math.round(territory.enemyWavePower * 0.02);
        const allyNames = ['Tinh Anh Bang Ta', 'Đường Chủ Tiên Phong', 'Kiếm Khách Hộ Kỳ', 'Đệ Tử Xung Kích'];
        const enemyNames = ['Đệ Tử Hộ Mỏ', 'Tinh Anh Thủ Kỳ', 'Trưởng Lão Bang Địch', 'Du Kỵ Bang Địch'];
        const nameList = isAlly ? allyNames : enemyNames;
        units.push({
          id: `gw_${team}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: nameList[Math.floor(Math.random() * nameList.length)],
          x: isAlly ? 120 + Math.random() * 140 : worldW - 250 - Math.random() * 130,
          y: 160 + Math.random() * (worldH - 320),
          vx: 0,
          vy: 0,
          radius: 15,
          hp,
          maxHp: hp,
          atk,
          def,
          element: isAlly ? SECTS[propsRef.current.player.sect].element : territory.element,
          color: isAlly ? '#60A5FA' : ELEMENT_META[territory.element].color,
          accentColor: isAlly ? '#FDE68A' : '#FCA5A5',
          team,
          kind: isAlly ? 'ally_npc' : 'enemy_npc',
          speed: 88,
          attackCd: 0.7 + Math.random() * 0.5,
          attackRange: 52,
          hitFlash: 0,
          slowTimer: 0,
          stunTimer: 0,
          poisonTimer: 0,
          poisonDps: 0,
          telegraphTimer: 0,
          telegraphMax: 0,
          telegraphX: 0,
          telegraphY: 0,
          telegraphRadius: 0,
          facing: isAlly ? 0 : Math.PI,
        });
      };

      // Populate initial arena based on mode
      if (mode === 'WILD') {
        const map = MAPS.find((m) => m.id === propsRef.current.player.currentMapId) || MAPS[0];
        objectiveLabel = map.isSafeZone
          ? `Luyện Công · ${map.name} (Khu An Toàn)`
          : `Luyện Công · ${map.name} (Ngoài Thành · PK)`;
        // Spawn 5 mobs near player for immediate action + 10 across expanded map zones
        for (let i = 0; i < 5; i++) spawnWildMob(true);
        for (let i = 0; i < 10; i++) spawnWildMob(false);
        if (!map.isSafeZone) {
          for (let i = 0; i < 4; i++) spawnWildWanderer();
        }
      } else if (mode === 'BOSS') {
        const boss =
          WORLD_BOSSES.find((b) => b.id === propsRef.current.battle.bossId) || WORLD_BOSSES[0];
        objectiveLabel = `Boss Hoàng Kim · ${boss.name} (${boss.title})`;
        battleTimer = 120;
        soundEngine.playWarDrum();
        units.push({
          id: `boss_${boss.id}`,
          name: boss.name,
          title: `Boss Hoàng Kim · Lv.${boss.level}`,
          x: worldW * 0.65,
          y: worldH * 0.52,
          vx: 0,
          vy: 0,
          radius: 32,
          hp: boss.hp,
          maxHp: boss.hp,
          atk: boss.atk,
          def: boss.def,
          element: boss.element,
          color: boss.color,
          accentColor: '#DC2626',
          team: 'enemy',
          kind: 'boss',
          speed: 78,
          attackCd: 1.0,
          attackRange: 76,
          hitFlash: 0,
          slowTimer: 0,
          stunTimer: 0,
          poisonTimer: 0,
          poisonDps: 0,
          telegraphTimer: 0,
          telegraphMax: 0,
          telegraphX: 0,
          telegraphY: 0,
          telegraphRadius: 0,
          facing: Math.PI,
          archetype: resolveMonsterArchetype(boss.name, 'boss'),
          roarTimer: 0.95,
          enraged: false,
          spottedPlayer: true,
        });
      } else if (mode === 'DUNGEON') {
        battleTimer = 110;
        setupDungeonWave(1);
      } else if (mode === 'ARENA') {
        const rival = propsRef.current.battle.arenaOpponent;
        if (rival) {
          const rivalSect = SECTS[rival.sect];
          objectiveLabel = `Lôi Đài 1v1 · Đấu với ${rival.name} (Hạng ${rival.rank})`;
          battleTimer = 90;
          soundEngine.playWarDrum();
          const rivalHp = Math.round(rival.power * 0.85 + 650);
          const rivalAtk = Math.round(rival.power * 0.088 + 55);
          const rivalDef = Math.round(rival.power * 0.04 + 25);
          units.push({
            id: `rival_${rival.id}`,
            name: rival.name,
            title: rival.titleName,
            guildTag: rival.guildName,
            guildRole: rival.rank <= 5 ? 'Bang chủ' : 'Thành viên',
            x: worldW * 0.68,
            y: worldH * 0.52,
            vx: 0,
            vy: 0,
            radius: 21,
            hp: rivalHp,
            maxHp: rivalHp,
            atk: rivalAtk,
            def: rivalDef,
            element: rivalSect.element,
            color: rivalSect.color,
            accentColor: '#FDE68A',
            team: 'enemy',
            kind: 'rival',
            speed: 105,
            attackCd: 0.9,
            attackRange: rivalSect.id === 'duong_mon' || rivalSect.id === 'nga_mi' ? 210 : 95,
            hitFlash: 0,
            slowTimer: 0,
            stunTimer: 0,
            poisonTimer: 0,
            poisonDps: 0,
            mantleId: rival.mantleId,
            masterSect: rival.sect,
            masterLevel: rival.level,
            telegraphTimer: 0,
            telegraphMax: 0,
            telegraphX: 0,
            telegraphY: 0,
            telegraphRadius: 0,
            facing: Math.PI,
            spottedPlayer: true,
          });
        }
      } else if (mode === 'SIEGE') {
        const city =
          propsRef.current.cities.find((c) => c.id === propsRef.current.battle.siegeCityId) ||
          propsRef.current.cities[0];
        battleTimer = 95;
        objectiveLabel = `Công Thành Chiến ${city.name} · Giai đoạn 1: Phá Cổng Thành`;
        soundEngine.playWarDrum();

        // City Gate (Phase 1 objective)
        units.push({
          id: 'siege_gate',
          name: `Cổng Thành ${city.name}`,
          title: city.defenderGuild,
          x: worldW - 260,
          y: worldH * 0.52,
          vx: 0,
          vy: 0,
          radius: 34,
          hp: city.gateHp,
          maxHp: city.gateHp,
          atk: 0,
          def: 90,
          element: 'tho',
          color: '#B45309',
          accentColor: '#F5D061',
          team: 'enemy',
          kind: 'gate',
          speed: 0,
          attackCd: 999,
          attackRange: 0,
          hitFlash: 0,
          slowTimer: 0,
          stunTimer: 0,
          poisonTimer: 0,
          poisonDps: 0,
          telegraphTimer: 0,
          telegraphMax: 0,
          telegraphX: 0,
          telegraphY: 0,
          telegraphRadius: 0,
          facing: Math.PI,
        });

        // Dragon Pillar (Phase 2 objective, guarded behind gate)
        units.push({
          id: 'siege_pillar',
          name: 'Long Trụ Hoàng Thành',
          title: 'Đập vỡ cổng để chiếm',
          x: worldW - 125,
          y: worldH * 0.52,
          vx: 0,
          vy: 0,
          radius: 30,
          hp: city.pillarHp,
          maxHp: city.pillarHp,
          atk: 0,
          def: 110,
          element: 'kim',
          color: '#F5D061',
          accentColor: '#DC2626',
          team: 'enemy',
          kind: 'pillar',
          speed: 0,
          attackCd: 999,
          attackRange: 0,
          hitFlash: 0,
          slowTimer: 0,
          stunTimer: 0,
          poisonTimer: 0,
          poisonDps: 0,
          telegraphTimer: 0,
          telegraphMax: 0,
          telegraphX: 0,
          telegraphY: 0,
          telegraphRadius: 0,
          facing: Math.PI,
        });

        for (let i = 0; i < 5; i++) spawnSiegeNpc('ally', city);
        for (let i = 0; i < 5; i++) spawnSiegeNpc('enemy', city);
      } else if (mode === 'GUILD_WAR') {
        const territory =
          propsRef.current.territories.find(
            (t) => t.id === propsRef.current.battle.guildWarTerritoryId
          ) || propsRef.current.territories[0];
        battleTimer = 80;
        objectiveLabel = `Bang Hội Chiến · ${territory.name} (Hạ Chiến Kỳ ${territory.defenderGuildName})`;
        soundEngine.playWarDrum();

        // Enemy Guild War Banner (Main Objective)
        units.push({
          id: 'gw_banner',
          name: `Chiến Kỳ ${territory.defenderGuildName}`,
          title: territory.name,
          x: worldW - 150,
          y: worldH * 0.52,
          vx: 0,
          vy: 0,
          radius: 28,
          hp: territory.bannerHp,
          maxHp: territory.bannerHp,
          atk: 0,
          def: 85,
          element: territory.element,
          color: '#DC2626',
          accentColor: '#F5D061',
          team: 'enemy',
          kind: 'banner',
          speed: 0,
          attackCd: 999,
          attackRange: 0,
          hitFlash: 0,
          slowTimer: 0,
          stunTimer: 0,
          poisonTimer: 0,
          poisonDps: 0,
          telegraphTimer: 0,
          telegraphMax: 0,
          telegraphX: 0,
          telegraphY: 0,
          telegraphRadius: 0,
          facing: Math.PI,
        });

        // Defending Guild Leader
        units.push({
          id: 'gw_leader',
          name: territory.defenderLeader,
          title: `Bang Chủ ${territory.defenderGuildName}`,
          x: worldW - 270,
          y: worldH * 0.52,
          vx: 0,
          vy: 0,
          radius: 23,
          hp: Math.round(territory.enemyWavePower * 1.45),
          maxHp: Math.round(territory.enemyWavePower * 1.45),
          atk: Math.round(territory.enemyWavePower * 0.075),
          def: Math.round(territory.enemyWavePower * 0.032),
          element: territory.element,
          color: ELEMENT_META[territory.element].color,
          accentColor: '#F5D061',
          team: 'enemy',
          kind: 'rival',
          speed: 82,
          attackCd: 1.0,
          attackRange: 76,
          hitFlash: 0,
          slowTimer: 0,
          stunTimer: 0,
          poisonTimer: 0,
          poisonDps: 0,
          mantleId: 3,
          masterSect:
            territory.element === 'kim'
              ? 'thieu_lam'
              : territory.element === 'moc'
              ? 'duong_mon'
              : territory.element === 'thuy'
              ? 'nga_mi'
              : territory.element === 'hoa'
              ? 'cai_bang'
              : 'vo_dang',
          telegraphTimer: 0,
          telegraphMax: 0,
          telegraphX: 0,
          telegraphY: 0,
          telegraphRadius: 0,
          facing: Math.PI,
          spottedPlayer: true,
        });

        for (let i = 0; i < 4; i++) spawnGuildWarNpc('ally', territory);
        for (let i = 0; i < 4; i++) spawnGuildWarNpc('enemy', territory);
      }

      // Register all initial units into centralized BattleSpriteAtlasHub & trigger boss intro roars
      for (const u of units) {
        registerUnitInAtlasHub(u);
        if (u.roarTimer && u.roarTimer > 0) {
          atlasHub.trigger(u.id, 'roar', { durationSec: u.roarTimer, force: true });
        }
      }

      // Warm up player, active mount & all map mob pools through centralized BattleSpriteAtlasHub
      {
        const curPlayer = propsRef.current.player;
        const initRealm = getCharacterRealm(curPlayer);
        const initMantle = MANTLES.find((m) => m.id === curPlayer.mantleId) || MANTLES[0];
        const initMount =
          curPlayer.isMounted && curPlayer.activeMountId
            ? MOUNTS.find((m) => m.id === curPlayer.activeMountId) || null
            : null;
        const initIllusion =
          initMount && curPlayer.activeMountIllusionId
            ? MOUNT_ILLUSIONS.find((x) => x.id === curPlayer.activeMountIllusionId) || null
            : null;
        const initIllStars = initIllusion ? curPlayer.mountIllusions?.[initIllusion.id] || 1 : 0;

        const playerWarmup = createHeroAtlasWarmup({
          sectId: curPlayer.sect,
          equipment: curPlayer.equipment,
          realmTier: initRealm.tier,
          mantleId: initMantle.id,
          mantleColor: initMantle.color,
          isMounted: Boolean(initMount),
        });
        atlasHub.ensureWarmedUp(playerWarmup.signature, playerWarmup.tasks);

        if (initMount) {
          const mWarmup = createMountAtlasWarmup(initMount, initIllusion, initIllStars);
          atlasHub.ensureWarmedUp(mWarmup.signature, mWarmup.tasks);
        }

        if (mode === 'WILD') {
          const curMap = MAPS.find((m) => m.id === curPlayer.currentMapId) || MAPS[0];
          for (const mDef of curMap.mobs) {
            const mobWarmup = createMonsterAtlasWarmup({
              archetype: resolveMonsterArchetype(mDef.name, mDef.isElite ? 'elite' : 'mob'),
              color: mDef.color,
              accentColor: '#FDE68A',
              isElite: Boolean(mDef.isElite),
            });
            if (mobWarmup) atlasHub.ensureWarmedUp(mobWarmup.signature, mobWarmup.tasks);
          }
        }
      }

      // Keyboard & mouse listeners (held vs edge-triggered)
      const heldKeys = new Set<string>();
      const onKeyDown = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        const k = e.key.toLowerCase();
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
          heldKeys.add(k);
        }
        if (k === '1') pendingActionsRef.current.castIndex = 0;
        if (k === '2') pendingActionsRef.current.castIndex = 1;
        if (k === '3') pendingActionsRef.current.castIndex = 2;
        if (k === '4') pendingActionsRef.current.castIndex = 3;
        if (k === '5') pendingActionsRef.current.castIndex = 4;
        if (k === '6') pendingActionsRef.current.castIndex = 5;
        if (e.code === 'Space') {
          e.preventDefault();
          pendingActionsRef.current.dash = true;
        }
        if (k === 'q') {
          pendingActionsRef.current.potion = true;
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        heldKeys.delete(e.key.toLowerCase());
      };
      const onBlur = () => {
        heldKeys.clear();
      };
      let lastAttackerName = 'Quái Vật Giang Hồ';
      let lastAttackerIsPlayer = false;
      let wandererRespawnTicker = 0;

      const onCanvasPointerDown = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left + camX;
        const cy = e.clientY - rect.top + camY;

        // Check if clicking a dropped Treasure Chest on the battlefield
        const chestIdx = fieldChests.findIndex(
          (fc) => Math.hypot(fc.x - cx, fc.y - cy) <= 30
        );
        if (chestIdx >= 0) {
          const fc = fieldChests.splice(chestIdx, 1)[0];
          const meta = CHEST_TIER_META[fc.tier];
          addParticles(fc.x, fc.y, meta.color, 26, 210);
          addFloatText(fc.x, fc.y - 24, `Mở ${meta.shortName} Rương!`, meta.accentColor, 1.1);
          propsRef.current.onCollectChest(fc.tier, fc.sourceName, true);
          return;
        }

        // Check if clicking an enemy or PK-targetable unit
        const clickedEnemy = units.find(
          (u) => isUnitHostileToPlayer(u) && Math.hypot(u.x - cx, u.y - cy) <= u.radius + 16
        );
        if (clickedEnemy) {
          pr.targetUnitId = clickedEnemy.id;
          addParticles(clickedEnemy.x, clickedEnemy.y, '#F5D061', 6, 60);
        } else {
          pr.moveTarget = clampArena(cx, cy);
        }
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);
      canvas.addEventListener('pointerdown', onCanvasPointerDown);

      const damageUnit = (
        target: Unit,
        rawDamage: number,
        isCrit: boolean,
        attackerElement: ElementType,
        fromPlayer: boolean
      ) => {
        // In Siege, Long Trụ is protected until Cổng Thành falls
        if (target.kind === 'pillar' && units.some((u) => u.kind === 'gate' && u.hp > 0)) {
          if (fromPlayer) {
            addFloatText(target.x, target.y - 26, 'Phá Cổng Trước!', '#F5D061', 0.9);
          }
          return;
        }

        const elemMult = getElementMultiplier(attackerElement, target.element);
        const mitigated = Math.max(
          12,
          computeSpecFinalDamage(rawDamage * elemMult, target.def, 0, 0)
        );
        const variance = 0.94 + Math.random() * 0.12;
        const critMult = fromPlayer ? (propsRef.current.stats.critDamagePct || 150) / 100 : 1.5;

        // Advance uninterrupted player combo streak and resolve x2 / x3 / x5 damage amplification
        let activeComboTier: ComboTierSpec | null = null;
        if (fromPlayer) {
          const prevTier = combo.tier;
          combo.count += 1;
          if (combo.count > combo.bestCount) combo.bestCount = combo.count;
          activeComboTier = resolveComboTier(combo.count);
          combo.tier = activeComboTier.mult;
          combo.timer = activeComboTier.windowSec;
          combo.maxTimer = activeComboTier.windowSec;
          combo.breakTimer = 0;

          if (activeComboTier.mult > prevTier && activeComboTier.mult !== 1) {
            combo.popScale = 1.88;
            combo.tierFlash = 1.0;
            soundEngine.playComboTier(activeComboTier.mult);
            shakeIntensity = Math.max(
              shakeIntensity,
              activeComboTier.mult === 5 ? 8.5 : activeComboTier.mult === 3 ? 5.5 : 3.5
            );
            addFloatText(
              pr.x,
              pr.y - 50,
              `${activeComboTier.label} x${activeComboTier.mult}!`,
              activeComboTier.primary,
              activeComboTier.mult === 5 ? 1.4 : 1.24
            );
            effectPools.spawnRing({
              x: pr.x,
              y: pr.y,
              radius: 16,
              maxRadius: activeComboTier.mult === 5 ? 128 : activeComboTier.mult === 3 ? 98 : 76,
              color: activeComboTier.primary,
              accent: activeComboTier.accent,
              life: 0.45,
              maxLife: 0.45,
              kind: activeComboTier.mult === 5 ? 'dragon' : 'lotus',
              element: attackerElement,
            });
          } else {
            combo.popScale = Math.max(combo.popScale, 1.32);
          }
        }

        const comboDmgBonus = activeComboTier ? activeComboTier.damageBonus : 1.0;
        const finalDmg = Math.round(mitigated * variance * (isCrit ? critMult : 1) * comboDmgBonus);
        if (fromPlayer) {
          combo.totalDamage += finalDmg;
        }

        target.hp = Math.max(0, target.hp - finalDmg);
        target.hitFlash = 0.14;
        target.spottedPlayer = true;
        registerUnitInAtlasHub(target);
        atlasHub.trigger(target.id, 'hit', {
          durationSec: 0.22,
          hitFlashSec: 0.14,
        });

        // Visual Behavior: Knockback reaction on non-structures (#7)
        if (
          target.kind !== 'gate' &&
          target.kind !== 'pillar' &&
          target.kind !== 'banner'
        ) {
          const kbAngle = Math.atan2(target.y - pr.y, target.x - pr.x);
          const kbStrength = target.kind === 'boss' ? 42 : isCrit ? 155 : 95;
          target.knockbackX = Math.cos(kbAngle) * kbStrength;
          target.knockbackY = Math.sin(kbAngle) * kbStrength;
        }

        // Boss Enraged Phase Transition (< 50% HP) (#6)
        if (
          target.kind === 'boss' &&
          !target.enraged &&
          target.hp > 0 &&
          target.hp <= target.maxHp * 0.5
        ) {
          target.enraged = true;
          target.roarTimer = 0.9;
          const enragedWarmup = createMonsterAtlasWarmup({
            archetype: target.archetype || resolveMonsterArchetype(target.name, target.kind),
            color: target.color,
            accentColor: target.accentColor,
            isElite: false,
            enraged: true,
          });
          if (enragedWarmup) {
            atlasHub.ensureWarmedUp(enragedWarmup.signature, enragedWarmup.tasks);
          }
          atlasHub.trigger(target.id, 'roar', {
            durationSec: 0.72,
            force: true,
          });
          shakeIntensity = Math.max(shakeIntensity, 10);
          soundEngine.playWarDrum();
          addFloatText(target.x, target.y - target.radius - 26, 'BOSS CUỒNG BẠO!', '#EF4444', 1.35);
          effectPools.spawnRing({
            x: target.x,
            y: target.y,
            radius: 18,
            maxRadius: 120,
            color: '#DC2626',
            accent: '#FEF08A',
            life: 0.55,
            maxLife: 0.55,
            kind: 'dragon',
            element: target.element,
          });
        }

        // Provoke wandering player on PK hit
        if (target.kind === 'wanderer' && fromPlayer && !target.aggro) {
          target.aggro = true;
          target.team = 'enemy';
          addFloatText(target.x, target.y - target.radius - 26, 'Dám Đồ Sát Ta?!', '#F87171', 1.1);
        }

        // Painted Per-Sect / Five-Element Hit & Collision Sprite Sheets strictly at STRUCK MONSTER coordinates (target.x, target.y)
        const hitAngle = Math.atan2(target.y - pr.y, target.x - pr.x);
        const hitY = target.y - Math.max(4, target.radius * 0.22);
        if (isCrit) {
          vfxSheetPool.spawnHitImpactBurst('crit', target.x, hitY, 94, hitAngle, attackerElement);
          vfxSheetPool.spawnCollisionBurst('shockwave', target.x, target.y + 4, 88, hitAngle, attackerElement);
        } else {
          vfxSheetPool.spawnHitImpactBurst(
            attackerElement === 'kim' || attackerElement === 'hoa' || attackerElement === 'tho' ? 'slash' : 'blunt',
            target.x,
            hitY,
            68,
            hitAngle,
            attackerElement
          );
          if (fromPlayer) {
            vfxSheetPool.spawnCollisionBurst('shockwave', target.x, target.y + 4, 62, hitAngle, attackerElement);
          }
        }
        if (fromPlayer && (target.kind === 'boss' || target.kind === 'elite' || target.kind === 'rival')) {
          vfxSheetPool.spawnCollisionBurst('parry', target.x, hitY, 64, hitAngle, attackerElement);
        }

        if (fromPlayer) {
          const elemTag = elemMult > 1.05 ? ' · KHẮC HỆ' : '';
          const comboMult = activeComboTier ? activeComboTier.mult : 1;
          const comboTag = comboMult >= 2 ? ` x${comboMult}` : '';
          if (isCrit) {
            const critScale =
              1.62 + (comboMult === 5 ? 0.24 : comboMult === 3 ? 0.14 : comboMult === 2 ? 0.08 : 0);
            addCritFloatText(
              target.x,
              target.y - target.radius - 12,
              `-${finalDmg.toLocaleString('vi-VN')}${comboTag}`,
              `★ CHÍ MẠNG${elemTag}! ★`,
              critScale,
              'gold'
            );
            effectPools.spawnCritSplatter(target.x, target.y - 4, false);
            effectPools.spawnRing({
              x: target.x,
              y: target.y,
              radius: 8,
              maxRadius: 48 + (comboMult >= 3 ? 16 : 0),
              color: '#F5D061',
              accent: '#FFFFFF',
              life: 0.24,
              maxLife: 0.24,
              kind: 'ring',
              element: attackerElement,
            });
            hitstopTimer = Math.max(hitstopTimer, 0.048);
            shakeIntensity = Math.max(shakeIntensity, comboMult === 5 ? 7.5 : 6.0);
            soundEngine.playCrit();
          } else {
            const dmgColor =
              comboMult === 5
                ? '#FDBA74'
                : comboMult === 3
                ? '#FDE047'
                : elemMult > 1.05
                ? '#FDE047'
                : '#F8FAFC';
            const dmgScale =
              0.98 + (comboMult === 5 ? 0.16 : comboMult === 3 ? 0.09 : comboMult === 2 ? 0.04 : 0);
            addFloatText(
              target.x,
              target.y - target.radius - 6,
              `-${finalDmg.toLocaleString('vi-VN')}${comboTag}`,
              dmgColor,
              dmgScale
            );
            shakeIntensity = Math.max(shakeIntensity, comboMult >= 3 ? 2.8 : 2.0);
            addParticles(target.x, target.y, '#EF4444', 6, 110);
          }
        } else if (isCrit) {
          addCritFloatText(
            target.x,
            target.y - target.radius - 10,
            `-${finalDmg.toLocaleString('vi-VN')}`,
            'CHÍ MẠNG!',
            1.42,
            'gold'
          );
          effectPools.spawnCritSplatter(target.x, target.y - 4, false);
        } else {
          addParticles(target.x, target.y, '#EF4444', 5, 100);
        }
      };

      const damagePlayer = (
        rawDmg: number,
        attackerElement: ElementType,
        heavy = false,
        attackerName?: string,
        attackerIsPlayer = false,
        isCrit = false
      ) => {
        const pStats = propsRef.current.stats;
        const pSect = SECTS[propsRef.current.player.sect];
        if (attackerName) {
          lastAttackerName = attackerName;
          lastAttackerIsPlayer = attackerIsPlayer;
        }
        if (pr.invulnTimer > 0) {
          vfxSheetPool.spawnCollisionBurst('parry', pr.x, pr.y - 6, 82, pr.facing, pSect.element);
          addFloatText(pr.x, pr.y - 30, 'Vô Địch!', '#FEF08A', 1.0);
          return;
        }
        if (pr.dashTimer > 0) {
          vfxSheetPool.spawnCollisionBurst('parry', pr.x, pr.y - 6, 70, pr.facing, pSect.element);
          addFloatText(pr.x, pr.y - 28, 'Né Tránh!', '#67E8F9', 0.95);
          return;
        }
        const effectiveDodge = Math.min(45, pStats.dodge + (pr.buffTimer > 0 ? pr.buffDodge : 0));
        if (Math.random() * 100 < effectiveDodge) {
          vfxSheetPool.spawnCollisionBurst('parry', pr.x, pr.y - 6, 70, pr.facing, pSect.element);
          addFloatText(pr.x, pr.y - 28, 'Thân Pháp Né!', '#93C5FD', 0.95);
          return;
        }
        const elemMult = getElementMultiplier(attackerElement, pSect.element);
        const enemyCritMult = isCrit ? 1.5 : 1;
        const effectiveDef = pStats.def * (1 + (pr.buffTimer > 0 ? pr.buffDefPct / 100 : 0));
        const totalDmgReducePct = Math.min(
          60,
          (pStats.damageReducePct || 0) + (pr.buffTimer > 0 ? pr.buffDmgReducePct : 0)
        );
        const rawIncoming = rawDmg * elemMult * (0.94 + Math.random() * 0.12) * enemyCritMult;
        let dmg = Math.max(
          6,
          computeSpecFinalDamage(rawIncoming, effectiveDef, pStats.allResist, totalDmgReducePct)
        );

        if (pr.shield > 0) {
          const absorbed = Math.min(pr.shield, dmg);
          pr.shield -= absorbed;
          dmg -= absorbed;
          if (absorbed > 0) {
            vfxSheetPool.spawnCollisionBurst('shield_hit', pr.x, pr.y - 6, 90, 0, pSect.element);
            addFloatText(pr.x, pr.y - 34, `Khiên -${absorbed}`, '#67E8F9', 0.85);
          }
        }
        if (dmg > 0) {
          const prevHp = pr.hp;
          const nowMs = Date.now();
          // Cheat-death / Low-HP (<25%) trigger passive (only fires crossing downward while alive, 90s cheat-death lock)
          const activeBranch: 0 | 1 = propsRef.current.player.branchIndex === 1 ? 1 : 0;
          const triggerPassives = getBranchTriggerPassives(propsRef.current.player.sect, activeBranch);
          const cheatPassive = triggerPassives.find(
            (tp) =>
              propsRef.current.player.level >= tp.unlockLevel &&
              (tp.isCheatDeath || tp.mechanicText.toLowerCase().includes('25%'))
          );

          if (pr.hp - dmg <= 0 && cheatPassive?.isCheatDeath && nowMs >= pr.cheatDeathLockUntil) {
            pr.cheatDeathLockUntil = nowMs + 90_000;
            pr.hp = Math.max(1, Math.round(pStats.maxHp * 0.2));
            pr.invulnTimer = Math.max(pr.invulnTimer, 1.2);
            addFloatText(pr.x, pr.y - 48, `${cheatPassive.name} · Cứu Tử!`, cheatPassive.accentColor, 1.15);
            effectPools.spawnRing({
              x: pr.x,
              y: pr.y,
              radius: 14,
              maxRadius: 96,
              color: cheatPassive.color,
              accent: cheatPassive.accentColor,
              life: 0.65,
              maxLife: 0.65,
              kind: cheatPassive.vfxKind,
              element: pSect.element,
            });
            return;
          }

          pr.hp = Math.max(0, pr.hp - dmg);

          // Low-HP crossing downward past 25% while alive
          const lowThreshold = pStats.maxHp * 0.25;
          if (
            prevHp >= lowThreshold &&
            pr.hp > 0 &&
            pr.hp < lowThreshold &&
            cheatPassive &&
            nowMs >= pr.lowHpProcLockUntil
          ) {
            const icdMs = Math.max(15, cheatPassive.internalCdSec || 35) * 1000;
            pr.lowHpProcLockUntil = nowMs + icdMs;
            pr.invulnTimer = Math.max(pr.invulnTimer, 1.0);
            pr.buffTimer = Math.max(pr.buffTimer, 4.0);
            pr.buffAtkPct = Math.max(pr.buffAtkPct, 20);
            pr.buffLabel = cheatPassive.name;
            pr.buffColor = cheatPassive.color;
            pr.buffAccent = cheatPassive.accentColor;
            addFloatText(pr.x, pr.y - 48, `${cheatPassive.name} Kích Hoạt!`, cheatPassive.accentColor, 1.1);
          }

          pr.hitFlash = isCrit ? 0.22 : 0.16;
          vfxSheetPool.spawnHitImpactBurst(isCrit ? 'crit' : 'slash', pr.x, pr.y - 8, isCrit ? 84 : 62, 0, attackerElement);
          atlasHub.trigger(PLAYER_ENTITY_ID, 'hit', {
            durationSec: 0.24,
            hitFlashSec: isCrit ? 0.22 : 0.16,
          });
          if (isCrit) {
            addCritFloatText(
              pr.x,
              pr.y - 30,
              `-${dmg.toLocaleString('vi-VN')}`,
              '★ CHÍ MẠNG! ★',
              heavy ? 1.66 : 1.52,
              'crimson_gold'
            );
            effectPools.spawnCritSplatter(pr.x, pr.y - 6, true);
            effectPools.spawnRing({
              x: pr.x,
              y: pr.y,
              radius: 8,
              maxRadius: 46,
              color: '#F5D061',
              accent: '#FEF08A',
              life: 0.24,
              maxLife: 0.24,
              kind: 'ring',
              element: attackerElement,
            });
            soundEngine.playCrit();
            shakeIntensity = Math.max(shakeIntensity, heavy ? 7.5 : 5.2);
            hitstopTimer = Math.max(hitstopTimer, 0.045);
          } else {
            addFloatText(pr.x, pr.y - 24, `-${dmg.toLocaleString('vi-VN')}`, '#F87171', heavy ? 1.15 : 0.95);
          }
          if (heavy) {
            shakeIntensity = Math.max(shakeIntensity, 6.2);
            hitstopTimer = Math.max(hitstopTimer, 0.05);
            if (combo.count > 0) {
              resetCombo(true);
            }
          } else if (combo.count > 0) {
            if (dmg >= pStats.maxHp * 0.16) {
              resetCombo(true);
            } else {
              combo.timer = Math.max(0.35, combo.timer - 0.35);
            }
          }
        }
      };

      const applySkillSecondaryEffects = (
        e: Unit,
        skill: SkillDef,
        originX: number,
        originY: number,
        pAtk: number,
        rankFactor = 1
      ) => {
        const isBoss = e.kind === 'boss';
        const ccRoll = (skill.ccChancePct ?? 100) >= 100 || Math.random() * 100 < (skill.ccChancePct ?? 100);
        const wantsHardCc = Boolean(
          (skill.stunSec && skill.stunSec > 0) ||
            (skill.pullStrength && skill.pullStrength > 0) ||
            (skill.pushStrength && skill.pushStrength > 0)
        );

        // Spec Boss rule: Boss is immune to pull, push, panic/fear, freeze, stun -> converted to slow 20% for 1s
        if (isBoss && wantsHardCc && ccRoll) {
          e.slowTimer = Math.max(e.slowTimer, 1.0);
          addFloatText(e.x, e.y - e.radius - 16, 'Chậm 20% (1s)', '#93C5FD', 0.85);
        } else if (ccRoll) {
          if (skill.stunSec && skill.stunSec > 0) {
            e.stunTimer = Math.max(e.stunTimer, skill.stunSec);
            const ccLabel =
              skill.ccKind === 'freeze'
                ? 'Đóng Băng!'
                : skill.ccKind === 'fear'
                ? 'Hoảng Loạn!'
                : skill.ccKind === 'silence'
                ? 'Câm Lặng!'
                : skill.ccKind === 'stun'
                ? 'Choáng!'
                : 'Bất Động!';
            addFloatText(e.x, e.y - e.radius - 16, ccLabel, '#FDE047', 0.92);
          }
          if (skill.slowSec && skill.slowSec > 0) {
            e.slowTimer = Math.max(e.slowTimer, skill.slowSec);
          }
        }

        // Spec DoT: scales with rankFactor, no crit, no lifesteal, no chain procs; same skill refreshes duration
        if (skill.dotAtkPct && skill.dotAtkPct > 0 && skill.dotDurationSec && skill.dotDurationSec > 0) {
          const interval = Math.max(0.5, skill.dotIntervalSec || 1);
          const dotDps = Math.max(8, Math.round((pAtk * skill.dotAtkPct * rankFactor) / interval));
          if (skill.burnSec && skill.burnSec > 0) {
            e.burnTimer = Math.max(e.burnTimer || 0, skill.dotDurationSec);
            e.burnDps = Math.max(e.burnDps || 0, dotDps);
          } else {
            e.poisonTimer = Math.max(e.poisonTimer, skill.dotDurationSec);
            e.poisonDps = Math.max(e.poisonDps, dotDps);
          }
        } else if (skill.type === 'poison') {
          e.poisonTimer = Math.max(e.poisonTimer, 4.0);
          e.poisonDps = Math.max(e.poisonDps, Math.round(pAtk * 0.42 * rankFactor));
        }

        if (skill.movePoisonSec && skill.movePoisonSec > 0) {
          e.movePoisonTimer = Math.max(e.movePoisonTimer || 0, skill.movePoisonSec);
          e.movePoisonDps = Math.max(e.movePoisonDps || 0, Math.round(pAtk * 0.55 * rankFactor));
          addFloatText(e.x, e.y - e.radius - 18, 'Hóa Cốt Độc!', '#A855F7', 0.92);
        }
        if (skill.dispel) {
          if (e.telegraphTimer > 0) e.telegraphTimer = 0;
          if (e.enraged) e.enraged = false;
          addFloatText(e.x, e.y - e.radius - 20, 'Xóa Hỗ Trợ!', '#A7F3D0', 0.95);
        }

        // Push/Pull displacement ONLY for non-boss & non-structures (Boss immune per spec)
        if (!isBoss && e.kind !== 'gate' && e.kind !== 'pillar' && e.kind !== 'banner') {
          const castElem = SECTS[propsRef.current.player.sect].element;
          if (skill.pullStrength && skill.pullStrength > 0) {
            const pa = Math.atan2(originY - e.y, originX - e.x);
            e.knockbackX = Math.cos(pa) * skill.pullStrength;
            e.knockbackY = Math.sin(pa) * skill.pullStrength;
            vfxSheetPool.spawnCollisionBurst('ground_push', e.x, e.y + 4, 78, pa, castElem);
            emitTargetPullStream(
              effectPools,
              originX,
              originY,
              e.x,
              e.y,
              skill.color,
              skill.accentColor,
              castElem
            );
          } else if (skill.pushStrength && skill.pushStrength > 0) {
            const pa = Math.atan2(e.y - originY, e.x - originX);
            e.knockbackX = Math.cos(pa) * skill.pushStrength;
            e.knockbackY = Math.sin(pa) * skill.pushStrength;
            vfxSheetPool.spawnCollisionBurst('ground_push', e.x, e.y + 4, 82, pa, castElem);
            emitTargetPushBurst(
              effectPools,
              originX,
              originY,
              e.x,
              e.y,
              skill.color,
              skill.accentColor,
              castElem
            );
          }
        }

        // Elemental status hit splash from Hit Impact Sheet Row 4
        if (
          (skill.dotAtkPct && skill.dotAtkPct > 0) ||
          (skill.stunSec && skill.stunSec > 0) ||
          (skill.slowSec && skill.slowSec > 0)
        ) {
          const castElem = SECTS[propsRef.current.player.sect].element;
          vfxSheetPool.spawnHitImpactBurst('status_element', e.x, e.y - 6, 54, 0, castElem);
        }
      };

      // Live visual showcase preview invoked from SkillsWindow ("Xem Hiệu Ứng") without costing MP/CD or dealing damage
      const triggerSkillVisualPreview = (skillId: string) => {
        const cat = CATALOG_BY_ID[skillId];
        if (!cat) return;
        const p = propsRef.current.player;
        const sect = SECTS[p.sect];
        const skill = catalogSkillToSkillDef(cat, '1');
        const vfxKind = skill.vfxKind || 'ring';
        const angle = pr.facing;
        const crowdFactor = units.length >= 10 ? 0.35 : 1;

        pr.castMax = 0.46;
        pr.castTimer = 0.46;
        atlasHub.trigger(PLAYER_ENTITY_ID, 'cast', { durationSec: 0.46, force: true });
        soundEngine.playSkill(skill.isUltimate180 ? 520 : skill.isUltimate150 ? 440 : 300);
        vfxSheetPool.spawnCastingBurst(
          sect.element,
          pr.x,
          pr.y,
          angle,
          skill.isUltimate180 || skill.isUltimate150 ? 104 : 84,
          p.sect,
          skill.type === 'projectile' || skill.type === 'aoe' || skill.type === 'melee'
        );

        const previewEnemies = units.filter((u) => isUnitHostileToPlayer(u));
        const previewTarget =
          previewEnemies.length > 0
            ? previewEnemies.reduce((best, cur) =>
                Math.hypot(cur.x - pr.x, cur.y - pr.y) < Math.hypot(best.x - pr.x, best.y - pr.y) ? cur : best
              )
            : null;
        const previewAngle = previewTarget
          ? Math.atan2(previewTarget.y - pr.y, previewTarget.x - pr.x)
          : angle;
        if (previewTarget) pr.facing = previewAngle;

        const isSelfCentered =
          skill.type === 'buff' ||
          skill.type === 'heal' ||
          skill.type === 'shield' ||
          vfxKind === 'guard_shield_140' ||
          vfxKind === 'lotus_sanctuary_ult';

        const tx = isSelfCentered
          ? pr.x
          : previewTarget && Math.hypot(previewTarget.x - pr.x, previewTarget.y - pr.y) <= 440
          ? previewTarget.x
          : pr.x + Math.cos(previewAngle) * Math.min(180, Math.max(105, skill.radius * 0.95));
        const ty = isSelfCentered
          ? pr.y
          : previewTarget && Math.hypot(previewTarget.x - pr.x, previewTarget.y - pr.y) <= 440
          ? previewTarget.y
          : pr.y + Math.sin(previewAngle) * Math.min(180, Math.max(105, skill.radius * 0.95));
        const isUlt = Boolean(skill.isUltimate150 || skill.isUltimate180 || skill.isSignature125);
        const life = skill.isUltimate180 ? 1.15 : skill.isUltimate150 ? 0.95 : 0.72;

        if (skill.type === 'projectile') {
          const count = Math.min(8, Math.max(1, skill.projectileCount || 1));
          const projSpeed = skill.projectileSpeedPx || 520;
          for (let i = 0; i < count; i++) {
            const fanSpan = count > 1 ? Math.min(0.7, (count - 1) * 0.14) : 0;
            const a = count > 1 ? previewAngle - fanSpan / 2 + (fanSpan * i) / (count - 1) : previewAngle;
            effectPools.spawnProjectile({
              x: pr.x + Math.cos(a) * 20,
              y: pr.y + Math.sin(a) * 20,
              vx: Math.cos(a) * projSpeed,
              vy: Math.sin(a) * projSpeed,
              radius: 12,
              color: skill.color,
              accent: skill.accentColor,
              team: 'ally',
              damage: 0,
              crit: false,
              element: sect.element,
              life: 0.78,
              pierce: true,
              vfxKind,
            });
          }
          emitSkillCastParticles(effectPools, {
            skill,
            element: sect.element,
            originX: pr.x,
            originY: pr.y,
            targetX: tx,
            targetY: ty,
            angle: previewAngle,
            isUltimate: isUlt,
            crowdFactor,
          });
        } else {
          effectPools.spawnRing({
            x: tx,
            y: ty,
            radius: 18,
            maxRadius: Math.max(76, skill.radius),
            color: skill.color,
            accent: skill.accentColor,
            life,
            maxLife: life,
            kind: vfxKind,
            angle: previewAngle,
            element: sect.element,
            sourceX: pr.x,
            sourceY: pr.y,
          });
          if (isSelfCentered) {
            vfxSheetPool.spawnSkillBurst(
              sect.element,
              vfxKind,
              tx,
              ty,
              Math.max(76, skill.radius),
              previewAngle,
              life * 0.92,
              p.sect
            );
          } else {
            vfxSheetPool.spawnTravelingSkill(
              sect.element,
              vfxKind,
              pr.x,
              pr.y,
              tx,
              ty,
              Math.max(76, skill.radius),
              life * 0.92,
              p.sect
            );
          }

          emitSkillCastParticles(effectPools, {
            skill,
            element: sect.element,
            originX: pr.x,
            originY: pr.y,
            targetX: tx,
            targetY: ty,
            angle: previewAngle,
            isUltimate: isUlt,
            crowdFactor,
          });
        }

        const tierLabel = skill.isUltimate180
          ? 'Chân Truyền 180'
          : skill.isUltimate150
          ? 'Tuyệt Kỹ 150'
          : skill.isSignature125
          ? 'Trấn Phái 125'
          : `Lv.${skill.unlockLevel}`;
        addFloatText(pr.x, pr.y - 52, `${skill.name} (${tierLabel})`, skill.accentColor || skill.color, 1.08);
      };

      const performSkill = (skillIdx: number) => {
        const p = propsRef.current.player;
        const pStats = propsRef.current.stats;
        const sect = SECTS[p.sect];
        const orderedSkills = getPlayerHotbarSkills(p);
        const skill: SkillDef | undefined = orderedSkills[skillIdx];
        if (!skill) return;

        const skLevel = p.skillLevels[skill.id] || 0;
        if (skLevel <= 0) return;
        if (pr.cooldowns[skillIdx] > 0) return;
        if (pr.mp < skill.mpCost) return;

        pr.mp = Math.max(0, pr.mp - skill.mpCost);
        pr.cooldowns[skillIdx] = skill.cooldown;

        const maxRank = skill.maxRank || 20;
        const rankFactor = getSkillRankFactor(skLevel, maxRank);
        const crowdFactor = units.length >= 10 ? 0.35 : 1;

        const wasStealthed = pr.stealthTimer > 0;
        const isDefensiveOnly =
          skill.type === 'buff' ||
          skill.type === 'heal' ||
          skill.type === 'shield' ||
          Boolean(skill.stealthSec);
        if (wasStealthed && !isDefensiveOnly) {
          pr.stealthTimer = 0;
        }

        const atkBoost = 1 + (pr.buffTimer > 0 ? pr.buffAtkPct / 100 : 0);
        const critBoost =
          (pr.buffTimer > 0 ? pr.buffCrit : 0) +
          (wasStealthed && !isDefensiveOnly ? 32 : 0);
        const effectiveCrit = Math.min(60, pStats.crit + critBoost);

        const hitCount = Math.max(1, skill.hits || 1);
        const perHitSpecDmg =
          skill.atkPctPerHit && skill.atkPctPerHit > 0
            ? (pStats.atk * atkBoost * skill.atkPctPerHit + (skill.flatDmgPerHit || 0)) * rankFactor
            : pStats.atk * atkBoost * skill.multiplier * rankFactor / (hitCount > 1 ? 1 + (hitCount - 1) * 0.55 : 1);
        const baseDmg = perHitSpecDmg * hitCount;
        const isCrit = Math.random() * 100 < effectiveCrit;
        const vfxKind = skill.vfxKind || 'ring';
        const isUltimateCast = Boolean(skill.isUltimate150 || skill.isUltimate180 || skill.isSignature125);

        // Spec Lv.160 post-150 trigger passive: restores 10% MP & reduces non-150/180 cooldowns by 2s (never resets 150/180)
        if (skill.isUltimate150) {
          const activeBranch: 0 | 1 = p.branchIndex === 1 ? 1 : 0;
          const lv160Trigger = getBranchTriggerPassives(p.sect, activeBranch).find(
            (tp) => tp.unlockLevel === 160 && p.level >= 160
          );
          if (lv160Trigger) {
            const mpGain = Math.round(pStats.maxMp * 0.1);
            pr.mp = Math.min(pStats.maxMp, pr.mp + mpGain);
            for (let ci = 0; ci < orderedSkills.length; ci++) {
              const other = orderedSkills[ci];
              if (!other || other.isUltimate150 || other.isUltimate180) continue;
              if (pr.cooldowns[ci] > 0) {
                pr.cooldowns[ci] = Math.max(0, pr.cooldowns[ci] - 2);
              }
            }
            addFloatText(pr.x, pr.y - 60, `${lv160Trigger.name} · +${mpGain} Nội Lực`, lv160Trigger.accentColor, 0.96);
          }
        }

        // Spec MP restore effect if skill grants mana recovery
        if (skill.mpRestoreMaxPct && skill.mpRestoreMaxPct > 0) {
          const mpRatio = skill.mpRestoreMaxPct > 1 ? skill.mpRestoreMaxPct / 100 : skill.mpRestoreMaxPct;
          const mpGain = Math.round(pStats.maxMp * mpRatio * rankFactor);
          if (mpGain > 0) {
            pr.mp = Math.min(pStats.maxMp, pr.mp + mpGain);
            addFloatText(pr.x, pr.y - 38, `+${mpGain} Nội Lực`, '#67E8F9', 0.92);
          }
        }

        // Spec Lv.170 cleanse CC + brief control immunity
        if (skill.cleanseCc) {
          pr.invulnTimer = Math.max(pr.invulnTimer, 0.9);
          addFloatText(pr.x, pr.y - 50, 'Giải Khống!', '#A7F3D0', 1.05);
        }

        // Pick best target (includes hostile wandering players in PK slaughter mode)
        const enemies = units.filter((u) => isUnitHostileToPlayer(u));
        const gateAlive = enemies.some((u) => u.kind === 'gate');
        const validEnemies = gateAlive ? enemies.filter((u) => u.kind !== 'pillar') : enemies;
        let target = validEnemies.find((u) => u.id === pr.targetUnitId);
        if (!target && validEnemies.length > 0) {
          target = validEnemies.reduce((best, cur) =>
            Math.hypot(cur.x - pr.x, cur.y - pr.y) < Math.hypot(best.x - pr.x, best.y - pr.y) ? cur : best
          );
          pr.targetUnitId = target.id;
        }

        const angle = target ? Math.atan2(target.y - pr.y, target.x - pr.x) : pr.facing;
        pr.facing = angle;

        // Trigger state-driven 8-dir Attack or 6-frame Casting animation clip + dedicated Casting VFX at caster
        // (cleanly separated from Hit & Collision sheets which fire strictly at the struck monster)
        if (skill.type === 'melee') {
          pr.attackMax = 0.34;
          pr.attackTimer = 0.34;
          atlasHub.trigger(PLAYER_ENTITY_ID, 'attack', { durationSec: 0.34, force: true });
          vfxSheetPool.spawnCastingBurst(sect.element, pr.x, pr.y, angle, 74, p.sect, true);
        } else {
          const castDur = isUltimateCast ? 0.5 : 0.42;
          pr.castMax = castDur;
          pr.castTimer = castDur;
          atlasHub.trigger(PLAYER_ENTITY_ID, 'cast', { durationSec: castDur, force: true });
          vfxSheetPool.spawnCastingBurst(
            sect.element,
            pr.x,
            pr.y,
            angle,
            isUltimateCast ? 104 : 84,
            p.sect,
            skill.type === 'projectile' || skill.type === 'aoe' || skill.type === 'poison'
          );
        }

        // Audio pitch per skill tier / slot
        soundEngine.playSkill(skill.isUltimate180 ? 520 : skill.isUltimate150 ? 445 : 220 + skillIdx * 65);

        // Apply temporary combat buff if skill grants one
        if (skill.buffStat) {
          pr.buffTimer = Math.max(pr.buffTimer, skill.buffStat.durationSec);
          pr.buffAtkPct = skill.buffStat.atkPct ?? pr.buffAtkPct;
          pr.buffDefPct = skill.buffStat.defPct ?? pr.buffDefPct;
          pr.buffCrit = skill.buffStat.critBonus ?? pr.buffCrit;
          pr.buffDodge = skill.buffStat.dodgeBonus ?? pr.buffDodge;
          pr.buffSpeedPct = skill.buffStat.speedPct ?? pr.buffSpeedPct;
          pr.buffDmgReducePct = skill.buffStat.damageReducePct ?? pr.buffDmgReducePct;
          pr.buffLabel = skill.buffStat.label;
          pr.buffColor = skill.color;
          pr.buffAccent = skill.accentColor;
          addFloatText(pr.x, pr.y - 44, skill.buffStat.label, skill.accentColor, 1.02);
        }

        // Apply temporary invulnerability
        if (skill.invulnSec && skill.invulnSec > 0) {
          pr.invulnTimer = Math.max(pr.invulnTimer, skill.invulnSec);
          addFloatText(pr.x, pr.y - 54, `Vô Địch ${skill.invulnSec}s!`, '#FEF08A', 1.1);
        }

        // Apply stealth
        if (skill.stealthSec && skill.stealthSec > 0) {
          pr.stealthTimer = Math.max(pr.stealthTimer, skill.stealthSec);
          addFloatText(pr.x, pr.y - 42, `Ẩn Thân ${skill.stealthSec}s`, '#BAE6FD', 1.08);
          addParticles(pr.x, pr.y, '#BAE6FD', Math.max(6, Math.round(16 * crowdFactor)), 140);
          effectPools.spawnRing({
            x: pr.x,
            y: pr.y,
            radius: 14,
            maxRadius: Math.max(70, skill.radius),
            color: skill.color,
            accent: skill.accentColor,
            life: 0.65,
            maxLife: 0.65,
            kind: vfxKind,
            angle,
            element: sect.element,
          });
        }

        // Dash / Blink / Charge toward target or facing direction
        const originX = pr.x;
        const originY = pr.y;
        if (skill.dashToTarget) {
          const desiredDist = target
            ? Math.min(skill.range, Math.max(36, Math.hypot(target.x - pr.x, target.y - pr.y) - 24))
            : Math.min(skill.range, 165);
          const dest = clampArena(
            pr.x + Math.cos(angle) * desiredDist,
            pr.y + Math.sin(angle) * desiredDist
          );
          addParticles(pr.x, pr.y, skill.color, Math.max(5, Math.round(12 * crowdFactor)), 130);
          effectPools.spawnRing({
            x: pr.x,
            y: pr.y,
            radius: 12,
            maxRadius: 54,
            color: skill.color,
            accent: skill.accentColor,
            life: 0.42,
            maxLife: 0.42,
            kind: vfxKind,
            angle,
            element: sect.element,
          });
          pr.x = dest.x;
          pr.y = dest.y;
          pr.dashTimer = Math.max(pr.dashTimer, 0.24);
          addParticles(pr.x, pr.y, skill.accentColor, Math.max(6, Math.round(14 * crowdFactor)), 150);
          soundEngine.playSlash();
        }

        const maxTargets = skill.maxTargetsPve || 16;

        // Pure Buff / Stealth / Blink-only skills
        if (skill.type === 'buff') {
          if (!skill.stealthSec) {
            effectPools.spawnRing({
              x: pr.x,
              y: pr.y,
              radius: 16,
              maxRadius: Math.max(72, skill.radius),
              color: skill.color,
              accent: skill.accentColor,
              life: 0.65,
              maxLife: 0.65,
              kind: vfxKind,
              angle,
              element: sect.element,
            });
          }
          if (!skill.stealthSec) {
            vfxSheetPool.spawnSkillBurst(
              sect.element,
              vfxKind,
              pr.x,
              pr.y,
              Math.max(72, skill.radius),
              angle,
              0.62,
              p.sect
            );
          }
          emitSkillCastParticles(effectPools, {
            skill,
            element: sect.element,
            originX,
            originY,
            targetX: pr.x,
            targetY: pr.y,
            angle,
            isUltimate: isUltimateCast,
            crowdFactor,
          });
          if (skill.multiplier > 0) {
            let hitUnits = 0;
            for (const e of validEnemies) {
              if (hitUnits >= maxTargets) break;
              if (Math.hypot(e.x - pr.x, e.y - pr.y) <= skill.radius + e.radius) {
                damageUnit(e, perHitSpecDmg, isCrit, sect.element, true);
                applySkillSecondaryEffects(e, skill, pr.x, pr.y, pStats.atk, rankFactor);
                hitUnits += 1;
              }
            }
          }
          return;
        }

        // Heal skills (exact spec heal formula using maxHP% + HPower%)
        if (skill.type === 'heal') {
          const healHpRatio = skill.healMaxHpPct
            ? skill.healMaxHpPct > 1
              ? skill.healMaxHpPct / 100
              : skill.healMaxHpPct
            : 0.24 + 0.16 * rankFactor;
          const healFromMaxHp = pStats.maxHp * healHpRatio * (skill.healMaxHpPct ? rankFactor : 1);
          const hpowerRatio = skill.healHpowerPct
            ? skill.healHpowerPct > 1
              ? skill.healHpowerPct / 100
              : skill.healHpowerPct
            : 0;
          const healFromHpower = hpowerRatio
            ? (pStats.hpower || pStats.atk * 0.65) * hpowerRatio * rankFactor
            : 0;
          const healAmt = Math.max(40, Math.round(healFromMaxHp + healFromHpower));
          pr.hp = Math.min(pStats.maxHp, pr.hp + healAmt);
          addFloatText(pr.x, pr.y - 34, `+${healAmt} Sinh Lực`, '#4ADE80', 1.12);
          if (skill.shieldMaxHpPct && skill.shieldMaxHpPct > 0) {
            const shRatio = skill.shieldMaxHpPct > 1 ? skill.shieldMaxHpPct / 100 : skill.shieldMaxHpPct;
            const bonusShield = Math.round(pStats.maxHp * shRatio * rankFactor);
            pr.shield = Math.max(pr.shield, bonusShield);
          }
          effectPools.spawnRing({
            x: pr.x,
            y: pr.y,
            radius: 18,
            maxRadius: skill.radius,
            color: skill.color,
            accent: skill.accentColor,
            life: skill.isUltimate180 ? 1.0 : 0.72,
            maxLife: skill.isUltimate180 ? 1.0 : 0.72,
            kind: vfxKind,
            angle,
            element: sect.element,
          });
          vfxSheetPool.spawnSkillBurst(
            sect.element,
            vfxKind,
            pr.x,
            pr.y,
            Math.max(74, skill.radius),
            angle,
            skill.isUltimate180 ? 0.86 : 0.68,
            p.sect
          );
          emitSkillCastParticles(effectPools, {
            skill,
            element: sect.element,
            originX,
            originY,
            targetX: pr.x,
            targetY: pr.y,
            angle,
            isUltimate: isUltimateCast,
            crowdFactor,
          });
          if (skill.multiplier > 0) {
            let hitUnits = 0;
            for (const e of validEnemies) {
              if (hitUnits >= maxTargets) break;
              if (Math.hypot(e.x - pr.x, e.y - pr.y) <= skill.radius + e.radius) {
                damageUnit(e, perHitSpecDmg, isCrit, sect.element, true);
                applySkillSecondaryEffects(e, skill, pr.x, pr.y, pStats.atk, rankFactor);
                hitUnits += 1;
              }
            }
          }
          return;
        }

        // Shield skills (exact spec shield formula + optional damage)
        if (skill.type === 'shield') {
          const shieldPct = skill.shieldMaxHpPct
            ? skill.shieldMaxHpPct > 1
              ? skill.shieldMaxHpPct / 100
              : skill.shieldMaxHpPct
            : 0.24;
          const shieldAmt = Math.max(60, Math.round(pStats.maxHp * shieldPct * rankFactor));
          pr.shield = Math.max(pr.shield, shieldAmt);
          pr.buffColor = skill.color;
          pr.buffAccent = skill.accentColor;
          addFloatText(pr.x, pr.y - 36, `Hộ Thể +${shieldAmt}`, skill.accentColor, 1.1);
          effectPools.spawnRing({
            x: pr.x,
            y: pr.y,
            radius: 18,
            maxRadius: skill.radius,
            color: skill.color,
            accent: skill.accentColor,
            life: 0.72,
            maxLife: 0.72,
            kind: vfxKind,
            angle,
            element: sect.element,
          });
          vfxSheetPool.spawnSkillBurst(
            sect.element,
            vfxKind,
            pr.x,
            pr.y,
            Math.max(72, skill.radius),
            angle,
            0.66,
            p.sect
          );
          emitSkillCastParticles(effectPools, {
            skill,
            element: sect.element,
            originX,
            originY,
            targetX: pr.x,
            targetY: pr.y,
            angle,
            isUltimate: isUltimateCast,
            crowdFactor,
          });
          if (skill.multiplier > 0) {
            let hitUnits = 0;
            for (const e of validEnemies) {
              if (hitUnits >= maxTargets) break;
              if (Math.hypot(e.x - pr.x, e.y - pr.y) <= skill.radius + e.radius) {
                damageUnit(e, perHitSpecDmg, isCrit, sect.element, true);
                applySkillSecondaryEffects(e, skill, pr.x, pr.y, pStats.atk, rankFactor);
                hitUnits += 1;
              }
            }
          }
          return;
        }

        // Projectile skills — projectiles fly cleanly from caster to monster & detonate ON THE MONSTER
        if (skill.type === 'projectile') {
          const count = Math.max(1, skill.projectileCount || 1);
          const perProjDmg = baseDmg / (count > 1 ? 1 + (count - 1) * 0.28 : 1);
          const isRadial = count >= 8;
          const isTwinParallel = count === 2 && vfxKind === 'blade_wave_line';
          const projSpeed =
            skill.projectileSpeedPx ||
            (vfxKind === 'needle_barrage' ? 580 : vfxKind === 'six_swords' || vfxKind === 'six_meridian_ult' ? 560 : 510);
          const targetDist = target ? Math.hypot(target.x - pr.x, target.y - pr.y) : skill.range;
          const projLife = Math.max(0.75, Math.min(1.55, Math.max(skill.range, targetDist + 70) / projSpeed + 0.24));

          for (let i = 0; i < count; i++) {
            let a = angle;
            let spawnX = pr.x + Math.cos(angle) * 22;
            let spawnY = pr.y + Math.sin(angle) * 22;

            if (isRadial) {
              a = angle + (i * Math.PI * 2) / count;
              spawnX = pr.x + Math.cos(a) * 20;
              spawnY = pr.y + Math.sin(a) * 20;
            } else if (isTwinParallel) {
              const perp = angle + Math.PI / 2;
              const offset = i === 0 ? -14 : 14;
              spawnX = pr.x + Math.cos(angle) * 20 + Math.cos(perp) * offset;
              spawnY = pr.y + Math.sin(angle) * 20 + Math.sin(perp) * offset;
            } else if (count > 1) {
              const fanSpan = Math.min(0.68, (count - 1) * 0.13);
              a = angle - fanSpan / 2 + (fanSpan * i) / (count - 1);
              spawnX = pr.x + Math.cos(a) * 22;
              spawnY = pr.y + Math.sin(a) * 22;
            }

            effectPools.spawnProjectile({
              x: spawnX,
              y: spawnY,
              vx: Math.cos(a) * projSpeed,
              vy: Math.sin(a) * projSpeed,
              radius:
                vfxKind === 'dragon_palm' || vfxKind === 'dragon_storm_ult'
                  ? 18
                  : vfxKind === 'blade_wave_line'
                  ? 16
                  : vfxKind === 'needle_barrage'
                  ? 10
                  : 13,
              color: skill.color,
              accent: skill.accentColor,
              team: 'ally',
              damage: perProjDmg,
              crit: isCrit,
              element: sect.element,
              life: projLife,
              pierce: Boolean(skill.pierce),
              slow: Boolean(skill.slowSec && skill.slowSec > 0),
              poisonDps:
                skill.dotAtkPct && skill.dotAtkPct > 0
                  ? Math.round(pStats.atk * skill.dotAtkPct * rankFactor)
                  : vfxKind === 'venom_palm' || vfxKind === 'venom_curse' || Boolean(skill.movePoisonSec)
                  ? Math.round(pStats.atk * 0.42 * rankFactor)
                  : 0,
              stunSec: skill.stunSec || 0,
              pushStrength: skill.pushStrength || 0,
              pullStrength: skill.pullStrength || 0,
              drainRatio: skill.drainRatio || 0,
              movePoisonSec: skill.movePoisonSec || 0,
              vfxKind,
            });
          }

          // Only subtle weapon launch particles at caster — full skill burst explodes ON THE MONSTER when hit!
          addParticles(
            pr.x + Math.cos(angle) * 24,
            pr.y + Math.sin(angle) * 24,
            skill.accentColor || skill.color,
            Math.max(4, Math.round(8 * crowdFactor)),
            115
          );
          if (isUltimateCast) {
            addFloatText(pr.x, pr.y - 46, skill.name, skill.accentColor || '#F5D061', 1.08);
          }
          return;
        }

        // Melee skills — lunge into monster or launch fast blade-qi slash so impact ALWAYS hits the monster
        if (skill.type === 'melee') {
          soundEngine.playSlash();
          const targetDist = target ? Math.hypot(target.x - pr.x, target.y - pr.y) : 0;
          const meleeReach = Math.max(skill.radius + 28, 72);

          // If target is slightly outside immediate blade reach, step/lunge forward into striking range
          if (target && targetDist > meleeReach && targetDist <= Math.max(skill.range + 160, 290)) {
            const lungeDist = Math.min(targetDist - Math.max(24, target.radius + 8), 165);
            if (lungeDist > 12) {
              const dest = clampArena(pr.x + Math.cos(angle) * lungeDist, pr.y + Math.sin(angle) * lungeDist);
              pr.x = dest.x;
              pr.y = dest.y;
              pr.dashTimer = Math.max(pr.dashTimer, 0.16);
            }
          }

          const postDist = target ? Math.hypot(target.x - pr.x, target.y - pr.y) : 0;
          const strikeOnTarget = Boolean(target && postDist <= Math.max(skill.range + 130, 220));
          const strikeX = strikeOnTarget && target ? target.x : pr.x + Math.cos(angle) * Math.min(92, Math.max(58, skill.range * 0.55));
          const strikeY = strikeOnTarget && target ? target.y : pr.y + Math.sin(angle) * Math.min(92, Math.max(58, skill.range * 0.55));

          effectPools.spawnRing({
            x: strikeX,
            y: strikeY,
            radius: 18,
            maxRadius: Math.max(66, skill.radius),
            color: skill.color,
            accent: skill.accentColor,
            life: hitCount >= 2 ? 0.44 : 0.32,
            maxLife: hitCount >= 2 ? 0.44 : 0.32,
            kind: vfxKind,
            angle,
            element: sect.element,
            sourceX: originX,
            sourceY: originY,
          });
          if (Math.hypot(strikeX - pr.x, strikeY - pr.y) > 54) {
            vfxSheetPool.spawnTravelingSkill(
              sect.element,
              vfxKind,
              pr.x,
              pr.y,
              strikeX,
              strikeY,
              Math.max(66, skill.radius),
              hitCount >= 2 ? 0.46 : 0.36,
              p.sect
            );
          } else {
            vfxSheetPool.spawnSkillBurst(
              sect.element,
              vfxKind,
              strikeX,
              strikeY,
              Math.max(66, skill.radius),
              angle,
              hitCount >= 2 ? 0.46 : 0.36,
              p.sect
            );
          }
          emitSkillCastParticles(effectPools, {
            skill,
            element: sect.element,
            originX,
            originY,
            targetX: strikeX,
            targetY: strikeY,
            angle,
            isUltimate: isUltimateCast,
            crowdFactor,
          });

          let hitUnits = 0;
          for (const e of validEnemies) {
            if (hitUnits >= maxTargets) break;
            const dFromStrike = Math.hypot(e.x - strikeX, e.y - strikeY);
            const dFromPlayer = Math.hypot(e.x - pr.x, e.y - pr.y);
            if (dFromStrike <= skill.radius + e.radius + 22 || dFromPlayer <= skill.radius + e.radius + 26) {
              for (let h = 0; h < hitCount; h++) {
                damageUnit(e, perHitSpecDmg, isCrit && h === hitCount - 1, sect.element, true);
              }
              applySkillSecondaryEffects(e, skill, strikeX, strikeY, pStats.atk, rankFactor);
              hitUnits += 1;
            }
          }
          return;
        }

        // AoE or Poison — ALWAYS targets the monster (close-range whirls lunge to monster; ranged AoEs travel to monster & detonate ON IT!)
        const isPureDefensiveSelf =
          vfxKind === 'lotus_sanctuary_ult' || vfxKind === 'guard_shield_140';
        const isMeleeWhirl =
          vfxKind === 'lion_roar' ||
          vfxKind === 'star_staff_spin' ||
          vfxKind === 'vortex_pull' ||
          vfxKind === 'knockback_ring' ||
          vfxKind === 'spear_whirl_shield';

        const aoeTargetDist = target ? Math.hypot(target.x - pr.x, target.y - pr.y) : 0;
        if (isMeleeWhirl && target && aoeTargetDist > skill.radius * 0.58 + target.radius && aoeTargetDist <= Math.max(skill.range + 190, 340)) {
          const leapDist = Math.max(0, aoeTargetDist - Math.max(24, target.radius + 6));
          const dest = clampArena(pr.x + Math.cos(angle) * leapDist, pr.y + Math.sin(angle) * leapDist);
          pr.x = dest.x;
          pr.y = dest.y;
          pr.dashTimer = Math.max(pr.dashTimer, 0.2);
        }

        const lockTargetOnMonster =
          !isPureDefensiveSelf &&
          Boolean(target && Math.hypot(target.x - pr.x, target.y - pr.y) <= Math.max(skill.range + 220, 480));

        const cx = isPureDefensiveSelf
          ? pr.x
          : lockTargetOnMonster && target
          ? target.x
          : isMeleeWhirl
          ? pr.x
          : pr.x + Math.cos(angle) * Math.min(185, Math.max(110, skill.range * 0.72));
        const cy = isPureDefensiveSelf
          ? pr.y
          : lockTargetOnMonster && target
          ? target.y
          : isMeleeWhirl
          ? pr.y
          : pr.y + Math.sin(angle) * Math.min(185, Math.max(110, skill.range * 0.72));

        const aoeLife = skill.isUltimate180 ? 1.05 : skill.isUltimate150 ? 0.88 : isUltimateCast ? 0.82 : 0.66;
        effectPools.spawnRing({
          x: cx,
          y: cy,
          radius: 18,
          maxRadius: skill.radius,
          color: skill.color,
          accent: skill.accentColor,
          life: aoeLife,
          maxLife: aoeLife,
          kind: vfxKind,
          angle,
          element: sect.element,
          sourceX: pr.x,
          sourceY: pr.y,
        });
        if (!isPureDefensiveSelf && Math.hypot(cx - pr.x, cy - pr.y) > 48) {
          vfxSheetPool.spawnTravelingSkill(
            sect.element,
            vfxKind,
            pr.x,
            pr.y,
            cx,
            cy,
            skill.radius,
            aoeLife * 0.92,
            p.sect
          );
        } else {
          vfxSheetPool.spawnSkillBurst(sect.element, vfxKind, cx, cy, skill.radius, angle, aoeLife * 0.9, p.sect);
        }
        emitSkillCastParticles(effectPools, {
          skill,
          element: sect.element,
          originX: pr.x,
          originY: pr.y,
          targetX: cx,
          targetY: cy,
          angle,
          isUltimate: isUltimateCast,
          crowdFactor,
        });
        // Spec readability: no white screen flash and no continuous camera shake on Lv.150/180 ultimates
        if (isUltimateCast) {
          shakeIntensity = Math.max(shakeIntensity, 3.8);
          addFloatText(pr.x, pr.y - 46, skill.name, skill.accentColor || '#F5D061', 1.1);
        }

        let totalDrained = 0;
        let hitUnits = 0;
        const isPvpBattle = propsRef.current.battle.mode === 'ARENA';

        for (const e of validEnemies) {
          if (hitUnits >= maxTargets) break;
          if (Math.hypot(e.x - cx, e.y - cy) <= skill.radius + e.radius) {
            for (let h = 0; h < hitCount; h++) {
              damageUnit(e, perHitSpecDmg, isCrit && h === hitCount - 1, sect.element, true);
            }
            applySkillSecondaryEffects(e, skill, cx, cy, pStats.atk, rankFactor);
            if (skill.drainRatio && skill.drainRatio > 0) {
              const rawDrain = Math.round(baseDmg * skill.drainRatio);
              // Spec PvP lifesteal cap: max 2% max HP per hit against player opponents
              const isPlayerTarget = isPvpBattle || e.kind === 'wanderer';
              totalDrained += isPlayerTarget
                ? Math.min(Math.round(pStats.maxHp * 0.02 * hitCount), rawDrain)
                : rawDrain;
            }
            hitUnits += 1;
          }
        }

        if (totalDrained > 0) {
          const hpGain = Math.min(pStats.maxHp - pr.hp, Math.max(25, totalDrained));
          const mpGain = Math.min(pStats.maxMp - pr.mp, Math.max(15, Math.round(totalDrained * 0.4)));
          pr.hp = Math.min(pStats.maxHp, pr.hp + hpGain);
          pr.mp = Math.min(pStats.maxMp, pr.mp + mpGain);
          addFloatText(pr.x, pr.y - 36, `Hấp Thu +${Math.round(hpGain)} HP`, '#5EEAD4', 1.0);
        }
      };

      const handleUnitDeath = (u: Unit) => {
        // Transfer 8-dir state seamlessly into dying slot inside centralized BattleSpriteAtlasHub
        const deathDur = u.kind === 'boss' ? 1.15 : 0.65;
        const dyingId = `dying_${u.id}_${Date.now()}`;
        const deadAnim = atlasHub.transferToDying(u.id, dyingId, deathDur);
        dyingUnits.push({
          dyingId,
          unit: { ...u, anim: deadAnim },
          progress: 0,
          maxDuration: deathDur,
        });

        addParticles(u.x, u.y, u.color, u.kind === 'boss' || u.kind === 'pillar' ? 42 : 16, 200);
        const curMode = propsRef.current.battle.mode;
        const p = propsRef.current.player;

        if (curMode === 'WILD' && (u.kind === 'mob' || u.kind === 'elite')) {
          const dropChance = u.kind === 'elite' ? 0.52 : 0.2;
          let item: EquipmentItem | undefined;
          if (Math.random() < dropChance) {
            const map = MAPS.find((m) => m.id === p.currentMapId) || MAPS[0];
            item = generateEquipment(Math.max(p.level, map.minLevel));
          }
          const stones = u.kind === 'elite' || Math.random() < 0.25 ? 1 : 0;
          const isHighDrop =
            item && (item.quality === 'mythic' || item.quality === 'gold' || item.quality === 'purple');
          lootOrbs.push({
            x: u.x,
            y: u.y,
            color: item ? QUALITY_META[item.quality].color : '#F5D061',
            label: item ? `[${item.name}]` : `+${u.silverReward ?? 80} Bạc`,
            life: item ? (isHighDrop ? 2.5 : 1.75) : 1.15,
            quality: item?.quality,
            slot: item ? item.slot : stones > 0 ? 'stone' : undefined,
            itemName: item?.name,
            sectId: p.sect,
            age: 0,
          });

          // Drop interactive pulsing Treasure Chest on WILD battlefield
          const chestChance = u.kind === 'elite' ? 0.68 : 0.24;
          if (fieldChests.length < 6 && Math.random() < chestChance) {
            const roll = Math.random();
            let tier: ChestTier = 'iron';
            if (u.kind === 'elite') {
              if (roll < 0.2) tier = 'imperial_gold';
              else if (roll < 0.65) tier = 'purple_gold';
            } else {
              if (roll < 0.08) tier = 'imperial_gold';
              else if (roll < 0.32) tier = 'purple_gold';
            }
            const dropPos = clampArena(
              u.x + (-22 + Math.random() * 44),
              u.y + (-16 + Math.random() * 32)
            );
            fieldChests.push({
              id: `fc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              x: dropPos.x,
              y: dropPos.y,
              tier,
              sourceName: u.name,
              age: 0,
              bounce: 1,
            });
            const meta = CHEST_TIER_META[tier];
            addParticles(dropPos.x, dropPos.y, meta.color, 18, 140);
            addFloatText(dropPos.x, dropPos.y - 28, `Rơi ${meta.shortName} Rương!`, meta.color, 1.15);
            soundEngine.playChestDrop();
          } else {
            soundEngine.playLoot();
          }

          propsRef.current.onWildKill({
            exp: u.expReward ?? 60,
            silver: u.silverReward ?? 80,
            stones,
            item,
            mobName: u.name,
          });
        } else if (curMode === 'WILD' && u.kind === 'wanderer') {
          const dropChance = 0.55;
          const item =
            Math.random() < dropChance
              ? generateEquipment(Math.max(1, p.level + 1), Math.random() < 0.28 ? 'purple' : 'blue')
              : undefined;
          const silver = u.silverReward || 450 + p.level * 40;
          const stones = 1 + (Math.random() < 0.45 ? 1 : 0);
          soundEngine.playCrit();
          shakeIntensity = Math.max(shakeIntensity, 8);
          addFloatText(u.x, u.y - 26, 'ĐỒ SÁT THÀNH CÔNG! (+1 Sát Khí)', '#EF4444', 1.25);
          lootOrbs.push({
            x: u.x,
            y: u.y,
            color: item ? QUALITY_META[item.quality].color : '#EF4444',
            label: item ? `[${item.name}]` : `+${silver} Bạc (PK)`,
            life: 2.3,
            quality: item?.quality,
            slot: item ? item.slot : 'stone',
            itemName: item?.name,
            sectId: p.sect,
            age: 0,
          });
          propsRef.current.onPkKill({
            victimName: u.name,
            victimSect: u.masterSect || 'vo_dang',
            silver,
            merit: 45,
            stones,
            item,
          });
        } else if (curMode === 'BOSS' && u.kind === 'boss' && !battleFinished) {
          battleFinished = true;
          const boss =
            WORLD_BOSSES.find((b) => b.id === propsRef.current.battle.bossId) || WORLD_BOSSES[0];
          const quality: ItemQuality =
            boss.level >= 60 && Math.random() < 0.24
              ? 'mythic'
              : boss.level >= 50 || Math.random() < 0.45
              ? 'gold'
              : 'purple';
          const dropItem = generateEquipment(Math.max(p.level, boss.level), quality);
          soundEngine.playLevelUp();
          propsRef.current.onBattleComplete({
            victory: true,
            mode: 'BOSS',
            title: `Hạ Gục Boss Hoàng Kim ${boss.name}!`,
            subtitle: 'Kỳ trân dị bảo rơi rải khắp chiến trường, giang hồ chấn động.',
            rewards: {
              exp: boss.expReward,
              silver: boss.silverReward,
              goldIngots: boss.goldIngotReward,
              enhanceStones: boss.stoneReward,
              merit: boss.meritReward,
              reputation: Math.round(boss.meritReward * 0.8),
              item: dropItem,
            },
          });
        } else if (curMode === 'ARENA' && u.kind === 'rival' && !battleFinished) {
          battleFinished = true;
          const rival = propsRef.current.battle.arenaOpponent!;
          soundEngine.playLevelUp();
          propsRef.current.onBattleComplete({
            victory: true,
            mode: 'ARENA',
            title: `Chiến Thắng Lôi Đài!`,
            subtitle: `Bạn đã đánh bại ${rival.name} (${SECTS[rival.sect].name}) và đoạt lấy thứ hạng mới.`,
            rewards: {
              exp: Math.round(450 + rival.level * 95),
              silver: Math.round(1400 + rival.level * 140),
              reputation: 180 + (20 - rival.rank) * 15,
              merit: 150 + (20 - rival.rank) * 12,
              enhanceStones: 3,
              extraText: rival.rank < p.arenaRank ? `Thăng lên Hạng #${rival.rank} Lôi Đài!` : 'Giữ vững vị trí trên bảng xếp hạng.',
            },
          });
        } else if (curMode === 'SIEGE') {
          const city =
            propsRef.current.cities.find((c) => c.id === propsRef.current.battle.siegeCityId) ||
            propsRef.current.cities[0];
          if (u.kind === 'gate') {
            soundEngine.playWarDrum();
            shakeIntensity = 12;
            objectiveLabel = `Công Thành Chiến ${city.name} · Giai đoạn 2: Chiếm Long Trụ!`;
            addFloatText(u.x, u.y - 30, 'CỔNG THÀNH ĐÃ VỠ!', '#F5D061', 1.4);
          } else if (u.kind === 'pillar' && !battleFinished) {
            battleFinished = true;
            soundEngine.playLevelUp();
            const drop = generateEquipment(p.level + 3, 'gold');
            propsRef.current.onBattleComplete({
              victory: true,
              mode: 'SIEGE',
              title: `Chiếm Thành ${city.name} Thành Công!`,
              subtitle: `Long Trụ đã thuộc về Bang Ta! Toàn giang hồ truyền tụng uy danh Thành Chủ mới.`,
              rewards: {
                exp: 5500 + p.level * 300,
                silver: city.dailySilver,
                goldIngots: city.dailyIngots,
                enhanceStones: city.dailyStones,
                merit: 950,
                reputation: 850,
                item: drop,
                extraText: `Danh hiệu Uy Chấn Thành Chủ đã mở khóa · Nhận bổng lộc ${city.name} hằng ngày!`,
              },
            });
          }
        } else if (curMode === 'GUILD_WAR' && u.kind === 'banner' && !battleFinished) {
          battleFinished = true;
          const territory =
            propsRef.current.territories.find(
              (t) => t.id === propsRef.current.battle.guildWarTerritoryId
            ) || propsRef.current.territories[0];
          soundEngine.playLevelUp();
          const dropQuality = territory.recommendedPower >= 15000 ? 'gold' : 'purple';
          const drop = generateEquipment(p.level + 2, dropQuality);
          propsRef.current.onBattleComplete({
            victory: true,
            mode: 'GUILD_WAR',
            title: `Chiếm Đoạt ${territory.name} Thành Công!`,
            subtitle: `Chiến Kỳ của ${territory.defenderGuildName} đã gãy đổ! Lãnh địa tài nguyên tại ${territory.region} nay thuộc quyền kiểm soát của Bang Ta.`,
            rewards: {
              exp: 2600 + p.level * 180,
              silver: territory.claimSilver,
              goldIngots: territory.claimIngots,
              enhanceStones: territory.claimStones,
              merit: 420,
              reputation: 380,
              item: drop,
              extraText: `Hiệu ứng lãnh địa: ${territory.bonusLabel} · Thu hoạch tài nguyên định kỳ mỗi 2 phút!`,
            },
          });
        }
      };

      // Main 60fps loop
      let rafId = 0;
      let lastTs = performance.now();

      const step = (now: number) => {
        rafId = requestAnimationFrame(step);
        const rawDt = (now - lastTs) / 1000;
        lastTs = now;
        const dt = Math.min(rawDt, 0.05);

        if (propsRef.current.paused || battleFinished) {
          renderScene();
          return;
        }

        if (hitstopTimer > 0) {
          hitstopTimer = Math.max(0, hitstopTimer - dt);
          renderScene();
          return;
        }

        shakeIntensity = Math.max(0, shakeIntensity - dt * 22);

        const p = propsRef.current.player;
        const pStats = propsRef.current.stats;
        const sect = SECTS[p.sect];
        const curMode = propsRef.current.battle.mode;

        // Keep maxHp/maxMp synced
        if (pr.hp > pStats.maxHp) pr.hp = pStats.maxHp;
        pr.mp = Math.min(pStats.maxMp, pr.mp + pStats.maxMp * 0.085 * dt);
        if (curMode === 'WILD') {
          pr.hp = Math.min(pStats.maxHp, pr.hp + pStats.maxHp * 0.025 * dt);
        }

        for (let i = 0; i < 6; i++) {
          pr.cooldowns[i] = Math.max(0, (pr.cooldowns[i] || 0) - dt);
        }
        pr.dashCd = Math.max(0, pr.dashCd - dt);
        pr.dashTimer = Math.max(0, pr.dashTimer - dt);
        pr.stealthTimer = Math.max(0, pr.stealthTimer - dt);
        pr.invulnTimer = Math.max(0, pr.invulnTimer - dt);
        if (pr.buffTimer > 0) {
          pr.buffTimer = Math.max(0, pr.buffTimer - dt);
          if (pr.buffTimer <= 0) {
            pr.buffAtkPct = 0;
            pr.buffDefPct = 0;
            pr.buffCrit = 0;
            pr.buffDodge = 0;
            pr.buffSpeedPct = 0;
            pr.buffDmgReducePct = 0;
            pr.buffLabel = '';
            pr.buffColor = '';
            pr.buffAccent = '';
          }
        }
        // Continuous orbiting Five-Element support/shield/stealth aura particles around hero
        if (pr.invulnTimer > 0 || pr.shield > 0 || pr.buffTimer > 0 || pr.stealthTimer > 0) {
          pr.auraTick += dt;
          if (pr.auraTick >= 0.095) {
            pr.auraTick = 0;
            const curSect = SECTS[p.sect];
            const auraColor = pr.buffColor || curSect.color;
            const auraAccent = pr.buffAccent || ELEMENT_VFX_PALETTE[curSect.element].bright;
            const auraMode =
              pr.invulnTimer > 0
                ? 'invuln'
                : pr.stealthTimer > 0
                ? 'stealth'
                : pr.shield > 0
                ? 'shield'
                : 'buff';
            emitActiveAuraParticles(
              effectPools,
              pr.x,
              pr.y,
              curSect.element,
              auraColor,
              auraAccent,
              auraMode
            );
          }
        }
        pr.hitFlash = Math.max(0, pr.hitFlash - dt);
        pr.attackTimer = Math.max(0, pr.attackTimer - dt);
        pr.castTimer = Math.max(0, pr.castTimer - dt);
        pr.deathTimer = Math.max(0, pr.deathTimer - dt);
        // Combo continuity decay & spring punch interpolation
        if (combo.count > 0) {
          combo.timer = Math.max(0, combo.timer - dt);
          if (combo.timer <= 0) {
            resetCombo(false);
          }
        }
        combo.popScale = Math.max(1, combo.popScale - (combo.popScale - 1) * Math.min(1, dt * 13));
        combo.tierFlash = Math.max(0, combo.tierFlash - dt * 2.1);
        combo.breakTimer = Math.max(0, combo.breakTimer - dt);

        // Level-Up Golden Ascension VFX lifecycle & full HP/MP surge
        const lvlFx = levelUpFxRef.current;
        if (lvlFx.active) {
          if (lvlFx.needsBurst) {
            lvlFx.needsBurst = false;
            pr.hp = pStats.maxHp;
            pr.mp = pStats.maxMp;
            shakeIntensity = Math.max(shakeIntensity, 4.4);
            addParticles(pr.x, pr.y - 6, '#F5D061', 26, 165);
            addParticles(pr.x, pr.y - 14, '#FEF9C3', 18, 125);
            addParticles(pr.x, pr.y - 10, '#4ADE80', 10, 95);
            effectPools.spawnRing({
              x: pr.x,
              y: pr.y + 4,
              radius: 14,
              maxRadius: 94,
              color: '#F5D061',
              accent: '#FEF9C3',
              life: 0.72,
              maxLife: 0.72,
              kind: 'lotus',
              element: 'kim',
            });
          }
          lvlFx.elapsed += dt;
          if (lvlFx.elapsed >= lvlFx.duration) {
            lvlFx.active = false;
          }
        }

        atlasHub.advanceClock(dt);
        pr.animPhase = atlasHub.globalPhase;
        const prevPlayerX = pr.x;
        const prevPlayerY = pr.y;

        // Process pending UI actions
        if (pendingActionsRef.current.potion) {
          pendingActionsRef.current.potion = false;
          if (p.potions > 0 && pr.hp < pStats.maxHp) {
            const heal = Math.round(pStats.maxHp * 0.45);
            pr.hp = Math.min(pStats.maxHp, pr.hp + heal);
            addFloatText(pr.x, pr.y - 30, `Kim Sang Dược +${heal}`, '#4ADE80', 1.1);
            soundEngine.playLoot();
            propsRef.current.onPotionConsumed();
          }
        }
        if (pendingActionsRef.current.dash) {
          pendingActionsRef.current.dash = false;
          if (pr.dashCd <= 0) {
            pr.dashCd = 3.2;
            pr.dashTimer = 0.24;
            const dashDist = 115;
            const dest = clampArena(
              pr.x + Math.cos(pr.facing) * dashDist,
              pr.y + Math.sin(pr.facing) * dashDist
            );
            addParticles(pr.x, pr.y, sect.color, 12, 120);
            pr.x = dest.x;
            pr.y = dest.y;
            addFloatText(pr.x, pr.y - 28, 'Khinh Công!', '#E0F2FE', 0.9);
            soundEngine.playSlash();
          }
        }
        if (pendingActionsRef.current.castIndex !== null) {
          const idx = pendingActionsRef.current.castIndex;
          pendingActionsRef.current.castIndex = null;
          performSkill(idx);
        }
        if (pendingActionsRef.current.previewSkillId) {
          const sid = pendingActionsRef.current.previewSkillId;
          pendingActionsRef.current.previewSkillId = null;
          triggerSkillVisualPreview(sid);
        }

        // Player Movement: Keyboard overrides click/auto (spec moveSpeed cap 80%)
        let moveX = 0;
        let moveY = 0;
        if (heldKeys.has('w') || heldKeys.has('arrowup')) moveY -= 1;
        if (heldKeys.has('s') || heldKeys.has('arrowdown')) moveY += 1;
        if (heldKeys.has('a') || heldKeys.has('arrowleft')) moveX -= 1;
        if (heldKeys.has('d') || heldKeys.has('arrowright')) moveX += 1;

        const speedBuffBonus = pr.buffTimer > 0 ? pr.buffSpeedPct : 0;
        const clampedSpeedBonus = Math.min(80, pStats.moveSpeedPct + speedBuffBonus);
        const playerSpeed = Math.round(165 * (1 + clampedSpeedBonus / 100));
        if (moveX !== 0 || moveY !== 0) {
          const len = Math.hypot(moveX, moveY);
          pr.facing = Math.atan2(moveY, moveX);
          const next = clampArena(pr.x + (moveX / len) * playerSpeed * dt, pr.y + (moveY / len) * playerSpeed * dt);
          pr.x = next.x;
          pr.y = next.y;
          pr.moveTarget = null;
        } else if (pr.moveTarget) {
          const dx = pr.moveTarget.x - pr.x;
          const dy = pr.moveTarget.y - pr.y;
          const d = Math.hypot(dx, dy);
          if (d < 8) {
            pr.moveTarget = null;
          } else {
            pr.facing = Math.atan2(dy, dx);
            pr.x += (dx / d) * playerSpeed * dt;
            pr.y += (dy / d) * playerSpeed * dt;
          }
        } else if (propsRef.current.autoBattle) {
          // Smart Auto-Combat AI
          const enemies = units.filter((u) => isUnitHostileToPlayer(u));
          const gateAlive = enemies.some((u) => u.kind === 'gate');
          const validEnemies = gateAlive ? enemies.filter((u) => u.kind !== 'pillar') : enemies;

          // Auto heal potion if low HP
          if (pr.hp < pStats.maxHp * 0.35 && p.potions > 0) {
            pendingActionsRef.current.potion = true;
          }

          if (validEnemies.length > 0) {
            // Prefer siege gate/pillar when in siege, else nearest
            let target = validEnemies.find((u) => u.id === pr.targetUnitId);
            if (!target) {
              target = validEnemies.reduce((best, cur) =>
                Math.hypot(cur.x - pr.x, cur.y - pr.y) < Math.hypot(best.x - pr.x, best.y - pr.y) ? cur : best
              );
              pr.targetUnitId = target.id;
            }
            const dist = Math.hypot(target.x - pr.x, target.y - pr.y);
            const orderedSkills = getPlayerHotbarSkills(p);
            const preferredRange = (orderedSkills[0]?.range ?? sect.skills[0].range) * 0.78;
            if (dist > preferredRange + target.radius) {
              const a = Math.atan2(target.y - pr.y, target.x - pr.x);
              pr.facing = a;
              const next = clampArena(pr.x + Math.cos(a) * playerSpeed * dt, pr.y + Math.sin(a) * playerSpeed * dt);
              pr.x = next.x;
              pr.y = next.y;
            } else {
              // Cast highest priority available skill on hotbar (slots 6 -> 1)
              const castOrder = [5, 4, 3, 2, 1, 0];
              for (const idx of castOrder) {
                const sk = orderedSkills[idx];
                if (!sk) continue;
                if ((p.skillLevels[sk.id] || 0) <= 0) continue;
                if ((pr.cooldowns[idx] || 0) > 0 || pr.mp < sk.mpCost) continue;
                if ((sk.type === 'heal' || sk.type === 'shield') && pr.hp > pStats.maxHp * 0.78 && sk.multiplier <= 0.2) continue;
                if (sk.type === 'buff' && pr.buffTimer > 2.5 && !sk.dashToTarget) continue;
                if (sk.stealthSec && pr.stealthTimer > 0.5) continue;
                performSkill(idx);
                break;
              }
            }
          }
        }

        // Track player movement velocity & advance centralized 8-direction BattleSpriteAtlasHub
        const movedDist = Math.hypot(pr.x - prevPlayerX, pr.y - prevPlayerY);
        pr.isMoving = movedDist > 0.35;
        pr.isRunning = movedDist > 0.35 && (playerSpeed >= 185 || pr.dashTimer > 0);
        pr.anim = atlasHub.stepEntity(PLAYER_ENTITY_ID, {
          dt,
          desiredFacing: pr.facing,
          isMoving: pr.isMoving,
          isRunning: pr.isRunning,
          isMounted: Boolean(p.isMounted && p.activeMountId),
          isDead: pr.hp <= 0,
          turnSpeed: 20,
        });

        // Emit mythical mount illusion or evolved mount hoof & aura trail particles via Object Pool
        if (p.isMounted && (p.activeMountIllusionId || p.activeMountId)) {
          const ill = p.activeMountIllusionId
            ? MOUNT_ILLUSIONS.find((x) => x.id === p.activeMountIllusionId)
            : null;
          const mnt = MOUNTS.find((m) => m.id === p.activeMountId);
          const emitRate = ill ? (pr.isMoving ? 18 : 7) : mnt && mnt.tier >= 3 && pr.isMoving ? 10 : 0;
          if (emitRate > 0 && Math.random() < dt * emitRate) {
            const trailAngle = pr.facing + Math.PI + (-0.6 + Math.random() * 1.2);
            const sp = 28 + Math.random() * 44;
            effectPools.spawnParticle(
              pr.x + (-14 + Math.random() * 28),
              pr.y + 8 + (-4 + Math.random() * 10),
              Math.cos(trailAngle) * sp,
              Math.sin(trailAngle) * sp - 12,
              1.8 + Math.random() * 2.6,
              ill
                ? Math.random() < 0.6
                  ? ill.auraColor
                  : ill.accentColor
                : mnt?.accentColor || '#F5D061',
              0.35 + Math.random() * 0.3,
              0.65
            );
          }
        }

        // Update Units (AI, Visual Behavior, poison, knockback, telegraph, attacks)
        for (const u of units) {
          if (u.hp <= 0) continue;
          u.hitFlash = Math.max(0, u.hitFlash - dt);
          u.slowTimer = Math.max(0, u.slowTimer - dt);
          u.stunTimer = Math.max(0, u.stunTimer - dt);
          u.attackCd = Math.max(0, u.attackCd - dt);
          u.attackTimer = Math.max(0, (u.attackTimer || 0) - dt);
          u.alertTimer = Math.max(0, (u.alertTimer || 0) - dt);
          u.roarTimer = Math.max(0, (u.roarTimer || 0) - dt);
          u.isMoving = false;

          // Smooth knockback decay (#7)
          if (u.knockbackX || u.knockbackY) {
            const kx = u.knockbackX || 0;
            const ky = u.knockbackY || 0;
            if (Math.hypot(kx, ky) > 4) {
              const nextKb = clampArena(u.x + kx * dt, u.y + ky * dt);
              u.x = nextKb.x;
              u.y = nextKb.y;
              const damp = Math.pow(0.06, dt);
              u.knockbackX = kx * damp;
              u.knockbackY = ky * damp;
            } else {
              u.knockbackX = 0;
              u.knockbackY = 0;
            }
          }

          // Track distance moved for Hóa Cốt Miên Chưởng (move-triggered venom)
          const stepDist =
            u.prevX !== undefined && u.prevY !== undefined
              ? Math.hypot(u.x - u.prevX, u.y - u.prevY)
              : 0;
          u.prevX = u.x;
          u.prevY = u.y;

          if (u.poisonTimer > 0) {
            u.poisonTimer -= dt;
            if (Math.random() < dt * 2.2) {
              const pdmg = Math.max(10, Math.round(u.poisonDps * 0.5));
              u.hp = Math.max(0, u.hp - pdmg);
              addFloatText(u.x, u.y - u.radius, `Độc -${pdmg}`, '#4ADE80', 0.85);
              vfxSheetPool.spawnHitImpactBurst('status_element', u.x, u.y - 6, 46, 0, 'moc');
            }
          }

          if (u.burnTimer && u.burnTimer > 0) {
            u.burnTimer = Math.max(0, u.burnTimer - dt);
            if (Math.random() < dt * 2.4) {
              const bdmg = Math.max(12, Math.round((u.burnDps || 40) * 0.55));
              u.hp = Math.max(0, u.hp - bdmg);
              addFloatText(u.x, u.y - u.radius - 4, `Cháy -${bdmg}`, '#FB923C', 0.85);
              addParticles(u.x, u.y, '#F97316', 3, 55);
              vfxSheetPool.spawnHitImpactBurst('status_element', u.x, u.y - 6, 46, 0, 'hoa');
            }
          }

          if (u.movePoisonTimer && u.movePoisonTimer > 0) {
            u.movePoisonTimer = Math.max(0, u.movePoisonTimer - dt);
            if (stepDist > 1.2 && Math.random() < dt * 4.5) {
              const mdmg = Math.max(16, Math.round((u.movePoisonDps || 50) * (0.55 + Math.min(1.2, stepDist * 0.14))));
              u.hp = Math.max(0, u.hp - mdmg);
              addFloatText(u.x, u.y - u.radius - 6, `Hóa Cốt -${mdmg}`, '#C084FC', 0.88);
              addParticles(u.x, u.y + 8, '#4ADE80', 4, 38);
              addParticles(u.x, u.y + 6, '#9333EA', 2, 26);
              vfxSheetPool.spawnHitImpactBurst('status_element', u.x, u.y - 6, 48, 0, 'moc');
            }
          }

          if (u.kind === 'gate' || u.kind === 'pillar' || u.kind === 'banner' || u.stunTimer > 0) continue;

          // Boss/Rival telegraph resolution
          if (u.telegraphTimer > 0) {
            u.telegraphTimer -= dt;
            if (u.telegraphTimer <= 0) {
              u.attackMax = 0.4;
              u.attackTimer = 0.4;
              registerUnitInAtlasHub(u);
              atlasHub.trigger(u.id, 'attack', { durationSec: 0.4, force: true });
              effectPools.spawnRing({
                x: u.telegraphX,
                y: u.telegraphY,
                radius: 20,
                maxRadius: u.telegraphRadius,
                color: '#EF4444',
                accent: '#F5D061',
                life: 0.45,
                maxLife: 0.45,
                kind: u.kind === 'boss' ? 'dragon' : 'ring',
                element: u.element,
              });
              addParticles(u.telegraphX, u.telegraphY, '#EF4444', 22, 180);
              if (Math.hypot(pr.x - u.telegraphX, pr.y - u.telegraphY) <= u.telegraphRadius + 18) {
                const telegraphCrit = Math.random() < (u.enraged ? 0.34 : 0.24);
                damagePlayer(
                  u.atk * 1.65,
                  u.element,
                  true,
                  u.name,
                  u.kind === 'wanderer' || u.kind === 'rival',
                  telegraphCrit
                );
              }
            }
            continue;
          }

          // Wild Monster Patrol / Look-Around / Alert Behavior (#7)
          if (curMode === 'WILD' && (u.kind === 'mob' || u.kind === 'elite') && !u.spottedPlayer) {
            const distToPlayer = Math.hypot(pr.x - u.x, pr.y - u.y);
            if (distToPlayer <= 255 && pr.stealthTimer <= 0) {
              u.spottedPlayer = true;
              u.alertTimer = 0.85;
              u.facing = Math.atan2(pr.y - u.y, pr.x - u.x);
            } else {
              if ((u.patrolWait || 0) > 0) {
                u.patrolWait = Math.max(0, (u.patrolWait || 0) - dt);
                // Look around subtly while pausing on patrol
                if (Math.random() < dt * 0.8) {
                  u.facing += (Math.random() < 0.5 ? -1 : 1) * 0.9;
                }
              } else {
                const px = u.patrolX ?? u.x;
                const py = u.patrolY ?? u.y;
                const pd = Math.hypot(px - u.x, py - u.y);
                if (pd < 16) {
                  u.patrolWait = 1.0 + Math.random() * 1.4;
                  const nextPatrol = clampArena(
                    u.x + (-110 + Math.random() * 220),
                    u.y + (-80 + Math.random() * 160)
                  );
                  u.patrolX = nextPatrol.x;
                  u.patrolY = nextPatrol.y;
                } else {
                  const pa = Math.atan2(py - u.y, px - u.x);
                  u.facing = pa;
                  const next = clampArena(
                    u.x + Math.cos(pa) * u.speed * 0.46 * dt,
                    u.y + Math.sin(pa) * u.speed * 0.46 * dt
                  );
                  u.x = next.x;
                  u.y = next.y;
                  u.isMoving = true;
                }
              }
              continue;
            }
          }

          // Wandering other players outside safe zones
          if (u.kind === 'wanderer' && !u.aggro) {
            const distToPlayer = Math.hypot(pr.x - u.x, pr.y - u.y);
            const curMap = MAPS.find((m) => m.id === p.currentMapId) || MAPS[0];
            if (
              curMode === 'WILD' &&
              !curMap.isSafeZone &&
              ((p.pkMode === 'slaughter' && distToPlayer <= 165) ||
                (p.pkPoints >= 4 && distToPlayer <= 145))
            ) {
              u.aggro = true;
              u.team = 'enemy';
              u.alertTimer = 0.85;
              addFloatText(
                u.x,
                u.y - u.radius - 20,
                p.pkPoints >= 4 ? 'Huyết Ma Hiện Thân!' : 'Tự Vệ Phản Công!',
                '#F87171',
                1.05
              );
            } else {
              const px = u.patrolX ?? worldW * 0.55;
              const py = u.patrolY ?? worldH * 0.52;
              const pd = Math.hypot(px - u.x, py - u.y);
              if (pd < 18) {
                u.patrolX = 140 + Math.random() * (worldW - 280);
                u.patrolY = 130 + Math.random() * (worldH - 260);
              } else {
                const pa = Math.atan2(py - u.y, px - u.x);
                u.facing = pa;
                const next = clampArena(u.x + Math.cos(pa) * u.speed * 0.52 * dt, u.y + Math.sin(pa) * u.speed * 0.52 * dt);
                u.x = next.x;
                u.y = next.y;
                u.isMoving = true;
              }
              continue;
            }
          }

          // Determine target for this unit
          let targetX = pr.x;
          let targetY = pr.y;
          let targetUnit: Unit | null = null;

          if (u.team === 'ally') {
            const enemies = units.filter((e) => e.team === 'enemy' && e.hp > 0);
            const gateAlive = enemies.some((e) => e.kind === 'gate');
            const pool = gateAlive ? enemies.filter((e) => e.kind !== 'pillar') : enemies;
            if (pool.length > 0) {
              targetUnit = pool.reduce((best, cur) =>
                Math.hypot(cur.x - u.x, cur.y - u.y) < Math.hypot(best.x - u.x, best.y - u.y) ? cur : best
              );
              targetX = targetUnit.x;
              targetY = targetUnit.y;
            }
          } else {
            // Enemy targets nearest ally (ignore stealthed player when allies exist, or pause pursuit)
            const allies = units.filter((a) => a.team === 'ally' && a.hp > 0);
            let minD = pr.stealthTimer > 0 ? Infinity : Math.hypot(pr.x - u.x, pr.y - u.y);
            for (const a of allies) {
              const d = Math.hypot(a.x - u.x, a.y - u.y);
              if (d < minD) {
                minD = d;
                targetUnit = a;
                targetX = a.x;
                targetY = a.y;
              }
            }
            if (!targetUnit && pr.stealthTimer > 0) {
              // Lost sight of stealthed hero — mill around briefly
              continue;
            }
          }

          const dist = Math.hypot(targetX - u.x, targetY - u.y);
          const angle = Math.atan2(targetY - u.y, targetX - u.x);
          u.facing = angle;
          const effSpeed = u.speed * (u.slowTimer > 0 ? 0.5 : 1) * (u.enraged ? 1.18 : 1);

          if (dist > u.attackRange + (targetUnit ? targetUnit.radius : 18)) {
            const next = clampArena(u.x + Math.cos(angle) * effSpeed * dt, u.y + Math.sin(angle) * effSpeed * dt);
            u.x = next.x;
            u.y = next.y;
            u.isMoving = true;
          } else if (u.attackCd <= 0) {
            u.attackMax = 0.36;
            u.attackTimer = 0.36;
            registerUnitInAtlasHub(u);
            if (u.team === 'ally' && targetUnit) {
              u.attackCd = 1.05;
              atlasHub.trigger(u.id, 'attack', { durationSec: 0.36, force: true });
              damageUnit(targetUnit, u.atk, Math.random() < 0.16, u.element, false);
              effectPools.spawnRing({
                x: targetUnit.x,
                y: targetUnit.y,
                radius: 8,
                maxRadius: 34,
                color: '#60A5FA',
                accent: '#FDE68A',
                life: 0.22,
                maxLife: 0.22,
                kind: 'slash',
                angle,
                element: u.element,
              });
            } else {
              // Boss / Rival / Hostile Wanderer telegraph special attack
              if ((u.kind === 'boss' || u.kind === 'rival' || u.kind === 'wanderer') && Math.random() < (u.enraged ? 0.42 : 0.3)) {
                u.attackCd = u.enraged ? 2.0 : 2.4;
                u.telegraphMax = 1.05;
                u.telegraphTimer = 1.05;
                u.telegraphX = pr.x;
                u.telegraphY = pr.y;
                u.telegraphRadius = u.kind === 'boss' ? 96 : 72;
                atlasHub.trigger(u.id, 'cast', { durationSec: 1.05, force: true });
                addFloatText(u.x, u.y - u.radius - 12, 'Tụ Khí Tuyệt Kỹ!', '#F87171', 1.0);
              } else if ((u.kind === 'rival' || u.kind === 'wanderer') && u.attackRange > 130) {
                u.attackCd = 1.15;
                atlasHub.trigger(u.id, 'attack', { durationSec: 0.36, force: true });
                effectPools.spawnProjectile({
                  x: u.x,
                  y: u.y,
                  vx: Math.cos(angle) * 390,
                  vy: Math.sin(angle) * 390,
                  radius: 9,
                  color: u.color,
                  accent: '#FDE68A',
                  team: 'enemy',
                  damage: u.atk,
                  crit: Math.random() < 0.2,
                  element: u.element,
                  life: 0.9,
                  pierce: false,
                });
              } else {
                u.attackCd = u.kind === 'boss' ? (u.enraged ? 1.05 : 1.35) : 1.2;
                atlasHub.trigger(u.id, 'attack', { durationSec: 0.36, force: true });
                const enemyCritChance =
                  u.kind === 'boss'
                    ? u.enraged
                      ? 0.3
                      : 0.22
                    : u.kind === 'rival' || u.kind === 'wanderer'
                    ? 0.2
                    : u.kind === 'elite'
                    ? 0.16
                    : 0.12;
                const enemyCrit = Math.random() < enemyCritChance;
                if (targetUnit) {
                  damageUnit(targetUnit, u.atk, enemyCrit, u.element, false);
                } else {
                  damagePlayer(
                    u.atk * (u.enraged ? 1.18 : 1),
                    u.element,
                    u.kind === 'boss' || u.kind === 'wanderer',
                    u.name,
                    u.kind === 'wanderer' || u.kind === 'rival',
                    enemyCrit
                  );
                }
              }
            }
          }
        }

        // Advance synchronized 8-direction animations for all living units via centralized hub
        for (const u of units) {
          if (u.hp <= 0) continue;
          registerUnitInAtlasHub(u);
          u.anim = atlasHub.stepEntity(u.id, {
            dt,
            desiredFacing: u.facing,
            isMoving: Boolean(u.isMoving),
            isRunning: Boolean(u.isMoving && (u.kind === 'rival' || u.kind === 'wanderer' || u.enraged)),
            isDead: false,
            turnSpeed: u.kind === 'boss' ? 12 : 16,
          });
        }

        // Update Pooled Projectiles (O(1) swap-and-pop release, zero Set allocations)
        const projPool = effectPools.projectiles;
        for (let i = projPool.activeCount - 1; i >= 0; i--) {
          const proj = projPool.items[i];
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          proj.life -= dt;
          if (proj.life <= 0) {
            projPool.releaseAt(i);
            continue;
          }
          // Emit Ngũ Hành blade-qi / ember / frost / venom / lightning motion wake particles
          if (proj.team === 'ally' && Math.random() < 0.58) {
            emitProjectileTrailParticle(effectPools, proj);
          }
          if (proj.team === 'ally') {
            let hit = false;
            for (const u of units) {
              if (!isUnitHostileToPlayer(u) || proj.hitIds.has(u.id)) continue;
              if (Math.hypot(u.x - proj.x, u.y - proj.y) <= u.radius + proj.radius) {
                proj.hitIds.add(u.id);
                const hitAng = Math.atan2(proj.vy, proj.vx);
                damageUnit(u, proj.damage, proj.crit, proj.element, true);
                vfxSheetPool.spawnSkillBurst(
                  proj.element,
                  proj.vfxKind || 'ring',
                  u.x,
                  u.y - 6,
                  Math.max(58, proj.radius * 4.4),
                  hitAng,
                  0.42,
                  p.sect
                );
                vfxSheetPool.spawnCollisionBurst('shockwave', u.x, u.y - 2, 78, hitAng, proj.element);
                emitProjectileImpactParticles(effectPools, proj, u.x, u.y, pr.x, pr.y);
                if (proj.slow) u.slowTimer = Math.max(u.slowTimer, 2.4);
                if (proj.stunSec > 0) u.stunTimer = Math.max(u.stunTimer, proj.stunSec);
                if (proj.poisonDps > 0) {
                  u.poisonTimer = Math.max(u.poisonTimer, 3.8);
                  u.poisonDps = Math.max(u.poisonDps, proj.poisonDps);
                }
                if (proj.movePoisonSec > 0) {
                  u.movePoisonTimer = Math.max(u.movePoisonTimer || 0, proj.movePoisonSec);
                  u.movePoisonDps = Math.max(u.movePoisonDps || 0, Math.round(pStats.atk * 0.55));
                }
                if (
                  u.kind !== 'gate' &&
                  u.kind !== 'pillar' &&
                  u.kind !== 'banner'
                ) {
                  if (proj.pushStrength > 0) {
                    const pa = Math.atan2(proj.vy, proj.vx);
                    const push = u.kind === 'boss' ? proj.pushStrength * 0.3 : proj.pushStrength;
                    u.knockbackX = Math.cos(pa) * push;
                    u.knockbackY = Math.sin(pa) * push;
                    vfxSheetPool.spawnCollisionBurst('ground_push', u.x, u.y + 4, 74, pa, proj.element);
                  } else if (proj.pullStrength > 0) {
                    const pa = Math.atan2(pr.y - u.y, pr.x - u.x);
                    const pull = u.kind === 'boss' ? proj.pullStrength * 0.3 : proj.pullStrength;
                    u.knockbackX = Math.cos(pa) * pull;
                    u.knockbackY = Math.sin(pa) * pull;
                    vfxSheetPool.spawnCollisionBurst('ground_push', u.x, u.y + 4, 74, pa, proj.element);
                  }
                }
                if (proj.drainRatio > 0) {
                  const healAmt = Math.max(20, Math.round(proj.damage * proj.drainRatio));
                  pr.hp = Math.min(pStats.maxHp, pr.hp + healAmt);
                  pr.mp = Math.min(pStats.maxMp, pr.mp + Math.round(healAmt * 0.4));
                }
                if (!proj.pierce) {
                  hit = true;
                  break;
                }
              }
            }
            if (hit) projPool.releaseAt(i);
          } else {
            if (Math.hypot(pr.x - proj.x, pr.y - proj.y) <= 22 + proj.radius) {
              vfxSheetPool.spawnCollisionBurst('shockwave', pr.x, pr.y - 2, 70, Math.atan2(proj.vy, proj.vx), proj.element);
              damagePlayer(proj.damage, proj.element, false, 'Cao Thủ Giang Hồ', true, proj.crit);
              projPool.releaseAt(i);
            }
          }
        }

        // Process dead units
        for (let i = units.length - 1; i >= 0; i--) {
          if (units[i].hp <= 0) {
            const dead = units[i];
            units.splice(i, 1);
            handleUnitDeath(dead);
          }
        }

        // Mode-specific wave & respawn logic
        respawnTicker += dt;
        if (curMode === 'WILD') {
          const curMap = MAPS.find((m) => m.id === p.currentMapId) || MAPS[0];
          if (respawnTicker >= 1.2 && units.filter((u) => u.kind === 'mob' || u.kind === 'elite').length < 15) {
            respawnTicker = 0;
            spawnWildMob(Math.random() < 0.45);
          }
          if (!curMap.isSafeZone) {
            wandererRespawnTicker += dt;
            if (wandererRespawnTicker >= 6.5 && units.filter((u) => u.kind === 'wanderer').length < 4) {
              wandererRespawnTicker = 0;
              spawnWildWanderer();
            }
          }
          objectiveProgress = Math.min(1, p.exp / Math.max(1, p.maxExp));
        } else if (curMode === 'DUNGEON' && !battleFinished) {
          const remaining = units.filter((u) => u.team === 'enemy').length;
          if (remaining === 0) {
            if (dungeonWave < 3) {
              dungeonWave += 1;
              setupDungeonWave(dungeonWave);
            } else {
              battleFinished = true;
              const dId = propsRef.current.battle.dungeonId || 'tang_kiem';
              const floor = propsRef.current.battle.dungeonFloor || 1;
              const dungeon = DUNGEONS.find((d) => d.id === dId) || DUNGEONS[0];
              const quality = floor >= 7 ? 'gold' : floor >= 4 ? 'purple' : 'blue';
              const drop = generateEquipment(Math.max(p.level, dungeon.unlockLevel + floor * 2), quality);
              soundEngine.playLevelUp();
              propsRef.current.onBattleComplete({
                victory: true,
                mode: 'DUNGEON',
                title: `Vượt Ải ${dungeon.name} Tầng ${floor}!`,
                subtitle: 'Đánh bại thủ lĩnh ải, thu hoạch Đá Cường Hóa và Danh Vọng.',
                rewards: {
                  exp: Math.round(750 * Math.pow(1.22, floor - 1)),
                  silver: Math.round(1600 * Math.pow(1.2, floor - 1)),
                  enhanceStones: 3 + floor,
                  reputation: 120 + floor * 45,
                  merit: 90 + floor * 30,
                  item: drop,
                },
              });
            }
          }
          objectiveProgress = (dungeonWave - 1) / 3 + (remaining === 0 ? 0.33 : 0.15);
        } else if (curMode === 'BOSS') {
          const b = units.find((u) => u.kind === 'boss');
          objectiveProgress = b ? b.hp / b.maxHp : 0;
        } else if (curMode === 'ARENA') {
          const r = units.find((u) => u.kind === 'rival');
          objectiveProgress = r ? r.hp / r.maxHp : 0;
        } else if (curMode === 'SIEGE') {
          const city =
            propsRef.current.cities.find((c) => c.id === propsRef.current.battle.siegeCityId) ||
            propsRef.current.cities[0];
          const gate = units.find((u) => u.kind === 'gate');
          const pillar = units.find((u) => u.kind === 'pillar');
          if (gate) {
            objectiveProgress = gate.hp / gate.maxHp;
          } else if (pillar) {
            objectiveProgress = pillar.hp / pillar.maxHp;
          }
          if (respawnTicker >= 5.5) {
            respawnTicker = 0;
            if (units.filter((u) => u.kind === 'ally_npc').length < 5) spawnSiegeNpc('ally', city);
            if (units.filter((u) => u.kind === 'enemy_npc').length < 5) spawnSiegeNpc('enemy', city);
          }
        } else if (curMode === 'GUILD_WAR') {
          const territory =
            propsRef.current.territories.find(
              (t) => t.id === propsRef.current.battle.guildWarTerritoryId
            ) || propsRef.current.territories[0];
          const banner = units.find((u) => u.kind === 'banner');
          objectiveProgress = banner ? banner.hp / banner.maxHp : 0;
          if (respawnTicker >= 6.0) {
            respawnTicker = 0;
            if (units.filter((u) => u.kind === 'ally_npc').length < 4) {
              spawnGuildWarNpc('ally', territory);
            }
            if (units.filter((u) => u.kind === 'enemy_npc').length < 4) {
              spawnGuildWarNpc('enemy', territory);
            }
          }
        }

        // Countdown timer for timed modes
        if (battleTimer !== null && !battleFinished) {
          battleTimer = Math.max(0, battleTimer - dt);
          if (battleTimer <= 0) {
            battleFinished = true;
            soundEngine.playFail();
            propsRef.current.onBattleComplete({
              victory: false,
              mode: curMode,
              title: 'Hết Thời Gian Khiêu Chiến!',
              subtitle: 'Hãy cường hóa trang bị, nâng cấp võ học hoặc thăng Phi Phong rồi tái chiến.',
              rewards: { silver: 300 },
            });
          }
        }

        // Check player defeat
        if (pr.hp <= 0 && !battleFinished) {
          if (combo.count > 0) {
            resetCombo(true);
          }
          if (curMode === 'WILD') {
            // Reset wanderer hostility upon respawn and notify Sát Khí penalty handler
            for (const u of units) {
              if (u.kind === 'wanderer') {
                u.aggro = false;
                u.team = 'neutral';
              }
            }
            pr.targetUnitId = null;
            pr.hp = pStats.maxHp;
            pr.mp = pStats.maxMp;
            pr.x = Math.round(worldW * 0.5);
            pr.y = Math.round(worldH * 0.52);
            propsRef.current.onWildPlayerDefeated({
              killerName: lastAttackerName,
              byPlayer: lastAttackerIsPlayer,
            });
            if (p.pkPoints > 0) {
              soundEngine.playFail();
              shakeIntensity = 12;
              addFloatText(pr.x, pr.y - 42, 'SÁT KHÍ PHẢN PHỆ · GIẢM CHỈ SỐ!', '#EF4444', 1.3);
            } else {
              addFloatText(pr.x, pr.y - 36, 'Hồi Sinh Tại Bản Đồ!', '#F5D061', 1.15);
            }
          } else {
            battleFinished = true;
            soundEngine.playFail();
            propsRef.current.onBattleComplete({
              victory: false,
              mode: curMode,
              title: 'Trọng Thương Bại Trận!',
              subtitle:
                p.pkPoints > 0
                  ? 'Bị tiêu diệt khi đang mang Điểm Sát Khí! Nhân vật chịu trừng phạt Sát Khí Phản Phệ làm giảm chỉ số tạm thời.'
                  : 'Hiệp khách tạm lui về dưỡng thương. Đừng quên nâng trang bị và mang Kim Sang Dược.',
              rewards: { exp: 180, silver: 400 },
            });
          }
        }

        // Update dying monster/boss collapse animations via centralized BattleSpriteAtlasHub
        for (let i = dyingUnits.length - 1; i >= 0; i--) {
          const du = dyingUnits[i];
          du.progress += dt / du.maxDuration;
          du.unit.anim = atlasHub.stepEntity(du.dyingId, {
            dt,
            desiredFacing: du.unit.facing,
            isMoving: false,
            isDead: true,
          });
          if (du.progress >= 1) {
            atlasHub.unregister(du.dyingId);
            dyingUnits.splice(i, 1);
          }
        }

        // Update Pooled VFX (Rings, Particles, Floating Combat Numbers — O(1) swap-and-pop)
        const ringPool = effectPools.rings;
        for (let i = ringPool.activeCount - 1; i >= 0; i--) {
          const r = ringPool.items[i];
          r.life -= dt;
          if (r.life <= 0) ringPool.releaseAt(i);
        }
        updatePooledParticles(effectPools, dt);
        vfxSheetPool.update(dt);
        const textPool = effectPools.floatTexts;
        for (let i = textPool.activeCount - 1; i >= 0; i--) {
          const ft = textPool.items[i];
          ft.x += ft.vx * dt;
          ft.y += ft.vy * dt;
          if (ft.gravity !== 0) {
            ft.vy += ft.gravity * dt;
            ft.vx *= 0.94;
          } else {
            ft.vy *= 0.96;
          }
          ft.life -= dt;
          if (ft.life <= 0) textPool.releaseAt(i);
        }
        for (let i = lootOrbs.length - 1; i >= 0; i--) {
          const lb = lootOrbs[i];
          lb.age = (lb.age || 0) + dt;
          // Showcase rarity equipment drop on ground briefly before magnetizing into player (#12)
          const holdTime = lb.slot ? 0.72 : 0.25;
          if (lb.age > holdTime) {
            lb.x += (pr.x - lb.x) * Math.min(1, dt * 6.5);
            lb.y += (pr.y - lb.y) * Math.min(1, dt * 6.5);
          }
          lb.life -= dt;
          if (lb.life <= 0 || (lb.age > holdTime && Math.hypot(pr.x - lb.x, pr.y - lb.y) < 18)) {
            lootOrbs.splice(i, 1);
          }
        }
        // Update dropped Treasure Chests on the battlefield
        for (let i = fieldChests.length - 1; i >= 0; i--) {
          const fc = fieldChests[i];
          fc.age += dt;
          fc.bounce = Math.max(0, fc.bounce - dt * 2.4);
          const distToPlayer = Math.hypot(pr.x - fc.x, pr.y - fc.y);
          const shouldMagnet = propsRef.current.autoBattle && fc.age > 3.2;
          if (shouldMagnet) {
            fc.x += (pr.x - fc.x) * Math.min(1, dt * 4.5);
            fc.y += (pr.y - fc.y) * Math.min(1, dt * 4.5);
          }
          if (distToPlayer < 42 || fc.age > 9) {
            const meta = CHEST_TIER_META[fc.tier];
            fieldChests.splice(i, 1);
            addParticles(fc.x, fc.y, meta.color, 16, 150);
            addFloatText(fc.x, fc.y - 22, `+1 ${meta.shortName} Rương`, meta.accentColor, 1.1);
            soundEngine.playChestDrop();
            propsRef.current.onCollectChest(fc.tier, fc.sourceName, false);
          }
        }
        for (const m of ambientMotes) {
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.y > height) {
            m.y = -6;
            m.x = Math.random() * width;
          }
          if (m.x < 0) m.x = width;
          if (m.x > width) m.x = 0;
        }

        // Update Dynamic Weather Simulation
        const activeWeather = propsRef.current.weather;
        if (activeWeather !== lastWeather) {
          lastWeather = activeWeather;
          weatherFade = 0.08;
        }
        weatherFade = Math.min(1, weatherFade + dt * 0.85);
        weatherClock += dt;
        lightningFlash = Math.max(0, lightningFlash - dt * 2.6);

        if (activeWeather === 'rain') {
          for (const d of rainDrops) {
            d.x -= d.speed * 0.24 * dt;
            d.y += d.speed * dt;
            if (d.y > height + 10) {
              d.y = -15 - Math.random() * 40;
              d.x = Math.random() * (width + 180);
              if (effectPools.rainRipples.activeCount < 24 && Math.random() < 0.35) {
                effectPools.spawnRainRipple(
                  30 + Math.random() * (width - 60),
                  90 + Math.random() * (height - 130),
                  1.5,
                  9 + Math.random() * 8,
                  0.42
                );
              }
            }
          }
          const ripplePool = effectPools.rainRipples;
          for (let i = ripplePool.activeCount - 1; i >= 0; i--) {
            const rp = ripplePool.items[i];
            rp.r += dt * 26;
            rp.alpha -= dt * 0.95;
            if (rp.alpha <= 0 || rp.r >= rp.maxR) ripplePool.releaseAt(i);
          }
          if (Math.random() < dt * 0.09) {
            lightningFlash = 0.24;
          }
        } else if (activeWeather === 'snow') {
          for (const f of snowFlakes) {
            f.y += f.vy * dt;
            f.x += Math.sin(weatherClock * 1.15 + f.driftPhase) * f.driftAmp * dt - 14 * dt;
            if (f.y > height + 8) {
              f.y = -8;
              f.x = Math.random() * (width + 40);
            }
            if (f.x < -12) f.x = width + 10;
            if (f.x > width + 12) f.x = -10;
          }
        } else if (activeWeather === 'mist') {
          for (const mb of mistBanks) {
            mb.x += mb.vx * dt;
            if (mb.x - mb.rx > width + 40) {
              mb.x = -mb.rx - 40;
              mb.y = height * (0.12 + Math.random() * 0.78);
            }
          }
        } else if (activeWeather === 'ash_wind') {
          for (const ws of windStreaks) {
            ws.x -= ws.speed * dt;
            ws.y += ws.speed * 0.16 * dt;
            if (ws.x + ws.len < -10 || ws.y > height + 10) {
              ws.x = width + 20 + Math.random() * 140;
              ws.y = Math.random() * height;
            }
          }
        }

        // Smooth camera tracking clamped to expanded world bounds
        const targetCamX = Math.max(0, Math.min(Math.max(0, worldW - width), pr.x - width * 0.5));
        const targetCamY = Math.max(0, Math.min(Math.max(0, worldH - height), pr.y - height * 0.5));
        const camLerp = Math.min(1, dt * 8.5);
        camX += (targetCamX - camX) * camLerp;
        camY += (targetCamY - camY) * camLerp;

        // Throttled HUD sync (~12Hz)
        hudSyncTimer += dt;
        if (hudSyncTimer >= 0.085) {
          hudSyncTimer = 0;
          const safeW = Math.max(1, worldW);
          const safeH = Math.max(1, worldH);
          const pNormX = Math.max(0.03, Math.min(0.97, pr.x / safeW));
          const pNormY = Math.max(0.03, Math.min(0.97, pr.y / safeH));
          // Classic Kiếm Thế 2009 map coordinate range (e.g. 160..240)
          const coordX = Math.round(160 + pNormX * 80);
          const coordY = Math.round(170 + pNormY * 70);

          const radarDots: RadarDot[] = [];
          let activeTarget: Unit | null = null;
          let bestTargetDist = Infinity;

          for (const u of units) {
            if (u.hp <= 0) continue;
            const nx = Math.max(0.03, Math.min(0.97, u.x / safeW));
            const ny = Math.max(0.03, Math.min(0.97, u.y / safeH));
            let dotKind: RadarDot['kind'] = 'mob';
            if (u.team === 'ally') dotKind = 'ally';
            else if (u.kind === 'boss' || u.kind === 'pillar' || u.kind === 'gate' || u.kind === 'banner') dotKind = 'boss';
            else if (u.kind === 'rival' || u.kind === 'wanderer') dotKind = 'rival';
            radarDots.push({ x: nx, y: ny, kind: dotKind });

            if (u.team === 'enemy' || (u.team === 'neutral' && u.aggro)) {
              if (pr.targetUnitId && u.id === pr.targetUnitId) {
                activeTarget = u;
                bestTargetDist = -1;
              } else if (bestTargetDist >= 0) {
                // Prioritize boss / rival, otherwise nearest enemy
                const isPriority = u.kind === 'boss' || u.kind === 'rival' || u.kind === 'pillar' || u.kind === 'gate';
                const d = Math.hypot(u.x - pr.x, u.y - pr.y) - (isPriority ? 1000 : 0);
                if (d < bestTargetDist) {
                  bestTargetDist = d;
                  activeTarget = u;
                }
              }
            }
          }

          for (const fc of fieldChests) {
            radarDots.push({
              x: Math.max(0.03, Math.min(0.97, fc.x / safeW)),
              y: Math.max(0.03, Math.min(0.97, fc.y / safeH)),
              kind: 'chest',
            });
          }

          propsRef.current.onHudUpdate({
            hp: Math.round(pr.hp),
            maxHp: pStats.maxHp,
            mp: Math.round(pr.mp),
            maxMp: pStats.maxMp,
            shield: Math.round(pr.shield),
            cooldowns: [...pr.cooldowns],
            dashCooldown: pr.dashCd,
            objectiveLabel,
            objectiveProgress,
            timerSec: battleTimer !== null ? Math.ceil(battleTimer) : null,
            playerCoord: { x: coordX, y: coordY },
            playerNorm: { x: pNormX, y: pNormY },
            camRect: {
              x: camX / safeW,
              y: camY / safeH,
              w: Math.min(1, width / safeW),
              h: Math.min(1, height / safeH),
            },
            radarDots,
            target: activeTarget
              ? {
                  name: activeTarget.name,
                  title: activeTarget.title,
                  hp: Math.max(0, Math.round(activeTarget.hp)),
                  maxHp: Math.max(1, Math.round(activeTarget.maxHp)),
                  element: activeTarget.element,
                  kind: activeTarget.kind,
                }
              : null,
          });
        }

        renderScene();
      };

      const renderScene = () => {
        const p = propsRef.current.player;
        const pStats = propsRef.current.stats;
        const sect = SECTS[p.sect];
        const mantle = MANTLES.find((m) => m.id === p.mantleId) || MANTLES[0];
        const title = TITLES.find((t) => t.id === p.activeTitleId);
        const curMode = propsRef.current.battle.mode;
        const map = MAPS.find((m) => m.id === p.currentMapId) || MAPS[0];

        ctx.save();
        if (shakeIntensity > 0.2) {
          ctx.translate(
            (Math.random() - 0.5) * shakeIntensity * 2,
            (Math.random() - 0.5) * shakeIntensity * 2
          );
        }

        // 1. Expanded World Space Camera Layer (Ground Terrain, Plazas, Roads, Ponds)
        ctx.fillStyle = scenery.baseColor;
        ctx.fillRect(0, 0, width, height);

        const activeWeather = propsRef.current.weather;
        const rCamX = Math.round(camX);
        const rCamY = Math.round(camY);

        ctx.save();
        ctx.translate(-rCamX, -rCamY);

        drawMapGroundLayer(ctx, scenery, camX, camY, width, height, atlasHub.globalPhase);

        // Subtle warm sunlit sheen across expanded world (keeps terrain bright and vivid)
        const bg = curMode === 'SIEGE' ? siegeImg : wildImg;
        if (bg.complete && bg.naturalWidth > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'soft-light';
          ctx.globalAlpha = curMode === 'SIEGE' ? 0.14 : 0.1;
          ctx.drawImage(bg, 0, 0, worldW, worldH);
          ctx.restore();
        }

        // 2. Boss/Rival Danger Telegraphs (drawn on floor)
        for (const u of units) {
          if (u.telegraphTimer > 0 && u.telegraphMax > 0) {
            const pct = 1 - u.telegraphTimer / u.telegraphMax;
            ctx.save();
            ctx.beginPath();
            ctx.arc(u.telegraphX, u.telegraphY, u.telegraphRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(220, 38, 38, 0.16)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(u.telegraphX, u.telegraphY, u.telegraphRadius * pct, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(220, 38, 38, 0.26)';
            ctx.fill();
            ctx.restore();
          }
        }

        // 3. Five-Element Skill VFX (from Zero-GC SkillRing Object Pool)
        const ringItems = effectPools.rings.items;
        for (let i = 0; i < effectPools.rings.activeCount; i++) {
          const r = ringItems[i];
          const progress = Math.max(0, Math.min(1, 1 - r.life / r.maxLife));
          const curRad = r.radius + (r.maxRadius - r.radius) * Math.min(1, progress * 1.15);
          drawFiveElementSkillVfx(
            ctx,
            r.x,
            r.y,
            curRad,
            progress,
            r.element || sect.element,
            r.color,
            r.accent,
            r.kind,
            r.angle,
            r.sourceX,
            r.sourceY
          );
        }
        vfxSheetPool.renderLayer(ctx, 'ground');

        // 4. Rarity Ground Loot Drops with Pixel Icons & Light Beams (#10, #12, #14)
        for (const lb of lootOrbs) {
          ctx.save();
          const age = lb.age || 0;
          const bob = Math.sin(age * 7) * 2.5;
          const q = lb.quality || 'white';
          const isHigh = q === 'purple' || q === 'gold' || q === 'mythic';

          // Dynamic ground light pool & vertical rarity beam
          drawDynamicLightPool(ctx, lb.x, lb.y + 4, isHigh ? 34 : 18, lb.color, isHigh ? 0.34 : 0.2);
          if (lb.slot) {
            const beamH = q === 'mythic' ? 88 : q === 'gold' ? 72 : q === 'purple' ? 54 : 36;
            const beamW = q === 'mythic' ? 18 : q === 'gold' ? 14 : 10;
            const bGrad = ctx.createLinearGradient(lb.x, lb.y + 4, lb.x, lb.y - beamH);
            bGrad.addColorStop(0, `${lb.color}BB`);
            bGrad.addColorStop(0.6, `${lb.color}44`);
            bGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = bGrad;
            ctx.fillRect(lb.x - beamW / 2, lb.y - beamH, beamW, beamH);

            // Crisp 16x16 Pixel Item Icon on ground
            const wKind = lb.slot === 'weapon' ? inferWeaponKind(lb.itemName, lb.sectId) : 'sword';
            const iconCanvas = spriteAtlas.getItemIconCanvas(lb.slot, q, wKind);
            ctx.fillStyle = 'rgba(14, 10, 8, 0.88)';
            ctx.strokeStyle = lb.color;
            ctx.lineWidth = isHigh ? 2 : 1.4;
            ctx.fillRect(Math.round(lb.x - 11), Math.round(lb.y - 11 + bob), 22, 22);
            ctx.strokeRect(Math.round(lb.x - 11), Math.round(lb.y - 11 + bob), 22, 22);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(iconCanvas, Math.round(lb.x - 9), Math.round(lb.y - 9 + bob), 18, 18);
          } else {
            ctx.fillStyle = lb.color;
            ctx.shadowColor = lb.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(lb.x, lb.y + bob, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          ctx.font = isHigh ? '700 9.5px "Be Vietnam Pro", sans-serif' : '600 9px "Be Vietnam Pro", sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = 'rgba(8, 6, 5, 0.92)';
          ctx.strokeText(lb.label, lb.x, lb.y - 14 + bob);
          ctx.fillStyle = lb.color;
          ctx.fillText(lb.label, lb.x, lb.y - 14 + bob);
          ctx.restore();
        }

        // 4b. Dropped Pulsing Treasure Chests on WILD battlefield
        for (const fc of fieldChests) {
          const meta = CHEST_TIER_META[fc.tier];
          const pulse = 0.5 + 0.5 * Math.sin(fc.age * 9.5);
          const jumpY = Math.sin(fc.bounce * Math.PI) * 26;
          const cy = fc.y - jumpY;

          ctx.save();
          // Pulsing vertical sky beam
          const beamH = fc.tier === 'imperial_gold' ? 112 : fc.tier === 'purple_gold' ? 88 : 68;
          const beamGrad = ctx.createLinearGradient(fc.x, cy, fc.x, cy - beamH);
          beamGrad.addColorStop(0, `${meta.color}${pulse > 0.5 ? 'AA' : '66'}`);
          beamGrad.addColorStop(0.5, `${meta.accentColor}33`);
          beamGrad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = beamGrad;
          ctx.fillRect(fc.x - 13, cy - beamH, 26, beamH);

          // Ground pulsing aura ring
          ctx.strokeStyle = meta.color;
          ctx.globalAlpha = 0.4 + pulse * 0.5;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(fc.x, fc.y + 8, 22 + pulse * 4, 9 + pulse * 2, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Chest shadow
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.ellipse(fc.x, fc.y + 8, 16, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Ornate chest body
          ctx.globalAlpha = 1;
          ctx.shadowColor = meta.color;
          ctx.shadowBlur = 10 + pulse * 12;
          ctx.fillStyle =
            fc.tier === 'imperial_gold'
              ? '#5C1912'
              : fc.tier === 'purple_gold'
              ? '#311442'
              : '#192B3D';
          ctx.strokeStyle = pulse > 0.65 ? '#FFFFFF' : meta.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(fc.x - 15, cy - 11, 30, 20, 4);
          ctx.fill();
          ctx.stroke();

          // Chest lid top highlight
          ctx.fillStyle = meta.color;
          ctx.fillRect(fc.x - 14, cy - 3, 28, 3);
          ctx.fillRect(fc.x - 10, cy - 11, 4, 20);
          ctx.fillRect(fc.x + 6, cy - 11, 4, 20);

          // Blinking gemstone clasp
          ctx.fillStyle = pulse > 0.5 ? '#FFFFFF' : meta.accentColor;
          ctx.beginPath();
          ctx.arc(fc.x, cy - 1, 3.8, 0, Math.PI * 2);
          ctx.fill();

          // Orbiting twinkling sparkles
          for (let s = 0; s < 3; s++) {
            const ang = fc.age * 3.8 + (s * Math.PI * 2) / 3;
            const sx = fc.x + Math.cos(ang) * 20;
            const sy = cy - 4 + Math.sin(ang) * 10;
            ctx.fillStyle = s % 2 === 0 ? '#FEF9C3' : meta.color;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.8 + pulse * 1.1, 0, Math.PI * 2);
            ctx.fill();
          }

          // Chest Label
          ctx.shadowBlur = 0;
          ctx.font = '700 11px "Be Vietnam Pro", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = pulse > 0.6 ? '#FEF9C3' : meta.color;
          ctx.fillText(`✦ ${meta.shortName} Rương (Nhấn Mở)`, fc.x, cy - 18);
          ctx.restore();
        }

        // 5. Units + Dying Units + Player (Zero-Allocation Y-Depth Queue Sort)
        effectPools.beginDrawOrder();
        for (let i = 0; i < dyingUnits.length; i++) {
          const du = dyingUnits[i];
          effectPools.pushDrawOrder(du.unit.y, false, du.unit, du.progress);
        }
        for (let i = 0; i < units.length; i++) {
          const u = units[i];
          effectPools.pushDrawOrder(u.y, false, u, 0);
        }
        effectPools.pushDrawOrder(pr.y, true, null, 0);
        effectPools.sortDrawOrder();

        const activeMount =
          p.isMounted && p.activeMountId
            ? MOUNTS.find((m) => m.id === p.activeMountId) || null
            : null;
        const activeIllusion =
          activeMount && p.activeMountIllusionId
            ? MOUNT_ILLUSIONS.find((x) => x.id === p.activeMountIllusionId) || null
            : null;
        const illusionStars = activeIllusion ? p.mountIllusions?.[activeIllusion.id] || 1 : 0;
        const playerRealm = getCharacterRealm(p);

        const pkSlaughterActive =
          curMode === 'WILD' && !map.isSafeZone && p.pkMode === 'slaughter';

        const playerAnim = atlasHub.getAnim(PLAYER_ENTITY_ID, pr.facing);

        // Two-pointer Y-depth merge: pre-sorted scenery props + sorted combat entities (zero allocation)
        const viewMinX = camX - 150;
        const viewMaxX = camX + width + 150;
        const viewMinY = camY - 150;
        const viewMaxY = camY + height + 180;
        const sceneryProps = scenery.props;
        let propIdx = 0;
        const propLen = sceneryProps.length;

        const flushPropsUpToY = (limitY: number) => {
          while (propIdx < propLen && sceneryProps[propIdx].y <= limitY) {
            const sp = sceneryProps[propIdx];
            propIdx++;
            if (sp.x >= viewMinX && sp.x <= viewMaxX && sp.y >= viewMinY && sp.y <= viewMaxY) {
              drawSceneryProp(ctx, sp, atlasHub.globalPhase);
            }
          }
        };

        for (let i = 0; i < effectPools.drawOrderCount; i++) {
          const item = effectPools.drawOrder[i];
          flushPropsUpToY(item.y);
          if (item.isPlayer) {
            if (levelUpFxRef.current.active) {
              drawLevelUpGroundSeal(ctx, pr.x, pr.y, levelUpFxRef.current);
            }
            drawPlayerEntity(
              ctx,
              pr.x,
              pr.y,
              sect.color,
              mantle.color,
              mantle.id,
              title?.name,
              title?.color,
              p.name,
              propsRef.current.guild?.name,
              pr.hp,
              pStats.maxHp,
              pr.shield,
              playerAnim,
              atlasHub.globalPhase,
              p.sect,
              activeMount,
              activeIllusion,
              illusionStars,
              p.pkPoints,
              pkSlaughterActive ? 'slaughter' : 'peace',
              pStats.pkPenaltyPct,
              p.equipment,
              playerRealm.tier,
              pr.isMoving,
              {
                stealth: pr.stealthTimer > 0,
                invuln: pr.invulnTimer > 0,
                buffLabel: pr.buffTimer > 0 ? pr.buffLabel : '',
                buffColor: pr.buffColor || sect.color,
                buffAccent: pr.buffAccent || ELEMENT_VFX_PALETTE[sect.element].bright,
                mantleLabel: mantle.id === 0 ? 'Sơ Nhập' : mantle.name,
                guildRole: propsRef.current.guild
                  ? propsRef.current.guild.leader === p.name
                    ? 'Bang chủ'
                    : 'Thành viên'
                  : undefined,
                playerLevel: p.level,
                sectName: sect.name,
              }
            );
            if (levelUpFxRef.current.active) {
              drawLevelUpForeground(ctx, pr.x, pr.y, levelUpFxRef.current);
            }
          } else if (item.unit) {
            if (
              item.unit.x >= viewMinX &&
              item.unit.x <= viewMaxX &&
              item.unit.y >= viewMinY &&
              item.unit.y <= viewMaxY
            ) {
              drawNpcOrEnemy(
                ctx,
                item.unit,
                item.deathProgress === 0 && pr.targetUnitId === item.unit.id,
                atlasHub.globalPhase,
                pkSlaughterActive,
                item.deathProgress
              );
            }
          }
        }
        flushPropsUpToY(Infinity);

        // 6. Directional Five-Element Martial Projectiles (Painted Sprite Sheet + High-Contrast Wake)
        const projItems = effectPools.projectiles.items;
        for (let i = 0; i < effectPools.projectiles.activeCount; i++) {
          const proj = projItems[i];
          const pAng = Math.atan2(proj.vy, proj.vx);
          const r = proj.radius;

          // First attempt painted directional projectile from `projectiles` 4x4 sprite sheet
          const pCell = resolveProjectileCell(proj.element, proj.vfxKind || 'ring');
          const boltDrawSize = Math.max(46, Math.min(96, r * 4.4));
          const spriteAng = pCell.spin ? atlasHub.globalPhase * 12 + i : pAng;
          const drewPaintedBolt = drawVfxSheetFrame(
            ctx,
            'projectiles',
            pCell.row,
            pCell.col,
            proj.x,
            proj.y,
            boltDrawSize,
            spriteAng,
            0.98,
            false,
            1
          );
          if (drewPaintedBolt) {
            // Subtle luminous trail ghost behind painted flying skill bolt
            drawVfxSheetFrame(
              ctx,
              'projectiles',
              pCell.row,
              pCell.col,
              proj.x - Math.cos(pAng) * (boltDrawSize * 0.28),
              proj.y - Math.sin(pAng) * (boltDrawSize * 0.28),
              boltDrawSize * 0.78,
              spriteAng,
              0.38,
              true,
              1
            );
            continue;
          }

          ctx.save();
          ctx.translate(proj.x, proj.y);
          ctx.rotate(pAng);

          // Crisp contrast motion wake behind projectile (source-over first for bright daytime maps)
          const wakeLen = r * 3.6;
          ctx.globalCompositeOperation = 'source-over';
          const darkWake = ctx.createLinearGradient(0, 0, -wakeLen, 0);
          darkWake.addColorStop(0, 'rgba(15, 23, 42, 0.34)');
          darkWake.addColorStop(1, 'rgba(15, 23, 42, 0)');
          ctx.fillStyle = darkWake;
          ctx.beginPath();
          ctx.moveTo(0, -r * 0.85);
          ctx.lineTo(-wakeLen, 0);
          ctx.lineTo(0, r * 0.85);
          ctx.closePath();
          ctx.fill();

          const wakeGrad = ctx.createLinearGradient(0, 0, -wakeLen, 0);
          wakeGrad.addColorStop(0, proj.color);
          wakeGrad.addColorStop(0.55, `${proj.color}77`);
          wakeGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = wakeGrad;
          ctx.beginPath();
          ctx.moveTo(0, -r * 0.65);
          ctx.lineTo(-wakeLen, 0);
          ctx.lineTo(0, r * 0.65);
          ctx.closePath();
          ctx.fill();

          if (proj.vfxKind === 'blade_wave_line') {
            // Long golden / cold-violet ground-skimming blade wave (Thiên Trúc Tuyệt Đao, Huyền Âm Trảm)
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.58)';
            ctx.lineWidth = Math.max(5.5, r * 0.64);
            ctx.beginPath();
            ctx.arc(-r * 0.35, 0, r * 1.5, -1.08, 1.08);
            ctx.stroke();
            ctx.strokeStyle = proj.color;
            ctx.lineWidth = Math.max(3.6, r * 0.46);
            ctx.stroke();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = proj.accent || '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(-r * 0.25, 0, r * 1.38, -0.82, 0.82);
            ctx.stroke();
          } else if (proj.vfxKind === 'dragon_palm') {
            // Cái Bang Kháng Long Hữu Hối — Sinuous Orange-Gold Flying Fire Dragon!
            const wave = Math.sin(atlasHub.globalPhase * 18 + i) * r * 0.34;
            ctx.strokeStyle = '#7C2D12';
            ctx.lineWidth = r * 0.82;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-r * 2.7, -wave);
            ctx.quadraticCurveTo(-r * 1.3, wave, r * 0.6, 0);
            ctx.stroke();
            ctx.strokeStyle = proj.color;
            ctx.lineWidth = r * 0.56;
            ctx.stroke();
            ctx.strokeStyle = '#FEF08A';
            ctx.lineWidth = r * 0.24;
            ctx.stroke();
            // Dragon head & horns
            ctx.fillStyle = '#EA580C';
            ctx.strokeStyle = '#FEF08A';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(r * 1.65, 0);
            ctx.lineTo(r * 0.25, -r * 0.72);
            ctx.lineTo(-r * 0.15, -r * 0.3);
            ctx.lineTo(-r * 0.15, r * 0.3);
            ctx.lineTo(r * 0.25, r * 0.72);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(r * 0.75, -r * 0.22, 1.8, 0, Math.PI * 2);
            ctx.arc(r * 0.75, r * 0.22, 1.8, 0, Math.PI * 2);
            ctx.fill();
          } else if (proj.vfxKind === 'ocean_wave') {
            // Thúy Yên Bích Hải Triều Sinh — Ocean-blue/jade tidal wave with frothy white crest
            ctx.strokeStyle = '#0369A1';
            ctx.lineWidth = Math.max(6, r * 0.62);
            ctx.beginPath();
            ctx.arc(-r * 0.4, 0, r * 1.45, -1.05, 1.05);
            ctx.stroke();
            ctx.strokeStyle = proj.color;
            ctx.lineWidth = Math.max(3.8, r * 0.4);
            ctx.stroke();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2.1;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.arc(-r * 0.25, 0, r * 1.52, -0.92, 0.92);
            ctx.stroke();
          } else if (proj.vfxKind === 'frost_beam') {
            // Thúy Yên Băng Tâm Tiên Tử — Straight icy frost ribbon + tiny trailing crystals
            ctx.strokeStyle = '#0284C7';
            ctx.lineWidth = r * 0.56;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-r * 2.5, 0);
            ctx.lineTo(r * 1.8, 0);
            ctx.stroke();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = r * 0.22;
            ctx.stroke();
            ctx.fillStyle = '#E0F2FE';
            ctx.fillRect(-r * 1.3, -r * 0.65, 3, 3);
            ctx.fillRect(-r * 0.4, r * 0.45, 3, 3);
          } else if (proj.vfxKind === 'ice_pillars') {
            // Thúy Yên Mục Dã Lưu Tinh — Bold, thick faceted blue ice pillar with bright white core
            ctx.fillStyle = '#0284C7';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(r * 1.95, 0);
            ctx.lineTo(r * 0.35, -r * 0.72);
            ctx.lineTo(-r * 1.45, -r * 0.52);
            ctx.lineTo(-r * 1.75, 0);
            ctx.lineTo(-r * 1.45, r * 0.52);
            ctx.lineTo(r * 0.35, r * 0.72);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#E0F2FE';
            ctx.beginPath();
            ctx.moveTo(r * 1.4, 0);
            ctx.lineTo(-r * 0.9, -r * 0.26);
            ctx.lineTo(-r * 0.9, r * 0.26);
            ctx.closePath();
            ctx.fill();
          } else if (proj.vfxKind === 'ice_needles') {
            // Thúy Yên Băng Tung Vô Ảnh — Ultra-slim razor-sharp fast frost needle (visibly thinner than Mục Dã Lưu Tinh)
            ctx.strokeStyle = '#0369A1';
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.moveTo(-r * 2.4, 0);
            ctx.lineTo(r * 2.0, 0);
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(r * 2.3, 0);
            ctx.lineTo(-r * 1.4, -r * 0.24);
            ctx.lineTo(-r * 1.9, 0);
            ctx.lineTo(-r * 1.4, r * 0.24);
            ctx.closePath();
            ctx.fill();
          } else if (proj.vfxKind === 'giant_sword_push') {
            // Đoàn Thị Kinh Thiên Nhất Kiếm — Massive white-blue sword wave with golden leading tip
            ctx.strokeStyle = '#0369A1';
            ctx.lineWidth = Math.max(7, r * 0.6);
            ctx.beginPath();
            ctx.arc(-r * 0.35, 0, r * 1.65, -0.95, 0.95);
            ctx.stroke();
            ctx.strokeStyle = '#E0F2FE';
            ctx.lineWidth = Math.max(4.4, r * 0.38);
            ctx.stroke();
            ctx.strokeStyle = '#FDE047';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(-r * 0.2, 0, r * 1.72, -0.45, 0.45);
            ctx.stroke();
          } else if (proj.vfxKind === 'needle_barrage') {
            // Đường Môn Thiên La Địa Võng / Bạo Vũ Lê Hoa — Fine green-silver hidden dart
            ctx.strokeStyle = '#065F46';
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.moveTo(-r * 2.4, 0);
            ctx.lineTo(r * 1.2, 0);
            ctx.stroke();
            ctx.strokeStyle = proj.color;
            ctx.lineWidth = 1.8;
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(r * 2.0, 0);
            ctx.lineTo(r * 0.45, -r * 0.36);
            ctx.lineTo(r * 0.45, r * 0.36);
            ctx.closePath();
            ctx.fill();
          } else if (proj.vfxKind === 'venom_palm') {
            // Ngũ Độc Độc Sa Chưởng / Bách Độc Xuyên Tâm — Toxic green palm wave with dark purple core
            const vg = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.48);
            vg.addColorStop(0, '#581C87');
            vg.addColorStop(0.45, proj.color);
            vg.addColorStop(1, 'rgba(34, 197, 94, 0)');
            ctx.fillStyle = vg;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 1.5, r * 1.15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#86EFAC';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.95, -0.9, 0.9);
            ctx.stroke();
          } else if (proj.vfxKind === 'six_swords' || proj.vfxKind === 'finger_seal') {
            // Đoàn Thị Lục Mạch Thần Kiếm / Nhất Dương Chỉ ray
            ctx.strokeStyle = '#1E3A8A';
            ctx.lineWidth = r * 0.72;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-r * 2.2, 0);
            ctx.lineTo(r * 1.9, 0);
            ctx.stroke();
            ctx.strokeStyle = proj.color;
            ctx.lineWidth = r * 0.46;
            ctx.stroke();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(-r * 1.5, 0);
            ctx.lineTo(r * 2.1, 0);
            ctx.stroke();
          } else if (proj.vfxKind === 'wind_lightning') {
            // Côn Lôn Cuồng Phong Sậu Điện / Ngạo Tuyết Tiêu Phong — Wind blade + violet-white lightning edge
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(-r * 0.2, 0, r * 1.35, -1.12, 1.12);
            ctx.stroke();
            ctx.strokeStyle = proj.color;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.strokeStyle = '#F5F3FF';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(-r * 1.5, -r * 0.25);
            ctx.lineTo(-r * 0.2, r * 0.35);
            ctx.lineTo(r * 0.65, -r * 0.3);
            ctx.lineTo(r * 1.7, 0);
            ctx.stroke();
          } else if (proj.vfxKind === 'crimson_spear_dash' || proj.vfxKind === 'soul_drain') {
            // Thiên Nhẫn Vân Long Kích / Phi Hồng Vô Tích — Deep crimson lance with white-orange core
            ctx.fillStyle = '#881337';
            ctx.strokeStyle = proj.color;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(r * 2.2, 0);
            ctx.lineTo(-r * 0.85, -r * 0.58);
            ctx.lineTo(-r * 1.55, 0);
            ctx.lineTo(-r * 0.85, r * 0.58);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#FEF08A';
            ctx.beginPath();
            ctx.moveTo(r * 1.85, 0);
            ctx.lineTo(-r * 0.1, -r * 0.24);
            ctx.lineTo(-r * 0.1, r * 0.24);
            ctx.closePath();
            ctx.fill();
          } else if (proj.element === 'tho') {
            // Võ Đang Phi Kiếm — Luminous Flying Spirit Sword
            ctx.fillStyle = '#1E3A8A';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(r * 1.95, 0);
            ctx.lineTo(-r * 0.9, -r * 0.4);
            ctx.lineTo(-r * 1.25, 0);
            ctx.lineTo(-r * 0.9, r * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#F5D061';
            ctx.fillRect(-r * 1.05, -r * 0.78, r * 0.28, r * 1.56);
          } else if (proj.element === 'moc') {
            // Đường Môn Spinning 4-Blade Emerald Venom Shuriken
            ctx.rotate(atlasHub.globalPhase * 5.2);
            ctx.fillStyle = proj.color;
            ctx.strokeStyle = '#064E3B';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            for (let k = 0; k < 8; k++) {
              const rad = k % 2 === 0 ? r * 1.25 : r * 0.38;
              const ka = (k * Math.PI) / 4;
              if (k === 0) ctx.moveTo(Math.cos(ka) * rad, Math.sin(ka) * rad);
              else ctx.lineTo(Math.cos(ka) * rad, Math.sin(ka) * rad);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
            ctx.fill();
          } else if (proj.element === 'hoa') {
            // Blazing Fireball
            const fg = ctx.createRadialGradient(r * 0.25, 0, 1, 0, 0, r * 1.45);
            fg.addColorStop(0, '#FFFFFF');
            fg.addColorStop(0.35, '#FEF08A');
            fg.addColorStop(0.7, proj.color);
            fg.addColorStop(1, 'rgba(220, 38, 38, 0)');
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 1.45, r * 1.05, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (proj.element === 'thuy') {
            // Crystalline Frost Spear
            ctx.fillStyle = '#0284C7';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(r * 1.8, 0);
            ctx.lineTo(0, -r * 0.62);
            ctx.lineTo(-r * 1.3, 0);
            ctx.lineTo(0, r * 0.62);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            // Thiếu Lâm / Thiên Vương Golden Crescent Energy Wave
            ctx.strokeStyle = '#92400E';
            ctx.lineWidth = Math.max(4.5, r * 0.62);
            ctx.beginPath();
            ctx.arc(-r * 0.3, 0, r * 1.2, -1.05, 1.05);
            ctx.stroke();
            ctx.strokeStyle = '#FEF08A';
            ctx.lineWidth = Math.max(2.6, r * 0.4);
            ctx.stroke();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(-r * 0.2, 0, r * 1.1, -0.75, 0.75);
            ctx.stroke();
          }

          ctx.restore();
        }

        // 7. Painted VFX Sprite Sheets (Impact / Clash / Slash / Crit) + Particle Engine
        vfxSheetPool.renderLayer(ctx, 'impact');
        renderPooledParticles(ctx, effectPools);

        // 8. Floating Combat Numbers (World Space — compact Kiếm Thế 2009 scale)
        const ftItems = effectPools.floatTexts.items;
        for (let i = 0; i < effectPools.floatTexts.activeCount; i++) {
          const ft = ftItems[i];
          ctx.save();
          if (ft.isCrit) {
            const elapsed = 1 - ft.life / Math.max(0.01, ft.maxLife);
            let pop = 1.02;
            if (elapsed < 0.11) {
              const t = elapsed / 0.11;
              pop = 0.42 + t * 0.96;
            } else if (elapsed < 0.24) {
              const t = (elapsed - 0.11) / 0.13;
              pop = 1.38 - t * 0.36;
            }
            const alpha = elapsed > 0.7 ? Math.max(0, (1 - elapsed) / 0.3) : 1;

            ctx.translate(ft.x, ft.y);
            ctx.scale(pop, pop);
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const mainSize = Math.round(12.5 * ft.scale);
            const subSize = Math.max(8, Math.round(mainSize * 0.44));

            if (elapsed < 0.26) {
              const flareAlpha = (1 - elapsed / 0.26) * 0.55;
              const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, mainSize * 1.45);
              halo.addColorStop(0, `rgba(255, 251, 235, ${flareAlpha.toFixed(3)})`);
              halo.addColorStop(0.45, `rgba(245, 208, 97, ${(flareAlpha * 0.65).toFixed(3)})`);
              halo.addColorStop(1, 'rgba(245, 158, 11, 0)');
              ctx.fillStyle = halo;
              ctx.beginPath();
              ctx.arc(0, 0, mainSize * 1.45, 0, Math.PI * 2);
              ctx.fill();
            }

            if (ft.subText) {
              ctx.font = `800 ${subSize}px "Be Vietnam Pro", sans-serif`;
              ctx.lineWidth = 2.8;
              ctx.strokeStyle = 'rgba(24, 12, 4, 0.96)';
              ctx.shadowColor = ft.critTint === 'crimson_gold' ? '#EF4444' : '#F59E0B';
              ctx.shadowBlur = 7;
              ctx.strokeText(ft.subText, 0, -mainSize * 0.74);
              ctx.fillStyle = ft.critTint === 'crimson_gold' ? '#FDE68A' : '#FFFBEB';
              ctx.fillText(ft.subText, 0, -mainSize * 0.74);
            }

            ctx.font = `900 ${mainSize}px "JetBrains Mono", monospace`;
            const goldGrad = ctx.createLinearGradient(0, -mainSize * 0.55, 0, mainSize * 0.55);
            goldGrad.addColorStop(0, '#FFFFFF');
            goldGrad.addColorStop(0.32, '#FEF08A');
            goldGrad.addColorStop(0.68, '#F5D061');
            goldGrad.addColorStop(1, ft.critTint === 'crimson_gold' ? '#EA580C' : '#D97706');

            ctx.lineWidth = 3.8;
            ctx.lineJoin = 'round';
            ctx.strokeStyle = 'rgba(28, 13, 3, 0.96)';
            ctx.shadowColor = ft.critTint === 'crimson_gold' ? '#F97316' : '#F59E0B';
            ctx.shadowBlur = 11;
            ctx.strokeText(ft.text, 0, 0);

            ctx.fillStyle = goldGrad;
            ctx.fillText(ft.text, 0, 0);
          } else {
            ctx.globalAlpha = Math.min(1, ft.life / 0.35);
            const fontSize = Math.round(10.5 * ft.scale);
            ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = 'rgba(10, 8, 7, 0.9)';
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
          }
          ctx.restore();
        }

        // Exit World Camera Transform -> Screen-Space Atmosphere, Weather & Vignette
        ctx.restore();

        // Map atmospheric daylight tint & fresh weather atmosphere veil (screen space)
        ctx.fillStyle = curMode === 'SIEGE' ? 'rgba(255, 214, 178, 0.05)' : map.tintColor;
        ctx.fillRect(0, 0, width, height);

        if (activeWeather === 'rain') {
          ctx.fillStyle = `rgba(48, 92, 136, ${(0.09 * weatherFade).toFixed(3)})`;
          ctx.fillRect(0, 0, width, height);
        } else if (activeWeather === 'snow') {
          ctx.fillStyle = `rgba(224, 242, 254, ${(0.08 * weatherFade).toFixed(3)})`;
          ctx.fillRect(0, 0, width, height);
        } else if (activeWeather === 'mist') {
          ctx.fillStyle = `rgba(226, 238, 248, ${(0.09 * weatherFade).toFixed(3)})`;
          ctx.fillRect(0, 0, width, height);
        } else if (activeWeather === 'ash_wind') {
          ctx.fillStyle = `rgba(186, 114, 54, ${(0.06 * weatherFade).toFixed(3)})`;
          ctx.fillRect(0, 0, width, height);
        } else if (activeWeather === 'clear') {
          ctx.save();
          ctx.globalAlpha = 0.09 * weatherFade;
          const sunGrad = ctx.createLinearGradient(0, 0, width * 0.7, height * 0.78);
          sunGrad.addColorStop(0, '#FEF08A');
          sunGrad.addColorStop(0.55, 'rgba(254, 240, 138, 0.25)');
          sunGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = sunGrad;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }

        // Screen-space Rain Ripples & Ambient Petals / Snow / Embers
        if (activeWeather === 'rain' && effectPools.rainRipples.activeCount > 0) {
          ctx.save();
          ctx.lineWidth = 1.1;
          const rpItems = effectPools.rainRipples.items;
          for (let i = 0; i < effectPools.rainRipples.activeCount; i++) {
            const rp = rpItems[i];
            ctx.strokeStyle = `rgba(186, 230, 253, ${(rp.alpha * weatherFade).toFixed(3)})`;
            ctx.beginPath();
            ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.4, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }

        const moteColor =
          curMode === 'SIEGE' || curMode === 'BOSS'
            ? '#F97316'
            : map.ambientTheme === 'snow'
            ? '#E0F2FE'
            : map.ambientTheme === 'petals'
            ? '#FDA4AF'
            : '#F5D061';
        for (const m of ambientMotes) {
          ctx.globalAlpha = m.alpha;
          ctx.fillStyle = moteColor;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Dynamic Weather Foreground Layer (Rain / Snow / Mist / Ash Wind)
        ctx.save();
        if (activeWeather === 'rain') {
          ctx.lineWidth = 1.15;
          for (const d of rainDrops) {
            ctx.strokeStyle = `rgba(191, 219, 254, ${(d.alpha * weatherFade).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - d.len * 0.24, d.y + d.len);
            ctx.stroke();
          }
          if (lightningFlash > 0.01) {
            ctx.fillStyle = `rgba(224, 242, 254, ${(lightningFlash * weatherFade).toFixed(3)})`;
            ctx.fillRect(0, 0, width, height);
          }
        } else if (activeWeather === 'snow') {
          for (const f of snowFlakes) {
            ctx.globalAlpha = f.alpha * weatherFade;
            ctx.fillStyle = '#F0F9FF';
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (activeWeather === 'mist') {
          for (const mb of mistBanks) {
            const g = ctx.createRadialGradient(mb.x, mb.y, mb.ry * 0.1, mb.x, mb.y, mb.rx);
            g.addColorStop(0, `rgba(216, 226, 236, ${(mb.alpha * weatherFade).toFixed(3)})`);
            g.addColorStop(0.55, `rgba(186, 200, 216, ${(mb.alpha * 0.45 * weatherFade).toFixed(3)})`);
            g.addColorStop(1, 'rgba(186, 200, 216, 0)');
            ctx.save();
            ctx.translate(mb.x, mb.y);
            ctx.scale(1, mb.ry / mb.rx);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, mb.rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        } else if (activeWeather === 'ash_wind') {
          ctx.lineWidth = 1.4;
          for (const ws of windStreaks) {
            ctx.globalAlpha = ws.alpha * weatherFade;
            ctx.strokeStyle = ws.color;
            ctx.beginPath();
            ctx.moveTo(ws.x, ws.y);
            ctx.lineTo(ws.x + ws.len, ws.y - ws.len * 0.16);
            ctx.stroke();
          }
        }
        ctx.restore();

        const vig = ctx.createRadialGradient(
          width * 0.5,
          height * 0.52,
          Math.min(width, height) * 0.48,
          width * 0.5,
          height * 0.52,
          Math.max(width, height) * 0.86
        );
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(18,16,12,0.12)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, width, height);

        // Subtle celebratory golden screen-rim pulse during level-up
        if (levelUpFxRef.current.active && levelUpFxRef.current.elapsed < 0.85) {
          const lt = levelUpFxRef.current.elapsed / 0.85;
          const rimAlpha = Math.sin(lt * Math.PI) * 0.16;
          if (rimAlpha > 0.005) {
            const goldVig = ctx.createRadialGradient(
              width * 0.5,
              height * 0.5,
              Math.min(width, height) * 0.28,
              width * 0.5,
              height * 0.5,
              Math.max(width, height) * 0.72
            );
            goldVig.addColorStop(0, 'rgba(245, 208, 97, 0)');
            goldVig.addColorStop(0.72, `rgba(245, 208, 97, ${(rimAlpha * 0.45).toFixed(3)})`);
            goldVig.addColorStop(1, `rgba(254, 240, 138, ${rimAlpha.toFixed(3)})`);
            ctx.fillStyle = goldVig;
            ctx.fillRect(0, 0, width, height);
          }
        }

        ctx.restore();

        // 9. Screen-Space Wuxia Damage Combo Overlay (x2, x3, x5)
        if (combo.count >= 2 || combo.breakTimer > 0) {
          drawComboHud(ctx, width, height, combo, pr.animPhase);
        }
      };

      rafId = requestAnimationFrame(step);

      return () => {
        cancelAnimationFrame(rafId);
        effectPools.resetAll();
        atlasHub.clear();
        window.removeEventListener('resize', resize);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
        canvas.removeEventListener('pointerdown', onCanvasPointerDown);
      };
    }, [battleKey]);

    return (
      <div className="relative h-full w-full overflow-hidden bg-[#6E7A62]">
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-crosshair"
        />
      </div>
    );
  }
);

function drawPlayerEntity(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sectColor: string,
  mantleColor: string,
  mantleId: number,
  titleName: string | undefined,
  titleColor: string | undefined,
  name: string,
  guildName: string | undefined,
  hp: number,
  maxHp: number,
  shield: number,
  anim: SpriteAnimMachine,
  animPhase: number,
  sectId: SectId,
  mount: MountDef | null,
  illusion: MountIllusionDef | null,
  illusionStars: number,
  pkPoints: number,
  pkMode: PkMode,
  pkPenaltyPct: number,
  equipment: Record<EquipSlot, EquipmentItem | null>,
  realmTier: number,
  isMoving: boolean,
  combatStatus?: {
    stealth: boolean;
    invuln: boolean;
    buffLabel: string;
    buffColor?: string;
    buffAccent?: string;
    mantleLabel?: string;
    guildRole?: string;
    playerLevel?: number;
    sectName?: string;
  }
) {
  ctx.save();
  const isMounted = !!mount;
  const dir8 = anim.dir8;

  // 1. Dynamic Ground Shadow (compact Kiếm Thế 2009 scale)
  drawDynamicShadow(
    ctx,
    x,
    y + 13,
    isMounted ? (illusion ? 25 : 22) : 15,
    isMounted ? 8 : 6,
    0
  );

  // 2. Đồ Sát (PK) & Sát Khí Animated Crimson Aura Rings
  if (pkMode === 'slaughter') {
    const baseR = isMounted ? 36 : 29;
    const breathe = 1 + Math.sin(animPhase * 1.4) * 0.065;
    const waveProgress = (animPhase * 0.22) % 1;

    ctx.save();
    ctx.translate(x, y + 12);
    ctx.scale(1, 0.46);

    const floorGrad = ctx.createRadialGradient(0, 0, baseR * 0.15, 0, 0, baseR * 1.25);
    floorGrad.addColorStop(0, 'rgba(220, 38, 38, 0.34)');
    floorGrad.addColorStop(0.65, 'rgba(185, 28, 28, 0.16)');
    floorGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.arc(0, 0, baseR * 1.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#F87171';
    ctx.lineWidth = 1.8 * (1 - waveProgress * 0.5);
    ctx.globalAlpha = (1 - waveProgress) * 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, baseR * (0.72 + waveProgress * 0.62), 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.88;
    ctx.strokeStyle = '#EF4444';
    ctx.shadowColor = '#DC2626';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, baseR * breathe, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#FCA5A5';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.8;
    for (let k = 0; k < 3; k++) {
      const startA = -animPhase * 0.55 + (k * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, (baseR + 5) * breathe, startA, startA + Math.PI * 0.42);
      ctx.stroke();
    }
    ctx.restore();
  } else if (pkPoints > 0) {
    ctx.save();
    ctx.translate(x, y + 12);
    ctx.scale(1, 0.44);
    const pulse = 1 + Math.sin(animPhase * 1.4) * 0.06;
    ctx.strokeStyle = '#EF4444';
    ctx.shadowColor = '#DC2626';
    ctx.shadowBlur = 9;
    ctx.lineWidth = pkPoints >= 4 ? 2.2 : 1.6;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(0, 0, (isMounted ? 28 : 22) * pulse, -animPhase * 0.5, -animPhase * 0.5 + Math.PI * 1.55);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Phi Phong (Mantle) Rotating Aura Ring
  if (mantleId >= 1) {
    ctx.save();
    ctx.translate(x, y + 11);
    ctx.scale(1, 0.45);
    ctx.strokeStyle = mantleColor;
    ctx.lineWidth = mantleId >= 4 ? 2.2 : 1.6;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(0, 0, (isMounted ? 24 : 19) + mantleId * 1.4, animPhase * 0.5, animPhase * 0.5 + Math.PI * 1.45);
    ctx.stroke();
    if (mantleId >= 3) {
      ctx.beginPath();
      ctx.arc(0, 0, (isMounted ? 28 : 23) + mantleId * 1.4, -animPhase * 0.4, -animPhase * 0.4 + Math.PI * 1.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. HD Pixel Art Mount + Mount Evolution (scaled down to 0.74 for authentic Kiếm Thế 2009 proportions)
  let riderY = y;
  let riderX = x;
  if (mount) {
    const mountCols = isMoving ? 6 : 4;
    const mountScale = 0.74;
    ctx.save();
    ctx.translate(x, y + 2);
    ctx.scale(mountScale, mountScale);
    const mountRes = drawPixelMount(ctx, {
      x: 0,
      y: 0,
      dir8,
      animPhase,
      frameIndex: Math.floor(anim.mountPhase) % mountCols,
      isMoving,
      mount,
      illusion,
      illusionStars,
    });
    ctx.restore();
    riderY = y + 2 + mountRes.riderOffsetY * mountScale;
    riderX = x + mountRes.riderOffsetX * mountScale;
  }

  // 5. Layered Ngũ Hành Protective Shield Dome (Kim Chung Tráo / Bắc Minh / Tọa Vọng / Bôn Lôi)
  const auraCol = combatStatus?.buffColor || sectColor;
  const auraAcc = combatStatus?.buffAccent || '#FEF9C3';
  if (shield > 0) {
    const shR = isMounted ? 27 : 22;
    ctx.save();
    const domeGrad = ctx.createRadialGradient(riderX, riderY - 6, 4, riderX, riderY - 3, shR);
    domeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
    domeGrad.addColorStop(0.75, `${auraCol}28`);
    domeGrad.addColorStop(1, `${auraAcc}55`);
    ctx.fillStyle = domeGrad;
    ctx.strokeStyle = auraCol;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.arc(riderX, riderY - 3, shR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rotating orbital rune arcs along shield shell
    ctx.strokeStyle = auraAcc;
    ctx.lineWidth = 1.3;
    for (let k = 0; k < 3; k++) {
      const a0 = animPhase * 1.4 + (k * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(riderX, riderY - 3, shR + 2.5, a0, a0 + 0.65);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 5b. Active Support Buff / Invulnerability Ngũ Hành Halo Rings
  if (combatStatus?.invuln) {
    const invR = isMounted ? 30 : 25;
    ctx.save();
    ctx.strokeStyle = '#FEF08A';
    ctx.fillStyle = 'rgba(254, 240, 138, 0.16)';
    ctx.shadowColor = '#FACC15';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(riderX, riderY - 3, invR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Counter-rotating sacred lotus halo at feet
    ctx.shadowBlur = 0;
    ctx.translate(x, y + 12);
    ctx.scale(1, 0.44);
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, invR + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (combatStatus?.buffLabel) {
    const buffR = isMounted ? 30 : 24;
    ctx.save();
    ctx.translate(x, y + 12);
    ctx.scale(1, 0.44);
    // Outer rotating elemental ring
    ctx.strokeStyle = auraCol;
    ctx.lineWidth = 2.1;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, buffR, 0, Math.PI * 2);
    ctx.stroke();
    // Inner counter-rotating dashed rune ring
    ctx.strokeStyle = auraAcc;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, buffR * 0.78, -animPhase * 1.4, -animPhase * 1.4 + Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 6. State-Driven 8-Dir Pixel Hero (compact Kiếm Thế 2009 sprite scale; translucent when stealthed)
  ctx.save();
  if (combatStatus?.stealth) {
    ctx.globalAlpha = 0.42;
  }
  drawPixelHero(ctx, {
    x: riderX,
    y: riderY,
    sectId,
    dir8,
    animState: anim.state,
    animPhase,
    frameIndex: anim.frameIndex,
    normalizedTime: anim.normalizedTime,
    attackProgress: anim.state === 'attack' ? anim.normalizedTime : 0,
    castProgress: anim.state === 'cast' ? anim.normalizedTime : 0,
    hitFlash: anim.hitFlashTimer,
    equipment,
    realmTier,
    mantleId,
    mantleColor,
    isMounted,
    scale: isMounted ? 0.72 : 0.78,
  });
  ctx.restore();

  // 7. Circular Upright Crimson Aura Halo when Đồ Sát (PK) is active
  if (pkMode === 'slaughter') {
    const haloY = riderY - 4;
    const haloR = (isMounted ? 27 : 22) + Math.sin(animPhase * 1.5) * 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, haloY, haloR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 8. Compact Kiếm Thế 2009 Overhead HP bar
  const barW = 40;
  const barY = riderY - 27;
  ctx.fillStyle = 'rgba(10, 8, 7, 0.88)';
  ctx.fillRect(x - barW / 2, barY, barW, 3.5);
  ctx.fillStyle = '#22C55E';
  ctx.fillRect(x - barW / 2, barY, barW * Math.max(0, hp / Math.max(1, maxHp)), 3.5);

  // 9. Authentic Kiếm Thế 2009 3-Line Overhead Nameplate Stack:
  //    Bottom (above HP): <Phi Phong> TênNhânVật [ MônPhái.Cấp ]
  //    Middle (above Name): [Bang hội]TênBang.ChứcVụ (or [Môn phái]TênPhái.Đệ tử)
  //    Top (above Guild): Danh hiệu
  ctx.lineWidth = 2.8;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(6, 5, 5, 0.94)';

  const mantleTagText = `<${combatStatus?.mantleLabel || 'Sơ Nhập'}>`;
  const sectMeta = combatStatus?.sectName
    ? ` [ ${combatStatus.sectName}.${combatStatus.playerLevel ?? 1} ]`
    : '';
  const pkSuffix = pkPoints > 0 ? ` [PK ${pkPoints}]` : '';
  const namePartText = ` ${name}${sectMeta}${pkSuffix}`;

  // Line 1 (Bottom): <Phi Phong> right BEFORE Character Name (centered as one baseline)
  ctx.font = '700 10px "Be Vietnam Pro", sans-serif';
  const mantleW = ctx.measureText(mantleTagText).width;
  const nameW = ctx.measureText(namePartText).width;
  const startX = x - (mantleW + nameW) / 2;
  const line1Y = barY - 4;

  ctx.textAlign = 'left';
  ctx.strokeText(mantleTagText, startX, line1Y);
  ctx.fillStyle = mantleId > 0 ? mantleColor : '#93C5FD';
  ctx.fillText(mantleTagText, startX, line1Y);

  ctx.strokeText(namePartText, startX + mantleW, line1Y);
  ctx.fillStyle = pkPoints > 0 || pkMode === 'slaughter' ? '#F87171' : '#C8FFE0';
  ctx.fillText(namePartText, startX + mantleW, line1Y);

  // Line 2 (Middle): Bang hội & Chức vụ directly above Name
  ctx.textAlign = 'center';
  const line2Y = line1Y - 12;
  const guildLine = guildName
    ? `[Bang hội]${guildName}.${combatStatus?.guildRole || 'Thành viên'}`
    : combatStatus?.sectName
    ? `[Môn phái]${combatStatus.sectName}.Đệ tử`
    : '';
  let nextLineY = line2Y;
  if (guildLine) {
    ctx.font = '600 9.5px "Be Vietnam Pro", sans-serif';
    ctx.strokeText(guildLine, x, line2Y);
    ctx.fillStyle = '#E4F7EE';
    ctx.fillText(guildLine, x, line2Y);
    nextLineY = line2Y - 13;
  }

  // Line 3 (Top): Danh hiệu above Bang hội & Chức vụ
  if (titleName) {
    ctx.save();
    ctx.font = '700 10.5px "Be Vietnam Pro", sans-serif';
    ctx.shadowColor = titleColor || '#F97316';
    ctx.shadowBlur = 6;
    ctx.strokeText(titleName, x, nextLineY);
    ctx.fillStyle = titleColor || '#FB923C';
    ctx.fillText(titleName, x, nextLineY);
    ctx.restore();
    nextLineY -= 12;
  }

  // Active PK / Sát Khí warning stacked cleanly above Title
  if (pkMode === 'slaughter') {
    const blink = 0.72 + 0.28 * Math.sin(animPhase * 2.2);
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.font = '700 8.5px "Be Vietnam Pro", sans-serif';
    ctx.strokeText('⚔ ĐỒ SÁT (PK)', x, nextLineY);
    ctx.fillStyle = '#EF4444';
    ctx.fillText('⚔ ĐỒ SÁT (PK)', x, nextLineY);
    ctx.restore();
    nextLineY -= 10;
  }
  if (pkPenaltyPct > 0) {
    ctx.font = '700 8.5px "Be Vietnam Pro", sans-serif';
    ctx.strokeText(`Sát Khí -${pkPenaltyPct}%`, x, nextLineY);
    ctx.fillStyle = '#FCA5A5';
    ctx.fillText(`Sát Khí -${pkPenaltyPct}%`, x, nextLineY);
  }
  ctx.restore();
}

function drawNpcOrEnemy(
  ctx: CanvasRenderingContext2D,
  u: Unit,
  isSelected: boolean,
  animPhase: number,
  pkSlaughterActive = false,
  deathProgress = 0
) {
  ctx.save();
  const anim = u.anim || createAnimMachine(u.facing, deathProgress > 0 ? 'death' : 'idle');
  const dir8 = anim.dir8;

  // Target lock ring (only for living units)
  if (isSelected && deathProgress === 0) {
    ctx.strokeStyle = '#F5D061';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(u.x, u.y + u.radius * 0.78, u.radius + 8, (u.radius + 8) * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Martial artist rivals & wandering PK heroes render with compact 8-dir Hero Atlas
  if ((u.kind === 'wanderer' || u.kind === 'rival') && u.masterSect) {
    const isHostile = u.kind === 'rival' || Boolean(u.aggro || pkSlaughterActive);
    drawDynamicShadow(ctx, u.x, u.y + 13, 14, 5.5, 0);

    if (deathProgress === 0) {
      ctx.strokeStyle = isHostile ? '#EF4444' : '#34D399';
      ctx.lineWidth = isHostile ? 1.8 : 1.2;
      ctx.globalAlpha = isHostile ? 0.74 : 0.42;
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + 12, 18, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.save();
    if (deathProgress > 0) {
      ctx.globalAlpha = Math.max(0, 1 - deathProgress);
    }
    const mantleDef = MANTLES.find((m) => m.id === (u.mantleId || 0)) || MANTLES[0];
    drawPixelHero(ctx, {
      x: u.x,
      y: u.y,
      sectId: u.masterSect,
      dir8,
      animState: anim.state,
      animPhase: animPhase + u.x * 0.04,
      frameIndex: anim.frameIndex,
      normalizedTime: anim.normalizedTime,
      attackProgress: anim.state === 'attack' ? anim.normalizedTime : 0,
      castProgress: anim.state === 'cast' ? anim.normalizedTime : 0,
      hitFlash: anim.hitFlashTimer,
      realmTier: u.kind === 'rival' ? Math.max(2, u.mantleId || 2) : Math.max(1, u.mantleId || 1),
      mantleId: u.mantleId || 0,
      mantleColor: mantleDef.color,
      isMounted: false,
      scale: u.kind === 'rival' ? 0.78 : 0.74,
    });
    ctx.restore();
  } else {
    // Distinct HD Pixel Art Monsters, Elites, Bosses, Siege NPCs & Structures (compact Kiếm Thế 2009 scale)
    const archetype = u.archetype || resolveMonsterArchetype(u.name, u.kind);
    const monsterScale =
      u.kind === 'gate' || u.kind === 'pillar' || u.kind === 'banner'
        ? 0.88
        : u.kind === 'boss'
        ? 0.82
        : u.kind === 'elite'
        ? 0.78
        : 0.74;
    const shadowRx =
      u.kind === 'boss'
        ? 28
        : u.kind === 'gate' || u.kind === 'pillar' || u.kind === 'banner'
        ? 26
        : u.kind === 'elite'
        ? 19
        : 14;
    drawDynamicShadow(ctx, u.x, u.y + (u.kind === 'boss' ? 18 : 13), shadowRx, shadowRx * 0.36, 0);

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.scale(monsterScale, monsterScale);
    drawPixelMonster(ctx, {
      x: 0,
      y: 0,
      archetype,
      color: u.color,
      accentColor: u.accentColor,
      dir8,
      animState: anim.state,
      animPhase: animPhase + u.x * 0.03,
      frameIndex: anim.frameIndex,
      attackProgress: anim.state === 'attack' ? anim.normalizedTime : 0,
      hitFlash: anim.hitFlashTimer,
      deathProgress,
      alertTimer: u.alertTimer || 0,
      enraged: Boolean(u.enraged),
      roarTimer: u.roarTimer || 0,
      isElite: u.kind === 'elite',
    });
    ctx.restore();
  }

  // Skip overhead bars & labels during collapse/death dissolve
  if (deathProgress > 0) {
    ctx.restore();
    return;
  }

  // Status effect indicators (Poison / Stun)
  if (u.poisonTimer > 0) {
    ctx.strokeStyle = '#4ADE80';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(u.x, u.y + 10, u.radius + 3, (u.radius + 3) * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (u.stunTimer > 0) {
    ctx.fillStyle = '#FDE047';
    ctx.font = '700 9.5px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦ CHOÁNG', u.x, u.y - u.radius - 24);
  }

  // Compact Kiếm Thế 2009 Overhead HP bar
  const isHostileWanderer = u.kind === 'wanderer' && (u.aggro || pkSlaughterActive);
  const barW =
    u.kind === 'boss' || u.kind === 'gate' || u.kind === 'pillar' || u.kind === 'banner' ? 66 : 40;
  const barY =
    u.y -
    (u.kind === 'gate' || u.kind === 'pillar' || u.kind === 'banner'
      ? 48
      : u.kind === 'boss'
      ? 42
      : u.kind === 'wanderer' || u.kind === 'rival'
      ? 28
      : u.radius + 14);
  ctx.fillStyle = 'rgba(10, 8, 7, 0.88)';
  ctx.fillRect(u.x - barW / 2, barY, barW, 3.5);
  ctx.fillStyle =
    u.team === 'ally'
      ? '#38BDF8'
      : u.kind === 'wanderer' && !isHostileWanderer
      ? '#34D399'
      : u.kind === 'boss'
      ? u.enraged
        ? '#EF4444'
        : '#F59E0B'
      : '#DC2626';
  ctx.fillRect(u.x - barW / 2, barY, barW * Math.max(0, u.hp / Math.max(1, u.maxHp)), 3.5);

  // Authentic Kiếm Thế 2009 3-Line Overhead Stack for Martial Artists (Wanderer / Rival)
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(8, 6, 5, 0.94)';

  if ((u.kind === 'wanderer' || u.kind === 'rival') && u.masterSect) {
    const uMantle = MANTLES.find((m) => m.id === (u.mantleId || 0)) || MANTLES[0];
    const uSect = SECTS[u.masterSect];
    const mantleTag = `<${uMantle.id === 0 ? 'Sơ Nhập' : uMantle.name}>`;
    const lvTag = u.masterLevel ? ` [ ${uSect.name}.${u.masterLevel} ]` : ` [ ${uSect.name} ]`;
    const namePart = ` ${isHostileWanderer ? '[PK] ' : ''}${u.name}${lvTag}`;

    // Bottom line: <Phi Phong> Name [ Sect.Lv ]
    ctx.font = '700 9.5px "Be Vietnam Pro", sans-serif';
    const mw = ctx.measureText(mantleTag).width;
    const nw = ctx.measureText(namePart).width;
    const sx = u.x - (mw + nw) / 2;
    const y1 = barY - 4;

    ctx.textAlign = 'left';
    ctx.strokeText(mantleTag, sx, y1);
    ctx.fillStyle = uMantle.id > 0 ? uMantle.color : '#93C5FD';
    ctx.fillText(mantleTag, sx, y1);

    ctx.strokeText(namePart, sx + mw, y1);
    ctx.fillStyle =
      u.kind === 'rival' || isHostileWanderer ? '#FCA5A5' : '#C8FFE0';
    ctx.fillText(namePart, sx + mw, y1);

    // Middle line: [Bang hội]Guild.Role
    ctx.textAlign = 'center';
    let nextY = y1 - 11.5;
    if (u.guildTag) {
      const guildText = `[Bang hội]${u.guildTag}.${u.guildRole || 'Thành viên'}`;
      ctx.font = '600 9px "Be Vietnam Pro", sans-serif';
      ctx.strokeText(guildText, u.x, nextY);
      ctx.fillStyle = '#E4F7EE';
      ctx.fillText(guildText, u.x, nextY);
      nextY -= 12;
    }

    // Top line: Danh hiệu
    if (u.title) {
      ctx.save();
      ctx.font = '700 10px "Be Vietnam Pro", sans-serif';
      ctx.shadowColor = u.color || '#FB923C';
      ctx.shadowBlur = 5;
      ctx.strokeText(u.title, u.x, nextY);
      ctx.fillStyle = u.kind === 'rival' ? '#FB923C' : '#FBBF24';
      ctx.fillText(u.title, u.x, nextY);
      ctx.restore();
    }
  } else {
    // Monsters, Elites, Bosses & Siege Structures
    ctx.textAlign = 'center';
    ctx.font = u.kind === 'boss' ? '700 11px "Be Vietnam Pro", sans-serif' : '600 9.5px "Be Vietnam Pro", sans-serif';
    const displayName = u.kind === 'boss' && u.enraged ? `🔥 ${u.name}` : u.name;
    ctx.strokeText(displayName, u.x, barY - 3.5);
    ctx.fillStyle =
      u.team === 'ally'
        ? '#93C5FD'
        : u.kind === 'boss'
        ? u.enraged
          ? '#FCA5A5'
          : '#F5D061'
        : '#F3EAD8';
    ctx.fillText(displayName, u.x, barY - 3.5);

    if (u.title) {
      ctx.font = '600 8.5px "Be Vietnam Pro", sans-serif';
      ctx.strokeText(u.title, u.x, barY - 14);
      ctx.fillStyle = '#FDE68A';
      ctx.fillText(u.title, u.x, barY - 14);
    }
  }
  ctx.restore();
}

/**
 * Renders the authentic Kiếm Thế 2009 Wuxia Damage Combo HUD (x2, x3, x5)
 * directly in BattleCanvas screen space with spring recoil, sculpted multiplier seal,
 * depleting continuity bar, and cumulative streak damage.
 */
function drawComboHud(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  combo: ComboState,
  animPhase: number
) {
  const x = 12;
  const y = Math.max(88, Math.min(132, Math.round(height * 0.2)));

  ctx.save();

  if (combo.count < 2 && combo.breakTimer > 0) {
    const alpha = Math.min(1, combo.breakTimer / 0.55);
    ctx.globalAlpha = alpha;
    const panelW = 148;
    const panelH = 34;

    ctx.beginPath();
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + panelW, y);
    ctx.lineTo(x + panelW - 8, y + panelH);
    ctx.lineTo(x, y + panelH);
    ctx.closePath();
    ctx.fillStyle = combo.brokenByHit ? 'rgba(52, 14, 16, 0.86)' : 'rgba(18, 22, 26, 0.82)';
    ctx.fill();
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = combo.brokenByHit ? '#F87171' : '#8596A1';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = '700 9px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = combo.brokenByHit ? '#FCA5A5' : '#CBD5E1';
    ctx.fillText(combo.brokenByHit ? 'NGẮT LIÊN TRẢM' : 'KẾT THÚC LIÊN TRẢM', x + 10, y + 14);

    ctx.font = '700 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#F5D061';
    ctx.fillText(`${combo.brokenCount} Đòn · x${combo.brokenTier}`, x + 10, y + 26);

    ctx.restore();
    return;
  }

  const spec = resolveComboTier(combo.count);
  const ratio = Math.max(0, Math.min(1, combo.timer / Math.max(0.01, combo.maxTimer)));
  const urgentPulse = ratio < 0.28 ? 0.58 + 0.42 * Math.sin(animPhase * 22) : 1;
  const panelW = width < 760 ? 148 : 160;
  const panelH = 58;

  ctx.save();
  ctx.globalAlpha = 0.92 * (ratio < 0.16 ? 0.65 + ratio * 2 : 1);

  const bgGrad = ctx.createLinearGradient(x, y, x + panelW, y + panelH);
  if (spec.mult === 5) {
    bgGrad.addColorStop(0, 'rgba(66, 12, 14, 0.9)');
    bgGrad.addColorStop(0.6, 'rgba(28, 10, 12, 0.84)');
    bgGrad.addColorStop(1, 'rgba(12, 14, 18, 0.42)');
  } else if (spec.mult === 3) {
    bgGrad.addColorStop(0, 'rgba(56, 24, 10, 0.88)');
    bgGrad.addColorStop(0.62, 'rgba(22, 16, 14, 0.82)');
    bgGrad.addColorStop(1, 'rgba(12, 14, 18, 0.4)');
  } else if (spec.mult === 2) {
    bgGrad.addColorStop(0, 'rgba(42, 34, 14, 0.86)');
    bgGrad.addColorStop(0.65, 'rgba(16, 20, 24, 0.8)');
    bgGrad.addColorStop(1, 'rgba(12, 15, 19, 0.36)');
  } else {
    bgGrad.addColorStop(0, 'rgba(22, 29, 35, 0.84)');
    bgGrad.addColorStop(0.7, 'rgba(12, 16, 20, 0.74)');
    bgGrad.addColorStop(1, 'rgba(12, 15, 19, 0.28)');
  }

  ctx.beginPath();
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + panelW, y);
  ctx.lineTo(x + panelW - 10, y + panelH);
  ctx.lineTo(x, y + panelH);
  ctx.closePath();
  ctx.fillStyle = bgGrad;
  ctx.fill();

  ctx.lineWidth = spec.mult >= 3 ? 1.4 : 1.1;
  ctx.strokeStyle = spec.mult >= 2 ? spec.primary : '#899AA5';
  ctx.stroke();

  ctx.fillStyle = spec.primary;
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 2);
  ctx.lineTo(x + 10, y + 2);
  ctx.lineTo(x + 4, y + panelH - 2);
  ctx.lineTo(x + 1, y + panelH - 2);
  ctx.closePath();
  ctx.fill();

  const numX = x + 15;
  const numY = y + 27;
  ctx.save();
  ctx.translate(numX, numY);
  ctx.scale(combo.popScale, combo.popScale);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const countFontSize = 21;
  ctx.font = `900 ${countFontSize}px "JetBrains Mono", monospace`;

  const numGrad = ctx.createLinearGradient(0, -countFontSize, 0, 3);
  numGrad.addColorStop(0, '#FFFFFF');
  numGrad.addColorStop(0.45, spec.accent);
  numGrad.addColorStop(1, spec.primary);

  ctx.lineWidth = 3.2;
  ctx.strokeStyle = 'rgba(8, 7, 6, 0.96)';
  ctx.strokeText(`${combo.count}`, 0, 0);
  ctx.fillStyle = numGrad;
  ctx.fillText(`${combo.count}`, 0, 0);
  ctx.restore();

  const countDigits = String(combo.count).length;
  const afterNumX = numX + countDigits * 13 + 4;
  ctx.textAlign = 'left';
  ctx.font = '800 7.5px "JetBrains Mono", monospace';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('LIÊN', afterNumX, numY - 9);
  ctx.fillText('KÍCH', afterNumX, numY - 1);

  // Compact Multiplier Seal Stamp
  const sealCx = x + panelW - 25;
  const sealCy = y + 19;
  const sealR = 13.5;

  ctx.save();
  ctx.translate(sealCx, sealCy);
  const sealScale =
    spec.mult >= 2
      ? 1 + (combo.popScale - 1) * 0.55
      : 0.92;
  ctx.scale(sealScale, sealScale);

  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    const px = Math.cos(a) * sealR;
    const py = Math.sin(a) * sealR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle =
    spec.mult === 5 ? '#991B1B' : spec.mult === 3 ? '#9A3412' : spec.mult === 2 ? '#854D0E' : '#1E293B';
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = spec.mult >= 2 ? spec.accent : '#94A3B8';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 11.5px "JetBrains Mono", monospace';
  ctx.fillStyle = spec.mult >= 2 ? '#FFFBEB' : '#CBD5E1';
  ctx.fillText(`x${spec.mult}`, 0, 0.5);
  ctx.restore();

  // Rank & Bonus
  const subY = y + 38;
  ctx.textAlign = 'left';
  ctx.font = '800 8.5px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = spec.primary;
  ctx.fillText(spec.label, x + 14, subY);

  ctx.textAlign = 'right';
  ctx.font = '700 8px "JetBrains Mono", monospace';
  ctx.fillStyle = spec.mult >= 2 ? spec.accent : '#94A3B8';
  ctx.fillText(spec.mult >= 2 ? spec.bonusText : `${5 - combo.count}→x2`, x + panelW - 12, subY);

  // Depleting Continuity Bar
  const barX = x + 13;
  const barY = y + 42;
  const barW = panelW - 26;
  const barH = 3.5;

  ctx.fillStyle = 'rgba(7, 9, 12, 0.92)';
  ctx.fillRect(barX, barY, barW, barH);
  const fillW = Math.max(0, barW * ratio);
  if (fillW > 0) {
    ctx.globalAlpha = urgentPulse;
    ctx.fillStyle = spec.primary;
    ctx.fillRect(barX, barY, fillW, barH);
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = 'left';
  ctx.font = '600 8px "JetBrains Mono", monospace';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText(`ST: ${combo.totalDamage.toLocaleString('vi-VN')}`, barX, barY + 11);

  ctx.restore();
  ctx.restore();
}

/**
 * Renders the rotating golden Bagua & Lotus ground magic array beneath the hero
 * during a Kiếm Thế 2009 level-up ascension.
 */
function drawLevelUpGroundSeal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fx: LevelUpFxState
) {
  const t = fx.elapsed;
  const footY = y + 12;

  ctx.save();
  ctx.translate(x, footY);

  // 1. Expanding primary & secondary shockwave ellipses
  if (t < 0.62) {
    const p = t / 0.62;
    const ease = 1 - Math.pow(1 - p, 3);
    const rx = 14 + ease * 82;
    const alpha = (1 - p) * 0.85;
    ctx.strokeStyle = `rgba(254, 249, 195, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 3 * (1 - p * 0.6);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, rx * 0.44, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (t > 0.1 && t < 0.82) {
    const p = (t - 0.1) / 0.72;
    const ease = 1 - Math.pow(1 - p, 2.6);
    const rx = 18 + ease * 102;
    const alpha = (1 - p) * 0.55;
    ctx.strokeStyle = `rgba(245, 208, 97, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, rx * 0.44, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 2. Rotating isometric Bagua & Golden Lotus seal (0 -> 2.45s)
  if (t < 2.45) {
    const fadeIn = Math.min(1, t / 0.22);
    const fadeOut = t > 1.75 ? Math.max(0, 1 - (t - 1.75) / 0.7) : 1;
    const sealAlpha = fadeIn * fadeOut;
    const scalePop = 0.68 + 0.32 * Math.min(1, t / 0.26);
    const outerR = 52 * scalePop;

    ctx.save();
    ctx.scale(1, 0.46);
    ctx.globalAlpha = sealAlpha;

    // Warm golden radial light pool under feet
    const pool = ctx.createRadialGradient(0, 0, 4, 0, 0, outerR * 1.18);
    pool.addColorStop(0, 'rgba(255, 251, 235, 0.72)');
    pool.addColorStop(0.45, 'rgba(245, 208, 97, 0.42)');
    pool.addColorStop(0.8, 'rgba(217, 119, 6, 0.16)');
    pool.addColorStop(1, 'rgba(217, 119, 6, 0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(0, 0, outerR * 1.18, 0, Math.PI * 2);
    ctx.fill();

    // Outer rotating rune ring + 8 lotus petals
    ctx.save();
    ctx.rotate(t * 1.15);

    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 208, 97, 0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, outerR * 0.84, 0, Math.PI * 2);
    ctx.stroke();

    // 8 octagonal Bagua vertices & glowing golden lotus petals
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      ctx.save();
      ctx.rotate(ang);

      // Lotus petal pointing outward
      ctx.beginPath();
      ctx.moveTo(outerR * 0.56, 0);
      ctx.quadraticCurveTo(outerR * 0.82, -7.5, outerR * 1.06, 0);
      ctx.quadraticCurveTo(outerR * 0.82, 7.5, outerR * 0.56, 0);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(254, 240, 138, 0.36)' : 'rgba(245, 208, 97, 0.24)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 251, 235, 0.72)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Trigram bar glyph near outer ring
      ctx.fillStyle = '#FFFBEB';
      ctx.fillRect(outerR * 0.88, -3.5, 2.2, 7);
      ctx.restore();
    }
    ctx.restore();

    // Inner counter-rotating octagon star
    ctx.save();
    ctx.rotate(-t * 1.65);
    ctx.strokeStyle = 'rgba(254, 249, 195, 0.88)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? outerR * 0.58 : outerR * 0.36;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders the foreground Kiếm Thế 2009 level-up spectacle wrapping the hero:
 * Ascending Golden Light Pillar (Kim Quang Xung Thiên), double-helix Qi ribbons,
 * rising golden sparkles, and classic overhead THĂNG CẤP! calligraphy.
 */
function drawLevelUpForeground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fx: LevelUpFxState
) {
  const t = fx.elapsed;
  const footY = y + 12;

  ctx.save();

  // 1. Kim Quang Xung Thiên — Ascending Golden Pillar of Light (0 -> 1.85s)
  if (t < 1.85) {
    const riseP = Math.min(1, t / 0.24);
    const fadeOut = t > 0.95 ? Math.max(0, 1 - (t - 0.95) / 0.9) : 1;
    const pillarAlpha = riseP * fadeOut;
    const pillarH = (120 + riseP * 145) * (1 + (t > 0.95 ? (t - 0.95) * 0.15 : 0));
    const outerW = 52 * (0.72 + 0.28 * Math.sin(t * 7)) * (1 - Math.max(0, t - 1.0) * 0.45);
    const coreW = outerW * 0.36;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = pillarAlpha * 0.72;

    // Wide amber-gold outer beam
    const beamGrad = ctx.createLinearGradient(x, footY, x, footY - pillarH);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.78)');
    beamGrad.addColorStop(0.28, 'rgba(245, 208, 97, 0.48)');
    beamGrad.addColorStop(0.68, 'rgba(217, 119, 6, 0.18)');
    beamGrad.addColorStop(1, 'rgba(245, 208, 97, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(x - outerW / 2, footY - pillarH, outerW, pillarH);

    // Bright ivory-gold center shaft
    const coreGrad = ctx.createLinearGradient(x, footY, x, footY - pillarH * 0.92);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
    coreGrad.addColorStop(0.35, 'rgba(254, 249, 195, 0.56)');
    coreGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(x - coreW / 2, footY - pillarH * 0.92, coreW, pillarH * 0.92);

    // 4 shimmering ascending light rays inside the column
    for (let r = 0; r < 4; r++) {
      const rxOff = (r - 1.5) * (outerW * 0.22) + Math.sin(t * 5 + r * 1.7) * 3;
      const rayStart = footY - ((t * 160 + r * 42) % (pillarH * 0.75));
      const rayLen = 38 + (r % 2) * 18;
      const rGrad = ctx.createLinearGradient(x + rxOff, rayStart, x + rxOff, rayStart - rayLen);
      rGrad.addColorStop(0, 'rgba(255, 251, 235, 0)');
      rGrad.addColorStop(0.45, 'rgba(255, 251, 235, 0.65)');
      rGrad.addColorStop(1, 'rgba(255, 251, 235, 0)');
      ctx.strokeStyle = rGrad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + rxOff, rayStart);
      ctx.lineTo(x + rxOff, rayStart - rayLen);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 2. Double-Helix Spiraling Golden Qi Ribbons (0 -> 2.15s)
  if (t < 2.15) {
    const fadeOut = t > 1.45 ? Math.max(0, 1 - (t - 1.45) / 0.7) : 1;
    const headP = Math.min(1, t / 1.35);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let strand = 0; strand < 2; strand++) {
      const phaseOffset = strand * Math.PI;
      const steps = 18;
      ctx.beginPath();
      let headX = x;
      let headY = footY;
      for (let s = 0; s <= steps; s++) {
        const frac = s / steps;
        const localP = Math.max(0, headP - (1 - frac) * 0.42);
        const h = localP * 112;
        const rad = 28 * (1 - localP * 0.35);
        const ang = localP * Math.PI * 4.4 + phaseOffset + t * 2.2;
        const px = x + Math.cos(ang) * rad;
        const py = footY - h + Math.sin(ang) * 6;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        if (s === steps) {
          headX = px;
          headY = py;
        }
      }
      ctx.strokeStyle =
        strand === 0
          ? `rgba(254, 240, 138, ${(0.72 * fadeOut).toFixed(3)})`
          : `rgba(134, 239, 172, ${(0.52 * fadeOut).toFixed(3)})`;
      ctx.lineWidth = 2.1;
      ctx.stroke();

      // Glowing Qi pearl tip
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.9 * fadeOut).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(headX, headY, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. 26 Rising Golden Sparkles & Star Motes (0 -> 2.65s)
  if (t < 2.65) {
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const delay = (i % 7) * 0.09;
      const lt = t - delay;
      if (lt <= 0 || lt > 1.75) continue;
      const p = lt / 1.75;
      const seedAng = i * 2.39996;
      const orbitR = 10 + (i % 5) * 9 + Math.sin(p * Math.PI) * 8;
      const ang = seedAng + lt * (i % 2 === 0 ? 1.8 : -1.5);
      const sx = x + Math.cos(ang) * orbitR;
      const sy = footY - 8 - p * (92 + (i % 4) * 26);
      const alpha = Math.sin(p * Math.PI) * 0.92;
      const sz = (1.5 + (i % 3) * 0.85) * (1 - p * 0.45);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 5 === 0 ? '#86EFAC' : i % 2 === 0 ? '#FEF9C3' : '#F5D061';
      // 4-point star sparkle
      ctx.beginPath();
      ctx.moveTo(sx, sy - sz * 1.9);
      ctx.lineTo(sx + sz * 0.55, sy - sz * 0.55);
      ctx.lineTo(sx + sz * 1.9, sy);
      ctx.lineTo(sx + sz * 0.55, sy + sz * 0.55);
      ctx.lineTo(sx, sy + sz * 1.9);
      ctx.lineTo(sx - sz * 0.55, sy + sz * 0.55);
      ctx.lineTo(sx - sz * 1.9, sy);
      ctx.lineTo(sx - sz * 0.55, sy - sz * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Classic Kiếm Thế 2009 Overhead THĂNG CẤP! Calligraphy Callout (0.06 -> 2.9s)
  if (t >= 0.06 && t < 2.9) {
    const ct = t - 0.06;
    const total = 2.84;
    let pop = 1;
    if (ct < 0.14) {
      pop = 0.42 + (ct / 0.14) * 0.82;
    } else if (ct < 0.3) {
      pop = 1.24 - ((ct - 0.14) / 0.16) * 0.24;
    }
    const alpha =
      ct < 0.12
        ? ct / 0.12
        : ct > total - 0.65
        ? Math.max(0, (total - ct) / 0.65)
        : 1;
    const floatY = y - 56 - Math.min(34, ct * 14);

    ctx.save();
    ctx.translate(x, floatY);
    ctx.scale(pop, pop);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Golden halo glow behind text
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 56);
    halo.addColorStop(0, 'rgba(254, 240, 138, 0.42)');
    halo.addColorStop(0.55, 'rgba(245, 158, 11, 0.16)');
    halo.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.ellipse(0, 0, 62, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main title: ✦ THĂNG CẤP! ✦
    ctx.font = '800 15px "Noto Serif", Georgia, serif';
    const titleGrad = ctx.createLinearGradient(0, -10, 0, 10);
    titleGrad.addColorStop(0, '#FFFFFF');
    titleGrad.addColorStop(0.35, '#FEF08A');
    titleGrad.addColorStop(0.75, '#F5D061');
    titleGrad.addColorStop(1, '#D97706');
    ctx.lineWidth = 3.8;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(26, 12, 3, 0.96)';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 10;
    const headerText = `✦ THĂNG CẤP · CẤP ${fx.level} ✦`;
    ctx.strokeText(headerText, 0, 0);
    ctx.fillStyle = titleGrad;
    ctx.fillText(headerText, 0, 0);

    // Compact stat gain / skill unlock subline
    ctx.shadowBlur = 5;
    ctx.font = '700 9.5px "Be Vietnam Pro", sans-serif';
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = 'rgba(10, 8, 6, 0.94)';
    const subLine = fx.unlockedLabel ? `★ ${fx.unlockedLabel}` : fx.statSummary;
    ctx.strokeText(subLine, 0, 15);
    ctx.fillStyle = fx.unlockedLabel ? '#86EFAC' : '#FEF3C7';
    ctx.fillText(subLine, 0, 15);

    ctx.restore();
  }

  ctx.restore();
}


