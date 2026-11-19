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
  EquipSlot,
  EquipmentItem,
  PlayerState,
} from '../../game/types';
import { PixelHeroPreview, PixelItemIcon, PixelMountPreview } from '../PixelItemIcon';
import {
  ArrowRightLeft,
  Crown,
  Hammer,
  Shield,
  Skull,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';

export type CharacterSubTab = 'equip' | 'enhance' | 'mounts';

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

const LEFT_SLOTS: EquipSlot[] = ['armor', 'bracer', 'boots'];
const RIGHT_SLOTS: EquipSlot[] = ['weapon', 'ring', 'jade'];
const ALL_SLOTS: EquipSlot[] = ['weapon', 'armor', 'bracer', 'ring', 'jade', 'boots'];

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
  const [tab, setTab] = useState<CharacterSubTab>(initialTab);
  const [selectedSlot, setSelectedSlot] = useState<EquipSlot>('weapon');
  const [mountSubTab, setMountSubTab] = useState<'steeds' | 'illusions'>('steeds');

  // Draggable window offset (anchored left by default so Hành Nang opens side-by-side on the right)
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
      x: Math.max(-40, Math.min(window.innerWidth - 270, dragRef.current.origX + dx)),
      y: Math.max(-36, Math.min(window.innerHeight - 150, dragRef.current.origY + dy)),
    });
  };

  const handleTitleBarPointerUp = () => {
    dragRef.current = null;
  };

  const sect = SECTS[player.sect];
  const elem = ELEMENT_META[sect.element];
  const sectShort = sect.name.split(' ')[0];
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

  const renderSlotBtn = (slot: EquipSlot) => {
    const item = player.equipment[slot];
    const isSel = selectedSlot === slot;
    return (
      <button
        key={slot}
        type="button"
        onClick={() => setSelectedSlot(slot)}
        title={item ? `${item.name} (+${item.enhance})` : `${SLOT_LABELS[slot]} (Trống)`}
        className={`kt-slot relative flex h-[34px] w-[34px] items-center justify-center rounded-[2px] cursor-pointer transition-colors ${
          isSel ? 'ring-1 ring-[#F5D061] border-[#F5D061]' : 'hover:border-[#9CA8AE]'
        }`}
      >
        {item ? (
          <PixelItemIcon
            slot={item.slot}
            quality={item.quality}
            itemName={item.name}
            sectId={player.sect}
            enhance={item.enhance}
            size="xs"
          />
        ) : (
          <span className="px-0.5 text-center text-[8px] font-medium leading-tight text-[#6C7A82]">
            {SLOT_LABELS[slot].slice(0, 4)}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      onPointerDown={() => onFocus?.()}
      className="pointer-events-auto fixed left-2.5 top-[42px] flex max-h-[calc(100dvh-92px)] w-[254px] sm:w-[268px] flex-col kt-window text-[#E2ECEF] select-none"
      style={{
        zIndex,
        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
      }}
    >
      {/* Authentic Kiếm Thế 2009 Green-Jade Draggable Titlebar */}
      <div
        onPointerDown={handleTitleBarPointerDown}
        onPointerMove={handleTitleBarPointerMove}
        onPointerUp={handleTitleBarPointerUp}
        onPointerCancel={handleTitleBarPointerUp}
        className="kt-titlebar flex shrink-0 cursor-move items-center justify-between px-2 py-1"
      >
        <span className="font-mono text-[9px] text-[#A8C4B8] whitespace-nowrap">
          {elem.name} · {sectShort}
        </span>
        <span className="font-serif text-[11.5px] font-bold tracking-wide text-[#F3F8F5] whitespace-nowrap">
          {tab === 'equip' ? 'Nhân Vật (F1)' : tab === 'enhance' ? 'Cường Hóa' : 'Thú Cưỡi'}
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Đóng cửa sổ Nhân Vật (F1)"
          className="flex h-[16px] w-[16px] items-center justify-center rounded-[2px] border border-[#8A9EA8]/70 bg-[#1B2B28] text-[#DCE6EA] hover:bg-[#7F1D1D] hover:text-white cursor-pointer"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      {/* Kiếm Thế 2009 Character-ONLY Sub-Tabs (Thuộc tính | Cường hóa | Thú cưỡi) — NO Túi / Kỹ năng */}
      <div className="flex shrink-0 items-end gap-0.5 border-b border-[#5B6B73]/70 bg-[#141A1D] px-1.5 pt-1">
        {(
          [
            { id: 'equip', label: 'Thuộc tính', icon: Shield },
            { id: 'enhance', label: 'Cường hóa', icon: Hammer },
            { id: 'mounts', label: 'Thú cưỡi', icon: ArrowRightLeft },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-t-[2px] border border-b-0 px-1.5 py-0.5 text-[9.5px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                active
                  ? 'border-[#8DA0A9] bg-[#243236] text-[#F5D061]'
                  : 'border-[#3E4C53] bg-[#161D21] text-[#98AAB3] hover:text-[#E2ECEF]'
              }`}
            >
              <Icon className="h-2.5 w-2.5 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-1.5">
        {/* ================= TAB 1: THUỘC TÍNH & TRANG BỊ (Kiếm Thế 2009 Paper-Doll) ================= */}
        {tab === 'equip' && (
          <>
            {/* Compact Profile Strip (Portrait + Name / Level / PK / Sect) */}
            <div className="flex items-center gap-2 rounded-[2px] border border-[#46565E]/80 bg-[#11171A] p-1.5">
              <div
                className="flex h-9 w-9 shrink-0 flex-col items-center justify-center overflow-hidden rounded-[2px] border"
                style={{
                  borderColor: elem.color,
                  background: `radial-gradient(circle at 35% 30%, ${elem.color}38, #0D1214 78%)`,
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
                    <span className="text-[7px] font-bold leading-none" style={{ color: elem.color }}>
                      {elem.name}
                    </span>
                    <span className="font-serif text-[11px] font-bold leading-tight text-[#FEF3C7]">
                      {sectShort}
                    </span>
                  </>
                )}
              </div>
              <div className="min-w-0 flex-1 text-[9.5px] leading-snug">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate font-bold text-[#F5D061]">{player.name}</span>
                  <span className="shrink-0 font-mono text-[9px] text-[#7DD3FC] tabular-nums">
                    LC {formatNumber(stats.power)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-[#B7C7CF] tabular-nums">
                  <span>Cấp {player.level}</span>
                  <span>·</span>
                  <span className={player.pkPoints > 0 ? 'text-[#FCA5A5]' : 'text-[#A7F3D0]'}>
                    Trị PK: {player.pkPoints}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 text-[8.5px] text-[#95A7B0]">
                  <span className="truncate">
                    Phái: <span style={{ color: elem.color }}>{sect.name}</span>
                  </span>
                  <span className="truncate text-[#C5D5DC]">
                    {guildName || 'Chưa vào Bang'}
                  </span>
                </div>
              </div>
            </div>

            {/* Paper-Doll Equipment U-Frame around Live Character Preview */}
            <div className="rounded-[2px] border border-[#46565E]/80 bg-[#0F1417] p-1.5">
              <div className="flex items-center justify-between gap-1">
                {/* Left 4 Equipment Slots */}
                <div className="flex flex-col gap-1">{LEFT_SLOTS.map(renderSlotBtn)}</div>

                {/* Center Character Preview Stage */}
                <div className="flex flex-1 flex-col items-center justify-center rounded-[2px] border border-[#35434A] bg-[radial-gradient(circle_at_50%_62%,#223036_0%,#0C1114_82%)] py-1">
                  <div className="text-[8.5px] font-semibold" style={{ color: realm.auraColor }}>
                    {realm.name}
                  </div>
                  <PixelHeroPreview
                    sectId={player.sect}
                    player={player}
                    width={110}
                    height={96}
                    transparentBg
                    scale={0.82}
                    hideControls
                  />
                  <div className="mt-0.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={onToggleMount}
                      className="rounded-[2px] border border-[#4F616B] bg-[#1B262B] px-1.5 py-0.5 text-[8px] text-[#D7E4EA] hover:border-[#F5D061] hover:text-[#F5D061] cursor-pointer"
                    >
                      {player.isMounted ? 'Xuống ngựa' : 'Lên ngựa'}
                    </button>
                    <button
                      type="button"
                      onClick={onOpenBag}
                      className="rounded-[2px] border border-[#4F616B] bg-[#1B262B] px-1.5 py-0.5 text-[8px] text-[#F5D061] hover:bg-[#27383E] cursor-pointer"
                    >
                      Hành Nang
                    </button>
                  </div>
                </div>

                {/* Right 4 Equipment Slots */}
                <div className="flex flex-col gap-1">{RIGHT_SLOTS.map(renderSlotBtn)}</div>
              </div>

              {/* Selected Slot Inspector Strip */}
              <div className="mt-1.5 flex items-center justify-between gap-1.5 rounded-[2px] border border-[#3B4A52] bg-[#151D21] px-1.5 py-1 text-[9px]">
                {selectedEquipped ? (
                  (() => {
                    const eff = getEffectiveItemStats(selectedEquipped);
                    return (
                      <>
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate font-semibold"
                            style={{ color: QUALITY_META[selectedEquipped.quality].color }}
                          >
                            {selectedEquipped.name}
                            {selectedEquipped.enhance > 0 ? ` +${selectedEquipped.enhance}` : ''}
                          </div>
                          <div className="flex flex-wrap gap-x-1.5 text-[8px] text-[#A8BAC2] tabular-nums">
                            {eff.atk > 0 && <span>Công +{eff.atk}</span>}
                            {eff.def > 0 && <span>Thủ +{eff.def}</span>}
                            {eff.hp > 0 && <span>HP +{eff.hp}</span>}
                            {eff.crit > 0 && <span>CM +{eff.crit}%</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTab('enhance')}
                          className="shrink-0 rounded-[2px] border border-[#8A6D3B] bg-[#2D2212] px-1.5 py-0.5 text-[8.5px] text-[#F5D061] hover:bg-[#3F3019] cursor-pointer"
                        >
                          C.Hóa
                        </button>
                      </>
                    );
                  })()
                ) : (
                  <>
                    <span className="text-[#8DA0AA]">
                      Ô <b className="text-[#DCE8EE]">{SLOT_LABELS[selectedSlot]}</b> trống
                    </span>
                    <button
                      type="button"
                      onClick={onOpenBag}
                      className="rounded-[2px] border border-[#5B7568] bg-[#1C322A] px-1.5 py-0.5 text-[8.5px] text-[#A7F3D0] hover:bg-[#244136] cursor-pointer"
                    >
                      Mở Túi
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Compact 2-Column Combat Attributes Grid */}
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 rounded-[2px] border border-[#46565E]/80 bg-[#11171A] p-1.5 text-[9px] tabular-nums">
              <div className="flex justify-between px-0.5">
                <span className="text-[#92A6B0]">Sinh Lực</span>
                <span className="font-mono text-[#FCA5A5]">{formatNumber(stats.maxHp)}</span>
              </div>
              <div className="flex justify-between px-0.5">
                <span className="text-[#92A6B0]">Nội Lực</span>
                <span className="font-mono text-[#93C5FD]">{formatNumber(stats.maxMp)}</span>
              </div>
              <div className="flex justify-between px-0.5">
                <span className="text-[#92A6B0]">Tấn Công</span>
                <span className="font-mono text-[#F5D061]">{formatNumber(stats.atk)}</span>
              </div>
              <div className="flex justify-between px-0.5">
                <span className="text-[#92A6B0]">Phòng Thủ</span>
                <span className="font-mono text-[#CBD8DF]">{formatNumber(stats.def)}</span>
              </div>
              <div className="flex justify-between px-0.5">
                <span className="text-[#92A6B0]">Chí Mạng</span>
                <span className="font-mono text-[#FDE047]">{stats.crit.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between px-0.5">
                <span className="text-[#92A6B0]">Né Tránh</span>
                <span className="font-mono text-[#86EFAC]">{stats.dodge.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between px-0.5">
                <span className="text-[#92A6B0]">Tốc Chạy</span>
                <span className="font-mono text-[#67E8F9]">+{stats.moveSpeedPct}%</span>
              </div>
              <div className="flex justify-between px-0.5">
                <span className="text-[#92A6B0]">Kháng All</span>
                <span className="font-mono text-[#C4B5FD]">{stats.allResist}%</span>
              </div>
            </div>

            {/* PK / Sát Khí Strip */}
            {(player.pkPoints > 0 || stats.pkPenaltyPct > 0) && (
              <div className="flex items-center justify-between gap-1.5 rounded-[2px] border border-[#7F1D1D] bg-[#2B1012] px-2 py-1 text-[9px] text-[#FCA5A5]">
                <span className="flex items-center gap-1 truncate">
                  <Skull className="h-3 w-3 shrink-0" />
                  Sát Khí {player.pkPoints}/10
                  {stats.pkPenaltyPct > 0 ? ` (-${stats.pkPenaltyPct}% · ${pkPenaltyRemainSec}s)` : ''}
                </span>
                <button
                  type="button"
                  onClick={onCleansePk}
                  className="shrink-0 rounded-[2px] border border-[#B91C1C] bg-[#451417] px-1.5 py-0.5 text-[8.5px] font-semibold text-[#FEF3C7] hover:bg-[#5E1A1E] cursor-pointer"
                >
                  Rửa Tội
                </button>
              </div>
            )}

            {/* Compact Phi Phong & Danh Hiệu Footer */}
            <div className="flex items-center justify-between gap-1.5 rounded-[2px] border border-[#46565E]/80 bg-[#11171A] px-2 py-1 text-[9px]">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 shrink-0" style={{ color: mantle.color }} />
                  <span className="truncate font-semibold" style={{ color: mantle.color }}>
                    {mantle.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Crown className="h-2.5 w-2.5 shrink-0 text-[#F5D061]" />
                  <span className="truncate" style={{ color: activeTitle.color }}>
                    {activeTitle.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenTitleMantle}
                className="shrink-0 rounded-[2px] border border-[#8A6D3B] bg-[#2D2212] px-1.5 py-1 text-[8.5px] font-semibold text-[#F5D061] hover:bg-[#3F3019] cursor-pointer"
              >
                Phi Phong
              </button>
            </div>
          </>
        )}

        {/* ================= TAB 2: CƯỜNG HÓA TRANG BỊ ================= */}
        {tab === 'enhance' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between rounded-[2px] border border-[#46565E]/80 bg-[#11171A] px-2 py-1 text-[9px] tabular-nums">
              <span className="text-[#9BB0BA]">
                Đá C.Hóa: <b className="text-[#7DD3FC]">{player.enhanceStones}</b>
              </span>
              <span className="text-[#9BB0BA]">
                Bạc: <b className="text-[#F5D061]">{formatNumber(player.silver)}</b>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-[2px] border border-[#46565E]/80 bg-[#0F1417] p-1.5">
              {ALL_SLOTS.map((slot) => {
                const it = player.equipment[slot];
                const isSel = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`kt-slot flex flex-col items-center justify-center gap-0.5 rounded-[2px] py-1 cursor-pointer ${
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
                        size="xs"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center text-[8px] text-[#66757D]">
                        Trống
                      </div>
                    )}
                    <span className="max-w-full truncate px-0.5 text-[8px] text-[#9FB2BC]">
                      {SLOT_LABELS[slot].slice(0, 6)}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedEquipped ? (
              (() => {
                const cost = getEnhanceCost(selectedEquipped);
                const isMax = selectedEquipped.enhance >= 15;
                const canAfford =
                  !isMax &&
                  player.silver >= cost.silver &&
                  player.enhanceStones >= cost.stones;
                return (
                  <div className="space-y-1.5 rounded-[2px] border border-[#46565E]/80 bg-[#12191D] p-2 text-[9.5px]">
                    <div className="flex items-center gap-2">
                      <PixelItemIcon
                        slot={selectedEquipped.slot}
                        quality={selectedEquipped.quality}
                        itemName={selectedEquipped.name}
                        sectId={player.sect}
                        enhance={selectedEquipped.enhance}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate font-bold"
                          style={{ color: QUALITY_META[selectedEquipped.quality].color }}
                        >
                          {selectedEquipped.name} +{selectedEquipped.enhance}
                        </div>
                        <div className="text-[8.5px] text-[#9EB2BC] tabular-nums">
                          LC {formatNumber(selectedEquipped.power)} · Tỉ lệ:{' '}
                          <b className="text-[#86EFAC]">{isMax ? 'MAX' : `${cost.successRate}%`}</b>
                        </div>
                      </div>
                    </div>

                    {!isMax && (
                      <div className="flex items-center justify-between text-[9px] text-[#B5C6CE] tabular-nums">
                        <span>Đá cần: {cost.stones}</span>
                        <span>Bạc cần: {formatNumber(cost.silver)}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onEnhanceSlot(selectedSlot)}
                      className="flex w-full items-center justify-center gap-1 rounded-[2px] border border-[#B08A45] bg-gradient-to-b from-[#694A1D] to-[#3B280D] py-1.5 text-[10px] font-bold text-[#FEF08A] hover:brightness-110 disabled:opacity-45 cursor-pointer"
                    >
                      <Swords className="h-3 w-3" />
                      {isMax
                        ? 'Đã Đạt +15 Tối Thượng'
                        : `Cường Hóa lên +${selectedEquipped.enhance + 1}`}
                    </button>
                  </div>
                );
              })()
            ) : (
              <div className="rounded-[2px] border border-[#3E4C54] bg-[#11171A] p-3 text-center text-[9.5px] text-[#8FA2AC]">
                Chọn 1 trang bị đang mặc để cường hóa.
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: THÚ CƯỠI & ẢO HÓA ================= */}
        {tab === 'mounts' && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMountSubTab('steeds')}
                className={`flex-1 rounded-[2px] border py-1 text-[9px] font-semibold cursor-pointer ${
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
                className={`flex-1 rounded-[2px] border py-1 text-[9px] font-semibold cursor-pointer ${
                  mountSubTab === 'illusions'
                    ? 'border-[#F5D061] bg-[#2B2415] text-[#F5D061]'
                    : 'border-[#3E4D54] bg-[#141B1F] text-[#9BB0BA]'
                }`}
              >
                Huyễn Hóa ({Object.keys(player.mountIllusions || {}).length}/{MOUNT_ILLUSIONS.length})
              </button>
            </div>

            {/* Active Mount Preview */}
            <div className="flex items-center gap-2 rounded-[2px] border border-[#46565E]/80 bg-[#101619] p-1.5">
              <PixelMountPreview
                mount={activeMount}
                illusion={activeIllusion}
                illusionStars={
                  activeIllusion ? player.mountIllusions?.[activeIllusion.id] || 1 : 0
                }
                width={78}
                height={58}
                isMoving
              />
              <div className="min-w-0 flex-1 text-[9px]">
                <div className="truncate font-bold text-[#F5D061]">
                  {activeIllusion ? activeIllusion.name : activeMount.name}
                </div>
                <div className="text-[8.5px] text-[#9BB0BA] tabular-nums">
                  Tốc +{stats.moveSpeedPct}% · Kháng +{stats.allResist}%
                </div>
                <button
                  type="button"
                  onClick={onToggleMount}
                  className="mt-1 rounded-[2px] border border-[#5B7568] bg-[#1D352B] px-2 py-0.5 text-[8.5px] font-semibold text-[#A7F3D0] hover:bg-[#264639] cursor-pointer"
                >
                  {player.isMounted ? 'Đang Cưỡi (Xuống)' : 'Lên Ngựa Ngay'}
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
                      className={`flex items-center justify-between gap-1.5 rounded-[2px] border px-2 py-1 text-[9px] ${
                        active
                          ? 'border-[#F5D061] bg-[#221E14]'
                          : 'border-[#3A4850] bg-[#131A1E]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold" style={{ color: m.accentColor }}>
                          {m.name}
                        </div>
                        <div className="text-[8px] text-[#95A8B2] tabular-nums">
                          Tốc +{m.moveSpeedPct}% · Kháng +{m.allResist}% · HP +{m.bonusHp}
                        </div>
                      </div>
                      {owned ? (
                        <button
                          type="button"
                          onClick={() => onSelectMount(m.id)}
                          disabled={active}
                          className="shrink-0 rounded-[2px] border border-[#5A727C] bg-[#1C2A30] px-1.5 py-0.5 text-[8.5px] text-[#DCE8EE] disabled:border-[#F5D061] disabled:text-[#F5D061] cursor-pointer"
                        >
                          {active ? 'Đang dùng' : 'Cưỡi'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onBuyMount(m.id)}
                          disabled={!canBuy}
                          className="shrink-0 rounded-[2px] border border-[#8A6D3B] bg-[#2D2212] px-1.5 py-0.5 text-[8.5px] text-[#F5D061] disabled:opacity-45 cursor-pointer tabular-nums"
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
                    className="w-full rounded-[2px] border border-[#495A63] bg-[#172025] py-1 text-[8.5px] text-[#B8C9D1] hover:border-[#F5D061] cursor-pointer"
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
                      className={`flex items-center justify-between gap-1.5 rounded-[2px] border px-2 py-1 text-[9px] ${
                        equipped
                          ? 'border-[#F5D061] bg-[#221E14]'
                          : 'border-[#3A4850] bg-[#131A1E]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold" style={{ color: il.accentColor }}>
                          {il.name} {stars > 0 ? `★${stars}` : ''}
                        </div>
                        <div className="text-[8px] text-[#95A8B2] tabular-nums">
                          Tốc +{st.moveSpeedPct}% · Công +{st.bonusAtk} · HP +{st.bonusHp}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {stars > 0 && (
                          <button
                            type="button"
                            onClick={() => onEquipIllusion(equipped ? null : il.id)}
                            className="rounded-[2px] border border-[#5B7568] bg-[#1A3027] px-1.5 py-0.5 text-[8px] text-[#A7F3D0] cursor-pointer"
                          >
                            {equipped ? 'Gỡ' : 'Dùng'}
                          </button>
                        )}
                        {!isMax && (
                          <button
                            type="button"
                            onClick={() => onUnlockOrUpgradeIllusion(il.id)}
                            className="rounded-[2px] border border-[#8A6D3B] bg-[#2D2212] px-1.5 py-0.5 text-[8px] text-[#F5D061] cursor-pointer tabular-nums"
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
