import React, { useEffect, useState } from 'react';
import {
  Castle,
  Clock,
  Coins,
  Crown,
  Flag,
  Gift,
  Leaf,
  MapPin,
  Pickaxe,
  Shield,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';
import { ASSET_PATHS, ELEMENT_META } from '../../game/data';
import { formatNumber } from '../../game/engine';
import { ComputedStats, GuildInfo, ResourceTerritory, SiegeCity } from '../../game/types';

interface SiegeWarModalProps {
  cities: SiegeCity[];
  territories: ResourceTerritory[];
  stats: ComputedStats;
  playerGuild: GuildInfo | null;
  initialTab?: 'siege' | 'guild_war';
  onClose: () => void;
  onLaunchSiege: (cityId: SiegeCity['id']) => void;
  onClaimTribute: (cityId: SiegeCity['id']) => void;
  onLaunchGuildWar: (territoryId: string) => void;
  onHarvestTerritory: (territoryId: string) => void;
  onOpenGuild: () => void;
}

const HARVEST_COOLDOWN_MS = 120_000;

export const SiegeWarModal: React.FC<SiegeWarModalProps> = ({
  cities,
  territories,
  stats,
  playerGuild,
  initialTab = 'siege',
  onClose,
  onLaunchSiege,
  onClaimTribute,
  onLaunchGuildWar,
  onHarvestTerritory,
  onOpenGuild,
}) => {
  const [tab, setTab] = useState<'siege' | 'guild_war'>(initialTab);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ownedCityCount = cities.filter((c) => c.controlledByPlayerGuild).length;
  const ownedTerritories = territories.filter((t) => t.controlledByPlayerGuild);
  const totalAtkBuff = ownedTerritories.reduce((sum, t) => sum + t.bonusAtkPct, 0);
  const totalDefBuff = ownedTerritories.reduce((sum, t) => sum + t.bonusDefPct, 0);
  const totalResBuff = ownedTerritories.reduce((sum, t) => sum + t.bonusAllResist, 0);

  const renderResourceIcon = (type: ResourceTerritory['resourceType']) => {
    if (type === 'ore') return <Pickaxe className="h-4 w-4 text-[#F5D061]" />;
    if (type === 'herbs') return <Leaf className="h-4 w-4 text-[#4ADE80]" />;
    if (type === 'gold_mine') return <Coins className="h-4 w-4 text-[#FBBF24]" />;
    return <Sparkles className="h-4 w-4 text-[#C084FC]" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="kt-window flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden text-[#F4E8CD]">
        {/* Banner Header */}
        <div className="relative overflow-hidden border-b border-[#7C5C2B] px-6 py-4">
          <img
            src={tab === 'siege' ? ASSET_PATHS.arenaSiege : ASSET_PATHS.arenaWild}
            alt={tab === 'siege' ? 'Công Thành Chiến' : 'Bang Hội Chiến'}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#120D0B]/95 via-[#18100C]/85 to-[#120D0B]/70" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#F7DA85]">
                {tab === 'siege' ? <Castle className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                <span>
                  {tab === 'siege'
                    ? 'Chiến Trường Quy Mô Lớn · Tranh Đoạt Long Trụ'
                    : 'Bang Hội Chiến · Tranh Đoạt Lãnh Địa Tài Nguyên Ngoại Thành'}
                </span>
              </div>
              <h2 className="mt-1 font-wuxia text-3xl font-bold text-[#FEF3C7]">
                {tab === 'siege'
                  ? 'Công Thành Chiến · Tam Đại Hoàng Thành'
                  : 'Bang Hội Chiến · Tứ Đại Lãnh Địa Tài Nguyên'}
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-[#DFD3BE]">
                {tab === 'siege'
                  ? 'Dẫn dắt 5 hảo thủ Bang Ta hỗn chiến với thủ vệ Bang Địch, công phá Cổng Thành và chiếm giữ Long Trụ trong 95 giây để đăng quang Thành Chủ, vang danh kênh Thế Giới và lĩnh bổng lộc mỗi ngày.'
                  : 'Khiêu chiến các bang hội đối địch tại 4 điểm tài nguyên ngoài Thành Trì chính. Đánh bại Bang Chủ thủ hộ và hạ Chiến Kỳ Bang Địch để nhận buff thuộc tính toàn bang và thu hoạch Bạc, Nguyên Bảo, Đá Cường Hóa định kỳ.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="kt-btn-bronze p-1.5 cursor-pointer"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Segmented Tab Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#3A2B1D] bg-[#16100D] px-6 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('siege')}
              className={`flex items-center gap-2 rounded border px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'siege'
                  ? 'border-[#D4AF37] bg-[#2D1A12] text-[#FEF3C7]'
                  : 'border-[#3B2C1E] bg-[#1B1410] text-[#B5A68E] hover:border-[#6E4D29] hover:text-[#F5D061]'
              }`}
            >
              <Castle className="h-4 w-4 text-[#F5D061]" />
              <span>Công Thành Chiến · Hoàng Thành ({ownedCityCount}/{cities.length})</span>
            </button>
            <button
              onClick={() => setTab('guild_war')}
              className={`flex items-center gap-2 rounded border px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'guild_war'
                  ? 'border-[#D4AF37] bg-[#2D1A12] text-[#FEF3C7]'
                  : 'border-[#3B2C1E] bg-[#1B1410] text-[#B5A68E] hover:border-[#6E4D29] hover:text-[#F5D061]'
              }`}
            >
              <Swords className="h-4 w-4 text-[#F87171]" />
              <span>Bang Hội Chiến · Tài Nguyên ({ownedTerritories.length}/{territories.length})</span>
            </button>
          </div>

          <span className="font-mono text-xs text-[#F5D061] tabular-nums">
            Lực chiến hiện tại: {formatNumber(stats.power)}
          </span>
        </div>

        {/* Guild Status & Territory Buff Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2D2117] bg-[#17110E] px-6 py-2.5 text-xs">
          {playerGuild ? (
            <div className="flex flex-wrap items-center gap-2 text-[#DFD3BE]">
              <Flag className="h-4 w-4 text-[#F5D061]" />
              <span>
                Đang xuất chiến dưới cờ <strong className="text-[#F5D061]">{playerGuild.name}</strong>{' '}
                (Buff Bang +{playerGuild.buffAtkPct}% Công · +{playerGuild.buffDefPct}% Thủ)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-[#FBBF24]">
              <span>
                Bạn chưa gia nhập Bang Hội (vẫn có thể xuất chiến với danh nghĩa Liên Minh Giang Hồ).
              </span>
              <button
                onClick={onOpenGuild}
                className="font-semibold text-[#F5D061] underline cursor-pointer"
              >
                Lập / Gia Nhập Bang
              </button>
            </div>
          )}

          {tab === 'guild_war' && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#4ADE80] tabular-nums">
              <Shield className="h-3.5 w-3.5" />
              <span>
                Hiệu lực lãnh địa: +{totalAtkBuff}% Công · +{totalDefBuff}% Thủ · +{totalResBuff}% Kháng
              </span>
            </div>
          )}
        </div>

        {/* Tab 1: 3 Fortress Cities */}
        {tab === 'siege' && (
          <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-6 md:grid-cols-3">
            {cities.map((city) => {
              const alreadyClaimed = city.lastClaimDate === todayKey;
              return (
                <div
                  key={city.id}
                  className={`flex flex-col justify-between rounded border p-5 ${
                    city.controlledByPlayerGuild
                      ? 'border-[#D4AF37] bg-[#21180F]'
                      : 'border-[#3E2E20] bg-[#18120E]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-wuxia text-2xl font-bold text-[#F5D061]">{city.name}</h3>
                      {city.controlledByPlayerGuild && (
                        <Crown className="h-5 w-5 text-[#FDE047]" />
                      )}
                    </div>

                    <div className="mt-2 space-y-1.5 border-y border-[#2E2318] py-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#9A8C78]">Bang Chiếm Giữ</span>
                        <span
                          className={`font-semibold ${
                            city.controlledByPlayerGuild ? 'text-[#4ADE80]' : 'text-[#F87171]'
                          }`}
                        >
                          {city.defenderGuild}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9A8C78]">Thành Chủ</span>
                        <span className="text-[#FEF3C7]">{city.defenderLeader}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9A8C78]">Độ Bền Cổng / Long Trụ</span>
                        <span className="font-mono text-[#E5D8C0] tabular-nums">
                          {formatNumber(city.gateHp)} / {formatNumber(city.pillarHp)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9A8C78]">LC Khuyến Nghị</span>
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            stats.power >= city.recommendedPower
                              ? 'text-[#4ADE80]'
                              : 'text-[#FBBF24]'
                          }`}
                        >
                          {formatNumber(city.recommendedPower)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs">
                      <div className="text-[#C9A86A]">Bổng Lộc Thành Chủ Hằng Ngày:</div>
                      <div className="mt-1 font-mono text-[#E5D8C0] tabular-nums">
                        {formatNumber(city.dailySilver)} Bạc · {city.dailyIngots} Nguyên Bảo ·{' '}
                        {city.dailyStones} Đá Cường Hóa
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    {city.controlledByPlayerGuild ? (
                      <>
                        <button
                          onClick={() => onClaimTribute(city.id)}
                          disabled={alreadyClaimed}
                          className="flex w-full items-center justify-center gap-1.5 rounded border border-[#D4AF37]/80 bg-[#2E2210] py-2.5 text-xs font-semibold text-[#FDE68A] hover:brightness-110 disabled:opacity-45 cursor-pointer"
                        >
                          <Gift className="h-4 w-4" />
                          <span>
                            {alreadyClaimed ? 'Đã Lĩnh Bổng Lộc Hôm Nay' : 'Lĩnh Bổng Lộc Thành Chủ'}
                          </span>
                        </button>
                        <button
                          onClick={() => onLaunchSiege(city.id)}
                          className="w-full rounded border border-[#443222] bg-[#140F0C] py-2 text-xs text-[#C7B89E] hover:border-[#D4AF37] cursor-pointer"
                        >
                          Diễn Tập Phòng Thủ
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onLaunchSiege(city.id)}
                        className="flex w-full items-center justify-center gap-2 rounded border border-[#E5B95C]/80 bg-gradient-to-b from-[#991B1B] to-[#6B1212] py-2.5 text-xs font-semibold text-[#FEF3C7] shadow-md hover:brightness-110 cursor-pointer"
                      >
                        <Swords className="h-4 w-4" />
                        <span>Khai Chiến Công Thành</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: 4 Outer-Map Resource Territories (Bang Hội Chiến) */}
        {tab === 'guild_war' && (
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2">
            {territories.map((t) => {
              const elem = ELEMENT_META[t.element];
              const elapsed = t.lastClaimAt ? nowTs - t.lastClaimAt : HARVEST_COOLDOWN_MS;
              const remainSec = Math.max(0, Math.ceil((HARVEST_COOLDOWN_MS - elapsed) / 1000));
              const canHarvest = t.controlledByPlayerGuild && remainSec === 0;

              return (
                <div
                  key={t.id}
                  className={`flex flex-col justify-between rounded border p-5 ${
                    t.controlledByPlayerGuild
                      ? 'border-[#D4AF37] bg-[#21180F]'
                      : 'border-[#3E2E20] bg-[#18120E]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-[11px] text-[#B5A68E]">
                          <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span>{t.region}</span>
                          <span className="text-[#5D4B38]">·</span>
                          <span className="font-semibold" style={{ color: elem.color }}>
                            Hệ {elem.name}
                          </span>
                        </div>
                        <h3 className="mt-0.5 font-wuxia text-2xl font-bold text-[#F5D061]">
                          {t.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 rounded border border-[#443322] bg-[#140F0C] px-2.5 py-1 text-[11px] font-medium text-[#E5D8C0]">
                        {renderResourceIcon(t.resourceType)}
                        <span>{t.resourceLabel}</span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 border-y border-[#2E2318] py-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#9A8C78]">Bang Đang Chiếm Giữ</span>
                        <span
                          className={`font-semibold ${
                            t.controlledByPlayerGuild ? 'text-[#4ADE80]' : 'text-[#F87171]'
                          }`}
                        >
                          {t.defenderGuildName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9A8C78]">Bang Chủ Thủ Hộ</span>
                        <span className="text-[#FEF3C7]">{t.defenderLeader}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9A8C78]">Độ Bền Chiến Kỳ</span>
                        <span className="font-mono text-[#E5D8C0] tabular-nums">
                          {formatNumber(t.bannerHp)} HP
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9A8C78]">LC Khuyến Nghị</span>
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            stats.power >= t.recommendedPower ? 'text-[#4ADE80]' : 'text-[#FBBF24]'
                          }`}
                        >
                          {formatNumber(t.recommendedPower)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9A8C78]">Hiệu Ứng Chiếm Lãnh Địa</span>
                        <span className="font-semibold text-[#4ADE80]">{t.bonusLabel}</span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs">
                      <div className="text-[#C9A86A]">Sản Lượng Thu Hoạch (Mỗi 2 phút):</div>
                      <div className="mt-1 font-mono text-[#E5D8C0] tabular-nums">
                        {formatNumber(t.claimSilver)} Bạc · {t.claimIngots} Nguyên Bảo ·{' '}
                        {t.claimStones} Đá CH
                        {t.claimPotions > 0 ? ` · ${t.claimPotions} Dược` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {t.controlledByPlayerGuild ? (
                      <>
                        <button
                          onClick={() => onHarvestTerritory(t.id)}
                          disabled={!canHarvest}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded border border-[#D4AF37]/80 bg-[#2E2210] px-3 py-2.5 text-xs font-semibold text-[#FDE68A] hover:brightness-110 disabled:opacity-50 cursor-pointer"
                        >
                          {canHarvest ? (
                            <>
                              <Gift className="h-4 w-4" />
                              <span>Thu Hoạch Tài Nguyên</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-4 w-4" />
                              <span className="font-mono tabular-nums">
                                Chờ Thu Hoạch ({remainSec}s)
                              </span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => onLaunchGuildWar(t.id)}
                          className="rounded border border-[#443222] bg-[#140F0C] px-3.5 py-2.5 text-xs text-[#C7B89E] hover:border-[#D4AF37] cursor-pointer"
                        >
                          Tập Trận
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onLaunchGuildWar(t.id)}
                        className="flex w-full items-center justify-center gap-2 rounded border border-[#E5B95C]/80 bg-gradient-to-b from-[#991B1B] to-[#6B1212] py-2.5 text-xs font-semibold text-[#FEF3C7] shadow-md hover:brightness-110 cursor-pointer"
                      >
                        <Swords className="h-4 w-4" />
                        <span>Khiêu Chiến Bang {t.defenderGuildName}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

