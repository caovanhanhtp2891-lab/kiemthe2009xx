export type ElementType = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho';

export type SectId =
  | 'thieu_lam'
  | 'thien_vuong'
  | 'duong_mon'
  | 'ngu_doc'
  | 'minh_giao'
  | 'nga_mi'
  | 'thuy_yen'
  | 'doan_thi'
  | 'cai_bang'
  | 'thien_nhan'
  | 'vo_dang'
  | 'con_lon';

export type ItemQuality = 'white' | 'green' | 'blue' | 'purple' | 'gold' | 'mythic';

export type EquipSlot = 'weapon' | 'armor' | 'bracer' | 'ring' | 'jade' | 'boots';

export type GameScreen = 'TITLE_MENU' | 'CHARACTER_CREATE' | 'PLAYING';

export type BattleMode = 'WILD' | 'BOSS' | 'DUNGEON' | 'ARENA' | 'SIEGE' | 'GUILD_WAR';

export type ResourceType = 'ore' | 'herbs' | 'gold_mine' | 'spirit_vein';

export type PkMode = 'peace' | 'slaughter';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'mist' | 'ash_wind';

export type ChestTier = 'iron' | 'purple_gold' | 'imperial_gold';

export type TreasureChestStock = Record<ChestTier, number>;

export interface ChestTierMeta {
  id: ChestTier;
  name: string;
  shortName: string;
  color: string;
  accentColor: string;
  glowColor: string;
  bgClass: string;
  description: string;
  stoneRange: [number, number];
  silverBase: number;
  ingotRange: [number, number];
  guaranteedMinQuality: ItemQuality;
}

export interface ChestOpenResult {
  tier: ChestTier;
  enhanceStones: number;
  silver: number;
  goldIngots: number;
  equipment: EquipmentItem;
  bonusEquipment?: EquipmentItem;
}

export interface WeatherDef {
  id: WeatherType;
  name: string;
  allResistDelta: number; // temporary % shift to allResist
  color: string;
  description: string;
}

export type ChatChannel = 'world' | 'guild' | 'whisper' | 'system';

export type ActiveModal =
  | null
  | 'CHARACTER'
  | 'MAP_BOSS'
  | 'GOOGLE_MAPS'
  | 'DUNGEON_ARENA'
  | 'TITLE_MANTLE'
  | 'SOCIAL_GUILD'
  | 'SIEGE'
  | 'SAGE_STUDIO'
  | 'VFX_SHEETS'
  | 'PAUSE';

export type SkillVfxKind =
  | 'ring'
  | 'slash'
  | 'lotus'
  | 'swords'
  | 'dragon'
  | 'shield'
  | 'blade_arc'
  | 'blade_wave_line'
  | 'lion_roar'
  | 'star_staff_spin'
  | 'vortex_pull'
  | 'spear_charge'
  | 'spear_flurry'
  | 'spear_whirl_shield'
  | 'golden_bell'
  | 'hammer_heavy'
  | 'ground_shatter'
  | 'shadow_blink'
  | 'needle_barrage'
  | 'poison_trap'
  | 'gear_aura'
  | 'knockback_ring'
  | 'venom_palm'
  | 'venom_curse'
  | 'toad_curse'
  | 'dispel_seal'
  | 'soul_drain'
  | 'sacred_fire_rain'
  | 'lotus_heal'
  | 'buddha_aegis'
  | 'four_palms'
  | 'frost_shatter'
  | 'frost_stealth'
  | 'ice_pillars'
  | 'north_shield'
  | 'six_swords'
  | 'finger_seal'
  | 'water_steps'
  | 'dragon_palm'
  | 'staff_sweep'
  | 'staff_array'
  | 'fire_wall'
  | 'fire_lotus_pull'
  | 'meteor_strike'
  | 'crimson_spear_dash'
  | 'sword_converge'
  | 'sword_rain'
  | 'sword_triple'
  | 'thunder_strike'
  | 'thunder_cluster'
  | 'wind_lightning'
  | 'slash_single'
  | 'yin_wind'
  | 'tiger_hammer'
  | 'compact_buff'
  | 'ocean_wave'
  | 'frost_beam'
  | 'ice_needles'
  | 'giant_sword_push'
  | 'spear_tether_pull'
  | 'taiji_domain'
  | 'sword_dash_triple'
  | 'twin_spirit_swords'
  | 'evasion_ring'
  | 'buddha_palm_ult'
  | 'staff_mandala_ult'
  | 'cavalry_spear_ult'
  | 'nine_palace_trap_ult'
  | 'spider_venom_ult'
  | 'sacred_fire_hex_ult'
  | 'lotus_sanctuary_ult'
  | 'glacier_swords_ult'
  | 'six_meridian_ult'
  | 'dragon_storm_ult'
  | 'hellfire_lotus_ult'
  | 'blood_dragon_ult'
  | 'taiji_sword_array_ult'
  | 'thunder_array_ult'
  | 'wind_thunder_vortex_ult'
  | 'cleanse_dash'
  | 'guard_shield_140';

