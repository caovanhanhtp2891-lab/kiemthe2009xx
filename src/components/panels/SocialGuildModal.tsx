import React, { useState } from 'react';
import {
  ArrowUpCircle,
  Flame,
  Gift,
  Heart,
  PlusCircle,
  Shield,
  Sparkles,
  Swords,
  Users,
  Wind,
  X,
} from 'lucide-react';
import { GUILD_TECHS, MANTLES, SECTS } from '../../game/data';
import { formatNumber, getGuildTechUpgradeCost } from '../../game/engine';
import {
  ComputedStats,
  GuildInfo,
  GuildTechDef,
  PlayerState,
  SimulatedMaster,
} from '../../game/types';

interface SocialGuildModalProps {
  player: PlayerState;
  stats: ComputedStats;
  guilds: GuildInfo[];
  masters: SimulatedMaster[];
  initialTab?: 'guild' | 'friends' | 'ranking';
  onClose: () => void;
  onJoinGuild: (guildId: string) => void;
  onCreateGuild: (name: string, motto: string) => void;
  onLeaveGuild: () => void;
  onDonateGuild: (type: 'silver' | 'ingot') => void;
  onUpgradeGuildTech: (techId: string) => void;
  onAddFriend: (masterId: string) => void;
  onGiftFriend: (masterId: string) => void;
  onDuelMaster: (master: SimulatedMaster) => void;
  onWhisperMaster: (master: SimulatedMaster) => void;
}

