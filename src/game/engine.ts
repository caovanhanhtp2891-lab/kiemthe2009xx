import {
  CHEST_TIER_META,
  ELEMENT_META,
  EQUIP_NAME_PREFIXES,
  EQUIP_SLOT_NOUNS,
  GUILD_TECHS,
  INITIAL_CITIES,
  INITIAL_GUILDS,
  INITIAL_TERRITORIES,
  MANTLES,
  MOUNTS,
  MOUNT_ILLUSIONS,
  QUALITY_META,
  SECTS,
  SIMULATED_MASTERS,
  TITLES,
} from './data';
import {
  ChestOpenResult,
  ChestTier,
  ComputedStats,
  ElementType,
  EquipSlot,
  EquipmentItem,
  GuildInfo,
  GuildTechDef,
  ItemQuality,
  MountIllusionDef,
  PassiveSkillDef,
  PlayerState,
  ResourceTerritory,
  SavePayload,
  SectId,
  SkillDef,
} from './types';

import {
  CATALOG_BY_ID,
  CATALOG_BY_SECT,
  catalogSkillToSkillDef,
  getBranchActiveSkills,
  getBranchPermanentPassives,
  getDefaultHotbarSkillIds,
  getSkillRankFactor,
} from './fullSkillCatalog';

export function getSkillBranchKey(sectId: SectId, branchIndex: 0 | 1): string {
  return `${sectId}_${branchIndex}`;
}

/**
 * Returns the 6 active hotbar skills (keys 1–6) for the player's currently active branch,
 * sourced from the full 457-skill catalog (Lv.10–180).
 */
export function getOrderedSectSkills(
  sectId: SectId,
  branchIndex: 0 | 1 = 0,
  equippedIds?: string[]
): SkillDef[] {
  const keys: SkillDef['keyBind'][] = ['1', '2', '3', '4', '5', '6'];
  const branchActives = getBranchActiveSkills(sectId, branchIndex);
  const validIds = new Set(branchActives.map((s) => s.id));
  const defaults = getDefaultHotbarSkillIds(sectId, branchIndex);

  const chosenIds: string[] = [];
  if (Array.isArray(equippedIds) && equippedIds.length > 0) {
    for (const id of equippedIds) {
      if (validIds.has(id) && !chosenIds.includes(id)) {
        chosenIds.push(id);
      }
      if (chosenIds.length >= 6) break;
    }
  }
  for (const id of defaults) {
    if (chosenIds.length >= 6) break;
    if (validIds.has(id) && !chosenIds.includes(id)) {
      chosenIds.push(id);
    }
  }

  return chosenIds.slice(0, 6).map((id, idx) => {
    const cat = CATALOG_BY_ID[id] || branchActives[idx] || branchActives[0];
    return catalogSkillToSkillDef(cat, keys[idx] ?? '1');
  });
}

export function getPlayerHotbarSkills(player: PlayerState): SkillDef[] {
  const bIdx: 0 | 1 = player.branchIndex === 1 ? 1 : 0;
  const key = getSkillBranchKey(player.sect, bIdx);
  const equipped = player.equippedSkillsByBranch?.[key];
  return getOrderedSectSkills(player.sect, bIdx, equipped);
}

/**
 * Exact spec damage reduction formula:
 * final = raw * (1000 / (1000 + max(0, DEF))) * (1 - clamp(elemRes, 0, 0.6)) * (1 - clamp(dmgReduce, 0, 0.6))
 */
export function computeSpecFinalDamage(
  rawDmg: number,
  defenderDef: number,
  elemResistPct = 0,
  dmgReducePct = 0
): number {
  const defMult = 1000 / (1000 + Math.max(0, defenderDef));
  const resMult = 1 - Math.max(0, Math.min(0.6, elemResistPct / 100));
  const drMult = 1 - Math.max(0, Math.min(0.6, dmgReducePct / 100));
  return Math.max(1, Math.round(rawDmg * defMult * resMult * drMult));
}

export { getSkillRankFactor };

export const SAVE_KEY = 'vo_lam_kiem_the_save_v1';