export interface SkillBuffEffect {
  atkPct?: number;
  defPct?: number;
  critBonus?: number;
  dodgeBonus?: number;
  speedPct?: number;
  damageReducePct?: number;
  durationSec: number;
  label: string;
}

export interface SkillDef {
  id: string;
  name: string;
  branch: string;
  keyBind: '1' | '2' | '3' | '4' | '5' | '6';
  unlockLevel: number;
  maxRank?: number;
  cooldown: number; // seconds
  mpCost: number;
  multiplier: number; // % of ATK
  atkPctPerHit?: number;
  flatDmgPerHit?: number;
  dotAtkPct?: number;
  dotDurationSec?: number;
  dotIntervalSec?: number;
  radius: number; // pixels in arena
  range: number; // cast range
  type: 'melee' | 'projectile' | 'aoe' | 'heal' | 'shield' | 'poison' | 'buff';
  vfxKind: SkillVfxKind;
  color: string;
  accentColor: string;
  coreColor?: string;
  darkColor?: string;
  description: string;
  effectText: string;
  hits?: number;
  projectileCount?: number;
  projectileSpeedPx?: number;
  pierce?: boolean;
  stunSec?: number;
  slowSec?: number;
  ccKind?: 'none' | 'stun' | 'root' | 'slow' | 'freeze' | 'fear' | 'silence' | 'knockback' | 'pull';
  ccChancePct?: number;
  pullStrength?: number;
  pushStrength?: number;
  dashToTarget?: boolean;
  cleanseCc?: boolean;
  stealthSec?: number;
  drainRatio?: number;
  movePoisonSec?: number;
  burnSec?: number;
  invulnSec?: number;
  dispel?: boolean;
  buffStat?: SkillBuffEffect;
  shieldMaxHpPct?: number;
  healMaxHpPct?: number;
  healHpowerPct?: number;
  mpRestoreMaxPct?: number;
  castTimeSec?: number;
  maxParticles?: number;
  spriteFrames?: number;
  maxTargetsPve?: number;
  isUltimate150?: boolean;
  isUltimate180?: boolean;
  isSignature125?: boolean;
  vfxMotif?: string;
  catalogCode?: string;
}

export interface PassiveSkillDef {
  id: string;
  name: string;
  unlockLevel: number;
  bonusAtk?: number;
  bonusAtkPct?: number;
  bonusDef?: number;
  bonusDefPct?: number;
  bonusDodge?: number;
  bonusHp?: number;
  bonusCrit?: number;
  description: string;
}

export interface SectDef {
  id: SectId;
  name: string;
  element: ElementType;
  elementName: string;
  role: string;
  weaponType: string;
  branches: [string, string];
  color: string;
  glowColor: string;
  summary: string;
  baseStats: {
    hp: number;
    mp: number;
    atk: number;
    def: number;
    crit: number; // %
    dodge: number; // %
  };
  growthPerLevel: {
    hp: number;
    mp: number;
    atk: number;
    def: number;
  };
  skills: SkillDef[];
  passives: PassiveSkillDef[];
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipSlot;
  quality: ItemQuality;
  levelReq: number;
  enhance: number;
  atk: number;
  def: number;
  hp: number;
  crit: number;
  power: number;
}

