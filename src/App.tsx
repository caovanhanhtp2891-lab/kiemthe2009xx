import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CloudFog,
  CloudRain,
  Flame,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Skull,
  Snowflake,
  Sparkles,
  Sun,
  Swords,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { BattleCanvas, BattleCanvasHandle, HudSnapshot } from './components/BattleCanvas';
import { CharacterCreate } from './components/CharacterCreate';
import { KiemTheBottomBar } from './components/KiemTheBottomBar';
import { TitleScreen } from './components/TitleScreen';
import { TreasureChestOverlay } from './components/TreasureChestOverlay';
import { BagWindow } from './components/panels/BagWindow';
import { CharacterModal, CharacterSubTab } from './components/panels/CharacterModal';
import { ChatDock } from './components/panels/ChatDock';
import { DungeonArenaModal } from './components/panels/DungeonArenaModal';
import { SkillsWindow } from './components/panels/SkillsWindow';
import { GoogleMapsModal } from './components/panels/GoogleMapsModal';
import { MapBossModal } from './components/panels/MapBossModal';
import { SageStudioModal } from './components/panels/SageStudioModal';
import { SiegeWarModal } from './components/panels/SiegeWarModal';
import { SocialGuildModal } from './components/panels/SocialGuildModal';
import { TitleMantleModal } from './components/panels/TitleMantleModal';
import { VfxSheetGalleryModal } from './components/panels/VfxSheetGalleryModal';
import {
  BOT_CHAT_TEMPLATES,
  CHEST_TIER_META,
  CHEST_TIER_ORDER,
  ELEMENT_META,
  GUILD_TECHS,
  INITIAL_CITIES,
  INITIAL_GUILDS,
  INITIAL_TERRITORIES,
  MANTLES,
  MAPS,
  MOUNTS,
  MOUNT_ILLUSIONS,
  QUALITY_META,
  SECTS,
  SIMULATED_MASTERS,
  TITLES,
  WEATHER_META,
  WORLD_BOSSES,
} from './game/data';
import {
  checkUnlockedTitles,
  clearSavedGame,
  computePlayerStats,
  createInitialPlayer,
  formatNumber,
  formatPassiveBonusText,
  getEnhanceCost,
  getExpForLevel,
  getGuildTechUpgradeCost,
  getIllusionStats,
  getIllusionUpgradeCost,
  getPlayerHotbarSkills,
  getSkillBranchKey,
  loadSavedGame,
  nowTimeLabel,
  rollTreasureChestRewards,
  saveGameToStorage,
} from './game/engine';
import { CATALOG_BY_ID, CATALOG_BY_SECT } from './game/fullSkillCatalog';
import { soundEngine } from './game/sound';
import {
  ActiveModal,
  BattleContext,
  BattleResultSummary,
  ChatChannel,
  ChatMessage,
  ChestOpenResult,
  ChestTier,
  EquipSlot,
  EquipmentItem,
  GameScreen,
  GuildInfo,
  PlayerState,
  ResourceTerritory,
  SavePayload,
  SectId,
  SiegeCity,
  SimulatedMaster,
  WeatherType,
} from './game/types';