export function getElementMultiplier(attacker: ElementType, defender: ElementType): number {
  if (ELEMENT_META[attacker].counters === defender) return 1.22;
  if (ELEMENT_META[attacker].counteredBy === defender) return 0.86;
  return 1.0;
}

export function getExpForLevel(level: number): number {
  return Math.floor(220 * Math.pow(level, 1.48) + level * 110);
}

export function calculateItemPower(item: Omit<EquipmentItem, 'power'>): number {
  const enhFactor = 1 + item.enhance * 0.14;
  return Math.round(
    (item.atk * 4.2 + item.def * 3.4 + item.hp * 0.45 + item.crit * 35) * enhFactor
  );
}

export function getEffectiveItemStats(item: EquipmentItem) {
  const enhFactor = 1 + item.enhance * 0.14;
  return {
    atk: Math.round(item.atk * enhFactor),
    def: Math.round(item.def * enhFactor),
    hp: Math.round(item.hp * enhFactor),
    crit: Number((item.crit + item.enhance * 0.4).toFixed(1)),
    power: calculateItemPower(item),
  };
}

export function generateEquipment(
  level: number,
  forcedQuality?: ItemQuality,
  forcedSlot?: EquipSlot
): EquipmentItem {
  const slots: EquipSlot[] = ['weapon', 'armor', 'bracer', 'ring', 'jade', 'boots'];
  const slot = forcedSlot ?? slots[Math.floor(Math.random() * slots.length)];

  let quality: ItemQuality = forcedQuality ?? 'white';
  if (!forcedQuality) {
    const r = Math.random();
    if (r < 0.012) quality = 'mythic';
    else if (r < 0.055) quality = 'gold';
    else if (r < 0.17) quality = 'purple';
    else if (r < 0.38) quality = 'blue';
    else if (r < 0.69) quality = 'green';
    else quality = 'white';
  }

  const qMult = QUALITY_META[quality].multiplier;
  const lvlScale = 1 + (Math.max(1, level) - 1) * 0.22;

  const baseAtk =
    slot === 'weapon'
      ? 42
      : slot === 'ring'
      ? 28
      : slot === 'bracer'
      ? 20
      : slot === 'jade'
      ? 16
      : 8;
  const baseDef =
    slot === 'armor'
      ? 36
      : slot === 'boots'
      ? 24
      : slot === 'bracer'
      ? 18
      : slot === 'jade'
      ? 16
      : 6;
  const baseHp =
    slot === 'armor'
      ? 360
      : slot === 'jade'
      ? 260
      : slot === 'boots'
      ? 220
      : slot === 'bracer'
      ? 180
      : 110;
  const baseCrit = slot === 'weapon' || slot === 'ring' ? 2.5 : slot === 'jade' ? 1.8 : 0.8;

  const rand = () => 0.9 + Math.random() * 0.24;
  const atk = Math.round(baseAtk * lvlScale * qMult * rand());
  const def = Math.round(baseDef * lvlScale * qMult * rand());
  const hp = Math.round(baseHp * lvlScale * qMult * rand());
  const crit = Number((baseCrit * (0.85 + qMult * 0.35)).toFixed(1));

  const prefixes = EQUIP_NAME_PREFIXES[quality];
  const nouns = EQUIP_SLOT_NOUNS[slot];
  const name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${
    nouns[Math.floor(Math.random() * nouns.length)]
  }`;

  const draft: Omit<EquipmentItem, 'power'> = {
    id: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    slot,
    quality,
    levelReq: Math.max(1, level),
    enhance: 0,
    atk,
    def,
    hp,
    crit,
  };

  return {
    ...draft,
    power: calculateItemPower(draft),
  };
}

export function rollTreasureChestRewards(tier: ChestTier, level: number): ChestOpenResult {
  const meta = CHEST_TIER_META[tier];
  const [minStones, maxStones] = meta.stoneRange;
  const enhanceStones =
    minStones + Math.floor(Math.random() * (maxStones - minStones + 1));

  const lvlMult = 1 + Math.max(0, level - 1) * 0.14;
  const silver = Math.round(meta.silverBase * lvlMult * (0.9 + Math.random() * 0.25));

  const [minIngot, maxIngot] = meta.ingotRange;
  const goldIngots =
    maxIngot > 0 ? minIngot + Math.floor(Math.random() * (maxIngot - minIngot + 1)) : 0;

  const r = Math.random();
  let quality: ItemQuality = meta.guaranteedMinQuality;
  if (tier === 'iron') {
    if (r < 0.08) quality = 'purple';
    else if (r < 0.48) quality = 'blue';
    else quality = 'green';
  } else if (tier === 'purple_gold') {
    if (r < 0.05) quality = 'mythic';
    else if (r < 0.28) quality = 'gold';
    else if (r < 0.8) quality = 'purple';
    else quality = 'blue';
  } else {
    if (r < 0.18) quality = 'mythic';
    else if (r < 0.72) quality = 'gold';
    else quality = 'purple';
  }

  const equipment = generateEquipment(Math.max(1, level), quality);
  let bonusEquipment: EquipmentItem | undefined;
  if (tier === 'imperial_gold' && Math.random() < 0.35) {
    bonusEquipment = generateEquipment(
      Math.max(1, level),
      Math.random() < 0.15 ? 'mythic' : Math.random() < 0.4 ? 'gold' : 'purple'
    );
  }

  return {
    tier,
    enhanceStones,
    silver,
    goldIngots,
    equipment,
    bonusEquipment,
  };
}

export interface CharacterRealmInfo {
  tier: number; // 0..5
  name: string;
  title: string;
  auraColor: string;
  trimColor: string;
  hasCape: boolean;
  hasOrbitWisps: boolean;
}

export function getCharacterRealm(player: PlayerState): CharacterRealmInfo {
  const highQualityCount = Object.values(player.equipment).filter(
    (e) => e && (e.quality === 'gold' || e.quality === 'mythic')
  ).length;
  const maxEnh = Object.values(player.equipment).reduce(
    (acc, e) => (e ? Math.max(acc, e.enhance) : acc),
    0
  );
  const score = player.level + player.mantleId * 6 + highQualityCount * 5 + Math.floor(maxEnh * 1.5);

  if (score >= 90) {
    return {
      tier: 5,
      name: 'Chí Tôn Võ Thánh',
      title: 'Chuyển Sinh · Đỉnh Phong',
      auraColor: '#FB7185',
      trimColor: '#FEF08A',
      hasCape: true,
      hasOrbitWisps: true,
    };
  }
  if (score >= 65) {
    return {
      tier: 4,
      name: 'Hóa Thần Đại Tông Sư',
      title: 'Cảnh Giới Bậc 5',
      auraColor: '#F5D061',
      trimColor: '#FDE047',
      hasCape: true,
      hasOrbitWisps: true,
    };
  }
  if (score >= 42) {
    return {
      tier: 3,
      name: 'Nguyên Anh Kiếm Tôn',
      title: 'Cảnh Giới Bậc 4',
      auraColor: '#C084FC',
      trimColor: '#E9D5FF',
      hasCape: true,
      hasOrbitWisps: true,
    };
  }
  if (score >= 24) {
    return {
      tier: 2,
      name: 'Kim Đan Cao Thủ',
      title: 'Cảnh Giới Bậc 3',
      auraColor: '#38BDF8',
      trimColor: '#F5D061',
      hasCape: true,
      hasOrbitWisps: false,
    };
  }
  if (score >= 10) {
    return {
      tier: 1,
      name: 'Trúc Cơ Hiệp Khách',
      title: 'Cảnh Giới Bậc 2',
      auraColor: '#4ADE80',
      trimColor: '#D6B896',
      hasCape: false,
      hasOrbitWisps: false,
    };
  }
  return {
    tier: 0,
    name: 'Luyện Khí Nhập Môn',
    title: 'Cảnh Giới Bậc 1',
    auraColor: '#94A3B8',
    trimColor: '#A8A29E',
    hasCape: false,
    hasOrbitWisps: false,
  };
}

export function getEnhanceCost(item: EquipmentItem) {
  const next = item.enhance + 1;
  return {
    silver: Math.round(350 * Math.pow(next, 1.45)),
    stones: Math.max(1, Math.ceil(next * 0.9)),
    successRate: Math.max(25, Math.min(100, 102 - next * 6)),
  };
}

export function getIllusionStats(illusion: MountIllusionDef, stars: number) {
  const s = Math.max(1, Math.min(5, stars));
  const scale = 1 + (s - 1) * 0.35;
  return {
    moveSpeedPct: Math.round(illusion.baseMoveSpeedPct + (s - 1) * 3),
    allResist: Math.round(illusion.baseAllResist + (s - 1) * 2.5),
    bonusHp: Math.round(illusion.baseBonusHp * scale),
    bonusAtk: Math.round(illusion.baseBonusAtk * scale),
  };
}

export function getIllusionUpgradeCost(illusion: MountIllusionDef, currentStars: number) {
  if (currentStars <= 0) {
    return {
      silver: illusion.unlockSilver,
      ingots: illusion.unlockIngots,
      stones: illusion.unlockStones,
    };
  }
  const factor = Math.pow(1.45, currentStars);
  return {
    silver: Math.round(illusion.unlockSilver * 0.65 * factor),
    ingots: Math.round(illusion.unlockIngots * 0.55 * currentStars),
    stones: Math.max(4, Math.round(illusion.unlockStones * 0.75 * factor)),
  };
}

export function formatPassiveBonusText(p: PassiveSkillDef): string {
  const parts: string[] = [];
  if (p.bonusAtk) parts.push(`+${p.bonusAtk} Công`);
  if (p.bonusAtkPct) parts.push(`+${p.bonusAtkPct}% Công`);
  if (p.bonusDef) parts.push(`+${p.bonusDef} Thủ`);
  if (p.bonusDefPct) parts.push(`+${p.bonusDefPct}% Thủ`);
  if (p.bonusDodge) parts.push(`+${p.bonusDodge}% Né Tránh`);
  if (p.bonusHp) parts.push(`+${p.bonusHp.toLocaleString('vi-VN')} HP`);
  if (p.bonusCrit) parts.push(`+${p.bonusCrit}% Chí Mạng`);
  return parts.join(' · ');
}

export function getGuildTechUpgradeCost(tech: GuildTechDef, currentLevel: number): number {
  return Math.round(tech.baseContributionCost * Math.pow(1.28, currentLevel));
}

export function computePlayerStats(
  player: PlayerState,
  guilds: GuildInfo[],
  weatherResistDelta = 0,
  territories: ResourceTerritory[] = [],
  nowTs = Date.now()
): ComputedStats {
  const sect = SECTS[player.sect];
  const activeBranch: 0 | 1 = player.branchIndex === 1 ? 1 : 0;
  const lvlOffset = Math.max(0, player.level - 1);

  let maxHp = sect.baseStats.hp + lvlOffset * sect.growthPerLevel.hp;
  let maxMp = sect.baseStats.mp + lvlOffset * sect.growthPerLevel.mp;
  let atk = sect.baseStats.atk + lvlOffset * sect.growthPerLevel.atk;
  let def = sect.baseStats.def + lvlOffset * sect.growthPerLevel.def;
  // Spec base Crit 10%, Crit Damage 150%
  let crit = 10 + Math.max(0, sect.baseStats.crit - 10) * 0.5;
  let critDamagePct = 150;
  let dodge = sect.baseStats.dodge;
  let moveSpeedPct = 0;
  let allResist = 0;
  let damageReducePct = 0;
  let passiveAtkPct = 0;
  let passiveDefPct = 0;
  let passiveHpPct = 0;

  // Active-branch-ONLY permanent passives from the 457-skill catalog (inactive branch passives do NOT apply)
  const branchPassives = getBranchPermanentPassives(player.sect, activeBranch);
  for (const ps of branchPassives) {
    const rank = player.skillLevels[ps.id] || (player.level >= ps.unlockLevel ? 1 : 0);
    if (rank <= 0 || player.level < ps.unlockLevel) continue;
    const scale = getSkillRankFactor(rank, ps.maxRank);
    const pb = ps.passiveBonuses;
    if (!pb) continue;
    if (pb.atkPct) passiveAtkPct += pb.atkPct * scale;
    if (pb.defPct) passiveDefPct += pb.defPct * scale;
    if (pb.hpPct) passiveHpPct += pb.hpPct * scale;
    if (pb.critPct) crit += pb.critPct * scale;
    if (pb.critDmgPct) critDamagePct += pb.critDmgPct * scale;
    if (pb.dodgePct) dodge += pb.dodgePct * scale;
    if (pb.allResistPct) allResist += pb.allResistPct * scale;
    if (pb.moveSpeedPct) moveSpeedPct += pb.moveSpeedPct * scale;
    if (pb.dmgReducePct) damageReducePct += pb.dmgReducePct * scale;
  }

  // Equipment bonuses
  for (const item of Object.values(player.equipment)) {
    if (!item) continue;
    const eff = getEffectiveItemStats(item);
    atk += eff.atk;
    def += eff.def;
    maxHp += eff.hp;
    crit += eff.crit;
  }

  // Mantle bonuses
  const mantle = MANTLES.find((m) => m.id === player.mantleId);
  if (mantle) {
    atk += mantle.bonusAtk;
    def += mantle.bonusDef;
    maxHp += mantle.bonusHp;
    crit += mantle.bonusCrit;
  }

  // Mount (Thú Cưỡi) bonuses when mounted
  if (player.isMounted && player.activeMountId) {
    const mount = MOUNTS.find((m) => m.id === player.activeMountId);
    if (mount) {
      maxHp += mount.bonusHp;
      def += mount.bonusDef;
      moveSpeedPct += mount.moveSpeedPct;
      allResist += mount.allResist;
    }
  }

  // Mount Illusions (Huyễn Hóa Thú Cưỡi)
  if (player.mountIllusions) {
    for (const [illId, stars] of Object.entries(player.mountIllusions)) {
      if (!stars || stars <= 0) continue;
      const ill = MOUNT_ILLUSIONS.find((x) => x.id === illId);
      if (!ill) continue;
      const st = getIllusionStats(ill, stars);
      const activeBoost = player.isMounted && player.activeMountIllusionId === illId ? 1.25 : 1.0;
      maxHp += Math.round(st.bonusHp * activeBoost);
      atk += Math.round(st.bonusAtk * activeBoost);
      moveSpeedPct += Math.round(st.moveSpeedPct * activeBoost);
      allResist += Math.round(st.allResist * activeBoost);
    }
  }

  // Temporary dynamic weather modifier on All-Element Resistance
  allResist = Math.max(0, allResist + weatherResistDelta);

  // All unlocked titles grant permanent passive bonuses
  for (const tid of player.unlockedTitles) {
    const t = TITLES.find((x) => x.id === tid);
    if (t) {
      atk += t.bonusAtk;
      def += t.bonusDef;
      maxHp += t.bonusHp;
      crit += t.bonusCrit;
    }
  }

  // Active branch skill mastery bonus
  const activeBranchIds = new Set(
    (CATALOG_BY_SECT[player.sect] || [])
      .filter((s) => s.branchIndex === activeBranch)
      .map((s) => s.id)
  );
  const totalSkillLvls = Object.entries(player.skillLevels).reduce(
    (sum, [id, lv]) => (activeBranchIds.has(id) ? sum + lv : sum),
    0
  );
  atk += totalSkillLvls * 6;

  // Apply Active-Branch Passive % multipliers
  if (passiveAtkPct > 0) {
    atk = Math.round(atk * (1 + passiveAtkPct / 100));
  }
  if (passiveDefPct > 0) {
    def = Math.round(def * (1 + passiveDefPct / 100));
  }
  if (passiveHpPct > 0) {
    maxHp = Math.round(maxHp * (1 + passiveHpPct / 100));
  }

  // Guild War Controlled Resource Territory Buffs
  let territoryAtkPct = 0;
  let territoryDefPct = 0;
  let territoryResist = 0;
  for (const t of territories) {
    if (t.controlledByPlayerGuild) {
      territoryAtkPct += t.bonusAtkPct;
      territoryDefPct += t.bonusDefPct;
      territoryResist += t.bonusAllResist;
    }
  }
  if (territoryAtkPct > 0) {
    atk = Math.round(atk * (1 + territoryAtkPct / 100));
  }
  if (territoryDefPct > 0) {
    def = Math.round(def * (1 + territoryDefPct / 100));
  }
  allResist = Math.max(0, allResist + territoryResist);

  // Guild buffs
  if (player.guildId) {
    const guild = guilds.find((g) => g.id === player.guildId);
    if (guild) {
      atk = Math.round(atk * (1 + guild.buffAtkPct / 100));
      def = Math.round(def * (1 + guild.buffDefPct / 100));
      maxHp = Math.round(maxHp * (1 + guild.buffHpPct / 100));
    }
  }

  // Guild Tech (Kỹ Năng Bang Hội) permanent attribute bonuses
  if (player.guildTechLevels) {
    for (const tech of GUILD_TECHS) {
      const lvl = player.guildTechLevels[tech.id] || 0;
      if (lvl <= 0) continue;
      if (tech.allResistPerLevel) allResist += tech.allResistPerLevel * lvl;
      if (tech.critDamagePerLevel) critDamagePct += tech.critDamagePerLevel * lvl;
      if (tech.dodgePerLevel) dodge += tech.dodgePerLevel * lvl;
      if (tech.atkPerLevel) atk += tech.atkPerLevel * lvl;
      if (tech.hpPerLevel) maxHp += tech.hpPerLevel * lvl;
      if (tech.defPerLevel) def += tech.defPerLevel * lvl;
    }
  }

  // Sát Khí Phản Phệ: stat reduction penalty when defeated while carrying PK points
  const activePkPenaltyPct =
    player.pkPenaltyUntil && player.pkPenaltyUntil > nowTs && player.pkPenaltyPct > 0
      ? Math.min(40, Math.max(0, player.pkPenaltyPct))
      : 0;
  if (activePkPenaltyPct > 0) {
    const factor = 1 - activePkPenaltyPct / 100;
    atk = Math.max(20, Math.round(atk * factor));
    def = Math.max(10, Math.round(def * factor));
    maxHp = Math.max(200, Math.round(maxHp * factor));
  }

  // Spec hard caps: Crit 60%, Dodge 45%, Element Resist 60%, Damage Reduce 60%, Move Speed 80%
  const clampedCrit = Math.min(60, Number(crit.toFixed(1)));
  const clampedDodge = Math.min(45, Number(dodge.toFixed(1)));
  const clampedResist = Math.min(60, Math.round(allResist));
  const clampedDmgReduce = Math.min(60, Math.round(damageReducePct));
  const clampedSpeed = Math.min(80, Math.round(moveSpeedPct));
  const hpower = Math.round(atk * (player.sect === 'nga_mi' ? 1.15 : 0.95));

  const power = Math.round(
    atk * 4.6 +
      def * 3.5 +
      maxHp * 0.48 +
      clampedCrit * 45 +
      (critDamagePct - 150) * 18 +
      clampedDodge * 32 +
      totalSkillLvls * 55 +
      clampedResist * 42 +
      clampedDmgReduce * 48 +
      clampedSpeed * 12
  );

  return {
    maxHp: Math.round(maxHp),
    maxMp: Math.round(maxMp),
    atk: Math.round(atk),
    def: Math.round(def),
    crit: clampedCrit,
    critDamagePct: Math.round(critDamagePct),
    dodge: clampedDodge,
    moveSpeedPct: clampedSpeed,
    allResist: clampedResist,
    damageReducePct: clampedDmgReduce,
    hpower,
    pkPenaltyPct: activePkPenaltyPct,
    power,
  };
}

export function createInitialPlayer(
  name: string,
  sectId: SectId,
  branchIndex: 0 | 1 = 0,
): PlayerState {
  const sect = SECTS[sectId];
  const starterWeapon = generateEquipment(1, 'green', 'weapon');
  const starterArmor = generateEquipment(1, 'white', 'armor');
  const starterRing = generateEquipment(1, 'green', 'ring');

  const skillLevels: Record<string, number> = {};
  const sectCatalog = CATALOG_BY_SECT[sectId] || [];
  // Unlock the Lv.10 starter active skill of both branches immediately so combat & branch switching work from Lv.1
  for (const sk of sectCatalog) {
    skillLevels[sk.id] = sk.activationType === 'active' && sk.unlockLevel === 10 ? 1 : 0;
  }

  const equippedSkillsByBranch: Record<string, string[]> = {
    [getSkillBranchKey(sectId, 0)]: getDefaultHotbarSkillIds(sectId, 0),
    [getSkillBranchKey(sectId, 1)]: getDefaultHotbarSkillIds(sectId, 1),
  };

  const player: PlayerState = {
    name: name.trim() || 'Lãng Khách Võ Lâm',
    sect: sectId,
    branchIndex,
    equippedSkillsByBranch,
    avatarUrl: null,
    level: 1,
    exp: 0,
    maxExp: getExpForLevel(1),
    hp: sect.baseStats.hp + starterWeapon.hp + starterArmor.hp + starterRing.hp + 150,
    mp: sect.baseStats.mp,
    silver: 2500,
    goldIngots: 100,
    enhanceStones: 8,
    reputation: 100,
    merit: 80,
    wealth: 900,
    skillLevels,
    equipment: {
      weapon: starterWeapon,
      armor: starterArmor,
      bracer: null,
      ring: starterRing,
      jade: null,
      boots: null,
    },
    inventory: [generateEquipment(2, 'blue', 'jade')],
    currentMapId: 'tan_thu_thon',
    mantleId: 0,
    unlockedTitles: ['giang_ho_tan_tu'],
    activeTitleId: 'giang_ho_tan_tu',
    dungeonProgress: {
      tang_kiem: 0,
      bach_ho: 0,
      tieu_dao: 0,
    },
    arenaRank: 17,
    arenaWins: 0,
    monstersKilled: 0,
    bossesKilled: 0,
    guildId: null,
    guildContribution: 0,
    guildTechLevels: {},
    friends: [{ masterId: 'm15', intimacy: 20 }],
    potions: 12,
    ownedMounts: ['tao_hong'],
    activeMountId: 'tao_hong',
    isMounted: true,
    mountIllusions: {},
    activeMountIllusionId: null,
    pkMode: 'peace',
    pkPoints: 0,
    pkKills: 0,
    pkPenaltyUntil: 0,
    pkPenaltyPct: 0,
    pkWashCounter: 0,
    treasureChests: {
      iron: 1,
      purple_gold: 1,
      imperial_gold: 1,
    },
    chestsOpened: 0,
  };

  const stats = computePlayerStats(player, INITIAL_GUILDS);
  player.hp = stats.maxHp;
  player.mp = stats.maxMp;
  return player;
}

export function checkUnlockedTitles(
  player: PlayerState,
  power: number,
  controlsAnyCity: boolean
): { updatedTitles: string[]; newlyUnlocked: string[] } {
  const set = new Set(player.unlockedTitles);
  const newly: string[] = [];

  const grant = (id: string) => {
    if (!set.has(id)) {
      set.add(id);
      newly.push(id);
    }
  };

  grant('giang_ho_tan_tu');
  if (player.monstersKilled >= 25) grant('sat_thu_quai_vat');
  if (player.bossesKilled >= 1) grant('diet_boss_vuong');
  if (player.level >= 20 && power >= 6000) grant('nhat_dai_tong_su');
  if (player.arenaWins >= 3) grant('loi_dai_ba_chu');
  if (player.arenaRank <= 3) grant('doc_co_cau_bai');
  if (controlsAnyCity) grant('thanh_chu');
  if (player.mantleId >= 5) grant('vo_song_kiem_de');

  return { updatedTitles: Array.from(set), newlyUnlocked: newly };
}

export function loadSavedGame(): SavePayload | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavePayload;
    if (!parsed || !parsed.player || !parsed.player.sect || !SECTS[parsed.player.sect]) {
      return null;
    }
    const sectCatalog = CATALOG_BY_SECT[parsed.player.sect] || [];
    const migratedSkills: Record<string, number> = { ...(parsed.player.skillLevels || {}) };
    const playerLvl = typeof parsed.player.level === 'number' ? parsed.player.level : 1;
    for (const sk of sectCatalog) {
      const isStarter = sk.activationType === 'active' && sk.unlockLevel === 10;
      if ((migratedSkills[sk.id] || 0) <= 0 && (isStarter || playerLvl >= sk.unlockLevel)) {
        migratedSkills[sk.id] = 1;
      }
    }
    const key0 = getSkillBranchKey(parsed.player.sect, 0);
    const key1 = getSkillBranchKey(parsed.player.sect, 1);
    const equippedSkillsByBranch: Record<string, string[]> = {
      [key0]: parsed.player.equippedSkillsByBranch?.[key0] || getDefaultHotbarSkillIds(parsed.player.sect, 0),
      [key1]: parsed.player.equippedSkillsByBranch?.[key1] || getDefaultHotbarSkillIds(parsed.player.sect, 1),
    };
    const migratedPlayer: PlayerState = {
      ...parsed.player,
      skillLevels: migratedSkills,
      equippedSkillsByBranch,
      ownedMounts: Array.isArray(parsed.player.ownedMounts) && parsed.player.ownedMounts.length > 0
        ? parsed.player.ownedMounts
        : ['tao_hong'],
      activeMountId:
        parsed.player.activeMountId !== undefined ? parsed.player.activeMountId : 'tao_hong',
      isMounted: parsed.player.isMounted !== undefined ? parsed.player.isMounted : true,
      mountIllusions: parsed.player.mountIllusions ?? {},
      activeMountIllusionId: parsed.player.activeMountIllusionId ?? null,
      guildTechLevels: parsed.player.guildTechLevels ?? {},
      pkMode: parsed.player.pkMode === 'slaughter' ? 'slaughter' : 'peace',
      pkPoints: typeof parsed.player.pkPoints === 'number' ? parsed.player.pkPoints : 0,
      pkKills: typeof parsed.player.pkKills === 'number' ? parsed.player.pkKills : 0,
      pkPenaltyUntil:
        typeof parsed.player.pkPenaltyUntil === 'number' ? parsed.player.pkPenaltyUntil : 0,
      pkPenaltyPct:
        typeof parsed.player.pkPenaltyPct === 'number' ? parsed.player.pkPenaltyPct : 0,
      pkWashCounter:
        typeof parsed.player.pkWashCounter === 'number' ? parsed.player.pkWashCounter : 0,
      treasureChests: parsed.player.treasureChests
        ? {
            iron: parsed.player.treasureChests.iron ?? 0,
            purple_gold: parsed.player.treasureChests.purple_gold ?? 0,
            imperial_gold: parsed.player.treasureChests.imperial_gold ?? 0,
          }
        : {
            iron: 1,
            purple_gold: 1,
            imperial_gold: 1,
          },
      chestsOpened:
        typeof parsed.player.chestsOpened === 'number' ? parsed.player.chestsOpened : 0,
    };
    return {
      version: 1,
      savedAt: parsed.savedAt || Date.now(),
      player: migratedPlayer,
      guilds: parsed.guilds?.length ? parsed.guilds : INITIAL_GUILDS,
      cities: parsed.cities?.length ? parsed.cities : INITIAL_CITIES,
      territories: parsed.territories?.length ? parsed.territories : INITIAL_TERRITORIES,
      masters: parsed.masters?.length ? parsed.masters : SIMULATED_MASTERS,
    };
  } catch {
    return null;
  }
}

export function saveGameToStorage(payload: SavePayload) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota issues silently
  }
}

export function clearSavedGame() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore
  }
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

export function nowTimeLabel(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
