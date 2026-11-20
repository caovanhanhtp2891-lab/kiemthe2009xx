import React, { useMemo, useRef, useState } from 'react';
import { BookOpen, Eye, Layers, Shield, Sparkles, Swords, X, Zap } from 'lucide-react';
import { ELEMENT_META, SECTS } from '../../game/data';
import { formatNumber, getPlayerHotbarSkills, getSkillRankFactor } from '../../game/engine';
import {
  CatalogSkill,
  getBranchActiveSkills,
  getBranchPermanentPassives,
  getBranchTriggerPassives,
} from '../../game/fullSkillCatalog';
import { PlayerState } from '../../game/types';
import { SkillIcon } from '../SkillIcon';

interface SkillsWindowProps {
  player: PlayerState;
  zIndex?: number;
  onFocus?: () => void;
  onClose: () => void;
  onUpgradeSkill: (skillId: string) => void;
  onSwitchBranch?: (branchIndex: 0 | 1) => void;
  onEquipSkill?: (slotIndex: number, skillId: string) => void;
  onPreviewSkill?: (skillId: string) => void;
  onOpenVfxSheets?: () => void;
}

type SkillTab = 'active' | 'passive_permanent' | 'passive_trigger';

function getTierTag(skill: CatalogSkill): string {
  if (skill.unlockLevel === 180) return 'Chân Truyền 180';
  if (skill.unlockLevel === 150) return 'Tuyệt Kỹ 150';
  if (skill.unlockLevel === 125) return 'Trấn Phái 125';
  if (skill.unlockLevel === 170) return 'Giải Khống 170';
  if (skill.unlockLevel === 160) return 'Hồi Mạch 160';
  if (skill.unlockLevel === 140) return 'Hộ Pháp 140';
  return `Lv.${skill.unlockLevel}`;
}

function formatPassiveSummary(sk: CatalogSkill, rankFactor: number): string {
  const b = sk.passiveBonuses;
  if (!b) return sk.mechanicText;
  const parts: string[] = [];
  if (b.atkPct) parts.push(`+${Math.round(b.atkPct * rankFactor)}% Công`);
  if (b.defPct) parts.push(`+${Math.round(b.defPct * rankFactor)}% Thủ`);
  if (b.hpPct) parts.push(`+${Math.round(b.hpPct * rankFactor)}% Sinh Lực`);
  if (b.critPct) parts.push(`+${(b.critPct * rankFactor).toFixed(1)}% Chí Mạng`);
  if (b.critDmgPct) parts.push(`+${Math.round(b.critDmgPct * rankFactor)}% ST Chí Mạng`);
  if (b.dodgePct) parts.push(`+${(b.dodgePct * rankFactor).toFixed(1)}% Né`);
  if (b.allResistPct) parts.push(`+${(b.allResistPct * rankFactor).toFixed(1)}% Kháng`);
  if (b.moveSpeedPct) parts.push(`+${Math.round(b.moveSpeedPct * rankFactor)}% Tốc Chạy`);
  if (b.dmgReducePct) parts.push(`+${(b.dmgReducePct * rankFactor).toFixed(1)}% Giảm Sát Thương`);
  if (b.lifestealPct) parts.push(`+${(b.lifestealPct * rankFactor).toFixed(1)}% Hút Máu`);
  return parts.length > 0 ? parts.join(' · ') : sk.mechanicText;
}