export const SocialGuildModal: React.FC<SocialGuildModalProps> = ({
  player,
  stats,
  guilds,
  masters,
  initialTab = 'guild',
  onClose,
  onJoinGuild,
  onCreateGuild,
  onLeaveGuild,
  onDonateGuild,
  onUpgradeGuildTech,
  onAddFriend,
  onGiftFriend,
  onDuelMaster,
  onWhisperMaster,
}) => {
  const [tab, setTab] = useState<'guild' | 'friends' | 'ranking'>(initialTab);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildMotto, setNewGuildMotto] = useState('Huynh đệ đồng tâm, bá chủ võ lâm!');

  const techLevels = player.guildTechLevels || {};

  const formatTechValue = (tech: GuildTechDef, level: number): string => {
    if (tech.allResistPerLevel) return `+${tech.allResistPerLevel * level}% Kháng Ngũ Hành`;
    if (tech.critDamagePerLevel) return `+${tech.critDamagePerLevel * level}% ST Chí Mạng`;
    if (tech.dodgePerLevel) return `+${Number((tech.dodgePerLevel * level).toFixed(1))}% Né Tránh`;
    if (tech.atkPerLevel) return `+${formatNumber(tech.atkPerLevel * level)} Công`;
    if (tech.hpPerLevel && tech.defPerLevel) {
      return `+${formatNumber(tech.hpPerLevel * level)} HP · +${formatNumber(tech.defPerLevel * level)} Thủ`;
    }
    return '';
  };

  const renderTechIcon = (iconKey: GuildTechDef['iconKey'], color: string) => {
    if (iconKey === 'resist') return <Shield className="h-4 w-4" style={{ color }} />;
    if (iconKey === 'crit_dmg') return <Flame className="h-4 w-4" style={{ color }} />;
    if (iconKey === 'dodge') return <Wind className="h-4 w-4" style={{ color }} />;
    if (iconKey === 'atk') return <Swords className="h-4 w-4" style={{ color }} />;
    return <Heart className="h-4 w-4" style={{ color }} />;
  };

  const myGuild = guilds.find((g) => g.id === player.guildId) || null;
  const friendIds = new Set(player.friends.map((f) => f.masterId));

  // Combined leaderboard including player
  const leaderboard = [
    ...masters.map((m) => ({
      id: m.id,
      name: m.name,
      sect: m.sect,
      level: m.level,
      power: m.power,
      mantleId: m.mantleId,
      guildName: m.guildName,
      isSelf: false,
      masterRef: m,
    })),
    {
      id: 'self',
      name: player.name,
      sect: player.sect,
      level: player.level,
      power: stats.power,
      mantleId: player.mantleId,
      guildName: myGuild?.name || 'Tự Do',
      isSelf: true,
      masterRef: null as SimulatedMaster | null,
    },
  ].sort((a, b) => b.power - a.power);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuildName.trim()) return;
    onCreateGuild(newGuildName.trim(), newGuildMotto.trim() || 'Hành hiệp trượng nghĩa!');
    setNewGuildName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="kt-window flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden text-[#F4E8CD]">
        <div className="kt-titlebar flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[#F7DA85]" />
            <h2 className="font-wuxia text-2xl font-bold text-[#F7DA85]">
              Bang Hội · Hảo Hữu · Bảng Xếp Hạng
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
            {[
              { id: 'guild', label: 'Bang Hội' },
              { id: 'friends', label: `Bạn Bè (${player.friends.length})` },
              { id: 'ranking', label: 'Bảng Xếp Hạng Lực Chiến' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as 'guild' | 'friends' | 'ranking')}
                className={`px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  tab === t.id ? 'kt-btn-crimson' : 'kt-btn-bronze'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="font-mono text-xs text-[#D2C1A0] tabular-nums">
            Cống Hiến: <strong className="text-[#F7DA85]">{formatNumber(player.guildContribution)}</strong>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'guild' && (
            <div className="space-y-6">
              {myGuild ? (
                <>
                <div className="rounded border border-[#614729] bg-[#1B140E] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#2F2318] pb-4">
                    <div>
                      <div className="text-xs text-[#C9A86A]">
                        Bang Hội Của Bạn · Cấp {myGuild.level}
                      </div>
                      <h3 className="font-wuxia text-3xl font-bold text-[#F5D061]">
                        {myGuild.name}
                      </h3>
                      <p className="mt-1 text-xs italic text-[#DFD3BE]">“{myGuild.motto}”</p>
                    </div>
                    <button
                      onClick={onLeaveGuild}
                      className="rounded border border-[#5B352C] bg-[#241311] px-3 py-1.5 text-xs text-[#FCA5A5] hover:bg-[#361A17] cursor-pointer"
                    >
                      Rời Bang
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <div className="text-xs text-[#9A8C78]">Bang Chủ</div>
                      <div className="text-sm font-semibold text-[#FEF3C7]">{myGuild.leader}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#9A8C78]">Thành Viên</div>
                      <div className="font-mono text-sm font-semibold tabular-nums">
                        {myGuild.members}/{myGuild.maxMembers}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#9A8C78]">Tổng Lực Chiến</div>
                      <div className="font-mono text-sm font-semibold text-[#F5D061] tabular-nums">
                        {formatNumber(myGuild.power)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#9A8C78]">Buff Thuộc Tính Bang</div>
                      <div className="font-mono text-xs font-semibold text-[#4ADE80] tabular-nums">
                        +{myGuild.buffAtkPct}% Công · +{myGuild.buffDefPct}% Thủ · +{myGuild.buffHpPct}% HP
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#2F2318] pt-4">
                    <div className="text-xs text-[#C7B89E]">
                      Cống hiến xây dựng Bang Hội để nhận Điểm Cống Hiến, nâng cấp Buff bang và học
                      Kỹ Năng Bang Hội:
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDonateGuild('silver')}
                        disabled={player.silver < 1000}
                        className="rounded bg-[#8F1D1D] px-3.5 py-2 text-xs font-semibold text-[#FEF3C7] hover:bg-[#A62121] disabled:opacity-40 cursor-pointer whitespace-nowrap"
                      >
                        Cống Hiến 1.000 Bạc (+120 CH)
                      </button>
                      <button
                        onClick={() => onDonateGuild('ingot')}
                        disabled={player.goldIngots < 20}
                        className="rounded border border-[#D4AF37]/70 bg-[#2C1F0E] px-3.5 py-2 text-xs font-semibold text-[#F5D061] hover:brightness-110 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                      >
                        Cống Hiến 20 Nguyên Bảo (+450 CH)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Kỹ Năng Bang Hội (Guild Tech) */}
                <div className="rounded border border-[#4D3822] bg-[#16110D] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2D2217] pb-3.5">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#F5D061]">
                        <Sparkles className="h-4 w-4" />
                        <span>KỸ NĂNG BANG HỘI · TÂM PHÁP TRUYỀN THỪA</span>
                      </div>
                      <p className="mt-1 text-xs text-[#B5A68E]">
                        Tiêu hao <strong className="text-[#F5D061]">Điểm Cống Hiến</strong> để nâng
                        cấp các tuyệt học nội công giúp tăng vĩnh viễn Kháng Ngũ Hành, Sát Thương Chí
                        Mạng, Tỉ Lệ Né Tránh và Lực Chiến.
                      </p>
                    </div>
                    <div className="rounded border border-[#4E3A22] bg-[#1F1710] px-3 py-1.5 text-right font-mono text-xs tabular-nums">
                      <div className="text-[10px] text-[#9A8C78]">Cống Hiến Khả Dụng</div>
                      <div className="text-sm font-bold text-[#F5D061]">
                        {formatNumber(player.guildContribution)} CH
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
                    {GUILD_TECHS.map((tech) => {
                      const curLvl = techLevels[tech.id] || 0;
                      const isMax = curLvl >= tech.maxLevel;
                      const cost = getGuildTechUpgradeCost(tech, curLvl);
                      const canAfford = player.guildContribution >= cost;
                      const pct = Math.min(100, (curLvl / tech.maxLevel) * 100);

                      return (
                        <div
                          key={tech.id}
                          className="flex flex-col justify-between rounded border border-[#36281B] bg-[#1B140F] p-4 transition-colors hover:border-[#63482B]"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#4A3723] bg-[#130E0B]">
                                  {renderTechIcon(tech.iconKey, tech.color)}
                                </div>
                                <div>
                                  <h4 className="font-wuxia text-lg font-bold text-[#FEF3C7]">
                                    {tech.name}
                                  </h4>
                                  <div
                                    className="text-[11px] font-semibold"
                                    style={{ color: tech.color }}
                                  >
                                    {tech.statLabel}
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono text-xs font-semibold text-[#F5D061] tabular-nums whitespace-nowrap">
                                Cấp {curLvl}/{tech.maxLevel}
                              </span>
                            </div>

                            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-sm bg-[#291F16]">
                              <div
                                className="h-full transition-all duration-200"
                                style={{ width: `${pct}%`, backgroundColor: tech.color }}
                              />
                            </div>

                            <p className="mt-2 text-[11px] leading-relaxed text-[#B5A68E]">
                              {tech.description}
                            </p>

                            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded bg-[#140F0C] px-2.5 py-1.5 font-mono text-[11px] tabular-nums">
                              <span className="text-[#C7B89E]">
                                Hiện tại:{' '}
                                <strong className="text-[#4ADE80]">
                                  {curLvl > 0 ? formatTechValue(tech, curLvl) : 'Chưa học'}
                                </strong>
                              </span>
                              {!isMax && (
                                <span className="text-[#F5D061]">
                                  → {formatTechValue(tech, curLvl + 1)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3">
                            <button
                              onClick={() => onUpgradeGuildTech(tech.id)}
                              disabled={isMax || !canAfford}
                              className={`flex w-full items-center justify-center gap-1.5 rounded border py-2 text-xs font-semibold transition-colors cursor-pointer ${
                                isMax
                                  ? 'border-[#334636] bg-[#162219] text-[#86EFAC] cursor-default'
                                  : canAfford
                                  ? 'border-[#D4AF37]/80 bg-gradient-to-b from-[#991B1B] to-[#6B1212] text-[#FEF3C7] hover:brightness-110'
                                  : 'border-[#35281C] bg-[#17120E] text-[#7D7060] cursor-not-allowed'
                              }`}
                            >
                              <ArrowUpCircle className="h-3.5 w-3.5" />
                              <span>
                                {isMax
                                  ? 'Đã Đạt Cảnh Giới Tối Đa'
                                  : `Nâng Cấp (${formatNumber(cost)} Cống Hiến)`}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
              ) : (
                <div className="space-y-5">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  {/* Join existing guilds */}
                  <div className="space-y-3 lg:col-span-7">
                    <div className="text-xs font-semibold tracking-wider text-[#C9A86A]">
                      DANH SÁCH BANG HỘI ĐANG CHIÊU MỘ
                    </div>
                    {guilds.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between gap-3 rounded border border-[#34271B] bg-[#18130F] p-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-wuxia text-xl font-bold text-[#F5D061]">
                              {g.name}
                            </span>
                            <span className="font-mono text-xs text-[#A89B86]">Lv.{g.level}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-[#C7B89E]">
                            Bang chủ: {g.leader} · {g.members}/{g.maxMembers} thành viên
                          </div>
                          <div className="mt-1 font-mono text-[11px] text-[#4ADE80] tabular-nums">
                            Buff: +{g.buffAtkPct}% Công · +{g.buffDefPct}% Thủ · +{g.buffHpPct}% HP
                          </div>
                        </div>
                        <button
                          onClick={() => onJoinGuild(g.id)}
                          className="shrink-0 rounded bg-[#8F1D1D] px-4 py-2 text-xs font-semibold text-[#FEF3C7] hover:bg-[#A62121] cursor-pointer whitespace-nowrap"
                        >
                          Gia Nhập
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Create new guild */}
                  <form
                    onSubmit={handleCreate}
                    className="flex flex-col justify-between rounded border border-[#4A3623] bg-[#19130E] p-5 lg:col-span-5"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4 text-[#F5D061]" />
                        <h3 className="font-wuxia text-2xl font-bold text-[#FEF3C7]">
                          Lập Bang Khai Phái
                        </h3>
                      </div>
                      <p className="text-xs text-[#C7B89E]">
                        Tự mình đứng ra lập bang, chiêu mộ hào kiệt thiên hạ và dẫn quân đánh chiếm
                        Biện Kinh, Tương Dương, Lâm An.
                      </p>
                      <div>
                        <label className="mb-1 block text-xs text-[#C9A86A]">Tên Bang Hội</label>
                        <input
                          type="text"
                          maxLength={20}
                          value={newGuildName}
                          onChange={(e) => setNewGuildName(e.target.value)}
                          placeholder="VD: Cửu Long Hội"
                          className="w-full rounded border border-[#443322] bg-[#0F0B09] px-3 py-2 text-sm text-[#FEF3C7] focus:border-[#D4AF37] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-[#C9A86A]">Tôn Chỉ Bang</label>
                        <input
                          type="text"
                          maxLength={60}
                          value={newGuildMotto}
                          onChange={(e) => setNewGuildMotto(e.target.value)}
                          className="w-full rounded border border-[#443322] bg-[#0F0B09] px-3 py-2 text-sm text-[#FEF3C7] focus:border-[#D4AF37] focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!newGuildName.trim() || player.silver < 1500}
                      className="mt-5 w-full rounded border border-[#E5B95C]/80 bg-gradient-to-b from-[#991B1B] to-[#6B1212] py-2.5 text-xs font-semibold text-[#FEF3C7] hover:brightness-110 disabled:opacity-40 cursor-pointer"
                    >
                      Thành Lập Bang Hội (1.500 Bạc)
                    </button>
                  </form>
                </div>

                {/* Guild Tech Unlock Preview */}
                <div className="rounded border border-[#3B2C1E] bg-[#16110D] px-4 py-3 text-xs text-[#C7B89E]">
                  <span className="font-semibold text-[#F5D061]">Kỹ Năng Bang Hội:</span> Gia nhập
                  hoặc thành lập Bang Hội để mở khóa 5 bộ tâm pháp bang (Kháng Ngũ Hành, Sát Thương
                  Chí Mạng, Tỉ Lệ Né Tránh, Công Kích &amp; Sinh Lực) nâng cấp bằng Điểm Cống Hiến.
                </div>
                </div>
              )}
            </div>
          )}

          {tab === 'friends' && (
            <div className="space-y-3">
              {player.friends.length === 0 ? (
                <div className="rounded border border-[#2B2017] bg-[#16110E] p-10 text-center text-xs text-[#9A8C78]">
                  Chưa có hảo hữu nào. Hãy xem Bảng Xếp Hạng hoặc nhấn vào tên cao thủ trên khung
                  Chat để kết bạn!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {player.friends.map((fr) => {
                    const m = masters.find((x) => x.id === fr.masterId);
                    if (!m) return null;
                    const s = SECTS[m.sect];
                    return (
                      <div
                        key={fr.masterId}
                        className="flex items-center justify-between gap-3 rounded border border-[#35281C] bg-[#18130F] p-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#FEF3C7]">{m.name}</span>
                            <span className="text-xs" style={{ color: s.color }}>
                              {s.name}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-[#C7B89E]">
                            <Heart className="h-3.5 w-3.5 text-[#F43F5E]" />
                            <span className="font-mono tabular-nums">
                              Thân mật: {fr.intimacy}
                            </span>
                            <span>·</span>
                            <span className="font-mono tabular-nums">LC {formatNumber(m.power)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onGiftFriend(m.id)}
                            disabled={player.silver < 300}
                            title="Tặng Hoa Hồng (+20 Thân mật, 300 Bạc)"
                            className="flex items-center gap-1 rounded border border-[#6E2D45] bg-[#29131C] px-2.5 py-1.5 text-xs text-[#FDA4AF] hover:brightness-110 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                          >
                            <Gift className="h-3.5 w-3.5" />
                            <span>Tặng Quà</span>
                          </button>
                          <button
                            onClick={() => onWhisperMaster(m)}
                            className="rounded border border-[#443222] bg-[#15100D] px-2.5 py-1.5 text-xs text-[#DFD3BE] hover:border-[#D4AF37] cursor-pointer whitespace-nowrap"
                          >
                            Mật
                          </button>
                          <button
                            onClick={() => onDuelMaster(m)}
                            className="rounded bg-[#8F1D1D] px-2.5 py-1.5 text-xs font-semibold text-[#FEF3C7] hover:bg-[#A62121] cursor-pointer whitespace-nowrap"
                          >
                            Tỷ Thí
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'ranking' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2F2319] text-[#9A8C78]">
                    <th className="py-2.5 pr-3">Hạng</th>
                    <th className="py-2.5 pr-3">Cao Thủ</th>
                    <th className="py-2.5 pr-3">Môn Phái</th>
                    <th className="py-2.5 pr-3">Phi Phong</th>
                    <th className="py-2.5 pr-3">Bang Hội</th>
                    <th className="py-2.5 pr-3 text-right">Cấp</th>
                    <th className="py-2.5 pr-3 text-right">Lực Chiến</th>
                    <th className="py-2.5 text-right">Tương Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#221A13]">
                  {leaderboard.map((row, idx) => {
                    const s = SECTS[row.sect];
                    const mantle = MANTLES.find((m) => m.id === row.mantleId) || MANTLES[0];
                    const isFriend = row.masterRef && friendIds.has(row.masterRef.id);
                    return (
                      <tr
                        key={row.id}
                        className={row.isSelf ? 'bg-[#251A11]' : 'hover:bg-[#19130F]'}
                      >
                        <td className="py-2.5 pr-3 font-mono font-bold text-[#F5D061] tabular-nums">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold text-[#FEF3C7]">
                          {row.name} {row.isSelf && '(Bạn)'}
                        </td>
                        <td className="py-2.5 pr-3" style={{ color: s.color }}>
                          {s.name}
                        </td>
                        <td className="py-2.5 pr-3 font-medium" style={{ color: mantle.color }}>
                          {mantle.name}
                        </td>
                        <td className="py-2.5 pr-3 text-[#C7B89E]">{row.guildName}</td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                          {row.level}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono font-semibold text-[#F5D061] tabular-nums">
                          {formatNumber(row.power)}
                        </td>
                        <td className="py-2.5 text-right">
                          {row.masterRef ? (
                            <div className="inline-flex items-center gap-1.5">
                              {!isFriend && (
                                <button
                                  onClick={() => onAddFriend(row.masterRef!.id)}
                                  className="rounded border border-[#443222] bg-[#15100D] px-2 py-1 text-[11px] text-[#DFD3BE] hover:border-[#D4AF37] cursor-pointer whitespace-nowrap"
                                >
                                  Kết Bạn
                                </button>
                              )}
                              <button
                                onClick={() => onDuelMaster(row.masterRef!)}
                                className="rounded bg-[#8F1D1D] px-2.5 py-1 text-[11px] font-semibold text-[#FEF3C7] hover:bg-[#A62121] cursor-pointer whitespace-nowrap"
                              >
                                Tỷ Thí
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#9A8C78]">Bản thân</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