export interface MapDef {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  element: ElementType;
  description: string;
  ambientTheme: 'petals' | 'autumn' | 'snow' | 'dust' | 'mist';
  weatherPool: WeatherType[];
  tintColor: string;
  isSafeZone?: boolean;
  mobs: {
    name: string;
    hp: number;
    atk: number;
    def: number;
    exp: number;
    silver: number;
    color: string;
    isElite?: boolean;
  }[];
}

export interface WorldBossDef {
  id: string;
  name: string;
  title: string;
  level: number;
  element: ElementType;
  hp: number;
  atk: number;
  def: number;
  color: string;
  respawnSec: number;
  silverReward: number;
  goldIngotReward: number;
  expReward: number;
  stoneReward: number;
  meritReward: number;
  description: string;
}

export interface DungeonDef {
  id: string;
  name: string;
  subtitle: string;
  unlockLevel: number;
  maxFloors: number;
  element: ElementType;
  basePower: number;
  bossNames: string[];
  description: string;
}

export interface MantleDef {
  id: number;
  name: string;
  color: string;
  glowColor: string;
  requiredWealth: number;
  requiredMerit: number;
  silverCost: number;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  bonusCrit: number;
  auraStyle: string;
}

export interface TitleDef {
  id: string;
  name: string;
  color: string;
  requirementText: string;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  bonusCrit: number;
}

export type MountSpecies =
  | 'horse'
  | 'white_tiger'
  | 'snow_wolf'
  | 'qilin'
  | 'spirit_fox'
  | 'divine_beast';

export interface MountDef {
  id: string;
  tier: number;
  species: MountSpecies;
  name: string;
  subtitle: string;
  quality: ItemQuality;
  color: string;
  accentColor: string;
  levelReq: number;
  silverCost: number;
  ingotCost: number;
  moveSpeedPct: number; // % movement speed bonus
  allResist: number; // % all-element resistance
  bonusHp: number;
  bonusDef: number;
  description: string;
}

export type MountSkinStyle =
  | 'celestial_pegasus'
  | 'white_tiger'
  | 'snow_wolf'
  | 'spirit_fox'
  | 'qilin_flame'
  | 'frost_qilin'
  | 'imperial_dragon_steed';

export interface MountIllusionDef {
  id: string;
  name: string;
  subtitle: string;
  quality: ItemQuality;
  style: MountSkinStyle;
  color: string;
  accentColor: string;
  auraColor: string;
  auraLabel: string;
  unlockSilver: number;
  unlockIngots: number;
  unlockStones: number;
  baseMoveSpeedPct: number;
  baseAllResist: number;
  baseBonusHp: number;
  baseBonusAtk: number;
  description: string;
}

export interface SimulatedMaster {
  id: string;
  name: string;
  sect: SectId;
  level: number;
  power: number;
  rank: number;
  mantleId: number;
  titleName: string;
  guildName: string;
  isFriend?: boolean;
  intimacy?: number;
}

export interface GuildInfo {
  id: string;
  name: string;
  leader: string;
  level: number;
  members: number;
  maxMembers: number;
  contribution: number;
  power: number;
  motto: string;
  buffAtkPct: number;
  buffDefPct: number;
  buffHpPct: number;
}

export interface GuildTechDef {
  id: string;
  name: string;
  statLabel: string;
  description: string;
  maxLevel: number;
  baseContributionCost: number;
  allResistPerLevel?: number; // % Kháng Ngũ Hành mỗi cấp
  critDamagePerLevel?: number; // % Sát Thương Chí Mạng mỗi cấp
  dodgePerLevel?: number; // % Tỉ Lệ Né Tránh mỗi cấp
  atkPerLevel?: number; // Công Kích mỗi cấp
  hpPerLevel?: number; // Sinh Lực mỗi cấp
  defPerLevel?: number; // Phòng Thủ mỗi cấp
  color: string;
  iconKey: 'resist' | 'crit_dmg' | 'dodge' | 'atk' | 'vitality';
}

export interface SiegeCity {
  id: 'bien_kinh' | 'tuong_duong' | 'lam_an';
  name: string;
  defenderGuild: string;
  defenderLeader: string;
  recommendedPower: number;
  gateHp: number;
  pillarHp: number;
  enemyWavePower: number;
  dailySilver: number;
  dailyIngots: number;
  dailyStones: number;
  lastClaimDate: string | null;
  controlledByPlayerGuild: boolean;
}

