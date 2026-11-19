import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Coins,
  Sparkles,
  X,
} from 'lucide-react';
import { CHEST_TIER_META, CHEST_TIER_ORDER, QUALITY_META, SLOT_LABELS } from '../game/data';
import { formatNumber } from '../game/engine';
import { soundEngine } from '../game/sound';
import {
  ChestOpenResult,
  ChestTier,
  EquipmentItem,
  PlayerState,
} from '../game/types';
import { PixelItemIcon } from './PixelItemIcon';

interface TreasureChestOverlayProps {
  result: ChestOpenResult;
  sessionId: number;
  player: PlayerState;
  onClose: () => void;
  onOpenNext: (tier: ChestTier) => void;
  onEquipNow: (itemId: string) => void;
}

type OpenPhase = 'charging' | 'burst' | 'reveal';

const SPARK_POSITIONS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 + (i % 2 === 0 ? 0.12 : -0.08);
  const dist = 115 + (i % 3) * 48;
  return {
    id: i,
    tx: Math.round(Math.cos(angle) * dist),
    ty: Math.round(Math.sin(angle) * dist),
    size: i % 3 === 0 ? 10 : i % 2 === 0 ? 7 : 5,
    delay: (i % 4) * 0.025,
  };
});

const TWINKLE_STARS = [
  { top: '8%', left: '12%', delay: '0s', size: 14 },
  { top: '14%', right: '14%', delay: '0.28s', size: 18 },
  { top: '34%', left: '6%', delay: '0.52s', size: 12 },
  { top: '28%', right: '7%', delay: '0.16s', size: 14 },
  { bottom: '20%', left: '10%', delay: '0.42s', size: 16 },
  { bottom: '16%', right: '11%', delay: '0.64s', size: 13 },
];

