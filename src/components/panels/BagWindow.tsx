import React, { useMemo, useRef, useState } from 'react';
import { QUALITY_META, SLOT_LABELS } from '../../game/data';
import { formatNumber, getEffectiveItemStats } from '../../game/engine';
import { EquipmentItem, PlayerState } from '../../game/types';
import { PixelItemIcon } from '../PixelItemIcon';
import { ArrowUpDown, Trash2, X } from 'lucide-react';

interface BagWindowProps {
  player: PlayerState;
  zIndex?: number;
  onFocus?: () => void;
  onClose: () => void;
  onEquipItem: (item: EquipmentItem) => void;
  onSellItem: (itemId: string) => void;
  onSellJunk: () => void;
  onBuyPotion: () => void;
  onBuyStones: () => void;
}

const BAG_CAPACITY = 30;
type BagFilter = 'all' | 'weapon' | 'armor' | 'accessory';

export const BagWindow: React.FC<BagWindowProps> = ({
  player,
  zIndex = 41,
  onFocus,
  onClose,
  onEquipItem,
  onSellItem,
  onSellJunk,
  onBuyPotion,
  onBuyStones,
}) => {
  const [selectedBagId, setSelectedBagId] = useState<string | null>(null);
  const [bagFilter, setBagFilter] = useState<BagFilter>('all');
  const [bagSortMode, setBagSortMode] = useState<'default' | 'power' | 'quality'>('default');

  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  );

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
      x: Math.max(-(window.innerWidth - 270), Math.min(40, dragRef.current.origX + dx)),
      y: Math.max(-36, Math.min(window.innerHeight - 150, dragRef.current.origY + dy)),
    });
  };

  const handleTitleBarPointerUp = () => {
    dragRef.current = null;
  };

  const filteredBagItems = useMemo(() => {
    const qualityRank: Record<string, number> = {
      mythic: 6,
      gold: 5,
      purple: 4,
      blue: 3,
      green: 2,
      white: 1,
    };
    const list = player.inventory.filter((item) => {
      if (bagFilter === 'all') return true;
      if (bagFilter === 'weapon') return item.slot === 'weapon';
      if (bagFilter === 'armor') {
        return ['helm', 'armor', 'belt', 'boots'].includes(item.slot);
      }
      return ['necklace', 'ring', 'amulet'].includes(item.slot);
    });
    if (bagSortMode === 'power') {
      return [...list].sort((a, b) => b.power - a.power);
    }
    if (bagSortMode === 'quality') {
      return [...list].sort(
        (a, b) => (qualityRank[b.quality] || 0) - (qualityRank[a.quality] || 0) || b.power - a.power
      );
    }
    return list;
  }, [player.inventory, bagFilter, bagSortMode]);

  const selectedBagItem: EquipmentItem | null = useMemo(() => {
    const exact = filteredBagItems.find((i) => i.id === selectedBagId);
    return exact || filteredBagItems[0] || null;
  }, [filteredBagItems, selectedBagId]);

  const compareEquipped = selectedBagItem ? player.equipment[selectedBagItem.slot] : null;
  const powerDelta = selectedBagItem
    ? selectedBagItem.power - (compareEquipped ? compareEquipped.power : 0)
    : 0;

  return (
    <div
      onPointerDown={() => onFocus?.()}
      className="pointer-events-auto fixed right-2.5 top-[42px] flex max-h-[calc(100dvh-92px)] w-[248px] sm:w-[262px] flex-col kt-window text-[#E2ECEF] select-none"
      style={{
        zIndex,
        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
      }}
    >
      {/* Standalone Kiếm Thế 2009 Hành Nang Titlebar (F2) */}
      <div
        onPointerDown={handleTitleBarPointerDown}
        onPointerMove={handleTitleBarPointerMove}
        onPointerUp={handleTitleBarPointerUp}
        onPointerCancel={handleTitleBarPointerUp}
        className="kt-titlebar flex shrink-0 cursor-move items-center justify-between px-2 py-1"
      >
        <span className="font-mono text-[9px] text-[#A8C4B8] tabular-nums">
          {player.inventory.length}/{BAG_CAPACITY}
        </span>
        <span className="font-serif text-[11.5px] font-bold tracking-wide text-[#F3F8F5] whitespace-nowrap">
          Hành Nang (F2)
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Đóng Hành Nang (F2)"
          className="flex h-[16px] w-[16px] items-center justify-center rounded-[2px] border border-[#8A9EA8]/70 bg-[#1B2B28] text-[#DCE6EA] hover:bg-[#7F1D1D] hover:text-white cursor-pointer"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      {/* Compact Filter & Sort Toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-[#4B5A62]/70 bg-[#141A1D] px-1.5 py-1">
        <div className="flex items-center gap-0.5">
          {(
            [
              { id: 'all', label: 'Tất' },
              { id: 'weapon', label: 'Vũ' },
              { id: 'armor', label: 'Giáp' },
              { id: 'accessory', label: 'Sức' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setBagFilter(f.id)}
              className={`rounded-[2px] border px-1.5 py-0.5 text-[8.5px] font-semibold cursor-pointer ${
                bagFilter === f.id
                  ? 'border-[#F5D061] bg-[#2D2415] text-[#F5D061]'
                  : 'border-[#38464E] bg-[#171F23] text-[#95A8B2] hover:text-[#E2ECEF]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              setBagSortMode((m) =>
                m === 'default' ? 'power' : m === 'power' ? 'quality' : 'default'
              )
            }
            title="Sắp xếp Hành Nang"
            className="flex items-center gap-0.5 rounded-[2px] border border-[#46565E] bg-[#1A2429] px-1.5 py-0.5 text-[8.5px] text-[#C8D8E0] hover:border-[#F5D061] cursor-pointer"
          >
            <ArrowUpDown className="h-2.5 w-2.5" />
            <span>{bagSortMode === 'power' ? 'LC' : bagSortMode === 'quality' ? 'Phẩm' : 'Xếp'}</span>
          </button>
          <button
            type="button"
            onClick={onSellJunk}
            title="Bán nhanh trang bị Trắng & Lục"
            className="flex items-center gap-0.5 rounded-[2px] border border-[#6E342D] bg-[#2A1514] px-1.5 py-0.5 text-[8.5px] text-[#FCA5A5] hover:bg-[#3F1D1B] cursor-pointer"
          >
            <Trash2 className="h-2.5 w-2.5" />
            <span>Rác</span>
          </button>
        </div>
      </div>

      {/* 6x5 Kiếm Thế 2009 Bag Grid + Selected Item Inspector + Currency Purse */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-1.5">
        <div className="grid grid-cols-6 gap-1 rounded-[2px] border border-[#43525A]/80 bg-[#0D1215] p-1.5">
          {Array.from({ length: BAG_CAPACITY }).map((_, idx) => {
            const item = filteredBagItems[idx];
            const isSel = item && selectedBagItem?.id === item.id;
            return (
              <button
                key={item ? item.id : `empty_${idx}`}
                type="button"
                onClick={() => item && setSelectedBagId(item.id)}
                onDoubleClick={() => item && onEquipItem(item)}
                title={item ? `${item.name} (Nháy đúp để trang bị)` : 'Ô trống'}
                className={`kt-slot flex h-[34px] w-[34px] items-center justify-center rounded-[2px] transition-colors ${
                  item
                    ? isSel
                      ? 'ring-1 ring-[#F5D061] border-[#F5D061] cursor-pointer'
                      : 'hover:border-[#9EB0BA] cursor-pointer'
                    : 'cursor-default opacity-65'
                }`}
              >
                {item && (
                  <PixelItemIcon
                    slot={item.slot}
                    quality={item.quality}
                    itemName={item.name}
                    sectId={player.sect}
                    enhance={item.enhance}
                    size="xs"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Item Detail & Quick Action */}
        <div className="rounded-[2px] border border-[#46565E]/80 bg-[#12191D] p-1.5 text-[9px]">
          {selectedBagItem ? (
            (() => {
              const eff = getEffectiveItemStats(selectedBagItem);
              const sellVal = QUALITY_META[selectedBagItem.quality].sellSilver;
              return (
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <PixelItemIcon
                      slot={selectedBagItem.slot}
                      quality={selectedBagItem.quality}
                      itemName={selectedBagItem.name}
                      sectId={player.sect}
                      enhance={selectedBagItem.enhance}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="truncate font-bold"
                          style={{ color: QUALITY_META[selectedBagItem.quality].color }}
                        >
                          {selectedBagItem.name}
                        </span>
                        <span className="shrink-0 font-mono text-[8.5px] text-[#F5D061] tabular-nums">
                          LC {formatNumber(selectedBagItem.power)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[8px] text-[#9EB2BC] tabular-nums">
                        <span>{SLOT_LABELS[selectedBagItem.slot]}</span>
                        <span>·</span>
                        <span style={{ color: QUALITY_META[selectedBagItem.quality].color }}>
                          {QUALITY_META[selectedBagItem.quality].name}
                        </span>
                        <span
                          className={
                            powerDelta > 0
                              ? 'font-semibold text-[#4ADE80]'
                              : powerDelta < 0
                              ? 'text-[#F87171]'
                              : 'text-[#94A3B8]'
                          }
                        >
                          ({powerDelta >= 0 ? `+${powerDelta}` : powerDelta})
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-2 text-[8px] text-[#CFE0E8] tabular-nums">
                        {eff.atk > 0 && <span>Công +{eff.atk}</span>}
                        {eff.def > 0 && <span>Thủ +{eff.def}</span>}
                        {eff.hp > 0 && <span>HP +{eff.hp}</span>}
                        {eff.crit > 0 && <span>CM +{eff.crit}%</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEquipItem(selectedBagItem)}
                      className="flex-1 rounded-[2px] border border-[#B05434] bg-gradient-to-b from-[#9E3524] to-[#6B1F14] py-1 text-[9.5px] font-bold text-[#FEF3C7] hover:brightness-110 cursor-pointer"
                    >
                      Trang Bị Ngay
                    </button>
                    <button
                      type="button"
                      onClick={() => onSellItem(selectedBagItem.id)}
                      className="rounded-[2px] border border-[#5B6B74] bg-[#1B2429] px-2 py-1 text-[9px] text-[#E2ECEF] hover:border-[#F87171] hover:text-[#FCA5A5] cursor-pointer tabular-nums"
                    >
                      Bán +{sellVal}
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="py-2 text-center text-[9px] text-[#8599A3]">
              Hành Nang trống. Đánh quái hoặc mở Rương Báu để nhận trang bị.
            </div>
          )}
        </div>

        {/* Currency Purse & Quick Resupply */}
        <div className="space-y-1.5 rounded-[2px] border border-[#46565E]/80 bg-[#101619] p-1.5 text-[9px] tabular-nums">
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <div className="flex justify-between">
              <span className="text-[#8FA3AD]">Bạc:</span>
              <span className="font-mono text-[#F5D061]">{formatNumber(player.silver)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8FA3AD]">Đồng:</span>
              <span className="font-mono text-[#FDE047]">{formatNumber(player.goldIngots)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8FA3AD]">Đá CH:</span>
              <span className="font-mono text-[#7DD3FC]">{player.enhanceStones}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8FA3AD]">Dược:</span>
              <span className="font-mono text-[#FCA5A5]">{player.potions}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 pt-0.5">
            <button
              type="button"
              onClick={onBuyPotion}
              disabled={player.silver < 400}
              className="rounded-[2px] border border-[#456B58] bg-[#162C22] py-1 text-[8.5px] font-semibold text-[#A7F3D0] hover:bg-[#1E3D2F] disabled:opacity-45 cursor-pointer whitespace-nowrap"
            >
              +5 Dược (400B)
            </button>
            <button
              type="button"
              onClick={onBuyStones}
              disabled={player.goldIngots < 50}
              className="rounded-[2px] border border-[#5B6B75] bg-[#19242B] py-1 text-[8.5px] font-semibold text-[#BAE6FD] hover:bg-[#22323B] disabled:opacity-45 cursor-pointer whitespace-nowrap"
            >
              +5 Đá CH (50Đ)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