export interface ResourceTerritory {
  id: string;
  name: string;
  region: string;
  resourceType: ResourceType;
  resourceLabel: string;
  element: ElementType;
  defenderGuildId: string;
  defenderGuildName: string;
  defenderLeader: string;
  recommendedPower: number;
  bannerHp: number;
  enemyWavePower: number;
  claimSilver: number;
  claimIngots: number;
  claimStones: number;
  claimPotions: number;
  bonusLabel: string;
  bonusAtkPct: number;
  bonusDefPct: number;
  bonusAllResist: number;
  lastClaimAt: number | null;
  controlledByPlayerGuild: boolean;
}

export interface ChatMessage {
  id: string;
  channel: ChatChannel;
  sender: string;
  senderId?: string;
  senderSect?: SectId;
  senderMantle?: number;
  content: string;
  timestamp: string;
}

export interface ComputedStats {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  crit: number;
  critDamagePct: number; // % sát thương chí mạng (cơ sở 150%)
  dodge: number;
  moveSpeedPct: number;
  allResist: number;
  damageReducePct: number;
  hpower: number;
  pkPenaltyPct: number;
  power: number;
}

export interface PlayerState {
  name: string;
  sect: SectId;
  branchIndex?: 0 | 1; // Hướng tu luyện chính chọn lúc tạo nhân vật (0: nhánh 1, 1: nhánh 2)
  equippedSkillsByBranch?: Record<string, string[]>; // 6 kỹ năng chủ động gắn phím 1–6 cho từng nhánh
  avatarUrl: string | null;
  level: number;
  exp: number;
  maxExp: number;
  hp: number;
  mp: number;
  silver: number;
  goldIngots: number;
  enhanceStones: number;
  reputation: number; // Danh vọng
  merit: number; // Công trạng
  wealth: number; // Tài phú
  skillLevels: Record<string, number>;
  equipment: Record<EquipSlot, EquipmentItem | null>;
  inventory: EquipmentItem[];
  currentMapId: string;
  mantleId: number;
  unlockedTitles: string[];
  activeTitleId: string;
  dungeonProgress: Record<string, number>; // highest cleared floor
  arenaRank: number;
  arenaWins: number;
  monstersKilled: number;
  bossesKilled: number;
  guildId: string | null;
  guildContribution: number;
  guildTechLevels: Record<string, number>;
  friends: { masterId: string; intimacy: number }[];
  potions: number;
  ownedMounts: string[];
  activeMountId: string | null;
  isMounted: boolean;
  mountIllusions: Record<string, number>; // illusionId -> star level (1..5)
  activeMountIllusionId: string | null;
  pkMode: PkMode;
  pkPoints: number; // Điểm Sát Khí (0..10)
  pkKills: number; // Số cao thủ đã đồ sát
  pkPenaltyUntil: number; // Timestamp (ms) kết thúc suy yếu do chết khi mang sát khí
  pkPenaltyPct: number; // % giảm Công/Thủ/HP khi bị tiêu diệt lúc có sát khí
  pkWashCounter: number; // Số quái đã diệt để rửa 1 điểm sát khí (mỗi 8 quái giảm 1)
  treasureChests: TreasureChestStock; // Kho Rương Báu nhặt được khi luyện công
  chestsOpened: number; // Tổng số Rương Báu đã mở
}

export interface BattleContext {
  mode: BattleMode;
  bossId?: string;
  dungeonId?: string;
  dungeonFloor?: number;
  arenaOpponent?: SimulatedMaster;
  siegeCityId?: SiegeCity['id'];
  guildWarTerritoryId?: string;
}

export interface BattleResultSummary {
  victory: boolean;
  mode: BattleMode;
  title: string;
  subtitle: string;
  rewards: {
    exp?: number;
    silver?: number;
    goldIngots?: number;
    enhanceStones?: number;
    reputation?: number;
    merit?: number;
    item?: EquipmentItem;
    extraText?: string;
  };
}

export interface SavePayload {
  version: number;
  savedAt: number;
  player: PlayerState;
  guilds: GuildInfo[];
  cities: SiegeCity[];
  territories?: ResourceTerritory[];
  masters: SimulatedMaster[];
}
