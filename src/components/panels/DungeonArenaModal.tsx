import React, { useState } from 'react';
import { Award, ShieldAlert, Swords, Trophy, X } from 'lucide-react';
import { DUNGEONS, ELEMENT_META, MANTLES, SECTS } from '../../game/data';
import { formatNumber, getElementMultiplier } from '../../game/engine';
import { ComputedStats, PlayerState, SimulatedMaster } from '../../game/types';

interface DungeonArenaModalProps {
  player: PlayerState;
  stats: ComputedStats;
  masters: SimulatedMaster[];
  initialTab?: 'dungeon' | 'arena';
  onClose: () => void;
  onStartDungeon: (dungeonId: string, floor: number) => void;
  onChallengeMaster: (master: SimulatedMaster) => void;
}

export const DungeonArenaModal: React.FC<DungeonArenaModalProps> = ({
  player,
  stats,
  masters,
  initialTab = 'dungeon',
  onClose,
  onStartDungeon,
  onChallengeMaster,
}) => {
  const [tab, setTab] = useState<'dungeon' | 'arena'>(initialTab);
  const playerElem = SECTS[player.sect].element;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="kt-window flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden text-[#F4E8CD]">
        <div className="kt-titlebar flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Swords className="h-5 w-5 text-[#F7DA85]" />
            <h2 className="font-wuxia text-2xl font-bold text-[#F7DA85]">
              Phó Bản Vượt Ải &amp; Lôi Đài 1v1
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
              onClick={() => setTab('dungeon')}
              className={`px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                tab === 'dungeon' ? 'kt-btn-crimson' : 'kt-btn-bronze'
              }`}
            >
              Phó Bản (PVE)
            </button>
            <button
              onClick={() => setTab('arena')}
              className={`px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                tab === 'arena' ? 'kt-btn-crimson' : 'kt-btn-bronze'
              }`}
            >
              Lôi Đài Xếp Hạng (1v1 PVP)
            </button>
          </div>
          <div className="font-mono text-xs text-[#D2C1A0] tabular-nums">
            Hạng Lôi Đài: <strong className="text-[#F7DA85]">#{player.arenaRank}</strong> · Thắng{' '}
            {player.arenaWins} trận · Danh Vọng {formatNumber(player.reputation)}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'dungeon' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {DUNGEONS.map((d) => {
                const cleared = player.dungeonProgress[d.id] || 0;
                const nextFloor = Math.min(d.maxFloors, cleared + 1);
                const locked = player.level < d.unlockLevel;
                const elem = ELEMENT_META[d.element];
                const recPower = Math.round(d.basePower * Math.pow(1.24, nextFloor - 1));
                return (
                  <div
                    key={d.id}
                    className="flex flex-col justify-between rounded border border-[#3C2D1F] bg-[#18130F] p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: elem.color }}>Hệ {elem.name}</span>
                        <span className="font-mono text-[#F5D061] tabular-nums">
                          Đã vượt: {cleared}/{d.maxFloors} tầng
                        </span>
                      </div>
                      <h3 className="mt-1 font-wuxia text-2xl font-bold text-[#FEF3C7]">
                        {d.name}
                      </h3>
                      <div className="text-xs text-[#C9A86A]">{d.subtitle}</div>
                      <p className="mt-2.5 text-xs leading-relaxed text-[#C7B89E]">
                        {d.description}
                      </p>

                      <div className="mt-4 space-y-1.5 border-t border-[#2A2018] pt-3 text-xs font-mono tabular-nums">
                        <div className="flex justify-between">
                          <span className="font-sans text-[#9A8C78]">Tầng tiếp theo</span>
                          <span className="text-[#FEF3C7]">Tầng {nextFloor}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-sans text-[#9A8C78]">LC khuyến nghị</span>
                          <span
                            className={
                              stats.power >= recPower ? 'text-[#4ADE80]' : 'text-[#FBBF24]'
                            }
                          >
                            {formatNumber(recPower)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-sans text-[#9A8C78]">Phần thưởng</span>
                          <span className="text-[#C084FC]">
                            {3 + nextFloor} Đá · {120 + nextFloor * 45} DV
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onStartDungeon(d.id, nextFloor)}
                      disabled={locked}
                      className="mt-5 w-full rounded border border-[#E5B95C]/70 bg-gradient-to-b from-[#991B1B] to-[#6B1212] py-2.5 text-xs font-semibold text-[#FEF3C7] hover:brightness-110 disabled:opacity-40 cursor-pointer"
                    >
                      {locked ? `Yêu cầu Cấp ${d.unlockLevel}` : `Vào Ải Tầng ${nextFloor}`}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#3B2C1E] bg-[#18130F] px-4 py-3 text-xs text-[#C7B89E]">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#F5D061]" />
                  <span>
                    Chiến thắng cao thủ xếp trên để đoạt ngay thứ hạng của họ trên bảng Lôi Đài và
                    mở khóa danh hiệu Độc Cô Cầu Bại!
                  </span>
                </div>
                <span className="font-mono text-[#F5D061] tabular-nums">
                  Lực chiến của bạn: {formatNumber(stats.power)}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {masters
                  .slice()
                  .sort((a, b) => a.rank - b.rank)
                  .map((m) => {
                    const mSect = SECTS[m.sect];
                    const mantle = MANTLES.find((x) => x.id === m.mantleId) || MANTLES[0];
                    const mult = getElementMultiplier(playerElem, mSect.element);
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-3 rounded border border-[#2E231A] bg-[#17120E] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-[#F5D061] tabular-nums">
                              #{m.rank}
                            </span>
                            <span className="truncate font-semibold text-[#FEF3C7]">{m.name}</span>
                            <span
                              className="text-xs font-semibold whitespace-nowrap"
                              style={{ color: mantle.color }}
                            >
                              {mantle.name}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#A89B86]">
                            <span style={{ color: mSect.color }}>
                              {mSect.name} ({mSect.elementName})
                            </span>
                            <span>·</span>
                            <span className="font-mono tabular-nums">Lv.{m.level}</span>
                            <span>·</span>
                            <span className="font-mono text-[#E5D8C0] tabular-nums">
                              LC {formatNumber(m.power)}
                            </span>
                            {mult > 1.05 && (
                              <span className="text-[#4ADE80]">· Bạn khắc hệ (+22%)</span>
                            )}
                            {mult < 0.95 && (
                              <span className="text-[#F87171]">· Bị khắc hệ</span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => onChallengeMaster(m)}
                          className="shrink-0 rounded bg-[#8F1D1D] px-3.5 py-2 text-xs font-semibold text-[#FEF3C7] hover:bg-[#A62121] cursor-pointer whitespace-nowrap"
                        >
                          Tỷ Thí 1v1
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