export const SkillsWindow: React.FC<SkillsWindowProps> = ({
  player,
  zIndex = 42,
  onFocus,
  onClose,
  onUpgradeSkill,
  onSwitchBranch,
  onEquipSkill,
  onPreviewSkill,
  onOpenVfxSheets,
}) => {
  const sect = SECTS[player.sect];
  const elem = ELEMENT_META[sect.element];
  const sectShort = sect.name.split(' ')[0];
  const activeBranchIndex: 0 | 1 = player.branchIndex === 1 ? 1 : 0;

  const activeSkills = useMemo(
    () => getBranchActiveSkills(player.sect, activeBranchIndex),
    [player.sect, activeBranchIndex]
  );
  const permPassives = useMemo(
    () => getBranchPermanentPassives(player.sect, activeBranchIndex),
    [player.sect, activeBranchIndex]
  );
  const triggerPassives = useMemo(
    () => getBranchTriggerPassives(player.sect, activeBranchIndex),
    [player.sect, activeBranchIndex]
  );
  const hotbarSkills = useMemo(() => getPlayerHotbarSkills(player), [player]);

  const [tab, setTab] = useState<SkillTab>('active');
  const [selectedId, setSelectedId] = useState<string>(activeSkills[0]?.id || '');

  const currentList: CatalogSkill[] =
    tab === 'active'
      ? activeSkills
      : tab === 'passive_permanent'
      ? permPassives
      : triggerPassives;

  const selectedSkill =
    currentList.find((s) => s.id === selectedId) || currentList[0] || activeSkills[0];

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
      x: Math.max(-380, Math.min(380, dragRef.current.origX + dx)),
      y: Math.max(-36, Math.min(window.innerHeight - 160, dragRef.current.origY + dy)),
    });
  };

  const handleTitleBarPointerUp = () => {
    dragRef.current = null;
  };

  const equippedSlotBySkillId = useMemo(() => {
    const map: Record<string, number> = {};
    hotbarSkills.forEach((sk, idx) => {
      map[sk.id] = idx;
    });
    return map;
  }, [hotbarSkills]);

  return (
    <div
      onPointerDown={() => onFocus?.()}
      className="pointer-events-auto fixed left-1/2 top-[42px] flex max-h-[calc(100dvh-86px)] w-[348px] sm:w-[456px] flex-col kt-window text-[#E2ECEF] select-none"
      style={{
        zIndex,
        transform: `translate3d(calc(-50% + ${dragOffset.x}px), ${dragOffset.y}px, 0)`,
      }}
    >
      {/* Titlebar */}
      <div
        onPointerDown={handleTitleBarPointerDown}
        onPointerMove={handleTitleBarPointerMove}
        onPointerUp={handleTitleBarPointerUp}
        onPointerCancel={handleTitleBarPointerUp}
        className="kt-titlebar flex shrink-0 cursor-move items-center justify-between px-2.5 py-1"
      >
        <span className="font-mono text-[9.5px]" style={{ color: elem.color }}>
          {elem.name} · {sectShort}
        </span>
        <span className="font-serif text-[12px] font-bold tracking-wide text-[#F3F8F5] whitespace-nowrap">
          Võ Học Môn Phái 10–180 (F3)
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Đóng cửa sổ Kỹ Năng (F3)"
          className="flex h-[17px] w-[17px] items-center justify-center rounded-[2px] border border-[#8A9EA8]/70 bg-[#1B2B28] text-[#DCE6EA] hover:bg-[#7F1D1D] hover:text-white cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Active Branch Switcher Strip (Spec: 1 active branch at a time, free switch outside combat) */}
      <div className="flex shrink-0 items-center justify-between gap-1.5 border-b border-[#46565E]/80 bg-[#11181B] px-2 py-1.5">
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          {([0, 1] as const).map((bIdx) => {
            const bName = sect.branches[bIdx];
            const isCurrent = activeBranchIndex === bIdx;
            const bCount =
              getBranchActiveSkills(player.sect, bIdx).length +
              getBranchPermanentPassives(player.sect, bIdx).length +
              getBranchTriggerPassives(player.sect, bIdx).length;
            return (
              <button
                key={bName}
                type="button"
                onClick={() => {
                  if (!isCurrent && onSwitchBranch) {
                    onSwitchBranch(bIdx);
                  }
                }}
                className={`flex items-center justify-between rounded-[2px] border px-2 py-1 text-left transition-colors cursor-pointer ${
                  isCurrent
                    ? 'border-[#F5D061] bg-[#242014] text-[#FEF3C7]'
                    : 'border-[#38464E] bg-[#161E22] text-[#9BB0BA] hover:border-[#6B8577] hover:text-[#E2ECEF]'
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-[10px] font-bold leading-tight">
                    Nhánh {bName}
                  </div>
                  <div className="font-mono text-[8px] text-[#94A9B4] tabular-nums">
                    {isCurrent ? 'Đang vận hành' : 'Đổi nhánh miễn phí'} · {bCount} chiêu
                  </div>
                </div>
                {isCurrent && (
                  <span className="shrink-0 font-mono text-[8.5px] font-bold text-[#F5D061]">
                    CHÍNH
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs: Chủ động | Bị động thường trực | Bị động kích hoạt */}
      <div className="flex shrink-0 items-end justify-between border-b border-[#5B6B73]/70 bg-[#141A1D] px-2 pt-1">
        <div className="flex items-end gap-0.5">
          <button
            type="button"
            onClick={() => {
              setTab('active');
              setSelectedId(activeSkills[0]?.id || '');
            }}
            className={`flex items-center gap-1 rounded-t-[2px] border border-b-0 px-2 py-1 text-[9.5px] font-semibold cursor-pointer whitespace-nowrap ${
              tab === 'active'
                ? 'border-[#8DA0A9] bg-[#243236] text-[#F5D061]'
                : 'border-[#3E4C53] bg-[#161D21] text-[#98AAB3] hover:text-[#E2ECEF]'
            }`}
          >
            <Swords className="h-2.5 w-2.5" />
            <span>Chủ động ({activeSkills.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('passive_permanent');
              setSelectedId(permPassives[0]?.id || '');
            }}
            className={`flex items-center gap-1 rounded-t-[2px] border border-b-0 px-2 py-1 text-[9.5px] font-semibold cursor-pointer whitespace-nowrap ${
              tab === 'passive_permanent'
                ? 'border-[#8DA0A9] bg-[#243236] text-[#F5D061]'
                : 'border-[#3E4C53] bg-[#161D21] text-[#98AAB3] hover:text-[#E2ECEF]'
            }`}
          >
            <BookOpen className="h-2.5 w-2.5" />
            <span>Tâm pháp ({permPassives.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('passive_trigger');
              setSelectedId(triggerPassives[0]?.id || '');
            }}
            className={`flex items-center gap-1 rounded-t-[2px] border border-b-0 px-2 py-1 text-[9.5px] font-semibold cursor-pointer whitespace-nowrap ${
              tab === 'passive_trigger'
                ? 'border-[#8DA0A9] bg-[#243236] text-[#F5D061]'
                : 'border-[#3E4C53] bg-[#161D21] text-[#98AAB3] hover:text-[#E2ECEF]'
            }`}
          >
            <Zap className="h-2.5 w-2.5" />
            <span>Kích hoạt ({triggerPassives.length})</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 pb-0.5">
          {onOpenVfxSheets && (
            <button
              type="button"
              onClick={onOpenVfxSheets}
              title="Mở trọn bộ 7 bảng Sheet Hình Ảnh VFX (Ngũ Hành · Va Chạm · Đánh Trúng)"
              className="flex items-center gap-1 rounded-[2px] border border-[#7E6D3B] bg-[#241E10] px-1.5 py-0.5 text-[8.5px] font-bold text-[#FEF08A] hover:brightness-115 cursor-pointer whitespace-nowrap"
            >
              <Layers className="h-2.5 w-2.5" />
              <span>Sheet VFX</span>
            </button>
          )}
          <span className="font-mono text-[8.5px] text-[#F5D061] tabular-nums whitespace-nowrap">
            Bạc: {formatNumber(player.silver)}
          </span>
        </div>
      </div>

      {/* Main Split Content: Scrollable Skill Grid + Detailed Spec Inspector */}
      <div className="flex flex-1 min-h-0 flex-col gap-1.5 overflow-hidden p-2">
        {/* Scrollable Skill List */}
        <div className="grid max-h-[212px] shrink-0 grid-cols-2 gap-1 overflow-y-auto pr-0.5 sm:grid-cols-3">
          {currentList.map((sk, idx) => {
            const lv = player.skillLevels[sk.id] || 0;
            const unlocked = player.level >= sk.unlockLevel || lv > 0;
            const isSel = selectedSkill?.id === sk.id;
            const hotbarSlot = equippedSlotBySkillId[sk.id];
            const isMilestone =
              sk.unlockLevel === 180 || sk.unlockLevel === 150 || sk.unlockLevel === 125;

            return (
              <button
                key={sk.id}
                type="button"
                onClick={() => setSelectedId(sk.id)}
                className={`flex items-center gap-1.5 rounded-[2px] border p-1 text-left transition-colors cursor-pointer ${
                  isSel
                    ? 'border-[#F5D061] bg-[#242014]'
                    : isMilestone
                    ? 'border-[#635634] bg-[#151A1E] hover:border-[#B5984C]'
                    : 'border-[#36444C] bg-[#11181C] hover:border-[#6C828C]'
                } ${!unlocked ? 'opacity-65' : ''}`}
              >
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[2px] border border-[#4D5D66]">
                  <SkillIcon
                    sectId={player.sect}
                    skillType={sk.skillType}
                    vfxKind={sk.vfxKind}
                    skillIndex={idx}
                    color={sk.color}
                    accentColor={sk.accentColor}
                    size={30}
                    locked={!unlocked}
                    className="h-full w-full"
                  />
                  {hotbarSlot !== undefined && (
                    <span className="absolute right-0 bottom-0 bg-[#1B1609]/90 px-0.5 font-mono text-[7.5px] font-bold text-[#F5D061]">
                      {hotbarSlot + 1}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[9.5px] font-bold leading-tight"
                    style={{ color: isSel ? '#FEF3C7' : sk.color }}
                  >
                    {sk.name}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[8px] text-[#9BB0BA] tabular-nums">
                    {getTierTag(sk)} · {unlocked ? `H${Math.max(1, lv)}/${sk.maxRank}` : 'Chưa mở'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Rich Skill Inspector */}
        {selectedSkill &&
          (() => {
            const lv = player.skillLevels[selectedSkill.id] || 0;
            const unlocked = player.level >= selectedSkill.unlockLevel || lv > 0;
            const curRank = Math.max(1, lv);
            const isMax = lv >= selectedSkill.maxRank;
            const cost = Math.round(450 * Math.pow(Math.max(1, lv + 1), 1.42));
            const rankFactor = getSkillRankFactor(curRank, selectedSkill.maxRank);
            const maxFactor = 1.0;

            const curAtkPct = Math.round(selectedSkill.atkPctPerHit * 100 * rankFactor);
            const maxAtkPct = Math.round(selectedSkill.atkPctPerHit * 100 * maxFactor);
            const curFlat = Math.round(selectedSkill.flatDmgPerHit * rankFactor);
            const curDotPct = Math.round(selectedSkill.dotAtkPct * 100 * rankFactor);
            const equippedSlot = equippedSlotBySkillId[selectedSkill.id];

            return (
              <div className="flex flex-1 min-h-0 flex-col gap-1.5 overflow-y-auto rounded-[2px] border border-[#495B64] bg-[#0F1518] p-2 text-[9.5px]">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="truncate text-[11.5px] font-bold"
                        style={{ color: selectedSkill.color }}
                      >
                        {selectedSkill.name}
                      </span>
                      <span className="shrink-0 font-mono text-[8.5px] text-[#8FA3AE]">
                        {selectedSkill.id}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[8.5px] text-[#9EB5BF] tabular-nums">
                      {getTierTag(selectedSkill)} · {selectedSkill.role} · {selectedSkill.attackClass} · Hạng{' '}
                      <strong className="text-[#F5D061]">
                        {lv}/{selectedSkill.maxRank}
                      </strong>
                    </div>
                  </div>

                  {/* Live Canvas VFX Preview Button */}
                  {onPreviewSkill && (
                    <button
                      type="button"
                      onClick={() => onPreviewSkill(selectedSkill.id)}
                      title="Thi triển thử hiệu ứng hình ảnh & màu sắc chiêu thức ngay trên bản đồ"
                      className="flex shrink-0 items-center gap-1 rounded-[2px] border border-[#8E7B42] bg-[#241E10] px-2 py-1 text-[9px] font-bold text-[#FEF08A] hover:brightness-115 cursor-pointer whitespace-nowrap"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Xem Hiệu Ứng</span>
                    </button>
                  )}
                </div>

                {/* Core Combat Numbers */}
                <div className="grid grid-cols-4 gap-1 rounded-[2px] border border-[#2D3B42] bg-[#0A1013] px-1.5 py-1 font-mono text-[8.5px] text-[#C8D8DF] tabular-nums">
                  <div>
                    Hồi:{' '}
                    <strong className="text-[#F5D061]">
                      {selectedSkill.cooldown > 0
                        ? `${selectedSkill.cooldown}s`
                        : selectedSkill.internalCdSec > 0
                        ? `ICD ${selectedSkill.internalCdSec}s`
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    Nội lực:{' '}
                    <strong className="text-[#93C5FD]">
                      {selectedSkill.mpCost > 0 ? selectedSkill.mpCost : '0'}
                    </strong>
                  </div>
                  <div>
                    Đòn:{' '}
                    <strong className="text-[#FDE68A]">
                      {selectedSkill.hits > 0 ? `${selectedSkill.hits} hit` : 'Hỗ trợ'}
                    </strong>
                  </div>
                  <div>
                    Uy lực:{' '}
                    <strong className="text-[#86EFAC]">
                      {curAtkPct > 0 ? `${curAtkPct}%` : 'Tâm pháp'}
                    </strong>
                  </div>
                </div>

                {/* Scaling & Mechanic text */}
                <div className="space-y-1 text-[9px] leading-relaxed text-[#C6D5DC]">
                  <p>{selectedSkill.mechanicText}</p>
                  {selectedSkill.activationType === 'active' && curAtkPct > 0 && (
                    <div className="font-mono text-[8.5px] text-[#86EFAC] tabular-nums">
                      Hạng {curRank}: {curAtkPct}% Công
                      {curFlat > 0 ? ` + ${formatNumber(curFlat)}` : ''}
                      {selectedSkill.hits > 1 ? ` × ${selectedSkill.hits} đòn` : ''}
                      {curDotPct > 0
                        ? ` · DoT ${curDotPct}%/${selectedSkill.dotIntervalSec}s (${selectedSkill.dotDurationSec}s)`
                        : ''}{' '}
                      (Tối đa H{selectedSkill.maxRank}: {maxAtkPct}%)
                    </div>
                  )}
                  {selectedSkill.activationType === 'passive_permanent' && (
                    <div className="font-mono text-[8.5px] text-[#86EFAC] tabular-nums">
                      Hiệu lực nhánh chính (H{curRank}): {formatPassiveSummary(selectedSkill, rankFactor)}
                    </div>
                  )}
                  {selectedSkill.triggerCondition && selectedSkill.triggerCondition !== '-' && (
                    <div className="text-[8.5px] text-[#FDE68A]">
                      Điều kiện kích hoạt: {selectedSkill.triggerCondition}
                    </div>
                  )}
                  {selectedSkill.ccText &&
                    selectedSkill.ccText !== 'Không' &&
                    selectedSkill.ccText !== '-' && (
                      <div className="text-[8.5px] text-[#FCA5A5]">
                        Khống chế: {selectedSkill.ccText}
                      </div>
                    )}
                  {selectedSkill.supportText &&
                    selectedSkill.supportText !== 'Không' &&
                    selectedSkill.supportText !== '-' && (
                      <div className="text-[8.5px] text-[#A7F3D0]">
                        Hỗ trợ: {selectedSkill.supportText}
                      </div>
                    )}
                </div>

                {/* VFX & Color Palette Specification */}
                <div className="space-y-1 rounded-[2px] border border-[#2F3D45] bg-[#0B1114] p-1.5 text-[8.5px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 font-bold text-[#E8D5A7]">
                      <Sparkles className="h-2.5 w-2.5 text-[#F5D061]" />
                      <span>Hiệu ứng & Bảng màu</span>
                    </span>
                    <span className="font-mono text-[8px] text-[#8FA3AE] tabular-nums">
                      {selectedSkill.spriteFrames}f · ≤{selectedSkill.maxParticles} hạt
                    </span>
                  </div>

                  {/* 3 Spec HEX Swatches */}
                  <div className="flex items-center gap-2 font-mono text-[8px] text-[#B8C8D0]">
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-[1px] border border-white/30"
                        style={{ backgroundColor: selectedSkill.color }}
                      />
                      Chính {selectedSkill.color}
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-[1px] border border-white/30"
                        style={{ backgroundColor: selectedSkill.accentColor }}
                      />
                      Nhấn {selectedSkill.accentColor}
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-[1px] border border-white/30"
                        style={{ backgroundColor: selectedSkill.darkColor }}
                      />
                      Nền {selectedSkill.darkColor}
                    </span>
                  </div>

                  <div className="text-[#B8C8D0]">
                    <strong className="text-[#E2ECEF]">Hình tượng:</strong> {selectedSkill.vfxMotif}
                  </div>
                  {selectedSkill.vfxTravel && selectedSkill.vfxTravel !== '-' && (
                    <div className="text-[#A4B8C2]">
                      <strong className="text-[#D3E0E6]">Xuất chiêu:</strong> {selectedSkill.vfxTravel}
                    </div>
                  )}
                  {selectedSkill.vfxHit && selectedSkill.vfxHit !== '-' && (
                    <div className="text-[#A4B8C2]">
                      <strong className="text-[#D3E0E6]">Khi trúng:</strong> {selectedSkill.vfxHit}
                    </div>
                  )}
                </div>

                {/* Hotbar Assignment Strip (for Active Skills only) */}
                {selectedSkill.activationType === 'active' && onEquipSkill && (
                  <div className="flex items-center justify-between gap-1.5 rounded-[2px] border border-[#34434B] bg-[#0B1114] px-2 py-1">
                    <span className="text-[8.5px] font-semibold text-[#C6D5DC] whitespace-nowrap">
                      Gán phím tắt:
                    </span>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
                        const isAssignedHere = equippedSlot === slotIdx;
                        return (
                          <button
                            key={slotIdx}
                            type="button"
                            onClick={() => onEquipSkill(slotIdx, selectedSkill.id)}
                            title={`Gán ${selectedSkill.name} vào phím ${slotIdx + 1}`}
                            className={`h-5 w-6 rounded-[2px] border font-mono text-[9px] font-bold transition-colors cursor-pointer ${
                              isAssignedHere
                                ? 'border-[#F5D061] bg-[#362C12] text-[#FEF3C7]'
                                : 'border-[#44545D] bg-[#161F24] text-[#B8C8D0] hover:border-[#86EFAC] hover:text-white'
                            }`}
                          >
                            {slotIdx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Upgrade Rank Button */}
                <button
                  type="button"
                  disabled={!unlocked || isMax || player.silver < cost}
                  onClick={() => onUpgradeSkill(selectedSkill.id)}
                  className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-[2px] border border-[#5B876D] bg-gradient-to-b from-[#234A37] to-[#153023] py-1.5 text-[9.5px] font-bold text-[#D1FAE5] hover:brightness-110 disabled:opacity-45 cursor-pointer tabular-nums"
                >
                  <Shield className="h-3 w-3 shrink-0" />
                  <span>
                    {!unlocked
                      ? `Cần Đạt Cấp ${selectedSkill.unlockLevel} Để Lĩnh Ngộ`
                      : isMax
                      ? `Đã Đạt Hạng Tối Đa (${selectedSkill.maxRank}/${selectedSkill.maxRank})`
                      : `Lĩnh Ngộ Hạng ${lv + 1}/${selectedSkill.maxRank} (${formatNumber(cost)} Bạc)`}
                  </span>
                </button>
              </div>
            );
          })()}
      </div>
    </div>
  );
};
