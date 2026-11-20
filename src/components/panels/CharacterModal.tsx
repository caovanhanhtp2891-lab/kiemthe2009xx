import React, { useMemo, useRef, useState } from 'react';
import {
  ELEMENT_META,
  MANTLES,
  MOUNTS,
  MOUNT_ILLUSIONS,
  QUALITY_META,
  SECTS,
  SLOT_LABELS,
  TITLES,
} from '../../game/data';
import {
  formatNumber,
  getCharacterRealm,
  getEffectiveItemStats,
  getEnhanceCost,
  getIllusionStats,
  getIllusionUpgradeCost,
} from '../../game/engine';
import {
  ComputedStats,
  ElementType,
  EquipSlot,
  EquipmentItem,
  PlayerState,
} from '../../game/types';
import { PixelHeroPreview, PixelItemIcon, PixelMountPreview } from '../PixelItemIcon';
import {
  ArrowLeft,
  ArrowRightLeft,
  BookOpen,
  Crown,
  Hammer,
  Shield,
  Skull,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';

export type CharacterSubTab = 'equip' | 'enhance' | 'mounts';
type CharacterTab = CharacterSubTab | 'reputation' | 'title' | 'honor' | 'info' | 'wealth';

interface CharacterModalProps {
  player: PlayerState;
  stats: ComputedStats;
  guildName?: string | null;
  initialTab?: CharacterSubTab;
  zIndex?: number;
  pkPenaltyRemainSec?: number;
  onFocus?: () => void;
  onClose: () => void;
  onOpenBag: () => void;
  onOpenTitleMantle: () => void;
  onEnhanceSlot: (slot: EquipSlot) => void;
  onSelectMount: (mountId: string) => void;
  onToggleMount: () => void;
  onBuyMount: (mountId: string) => void;
  onEquipIllusion: (illusionId: string | null) => void;
  onUnlockOrUpgradeIllusion: (illusionId: string) => void;
  onCleansePk: () => void;
}

const ALL_SLOTS: EquipSlot[] = ['weapon', 'armor', 'bracer', 'ring', 'jade', 'boots'];

const TOP_CLASSIC_TABS: { id: CharacterTab; label: string }[] = [
  { id: 'equip', label: 'Thuộc tính' },
  { id: 'reputation', label: 'Danh vọng' },
  { id: 'title', label: 'Danh hiệu' },
  { id: 'honor', label: 'Vinh dự' },
  { id: 'info', label: 'Thông tin' },
  { id: 'wealth', label: 'Tài phú' },
];

type ClassicExtraSlotId =
  | 'helm'
  | 'belt'
  | 'necklace'
  | 'amulet'
  | 'book'
  | 'mask'
  | 'costume'
  | 'cloak'
  | 'mantle'
  | 'seal_element'
  | 'seal_rank'
  | 'seal_manual';

/** Authentic Kiếm Thế 2009 miniature SVG emblems for ornate golden slots */
const ClassicSlotGlyph: React.FC<{ kind: ClassicExtraSlotId; color: string }> = ({
  kind,
  color,
}) => {
  switch (kind) {
    case 'helm':
      return (
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none">
          <path
            d="M5 18c0-6 4-11 9-11s9 5 9 11l-3 3H8l-3-3Z"
            fill="url(#ktHelmG)"
            stroke="#FDE68A"
            strokeWidth="1.2"
          />
          <path d="M14 4v14M8 14h12" stroke="#FEF3C7" strokeWidth="1.2" />
          <circle cx="14" cy="11" r="2" fill={color} stroke="#FEF08A" strokeWidth="0.9" />
          <defs>
            <linearGradient id="ktHelmG" x1="14" y1="6" x2="14" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F59E0B" />
              <stop offset="1" stopColor="#78350F" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'belt':
      return (
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none">
          <rect
            x="3"
            y="10"
            width="22"
            height="8"
            rx="2"
            fill="#78350F"
            stroke="#F5D061"
            strokeWidth="1.2"
          />
          <rect
            x="10"
            y="8"
            width="8"
            height="12"
            rx="1.5"
            fill="#D97706"
            stroke="#FEF08A"
            strokeWidth="1.2"
          />
          <circle cx="14" cy="14" r="2.2" fill={color} />
        </svg>
      );
    case 'necklace':
      return (
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none">
          <path
            d="M6 7c0 6.5 3.5 11 8 11s8-4.5 8-11"
            stroke="#F5D061"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <polygon
            points="14,15 18,20 14,25 10,20"
            fill={color}
            stroke="#FEF08A"
            strokeWidth="1.2"
          />
        </svg>
      );
    case 'amulet':
      return (
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none">
          <circle cx="14" cy="14" r="9.5" fill="#1F160A" stroke="#F5D061" strokeWidth="1.3" />
          <circle cx="14" cy="14" r="6" stroke={color} strokeWidth="1.2" strokeDasharray="2.5 1.5" />
          <path d="M14 8v12M8 14h12" stroke="#FEF08A" strokeWidth="1.1" />
          <circle cx="14" cy="14" r="2.3" fill="#FDE047" />
        </svg>
      );
    case 'book':
      return (
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none">
          <rect
            x="5"
            y="4"
            width="18"
            height="20"
            rx="1.5"
            fill="#881313"
            stroke="#F5D061"
            strokeWidth="1.3"
          />
          <path d="M9 4v20" stroke="#FDE68A" strokeWidth="1.2" />
          <rect x="12" y="7" width="8" height="10" fill="#FEF3C7" fillOpacity="0.88" />
          <path d="M14 10h4M14 13h4" stroke="#7F1D1D" strokeWidth="1.1" />
        </svg>
      );
    case 'mantle':
      return (
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none">
          <path
            d="M8 6h12l3 16-9 3-9-3 3-16Z"
            fill={color}
            fillOpacity="0.82"
            stroke="#FEF08A"
            strokeWidth="1.2"
          />
          <path d="M14 6v19M9 11h10" stroke="#FEF9C3" strokeWidth="1" strokeOpacity="0.7" />
        </svg>
      );
    case 'seal_element':
      return (
        <svg viewBox="0 0 26 26" className="h-5 w-5" fill="none">
          <rect x="4" y="5" width="18" height="16" rx="1.5" fill="#182226" stroke="#D7B86A" strokeWidth="1.2" />
          <path d="M7 9h12M7 13h10M7 17h8" stroke={color} strokeWidth="1.3" />
          <circle cx="19" cy="16" r="2.3" fill="#F59E0B" />
        </svg>
      );
    case 'seal_rank':
      return (
        <svg viewBox="0 0 26 26" className="h-5 w-5" fill="none">
          <path d="M6 19h14l-1.5-5h-11L6 19Z" fill="#D97706" stroke="#FEF08A" strokeWidth="1.1" />
          <path d="M9 14l2-7h4l2 7" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.1" />
          <circle cx="13" cy="8" r="2" fill="#FEF08A" />
        </svg>
      );
    case 'seal_manual':
      return (
        <svg viewBox="0 0 26 26" className="h-5 w-5" fill="none">
          <polygon
            points="13,3 22,8 22,18 13,23 4,18 4,8"
            fill="#6B4412"
            stroke="#FDE047"
            strokeWidth="1.2"
          />
          <circle cx="13" cy="13" r="4.5" fill={color} fillOpacity="0.85" stroke="#FEF08A" strokeWidth="1" />
        </svg>
      );
    default:
      return null;
  }
};

export const CharacterModal: React.FC<CharacterModalProps> = ({
  player,
  stats,
  guildName,
  initialTab = 'equip',
  zIndex = 40,
  pkPenaltyRemainSec = 0,
  onFocus,
  onClose,
  onOpenBag,
  onOpenTitleMantle,
  onEnhanceSlot,
  onSelectMount,
  onToggleMount,
  onBuyMount,
  onEquipIllusion,
  onUnlockOrUpgradeIllusion,
  onCleansePk,
}) => {
  const [tab, setTab] = useState<CharacterTab>(initialTab);
  const [selectedSlot, setSelectedSlot] = useState<EquipSlot>('weapon');
  const [selectedSpecialInfo, setSelectedSpecialInfo] = useState<string | null>(null);
  const [showPowerDetail, setShowPowerDetail] = useState(false);
  const [showFiveElemBar, setShowFiveElemBar] = useState(true);
  const [mountSubTab, setMountSubTab] = useState<'steeds' | 'illusions'>('steeds');

  // Local potential-point interactive preview (authentic Kiếm Thế 2009 Sức / Thân / Ngoại / Nội block)
  const [pendingPot, setPendingPot] = useState({ str: 0, dex: 0, vit: 0, int: 0 });
  const [committedPot, setCommittedPot] = useState({ str: 0, dex: 0, vit: 0, int: 0 });
  const [potNotice, setPotNotice] = useState<string | null>(null);

  // Draggable window offset (anchored left so Hành Nang opens cleanly side-by-side)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  );

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const handleTitleBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onFocus?.();
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: dragOffset.x,
      origY: dragOffset.y,
    };
  };

  const handleTitleBarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setDragOffset({
      x: Math.max(-40, Math.min(window.innerWidth - 300, dragRef.current.origX + dx)),
      y: Math.max(-36, Math.min(window.innerHeight - 160, dragRef.current.origY + dy)),
    });
  };

  const handleTitleBarPointerUp = () => {
    dragRef.current = null;
  };

  const sect = SECTS[player.sect];
  const elem = ELEMENT_META[sect.element];
  const sectShort = sect.name.split(' ')[0];
  const branchLabel = sect.branches[player.branchIndex ?? 0] || sect.branches[0];
  const mantle = MANTLES.find((m) => m.id === player.mantleId) || MANTLES[0];
  const activeTitle = TITLES.find((t) => t.id === player.activeTitleId) || TITLES[0];
  const realm = getCharacterRealm(player);

  const selectedEquipped: EquipmentItem | null = player.equipment[selectedSlot];

  const activeMount = useMemo(
    () => MOUNTS.find((m) => m.id === player.activeMountId) || MOUNTS[0],
    [player.activeMountId]
  );

  const activeIllusion = useMemo(
    () =>
      player.activeMountIllusionId
        ? MOUNT_ILLUSIONS.find((il) => il.id === player.activeMountIllusionId) || null
        : null,
    [player.activeMountIllusionId]
  );

  // Standing-on-foot copy for classic Kiếm Thế paperdoll preview (mount renders in bottom-left Ngựa slot)
  const paperdollPlayer = useMemo<PlayerState>(
    () => ({ ...player, isMounted: false }),
    [player]
  );

  // Classic Kiếm Thế 2009 derived left-column attributes
  const classicStats = useMemo(() => {
    const weaponEnh = player.equipment.weapon?.enhance ?? 0;
    const totalEnh = ALL_SLOTS.reduce((acc, s) => acc + (player.equipment[s]?.enhance ?? 0), 0);

    const stamina = 960 + player.level * 12;
    const huoLi = 15000 + player.level * 1450 + player.reputation * 5;
    const jingLi = 15000 + player.level * 1450 + player.merit * 5;

    const accuracy = 420 + player.level * 28 + Math.round(stats.crit * 24) + totalEnh * 16;
    const dodgePts = 180 + player.level * 11 + Math.round(stats.dodge * 22);
    const moveSpeed = 12 + Math.round(stats.moveSpeedPct / 3);
    const atkSpeed = 35 + Math.min(85, Math.round(player.level * 0.42 + weaponEnh * 3));

    const elemBonus = (target: ElementType) => (sect.element === target ? 135 : 0);
    const baseRes = Math.round(stats.def * 1.15 + stats.allResist * 14);
    const physRes = baseRes + elemBonus('kim') + 28;
    const iceRes = baseRes + elemBonus('thuy') + 12;
    const poisonRes = baseRes + elemBonus('moc') + 46;
    const fireRes = baseRes + elemBonus('hoa') + 19;
    const thunderRes = baseRes + elemBonus('tho') + 38;

    const leftMin = Math.max(10, Math.round(stats.atk * 0.86));
    const leftMax = Math.max(leftMin + 8, Math.round(stats.atk * 0.94));
    const rightMin = Math.max(20, Math.round(stats.atk * 1.48 + weaponEnh * 42));
    const rightMax = Math.max(rightMin + 14, Math.round(stats.atk * 1.64 + weaponEnh * 54));

    // Base potential attributes (Sức / Thân / Ngoại / Nội) derived from level + sect role
    const isInternal =
      sect.element === 'thuy' ||
      sect.element === 'tho' ||
      player.sect === 'cai_bang' ||
      player.sect === 'minh_giao';
    const baseStr = Math.round(45 + player.level * (isInternal ? 1.8 : 2.6));
    const baseDex = Math.round(40 + player.level * 2.1 + stats.dodge * 2);
    const baseVit = Math.round(85 + player.level * 5.8 + stats.maxHp * 0.012);
    const baseInt = Math.round(35 + player.level * (isInternal ? 2.7 : 1.15));

    const totalEarnedPotential = Math.max(0, (player.level - 1) * 5);
    const usedCommitted =
      committedPot.str + committedPot.dex + committedPot.vit + committedPot.int;
    const usedPending = pendingPot.str + pendingPot.dex + pendingPot.vit + pendingPot.int;
    // Allow distributing up to 25 bonus preview points cleanly without negative balance
    const freePool = Math.max(0, Math.min(25, Math.floor(totalEarnedPotential / 4)) - usedCommitted - usedPending);

    return {
      stamina,
      huoLi,
      jingLi,
      accuracy,
      dodgePts,
      moveSpeed,
      atkSpeed,
      physRes,
      iceRes,
      poisonRes,
      fireRes,
      thunderRes,
      leftMin,
      leftMax,
      rightMin,
      rightMax,
      str: baseStr + committedPot.str + pendingPot.str,
      dex: baseDex + committedPot.dex + pendingPot.dex,
      vit: baseVit + committedPot.vit + pendingPot.vit,
      int: baseInt + committedPot.int + pendingPot.int,
      freePool,
      totalEnh,
    };
  }, [player, stats, sect.element, committedPot, pendingPot]);

  const adjustPotential = (key: 'str' | 'dex' | 'vit' | 'int', delta: 1 | -1) => {
    setPotNotice(null);
    if (delta > 0 && classicStats.freePool <= 0) return;
    if (delta < 0 && pendingPot[key] <= 0) return;
    setPendingPot((prev) => ({ ...prev, [key]: prev[key] + delta }));
  };

  const handleAutoPotential = () => {
    if (classicStats.freePool <= 0) {
      setPotNotice('Đã cộng hết điểm tiềm năng hiện có.');
      return;
    }
    const rem = classicStats.freePool;
    const vitShare = Math.ceil(rem * 0.5);
    const mainShare = Math.floor(rem * 0.3);
    const dexShare = Math.max(0, rem - vitShare - mainShare);
    const isInternal = sect.element === 'thuy' || sect.element === 'tho';
    setPendingPot((prev) => ({
      str: prev.str + (isInternal ? 0 : mainShare),
      dex: prev.dex + dexShare,
      vit: prev.vit + vitShare,
      int: prev.int + (isInternal ? mainShare : 0),
    }));
    setPotNotice('Đã gợi ý phân bổ theo môn phái.');
  };

  const handleConfirmPotential = () => {
    const sum = pendingPot.str + pendingPot.dex + pendingPot.vit + pendingPot.int;
    if (sum <= 0) {
      setPotNotice('Chưa có điểm thay đổi.');
      return;
    }
    setCommittedPot((prev) => ({
      str: prev.str + pendingPot.str,
      dex: prev.dex + pendingPot.dex,
      vit: prev.vit + pendingPot.vit,
      int: prev.int + pendingPot.int,
    }));
    setPendingPot({ str: 0, dex: 0, vit: 0, int: 0 });
    setPotNotice(`Đã xác nhận +${sum} điểm tiềm năng.`);
  };

  const handleCancelPotential = () => {
    setPendingPot({ str: 0, dex: 0, vit: 0, int: 0 });
    setPotNotice(null);
  };

  const selectRealSlot = (slot: EquipSlot) => {
    setSelectedSlot(slot);
    setSelectedSpecialInfo(null);
    setShowFiveElemBar(true);
  };

  const renderRealEquipSlot = (slot: EquipSlot, fallbackLabel: string) => {
    const item = player.equipment[slot];
    const isSel = selectedSlot === slot && !selectedSpecialInfo;
    const qColor = item ? QUALITY_META[item.quality].color : '#68737A';
    return (
      <button
        key={slot}
        type="button"
        onClick={() => selectRealSlot(slot)}
        title={item ? `${item.name}${item.enhance > 0 ? ` (+${item.enhance})` : ''}` : `${SLOT_LABELS[slot]} (Trống)`}
        className={`relative flex h-[38px] w-[38px] items-center justify-center rounded-[2px] border bg-[#0B0E11] cursor-pointer transition-all ${
          isSel
            ? 'border-[#FDE047] shadow-[0_0_8px_rgba(253,224,71,0.5),inset_0_0_6px_rgba(253,224,71,0.28)]'
            : 'border-[#B49449]/85 hover:border-[#F5D061]'
        }`}
        style={
          item && !isSel
            ? {
                borderColor: qColor,
                boxShadow: `inset 0 0 8px ${qColor}38`,
              }
            : undefined
        }
      >
        {item ? (
          <PixelItemIcon
            slot={item.slot}
            quality={item.quality}
            itemName={item.name}
            sectId={player.sect}
            enhance={item.enhance}
            size="sm"
          />
        ) : (
          <span className="px-0.5 text-center text-[8.5px] font-medium leading-tight text-[#6C7A82]">
            {fallbackLabel}
          </span>
        )}
      </button>
    );
  };

  const renderOrnateSlot = (
    kind: ClassicExtraSlotId,
    label: string,
    infoText: string,
    onCustomClick?: () => void,
    accentHex?: string
  ) => {
    const isSel = selectedSpecialInfo === infoText;
    return (
      <button
        type="button"
        onClick={() => {
          if (onCustomClick) {
            onCustomClick();
          } else {
            setSelectedSpecialInfo(infoText);
            setShowFiveElemBar(true);
          }
        }}
        title={`${label} — ${infoText}`}
        className={`relative flex h-[38px] w-[38px] items-center justify-center rounded-[2px] border bg-[radial-gradient(circle_at_50%_42%,#241D12_0%,#0B0D10_88%)] cursor-pointer transition-all ${
          isSel
            ? 'border-[#FDE047] shadow-[0_0_8px_rgba(253,224,71,0.45)]'
            : 'border-[#B49449]/80 hover:border-[#F5D061]'
        }`}
      >
        <ClassicSlotGlyph kind={kind} color={accentHex || elem.color} />
        <span className="pointer-events-none absolute bottom-0 right-0.5 font-mono text-[7.5px] font-bold text-[#FDE68A] drop-shadow-[0_1px_1px_#000]">
          {label}
        </span>
      </button>
    );
  };

  const totalChests =
    (player.treasureChests?.iron ?? 0) +
    (player.treasureChests?.purple_gold ?? 0) +
    (player.treasureChests?.imperial_gold ?? 0);

  return (
    <div
      onPointerDown={() => onFocus?.()}
      className="pointer-events-auto fixed left-2.5 top-[42px] flex max-h-[calc(100dvh-84px)] w-[422px] sm:w-[440px] max-w-[calc(100vw-16px)] flex-col kt-window text-[#DCE6EA] select-none"
      style={{
        zIndex,
        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
      }}
    >
      {/* Classic Kiếm Thế VNG 2009 Forest-Jade Draggable Titlebar */}
      <div
        onPointerDown={handleTitleBarPointerDown}
        onPointerMove={handleTitleBarPointerMove}
        onPointerUp={handleTitleBarPointerUp}
        onPointerCancel={handleTitleBarPointerUp}
        className="kt-titlebar relative flex shrink-0 cursor-move items-center justify-between px-2.5 py-[5px]"
      >
        <div className="flex items-center gap-1 text-[9px] text-[#9BC4AE] whitespace-nowrap">
          <span className="inline-block h-1.5 w-1.5 rotate-45 border border-[#B8E6CB]/80 bg-[#2C6B46]" />
          <span className="font-mono">{elem.name}</span>
        </div>

        <span className="font-serif text-[12.5px] font-bold tracking-wide text-[#F3FAF6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap">
          {tab === 'enhance'
            ? 'Cường hóa trang bị'
            : tab === 'mounts'
            ? 'Tuấn mã & Huyễn hóa'
            : 'Thuộc tính nhân vật'}
        </span>

        <button
          type="button"
          onClick={onClose}
          title="Đóng cửa sổ Nhân Vật (F1)"
          className="flex h-[17px] w-[17px] items-center justify-center rounded-[2px] border border-[#96A9B2]/80 bg-[#1B2B28] text-[#E2ECEF] hover:bg-[#8B1E1E] hover:text-white cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Classic 6-Tab Kiếm Thế 2009 Folder Bar: Thuộc tính | Danh vọng | Danh hiệu | Vinh dự | Thông tin | Tài phú */}
      <div className="grid shrink-0 grid-cols-6 gap-[2px] border-b border-[#63727A] bg-[#171C20] px-1.5 pt-1.5 pb-[2px]">
        {TOP_CLASSIC_TABS.map((t) => {
          const isActive =
            tab === t.id || (t.id === 'equip' && (tab === 'enhance' || tab === 'mounts'));
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-[2px] border px-1 py-[3px] text-[10px] font-medium tracking-tight whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#A7B8C0] border-b-[#252D32] bg-gradient-to-b from-[#404B52] to-[#232A2F] text-[#FEF3C7] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
                  : 'border-[#4D5A62] bg-gradient-to-b from-[#2A3136] to-[#191E22] text-[#B8C6CD] hover:border-[#809099] hover:text-[#EEF4F7]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Sub-mode Return Strip when viewing Cường hóa or Thú cưỡi */}
      {(tab === 'enhance' || tab === 'mounts') && (
        <div className="flex shrink-0 items-center justify-between border-b border-[#46535B] bg-[#141A1E] px-2 py-1 text-[10px]">
          <button
            type="button"
            onClick={() => setTab('equip')}
            className="flex items-center gap-1 rounded-[2px] border border-[#5D6E78] bg-[#212A30] px-2 py-0.5 text-[9.5px] font-semibold text-[#E8F1F5] hover:border-[#F5D061] hover:text-[#F5D061] cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="h-3 w-3" />
            Về Thuộc tính
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab('enhance')}
              className={`flex items-center gap-1 rounded-[2px] border px-2 py-0.5 text-[9.5px] font-semibold cursor-pointer whitespace-nowrap ${
                tab === 'enhance'
                  ? 'border-[#F5D061] bg-[#312512] text-[#FEF08A]'
                  : 'border-[#46555D] bg-[#192025] text-[#A2B4BD] hover:text-[#E8F1F5]'
              }`}
            >
              <Hammer className="h-2.5 w-2.5" />
              Cường hóa
            </button>
            <button
              type="button"
              onClick={() => setTab('mounts')}
              className={`flex items-center gap-1 rounded-[2px] border px-2 py-0.5 text-[9.5px] font-semibold cursor-pointer whitespace-nowrap ${
                tab === 'mounts'
                  ? 'border-[#F5D061] bg-[#312512] text-[#FEF08A]'
                  : 'border-[#46555D] bg-[#192025] text-[#A2B4BD] hover:text-[#E8F1F5]'
              }`}
            >
              <ArrowRightLeft className="h-2.5 w-2.5" />
              Thú cưỡi
            </button>
          </div>
        </div>
      )}

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#23292D] via-[#1B2024] to-[#15191C] p-1.5">
        {/* ========================================================================
            TAB 1: THUỘC TÍNH — AUTHENTIC KIẾM THẾ VNG 2009 2-COLUMN LAYOUT
           ======================================================================== */}
        {tab === 'equip' && (
          <div className="space-y-1.5">
            <div className="flex items-stretch gap-1.5">
              {/* LEFT SIDEBAR: 4 Stacked Dark Stat Boxes + Bottom "Sức chiến đấu" Button */}
              <div className="flex w-[136px] sm:w-[146px] shrink-0 flex-col justify-between gap-[4px]">
                {/* Box 1: Sinh lực / Nội lực / Thể lực / Hoạt lực / Tinh lực */}
                <div className="rounded-[2px] border border-[#56636B] bg-[#0B0E10] px-1.5 py-1.5 text-[10px] leading-[1.45] shadow-[inset_0_1px_5px_rgba(0,0,0,0.9)] tabular-nums">
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Sinh lực:</span>
                    <span className="truncate font-mono text-[9.5px] text-[#EEF4F7]">
                      {formatNumber(Math.round(player.hp))}/{formatNumber(stats.maxHp)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Nội lực:</span>
                    <span className="truncate font-mono text-[9.5px] text-[#EEF4F7]">
                      {formatNumber(Math.round(player.mp))}/{formatNumber(stats.maxMp)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Thể lực:</span>
                    <span className="truncate font-mono text-[9.5px] text-[#DCE6EA]">
                      {classicStats.stamina}/{classicStats.stamina}
                    </span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Hoạt lực:</span>
                    <span className="truncate font-mono text-[9.5px] text-[#DCE6EA]">
                      {formatNumber(classicStats.huoLi)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Tinh lực:</span>
                    <span className="truncate font-mono text-[9.5px] text-[#DCE6EA]">
                      {formatNumber(classicStats.jingLi)}
                    </span>
                  </div>
                </div>

                {/* Box 2: Chính xác / Né tránh / Tốc chạy / Tốc đánh */}
                <div className="rounded-[2px] border border-[#56636B] bg-[#0B0E10] px-1.5 py-1.5 text-[10px] leading-[1.45] shadow-[inset_0_1px_5px_rgba(0,0,0,0.9)] tabular-nums">
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Chính xác:</span>
                    <span className="font-mono text-[9.5px] text-[#EEF4F7]">
                      {classicStats.accuracy}/{classicStats.accuracy}
                    </span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Né tránh:</span>
                    <span className="font-mono text-[9.5px] text-[#EEF4F7]">
                      {classicStats.dodgePts}
                    </span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Tốc chạy:</span>
                    <span className="font-mono text-[9.5px] text-[#EEF4F7]">
                      {classicStats.moveSpeed}
                    </span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Tốc đánh:</span>
                    <span className="font-mono text-[9.5px] text-[#EEF4F7]">
                      {classicStats.atkSpeed}/0
                    </span>
                  </div>
                </div>

                {/* Box 3: Ngũ Hành Kháng (Vật / Băng / Độc / Hỏa / Lôi phòng) */}
                <div className="rounded-[2px] border border-[#56636B] bg-[#0B0E10] px-1.5 py-1.5 text-[10px] leading-[1.45] shadow-[inset_0_1px_5px_rgba(0,0,0,0.9)] tabular-nums">
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Vật phòng:</span>
                    <span className="font-mono text-[9.5px] text-[#F2E7C9]">
                      {classicStats.physRes}
                    </span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Băng phòng:</span>
                    <span className="font-mono text-[9.5px] text-[#BAE6FD]">
                      {classicStats.iceRes}
                    </span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Độc phòng:</span>
                    <span className="font-mono text-[9.5px] text-[#BBF7D0]">
                      {classicStats.poisonRes}
                    </span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Hỏa phòng:</span>
                    <span className="font-mono text-[9.5px] text-[#FECACA]">
                      {classicStats.fireRes}
                    </span>
                  </div>
                  <div className="flex justify-between gap-1">
                    <span className="text-[#C8D4DA]">Lôi phòng:</span>
                    <span className="font-mono text-[9.5px] text-[#FDE68A]">
                      {classicStats.thunderRes}
                    </span>
                  </div>
                </div>

                {/* Box 4: Lực tay trái / Lực tay phải */}
                <div className="rounded-[2px] border border-[#56636B] bg-[#0B0E10] px-1.5 py-1.5 text-[10px] leading-[1.4] shadow-[inset_0_1px_5px_rgba(0,0,0,0.9)] tabular-nums">
                  <div className="text-[#B8C6CE]">Lực tay trái:</div>
                  <div className="font-mono text-[9.5px] text-[#EEF4F7]">
                    {classicStats.leftMin} - {classicStats.leftMax}
                  </div>
                  <div className="mt-1 text-[#B8C6CE]">Lực tay phải:</div>
                  <div className="font-mono text-[9.5px] text-[#FDE68A]">
                    {classicStats.rightMin} - {classicStats.rightMax}
                  </div>
                </div>

                {/* Bottom Button: Sức chiến đấu */}
                <button
                  type="button"
                  onClick={() => setShowPowerDetail((v) => !v)}
                  title={`Tổng Lực Chiến: ${formatNumber(stats.power)}`}
                  className={`kt-btn-bronze w-full py-1 text-[10.5px] font-semibold tracking-wide cursor-pointer whitespace-nowrap ${
                    showPowerDetail ? 'border-[#F5D061] text-[#FEF08A]' : ''
                  }`}
                >
                  Sức chiến đấu
                </button>
              </div>

              {/* RIGHT PANEL: Profile + 4 Special Slots + 12-Slot Paperdoll + Potential Points */}
              <div className="flex min-w-0 flex-1 flex-col gap-[5px] rounded-[2px] border border-[#56636B] bg-[#181D21] p-1.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.65)]">
                {/* 1. Hero Portrait & 4 Identity Lines */}
                <div className="flex items-start gap-2">
                  <div
                    className="relative flex h-[48px] w-[48px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[2px] border border-[#8E9BA3] bg-[#0B0E11] shadow-[inset_0_0_8px_rgba(0,0,0,0.85)]"
                    style={{
                      background: player.avatarUrl
                        ? '#0B0E11'
                        : `radial-gradient(circle at 38% 30%, ${elem.color}42, #0C1013 78%)`,
                    }}
                  >
                    {player.avatarUrl ? (
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <span
                          className="text-[7.5px] font-bold uppercase tracking-wider leading-none"
                          style={{ color: elem.color }}
                        >
                          {elem.name}
                        </span>
                        <span className="font-serif text-[12px] font-bold leading-tight text-[#FEF3C7]">
                          {sectShort}
                        </span>
                        <span className="text-[7px] text-[#9FB2BC]">C.{player.level}</span>
                      </>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 text-[10px] leading-[1.36] tabular-nums">
                    <div className="flex items-center gap-1">
                      <span className="text-[#AEBFC7]">Tên:</span>
                      <span className="truncate font-semibold text-[#F4F8FA]">{player.name}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">
                        <span className="text-[#AEBFC7]">Phái:</span>{' '}
                        <span className="text-[#E4EEF2]">{sect.name}</span>
                      </span>
                      <span className="shrink-0">
                        <span className="text-[#AEBFC7]">Hệ:</span>{' '}
                        <span className="font-semibold" style={{ color: elem.color }}>
                          {elem.name}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span>
                        <span className="text-[#AEBFC7]">Đẳng cấp:</span>{' '}
                        <span className="font-mono text-[#F4F8FA]">{player.level}</span>
                      </span>
                      <button
                        type="button"
                        onClick={player.pkPoints > 0 ? onCleansePk : () => setTab('reputation')}
                        title={
                          player.pkPoints > 0
                            ? 'Bấm để Rửa Tội giảm Sát Khí'
                            : 'Điểm PK hiện tại'
                        }
                        className="font-mono font-bold text-[#EF4444] hover:underline cursor-pointer"
                      >
                        PK {player.pkPoints}
                      </button>
                    </div>
                    <div className="truncate">
                      <span className="text-[#AEBFC7]">Uy danh Giang Hồ:</span>{' '}
                      <span className="font-mono text-[#F5E7B8]">
                        {formatNumber(player.reputation)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Top 4 Classic Special Cosmetic / Mantle Slots (Mặt | Ngoại | Khoác | P.Phong) */}
                <div className="flex items-center justify-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSpecialInfo(`Mặt nạ · Cảnh Giới: ${realm.name}`);
                      setShowFiveElemBar(true);
                    }}
                    className="flex h-[32px] w-[36px] items-center justify-center rounded-[2px] border border-[#56636B] bg-[#0B0E10] text-[9.5px] text-[#7E8E96] hover:border-[#C5A456] hover:text-[#E5D39E] cursor-pointer shadow-[inset_0_2px_5px_rgba(0,0,0,0.92)]"
                  >
                    Mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSpecialInfo(`Ngoại trang · ${sect.name} (${branchLabel})`);
                      setShowFiveElemBar(true);
                    }}
                    className="flex h-[32px] w-[36px] items-center justify-center rounded-[2px] border border-[#56636B] bg-[#0B0E10] text-[9.5px] text-[#7E8E96] hover:border-[#C5A456] hover:text-[#E5D39E] cursor-pointer shadow-[inset_0_2px_5px_rgba(0,0,0,0.92)]"
                  >
                    Ngoại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSpecialInfo(`Áo choàng · ${activeTitle.name}`);
                      setShowFiveElemBar(true);
                    }}
                    className="flex h-[32px] w-[36px] items-center justify-center rounded-[2px] border border-[#56636B] bg-[#0B0E10] text-[9.5px] text-[#7E8E96] hover:border-[#C5A456] hover:text-[#E5D39E] cursor-pointer shadow-[inset_0_2px_5px_rgba(0,0,0,0.92)]"
                  >
                    Khoác
                  </button>
                  <button
                    type="button"
                    onClick={onOpenTitleMantle}
                    title={`Phi Phong: ${mantle.name} (Bấm để nâng cấp)`}
                    className="relative flex h-[32px] w-[36px] items-center justify-center rounded-[2px] border bg-[#12100A] cursor-pointer transition-all hover:brightness-115"
                    style={{
                      borderColor: mantle.color,
                      boxShadow: `0 0 8px ${mantle.glowColor}, inset 0 0 8px ${mantle.color}44`,
                    }}
                  >
                    <ClassicSlotGlyph kind="mantle" color={mantle.color} />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/65 text-center text-[7px] font-bold leading-tight text-[#FEF08A]">
                      P.Phong
                    </span>
                  </button>
                </div>

                {/* 3. Authentic 12-Slot Paperdoll Showcase Frame */}
                <div className="flex items-stretch gap-1">
                  {/* Left 6 Equipment Slots: Nón, Áo(real), Đai, Tay(real), Giày(real), Ngựa(real mount) */}
                  <div className="flex w-[38px] shrink-0 flex-col justify-between gap-[3px]">
                    {renderOrnateSlot(
                      'helm',
                      'Nón',
                      `Hoàng Kim Khôi · Cảnh giới ${realm.name} (+${classicStats.totalEnh} tổng cường hóa)`,
                      undefined,
                      realm.auraColor
                    )}
                    {renderRealEquipSlot('armor', 'Áo')}
                    {renderOrnateSlot(
                      'belt',
                      'Đai',
                      `Yêu Đái Ngũ Hành · Kháng tất cả +${stats.allResist}%`,
                      undefined,
                      elem.color
                    )}
                    {renderRealEquipSlot('bracer', 'Tay')}
                    {renderRealEquipSlot('boots', 'Giày')}

                    {/* Bottom-Left Iconic Mount Slot (Ngựa) */}
                    <button
                      type="button"
                      onClick={() => setTab('mounts')}
                      title={`Tuấn Mã: ${activeIllusion ? activeIllusion.name : activeMount.name} (Bấm quản lý Thú Cưỡi)`}
                      className="relative flex h-[38px] w-[38px] items-center justify-center overflow-hidden rounded-[2px] border border-[#D4AF37] bg-[radial-gradient(circle_at_50%_45%,#2A2316_0%,#0B0E11_90%)] shadow-[inset_0_0_8px_rgba(245,208,97,0.22)] hover:border-[#FEF08A] cursor-pointer"
                    >
                      <div className="pointer-events-none flex items-center justify-center scale-[0.5]">
                        <PixelMountPreview
                          mount={activeMount}
                          illusion={activeIllusion}
                          illusionStars={
                            activeIllusion ? player.mountIllusions?.[activeIllusion.id] || 1 : 0
                          }
                          width={74}
                          height={60}
                          isMoving={false}
                        />
                      </div>
                      <span className="pointer-events-none absolute bottom-0 right-0.5 font-mono text-[7px] font-bold text-[#FEF08A] drop-shadow-[0_1px_1px_#000]">
                        {player.isMounted ? 'Cưỡi' : 'Ngựa'}
                      </span>
                    </button>
                  </div>

                  {/* Center Character Showcase Column */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-[3px]">
                    {/* Top 2 Classic Beveled Buttons (Dự phòng | Cường hóa) */}
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={onOpenBag}
                        className="kt-btn-bronze py-[2px] text-[9.5px] font-medium cursor-pointer whitespace-nowrap"
                      >
                        Dự phòng
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('enhance')}
                        className="kt-btn-bronze py-[2px] text-[9.5px] font-medium cursor-pointer whitespace-nowrap"
                      >
                        Cường hóa
                      </button>
                    </div>

                    {/* 3 Recessed Mini-Slots Row (Chân nguyên | Chưa mở | Chưa mở) */}
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpecialInfo(`Chân nguyên · ${realm.name} · Công +${Math.round(stats.atk * 0.08)}`);
                          setShowFiveElemBar(true);
                        }}
                        title={`Chân nguyên: ${realm.name}`}
                        className="flex h-[34px] flex-col items-center justify-center rounded-[2px] border border-[#526068] bg-[#0B0E10] px-0.5 text-center leading-tight hover:border-[#D4AF37] cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.92)]"
                      >
                        <span className="text-[8px] font-medium text-[#B8C6CD]">Chân</span>
                        <span className="text-[8px] font-medium" style={{ color: realm.auraColor }}>
                          nguyên
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpecialInfo('Ô Chân Nguyên II · Mở khóa ở Đẳng cấp 120');
                          setShowFiveElemBar(true);
                        }}
                        className="flex h-[34px] flex-col items-center justify-center rounded-[2px] border border-[#47545C] bg-[#0A0D0F] px-0.5 text-center text-[8px] leading-tight text-[#6C7A82] cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.92)]"
                      >
                        <span>Chưa</span>
                        <span>mở</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpecialInfo('Ô Chân Nguyên III · Mở khóa ở Đẳng cấp 150');
                          setShowFiveElemBar(true);
                        }}
                        className="flex h-[34px] flex-col items-center justify-center rounded-[2px] border border-[#47545C] bg-[#0A0D0F] px-0.5 text-center text-[8px] leading-tight text-[#6C7A82] cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.92)]"
                      >
                        <span>Chưa</span>
                        <span>mở</span>
                      </button>
                    </div>

                    {/* Tall Obsidian Paperdoll Stage with Live Animated Hero */}
                    <div className="relative flex flex-1 min-h-[126px] flex-col items-center justify-center overflow-hidden rounded-[2px] border border-[#4A5860] bg-[radial-gradient(ellipse_at_50%_62%,#1D252B_0%,#0B0E11_76%,#07090B_100%)] shadow-[inset_0_0_16px_rgba(0,0,0,0.92)]">
                      <PixelHeroPreview
                        sectId={player.sect}
                        player={paperdollPlayer}
                        width={136}
                        height={124}
                        transparentBg
                        scale={1.06}
                        hideControls
                      />
                      <button
                        type="button"
                        onClick={onToggleMount}
                        title="Lên / Xuống Ngựa ngoài bản đồ"
                        className="absolute right-1 top-1 rounded-[2px] border border-[#4A5962]/80 bg-[#10161A]/85 px-1.5 py-[1px] text-[8px] text-[#C5D4DC] hover:border-[#F5D061] hover:text-[#FEF08A] cursor-pointer"
                      >
                        {player.isMounted ? 'Xuống ngựa' : 'Lên ngựa'}
                      </button>
                    </div>

                    {/* Bottom 3 Classic Golden Seal Slots (Ngũ Hành Ấn | Quan Ấn | Bí Kíp) */}
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpecialInfo(
                            `Ngũ Hành Ấn (${elem.name}) · Kháng tất cả +${stats.allResist}%`
                          );
                          setShowFiveElemBar(true);
                        }}
                        title="Ngũ Hành Ấn"
                        className="relative flex h-[32px] items-center justify-center rounded-[2px] border border-[#C59D45] bg-[radial-gradient(circle_at_50%_45%,#2A2213_0%,#0C0E11_88%)] hover:border-[#FEF08A] cursor-pointer"
                      >
                        <ClassicSlotGlyph kind="seal_element" color={elem.color} />
                        <span className="pointer-events-none absolute bottom-0 right-0.5 font-mono text-[7px] font-bold text-[#FEF3C7]">
                          Ấn
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={onOpenTitleMantle}
                        title={`Quan Ấn · ${activeTitle.name}`}
                        className="relative flex h-[32px] items-center justify-center rounded-[2px] border border-[#C59D45] bg-[radial-gradient(circle_at_50%_45%,#302410_0%,#0C0E11_88%)] hover:border-[#FEF08A] cursor-pointer"
                      >
                        <ClassicSlotGlyph kind="seal_rank" color="#F5D061" />
                        <span className="pointer-events-none absolute bottom-0 right-0.5 font-mono text-[7px] font-bold text-[#FEF3C7]">
                          Quan
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpecialInfo(
                            `Trận Pháp · ${sect.name} — Hướng ${branchLabel}`
                          );
                          setShowFiveElemBar(true);
                        }}
                        title="Trận Pháp Môn Phái"
                        className="relative flex h-[32px] items-center justify-center rounded-[2px] border border-[#C59D45] bg-[radial-gradient(circle_at_50%_45%,#2B200F_0%,#0C0E11_88%)] hover:border-[#FEF08A] cursor-pointer"
                      >
                        <ClassicSlotGlyph kind="seal_manual" color={elem.color} />
                        <span className="pointer-events-none absolute bottom-0 right-0.5 font-mono text-[7px] font-bold text-[#FEF3C7]">
                          Trận
                        </span>
                      </button>
                    </div>

                    {/* Slim Beveled Button: Trang bị ngũ hành */}
                    <button
                      type="button"
                      onClick={() => setShowFiveElemBar((v) => !v)}
                      className={`kt-btn-bronze w-full py-[2px] text-[9.5px] font-medium cursor-pointer whitespace-nowrap ${
                        showFiveElemBar ? 'border-[#C9AA5E] text-[#FEF3C7]' : ''
                      }`}
                    >
                      Trang bị ngũ hành
                    </button>
                  </div>

                  {/* Right 6 Equipment Slots: Vũ Khí(real), Liên, Nhẫn(real), Bội(real), Phù, Mật Tịch */}
                  <div className="flex w-[38px] shrink-0 flex-col justify-between gap-[3px]">
                    {renderRealEquipSlot('weapon', 'V.Khí')}
                    {renderOrnateSlot(
                      'necklace',
                      'Liên',
                      `Hạng Liên Môn Phái · Chí mạng ${stats.crit.toFixed(1)}% · ST CM ${stats.critDamagePct}%`,
                      undefined,
                      elem.color
                    )}
                    {renderRealEquipSlot('ring', 'Nhẫn')}
                    {renderRealEquipSlot('jade', 'Bội')}
                    {renderOrnateSlot(
                      'amulet',
                      'Phù',
                      `Hộ Thân Phù (${elem.name}) · Tăng phòng thủ Ngũ Hành`,
                      undefined,
                      elem.color
                    )}
                    {renderOrnateSlot(
                      'book',
                      'M.Tịch',
                      `Mật Tịch ${sect.name} · ${branchLabel} (${sect.passives.length} tâm pháp)`,
                      undefined,
                      '#F59E0B'
                    )}
                  </div>
                </div>

                {/* 4. Classic Bottom Potential Allocation Block (Sức / Thân / Ngoại / Nội + Tiềm năng) */}
                <div className="mt-0.5 flex items-stretch gap-2 border-t border-[#434F57] pt-1.5">
                  {/* Left: 4 Attribute Rows with [+] [-] buttons */}
                  <div className="flex flex-1 flex-col gap-[3px] text-[10px] tabular-nums">
                    {(
                      [
                        { key: 'str', label: 'Sức:', val: classicStats.str },
                        { key: 'dex', label: 'Thân:', val: classicStats.dex },
                        { key: 'vit', label: 'Ngoại:', val: classicStats.vit },
                        { key: 'int', label: 'Nội:', val: classicStats.int },
                      ] as const
                    ).map((row) => (
                      <div key={row.key} className="flex items-center justify-between gap-1">
                        <span className="w-[34px] text-[#C5D3DA]">{row.label}</span>
                        <span className="flex-1 rounded-[1px] border border-[#4D5A62] bg-[#0B0E10] px-1.5 py-[1px] text-right font-mono text-[9.5px] text-[#EEF4F7]">
                          {row.val}
                        </span>
                        <div className="flex items-center gap-[2px]">
                          <button
                            type="button"
                            disabled={classicStats.freePool <= 0}
                            onClick={() => adjustPotential(row.key, 1)}
                            title={`Cộng 1 điểm ${row.label.replace(':', '')}`}
                            className="flex h-[16px] w-[16px] items-center justify-center rounded-[1px] border border-[#6C7A82] bg-[#283137] font-mono text-[10px] font-bold leading-none text-[#E8F1F5] hover:border-[#F5D061] hover:text-[#FEF08A] disabled:opacity-35 cursor-pointer"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            disabled={pendingPot[row.key] <= 0}
                            onClick={() => adjustPotential(row.key, -1)}
                            title={`Trừ 1 điểm ${row.label.replace(':', '')}`}
                            className="flex h-[16px] w-[16px] items-center justify-center rounded-[1px] border border-[#6C7A82] bg-[#283137] font-mono text-[10px] font-bold leading-none text-[#E8F1F5] hover:border-[#F5D061] hover:text-[#FEF08A] disabled:opacity-35 cursor-pointer"
                          >
                            -
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right: Tiềm năng + Tự cộng tiềm năng + Đồng ý / Hủy */}
                  <div className="flex w-[112px] shrink-0 flex-col justify-between gap-1">
                    <div className="flex items-center justify-between rounded-[1px] border border-[#47535B] bg-[#0C0F12] px-1.5 py-[2px] text-[9.5px] tabular-nums">
                      <span className="text-[#AEBFC7]">Tiềm năng:</span>
                      <span
                        className={`font-mono font-bold ${
                          classicStats.freePool > 0 ? 'text-[#86EFAC]' : 'text-[#DCE6EA]'
                        }`}
                      >
                        {classicStats.freePool}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAutoPotential}
                      className="kt-btn-bronze w-full py-[3px] text-[9.5px] font-medium cursor-pointer whitespace-nowrap"
                    >
                      Tự cộng tiềm năng
                    </button>

                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={handleConfirmPotential}
                        className="kt-btn-bronze py-[3px] text-[9.5px] font-semibold text-[#FEF3C7] cursor-pointer whitespace-nowrap"
                      >
                        Đồng ý
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelPotential}
                        className="kt-btn-bronze py-[3px] text-[9.5px] font-medium cursor-pointer whitespace-nowrap"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>

                {potNotice && (
                  <div className="text-[9px] text-[#A7F3D0]">{potNotice}</div>
                )}
              </div>
            </div>

            {/* Expandable Sức chiến đấu Breakdown Strip */}
            {showPowerDetail && (
              <div className="rounded-[2px] border border-[#8A7542] bg-[#101518] px-2 py-1.5 text-[9.5px] tabular-nums">
                <div className="flex items-center justify-between border-b border-[#3A464D] pb-1">
                  <span className="font-semibold text-[#F5D061]">
                    Tổng Sức Chiến Đấu (Lực Chiến)
                  </span>
                  <span className="font-mono text-[11px] font-bold text-[#FEF08A]">
                    {formatNumber(stats.power)}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] text-[#B7C7CF]">
                  <div className="flex justify-between">
                    <span>Cảnh giới:</span>
                    <span style={{ color: realm.auraColor }}>{realm.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phi Phong:</span>
                    <span style={{ color: mantle.color }}>{mantle.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chí mạng:</span>
                    <span className="font-mono text-[#FDE047]">{stats.crit.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng Cường Hóa:</span>
                    <span className="font-mono text-[#7DD3FC]">+{classicStats.totalEnh}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Equipment / Ngũ Hành Quick Inspector Strip */}
            {showFiveElemBar && (
              <div className="flex items-center justify-between gap-2 rounded-[2px] border border-[#4E5C64] bg-[#101518] px-2 py-1 text-[9.5px]">
                {selectedSpecialInfo ? (
                  <>
                    <span className="min-w-0 flex-1 truncate text-[#DDE7EC]">
                      {selectedSpecialInfo}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSpecialInfo(null)}
                      className="shrink-0 text-[9px] text-[#9EB0BA] hover:text-[#FEF08A] cursor-pointer"
                    >
                      Đóng
                    </button>
                  </>
                ) : selectedEquipped ? (
                  (() => {
                    const eff = getEffectiveItemStats(selectedEquipped);
                    return (
                      <>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="truncate font-semibold"
                              style={{ color: QUALITY_META[selectedEquipped.quality].color }}
                            >
                              {selectedEquipped.name}
                              {selectedEquipped.enhance > 0 ? ` +${selectedEquipped.enhance}` : ''}
                            </span>
                            <span className="shrink-0 text-[8.5px] text-[#8EA2AC]">
                              ({SLOT_LABELS[selectedSlot]})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-2 text-[8.5px] text-[#B3C4CC] tabular-nums">
                            {eff.atk > 0 && <span>Công +{eff.atk}</span>}
                            {eff.def > 0 && <span>Thủ +{eff.def}</span>}
                            {eff.hp > 0 && <span>Sinh +{eff.hp}</span>}
                            {eff.crit > 0 && <span>CM +{eff.crit}%</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTab('enhance')}
                            className="rounded-[2px] border border-[#8A6D3B] bg-[#2D2212] px-2 py-0.5 text-[9px] font-semibold text-[#F5D061] hover:bg-[#3F3019] cursor-pointer whitespace-nowrap"
                          >
                            Cường hóa
                          </button>
                          <button
                            type="button"
                            onClick={onOpenBag}
                            className="kt-btn-bronze px-2 py-0.5 text-[9px] cursor-pointer whitespace-nowrap"
                          >
                            Đổi đồ
                          </button>
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <>
                    <span className="text-[#99ACB5]">
                      Ô <b className="text-[#E6F0F4]">{SLOT_LABELS[selectedSlot]}</b> chưa trang bị
                    </span>
                    <button
                      type="button"
                      onClick={onOpenBag}
                      className="rounded-[2px] border border-[#5B7568] bg-[#1C322A] px-2 py-0.5 text-[9px] text-[#A7F3D0] hover:bg-[#244136] cursor-pointer whitespace-nowrap"
                    >
                      Mở Hành Nang
                    </button>
                  </>
                )}
              </div>
            )}

            {/* PK Sát Khí Warning Strip (only when carrying PK points or penalty) */}
            {(player.pkPoints > 0 || stats.pkPenaltyPct > 0) && (
              <div className="flex items-center justify-between gap-2 rounded-[2px] border border-[#7F1D1D] bg-[#291012] px-2 py-1 text-[9.5px] text-[#FCA5A5]">
                <span className="flex items-center gap-1 truncate">
                  <Skull className="h-3 w-3 shrink-0" />
                  Sát Khí {player.pkPoints}/10
                  {stats.pkPenaltyPct > 0
                    ? ` (Suy yếu -${stats.pkPenaltyPct}% · ${pkPenaltyRemainSec}s)`
                    : ''}
                </span>
                <button
                  type="button"
                  onClick={onCleansePk}
                  className="shrink-0 rounded-[2px] border border-[#B91C1C] bg-[#451417] px-2 py-0.5 text-[9px] font-semibold text-[#FEF3C7] hover:bg-[#5E1A1E] cursor-pointer whitespace-nowrap"
                >
                  Rửa Tội
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================
            TAB 2: DANH VỌNG (Uy danh Giang Hồ, Công trạng, Lôi Đài, Chiến tích, PK)
           ======================================================================== */}
        {tab === 'reputation' && (
          <div className="space-y-1.5 text-[10px]">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-[2px] border border-[#4E5C64] bg-[#0D1114] p-2 tabular-nums">
                <div className="text-[#95A9B3]">Uy danh Giang Hồ</div>
                <div className="mt-0.5 font-mono text-[14px] font-bold text-[#F5D061]">
                  {formatNumber(player.reputation)}
                </div>
              </div>
              <div className="rounded-[2px] border border-[#4E5C64] bg-[#0D1114] p-2 tabular-nums">
                <div className="text-[#95A9B3]">Công trạng Tống Kim</div>
                <div className="mt-0.5 font-mono text-[14px] font-bold text-[#7DD3FC]">
                  {formatNumber(player.merit)}
                </div>
              </div>
            </div>

            <div className="rounded-[2px] border border-[#4E5C64] bg-[#0D1114] p-2 space-y-1 tabular-nums">
              <div className="flex justify-between">
                <span className="text-[#9BB0BA]">Xếp hạng Võ Lâm Lôi Đài</span>
                <span className="font-mono font-semibold text-[#FEF08A]">
                  Hạng #{player.arenaRank}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9BB0BA]">Trận thắng Lôi Đài</span>
                <span className="font-mono text-[#E4EEF2]">{formatNumber(player.arenaWins)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9BB0BA]">Quái vật đã tiêu diệt</span>
                <span className="font-mono text-[#E4EEF2]">
                  {formatNumber(player.monstersKilled)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9BB0BA]">Cao Thủ / Boss Hoàng Kim đã hạ</span>
                <span className="font-mono text-[#F5D061]">
                  {formatNumber(player.bossesKilled)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9BB0BA]">Đồ sát giang hồ (PK)</span>
                <span className="font-mono text-[#FCA5A5]">{player.pkKills} lần</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[2px] border border-[#4E5C64] bg-[#12171B] px-2.5 py-2">
              <div>
                <div className="font-semibold text-[#E8F1F5]">
                  Trị PK hiện tại:{' '}
                  <span className={player.pkPoints > 0 ? 'text-[#EF4444]' : 'text-[#86EFAC]'}>
                    {player.pkPoints}/10
                  </span>
                </div>
                <div className="text-[9px] text-[#95A9B3]">
                  Hạ 8 quái vật tự giảm 1 điểm Sát Khí hoặc dùng Bạc để Rửa Tội ngay.
                </div>
              </div>
              <button
                type="button"
                disabled={player.pkPoints <= 0}
                onClick={onCleansePk}
                className="kt-btn-crimson shrink-0 px-2.5 py-1 text-[9.5px] font-semibold disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                Rửa Tội
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================
            TAB 3: DANH HIỆU (Danh Hiệu đang đeo & Danh sách Danh Hiệu Võ Lâm)
           ======================================================================== */}
        {tab === 'title' && (
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between rounded-[2px] border border-[#6C5E3A] bg-[#14130E] px-2.5 py-2">
              <div className="min-w-0">
                <div className="text-[9px] text-[#A8B8C0]">Danh hiệu đang hiển thị</div>
                <div
                  className="mt-0.5 flex items-center gap-1.5 font-serif text-[13px] font-bold"
                  style={{ color: activeTitle.color }}
                >
                  <Crown className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{activeTitle.name}</span>
                </div>
                <div className="text-[9px] text-[#9EB0BA] tabular-nums">
                  Công +{activeTitle.bonusAtk} · Thủ +{activeTitle.bonusDef} · Sinh +{activeTitle.bonusHp}
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenTitleMantle}
                className="kt-btn-bronze shrink-0 px-2.5 py-1 text-[9.5px] font-semibold text-[#FEF08A] cursor-pointer whitespace-nowrap"
              >
                Đổi Danh Hiệu
              </button>
            </div>

            <div className="space-y-1">
              {TITLES.map((t) => {
                const unlocked = player.unlockedTitles.includes(t.id);
                const isEquipped = player.activeTitleId === t.id;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between gap-2 rounded-[2px] border px-2 py-1.5 ${
                      isEquipped
                        ? 'border-[#D4AF37] bg-[#1E1A11]'
                        : unlocked
                        ? 'border-[#48565E] bg-[#101518]'
                        : 'border-[#303A40] bg-[#0C1012] opacity-65'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold" style={{ color: t.color }}>
                        {t.name}
                      </div>
                      <div className="truncate text-[8.5px] text-[#95A8B2]">
                        {t.requirementText}
                      </div>
                    </div>
                    <span className="shrink-0 text-[9px] font-medium text-[#C5D4DC]">
                      {isEquipped ? 'Đang dùng' : unlocked ? 'Đã mở' : 'Chưa đạt'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================
            TAB 4: VINH DỰ (Phi Phong, Cảnh Giới, Lực Chiến)
           ======================================================================== */}
        {tab === 'honor' && (
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between gap-2 rounded-[2px] border border-[#74633A] bg-[#131410] p-2.5">
              <div className="min-w-0 space-y-0.5">
                <div className="text-[9px] text-[#A2B4BD]">Phi Phong Vinh Dự hiện tại</div>
                <div
                  className="flex items-center gap-1.5 font-serif text-[14px] font-bold"
                  style={{ color: mantle.color }}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span>{mantle.name}</span>
                </div>
                <div className="text-[9px] text-[#B8C7CF] tabular-nums">
                  Công +{mantle.bonusAtk} · Thủ +{mantle.bonusDef} · Sinh +{mantle.bonusHp} · CM +
                  {mantle.bonusCrit}%
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenTitleMantle}
                className="kt-btn-crimson shrink-0 px-2.5 py-1.5 text-[9.5px] font-semibold cursor-pointer whitespace-nowrap"
              >
                Nâng Phi Phong
              </button>
            </div>

            <div className="rounded-[2px] border border-[#4E5C64] bg-[#0D1114] p-2.5 space-y-1.5 tabular-nums">
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Cảnh Giới Võ Học</span>
                <span className="font-semibold" style={{ color: realm.auraColor }}>
                  {realm.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Tổng Sức Chiến Đấu</span>
                <span className="font-mono font-bold text-[#FEF08A]">
                  {formatNumber(stats.power)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Tổng cấp Cường Hóa trang bị</span>
                <span className="font-mono text-[#7DD3FC]">+{classicStats.totalEnh}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Môn phái & Ngũ Hành</span>
                <span style={{ color: elem.color }}>
                  {sect.name} · Hệ {elem.name}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================
            TAB 5: THÔNG TIN (Hồ sơ giang hồ, Bang hội, Hướng tu luyện, Phím tắt)
           ======================================================================== */}
        {tab === 'info' && (
          <div className="space-y-1.5 text-[10px]">
            <div className="rounded-[2px] border border-[#4E5C64] bg-[#0D1114] p-2.5 space-y-1.5 tabular-nums">
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Nhân vật</span>
                <span className="font-semibold text-[#F4F8FA]">{player.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Môn phái</span>
                <span style={{ color: elem.color }}>
                  {sect.name} (Hệ {elem.name})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Hướng tu luyện</span>
                <span className="font-semibold text-[#F5D061]">{branchLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Bang hội</span>
                <span className="text-[#E4EEF2]">{guildName || 'Chưa gia nhập Bang Hội'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Cống hiến Bang</span>
                <span className="font-mono text-[#A7F3D0]">
                  {formatNumber(player.guildContribution)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Chí mạng / Sát thương CM</span>
                <span className="font-mono text-[#FDE047]">
                  {stats.crit.toFixed(1)}% / {stats.critDamagePct}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Kháng tất cả Ngũ Hành</span>
                <span className="font-mono text-[#C4B5FD]">+{stats.allResist}%</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setTab('enhance')}
                className="kt-btn-bronze flex items-center justify-center gap-1 py-1.5 text-[9.5px] font-semibold cursor-pointer whitespace-nowrap"
              >
                <Hammer className="h-3 w-3 text-[#F5D061]" />
                Cường hóa
              </button>
              <button
                type="button"
                onClick={() => setTab('mounts')}
                className="kt-btn-bronze flex items-center justify-center gap-1 py-1.5 text-[9.5px] font-semibold cursor-pointer whitespace-nowrap"
              >
                <ArrowRightLeft className="h-3 w-3 text-[#86EFAC]" />
                Thú cưỡi
              </button>
              <button
                type="button"
                onClick={onOpenBag}
                className="kt-btn-bronze flex items-center justify-center gap-1 py-1.5 text-[9.5px] font-semibold cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="h-3 w-3 text-[#7DD3FC]" />
                Hành Nang
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================
            TAB 6: TÀI PHÚ (Tài Phú, Bạc, Đồng, Đá Cường Hóa, Rương Báu, Tuấn Mã)
           ======================================================================== */}
        {tab === 'wealth' && (
          <div className="space-y-1.5 text-[10px] tabular-nums">
            <div className="rounded-[2px] border border-[#7A6638] bg-[#14130D] p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[9px] text-[#A8B8C0]">Tổng điểm Tài Phú</div>
                <div className="font-mono text-[16px] font-bold text-[#F5D061]">
                  {formatNumber(player.wealth)}
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenTitleMantle}
                className="kt-btn-bronze px-2.5 py-1 text-[9.5px] text-[#FEF08A] cursor-pointer whitespace-nowrap"
              >
                Xem mốc Phi Phong
              </button>
            </div>

            <div className="rounded-[2px] border border-[#4E5C64] bg-[#0D1114] p-2.5 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Bạc (Lượng)</span>
                <span className="font-mono text-[#F5D061]">{formatNumber(player.silver)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Đồng (Kim Nguyên Bảo)</span>
                <span className="font-mono text-[#FDE047]">{formatNumber(player.goldIngots)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Huyền Tinh / Đá Cường Hóa</span>
                <span className="font-mono text-[#7DD3FC]">
                  {formatNumber(player.enhanceStones)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Kim Sáng Dược</span>
                <span className="font-mono text-[#86EFAC]">{formatNumber(player.potions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Rương Báu hiện có / Đã mở</span>
                <span className="font-mono text-[#E4EEF2]">
                  {totalChests} / {player.chestsOpened}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9CB0BA]">Tuấn Mã sở hữu</span>
                <span className="font-mono text-[#E4EEF2]">
                  {player.ownedMounts.length}/{MOUNTS.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setTab('enhance')}
                className="kt-btn-bronze py-1.5 text-[9.5px] font-semibold text-[#FEF08A] cursor-pointer"
              >
                Đi Cường Hóa Trang Bị
              </button>
              <button
                type="button"
                onClick={() => setTab('mounts')}
                className="kt-btn-bronze py-1.5 text-[9.5px] font-semibold text-[#A7F3D0] cursor-pointer"
              >
                Chuồng Tuấn Mã
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================
            SUB-VIEW: CƯỜNG HÓA TRANG BỊ
           ======================================================================== */}
        {tab === 'enhance' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-[2px] border border-[#4E5C64] bg-[#0D1114] px-2.5 py-1.5 text-[10px] tabular-nums">
              <span className="text-[#9BB0BA]">
                Đá C.Hóa: <b className="font-mono text-[#7DD3FC]">{player.enhanceStones}</b>
              </span>
              <span className="text-[#9BB0BA]">
                Bạc: <b className="font-mono text-[#F5D061]">{formatNumber(player.silver)}</b>
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1.5 rounded-[2px] border border-[#4E5C64] bg-[#0C1013] p-2">
              {ALL_SLOTS.map((slot) => {
                const it = player.equipment[slot];
                const isSel = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`kt-slot flex flex-col items-center justify-center gap-1 rounded-[2px] py-1.5 cursor-pointer ${
                      isSel ? 'ring-1 ring-[#F5D061] border-[#F5D061]' : ''
                    }`}
                  >
                    {it ? (
                      <PixelItemIcon
                        slot={it.slot}
                        quality={it.quality}
                        itemName={it.name}
                        sectId={player.sect}
                        enhance={it.enhance}
                        size="sm"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center text-[8.5px] text-[#66757D]">
                        Trống
                      </div>
                    )}
                    <span className="max-w-full truncate px-0.5 text-[8.5px] text-[#B4C4CC]">
                      {SLOT_LABELS[slot].slice(0, 6)}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedEquipped ? (
              (() => {
                const cost = getEnhanceCost(selectedEquipped);
                const eff = getEffectiveItemStats(selectedEquipped);
                const isMax = selectedEquipped.enhance >= 15;
                const canAfford =
                  !isMax &&
                  player.silver >= cost.silver &&
                  player.enhanceStones >= cost.stones;
                return (
                  <div className="space-y-2 rounded-[2px] border border-[#56636B] bg-[#11161A] p-2.5 text-[10px]">
                    <div className="flex items-center gap-2.5">
                      <PixelItemIcon
                        slot={selectedEquipped.slot}
                        quality={selectedEquipped.quality}
                        itemName={selectedEquipped.name}
                        sectId={player.sect}
                        enhance={selectedEquipped.enhance}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-[11px] font-bold"
                          style={{ color: QUALITY_META[selectedEquipped.quality].color }}
                        >
                          {selectedEquipped.name} +{selectedEquipped.enhance}
                        </div>
                        <div className="text-[9.5px] text-[#A2B4BD] tabular-nums">
                          LC {formatNumber(selectedEquipped.power)} · Tỉ lệ thành công:{' '}
                          <b className="text-[#86EFAC]">{isMax ? 'MAX' : `${cost.successRate}%`}</b>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[9px] text-[#C6D5DC] tabular-nums">
                          {eff.atk > 0 && <span>Công +{eff.atk}</span>}
                          {eff.def > 0 && <span>Thủ +{eff.def}</span>}
                          {eff.hp > 0 && <span>Sinh +{eff.hp}</span>}
                          {eff.crit > 0 && <span>CM +{eff.crit}%</span>}
                        </div>
                      </div>
                    </div>

                    {!isMax && (
                      <div className="flex items-center justify-between rounded-[2px] border border-[#3B4850] bg-[#0B0E11] px-2 py-1 text-[9.5px] text-[#B5C6CE] tabular-nums">
                        <span>
                          Đá cần: <b className="text-[#7DD3FC]">{cost.stones}</b>
                        </span>
                        <span>
                          Bạc cần: <b className="text-[#F5D061]">{formatNumber(cost.silver)}</b>
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onEnhanceSlot(selectedSlot)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-[2px] border border-[#B08A45] bg-gradient-to-b from-[#694A1D] to-[#3B280D] py-1.5 text-[10.5px] font-bold text-[#FEF08A] hover:brightness-110 disabled:opacity-45 cursor-pointer"
                    >
                      <Swords className="h-3.5 w-3.5" />
                      {isMax
                        ? 'Đã Đạt +15 Tối Thượng'
                        : `Cường Hóa lên +${selectedEquipped.enhance + 1}`}
                    </button>
                  </div>
                );
              })()
            ) : (
              <div className="rounded-[2px] border border-[#3E4C54] bg-[#101518] p-4 text-center text-[10px] text-[#8FA2AC]">
                Chọn 1 trang bị đang mặc để cường hóa.
              </div>
            )}
          </div>
        )}

        {/* ========================================================================
            SUB-VIEW: THÚ CƯỠI & HUYỄN HÓA
           ======================================================================== */}
        {tab === 'mounts' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMountSubTab('steeds')}
                className={`flex-1 rounded-[2px] border py-1 text-[9.5px] font-semibold cursor-pointer ${
                  mountSubTab === 'steeds'
                    ? 'border-[#F5D061] bg-[#2B2415] text-[#F5D061]'
                    : 'border-[#3E4D54] bg-[#141B1F] text-[#9BB0BA]'
                }`}
              >
                Tuấn Mã ({player.ownedMounts.length}/{MOUNTS.length})
              </button>
              <button
                type="button"
                onClick={() => setMountSubTab('illusions')}
                className={`flex-1 rounded-[2px] border py-1 text-[9.5px] font-semibold cursor-pointer ${
                  mountSubTab === 'illusions'
                    ? 'border-[#F5D061] bg-[#2B2415] text-[#F5D061]'
                    : 'border-[#3E4D54] bg-[#141B1F] text-[#9BB0BA]'
                }`}
              >
                Huyễn Hóa ({Object.keys(player.mountIllusions || {}).length}/
                {MOUNT_ILLUSIONS.length})
              </button>
            </div>

            {/* Active Mount Preview */}
            <div className="flex items-center gap-2.5 rounded-[2px] border border-[#52616A] bg-[#0D1215] p-2">
              <PixelMountPreview
                mount={activeMount}
                illusion={activeIllusion}
                illusionStars={
                  activeIllusion ? player.mountIllusions?.[activeIllusion.id] || 1 : 0
                }
                width={88}
                height={66}
                isMoving
              />
              <div className="min-w-0 flex-1 text-[10px]">
                <div className="truncate font-bold text-[#F5D061]">
                  {activeIllusion ? activeIllusion.name : activeMount.name}
                </div>
                <div className="mt-0.5 text-[9px] text-[#A2B4BD] tabular-nums">
                  Tốc chạy +{stats.moveSpeedPct}% · Kháng Ngũ Hành +{stats.allResist}%
                </div>
                <button
                  type="button"
                  onClick={onToggleMount}
                  className="mt-1.5 rounded-[2px] border border-[#5B7568] bg-[#1D352B] px-2.5 py-0.5 text-[9px] font-semibold text-[#A7F3D0] hover:bg-[#264639] cursor-pointer"
                >
                  {player.isMounted ? 'Đang Cưỡi (Xuống Ngựa)' : 'Lên Ngựa Ngay'}
                </button>
              </div>
            </div>

            {mountSubTab === 'steeds' ? (
              <div className="space-y-1">
                {MOUNTS.map((m) => {
                  const owned = player.ownedMounts.includes(m.id);
                  const active = player.activeMountId === m.id;
                  const canBuy =
                    player.level >= m.levelReq &&
                    player.silver >= m.silverCost &&
                    player.goldIngots >= m.ingotCost;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between gap-2 rounded-[2px] border px-2 py-1.5 text-[9.5px] ${
                        active
                          ? 'border-[#F5D061] bg-[#221E14]'
                          : 'border-[#3A4850] bg-[#11171B]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold" style={{ color: m.accentColor }}>
                          {m.name}
                        </div>
                        <div className="text-[8.5px] text-[#95A8B2] tabular-nums">
                          Tốc +{m.moveSpeedPct}% · Kháng +{m.allResist}% · HP +{m.bonusHp}
                        </div>
                      </div>
                      {owned ? (
                        <button
                          type="button"
                          onClick={() => onSelectMount(m.id)}
                          disabled={active}
                          className="shrink-0 rounded-[2px] border border-[#5A727C] bg-[#1C2A30] px-2 py-0.5 text-[9px] text-[#DCE8EE] disabled:border-[#F5D061] disabled:text-[#F5D061] cursor-pointer"
                        >
                          {active ? 'Đang dùng' : 'Cưỡi'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onBuyMount(m.id)}
                          disabled={!canBuy}
                          className="shrink-0 rounded-[2px] border border-[#8A6D3B] bg-[#2D2212] px-2 py-0.5 text-[9px] text-[#F5D061] disabled:opacity-45 cursor-pointer tabular-nums"
                        >
                          {m.ingotCost > 0 ? `${m.ingotCost}Đ` : `${formatNumber(m.silverCost)}B`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                {player.activeMountIllusionId && (
                  <button
                    type="button"
                    onClick={() => onEquipIllusion(null)}
                    className="w-full rounded-[2px] border border-[#495A63] bg-[#172025] py-1 text-[9px] text-[#B8C9D1] hover:border-[#F5D061] cursor-pointer"
                  >
                    Tắt Huyễn Hóa (Hiện nguyên bản Tuấn Mã)
                  </button>
                )}
                {MOUNT_ILLUSIONS.map((il) => {
                  const stars = player.mountIllusions?.[il.id] || 0;
                  const equipped = player.activeMountIllusionId === il.id;
                  const isMax = stars >= 5;
                  const st = getIllusionStats(il, Math.max(1, stars));
                  const cost = getIllusionUpgradeCost(il, stars);
                  return (
                    <div
                      key={il.id}
                      className={`flex items-center justify-between gap-2 rounded-[2px] border px-2 py-1.5 text-[9.5px] ${
                        equipped
                          ? 'border-[#F5D061] bg-[#221E14]'
                          : 'border-[#3A4850] bg-[#11171B]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold" style={{ color: il.accentColor }}>
                          {il.name} {stars > 0 ? `★${stars}` : ''}
                        </div>
                        <div className="text-[8.5px] text-[#95A8B2] tabular-nums">
                          Tốc +{st.moveSpeedPct}% · Công +{st.bonusAtk} · HP +{st.bonusHp}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {stars > 0 && (
                          <button
                            type="button"
                            onClick={() => onEquipIllusion(equipped ? null : il.id)}
                            className="rounded-[2px] border border-[#5B7568] bg-[#1A3027] px-2 py-0.5 text-[8.5px] text-[#A7F3D0] cursor-pointer"
                          >
                            {equipped ? 'Gỡ' : 'Dùng'}
                          </button>
                        )}
                        {!isMax && (
                          <button
                            type="button"
                            onClick={() => onUnlockOrUpgradeIllusion(il.id)}
                            className="rounded-[2px] border border-[#8A6D3B] bg-[#2D2212] px-2 py-0.5 text-[8.5px] text-[#F5D061] cursor-pointer tabular-nums"
                          >
                            {stars === 0 ? `${cost.ingots}Đ` : `★${stars + 1}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