export default function App() {
  const [savedSnapshot, setSavedSnapshot] = useState<SavePayload | null>(() => loadSavedGame());
  const [screen, setScreen] = useState<GameScreen>('TITLE_MENU');

  const [player, setPlayer] = useState<PlayerState>(() =>
    savedSnapshot ? savedSnapshot.player : createInitialPlayer('Độc Cô Phong', 'vo_dang')
  );
  const [guilds, setGuilds] = useState<GuildInfo[]>(() =>
    savedSnapshot ? savedSnapshot.guilds : INITIAL_GUILDS
  );
  const [cities, setCities] = useState<SiegeCity[]>(() =>
    savedSnapshot ? savedSnapshot.cities : INITIAL_CITIES
  );
  const [territories, setTerritories] = useState<ResourceTerritory[]>(() =>
    savedSnapshot?.territories?.length ? savedSnapshot.territories : INITIAL_TERRITORIES
  );
  const [masters, setMasters] = useState<SimulatedMaster[]>(() =>
    savedSnapshot ? savedSnapshot.masters : SIMULATED_MASTERS
  );

  const [battle, setBattle] = useState<BattleContext>({ mode: 'WILD' });
  const [autoBattle, setAutoBattle] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [charWindowOpen, setCharWindowOpen] = useState(false);
  const [charSubTab, setCharSubTab] = useState<CharacterSubTab>('equip');
  const [bagWindowOpen, setBagWindowOpen] = useState(false);
  const [skillsWindowOpen, setSkillsWindowOpen] = useState(false);
  const [windowOrder, setWindowOrder] = useState<('char' | 'bag' | 'skills')[]>([
    'char',
    'bag',
    'skills',
  ]);
  const [dungeonArenaInitTab, setDungeonArenaInitTab] = useState<'dungeon' | 'arena'>('dungeon');
  const [socialInitTab, setSocialInitTab] = useState<'guild' | 'friends' | 'ranking'>('guild');
  const [battleResult, setBattleResult] = useState<BattleResultSummary | null>(null);
  const [openingChestResult, setOpeningChestResult] = useState<ChestOpenResult | null>(null);
  const [chestSessionId, setChestSessionId] = useState(0);
  const [muted, setMuted] = useState(() => soundEngine.isMuted());
  const [toast, setToast] = useState<string | null>(null);
  const [whisperTarget, setWhisperTarget] = useState<SimulatedMaster | null>(null);
  const [questCollapsed, setQuestCollapsed] = useState(false);

  const [bossTimers, setBossTimers] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    WORLD_BOSSES.forEach((b) => {
      initial[b.id] = 0; // Ready at start so player can experience hunting immediately
    });
    return initial;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init_sys',
      channel: 'system',
      sender: 'Giang Hồ',
      content: 'Chào mừng đại hiệp bước vào Võ Lâm Kiếm Thế! Bật Auto hoặc dùng WASD + phím 1-6 để thi triển 6 tuyệt học song hệ.',
      timestamp: nowTimeLabel(),
    },
    {
      id: 'init_w1',
      channel: 'world',
      sender: SIMULATED_MASTERS[1].name,
      senderId: SIMULATED_MASTERS[1].id,
      content: 'Tối nay Huyết Sát Minh tử thủ Tương Dương, anh em chuẩn bị đầy đủ Kim Sang Dược nhé!',
      timestamp: nowTimeLabel(),
    },
    {
      id: 'init_w2',
      channel: 'world',
      sender: SIMULATED_MASTERS[5].name,
      senderId: SIMULATED_MASTERS[5].id,
      content: 'Boss Hoàng Kim Cổ Bách vừa hiện thân rồi kìa, ai săn cùng chia trang bị Hoàng Kim không?',
      timestamp: nowTimeLabel(),
    },
    {
      id: 'init_g1',
      channel: 'guild',
      sender: SIMULATED_MASTERS[4].name,
      senderId: SIMULATED_MASTERS[4].id,
      content: 'Chào mừng chư vị huynh đệ gia nhập Bang Hội, nhớ cống hiến mỗi ngày nhận Buff Công Thủ!',
      timestamp: nowTimeLabel(),
    },
  ]);

  const canvasRef = useRef<BattleCanvasHandle | null>(null);

  // Dynamic map-based weather system
  const [mapWeather, setMapWeather] = useState<WeatherType>(() => {
    const startMap = MAPS.find((m) => m.id === (savedSnapshot?.player.currentMapId ?? 'tan_thu_thon')) || MAPS[0];
    return startMap.weatherPool[0] || 'clear';
  });

  const activeWeather: WeatherType = useMemo(() => {
    if (battle.mode === 'SIEGE') return 'ash_wind';
    if (battle.mode === 'GUILD_WAR') {
      const t = territories.find((x) => x.id === battle.guildWarTerritoryId);
      if (t?.element === 'thuy') return 'snow';
      if (t?.element === 'moc') return 'rain';
      if (t?.element === 'hoa') return 'ash_wind';
      return 'mist';
    }
    if (battle.mode === 'DUNGEON') {
      if (battle.dungeonId === 'bach_ho') return 'ash_wind';
      if (battle.dungeonId === 'tieu_dao') return 'snow';
      return 'mist';
    }
    return mapWeather;
  }, [battle.mode, battle.dungeonId, battle.guildWarTerritoryId, territories, mapWeather]);

  const weatherMeta = WEATHER_META[activeWeather];

  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (player.pkPenaltyUntil <= Date.now()) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [player.pkPenaltyUntil]);

  const stats = useMemo(
    () => computePlayerStats(player, guilds, weatherMeta.allResistDelta, territories, nowTs),
    [player, guilds, weatherMeta.allResistDelta, territories, nowTs]
  );
  const currentMap = useMemo(
    () => MAPS.find((m) => m.id === player.currentMapId) || MAPS[0],
    [player.currentMapId]
  );
  const pkPenaltyRemainSec = Math.max(0, Math.ceil((player.pkPenaltyUntil - nowTs) / 1000));
  const myGuild = useMemo(
    () => guilds.find((g) => g.id === player.guildId) || null,
    [guilds, player.guildId]
  );

  const [hud, setHud] = useState<HudSnapshot>({
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    mp: stats.maxMp,
    maxMp: stats.maxMp,
    shield: 0,
    cooldowns: [0, 0, 0, 0, 0, 0],
    dashCooldown: 0,
    objectiveLabel: 'Luyện Công · Ba Lăng Huyện',
    objectiveProgress: 0,
    timerSec: null,
  });

  const [levelUpBanner, setLevelUpBanner] = useState<{
    level: number;
    hpGain: number;
    atkGain: number;
    defGain: number;
    unlockedText?: string;
  } | null>(null);
  const prevHeroLevelRef = useRef({
    name: player.name,
    sect: player.sect,
    level: player.level,
  });

  const pushToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!levelUpBanner) return;
    const t = window.setTimeout(() => setLevelUpBanner(null), 3500);
    return () => window.clearTimeout(t);
  }, [levelUpBanner]);

  const appendChat = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setChatMessages((prev) => [
      ...prev.slice(-45),
      {
        ...msg,
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: nowTimeLabel(),
      },
    ]);
  }, []);

  // Trigger clean level-up celebration (audio, HUD banner, system log, toast) when level increases
  useEffect(() => {
    const prev = prevHeroLevelRef.current;
    if (
      screen === 'PLAYING' &&
      prev.name === player.name &&
      prev.sect === player.sect &&
      player.level > prev.level
    ) {
      soundEngine.playLevelUp();
      const gained = player.level - prev.level;
      const sectDef = SECTS[player.sect];
      const hpGain = Math.round(sectDef.growthPerLevel.hp * gained);
      const atkGain = Math.round(sectDef.growthPerLevel.atk * gained);
      const defGain = Math.round(sectDef.growthPerLevel.def * gained);

      const newlyUnlockedSkills = sectDef.skills.filter(
        (sk) => prev.level < sk.unlockLevel && player.level >= sk.unlockLevel
      );
      const newlyUnlockedPassives = sectDef.passives.filter(
        (ps) => prev.level < ps.unlockLevel && player.level >= ps.unlockLevel
      );
      const unlockedText =
        newlyUnlockedSkills.length > 0
          ? `Mở Tuyệt Học [${newlyUnlockedSkills[newlyUnlockedSkills.length - 1].name}]`
          : newlyUnlockedPassives.length > 0
          ? `Lĩnh Ngộ [${newlyUnlockedPassives[newlyUnlockedPassives.length - 1].name}]`
          : undefined;

      setLevelUpBanner({
        level: player.level,
        hpGain,
        atkGain,
        defGain,
        unlockedText,
      });

      appendChat({
        channel: 'system',
        sender: 'Thăng Cấp',
        content: unlockedText
          ? `Chúc mừng ${player.name} đột phá Cấp ${player.level} · ${unlockedText}!`
          : `Chúc mừng ${player.name} thăng lên Cấp ${player.level} (+${hpGain} HP, +${atkGain} Công, +${defGain} Thủ)!`,
      });

      if (newlyUnlockedPassives.length > 0) {
        const ps = newlyUnlockedPassives[newlyUnlockedPassives.length - 1];
        pushToast(
          `Đột Phá Cấp ${player.level} · Lĩnh ngộ Tâm Pháp [${ps.name}] (${formatPassiveBonusText(ps)})!`
        );
      } else if (newlyUnlockedSkills.length > 0) {
        const sk = newlyUnlockedSkills[newlyUnlockedSkills.length - 1];
        pushToast(`Đột Phá Cấp ${player.level} · Mở khóa Tuyệt Học [${sk.name}]!`);
      } else {
        pushToast(`Đột Phá Cấp ${player.level}! Sinh lực & nội lực hồi đầy!`);
      }
    }

    prevHeroLevelRef.current = {
      name: player.name,
      sect: player.sect,
      level: player.level,
    };
  }, [screen, player.level, player.name, player.sect, appendChat, pushToast]);

  // Auto-Save to LocalStorage whenever state changes while playing
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const payload: SavePayload = {
      version: 1,
      savedAt: Date.now(),
      player,
      guilds,
      cities,
      territories,
      masters,
    };
    const timer = window.setTimeout(() => {
      saveGameToStorage(payload);
      setSavedSnapshot(payload);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [screen, player, guilds, cities, territories, masters]);

  // Unlock titles reactively when milestones are hit
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const controlsAny = cities.some((c) => c.controlledByPlayerGuild);
    const { updatedTitles, newlyUnlocked } = checkUnlockedTitles(player, stats.power, controlsAny);
    if (newlyUnlocked.length > 0) {
      setPlayer((prev) => ({
        ...prev,
        unlockedTitles: updatedTitles,
        activeTitleId: newlyUnlocked[newlyUnlocked.length - 1],
      }));
      const tObj = TITLES.find((x) => x.id === newlyUnlocked[0]);
      if (tObj) {
        soundEngine.playLevelUp();
        pushToast(`Mở khóa Danh Hiệu: « ${tObj.name} »`);
        appendChat({
          channel: 'system',
          sender: 'Thành Tựu',
          content: `Chúc mừng ${player.name} mở khóa danh hiệu « ${tObj.name} »!`,
        });
      }
    }
  }, [
    screen,
    player.level,
    player.monstersKilled,
    player.bossesKilled,
    player.arenaWins,
    player.arenaRank,
    player.mantleId,
    stats.power,
    cities,
  ]);

  // World Boss Respawn Countdown (1s interval)
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const id = window.setInterval(() => {
      setBossTimers((prev) => {
        let changed = false;
        const next: Record<string, number> = { ...prev };
        for (const b of WORLD_BOSSES) {
          if ((next[b.id] || 0) > 0) {
            next[b.id] = Math.max(0, next[b.id] - 1);
            changed = true;
            if (next[b.id] === 0) {
              appendChat({
                channel: 'system',
                sender: 'Boss Hoàng Kim',
                content: `${b.name} (${b.title}) đã tái xuất giang hồ! Mau vào Bản Đồ & Boss để khiêu chiến.`,
              });
            }
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [screen, appendChat]);

  // Simulated Living Jianghu Chat Bots
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const id = window.setInterval(() => {
      const tpl = BOT_CHAT_TEMPLATES[Math.floor(Math.random() * BOT_CHAT_TEMPLATES.length)];
      const m = masters[Math.floor(Math.random() * masters.length)];
      if (!m) return;
      appendChat({
        channel: tpl.channel,
        sender: m.name,
        senderId: m.id,
        senderSect: m.sect,
        senderMantle: m.mantleId,
        content: tpl.text,
      });
    }, 10500);
    return () => window.clearInterval(id);
  }, [screen, masters, appendChat]);

  // Sync weather to map's signature climate when switching maps
  useEffect(() => {
    const map = MAPS.find((m) => m.id === player.currentMapId) || MAPS[0];
    setMapWeather(map.weatherPool[0] || 'clear');
  }, [player.currentMapId]);

  // Periodically cycle dynamic weather across the current map's weather pool
  useEffect(() => {
    if (screen !== 'PLAYING' || battle.mode !== 'WILD') return;
    const id = window.setInterval(() => {
      const map = MAPS.find((m) => m.id === player.currentMapId) || MAPS[0];
      if (map.weatherPool.length <= 1) return;
      setMapWeather((prev) => {
        const idx = map.weatherPool.indexOf(prev);
        const next = map.weatherPool[(idx + 1) % map.weatherPool.length];
        const meta = WEATHER_META[next];
        const deltaStr =
          meta.allResistDelta === 0
            ? 'Kháng ổn định'
            : `Kháng ${meta.allResistDelta > 0 ? `+${meta.allResistDelta}%` : `${meta.allResistDelta}%`}`;
        pushToast(`Thời tiết chuyển sang ${meta.name} (${deltaStr})`);
        return next;
      });
    }, 45000);
    return () => window.clearInterval(id);
  }, [screen, battle.mode, player.currentMapId, pushToast]);

  // Global Keyboard Shortcuts (Esc Pause/Close, M Map, A Auto toggle)
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        if (battleResult) {
          setBattleResult(null);
          setBattle({ mode: 'WILD' });
        } else if (activeModal) {
          setActiveModal(null);
        } else if (charWindowOpen || bagWindowOpen || skillsWindowOpen) {
          setCharWindowOpen(false);
          setBagWindowOpen(false);
          setSkillsWindowOpen(false);
        } else {
          setActiveModal('PAUSE');
        }
      } else if (e.key.toLowerCase() === 'm') {
        setActiveModal((cur) => (cur === 'MAP_BOSS' ? null : 'MAP_BOSS'));
      } else if (e.key.toLowerCase() === 'k') {
        setAutoBattle((v) => !v);
      } else if (e.key.toLowerCase() === 'p') {
        setPlayer((prev) => {
          const map = MAPS.find((m) => m.id === prev.currentMapId) || MAPS[0];
          if (map.isSafeZone) {
            soundEngine.playFail();
            pushToast(
              'Ba Lăng Huyện là Khu An Toàn trong thành thị — hãy di chuyển ra bản đồ ngoài thành (Hoa Sơn, Trường Bạch...) để bật Đồ Sát!'
            );
            return prev;
          }
          const nextMode = prev.pkMode === 'slaughter' ? 'peace' : 'slaughter';
          if (nextMode === 'slaughter') {
            soundEngine.playWarDrum();
            pushToast('Đã bật chế độ ĐỒ SÁT (PK)! Có thể tấn công các hiệp khách khác ngoài thành thị.');
          } else {
            soundEngine.playSlash();
            pushToast('Đã chuyển về chế độ Luyện Công (Hòa Bình).');
          }
          return { ...prev, pkMode: nextMode };
        });
      } else if (e.key === 'F1') {
        e.preventDefault();
        setCharWindowOpen((open) => {
          if (open && charSubTab === 'equip') return false;
          setCharSubTab('equip');
          setWindowOrder((o) => [...o.filter((x) => x !== 'char'), 'char']);
          return true;
        });
      } else if (e.key === 'F2' || e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setBagWindowOpen((open) => {
          if (!open) setWindowOrder((o) => [...o.filter((x) => x !== 'bag'), 'bag']);
          return !open;
        });
      } else if (e.key === 'F3') {
        e.preventDefault();
        setSkillsWindowOpen((open) => {
          if (!open) setWindowOrder((o) => [...o.filter((x) => x !== 'skills'), 'skills']);
          return !open;
        });
      } else if (e.key === 'F4') {
        e.preventDefault();
        setDungeonArenaInitTab('dungeon');
        setActiveModal((cur) => (cur === 'DUNGEON_ARENA' ? null : 'DUNGEON_ARENA'));
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveModal((cur) => (cur === 'TITLE_MANTLE' ? null : 'TITLE_MANTLE'));
      } else if (e.key === 'F6') {
        e.preventDefault();
        setSocialInitTab('guild');
        setActiveModal((cur) => (cur === 'SOCIAL_GUILD' ? null : 'SOCIAL_GUILD'));
      } else if (e.key === 'F7') {
        e.preventDefault();
        setActiveModal((cur) => (cur === 'SIEGE' ? null : 'SIEGE'));
      } else if (e.key === 'F8') {
        e.preventDefault();
        setActiveModal((cur) => (cur === 'SAGE_STUDIO' ? null : 'SAGE_STUDIO'));
      } else if (e.key.toLowerCase() === 'r') {
        setPlayer((prev) => {
          if (!prev.activeMountId) return prev;
          const nextMounted = !prev.isMounted;
          const m = MOUNTS.find((x) => x.id === prev.activeMountId);
          const ill = prev.activeMountIllusionId
            ? MOUNT_ILLUSIONS.find((x) => x.id === prev.activeMountIllusionId)
            : null;
          if (m) {
            const displayName = ill ? ill.name : m.name;
            soundEngine.playSlash();
            pushToast(nextMounted ? `Đã lên ngựa ${displayName}` : `Đã xuống ngựa ${displayName}`);
          }
          return { ...prev, isMounted: nextMounted };
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    screen,
    activeModal,
    charWindowOpen,
    charSubTab,
    bagWindowOpen,
    skillsWindowOpen,
    battleResult,
    pushToast,
  ]);

  // Helper to apply EXP & level-ups + skill auto-unlocks
  const applyProgression = useCallback(
    (
      prev: PlayerState,
      gains: {
        exp?: number;
        silver?: number;
        goldIngots?: number;
        stones?: number;
        reputation?: number;
        merit?: number;
        item?: EquipmentItem;
        monstersKilledDelta?: number;
        bossesKilledDelta?: number;
      }
    ): PlayerState => {
      let level = prev.level;
      let exp = prev.exp + (gains.exp ?? 0);
      let maxExp = prev.maxExp;
      const skillLevels = { ...prev.skillLevels };
      let leveledUp = false;

      while (exp >= maxExp && level < 180) {
        exp -= maxExp;
        level += 1;
        maxExp = getExpForLevel(level);
        leveledUp = true;
        // Auto-unlock all Lv.10–180 catalog skills for the player's sect upon reaching required level
        const sectCatalog = CATALOG_BY_SECT[prev.sect] || [];
        for (const sk of sectCatalog) {
          if (level >= sk.unlockLevel && (skillLevels[sk.id] || 0) === 0) {
            skillLevels[sk.id] = 1;
          }
        }
        // Keep legacy skill IDs synced for compatibility
        for (const sk of SECTS[prev.sect].skills) {
          if (level >= sk.unlockLevel && (skillLevels[sk.id] || 0) === 0) {
            skillLevels[sk.id] = 1;
          }
        }
      }

      const inventory = [...prev.inventory];
      if (gains.item && inventory.length < 30) {
        inventory.unshift(gains.item);
      }

      const silverGain = gains.silver ?? 0;
      const wealthDelta =
        Math.round(silverGain * 0.12) +
        (gains.item ? Math.round(gains.item.power * 0.25) : 0) +
        (leveledUp ? 350 : 0);

      return {
        ...prev,
        level,
        exp,
        maxExp,
        skillLevels,
        silver: prev.silver + silverGain,
        goldIngots: prev.goldIngots + (gains.goldIngots ?? 0),
        enhanceStones: prev.enhanceStones + (gains.stones ?? 0),
        reputation: prev.reputation + (gains.reputation ?? 0),
        merit: prev.merit + (gains.merit ?? 0),
        wealth: prev.wealth + wealthDelta,
        inventory,
        monstersKilled: prev.monstersKilled + (gains.monstersKilledDelta ?? 0),
        bossesKilled: prev.bossesKilled + (gains.bossesKilledDelta ?? 0),
      };
    },
    []
  );

  // Handlers
  const handleContinue = () => {
    if (!savedSnapshot) return;
    setPlayer(savedSnapshot.player);
    setGuilds(savedSnapshot.guilds);
    setCities(savedSnapshot.cities);
    setTerritories(
      savedSnapshot.territories?.length ? savedSnapshot.territories : INITIAL_TERRITORIES
    );
    setMasters(savedSnapshot.masters);
    setBattle({ mode: 'WILD' });
    setScreen('PLAYING');
  };

  const handleConfirmCreate = (name: string, sect: SectId, branchIndex: 0 | 1) => {
    const fresh = createInitialPlayer(name, sect, branchIndex);
    const branchName = SECTS[sect].branches[branchIndex] ?? SECTS[sect].branches[0];
    setPlayer(fresh);
    setGuilds(INITIAL_GUILDS);
    setCities(INITIAL_CITIES);
    setTerritories(INITIAL_TERRITORIES);
    setMasters(SIMULATED_MASTERS);
    setBattle({ mode: 'WILD' });
    setBattleResult(null);
    setActiveModal(null);
    setScreen('PLAYING');
    soundEngine.playLevelUp();
    appendChat({
      channel: 'system',
      sender: 'Giang Hồ',
      content: `Tân hiệp ${fresh.name} (${SECTS[sect].name} · Hướng ${branchName}) đã chính thức bước vào giang hồ!`,
    });
  };

  const handleSwitchBranch = (branchIndex: 0 | 1) => {
    if (battle.mode !== 'WILD') {
      soundEngine.playFail();
      pushToast('Chỉ có thể đổi nhánh miễn phí ngoài giao tranh Phó Bản / Boss / Lôi Đài!');
      return;
    }
    const branchName = SECTS[player.sect].branches[branchIndex] ?? SECTS[player.sect].branches[0];
    setPlayer((prev) => ({ ...prev, branchIndex }));
    soundEngine.playLoot();
    pushToast(
      `Đã chuyển sang nhánh ${SECTS[player.sect].name} · ${branchName} (chỉ kích hoạt bị động nhánh đang chọn)!`
    );
  };

  const handleTogglePkMode = useCallback(() => {
    const map = MAPS.find((m) => m.id === player.currentMapId) || MAPS[0];
    if (map.isSafeZone) {
      soundEngine.playFail();
      pushToast(
        'Ba Lăng Huyện là Khu An Toàn trong thành thị — hãy di chuyển ra bản đồ ngoài thành (Hoa Sơn, Trường Bạch...) để bật Đồ Sát!'
      );
      return;
    }
    const nextMode = player.pkMode === 'slaughter' ? 'peace' : 'slaughter';
    if (nextMode === 'slaughter') {
      soundEngine.playWarDrum();
      pushToast('Đã bật chế độ ĐỒ SÁT (PK)! Có thể tấn công các hiệp khách khác ngoài thành thị.');
    } else {
      soundEngine.playSlash();
      pushToast('Đã chuyển về chế độ Luyện Công (Hòa Bình).');
    }
    setPlayer((prev) => ({ ...prev, pkMode: nextMode }));
  }, [player.currentMapId, player.pkMode, pushToast]);

  const handlePkKill = useCallback(
    (payload: {
      victimName: string;
      victimSect: SectId;
      silver: number;
      merit: number;
      stones: number;
      item?: EquipmentItem;
    }) => {
      const nextPk = Math.min(10, player.pkPoints + 1);
      setPlayer((prev) => {
        const progressed = applyProgression(prev, {
          silver: payload.silver,
          merit: payload.merit,
          stones: payload.stones,
          item: payload.item,
        });
        return {
          ...progressed,
          pkPoints: Math.min(10, prev.pkPoints + 1),
          pkKills: prev.pkKills + 1,
          pkWashCounter: 0,
        };
      });
      pushToast(
        `Đồ sát [${payload.victimName}] thành công! Sát Khí tăng lên ${nextPk}/10 (Hồng Danh).`
      );
      appendChat({
        channel: 'world',
        sender: 'Huyết Án Giang Hồ',
        content: `Sát khí ngút trời! ${player.name} vừa đồ sát ${payload.victimName} (${SECTS[payload.victimSect].name}) tại ${currentMap.name} — Điểm Sát Khí: ${nextPk}/10!`,
      });
    },
    [applyProgression, appendChat, currentMap.name, player.name, player.pkPoints, pushToast]
  );

  const handleWildPlayerDefeated = useCallback(
    (payload: { killerName: string; byPlayer: boolean }) => {
      if (player.pkPoints <= 0) {
        pushToast(`Trọng thương trước ${payload.killerName}, đã hồi sinh tại bản đồ.`);
        return;
      }
      const penaltyPct = Math.min(35, player.pkPoints * 5);
      const until = Date.now() + 120_000;
      setNowTs(Date.now());
      setPlayer((prev) => ({
        ...prev,
        pkPoints: Math.max(0, prev.pkPoints - 1),
        pkPenaltyPct: penaltyPct,
        pkPenaltyUntil: until,
        pkMode: 'peace',
      }));
      pushToast(
        `Bị ${payload.killerName} tiêu diệt khi mang Sát Khí! Giảm -${penaltyPct}% Công/Thủ/HP trong 120 giây!`
      );
      appendChat({
        channel: 'world',
        sender: 'Trừng Phạt Sát Khí',
        content: `Ác giả ác báo! Hồng danh ${player.name} vừa bị ${payload.killerName} đánh bại ngoài thành, chịu Sát Khí Phản Phệ (-${penaltyPct}% chỉ số trong 120s)!`,
      });
    },
    [appendChat, player.name, player.pkPoints, pushToast]
  );

  const handleCleansePk = () => {
    const activePenalty = player.pkPenaltyUntil > Date.now() && player.pkPenaltyPct > 0;
    const cost = player.pkPoints * 500 + (activePenalty ? 400 : 0);
    if (cost <= 0) return;
    if (player.silver < cost) {
      pushToast(`Không đủ ${formatNumber(cost)} Bạc để Tịnh Tâm Rửa Tội!`);
      return;
    }
    soundEngine.playLevelUp();
    setPlayer((prev) => ({
      ...prev,
      silver: prev.silver - cost,
      pkPoints: 0,
      pkPenaltyPct: 0,
      pkPenaltyUntil: 0,
      pkWashCounter: 0,
    }));
    pushToast('Tịnh tâm rửa tội thành công! Đã xóa sạch Điểm Sát Khí và hồi phục toàn bộ chỉ số.');
  };

  const handleWildKill = useCallback(
    (payload: { exp: number; silver: number; stones: number; item?: EquipmentItem; mobName: string }) => {
      setPlayer((prev) => {
        const progressed = applyProgression(prev, {
          exp: payload.exp,
          silver: payload.silver,
          stones: payload.stones,
          merit: 4,
          item: payload.item,
          monstersKilledDelta: 1,
        });
        if (prev.pkPoints > 0) {
          const nextWash = prev.pkWashCounter + 1;
          if (nextWash >= 8) {
            pushToast(`Đánh quái tịnh tâm · Giảm 1 Điểm Sát Khí (còn ${prev.pkPoints - 1}/10).`);
            return { ...progressed, pkPoints: prev.pkPoints - 1, pkWashCounter: 0 };
          }
          return { ...progressed, pkWashCounter: nextWash };
        }
        return progressed;
      });
      if (
        payload.item &&
        (payload.item.quality === 'purple' ||
          payload.item.quality === 'gold' ||
          payload.item.quality === 'mythic')
      ) {
        pushToast(`Nhặt được [${payload.item.name}] (${QUALITY_META[payload.item.quality].name})!`);
      }
    },
    [applyProgression, pushToast]
  );

  const triggerOpenChestWithReward = useCallback(
    (tier: ChestTier, consumeStock: boolean) => {
      const rewardLevel = Math.max(player.level, currentMap.minLevel);
      const reward = rollTreasureChestRewards(tier, rewardLevel);

      setPlayer((prev) => {
        if (consumeStock && (prev.treasureChests[tier] || 0) <= 0) {
          return prev;
        }
        const nextChests = {
          ...prev.treasureChests,
          [tier]: consumeStock
            ? Math.max(0, (prev.treasureChests[tier] || 0) - 1)
            : prev.treasureChests[tier] || 0,
        };
        const nextInv = [...prev.inventory];
        // Guarantee room for newly opened chest equipment
        const incoming = reward.bonusEquipment
          ? [reward.bonusEquipment, reward.equipment]
          : [reward.equipment];
        for (const eq of incoming) {
          if (nextInv.length >= 30) {
            nextInv.pop();
          }
          nextInv.unshift(eq);
        }
        const wealthDelta =
          Math.round(reward.silver * 0.14) +
          Math.round(reward.equipment.power * 0.25) +
          (reward.bonusEquipment ? Math.round(reward.bonusEquipment.power * 0.25) : 0) +
          reward.enhanceStones * 25;

        return {
          ...prev,
          silver: prev.silver + reward.silver,
          goldIngots: prev.goldIngots + reward.goldIngots,
          enhanceStones: prev.enhanceStones + reward.enhanceStones,
          wealth: prev.wealth + wealthDelta,
          inventory: nextInv,
          treasureChests: nextChests,
          chestsOpened: (prev.chestsOpened || 0) + 1,
        };
      });

      setOpeningChestResult(reward);
      setChestSessionId((s) => s + 1);

      const bestTopItem =
        reward.equipment.quality === 'mythic'
          ? reward.equipment
          : reward.bonusEquipment?.quality === 'mythic'
          ? reward.bonusEquipment
          : reward.equipment.quality === 'gold'
          ? reward.equipment
          : reward.bonusEquipment?.quality === 'gold'
          ? reward.bonusEquipment
          : null;
      if (bestTopItem) {
        const isMythic = bestTopItem.quality === 'mythic';
        appendChat({
          channel: 'world',
          sender: 'Kỳ Ngộ Giang Hồ',
          content: isMythic
            ? `THẦN KHÍ GIÁNG THẾ! Cao thủ ${player.name} mở ${CHEST_TIER_META[tier].name} tại ${currentMap.name}, đoạt được Thần Khí [${bestTopItem.name}] cùng +${reward.enhanceStones} Đá Cường Hóa!`
            : `KIM QUANG XÉ TRỜI! Cao thủ ${player.name} mở ${CHEST_TIER_META[tier].name} tại ${currentMap.name}, nhận được cực phẩm Truyền Thuyết [${bestTopItem.name}] cùng +${reward.enhanceStones} Đá Cường Hóa!`,
        });
      }
    },
    [appendChat, currentMap.minLevel, currentMap.name, player.level, player.name]
  );

  const handleOpenChestFromStock = useCallback(
    (preferredTier?: ChestTier) => {
      const targetTier =
        preferredTier && (player.treasureChests[preferredTier] || 0) > 0
          ? preferredTier
          : CHEST_TIER_ORDER.find((t) => (player.treasureChests[t] || 0) > 0);
      if (!targetTier) {
        soundEngine.playFail();
        pushToast('Chưa có Rương Báu nào — hãy tiêu diệt quái luyện công để nhặt rương!');
        return;
      }
      triggerOpenChestWithReward(targetTier, true);
    },
    [player.treasureChests, pushToast, triggerOpenChestWithReward]
  );

  const handleCollectChest = useCallback(
    (tier: ChestTier, mobName: string, openImmediately: boolean) => {
      if (openImmediately) {
        triggerOpenChestWithReward(tier, false);
        return;
      }
      setPlayer((prev) => ({
        ...prev,
        treasureChests: {
          ...prev.treasureChests,
          [tier]: (prev.treasureChests[tier] || 0) + 1,
        },
      }));
      if (tier === 'imperial_gold' || tier === 'purple_gold') {
        pushToast(`Thu được ${CHEST_TIER_META[tier].name} từ ${mobName}! Nhấn nút Rương Báu để mở.`);
      }
    },
    [pushToast, triggerOpenChestWithReward]
  );

  // Hotkey B to open Treasure Chest while in WILD mode
  useEffect(() => {
    if (screen !== 'PLAYING' || battle.mode !== 'WILD') return;
    const onChestKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 'b' && !activeModal && !openingChestResult) {
        handleOpenChestFromStock();
      }
    };
    window.addEventListener('keydown', onChestKey);
    return () => window.removeEventListener('keydown', onChestKey);
  }, [screen, battle.mode, activeModal, openingChestResult, handleOpenChestFromStock]);

  const handleBattleComplete = useCallback(
    (result: BattleResultSummary) => {
      setBattleResult(result);

      if (result.victory) {
        const r = result.rewards;
        setPlayer((prev) => {
          let next = applyProgression(prev, {
            exp: r.exp,
            silver: r.silver,
            goldIngots: r.goldIngots,
            stones: r.enhanceStones,
            reputation: r.reputation,
            merit: r.merit,
            item: r.item,
            bossesKilledDelta: result.mode === 'BOSS' ? 1 : 0,
          });

          if (result.mode === 'DUNGEON' && battle.dungeonId && battle.dungeonFloor) {
            const curMax = next.dungeonProgress[battle.dungeonId] || 0;
            next = {
              ...next,
              dungeonProgress: {
                ...next.dungeonProgress,
                [battle.dungeonId]: Math.max(curMax, battle.dungeonFloor),
              },
            };
          }

          if (result.mode === 'ARENA' && battle.arenaOpponent) {
            const oppRank = battle.arenaOpponent.rank;
            next = {
              ...next,
              arenaWins: next.arenaWins + 1,
              arenaRank: Math.min(next.arenaRank, oppRank),
            };
          }

          return next;
        });

        if (result.mode === 'BOSS' && battle.bossId) {
          const boss = WORLD_BOSSES.find((b) => b.id === battle.bossId);
          if (boss) {
            setBossTimers((prev) => ({ ...prev, [boss.id]: boss.respawnSec }));
            appendChat({
              channel: 'world',
              sender: 'Thiên Hạ Thông Báo',
              content: `Cao thủ ${player.name} đã đơn thương độc mã hạ gục Boss Hoàng Kim ${boss.name}, thu về ${r.item ? `[${r.item.name}]` : 'vô số báu vật'}!`,
            });
          }
        }

        if (result.mode === 'ARENA' && battle.arenaOpponent) {
          const opp = battle.arenaOpponent;
          if (opp.rank < player.arenaRank) {
            setMasters((prev) =>
              prev.map((m) => (m.id === opp.id ? { ...m, rank: player.arenaRank } : m))
            );
          }
        }

        if (result.mode === 'SIEGE' && battle.siegeCityId) {
          const cityId = battle.siegeCityId;
          const guildName = myGuild?.name || `Liên Minh ${player.name}`;
          setCities((prev) =>
            prev.map((c) =>
              c.id === cityId
                ? {
                    ...c,
                    defenderGuild: guildName,
                    defenderLeader: player.name,
                    controlledByPlayerGuild: true,
                  }
                : c
            )
          );
          const cityName = cities.find((c) => c.id === cityId)?.name || 'Hoàng Thành';
          appendChat({
            channel: 'world',
            sender: 'Công Thành Chiến',
            content: `CHẤN ĐỘNG GIANG HỒ! Bang [${guildName}] do ${player.name} dẫn đầu đã công phá cổng thành, chiếm giữ Long Trụ và đăng quang Thành Chủ ${cityName}!`,
          });
        }

        if (result.mode === 'GUILD_WAR' && battle.guildWarTerritoryId) {
          const terrId = battle.guildWarTerritoryId;
          const terr = territories.find((t) => t.id === terrId);
          const guildName = myGuild?.name || `Liên Minh ${player.name}`;
          const prevOwner = terr?.defenderGuildName || 'Bang Địch';
          setTerritories((prev) =>
            prev.map((t) =>
              t.id === terrId
                ? {
                    ...t,
                    defenderGuildId: myGuild?.id || 'player_alliance',
                    defenderGuildName: guildName,
                    defenderLeader: player.name,
                    controlledByPlayerGuild: true,
                    lastClaimAt: null,
                  }
                : t
            )
          );
          setPlayer((prev) => ({
            ...prev,
            guildContribution: prev.guildContribution + 250,
            potions: prev.potions + (terr?.claimPotions || 0),
          }));
          if (myGuild) {
            setGuilds((prev) =>
              prev.map((g) =>
                g.id === myGuild.id
                  ? { ...g, contribution: g.contribution + 400, power: g.power + 2500 }
                  : g
              )
            );
          }
          const terrName = terr?.name || 'Lãnh Địa Tài Nguyên';
          appendChat({
            channel: 'world',
            sender: 'Bang Hội Chiến',
            content: `TIN CHIẾN THẮNG! Bang [${guildName}] do ${player.name} thống lĩnh đã đánh bại ${prevOwner}, đoạt lấy lãnh địa [${terrName}]!`,
          });
          appendChat({
            channel: 'guild',
            sender: 'Quân Báo Bang Hội',
            content: `Toàn bang nhận hiệu ứng lãnh địa ${terrName} (${terr?.bonusLabel || ''}). Mau vào mục Công Thành → Bang Hội Chiến để thu hoạch tài nguyên!`,
          });
        }
      } else {
        setPlayer((prev) => {
          const progressed = applyProgression(prev, {
            exp: result.rewards.exp,
            silver: result.rewards.silver,
          });
          if (prev.pkPoints > 0) {
            const penaltyPct = Math.min(35, prev.pkPoints * 5);
            setNowTs(Date.now());
            return {
              ...progressed,
              pkPoints: Math.max(0, prev.pkPoints - 1),
              pkPenaltyPct: penaltyPct,
              pkPenaltyUntil: Date.now() + 120_000,
            };
          }
          return progressed;
        });
      }
    },
    [applyProgression, battle, appendChat, player.name, player.arenaRank, myGuild, cities, territories]
  );

  // Equipment & Character actions
  const handleEquipItem = (item: EquipmentItem) => {
    soundEngine.playLoot();
    setPlayer((prev) => {
      const current = prev.equipment[item.slot];
      const nextInv = prev.inventory.filter((x) => x.id !== item.id);
      if (current) nextInv.unshift(current);
      return {
        ...prev,
        equipment: { ...prev.equipment, [item.slot]: item },
        inventory: nextInv,
        wealth: prev.wealth + 60,
      };
    });
    pushToast(`Đã trang bị [${item.name}]`);
  };

  const handleSellItem = (itemId: string) => {
    setPlayer((prev) => {
      const target = prev.inventory.find((x) => x.id === itemId);
      if (!target) return prev;
      const silver = QUALITY_META[target.quality].sellSilver;
      soundEngine.playLoot();
      return {
        ...prev,
        silver: prev.silver + silver,
        inventory: prev.inventory.filter((x) => x.id !== itemId),
      };
    });
  };

  const handleSellJunk = () => {
    setPlayer((prev) => {
      let gained = 0;
      const kept = prev.inventory.filter((it) => {
        if (it.quality === 'white' || it.quality === 'green') {
          gained += QUALITY_META[it.quality].sellSilver;
          return false;
        }
        return true;
      });
      if (gained > 0) {
        soundEngine.playLoot();
        pushToast(`Bán đồ phàm/lục thu về ${formatNumber(gained)} Bạc`);
      } else {
        pushToast('Không có đồ Trắng hoặc Lục trong hành trang');
      }
      return { ...prev, silver: prev.silver + gained, inventory: kept };
    });
  };

  const handleEnhanceSlot = (slot: EquipSlot) => {
    const item = player.equipment[slot];
    if (!item) return;
    const cost = getEnhanceCost(item);
    if (player.silver < cost.silver || player.enhanceStones < cost.stones) return;

    const success = Math.random() * 100 <= cost.successRate;
    if (success) {
      soundEngine.playLevelUp();
      const nextLevel = item.enhance + 1;
      setPlayer((prev) => ({
        ...prev,
        silver: prev.silver - cost.silver,
        enhanceStones: prev.enhanceStones - cost.stones,
        wealth: prev.wealth + nextLevel * 180,
        equipment: {
          ...prev.equipment,
          [slot]: { ...item, enhance: nextLevel },
        },
      }));
      pushToast(`Cường hóa thành công [${item.name}] lên +${nextLevel}!`);
      if (nextLevel >= 5) {
        appendChat({
          channel: 'world',
          sender: 'Thợ Rèn Tương Dương',
          content: `Hào quang rực rỡ! ${player.name} vừa cường hóa thành công [${item.name} +${nextLevel}]!`,
        });
      }
    } else {
      soundEngine.playFail();
      setPlayer((prev) => ({
        ...prev,
        silver: prev.silver - cost.silver,
        enhanceStones: prev.enhanceStones - cost.stones,
      }));
      pushToast(`Cường hóa [${item.name}] thất bại (không bị tụt cấp).`);
    }
  };

  const handleUpgradeSkill = (skillId: string) => {
    const cur = player.skillLevels[skillId] || 0;
    const cat = CATALOG_BY_ID[skillId];
    const maxRank = cat?.maxRank || 20;
    if (cat && player.level < cat.unlockLevel && cur === 0) {
      pushToast(`Cần đạt Cấp ${cat.unlockLevel} để lĩnh ngộ [${cat.name}]!`);
      return;
    }
    const cost = Math.round(450 * Math.pow(Math.max(1, cur + 1), 1.42));
    if (player.silver < cost || cur >= maxRank) return;
    soundEngine.playLevelUp();
    setPlayer((prev) => ({
      ...prev,
      silver: prev.silver - cost,
      wealth: prev.wealth + 150,
      skillLevels: { ...prev.skillLevels, [skillId]: cur + 1 },
    }));
    pushToast(`Lĩnh ngộ [${cat?.name || 'Võ học'}] lên Hạng ${cur + 1}/${maxRank}!`);
  };

  const handleEquipSkill = (slotIndex: number, skillId: string) => {
    if (slotIndex < 0 || slotIndex > 5) return;
    const cat = CATALOG_BY_ID[skillId];
    if (!cat || cat.activationType !== 'active') return;
    const branchIdx: 0 | 1 = player.branchIndex === 1 ? 1 : 0;
    const branchKey = getSkillBranchKey(player.sect, branchIdx);
    const currentHotbarIds = getPlayerHotbarSkills(player).map((s) => s.id);
    const nextIds = [...currentHotbarIds];
    const existingIdx = nextIds.indexOf(skillId);
    if (existingIdx >= 0 && existingIdx !== slotIndex) {
      nextIds[existingIdx] = nextIds[slotIndex];
    }
    nextIds[slotIndex] = skillId;
    soundEngine.playLoot();
    setPlayer((prev) => ({
      ...prev,
      equippedSkillsByBranch: {
        ...(prev.equippedSkillsByBranch || {}),
        [branchKey]: nextIds,
      },
    }));
    pushToast(`Đã gán [${cat.name}] vào phím tắt [${slotIndex + 1}]!`);
  };

  const handleBuyPotion = () => {
    if (player.silver < 400) {
      pushToast('Không đủ 400 Bạc!');
      return;
    }
    soundEngine.playLoot();
    setPlayer((prev) => ({ ...prev, silver: prev.silver - 400, potions: prev.potions + 5 }));
    pushToast('Mua thành công 5 bình Kim Sang Dược.');
  };

  const handleBuyStones = () => {
    if (player.goldIngots < 50) {
      pushToast('Không đủ 50 Nguyên Bảo!');
      return;
    }
    soundEngine.playLoot();
    setPlayer((prev) => ({
      ...prev,
      goldIngots: prev.goldIngots - 50,
      enhanceStones: prev.enhanceStones + 5,
    }));
    pushToast('Mua thành công 5 Đá Cường Hóa.');
  };

  // Mount (Thú Cưỡi) actions
  const handleBuyMount = (mountId: string) => {
    const m = MOUNTS.find((x) => x.id === mountId);
    if (!m) return;
    if (player.ownedMounts.includes(mountId)) return;
    if (player.level < m.levelReq || player.silver < m.silverCost || player.goldIngots < m.ingotCost) {
      pushToast('Chưa đủ cấp độ hoặc Bạc / Nguyên Bảo để thuần hóa tuấn mã này.');
      return;
    }
    soundEngine.playLevelUp();
    setPlayer((prev) => ({
      ...prev,
      silver: prev.silver - m.silverCost,
      goldIngots: prev.goldIngots - m.ingotCost,
      wealth: prev.wealth + m.tier * 450,
      ownedMounts: [...prev.ownedMounts, mountId],
      activeMountId: mountId,
      isMounted: true,
    }));
    pushToast(`Thuần hóa thành công thần mã [${m.name}] (+${m.moveSpeedPct}% Tốc · +${m.allResist}% Kháng)!`);
    if (m.tier >= 4) {
      appendChat({
        channel: 'world',
        sender: 'Thiên Hạ Thông Báo',
        content: `Vó ngựa rung chuyển giang hồ! Cao thủ ${player.name} vừa thu phục tuyệt thế thần mã [${m.name}]!`,
      });
    }
  };

  const handleSelectMount = (mountId: string) => {
    const m = MOUNTS.find((x) => x.id === mountId);
    if (!m || !player.ownedMounts.includes(mountId)) return;
    soundEngine.playLoot();
    setPlayer((prev) => ({ ...prev, activeMountId: mountId, isMounted: true }));
    pushToast(`Đang cưỡi [${m.name}] (+${m.moveSpeedPct}% Tốc · +${m.allResist}% Kháng)`);
  };

  const handleToggleMount = () => {
    if (!player.activeMountId) return;
    const m = MOUNTS.find((x) => x.id === player.activeMountId);
    const ill = player.activeMountIllusionId
      ? MOUNT_ILLUSIONS.find((x) => x.id === player.activeMountIllusionId)
      : null;
    const nextMounted = !player.isMounted;
    soundEngine.playSlash();
    setPlayer((prev) => ({ ...prev, isMounted: nextMounted }));
    if (m) {
      const displayName = ill ? ill.name : m.name;
      pushToast(nextMounted ? `Đã lên ngựa ${displayName}` : `Đã xuống ngựa ${displayName}`);
    }
  };

  // Mount Illusion (Huyễn Hóa Thú Cưỡi) actions
  const handleUnlockOrUpgradeIllusion = (illusionId: string) => {
    const ill = MOUNT_ILLUSIONS.find((x) => x.id === illusionId);
    if (!ill) return;
    const currentStars = player.mountIllusions?.[illusionId] || 0;
    if (currentStars >= 5) return;
    const cost = getIllusionUpgradeCost(ill, currentStars);
    if (
      player.silver < cost.silver ||
      player.goldIngots < cost.ingots ||
      player.enhanceStones < cost.stones
    ) {
      pushToast('Chưa đủ Bạc, Nguyên Bảo hoặc Đá Cường Hóa để Huyễn Hóa!');
      return;
    }

    const nextStars = currentStars + 1;
    const nextStats = getIllusionStats(ill, nextStars);
    soundEngine.playLevelUp();

    setPlayer((prev) => ({
      ...prev,
      silver: prev.silver - cost.silver,
      goldIngots: prev.goldIngots - cost.ingots,
      enhanceStones: prev.enhanceStones - cost.stones,
      wealth: prev.wealth + nextStars * 600,
      mountIllusions: {
        ...(prev.mountIllusions || {}),
        [illusionId]: nextStars,
      },
      activeMountIllusionId: currentStars === 0 ? illusionId : prev.activeMountIllusionId,
      isMounted: currentStars === 0 ? true : prev.isMounted,
    }));

    if (currentStars === 0) {
      pushToast(
        `Kích hoạt Huyễn Hóa [${ill.name}] (+${nextStats.moveSpeedPct}% Tốc · +${nextStats.allResist}% Kháng)!`
      );
      appendChat({
        channel: 'world',
        sender: 'Thiên Hạ Thông Báo',
        content: `Thần thú giáng thế! Cao thủ ${player.name} vừa kích hoạt Huyễn Hóa [${ill.name}] với ${ill.auraLabel}, uy chấn tứ phương!`,
      });
    } else {
      pushToast(`Tăng sao Huyễn Hóa [${ill.name}] lên ${nextStars}★ thành công!`);
      if (nextStars === 5) {
        appendChat({
          channel: 'world',
          sender: 'Thiên Hạ Thông Báo',
          content: `Đạt cảnh giới Cực Phẩm 5★! Huyễn Hóa [${ill.name}] của ${player.name} tỏa hào quang rực rỡ khắp võ lâm!`,
        });
      }
    }
  };

  const handleEquipIllusion = (illusionId: string | null) => {
    if (illusionId === null) {
      soundEngine.playLoot();
      setPlayer((prev) => ({ ...prev, activeMountIllusionId: null }));
      pushToast('Đã trở về ngoại hình Tuấn Mã gốc.');
      return;
    }
    const ill = MOUNT_ILLUSIONS.find((x) => x.id === illusionId);
    if (!ill || !(player.mountIllusions?.[illusionId] > 0)) return;
    soundEngine.playLoot();
    setPlayer((prev) => ({
      ...prev,
      activeMountIllusionId: illusionId,
      isMounted: true,
    }));
    pushToast(`Đang khoác Huyễn Hóa [${ill.name}] · ${ill.auraLabel}!`);
  };

  // Mantle & Titles
  const handleUpgradeMantle = () => {
    const next = MANTLES.find((m) => m.id === player.mantleId + 1);
    if (!next) return;
    if (
      player.wealth < next.requiredWealth ||
      player.merit < next.requiredMerit ||
      player.silver < next.silverCost
    ) {
      return;
    }
    soundEngine.playLevelUp();
    setPlayer((prev) => ({
      ...prev,
      mantleId: next.id,
      silver: prev.silver - next.silverCost,
    }));
    pushToast(`Thăng Cấp Quân Hàm Phi Phong: ${next.name}!`);
    appendChat({
      channel: 'world',
      sender: 'Thiên Hạ Thông Báo',
      content: `Chúc mừng hiệp khách ${player.name} khoác lên Phi Phong [${next.name}], ${next.auraStyle} chấn động võ lâm!`,
    });
  };

  // Guild & Social actions
  const handleJoinGuild = (guildId: string) => {
    const g = guilds.find((x) => x.id === guildId);
    if (!g) return;
    soundEngine.playLevelUp();
    setPlayer((prev) => ({ ...prev, guildId, guildContribution: prev.guildContribution + 100 }));
    setGuilds((prev) =>
      prev.map((x) => (x.id === guildId ? { ...x, members: Math.min(x.maxMembers, x.members + 1) } : x))
    );
    pushToast(`Gia nhập Bang Hội [${g.name}]!`);
    appendChat({
      channel: 'guild',
      sender: 'Bang Hội',
      content: `Chào mừng ${player.name} gia nhập ${g.name}! Cùng nhau xây dựng bang mạnh mẽ!`,
    });
  };

  const handleCreateGuild = (name: string, motto: string) => {
    if (player.silver < 1500) return;
    const newId = `guild_${Date.now()}`;
    const created: GuildInfo = {
      id: newId,
      name,
      leader: player.name,
      level: 1,
      members: 1,
      maxMembers: 35,
      contribution: 500,
      power: stats.power,
      motto,
      buffAtkPct: 6,
      buffDefPct: 6,
      buffHpPct: 6,
    };
    soundEngine.playLevelUp();
    setGuilds((prev) => [created, ...prev]);
    setPlayer((prev) => ({
      ...prev,
      silver: prev.silver - 1500,
      guildId: newId,
      guildContribution: 500,
    }));
    pushToast(`Thành lập Bang Hội [${name}] thành công!`);
    appendChat({
      channel: 'world',
      sender: 'Giang Hồ',
      content: `Hào kiệt ${player.name} vừa dựng cờ lập Bang [${name}]! Chiêu mộ anh hùng tứ phương!`,
    });
  };

  const handleDonateGuild = (type: 'silver' | 'ingot') => {
    if (!player.guildId) return;
    if (type === 'silver' && player.silver < 1000) return;
    if (type === 'ingot' && player.goldIngots < 20) return;
    const contribGain = type === 'silver' ? 120 : 450;
    const meritGain = type === 'silver' ? 60 : 220;
    soundEngine.playLoot();
    setPlayer((prev) => ({
      ...prev,
      silver: type === 'silver' ? prev.silver - 1000 : prev.silver,
      goldIngots: type === 'ingot' ? prev.goldIngots - 20 : prev.goldIngots,
      guildContribution: prev.guildContribution + contribGain,
      merit: prev.merit + meritGain,
    }));
    setGuilds((prev) =>
      prev.map((g) => {
        if (g.id !== player.guildId) return g;
        const newContrib = g.contribution + contribGain;
        const nextLevel = Math.min(10, 1 + Math.floor(newContrib / 30000));
        return {
          ...g,
          contribution: newContrib,
          level: Math.max(g.level, nextLevel),
          buffAtkPct: Math.min(24, g.buffAtkPct + (type === 'ingot' ? 1 : 0)),
          buffDefPct: Math.min(24, g.buffDefPct + (type === 'ingot' ? 1 : 0)),
          buffHpPct: Math.min(24, g.buffHpPct + (type === 'ingot' ? 1 : 0)),
        };
      })
    );
    pushToast(`Cống hiến Bang Hội thành công (+${contribGain} CH, +${meritGain} Công Trạng)`);
  };

  const handleUpgradeGuildTech = (techId: string) => {
    if (!player.guildId) {
      pushToast('Hãy gia nhập hoặc thành lập Bang Hội để nâng cấp Kỹ Năng Bang!');
      return;
    }
    const tech = GUILD_TECHS.find((t) => t.id === techId);
    if (!tech) return;
    const currentLevel = player.guildTechLevels?.[techId] || 0;
    if (currentLevel >= tech.maxLevel) return;
    const cost = getGuildTechUpgradeCost(tech, currentLevel);
    if (player.guildContribution < cost) {
      pushToast(`Không đủ ${formatNumber(cost)} Điểm Cống Hiến!`);
      return;
    }
    const nextLevel = currentLevel + 1;
    soundEngine.playLevelUp();
    setPlayer((prev) => ({
      ...prev,
      guildContribution: prev.guildContribution - cost,
      wealth: prev.wealth + nextLevel * 220,
      guildTechLevels: {
        ...(prev.guildTechLevels || {}),
        [techId]: nextLevel,
      },
    }));
    pushToast(`Nâng cấp Kỹ Năng Bang [${tech.name}] lên Cấp ${nextLevel}!`);
    if (nextLevel % 5 === 0) {
      appendChat({
        channel: 'guild',
        sender: 'Tâm Pháp Bang Hội',
        content: `Chúc mừng ${player.name} lĩnh ngộ [${tech.name}] đạt Cấp ${nextLevel}, thực lực bang hội ngày càng vững mạnh!`,
      });
    }
  };

  const handleAddFriend = (masterId: string) => {
    const m = masters.find((x) => x.id === masterId);
    if (!m) return;
    if (player.friends.some((f) => f.masterId === masterId)) {
      pushToast(`${m.name} đã có trong danh sách hảo hữu.`);
      return;
    }
    soundEngine.playLoot();
    setPlayer((prev) => ({
      ...prev,
      friends: [...prev.friends, { masterId, intimacy: 10 }],
    }));
    pushToast(`Đã kết giao hảo hữu với ${m.name}!`);
    appendChat({
      channel: 'whisper',
      sender: m.name,
      senderId: m.id,
      content: `Hân hạnh kết giao cùng ${player.name}! Hôm nào rảnh cùng đi Bạch Hổ Đường nhé.`,
    });
  };

  const handleGiftFriend = (masterId: string) => {
    if (player.silver < 300) return;
    const m = masters.find((x) => x.id === masterId);
    soundEngine.playLoot();
    setPlayer((prev) => ({
      ...prev,
      silver: prev.silver - 300,
      reputation: prev.reputation + 25,
      friends: prev.friends.map((f) =>
        f.masterId === masterId ? { ...f, intimacy: f.intimacy + 20 } : f
      ),
    }));
    if (m) {
      pushToast(`Tặng Hoa Hồng cho ${m.name} (+20 Thân Mật, +25 Danh Vọng)`);
    }
  };

  const handleClaimTribute = (cityId: SiegeCity['id']) => {
    const city = cities.find((c) => c.id === cityId);
    if (!city || !city.controlledByPlayerGuild) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    if (city.lastClaimDate === todayKey) return;
    soundEngine.playLevelUp();
    setCities((prev) =>
      prev.map((c) => (c.id === cityId ? { ...c, lastClaimDate: todayKey } : c))
    );
    setPlayer((prev) =>
      applyProgression(prev, {
        silver: city.dailySilver,
        goldIngots: city.dailyIngots,
        stones: city.dailyStones,
        merit: 250,
      })
    );
    pushToast(`Lĩnh Bổng Lộc Thành Chủ ${city.name}: +${formatNumber(city.dailySilver)} Bạc & ${city.dailyIngots} NB!`);
  };

  const handleHarvestTerritory = (territoryId: string) => {
    const t = territories.find((x) => x.id === territoryId);
    if (!t || !t.controlledByPlayerGuild) return;
    const now = Date.now();
    if (t.lastClaimAt && now - t.lastClaimAt < 120_000) return;
    soundEngine.playLevelUp();
    setTerritories((prev) =>
      prev.map((x) => (x.id === territoryId ? { ...x, lastClaimAt: now } : x))
    );
    setPlayer((prev) => {
      const progressed = applyProgression(prev, {
        silver: t.claimSilver,
        goldIngots: t.claimIngots,
        stones: t.claimStones,
        merit: 120,
      });
      return {
        ...progressed,
        potions: progressed.potions + t.claimPotions,
        guildContribution: progressed.guildContribution + 100,
      };
    });
    pushToast(
      `Thu hoạch [${t.name}]: +${formatNumber(t.claimSilver)} Bạc, +${t.claimIngots} NB, +${t.claimStones} Đá CH${
        t.claimPotions > 0 ? `, +${t.claimPotions} Dược` : ''
      }!`
    );
  };

  const handleSendChat = (channel: ChatChannel, content: string) => {
    appendChat({
      channel,
      sender: player.name,
      content,
    });
    // Realistic reply in whisper channel
    if (channel === 'whisper' && whisperTarget) {
      const target = whisperTarget;
      window.setTimeout(() => {
        const replies = [
          `Huynh đài ${player.name} võ công tiến bộ nhanh quá! Lực chiến chắc sắp vượt ta rồi.`,
          'Tối nay nhớ tập trung Công Thành Chiến Biện Kinh nhé, thiếu cao thủ như huynh không được đâu!',
          'Đồ Hoàng Kim dạo này hiếm lắm, huynh thử săn Boss Độc Cô Thiên Phong xem sao.',
        ];
        appendChat({
          channel: 'whisper',
          sender: target.name,
          senderId: target.id,
          content: replies[Math.floor(Math.random() * replies.length)],
        });
      }, 1200);
    }
  };

  const handleChatMasterAction = (master: SimulatedMaster, action: 'friend' | 'duel' | 'whisper') => {
    if (action === 'friend') {
      handleAddFriend(master.id);
    } else if (action === 'whisper') {
      setWhisperTarget(master);
      pushToast(`Đang nhắn mật với ${master.name}`);
    } else if (action === 'duel') {
      setActiveModal(null);
      setBattleResult(null);
      setBattle({ mode: 'ARENA', arenaOpponent: master });
    }
  };

  // Screen routing
  if (screen === 'TITLE_MENU') {
    return (
      <TitleScreen
        savedGame={savedSnapshot}
        onContinue={handleContinue}
        onStartNew={() => setScreen('CHARACTER_CREATE')}
      />
    );
  }

  if (screen === 'CHARACTER_CREATE') {
    return (
      <CharacterCreate
        onBack={() => setScreen('TITLE_MENU')}
        onConfirm={handleConfirmCreate}
      />
    );
  }

  const sect = SECTS[player.sect];
  const elem = ELEMENT_META[sect.element];
  const mantle = MANTLES.find((m) => m.id === player.mantleId) || MANTLES[0];
  const titleObj = TITLES.find((t) => t.id === player.activeTitleId);
  const activeMount = MOUNTS.find((m) => m.id === player.activeMountId) || null;
  const activeIllusion = player.activeMountIllusionId
    ? MOUNT_ILLUSIONS.find((x) => x.id === player.activeMountIllusionId) || null
    : null;
  const aliveBossCount = WORLD_BOSSES.filter((b) => (bossTimers[b.id] || 0) <= 0).length;

  const hpRatio = Math.max(0, Math.min(1, hud.hp / Math.max(1, hud.maxHp)));
  const mpRatio = Math.max(0, Math.min(1, hud.mp / Math.max(1, hud.maxMp)));
  const expRatio = Math.max(0, Math.min(1, player.exp / Math.max(1, player.maxExp)));
  const shieldRatio =
    hud.shield > 0
      ? Math.max(0, Math.min(1, hud.shield / Math.max(1, hud.maxHp * 0.4)))
      : 1;
  const targetElem = hud.target ? ELEMENT_META[hud.target.element] : null;
  const coordX = hud.playerCoord?.x ?? 198;
  const coordY = hud.playerCoord?.y ?? 204;

  const focusFloatingWindow = (win: 'char' | 'bag' | 'skills') => {
    setWindowOrder((prev) => [...prev.filter((w) => w !== win), win]);
  };
  const getFloatingZ = (win: 'char' | 'bag' | 'skills') => 40 + windowOrder.indexOf(win);

  const toggleCharWindow = (targetTab: CharacterSubTab = 'equip') => {
    if (charWindowOpen && charSubTab === targetTab) {
      setCharWindowOpen(false);
    } else {
      setCharSubTab(targetTab);
      setCharWindowOpen(true);
      focusFloatingWindow('char');
    }
  };

  const toggleBagWindow = () => {
    setBagWindowOpen((open) => {
      if (!open) focusFloatingWindow('bag');
      return !open;
    });
  };

  const toggleSkillsWindow = () => {
    setSkillsWindowOpen((open) => {
      if (!open) focusFloatingWindow('skills');
      return !open;
    });
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0B0D0E] text-[#F0ECE1]">
      {/* FULLSCREEN 2D REAL-TIME GAME WORLD CANVAS (Kiếm Thế PC 2009 Layout) */}
      <main className="absolute inset-0 h-full w-full overflow-hidden">
        <BattleCanvas
          ref={canvasRef}
          player={player}
          stats={stats}
          guild={myGuild}
          battle={battle}
          cities={cities}
          territories={territories}
          masters={masters}
          weather={activeWeather}
          autoBattle={autoBattle}
          paused={activeModal === 'PAUSE' || battleResult !== null}
          onHudUpdate={setHud}
          onWildKill={handleWildKill}
          onPkKill={handlePkKill}
          onWildPlayerDefeated={handleWildPlayerDefeated}
          onBattleComplete={handleBattleComplete}
          onPotionConsumed={() =>
            setPlayer((prev) => ({ ...prev, potions: Math.max(0, prev.potions - 1) }))
          }
          onCollectChest={handleCollectChest}
        />
      </main>

      {/* CLASSIC KIẾM THẾ PC 2009 FLOATING HUD OVERLAY */}
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between">
        {/* ================= TOP ROW: COMPACT KIẾM THẾ 2009 PORTRAIT + TRIPLE VITAL TUBE BAR | MINIMAP ================= */}
        <div className="flex items-start justify-between gap-2 px-1.5 pt-1">
          {/* TOP-LEFT + TOP-CENTER: COMPACT KIẾM THẾ 2009 TOP BAR */}
          <div className="pointer-events-auto flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-start gap-1">
              {/* Compact Square Sculpted Steel Portrait Frame + Ngũ Hành Gem + Level Plate */}
              <button
                onClick={() => toggleCharWindow('equip')}
                title="Mở bảng Nhân Vật & Trang Bị (F1)"
                className={`kt-hud-box relative flex h-[40px] w-[40px] shrink-0 items-center justify-center overflow-hidden p-0.5 cursor-pointer transition-shadow duration-300 ${
                  levelUpBanner
                    ? 'ring-2 ring-[#FDE047] shadow-[0_0_16px_rgba(250,204,21,0.85)]'
                    : ''
                }`}
              >
                <div className="kt-slot relative flex h-full w-full items-center justify-center overflow-hidden">
                  {player.avatarUrl ? (
                    <img
                      src={player.avatarUrl}
                      alt={player.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{
                        background: `radial-gradient(circle at 50% 42%, ${sect.color}38 0%, #1B2226 68%, #0C1012 100%)`,
                      }}
                    >
                      <span
                        className="font-wuxia text-sm font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                        style={{ color: sect.color }}
                      >
                        {sect.name.split(' ')[0]}
                      </span>
                    </div>
                  )}
                  <span
                    className="absolute top-0 left-0 border-r border-b border-[#6C777E] px-0.5 text-[7px] font-bold leading-tight"
                    style={{ backgroundColor: '#0E1215F0', color: elem.color }}
                  >
                    {elem.name}
                  </span>
                  <span
                    className={`absolute right-0 bottom-0 border-t border-l px-0.5 font-mono text-[8px] font-bold tabular-nums leading-tight transition-colors ${
                      levelUpBanner
                        ? 'border-[#FEF08A] bg-[#854D0E] text-[#FFFBEB] animate-pulse'
                        : 'border-[#98A6AE] bg-[#0B0E10]/95 text-[#FDE047]'
                    }`}
                  >
                    {player.level}
                  </span>
                </div>
              </button>

              {/* COMPACT KIẾM THẾ 2009 HORIZONTAL TRIPLE VITAL TUBE BAR */}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 max-w-[492px]">
                <div className="kt-hud-box px-1.5 pt-0.5 pb-1">
                  {/* Top Bezel Row: <Phi Phong> Name on Left · EXP % Centered Above Red HP · Power on Right */}
                  <div className="mb-0.5 grid grid-cols-12 items-center gap-1 text-[9px]">
                    <div className="col-span-5 flex min-w-0 items-center gap-1">
                      <span
                        className="shrink-0 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)]"
                        style={{ color: mantle.id > 0 ? mantle.color : '#93C5FD' }}
                      >
                        &lt;{mantle.id === 0 ? 'Sơ Nhập' : mantle.name}&gt;
                      </span>
                      <span
                        className={`truncate font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)] ${
                          player.pkPoints > 0 ? 'text-[#F87171]' : 'text-[#C8FFE0]'
                        }`}
                      >
                        {player.name}
                      </span>
                    </div>

                    {/* Centered EXP % directly over Red HP Bar (Kiếm Thế 2009 authentic layout) */}
                    <div className="col-span-3 flex justify-center">
                      <span
                        className="rounded-[2px] border border-[#5B6870] bg-[#0B0E11] px-1.5 py-0 font-mono text-[8.5px] font-bold text-[#F0FAF3] tabular-nums"
                        title={`Kinh Nghiệm: ${formatNumber(player.exp)} / ${formatNumber(player.maxExp)}`}
                      >
                        {(expRatio * 100).toFixed(2)}%
                      </span>
                    </div>

                    <div className="col-span-4 flex items-center justify-end gap-1.5 font-mono text-[8.5px] tabular-nums">
                      <span
                        className="hidden truncate font-sans font-semibold sm:inline"
                        style={{ color: sect.color }}
                      >
                        {sect.name}
                      </span>
                      <span className="shrink-0 text-[#F5D061]">
                        LC {formatNumber(stats.power)}
                      </span>
                    </div>
                  </div>

                  {/* 3 Sleek Side-by-Side 2009 Liquid Tubes (Blue MP | Wide Red HP | Green Thể Lực/Hộ Thuẫn) */}
                  <div className="grid grid-cols-12 items-center gap-1">
                    <div className="kt-bar-track relative col-span-3 h-2.5 overflow-hidden">
                      <div
                        className="kt-bar-mp h-full origin-left transition-transform duration-100"
                        style={{ transform: `scaleX(${mpRatio})` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center font-mono text-[7.5px] font-bold text-[#EFF6FF] tabular-nums drop-shadow-[0_1px_1px_rgba(0,0,0,0.98)]">
                        {formatNumber(hud.mp)}/{formatNumber(hud.maxMp)}
                      </div>
                    </div>

                    <div className="kt-bar-track relative col-span-6 h-3 overflow-hidden">
                      <div
                        className="kt-bar-hp h-full origin-left transition-transform duration-100"
                        style={{ transform: `scaleX(${hpRatio})` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center font-mono text-[8px] font-bold text-white tabular-nums drop-shadow-[0_1px_1px_rgba(0,0,0,0.98)]">
                        {formatNumber(hud.hp)}/{formatNumber(hud.maxHp)}
                      </div>
                    </div>

                    <div className="kt-bar-track relative col-span-3 h-2.5 overflow-hidden">
                      <div
                        className="kt-bar-stamina h-full origin-left transition-transform duration-150"
                        style={{ transform: `scaleX(${shieldRatio})` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center font-mono text-[7.5px] font-bold text-[#ECFDF5] tabular-nums drop-shadow-[0_1px_1px_rgba(0,0,0,0.98)]">
                        {hud.shield > 0 ? `+${formatNumber(hud.shield)}` : `${960 + player.level * 12}/${960 + player.level * 12}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compact Title · Guild.Role · Target HP Bar + System Toast Row */}
                <div className="flex flex-wrap items-center gap-1">
                  {(titleObj || myGuild) && (
                    <div className="hidden items-center gap-1.5 border border-[#4D5A62]/75 bg-[#0F1316]/86 px-1.5 py-0.5 text-[9px] lg:flex">
                      {titleObj && (
                        <span className="font-bold" style={{ color: titleObj.color }}>
                          {titleObj.name}
                        </span>
                      )}
                      {titleObj && myGuild && <span className="text-[#5E707A]">·</span>}
                      {myGuild && (
                        <span className="font-semibold text-[#D8F5E6]">
                          [Bang hội]{myGuild.name}.{myGuild.leader === player.name ? 'Bang chủ' : 'Thành viên'}
                        </span>
                      )}
                    </div>
                  )}

                  {player.pkPoints > 0 && (
                    <button
                      onClick={() => toggleCharWindow('equip')}
                      title="Điểm Sát Khí — Nhấn để mở Tịnh Tâm Rửa Tội"
                      className="kt-btn-crimson px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums cursor-pointer whitespace-nowrap"
                    >
                      PK {player.pkPoints}/10
                    </button>
                  )}

                  {hud.target && targetElem && (
                    <div className="kt-hud-box flex w-[184px] items-center gap-1.5 px-1.5 py-0.5">
                      <span
                        className="shrink-0 border border-[#616E76] bg-[#0D1114] px-0.5 text-[7.5px] font-bold"
                        style={{ color: targetElem.color }}
                      >
                        {targetElem.name}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center justify-between gap-1 text-[9px]">
                          <span
                            className={`truncate font-bold ${
                              hud.target.kind === 'boss' || hud.target.kind === 'pillar'
                                ? 'text-[#FDE047]'
                                : hud.target.kind === 'rival'
                                ? 'text-[#FCA5A5]'
                                : 'text-[#F3F4F6]'
                            }`}
                          >
                            {hud.target.name}
                          </span>
                          <span className="shrink-0 font-mono text-[7.5px] text-[#D1DCE2] tabular-nums">
                            {formatNumber(hud.target.hp)}/{formatNumber(hud.target.maxHp)}
                          </span>
                        </div>
                        <div className="kt-bar-track h-1.5 w-full overflow-hidden">
                          <div
                            className="kt-bar-hp h-full origin-left transition-transform duration-100"
                            style={{
                              transform: `scaleX(${Math.max(
                                0,
                                Math.min(1, hud.target.hp / Math.max(1, hud.target.maxHp))
                              )})`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {toast && (
                    <div className="kt-hud-box max-w-[270px] border-[#88C29B] bg-[#102218]/92 px-2 py-0.5 text-[9.5px] font-semibold text-[#FEF3C7]">
                      {toast}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* COMPACT KIẾM THẾ 2009 LEVEL-UP ASCENSION RIBBON (Non-blocking Top-Center) */}
          {levelUpBanner && (
            <div className="pointer-events-none fixed left-1/2 top-[52px] z-30 -translate-x-1/2">
              <div className="flex flex-col items-center rounded-[2px] border border-[#F5D061]/90 bg-[linear-gradient(180deg,rgba(46,32,12,0.94)_0%,rgba(16,22,20,0.92)_100%)] px-4 py-1.5 shadow-[0_0_24px_rgba(245,208,97,0.45)]">
                <div className="flex items-center gap-1.5 font-serif text-[13px] font-bold tracking-wider text-[#FEF08A] drop-shadow-[0_1px_4px_rgba(245,158,11,0.85)]">
                  <span>✦</span>
                  <span>THĂNG CẤP · CẤP {levelUpBanner.level}</span>
                  <span>✦</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-[9.5px] text-[#E6F2EC] tabular-nums">
                  <span className="text-[#FCA5A5]">+{levelUpBanner.hpGain} HP</span>
                  <span className="text-[#F5D061]">+{levelUpBanner.atkGain} Công</span>
                  <span className="text-[#93C5FD]">+{levelUpBanner.defGain} Thủ</span>
                  <span className="text-[#86EFAC]">· Hồi Đầy Sinh/Nội</span>
                </div>
                {levelUpBanner.unlockedText && (
                  <div className="mt-0.5 text-[9.5px] font-semibold text-[#86EFAC]">
                    ★ {levelUpBanner.unlockedText}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TOP-RIGHT: COMPACT KIẾM THẾ 2009 STEEL-JADE RADAR MINIMAP + RIM BUTTONS + TRACKER */}
          <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-1">
            <div className="flex items-start gap-1">
              {/* Vertical Steel Rim Utility Buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => setActiveModal('MAP_BOSS')}
                  title="Bản Đồ Thế Giới & Boss Hoàng Kim (M)"
                  className="kt-btn-bronze flex h-5 w-5 items-center justify-center text-[9px] font-bold cursor-pointer"
                >
                  M
                </button>
                <button
                  onClick={() => setActiveModal('GOOGLE_MAPS')}
                  title="Địa Đồ Google Maps"
                  className="kt-btn-bronze flex h-5 w-5 items-center justify-center cursor-pointer"
                  aria-label="Địa Đồ"
                >
                  <MapPin className="h-2.5 w-2.5 text-[#F5D061]" />
                </button>
                <button
                  onClick={() => setActiveModal('MAP_BOSS')}
                  title={`${aliveBossCount} Boss Hoàng Kim đang xuất hiện`}
                  className={`relative flex h-5 w-5 items-center justify-center cursor-pointer ${
                    aliveBossCount > 0 ? 'kt-btn-crimson' : 'kt-btn-bronze'
                  }`}
                  aria-label="Boss Hoàng Kim"
                >
                  <Flame className="h-2.5 w-2.5 text-[#FDE68A]" />
                  {aliveBossCount > 0 && (
                    <span className="absolute -top-1 -right-1 z-20 flex h-3 min-w-3 items-center justify-center border border-[#F5D061] bg-[#991B1B] px-0.5 font-mono text-[7px] font-bold text-[#FEF3C7]">
                      {aliveBossCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setMuted(soundEngine.toggleMute())}
                  title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                  className="kt-btn-bronze flex h-5 w-5 items-center justify-center cursor-pointer"
                  aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                >
                  {muted ? <VolumeX className="h-2.5 w-2.5" /> : <Volume2 className="h-2.5 w-2.5" />}
                </button>
                <button
                  onClick={() => setActiveModal('PAUSE')}
                  title="Hệ Thống & Tạm Dừng (Esc)"
                  className="kt-btn-bronze flex h-5 w-5 items-center justify-center cursor-pointer"
                  aria-label="Tạm dừng"
                >
                  <Pause className="h-2.5 w-2.5" />
                </button>
              </div>

              {/* Compact Square Steel-Jade Minimap Frame */}
              <div className="kt-hud-box w-[138px] overflow-hidden">
                <div className="kt-titlebar flex items-center justify-between gap-1 px-1.5 py-0.5 text-[9px]">
                  <span className="min-w-0 truncate font-bold text-[#F3E5B8]">
                    {currentMap.name}
                  </span>
                  <span className="shrink-0 font-mono text-[8.5px] font-bold text-[#86EFAC] tabular-nums">
                    {coordX}/{coordY}
                  </span>
                </div>

                {/* Live Interactive Radar Map with Expanded World Viewport Box */}
                <button
                  type="button"
                  onClick={() => setActiveModal('MAP_BOSS')}
                  title="Nhấp mở Bản Đồ Thế Giới & Săn Boss (M)"
                  className="relative block h-[74px] w-full overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#4f7254_0%,#39573f_62%,#273c2e_100%)] text-left cursor-pointer"
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-35"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, rgba(226,244,218,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(226,244,218,0.35) 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  />
                  {/* Subtle crossroads & central plaza silhouette on minimap */}
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-[#d9d2be]/35" />
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-[#d9d2be]/35" />
                  <div className="pointer-events-none absolute top-1/2 left-1/2 h-4 w-6 -translate-x-1/2 -translate-y-1/2 border border-[#f3e5b8]/45 bg-[#cfc8b4]/35" />

                  {/* Camera Viewport Indicator on Expanded Map */}
                  {hud.camRect && (
                    <span
                      className="pointer-events-none absolute border border-[#E2E8F0]/55 bg-[#E2E8F0]/5"
                      style={{
                        left: `${hud.camRect.x * 100}%`,
                        top: `${hud.camRect.y * 100}%`,
                        width: `${hud.camRect.w * 100}%`,
                        height: `${hud.camRect.h * 100}%`,
                      }}
                    />
                  )}

                  {(hud.radarDots || []).map((dot, idx) => (
                    <span
                      key={idx}
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{
                        left: `${dot.x * 100}%`,
                        top: `${dot.y * 100}%`,
                        width: dot.kind === 'boss' ? 6 : dot.kind === 'chest' ? 4.5 : 3.5,
                        height: dot.kind === 'boss' ? 6 : dot.kind === 'chest' ? 4.5 : 3.5,
                        backgroundColor:
                          dot.kind === 'boss'
                            ? '#F59E0B'
                            : dot.kind === 'rival'
                            ? '#C084FC'
                            : dot.kind === 'ally'
                            ? '#34D399'
                            : dot.kind === 'chest'
                            ? '#FEF08A'
                            : '#EF4444',
                      }}
                    />
                  ))}

                  <span
                    className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#0B0E10] bg-[#FDE047] shadow-[0_0_6px_rgba(253,224,71,0.95)]"
                    style={{
                      left: `${(hud.playerNorm?.x ?? 0.5) * 100}%`,
                      top: `${(hud.playerNorm?.y ?? 0.52) * 100}%`,
                    }}
                  />

                  <span
                    className={`pointer-events-none absolute top-0.5 left-0.5 px-1 text-[7px] font-semibold ${
                      currentMap.isSafeZone
                        ? 'bg-[#102619]/85 text-[#86EFAC]'
                        : 'bg-[#2C1111]/85 text-[#FCA5A5]'
                    }`}
                  >
                    {currentMap.isSafeZone ? 'An Toàn' : 'Khu PK'}
                  </span>
                  <span
                    title={weatherMeta.description}
                    className="pointer-events-none absolute bottom-0.5 left-0.5 flex items-center gap-0.5 bg-[#0C1012]/85 px-1 py-0 text-[7px]"
                    style={{ color: weatherMeta.color }}
                  >
                    {activeWeather === 'rain' && <CloudRain className="h-2 w-2" />}
                    {activeWeather === 'snow' && <Snowflake className="h-2 w-2" />}
                    {activeWeather === 'mist' && <CloudFog className="h-2 w-2" />}
                    {activeWeather === 'ash_wind' && <Wind className="h-2 w-2" />}
                    {activeWeather === 'clear' && <Sun className="h-2 w-2" />}
                    <span>{weatherMeta.name}</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Compact Collapsible Quest / Objective Tracker */}
            <div className="kt-ink-panel w-[162px] overflow-hidden text-[9px]">
              <button
                type="button"
                onClick={() => setQuestCollapsed((v) => !v)}
                className="kt-titlebar flex w-full items-center justify-between gap-1 px-1.5 py-0.5 text-left cursor-pointer"
                title={questCollapsed ? 'Mở rộng bảng mục tiêu' : 'Thu gọn bảng mục tiêu'}
              >
                <span className="min-w-0 truncate font-bold text-[#F3E5B8]">
                  {hud.objectiveLabel}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  {hud.timerSec !== null && (
                    <span className="font-mono text-[8.5px] font-bold text-[#F87171] tabular-nums">
                      {hud.timerSec}s
                    </span>
                  )}
                  {questCollapsed ? (
                    <ChevronDown className="h-2.5 w-2.5 text-[#B6C7BD]" />
                  ) : (
                    <ChevronUp className="h-2.5 w-2.5 text-[#B6C7BD]" />
                  )}
                </div>
              </button>

              {!questCollapsed && (
                <div className="space-y-0.5 p-1.5">
                  <div className="flex items-center justify-between text-[8.5px] text-[#C8D4DB]">
                    <span>{weatherMeta.name}</span>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        weatherMeta.allResistDelta > 0
                          ? 'text-[#4ADE80]'
                          : weatherMeta.allResistDelta < 0
                          ? 'text-[#F87171]'
                          : 'text-[#B2C0C8]'
                      }`}
                    >
                      Kháng{' '}
                      {weatherMeta.allResistDelta > 0
                        ? `+${weatherMeta.allResistDelta}%`
                        : `${weatherMeta.allResistDelta}%`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-mono text-[8.5px] text-[#B8C6CE] tabular-nums">
                    <span>Lôi Đài</span>
                    <span className="text-[#F5D061]">Hạng #{player.arenaRank}</span>
                  </div>

                  {battle.mode !== 'WILD' && (
                    <button
                      onClick={() => setBattle({ mode: 'WILD' })}
                      className="kt-btn-crimson w-full py-0.5 text-[8.5px] font-semibold cursor-pointer"
                    >
                      Rút Lui Luyện Công
                    </button>
                  )}

                  {stats.pkPenaltyPct > 0 && (
                    <button
                      onClick={() => toggleCharWindow('equip')}
                      className="kt-btn-crimson flex w-full items-center justify-center gap-1 py-0.5 font-mono text-[8.5px] font-bold tabular-nums cursor-pointer"
                    >
                      <Skull className="h-2.5 w-2.5" />
                      <span>
                        Phản Phệ -{stats.pkPenaltyPct}% ({pkPenaltyRemainSec}s)
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveModal('VFX_SHEETS')}
                    className="kt-btn-bronze flex w-full items-center justify-center gap-1 py-0.5 text-[8.5px] font-semibold text-[#FEF08A] cursor-pointer"
                  >
                    <Sparkles className="h-2.5 w-2.5 text-[#F5D061]" />
                    <span>Kho Sheet VFX (21 Bảng)</span>
                  </button>

                  {aliveBossCount > 0 && battle.mode === 'WILD' && (
                    <button
                      onClick={() => setActiveModal('MAP_BOSS')}
                      className="kt-btn-bronze flex w-full items-center justify-center gap-1 py-0.5 text-[8.5px] font-semibold text-[#FDE68A] cursor-pointer"
                    >
                      <Flame className="h-2.5 w-2.5 text-[#F97316]" />
                      <span>{aliveBossCount} Boss Hoàng Kim</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= AUTHENTIC KIẾM THẾ PC 2009 BOTTOM COMMAND BAR + FLUSH CHAT DOCK ================= */}
        <KiemTheBottomBar
          player={player}
          sect={sect}
          battleMode={battle.mode}
          isSafeZone={!!currentMap.isSafeZone}
          autoBattle={autoBattle}
          activeModal={activeModal}
          isCharOpen={charWindowOpen}
          charSubTab={charSubTab}
          isBagOpen={bagWindowOpen}
          isSkillsOpen={skillsWindowOpen}
          cooldowns={hud.cooldowns}
          dashCooldown={hud.dashCooldown}
          expRatio={expRatio}
          aliveBossCount={aliveBossCount}
          activeMount={activeMount}
          activeIllusion={activeIllusion}
          moveSpeedPct={stats.moveSpeedPct}
          onToggleAuto={() => setAutoBattle((v) => !v)}
          onUsePotion={() => canvasRef.current?.usePotion()}
          onBuyPotion={handleBuyPotion}
          onCastSkill={(idx) => canvasRef.current?.castSkill(idx)}
          onUseDash={() => canvasRef.current?.useDash()}
          onToggleMount={handleToggleMount}
          onTogglePkMode={handleTogglePkMode}
          onOpenChest={(tier) => handleOpenChestFromStock(tier)}
          onToggleChar={toggleCharWindow}
          onToggleBag={toggleBagWindow}
          onToggleSkills={toggleSkillsWindow}
          onOpenModal={(modal) => {
            if (modal === 'DUNGEON_ARENA') setDungeonArenaInitTab('dungeon');
            if (modal === 'SOCIAL_GUILD') setSocialInitTab('guild');
            setActiveModal(modal);
          }}
          leftOverlay={
            <ChatDock
              messages={chatMessages}
              whisperTarget={whisperTarget}
              masters={masters}
              onSendMessage={handleSendChat}
              onSelectMasterAction={handleChatMasterAction}
            />
          }
        />
      </div>

      {/* INDEPENDENT FLOATING KIẾM THẾ 2009 WINDOWS (F1 Nhân Vật · F2 Hành Nang · F3 Kỹ Năng) */}
      {charWindowOpen && (
        <CharacterModal
          player={player}
          stats={stats}
          guildName={myGuild?.name ?? null}
          initialTab={charSubTab}
          zIndex={getFloatingZ('char')}
          pkPenaltyRemainSec={pkPenaltyRemainSec}
          onFocus={() => focusFloatingWindow('char')}
          onClose={() => setCharWindowOpen(false)}
          onOpenBag={() => {
            setBagWindowOpen(true);
            focusFloatingWindow('bag');
          }}
          onOpenTitleMantle={() => setActiveModal('TITLE_MANTLE')}
          onEnhanceSlot={handleEnhanceSlot}
          onBuyMount={handleBuyMount}
          onSelectMount={handleSelectMount}
          onToggleMount={handleToggleMount}
          onUnlockOrUpgradeIllusion={handleUnlockOrUpgradeIllusion}
          onEquipIllusion={handleEquipIllusion}
          onCleansePk={handleCleansePk}
        />
      )}

      {bagWindowOpen && (
        <BagWindow
          player={player}
          zIndex={getFloatingZ('bag')}
          onFocus={() => focusFloatingWindow('bag')}
          onClose={() => setBagWindowOpen(false)}
          onEquipItem={handleEquipItem}
          onSellItem={handleSellItem}
          onSellJunk={handleSellJunk}
          onBuyPotion={handleBuyPotion}
          onBuyStones={handleBuyStones}
        />
      )}

      {skillsWindowOpen && (
        <SkillsWindow
          player={player}
          zIndex={getFloatingZ('skills')}
          onFocus={() => focusFloatingWindow('skills')}
          onClose={() => setSkillsWindowOpen(false)}
          onUpgradeSkill={handleUpgradeSkill}
          onSwitchBranch={handleSwitchBranch}
          onEquipSkill={handleEquipSkill}
          onPreviewSkill={(skillId) => canvasRef.current?.previewSkillVfx(skillId)}
          onOpenVfxSheets={() => setActiveModal('VFX_SHEETS')}
        />
      )}

      {activeModal === 'VFX_SHEETS' && (
        <VfxSheetGalleryModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'MAP_BOSS' && (
        <MapBossModal
          player={player}
          bossTimers={bossTimers}
          onClose={() => setActiveModal(null)}
          onSelectMap={(mapId) => {
            const targetMap = MAPS.find((m) => m.id === mapId);
            setPlayer((prev) => ({
              ...prev,
              currentMapId: mapId,
              pkMode: targetMap?.isSafeZone ? 'peace' : prev.pkMode,
            }));
            setBattle({ mode: 'WILD' });
            setActiveModal(null);
            if (targetMap) {
              const wm = WEATHER_META[targetMap.weatherPool[0] || 'clear'];
              const deltaText =
                wm.allResistDelta === 0
                  ? ''
                  : ` · ${wm.name} (Kháng ${wm.allResistDelta > 0 ? `+${wm.allResistDelta}%` : `${wm.allResistDelta}%`})`;
              const pkText = targetMap.isSafeZone ? ' · Khu An Toàn' : ' · Cho phép Đồ Sát (PK)';
              pushToast(`Đã dịch chuyển tới ${targetMap.name}${deltaText}${pkText}`);
            }
          }}
          onChallengeBoss={(bossId) => {
            setActiveModal(null);
            setBattleResult(null);
            setBattle({ mode: 'BOSS', bossId });
          }}
          onOpenGoogleMaps={() => setActiveModal('GOOGLE_MAPS')}
        />
      )}

      {activeModal === 'GOOGLE_MAPS' && (
        <GoogleMapsModal
          player={player}
          guild={myGuild}
          onClose={() => setActiveModal(null)}
          onNotify={pushToast}
        />
      )}

      {activeModal === 'DUNGEON_ARENA' && (
        <DungeonArenaModal
          player={player}
          stats={stats}
          masters={masters}
          initialTab={dungeonArenaInitTab}
          onClose={() => setActiveModal(null)}
          onStartDungeon={(dungeonId, floor) => {
            setActiveModal(null);
            setBattleResult(null);
            setBattle({ mode: 'DUNGEON', dungeonId, dungeonFloor: floor });
          }}
          onChallengeMaster={(master) => {
            setActiveModal(null);
            setBattleResult(null);
            setBattle({ mode: 'ARENA', arenaOpponent: master });
          }}
        />
      )}

      {activeModal === 'TITLE_MANTLE' && (
        <TitleMantleModal
          player={player}
          onClose={() => setActiveModal(null)}
          onEquipTitle={(titleId) => {
            setPlayer((prev) => ({ ...prev, activeTitleId: titleId }));
            const t = TITLES.find((x) => x.id === titleId);
            if (t) pushToast(`Đang hiển thị danh hiệu « ${t.name} »`);
          }}
          onUpgradeMantle={handleUpgradeMantle}
        />
      )}

      {activeModal === 'SOCIAL_GUILD' && (
        <SocialGuildModal
          player={player}
          stats={stats}
          guilds={guilds}
          masters={masters}
          initialTab={socialInitTab}
          onClose={() => setActiveModal(null)}
          onJoinGuild={handleJoinGuild}
          onCreateGuild={handleCreateGuild}
          onLeaveGuild={() => {
            setPlayer((prev) => ({ ...prev, guildId: null }));
            pushToast('Đã rời khỏi Bang Hội.');
          }}
          onDonateGuild={handleDonateGuild}
          onUpgradeGuildTech={handleUpgradeGuildTech}
          onAddFriend={handleAddFriend}
          onGiftFriend={handleGiftFriend}
          onDuelMaster={(m) => {
            setActiveModal(null);
            setBattleResult(null);
            setBattle({ mode: 'ARENA', arenaOpponent: m });
          }}
          onWhisperMaster={(m) => {
            setWhisperTarget(m);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'SIEGE' && (
        <SiegeWarModal
          cities={cities}
          territories={territories}
          stats={stats}
          playerGuild={myGuild}
          onClose={() => setActiveModal(null)}
          onLaunchSiege={(cityId) => {
            setActiveModal(null);
            setBattleResult(null);
            setBattle({ mode: 'SIEGE', siegeCityId: cityId });
          }}
          onClaimTribute={handleClaimTribute}
          onLaunchGuildWar={(territoryId) => {
            setActiveModal(null);
            setBattleResult(null);
            setBattle({ mode: 'GUILD_WAR', guildWarTerritoryId: territoryId });
          }}
          onHarvestTerritory={handleHarvestTerritory}
          onOpenGuild={() => {
            setSocialInitTab('guild');
            setActiveModal('SOCIAL_GUILD');
          }}
        />
      )}

      {activeModal === 'SAGE_STUDIO' && (
        <SageStudioModal
          player={player}
          stats={stats}
          guild={myGuild}
          onClose={() => setActiveModal(null)}
          onApplyAvatar={(imageUrl) => {
            setPlayer((prev) => ({ ...prev, avatarUrl: imageUrl }));
            pushToast('Đã cập nhật chân dung nhân vật mới!');
          }}
        />
      )}

      {/* PAUSE MODAL (Kiếm Thế 2009 System Menu Window) */}
      {activeModal === 'PAUSE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="kt-window w-full max-w-md overflow-hidden text-center">
            <div className="kt-titlebar px-5 py-2.5">
              <h2 className="font-wuxia text-2xl font-bold text-[#F7DA85]">Hệ Thống · Tạm Dừng</h2>
            </div>
            <div className="p-6">
              <p className="text-xs text-[#D2C1A0]">
                Tiến trình nhân vật của bạn được tự động lưu trữ trực tiếp trên trình duyệt
                (LocalStorage).
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  onClick={() => setActiveModal(null)}
                  className="kt-btn-crimson flex items-center justify-center gap-2 py-2.5 text-sm font-semibold cursor-pointer"
                >
                  <Play className="h-4 w-4" />
                  <span>Tiếp Tục Hành Tẩu</span>
                </button>
                <button
                  onClick={() => {
                    saveGameToStorage({
                      version: 1,
                      savedAt: Date.now(),
                      player,
                      guilds,
                      cities,
                      territories,
                      masters,
                    });
                    pushToast('Đã lưu dữ liệu nhân vật thành công!');
                    setActiveModal(null);
                  }}
                  className="kt-btn-bronze py-2.5 text-sm font-semibold cursor-pointer"
                >
                  Lưu Dữ Liệu Ngay
                </button>
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setScreen('TITLE_MENU');
                  }}
                  className="kt-btn-bronze py-2.5 text-sm font-semibold cursor-pointer"
                >
                  Về Màn Hình Đăng Nhập
                </button>
                <button
                  onClick={() => {
                    clearSavedGame();
                    setSavedSnapshot(null);
                    setActiveModal(null);
                    setScreen('CHARACTER_CREATE');
                  }}
                  className="flex items-center justify-center gap-1.5 border border-[#7C2D2D] bg-[#251111] py-2 text-xs font-semibold text-[#FCA5A5] hover:bg-[#351717] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Xóa Lưu &amp; Tạo Nhân Vật Mới</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / DEFEAT BATTLE RESULT MODAL */}
      {battleResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4">
          <div className="kt-window w-full max-w-md overflow-hidden text-center">
            <div className="kt-titlebar px-5 py-2.5">
              <h2
                className={`font-wuxia text-2xl font-bold ${
                  battleResult.victory ? 'text-[#F7DA85]' : 'text-[#FCA5A5]'
                }`}
              >
                {battleResult.title}
              </h2>
            </div>
            <div className="p-6">
              <div className="kt-slot mx-auto mb-3 flex h-12 w-12 items-center justify-center">
                {battleResult.victory ? (
                  <Sparkles className="h-6 w-6 text-[#F5D061]" />
                ) : (
                  <Swords className="h-6 w-6 text-[#F87171]" />
                )}
              </div>
              <p className="text-xs leading-relaxed text-[#E2D3B5]">{battleResult.subtitle}</p>

              <div className="kt-slot mt-4 space-y-2 p-4 text-left font-mono text-xs tabular-nums">
                {battleResult.rewards.exp && (
                  <div className="flex justify-between">
                    <span className="font-sans text-[#B8A582]">Kinh Nghiệm</span>
                    <span className="text-[#4ADE80]">+{formatNumber(battleResult.rewards.exp)} EXP</span>
                  </div>
                )}
                {battleResult.rewards.silver && (
                  <div className="flex justify-between">
                    <span className="font-sans text-[#B8A582]">Bạc</span>
                    <span className="text-[#F5D061]">+{formatNumber(battleResult.rewards.silver)}</span>
                  </div>
                )}
                {battleResult.rewards.goldIngots && (
                  <div className="flex justify-between">
                    <span className="font-sans text-[#B8A582]">Đồng / Nguyên Bảo</span>
                    <span className="text-[#FBBF24]">+{formatNumber(battleResult.rewards.goldIngots)}</span>
                  </div>
                )}
                {battleResult.rewards.enhanceStones && (
                  <div className="flex justify-between">
                    <span className="font-sans text-[#B8A582]">Đá Cường Hóa</span>
                    <span className="text-[#C084FC]">+{battleResult.rewards.enhanceStones}</span>
                  </div>
                )}
                {battleResult.rewards.reputation && (
                  <div className="flex justify-between">
                    <span className="font-sans text-[#B8A582]">Danh Vọng</span>
                    <span className="text-[#38BDF8]">+{battleResult.rewards.reputation}</span>
                  </div>
                )}
                {battleResult.rewards.merit && (
                  <div className="flex justify-between">
                    <span className="font-sans text-[#B8A582]">Công Trạng</span>
                    <span className="text-[#F5D061]">+{battleResult.rewards.merit}</span>
                  </div>
                )}
                {battleResult.rewards.item && (
                  <div className="flex justify-between border-t border-[#4B361D] pt-2">
                    <span className="font-sans text-[#B8A582]">Chiến Lợi Phẩm</span>
                    <span
                      className="font-sans font-semibold"
                      style={{ color: QUALITY_META[battleResult.rewards.item.quality].color }}
                    >
                      [{battleResult.rewards.item.name}]
                    </span>
                  </div>
                )}
                {battleResult.rewards.extraText && (
                  <div className="border-t border-[#4B361D] pt-2 font-sans text-[#FDE68A]">
                    {battleResult.rewards.extraText}
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-center">
                <button
                  onClick={() => {
                    setBattleResult(null);
                    setBattle({ mode: 'WILD' });
                  }}
                  className="kt-btn-crimson flex-1 py-2.5 text-sm font-semibold cursor-pointer"
                >
                  Trở Về Bản Đồ Luyện Công
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TREASURE CHEST OPENING CEREMONY OVERLAY */}
      {openingChestResult && (
        <TreasureChestOverlay
          result={openingChestResult}
          sessionId={chestSessionId}
          player={player}
          onClose={() => setOpeningChestResult(null)}
          onOpenNext={(tier) => handleOpenChestFromStock(tier)}
          onEquipNow={(itemId) => {
            const target = player.inventory.find((x) => x.id === itemId);
            if (target) handleEquipItem(target);
          }}
        />
      )}
    </div>
  );
}
