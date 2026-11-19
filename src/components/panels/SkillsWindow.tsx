import React, { useRef, useState } from 'react';
import { ELEMENT_META, SECTS } from '../../game/data';
import { formatNumber, formatPassiveBonusText, getOrderedSectSkills } from '../../game/engine';
import { PlayerState } from '../../game/types';
import { SkillIcon } from '../SkillIcon';
import { BookOpen, Sparkles, Swords, X } from 'lucide-react';

interface SkillsWindowProps {
  player: PlayerState;
  zIndex?: number;
  onFocus?: () => void;
  onClose: () => void;
  onUpgradeSkill: (skillId: string) => void;
  onSwitchBranch?: (branchIndex: 0 | 1) => void;
}

export const SkillsWindow: React.FC<SkillsWindowProps> = ({
  player,
  zIndex = 42,
  onFocus,
  onClose,
  onUpgradeSkill,
  onSwitchBranch,
}) => {
  const sect = SECTS[player.sect];
  const elem = ELEMENT_META[sect.element];
  const sectShort = sect.name.split(' ')[0];
  const activeBranchIndex: 0 | 1 = player.branchIndex === 1 ? 1 : 0;
  const orderedSkills = getOrderedSectSkills(player.sect, activeBranchIndex);

  const [section, setSection] = useState<'active' | 'passive'>('active');
  const [selectedSkillId, setSelectedSkillId] = useState<string>(orderedSkills[0]?.id || '');
  const [selectedPassiveId, setSelectedPassiveId] = useState<string>(sect.passives[0]?.id || '');

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
      x: Math.max(-320, Math.min(320, dragRef.current.origX + dx)),
      y: Math.max(-36, Math.min(window.innerHeight - 150, dragRef.current.origY + dy)),
    });
  };

  const handleTitleBarPointerUp = () => {
    dragRef.current = null;
  };

  const activeSkill = orderedSkills.find((s) => s.id === selectedSkillId) || orderedSkills[0];
  const activePassive = sect.passives.find((p) => p.id === selectedPassiveId) || sect.passives[0];

  return (
    <div
      onPointerDown={() => onFocus?.()}
      className="pointer-events-auto fixed left-1/2 top-[44px] flex max-h-[calc(100dvh-92px)] w-[264px] sm:w-[280px] flex-col kt-window text-[#E2ECEF] select-none"
      style={{
        zIndex,
        transform: `translate3d(calc(-50% + ${dragOffset.x}px), ${dragOffset.y}px, 0)`,
      }}
    >
      {/* Standalone Kiếm Thế 2009 Kỹ Năng Titlebar (F3) */}
      <div
        onPointerDown={handleTitleBarPointerDown}
        onPointerMove={handleTitleBarPointerMove}
        onPointerUp={handleTitleBarPointerUp}
        onPointerCancel={handleTitleBarPointerUp}
        className="kt-titlebar flex shrink-0 cursor-move items-center justify-between px-2 py-1"
      >
        <span className="font-mono text-[9px]" style={{ color: elem.color }}>
          {elem.name} · {sectShort}
        </span>
        <span className="font-serif text-[11.5px] font-bold tracking-wide text-[#F3F8F5] whitespace-nowrap">
          Kỹ Năng Môn Phái (F3)
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Đóng cửa sổ Kỹ Năng (F3)"
          className="flex h-[16px] w-[16px] items-center justify-center rounded-[2px] border border-[#8A9EA8]/70 bg-[#1B2B28] text-[#DCE6EA] hover:bg-[#7F1D1D] hover:text-white cursor-pointer"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      {/* Kỹ Năng ONLY Sub-Tabs: Võ Công (Chủ động) | Tâm Pháp (Bị động) */}
      <div className="flex shrink-0 items-end justify-between border-b border-[#5B6B73]/70 bg-[#141A1D] px-1.5 pt-1">
        <div className="flex items-end gap-0.5">
          <button
            type="button"
            onClick={() => setSection('active')}
            className={`flex items-center gap-1 rounded-t-[2px] border border-b-0 px-2 py-0.5 text-[9.5px] font-semibold cursor-pointer ${
              section === 'active'
                ? 'border-[#8DA0A9] bg-[#243236] text-[#F5D061]'
                : 'border-[#3E4C53] bg-[#161D21] text-[#98AAB3] hover:text-[#E2ECEF]'
            }`}
          >
            <Swords className="h-2.5 w-2.5" />
            <span>Võ Công ({sect.skills.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('passive')}
            className={`flex items-center gap-1 rounded-t-[2px] border border-b-0 px-2 py-0.5 text-[9.5px] font-semibold cursor-pointer ${
              section === 'passive'
                ? 'border-[#8DA0A9] bg-[#243236] text-[#F5D061]'
                : 'border-[#3E4C53] bg-[#161D21] text-[#98AAB3] hover:text-[#E2ECEF]'
            }`}
          >
            <BookOpen className="h-2.5 w-2.5" />
            <span>Tâm Pháp ({sect.passives.length})</span>
          </button>
        </div>
        <span className="pb-1 font-mono text-[8.5px] text-[#F5D061] tabular-nums">
          Bạc: {formatNumber(player.silver)}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-1.5">
        {section === 'active' ? (
          <>
            {([activeBranchIndex, activeBranchIndex === 0 ? 1 : 0] as const).map((bIdx, orderPos) => {
              const branchName = sect.branches[bIdx];
              const isPrimary = orderPos === 0;
              const branchSkills = orderedSkills.slice(orderPos * 3, orderPos * 3 + 3);
              return (
                <div key={branchName} className="space-y-1">
                  <div className="flex items-center justify-between px-0.5 text-[8.5px] font-bold uppercase tracking-wider">
                    <span className={isPrimary ? 'text-[#F5D061]' : 'text-[#9FB0A5]'}>
                      {isPrimary ? `★ Hướng Chính: ${branchName}` : `Song Tu: ${branchName}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!isPrimary && onSwitchBranch && (
                        <button
                          type="button"
                          onClick={() => onSwitchBranch(bIdx)}
                          className="rounded-[2px] border border-[#5B876D] bg-[#163125] px-1.5 py-0.5 text-[7.5px] font-semibold normal-case text-[#86EFAC] hover:brightness-115 cursor-pointer"
                        >
                          Đặt Làm Chính
                        </button>
                      )}
                      <span className="font-mono text-[#8FA3AE]">Phím {isPrimary ? '1–3' : '4–6'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {branchSkills.map((sk, localIdx) => {
                      const idx = orderPos * 3 + localIdx;
                      const lv = player.skillLevels[sk.id] || 0;
                      const unlocked = player.level >= sk.unlockLevel;
                      const isSel = activeSkill?.id === sk.id;
                      return (
                        <button
                          key={sk.id}
                          type="button"
                          onClick={() => setSelectedSkillId(sk.id)}
                          className={`flex flex-col items-center gap-0.5 rounded-[2px] border p-1 text-center transition-colors cursor-pointer ${
                            isSel
                              ? 'border-[#F5D061] bg-[#232015]'
                              : 'border-[#3A4A52] bg-[#12191D] hover:border-[#7B8E97]'
                          } ${!unlocked ? 'opacity-60' : ''}`}
                        >
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[2px] border border-[#4D5D66]">
                            <SkillIcon
                              sectId={player.sect}
                              skillType={sk.type}
                              vfxKind={sk.vfxKind}
                              skillIndex={idx}
                              color={sk.color}
                              accentColor={sk.accentColor}
                              size={30}
                              locked={!unlocked}
                              className="h-full w-full"
                            />
                            <span className="absolute right-0 bottom-0 bg-black/80 px-0.5 font-mono text-[7.5px] text-[#FEF3C7]">
                              {sk.keyBind}
                            </span>
                          </div>
                          <div className="w-full truncate text-[8.5px] font-bold text-[#F3EAD8]">
                            {sk.name}
                          </div>
                          <div className="font-mono text-[7.5px] text-[#9BB0BA] tabular-nums">
                            {unlocked ? `T${lv}/20` : `Lv.${sk.unlockLevel}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {activeSkill &&
              (() => {
                const lv = player.skillLevels[activeSkill.id] || 0;
                const unlocked = player.level >= activeSkill.unlockLevel;
                const isMax = lv >= 20;
                const cost = Math.round(450 * Math.pow(Math.max(1, lv + 1), 1.45));
                const dmgPct = Math.round(activeSkill.multiplier * 100 * (1 + Math.max(0, lv - 1) * 0.12));
                return (
                  <div className="space-y-1.5 rounded-[2px] border border-[#46565E]/80 bg-[#11171A] p-2 text-[9px]">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[10.5px] font-bold" style={{ color: activeSkill.color }}>
                        {activeSkill.name}
                      </span>
                      <span className="shrink-0 font-mono text-[8.5px] text-[#F5D061] tabular-nums">
                        {activeSkill.branch} · Tầng {lv}/20
                      </span>
                    </div>
                    <p className="text-[9px] leading-relaxed text-[#B8C8D0]">
                      {activeSkill.description}
                    </p>
                    <div className="text-[8.5px] text-[#86EFAC]">{activeSkill.effectText}</div>
                    <div className="grid grid-cols-3 gap-1 rounded-[2px] border border-[#324048] bg-[#0D1316] p-1 text-[8px] text-[#C6D5DC] tabular-nums">
                      <div>Uy lực: {dmgPct > 0 ? `${dmgPct}%` : 'Hỗ trợ'}</div>
                      <div>Hồi: {activeSkill.cooldown}s</div>
                      <div>Nội lực: {activeSkill.mpCost}</div>
                    </div>
                    <button
                      type="button"
                      disabled={!unlocked || isMax || player.silver < cost}
                      onClick={() => onUpgradeSkill(activeSkill.id)}
                      className="w-full rounded-[2px] border border-[#5B876D] bg-gradient-to-b from-[#234A37] to-[#153023] py-1.5 text-[9.5px] font-bold text-[#D1FAE5] hover:brightness-110 disabled:opacity-45 cursor-pointer tabular-nums"
                    >
                      {!unlocked
                        ? `Cần Đạt Cấp ${activeSkill.unlockLevel}`
                        : isMax
                        ? 'Đã Đạt Tầng Tối Đa (20/20)'
                        : `Lĩnh Ngộ Tầng ${lv + 1} (${formatNumber(cost)} Bạc)`}
                    </button>
                  </div>
                );
              })()}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1">
              {sect.passives.map((ps) => {
                const unlocked = player.level >= ps.unlockLevel;
                const isSel = activePassive?.id === ps.id;
                return (
                  <button
                    key={ps.id}
                    type="button"
                    onClick={() => setSelectedPassiveId(ps.id)}
                    className={`flex items-center gap-1.5 rounded-[2px] border p-1 text-left transition-colors cursor-pointer ${
                      isSel
                        ? 'border-[#F5D061] bg-[#232015]'
                        : 'border-[#3A4A52] bg-[#12191D] hover:border-[#7B8E97]'
                    } ${!unlocked ? 'opacity-55' : ''}`}
                  >
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] border"
                      style={{
                        borderColor: unlocked ? sect.color : '#475569',
                        backgroundColor: unlocked ? `${sect.color}22` : '#0F1417',
                        color: unlocked ? sect.color : '#64748B',
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[9.5px] font-bold text-[#F3EAD8]">
                        {ps.name}
                      </div>
                      <div className="font-mono text-[8px] tabular-nums text-[#9BB0BA]">
                        {unlocked ? (
                          <span className="text-[#4ADE80]">Đã kích hoạt</span>
                        ) : (
                          <span>Mở Lv.{ps.unlockLevel}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {activePassive && (
              <div className="space-y-1 rounded-[2px] border border-[#46565E]/80 bg-[#11171A] p-2 text-[9px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10.5px] font-bold" style={{ color: sect.color }}>
                    {activePassive.name}
                  </span>
                  <span className="font-mono text-[8.5px] text-[#A7F3D0] tabular-nums">
                    {player.level >= activePassive.unlockLevel
                      ? 'Tự động kích hoạt'
                      : `Cần Lv.${activePassive.unlockLevel}`}
                  </span>
                </div>
                <p className="text-[9px] leading-relaxed text-[#B8C8D0]">
                  {activePassive.description}
                </p>
                <div className="rounded-[2px] border border-[#324048] bg-[#0D1316] px-1.5 py-1 font-mono text-[8.5px] text-[#86EFAC] tabular-nums">
                  Hiệu quả: {formatPassiveBonusText(activePassive)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
