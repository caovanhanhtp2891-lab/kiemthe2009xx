import React, { useState } from 'react';
import { Award, Check, Crown, Sparkles, X } from 'lucide-react';
import { MANTLES, TITLES } from '../../game/data';
import { formatNumber } from '../../game/engine';
import { PlayerState } from '../../game/types';

interface TitleMantleModalProps {
  player: PlayerState;
  onClose: () => void;
  onEquipTitle: (titleId: string) => void;
  onUpgradeMantle: () => void;
}

export const TitleMantleModal: React.FC<TitleMantleModalProps> = ({
  player,
  onClose,
  onEquipTitle,
  onUpgradeMantle,
}) => {
  const [tab, setTab] = useState<'mantle' | 'title'>('mantle');
  const currentMantle = MANTLES.find((m) => m.id === player.mantleId) || MANTLES[0];
  const nextMantle = MANTLES.find((m) => m.id === player.mantleId + 1) || null;

  const canUpgradeMantle =
    !!nextMantle &&
    player.wealth >= nextMantle.requiredWealth &&
    player.merit >= nextMantle.requiredMerit &&
    player.silver >= nextMantle.silverCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="kt-window flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden text-[#F4E8CD]">
        <div className="kt-titlebar flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-[#F7DA85]" />
            <h2 className="font-wuxia text-2xl font-bold text-[#F7DA85]">
              Quân Hàm Phi Phong &amp; Danh Hiệu Giang Hồ
            </h2>
          </div>
          <button
            onClick={onClose}
            className="kt-btn-bronze p-1.5 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#5B4323] bg-[#16100B] px-5 py-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTab('mantle')}
              className={`px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                tab === 'mantle' ? 'kt-btn-crimson' : 'kt-btn-bronze'
              }`}
            >
              Quân Hàm (Phi Phong)
            </button>
            <button
              onClick={() => setTab('title')}
              className={`px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                tab === 'title' ? 'kt-btn-crimson' : 'kt-btn-bronze'
              }`}
            >
              Danh Hiệu Thành Tựu ({player.unlockedTitles.length}/{TITLES.length})
            </button>
          </div>
          <div className="font-mono text-xs text-[#C7B89E] tabular-nums">
            Tài Phú: <strong className="text-[#F5D061]">{formatNumber(player.wealth)}</strong> ·
            Công Trạng: <strong className="text-[#38BDF8]">{formatNumber(player.merit)}</strong>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'mantle' ? (
            <div className="space-y-6">
              {/* Current & Next Upgrade Hero */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded border border-[#443222] bg-[#18130F] p-5">
                  <div className="text-xs text-[#9A8C78]">Quân Hàm Hiện Tại</div>
                  <div
                    className="mt-1 font-wuxia text-3xl font-bold"
                    style={{ color: currentMantle.color }}
                  >
                    {currentMantle.name}
                  </div>
                  <div className="mt-1 text-xs text-[#C7B89E]">{currentMantle.auraStyle}</div>
                  <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs text-[#E5D8C0] tabular-nums">
                    <div>Công: +{currentMantle.bonusAtk}</div>
                    <div>Thủ: +{currentMantle.bonusDef}</div>
                    <div>Sinh Lực: +{formatNumber(currentMantle.bonusHp)}</div>
                    <div>Chí Mạng: +{currentMantle.bonusCrit}%</div>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded border border-[#634828] bg-[#1D150F] p-5">
                  {nextMantle ? (
                    <>
                      <div>
                        <div className="text-xs text-[#F5D061]">Bậc Thăng Cấp Kế Tiếp</div>
                        <div
                          className="mt-1 font-wuxia text-3xl font-bold"
                          style={{ color: nextMantle.color }}
                        >
                          {nextMantle.name}
                        </div>
                        <div className="mt-1 text-xs text-[#DFD3BE]">{nextMantle.auraStyle}</div>
                        <div className="mt-3 space-y-1 font-mono text-xs tabular-nums">
                          <div
                            className={
                              player.wealth >= nextMantle.requiredWealth
                                ? 'text-[#4ADE80]'
                                : 'text-[#F87171]'
                            }
                          >
                            Tài Phú: {formatNumber(player.wealth)} /{' '}
                            {formatNumber(nextMantle.requiredWealth)}
                          </div>
                          <div
                            className={
                              player.merit >= nextMantle.requiredMerit
                                ? 'text-[#4ADE80]'
                                : 'text-[#F87171]'
                            }
                          >
                            Công Trạng: {formatNumber(player.merit)} /{' '}
                            {formatNumber(nextMantle.requiredMerit)}
                          </div>
                          <div
                            className={
                              player.silver >= nextMantle.silverCost
                                ? 'text-[#4ADE80]'
                                : 'text-[#F87171]'
                            }
                          >
                            Phí chế tác: {formatNumber(nextMantle.silverCost)} Bạc
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={onUpgradeMantle}
                        disabled={!canUpgradeMantle}
                        className="mt-4 w-full rounded border border-[#E5B95C]/80 bg-gradient-to-b from-[#991B1B] to-[#6B1212] py-2.5 text-xs font-semibold text-[#FEF3C7] hover:brightness-110 disabled:opacity-40 cursor-pointer"
                      >
                        {canUpgradeMantle
                          ? `Thăng Cấp Phi Phong ${nextMantle.name}`
                          : 'Chưa Đủ Tài Phú / Công Trạng / Bạc'}
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Sparkles className="mb-2 h-8 w-8 text-[#F5D061]" />
                      <div className="font-wuxia text-2xl font-bold text-[#F5D061]">
                        Đạt Cảnh Giới Tối Thượng Vô Song!
                      </div>
                      <p className="mt-1 text-xs text-[#C7B89E]">
                        Hào quang Hoàng Kim Đế Vương chiếu rọi khắp giang hồ.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* All 6 Mantle Progression Roadmap */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {MANTLES.filter((m) => m.id > 0).map((m) => {
                  const reached = player.mantleId >= m.id;
                  return (
                    <div
                      key={m.id}
                      className={`rounded border p-3.5 ${
                        reached
                          ? 'border-[#6A502E] bg-[#1C1610]'
                          : 'border-[#292018] bg-[#14100D] opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-wuxia text-xl font-bold" style={{ color: m.color }}>
                          {m.name}
                        </span>
                        {reached && <Check className="h-4 w-4 text-[#4ADE80]" />}
                      </div>
                      <div className="mt-1 text-[11px] text-[#A89B86]">{m.auraStyle}</div>
                      <div className="mt-2 font-mono text-[11px] text-[#DFD3BE] tabular-nums">
                        +{m.bonusAtk} Công · +{m.bonusDef} Thủ · +{formatNumber(m.bonusHp)} HP
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {TITLES.map((t) => {
                const unlocked = player.unlockedTitles.includes(t.id);
                const equipped = player.activeTitleId === t.id;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between gap-3 rounded border p-4 ${
                      equipped
                        ? 'border-[#D4AF37] bg-[#1F1711]'
                        : unlocked
                        ? 'border-[#3D2E20] bg-[#17120E]'
                        : 'border-[#261D16] bg-[#130F0C] opacity-65'
                    }`}
                  >
                    <div>
                      <div
                        className="font-wuxia text-xl font-bold"
                        style={{ color: unlocked ? t.color : '#8E806D' }}
                      >
                        « {t.name} »
                      </div>
                      <div className="mt-0.5 text-xs text-[#A89B86]">{t.requirementText}</div>
                      <div className="mt-1.5 font-mono text-[11px] text-[#DFD3BE] tabular-nums">
                        Vĩnh viễn: +{t.bonusAtk} Công · +{t.bonusDef} Thủ · +{t.bonusHp} HP · +
                        {t.bonusCrit}% CM
                      </div>
                    </div>
                    <button
                      onClick={() => onEquipTitle(t.id)}
                      disabled={!unlocked || equipped}
                      className={`shrink-0 rounded px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                        equipped
                          ? 'bg-[#2B4A2E] text-[#BBF7D0]'
                          : unlocked
                          ? 'bg-[#8F1D1D] text-[#FEF3C7] hover:bg-[#A62121]'
                          : 'bg-[#251E19] text-[#7D7060] cursor-not-allowed'
                      }`}
                    >
                      {equipped ? 'Đang Hiển Thị' : unlocked ? 'Đeo Danh Hiệu' : 'Chưa Mở'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
