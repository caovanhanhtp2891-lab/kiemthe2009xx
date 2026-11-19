import React from 'react';
import { Compass, Flame, MapPin, Skull, X } from 'lucide-react';
import { ASSET_PATHS, ELEMENT_META, MAPS, WEATHER_META, WORLD_BOSSES } from '../../game/data';
import { formatNumber } from '../../game/engine';
import { PlayerState } from '../../game/types';

interface MapBossModalProps {
  player: PlayerState;
  bossTimers: Record<string, number>; // seconds remaining until respawn (0 = alive)
  onClose: () => void;
  onSelectMap: (mapId: string) => void;
  onChallengeBoss: (bossId: string) => void;
  onOpenGoogleMaps?: () => void;
}

export const MapBossModal: React.FC<MapBossModalProps> = ({
  player,
  bossTimers,
  onClose,
  onSelectMap,
  onChallengeBoss,
  onOpenGoogleMaps,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="kt-window flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden text-[#F4E8CD]">
        <div className="kt-titlebar flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-[#F7DA85]" />
            <h2 className="font-wuxia text-2xl font-bold text-[#F7DA85]">
              Bản Đồ Luyện Công &amp; Boss Hoàng Kim
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onOpenGoogleMaps && (
              <button
                onClick={onOpenGoogleMaps}
                className="kt-btn-bronze flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#F7DA85] cursor-pointer whitespace-nowrap"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Địa Đồ Google Maps</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="kt-btn-bronze p-1.5 cursor-pointer"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-12">
          {/* Left: Grinding Maps */}
          <div className="space-y-3 lg:col-span-6">
            <div className="text-xs font-semibold tracking-wider text-[#C9A86A]">
              BẢN ĐỒ LUYỆN CÔNG (AUTO CÀY CẤP & SĂN ĐỒ)
            </div>
            {MAPS.map((m) => {
              const active = player.currentMapId === m.id;
              const elem = ELEMENT_META[m.element];
              const locked = player.level < m.minLevel;
              return (
                <div
                  key={m.id}
                  className={`rounded border p-4 transition-colors ${
                    active
                      ? 'border-[#D4AF37] bg-[#1F1711]'
                      : 'border-[#2E2319] bg-[#17120E]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-wuxia text-xl font-bold text-[#FEF3C7]">{m.name}</h3>
                        <span className="text-xs font-semibold" style={{ color: elem.color }}>
                          Hệ {elem.name}
                        </span>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                            m.isSafeZone
                              ? 'border-[#2D5A3D] bg-[#13261A] text-[#86EFAC]'
                              : 'border-[#6E2626] bg-[#291212] text-[#FCA5A5]'
                          }`}
                        >
                          {m.isSafeZone ? 'Khu An Toàn' : 'Ngoài Thành · PK'}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-[#9A8C78]">
                        Cấp khuyến nghị: Lv.{m.minLevel} – Lv.{m.maxLevel}
                      </div>
                    </div>
                    <button
                      onClick={() => onSelectMap(m.id)}
                      disabled={locked}
                      className={`rounded px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#2D4A2E] text-[#BBF7D0]'
                          : locked
                          ? 'bg-[#26201B] text-[#7D7060] cursor-not-allowed'
                          : 'bg-[#8F1D1D] text-[#FEF3C7] hover:bg-[#A62121]'
                      }`}
                    >
                      {active ? 'Đang Luyện Công' : locked ? `Cần Lv.${m.minLevel}` : 'Di Chuyển'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[#C7B89E]">{m.description}</p>
                  <div className="mt-2 text-[11px] text-[#A89B86]">
                    Quái vật: {m.mobs.map((mb) => mb.name).join(' · ')}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#9A8C78]">
                    <span>Thời tiết:</span>
                    {m.weatherPool.map((wId, idx) => {
                      const wm = WEATHER_META[wId];
                      return (
                        <span key={wId} className="font-mono tabular-nums" style={{ color: wm.color }}>
                          {wm.name}
                          {wm.allResistDelta !== 0
                            ? ` (${wm.allResistDelta > 0 ? `+${wm.allResistDelta}%` : `${wm.allResistDelta}%`})`
                            : ''}
                          {idx < m.weatherPool.length - 1 ? ' ·' : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Golden World Bosses */}
          <div className="space-y-3 lg:col-span-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#F5D061]">
                <Flame className="h-3.5 w-3.5 text-[#EF4444]" />
                <span>BOSS HOÀNG KIM (RƠI TRANG BỊ HIẾM)</span>
              </div>
              <span className="text-[11px] text-[#9A8C78]">Hồi sinh định kỳ</span>
            </div>

            {WORLD_BOSSES.map((boss) => {
              const cd = bossTimers[boss.id] || 0;
              const alive = cd <= 0;
              const elem = ELEMENT_META[boss.element];
              return (
                <div
                  key={boss.id}
                  className="flex gap-3.5 rounded border border-[#493420] bg-[#19130F] p-3.5"
                >
                  <img
                    src={ASSET_PATHS.bossEmblem}
                    alt={boss.name}
                    referrerPolicy="no-referrer"
                    className="h-20 w-20 shrink-0 rounded border border-[#7C5A2B] object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate font-wuxia text-xl font-bold text-[#F5D061]">
                          {boss.name}
                        </h3>
                        <span className="font-mono text-xs text-[#C7B89E] tabular-nums whitespace-nowrap">
                          Lv.{boss.level} ·{' '}
                          <span style={{ color: elem.color }}>Hệ {elem.name}</span>
                        </span>
                      </div>
                      <div className="text-xs text-[#DFD3BE]">{boss.title}</div>
                      <p className="mt-1 text-[11px] text-[#A89B86]">{boss.description}</p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="font-mono text-[11px] text-[#D7CCB8] tabular-nums">
                        {formatNumber(boss.silverReward)} Bạc · {boss.goldIngotReward} NB ·{' '}
                        {boss.stoneReward} Đá
                      </div>
                      <button
                        onClick={() => onChallengeBoss(boss.id)}
                        disabled={!alive}
                        className={`flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                          alive
                            ? 'bg-gradient-to-b from-[#B45309] to-[#78350F] text-[#FEF3C7] hover:brightness-110'
                            : 'bg-[#261E19] text-[#9A8C78] font-mono tabular-nums cursor-not-allowed'
                        }`}
                      >
                        <Skull className="h-3.5 w-3.5" />
                        <span>{alive ? 'Khiêu Chiến' : `Hồi sinh ${cd}s`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