export const TreasureChestOverlay: React.FC<TreasureChestOverlayProps> = ({
  result,
  sessionId,
  player,
  onClose,
  onOpenNext,
  onEquipNow,
}) => {
  const [phase, setPhase] = useState<OpenPhase>('charging');
  const [equippedIds, setEquippedIds] = useState<Record<string, boolean>>({});

  const tierMeta = CHEST_TIER_META[result.tier];
  const isLegendaryOutcome =
    result.tier === 'imperial_gold' ||
    result.equipment.quality === 'gold' ||
    result.equipment.quality === 'mythic' ||
    result.bonusEquipment?.quality === 'gold' ||
    result.bonusEquipment?.quality === 'mythic';

  // Run multi-stage suspense -> strobe burst -> reveal choreography whenever a new chest opens
  useEffect(() => {
    setPhase('charging');
    setEquippedIds({});
    soundEngine.playChestShake();

    const tBurst = window.setTimeout(() => {
      setPhase('burst');
      soundEngine.playChestOpen(isLegendaryOutcome);
    }, 860);

    const tReveal = window.setTimeout(() => {
      setPhase('reveal');
    }, 1160);

    return () => {
      window.clearTimeout(tBurst);
      window.clearTimeout(tReveal);
    };
  }, [sessionId, isLegendaryOutcome]);

  // Keyboard shortcuts: Space/Enter skips charge or closes when revealed; Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (phase === 'charging') {
          e.preventDefault();
          e.stopPropagation();
          setPhase('reveal');
          soundEngine.playChestOpen(isLegendaryOutcome);
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [phase, isLegendaryOutcome, onClose]);

  const nextAvailableTier: ChestTier | null = useMemo(() => {
    if ((player.treasureChests[result.tier] || 0) > 0) return result.tier;
    for (const t of CHEST_TIER_ORDER) {
      if ((player.treasureChests[t] || 0) > 0) return t;
    }
    return null;
  }, [player.treasureChests, result.tier]);

  const totalRemaining =
    (player.treasureChests.imperial_gold || 0) +
    (player.treasureChests.purple_gold || 0) +
    (player.treasureChests.iron || 0);

  const skipToReveal = () => {
    if (phase === 'charging') {
      soundEngine.playChestOpen(isLegendaryOutcome);
      setPhase('reveal');
    }
  };

  const handleEquipClick = (item: EquipmentItem) => {
    onEquipNow(item.id);
    setEquippedIds((prev) => ({ ...prev, [item.id]: true }));
  };

  const renderEquipCard = (item: EquipmentItem, isBonus = false, cardIndex = 1) => {
    const qMeta = QUALITY_META[item.quality];
    const currentInSlot = player.equipment[item.slot];
    const powerDelta = item.power - (currentInSlot ? currentInSlot.power : 0);
    const alreadyEquipped =
      equippedIds[item.id] || player.equipment[item.slot]?.id === item.id;
    const isHighRarity =
      item.quality === 'mythic' || item.quality === 'gold' || item.quality === 'purple';

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 26, scale: 0.84 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22, delay: cardIndex * 0.11 }}
        className={`relative overflow-hidden rounded-lg border bg-[#17110D]/95 p-3.5 text-left ${
          isHighRarity ? 'animate-chest-strobe' : ''
        }`}
        style={{
          borderColor: qMeta.color,
          boxShadow: isHighRarity
            ? `0 0 24px ${qMeta.color}66, inset 0 0 18px ${qMeta.color}22`
            : `0 0 14px ${qMeta.color}33`,
        }}
      >
        {/* Diagonal light glint shimmer sweep */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="animate-chest-shimmer absolute inset-y-0 w-1/3"
            style={{
              background: `linear-gradient(90deg, transparent, ${qMeta.color}44, rgba(255,255,255,0.45), ${qMeta.color}44, transparent)`,
            }}
          />
        </div>

        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <PixelItemIcon
              slot={item.slot}
              quality={item.quality}
              itemName={item.name}
              sectId={player.sect}
              enhance={item.enhance}
              size="md"
            />
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: qMeta.color }}
                >
                  {qMeta.name} · {SLOT_LABELS[item.slot]}
                </span>
                {isBonus && (
                  <span className="rounded bg-[#78350F] px-1.5 py-0.5 text-[9px] font-bold text-[#FEF08A]">
                    KỲ NGỘ
                  </span>
                )}
              </div>
              <div
                className="font-wuxia text-lg font-bold leading-tight"
                style={{ color: qMeta.color }}
              >
                {item.name}
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-xs tabular-nums">
            <div className="text-[10px] text-[#A89B86]">Lực Chiến</div>
            <div className="font-bold text-[#F5D061]">{formatNumber(item.power)}</div>
            {powerDelta !== 0 && !alreadyEquipped && (
              <div
                className={`text-[10px] font-semibold ${
                  powerDelta > 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'
                }`}
              >
                {powerDelta > 0 ? `+${formatNumber(powerDelta)}` : formatNumber(powerDelta)}
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 mt-2.5 grid grid-cols-4 gap-1.5 rounded bg-[#0F0B09]/85 px-2.5 py-1.5 font-mono text-[11px] tabular-nums">
          <div className="text-[#F87171]">Công +{item.atk}</div>
          <div className="text-[#F5D061]">Thủ +{item.def}</div>
          <div className="text-[#4ADE80]">HP +{item.hp}</div>
          <div className="text-[#FBBF24]">CM +{item.crit}%</div>
        </div>

        <div className="relative z-10 mt-2.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#9A8C78]">
            Yêu cầu Cấp {item.levelReq}
          </span>
          {alreadyEquipped ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4ADE80]">
              <Check className="h-3.5 w-3.5" />
              Đã Trang Bị
            </span>
          ) : (
            <button
              onClick={() => handleEquipClick(item)}
              className={`rounded border px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                powerDelta > 0
                  ? 'border-[#D4AF37] bg-[#8F1D1D] text-[#FEF3C7] hover:bg-[#A82323]'
                  : 'border-[#5B4527] bg-[#241A12] text-[#E5D8C0] hover:border-[#D4AF37] hover:text-[#F5D061]'
              }`}
            >
              {powerDelta > 0 ? 'Trang Bị Ngay ▲' : 'Trang Bị'}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/78 p-4 backdrop-blur-[3px]"
      onClick={phase === 'charging' ? skipToReveal : undefined}
    >
      {/* Fullscreen celebratory flash burst at exact moment lid flies open */}
      <AnimatePresence>
        {phase === 'burst' && (
          <motion.div
            key="strobe-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.92, 0.32, 0.78, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.34, times: [0, 0.18, 0.42, 0.65, 1] }}
            className="pointer-events-none fixed inset-0 z-50"
            style={{
              background: `radial-gradient(circle at 50% 45%, #FFFFFF 0%, ${tierMeta.accentColor}CC 28%, ${tierMeta.color}55 58%, transparent 82%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Ceremony Stage */}
      <motion.div
        key={sessionId}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-xl overflow-hidden rounded-lg border border-[#785A34] bg-gradient-to-b from-[#1D1510] via-[#130E0B] to-[#0E0A08] p-6 text-center shadow-[0_0_60px_rgba(0,0,0,0.92)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rotating god-rays background */}
        <div className="pointer-events-none absolute left-1/2 top-28 -translate-x-1/2 -translate-y-1/2">
          <div
            className={`h-[440px] w-[440px] rounded-full opacity-55 ${
              phase === 'charging' ? 'animate-chest-ray-fast' : 'animate-chest-ray'
            }`}
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${tierMeta.color}44 16deg, transparent 34deg, ${tierMeta.accentColor}35 56deg, transparent 78deg, ${tierMeta.color}44 104deg, transparent 132deg, ${tierMeta.accentColor}30 164deg, transparent 196deg, ${tierMeta.color}48 228deg, transparent 262deg, ${tierMeta.accentColor}35 296deg, transparent 330deg, ${tierMeta.color}40 360deg)`,
              maskImage: 'radial-gradient(circle, black 22%, transparent 72%)',
              WebkitMaskImage: 'radial-gradient(circle, black 22%, transparent 72%)',
            }}
          />
        </div>

        {/* Twinkling 4-point sparkle stars around frame */}
        {TWINKLE_STARS.map((st, idx) => (
          <Sparkles
            key={idx}
            className="animate-chest-twinkle pointer-events-none absolute"
            style={{
              top: st.top,
              left: st.left,
              right: st.right,
              bottom: st.bottom,
              width: st.size,
              height: st.size,
              color: idx % 2 === 0 ? tierMeta.accentColor : tierMeta.color,
              animationDelay: st.delay,
            }}
          />
        ))}

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Đóng rương báu"
          className="absolute right-3.5 top-3.5 z-20 rounded border border-[#443322] bg-[#1A130E]/90 p-1.5 text-[#B5A68E] hover:border-[#D4AF37] hover:text-[#FEF3C7] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Title */}
        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[0.2em] uppercase"
            style={{ color: tierMeta.accentColor }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {phase === 'charging'
                ? 'ĐANG KHAI ẤN BẢO RƯƠNG...'
                : isLegendaryOutcome
                ? 'KIM QUANG XUẤT THẾ · CỰC PHẨM GIÁNG LÂM'
                : 'KHAI RƯƠNG ĐẠI CÁT · THU HOẠCH BÁU VẬT'}
            </span>
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h2
            className="font-wuxia mt-1 text-3xl font-bold tracking-wide"
            style={{
              color: tierMeta.color,
              textShadow: `0 0 18px ${tierMeta.glowColor}`,
            }}
          >
            {tierMeta.name}
          </h2>
        </div>

        {/* Central Animated Ornate Wuxia Chest */}
        <div
          className="relative z-10 mx-auto my-4 flex h-36 w-52 items-center justify-center cursor-pointer"
          onClick={skipToReveal}
          title={phase === 'charging' ? 'Nhấn để mở ngay' : undefined}
        >
          {/* Blinking Aura Halo behind chest */}
          <div
            className={`pointer-events-none absolute h-32 w-32 rounded-full blur-2xl ${
              phase === 'charging' ? 'animate-chest-flash' : ''
            }`}
            style={{
              backgroundColor: tierMeta.color,
              opacity: phase === 'reveal' ? 0.35 : 0.72,
            }}
          />

          {/* Shockwave Ring on Burst */}
          <AnimatePresence>
            {phase !== 'charging' && (
              <motion.div
                key={`ring-${sessionId}`}
                initial={{ scale: 0.35, opacity: 1 }}
                animate={{ scale: 2.3, opacity: 0 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                className="pointer-events-none absolute h-28 w-28 rounded-full border-4"
                style={{
                  borderColor: tierMeta.accentColor,
                  boxShadow: `0 0 28px ${tierMeta.color}`,
                }}
              />
            )}
          </AnimatePresence>

          {/* Burst Particle Sparks */}
          {phase !== 'charging' &&
            SPARK_POSITIONS.map((sp) => (
              <motion.div
                key={`sp-${sessionId}-${sp.id}`}
                initial={{ x: 0, y: 4, scale: 0.3, opacity: 1 }}
                animate={{ x: sp.tx, y: sp.ty, scale: [0.6, 1.35, 0], opacity: [1, 1, 0] }}
                transition={{ duration: 0.75, delay: sp.delay, ease: 'easeOut' }}
                className="pointer-events-none absolute rounded-full"
                style={{
                  width: sp.size,
                  height: sp.size,
                  backgroundColor: sp.id % 2 === 0 ? '#FEF9C3' : tierMeta.color,
                  boxShadow: `0 0 12px ${tierMeta.color}`,
                }}
              />
            ))}

          {/* Glowing vertical treasure beam when opened */}
          {phase !== 'charging' && (
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: [0.95, 0.55, 0.85] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
              className="pointer-events-none absolute bottom-12 h-32 w-24 origin-bottom blur-md"
              style={{
                background: `linear-gradient(to top, ${tierMeta.accentColor}DD, ${tierMeta.color}66, transparent)`,
              }}
            />
          )}

          {/* Custom Ornate Wuxia Chest SVG */}
          <motion.div
            animate={
              phase === 'charging'
                ? {
                    x: [0, -5, 6, -8, 9, -10, 10, -7, 7, 0],
                    rotate: [0, -3, 3.5, -5, 5, -6, 6, -4, 4, 0],
                    scale: [1, 1.03, 0.99, 1.07, 1.02, 1.11, 1.08, 1.15],
                  }
                : {
                    x: 0,
                    rotate: 0,
                    scale: 1,
                  }
            }
            transition={
              phase === 'charging'
                ? { duration: 0.85, ease: 'easeInOut' }
                : { type: 'spring', stiffness: 260, damping: 18 }
            }
            className="relative"
          >
            <svg
              width="148"
              height="124"
              viewBox="0 0 148 124"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-[0_12px_20px_rgba(0,0,0,0.85)]"
            >
              {/* Chest Ground Shadow */}
              <ellipse cx="74" cy="112" rx="56" ry="9" fill="rgba(0,0,0,0.55)" />

              {/* Chest Base Body */}
              <rect
                x="20"
                y="58"
                width="108"
                height="50"
                rx="6"
                fill={
                  result.tier === 'imperial_gold'
                    ? '#4B1410'
                    : result.tier === 'purple_gold'
                    ? '#2A1238'
                    : '#162433'
                }
                stroke={tierMeta.color}
                strokeWidth="3.5"
              />
              {/* Decorative Gold Vertical Bands on Base */}
              <rect x="34" y="59" width="10" height="48" fill={tierMeta.color} fillOpacity="0.82" />
              <rect x="104" y="59" width="10" height="48" fill={tierMeta.color} fillOpacity="0.82" />
              {/* Corner Rivets */}
              <circle cx="28" cy="66" r="2.6" fill={tierMeta.accentColor} />
              <circle cx="120" cy="66" r="2.6" fill={tierMeta.accentColor} />
              <circle cx="28" cy="100" r="2.6" fill={tierMeta.accentColor} />
              <circle cx="120" cy="100" r="2.6" fill={tierMeta.accentColor} />

              {/* Inner Radiant Treasure Light Seam */}
              <rect
                x="24"
                y="54"
                width="100"
                height="9"
                rx="4"
                fill={phase === 'charging' ? tierMeta.accentColor : '#FFFFFF'}
                fillOpacity={phase === 'charging' ? '0.88' : '1'}
              />

              {/* Animated Chest Lid */}
              <motion.g
                style={{ originX: '74px', originY: '56px' }}
                animate={
                  phase === 'charging'
                    ? { y: [0, -2, 0, -4, 0, -6], rotate: 0 }
                    : { y: -24, rotate: -14 }
                }
                transition={
                  phase === 'charging'
                    ? { duration: 0.85, ease: 'easeIn' }
                    : { type: 'spring', stiffness: 280, damping: 16 }
                }
              >
                <path
                  d="M16 56 C16 30, 34 22, 74 22 C114 22, 132 30, 132 56 Z"
                  fill={
                    result.tier === 'imperial_gold'
                      ? '#691912'
                      : result.tier === 'purple_gold'
                      ? '#3B1952'
                      : '#1E3348'
                  }
                  stroke={tierMeta.color}
                  strokeWidth="3.5"
                />
                {/* Gold Ribs on Lid */}
                <path
                  d="M35 55 C35 34, 42 25, 45 24 L53 23 C50 26, 45 35, 45 55 Z"
                  fill={tierMeta.color}
                  fillOpacity="0.85"
                />
                <path
                  d="M113 55 C113 34, 106 25, 103 24 L95 23 C98 26, 103 35, 103 55 Z"
                  fill={tierMeta.color}
                  fillOpacity="0.85"
                />
                {/* Top Crest Jewel */}
                <polygon
                  points="74,27 82,36 74,45 66,36"
                  fill={tierMeta.accentColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              </motion.g>

              {/* Center Imperial Lock Medallion */}
              <circle
                cx="74"
                cy="66"
                r="13"
                fill="#1A120C"
                stroke={tierMeta.color}
                strokeWidth="3"
              />
              <circle
                cx="74"
                cy="66"
                r="6"
                fill={phase === 'charging' ? '#FFFFFF' : tierMeta.accentColor}
              />
            </svg>
          </motion.div>
        </div>

        {/* Phase-specific Body */}
        {phase !== 'reveal' ? (
          <div className="relative z-10 py-6">
            <div
              className="animate-chest-flash font-wuxia text-xl font-bold tracking-wide"
              style={{ color: tierMeta.accentColor }}
            >
              Linh Khí Đang Tụ Hội · Sắp Phá Phong Ấn!
            </div>
            <div className="mt-1.5 text-xs text-[#9A8C78]">
              (Nhấn vào rương hoặc phím Space để mở tức thì)
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 space-y-3"
          >
            {/* Enhance Stones & Currency Highlight Strip */}
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
            >
              {/* Đá Cường Hóa Card with special blinking shimmer */}
              <div className="animate-chest-strobe relative flex items-center justify-between overflow-hidden rounded-lg border border-[#F59E0B] bg-[#1E150E] px-3.5 py-2.5">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div
                    className="animate-chest-shimmer absolute inset-y-0 w-1/3"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, rgba(254,240,138,0.42), transparent)',
                    }}
                  />
                </div>
                <div className="relative z-10 flex items-center gap-2.5 text-left">
                  <PixelItemIcon slot="stone" quality="gold" itemName="Đá Cường Hóa" size="md" />
                  <div>
                    <div className="text-[10px] font-bold tracking-wider text-[#FBBF24] uppercase">
                      Nguyên Liệu Rèn
                    </div>
                    <div className="text-sm font-bold text-[#FEF3C7]">Đá Cường Hóa</div>
                  </div>
                </div>
                <div className="relative z-10 font-mono text-xl font-extrabold text-[#FDE047] tabular-nums">
                  +{result.enhanceStones}
                </div>
              </div>

              {/* Silver & Gold Ingots Card */}
              <div className="relative flex items-center justify-between overflow-hidden rounded-lg border border-[#5B4527] bg-[#19130E] px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded border border-[#785A34] bg-[#291D11]">
                    <Coins className="h-5 w-5 text-[#F5D061]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold tracking-wider text-[#A89B86] uppercase">
                      Ngân Lượng
                    </div>
                    <div className="font-mono text-sm font-bold text-[#FEF3C7] tabular-nums">
                      +{formatNumber(result.silver)} Bạc
                    </div>
                  </div>
                </div>
                {result.goldIngots > 0 && (
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-[10px] text-[#F5D061]">Nguyên Bảo</div>
                    <div className="text-sm font-bold text-[#FDE047]">
                      +{result.goldIngots} NB
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Primary Equipment Drop Card */}
            {renderEquipCard(result.equipment, false, 1)}

            {/* Bonus Equipment Drop (if triggered) */}
            {result.bonusEquipment && renderEquipCard(result.bonusEquipment, true, 2)}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {nextAvailableTier && (
                <button
                  onClick={() => onOpenNext(nextAvailableTier)}
                  className="animate-chest-hud-blink flex items-center gap-2 rounded border border-[#F5D061] bg-gradient-to-b from-[#991B1B] to-[#6B1212] px-5 py-2.5 text-xs font-bold text-[#FEF3C7] transition-transform hover:scale-[1.02] hover:brightness-110 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-[#FDE047]" />
                  <span>
                    Mở Tiếp {CHEST_TIER_META[nextAvailableTier].shortName} (Còn {totalRemaining})
                  </span>
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded border border-[#5B4527] bg-[#211812] px-5 py-2.5 text-xs font-semibold text-[#E5D8C0] hover:border-[#D4AF37] hover:text-[#FEF3C7] cursor-pointer"
              >
                Thu Vào Hành Trang
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
