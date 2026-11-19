import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MANTLES, MOUNTS, MOUNT_ILLUSIONS, QUALITY_META } from '../game/data';
import { getCharacterRealm } from '../game/engine';
import { drawDynamicShadow, drawPixelHero, drawPixelMount } from '../game/pixelRenderer';
import {
  ANIM_CLIPS,
  AnimState,
  Direction8,
  inferWeaponKind,
  spriteAtlas,
} from '../game/spriteAtlas';
import {
  EquipSlot,
  EquipmentItem,
  ItemQuality,
  MountDef,
  MountIllusionDef,
  PlayerState,
  SectId,
} from '../game/types';

interface PixelItemIconProps {
  slot: EquipSlot | 'stone' | 'potion';
  quality: ItemQuality;
  itemName?: string;
  sectId?: SectId;
  enhance?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const PixelItemIcon: React.FC<PixelItemIconProps> = ({
  slot,
  quality,
  itemName,
  sectId,
  enhance = 0,
  size = 'md',
}) => {
  const weaponKind = slot === 'weapon' ? inferWeaponKind(itemName, sectId) : 'sword';
  const dataUrl = useMemo(
    () => spriteAtlas.getItemIconDataUrl(slot, quality, weaponKind),
    [slot, quality, weaponKind]
  );

  const qMeta = QUALITY_META[quality] || QUALITY_META.white;
  const dimClass =
    size === 'xs'
      ? 'h-8 w-8'
      : size === 'sm'
      ? 'h-9 w-9'
      : size === 'lg'
      ? 'h-14 w-14'
      : 'h-11 w-11';
  const imgClass =
    size === 'xs'
      ? 'h-6 w-6'
      : size === 'sm'
      ? 'h-7 w-7'
      : size === 'lg'
      ? 'h-11 w-11'
      : 'h-8 w-8';

  const isHighRarity = quality === 'purple' || quality === 'gold' || quality === 'mythic';
  const hasSoftGlow = enhance >= 5 && enhance < 8;
  const hasBrightGlow = enhance >= 8 && enhance < 10;
  const hasHalo = enhance >= 10;
  const hasMythicParticles = enhance >= 12 || quality === 'mythic';

  const boxShadow = hasMythicParticles
    ? `0 0 18px ${qMeta.color}, inset 0 0 12px ${qMeta.color}66`
    : hasHalo
    ? `0 0 14px ${qMeta.color}CC, inset 0 0 10px ${qMeta.color}44`
    : hasBrightGlow
    ? `0 0 10px ${qMeta.color}99, inset 0 0 8px ${qMeta.color}33`
    : hasSoftGlow || isHighRarity
    ? `0 0 8px ${qMeta.glow}`
    : 'none';

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded border bg-[#140F0C] ${dimClass} ${
        hasMythicParticles ? 'animate-chest-strobe' : ''
      }`}
      style={{
        borderColor: qMeta.color,
        boxShadow,
      }}
      title={`${qMeta.name}${enhance > 0 ? ` · Cường Hóa +${enhance}` : ''}`}
    >
      {/* Rarity Radial Tint */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${qMeta.color}, transparent 75%)`,
        }}
      />

      {/* +10 Rotating Halo Ring */}
      {hasHalo && (
        <div
          className="animate-chest-ray pointer-events-none absolute inset-0.5 rounded-full border border-dashed opacity-75"
          style={{ borderColor: enhance >= 12 ? '#FEF08A' : qMeta.color }}
        />
      )}

      {/* Shimmer Sweep for Sử Thi / Truyền Thuyết / Thần Khí or +8+ */}
      {(isHighRarity || enhance >= 8) && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="animate-chest-shimmer absolute inset-y-0 w-1/2"
            style={{
              background: `linear-gradient(90deg, transparent, ${qMeta.color}55, transparent)`,
            }}
          />
        </div>
      )}

      {/* Crisp Pixel-Art Icon Sprite */}
      <img
        src={dataUrl}
        alt={itemName || slot}
        className={`relative z-10 select-none ${imgClass}`}
        style={{ imageRendering: 'pixelated' }}
        draggable={false}
      />

      {/* +12 / Thần Khí Corner Energy Sparks */}
      {hasMythicParticles && (
        <>
          <span
            className="animate-chest-twinkle pointer-events-none absolute left-1 top-1 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: '#FEF08A' }}
          />
          <span
            className="animate-chest-twinkle pointer-events-none absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: qMeta.color, animationDelay: '0.4s' }}
          />
        </>
      )}

      {/* Enhance Level Corner Tag */}
      {enhance > 0 && (
        <span
          className="absolute bottom-0 right-0 z-20 rounded-tl bg-black/82 px-1 font-mono text-[9px] font-bold leading-tight tabular-nums"
          style={{
            color:
              enhance >= 12
                ? '#FEF08A'
                : enhance >= 10
                ? '#FB7185'
                : enhance >= 8
                ? '#F5D061'
                : '#E5D8C0',
          }}
        >
          +{enhance}
        </span>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Live Animated HD Pixel Art Character + Layered Equipment + Mount Preview
// ---------------------------------------------------------------------------
interface PixelHeroPreviewProps {
  sectId: SectId;
  player?: PlayerState;
  equipment?: Partial<Record<EquipSlot, EquipmentItem | null>>;
  width?: number;
  height?: number;
  interactive?: boolean;
  transparentBg?: boolean;
  scale?: number;
  dirOverride?: Direction8;
  animOverride?: 'idle' | 'walk' | 'attack' | 'hit';
  onDirChange?: (dir: Direction8) => void;
  hideControls?: boolean;
}

export const PixelHeroPreview: React.FC<PixelHeroPreviewProps> = ({
  sectId,
  player,
  equipment,
  width = 160,
  height = 148,
  interactive = true,
  transparentBg = false,
  scale,
  dirOverride,
  animOverride,
  onDirChange,
  hideControls = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalDirIdx, setInternalDirIdx] = useState<Direction8>(1); // SE default showcase angle
  const [internalDemoAnim, setInternalDemoAnim] = useState<'idle' | 'walk' | 'attack' | 'hit'>('idle');

  const dirIdx = dirOverride ?? internalDirIdx;
  const demoAnim = animOverride ?? internalDemoAnim;

  const rotateNext = () => {
    const next = ((dirIdx + 1) % 8) as Direction8;
    if (onDirChange) onDirChange(next);
    else setInternalDirIdx(next);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;
    let last = performance.now();

    const mount =
      player?.isMounted && player?.activeMountId
        ? MOUNTS.find((m) => m.id === player.activeMountId) || null
        : null;
    const illusion =
      mount && player?.activeMountIllusionId
        ? MOUNT_ILLUSIONS.find((x) => x.id === player.activeMountIllusionId) || null
        : null;
    const illusionStars = illusion && player ? player.mountIllusions?.[illusion.id] || 1 : 0;
    const realm = player ? getCharacterRealm(player) : null;
    const mantle = player
      ? MANTLES.find((m) => m.id === player.mantleId) || MANTLES[0]
      : MANTLES[0];

    const animState: AnimState =
      demoAnim === 'attack'
        ? 'attack'
        : demoAnim === 'hit'
        ? 'hit'
        : demoAnim === 'walk'
        ? 'walk'
        : mount
        ? 'mount'
        : 'idle';
    const clip = ANIM_CLIPS[animState];
    let frameTimer = 0;
    let frameIndex = 0;

    const effectiveScale = scale ?? (mount ? 1.1 : 1.25);

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      phase += dt * 5;
      frameTimer += dt;
      const frameDur = 1 / Math.max(1, clip.fps);
      if (frameTimer >= frameDur) {
        frameTimer -= frameDur;
        frameIndex = (frameIndex + 1) % clip.frames;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = false;

      const cx = width / 2;
      const cy = transparentBg ? height * 0.68 : height * 0.66;
      const shadowScale = effectiveScale / 1.25;

      drawDynamicShadow(
        ctx,
        cx,
        cy + Math.round(18 * shadowScale),
        Math.round((mount ? 34 : 22) * shadowScale),
        Math.round((mount ? 11 : 8) * shadowScale),
        0
      );

      let riderY = cy;
      if (mount) {
        const res = drawPixelMount(ctx, {
          x: cx,
          y: cy + 4,
          dir8: dirIdx,
          animPhase: phase,
          frameIndex: Math.floor(phase * 1.4) % (demoAnim === 'walk' ? 6 : 4),
          isMoving: demoAnim === 'walk',
          mount,
          illusion,
          illusionStars,
        });
        riderY = cy + 4 + res.riderOffsetY;
      }

      drawPixelHero(ctx, {
        x: cx,
        y: riderY,
        sectId,
        dir8: dirIdx,
        animState,
        animPhase: phase,
        frameIndex,
        attackProgress: demoAnim === 'attack' ? frameIndex / Math.max(1, clip.frames - 1) : 0,
        castProgress: 0,
        hitFlash: demoAnim === 'hit' && frameIndex === 0 ? 0.14 : 0,
        equipment: equipment || player?.equipment,
        realmTier: realm?.tier ?? 1,
        mantleId: player?.mantleId ?? 0,
        mantleColor: mantle.color,
        isMounted: !!mount,
        scale: effectiveScale,
      });

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [sectId, player, equipment, width, height, dirIdx, demoAnim, transparentBg, scale]);

  return (
    <div className="relative flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={() => interactive && rotateNext()}
        title={interactive ? 'Nhấn để xoay 8 hướng nhân vật' : undefined}
        className={
          transparentBg
            ? interactive
              ? 'cursor-pointer'
              : ''
            : `rounded border border-[#493725] bg-[radial-gradient(circle_at_50%_60%,#261B14_0%,#120D0A_78%)] ${
                interactive ? 'cursor-pointer hover:border-[#D4AF37]' : ''
              }`
        }
        style={{ imageRendering: 'pixelated' }}
      />
      {interactive && !hideControls && (
        <div className="mt-1.5 flex items-center gap-1">
          <button
            type="button"
            onClick={rotateNext}
            className="rounded border border-[#443322] bg-[#1B1410] px-2 py-0.5 text-[10px] text-[#C7B89E] hover:border-[#D4AF37] hover:text-[#F5D061] cursor-pointer"
          >
            Xoay 8 Hướng
          </button>
          <button
            type="button"
            onClick={() =>
              setInternalDemoAnim((a) =>
                a === 'idle' ? 'walk' : a === 'walk' ? 'attack' : a === 'attack' ? 'hit' : 'idle'
              )
            }
            className="rounded border border-[#443322] bg-[#1B1410] px-2 py-0.5 text-[10px] text-[#C7B89E] hover:border-[#D4AF37] hover:text-[#F5D061] cursor-pointer"
          >
            {demoAnim === 'idle'
              ? 'Thế: Đứng'
              : demoAnim === 'walk'
              ? 'Thế: Đi Bộ'
              : demoAnim === 'attack'
              ? 'Thế: Xuất Chiêu'
              : 'Thế: Trúng Đòn'}
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Live Animated HD Pixel Art Mount & Mount Evolution Preview (#8 & #9)
// ---------------------------------------------------------------------------
interface PixelMountPreviewProps {
  mount: MountDef;
  illusion?: MountIllusionDef | null;
  illusionStars?: number;
  width?: number;
  height?: number;
  isMoving?: boolean;
}

export const PixelMountPreview: React.FC<PixelMountPreviewProps> = ({
  mount,
  illusion = null,
  illusionStars = 1,
  width = 112,
  height = 84,
  isMoving = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      phase += dt * 4.5;

      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = false;

      const cx = width / 2;
      const cy = height * 0.6;
      drawDynamicShadow(ctx, cx, cy + 16, illusion ? 32 : 28, 9, 0);
      drawPixelMount(ctx, {
        x: cx,
        y: cy + 2,
        dir8: 0,
        animPhase: phase,
        isMoving,
        mount,
        illusion,
        illusionStars,
      });

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [mount, illusion, illusionStars, width, height, isMoving]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="shrink-0 rounded border border-[#3E2F20] bg-[radial-gradient(circle_at_50%_62%,#241913_0%,#110C09_80%)]"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
