import React from 'react';
import { Skull, Sparkles } from 'lucide-react';
import { CHEST_TIER_META, CHEST_TIER_ORDER } from '../game/data';
import { formatNumber, getPlayerHotbarSkills } from '../game/engine';
import {
  ActiveModal,
  BattleMode,
  ChestTier,
  MountDef,
  MountIllusionDef,
  PlayerState,
  SectDef,
} from '../game/types';
import { CharacterSubTab } from './panels/CharacterModal';
import { SkillIcon } from './SkillIcon';

interface KiemTheBottomBarProps {
  player: PlayerState;
  sect: SectDef;
  battleMode: BattleMode;
  isSafeZone: boolean;
  autoBattle: boolean;
  activeModal: ActiveModal;
  isCharOpen: boolean;
  charSubTab: CharacterSubTab;
  isBagOpen: boolean;
  isSkillsOpen: boolean;
  cooldowns: number[];
  dashCooldown: number;
  expRatio: number;
  aliveBossCount: number;
  activeMount: MountDef | null;
  activeIllusion: MountIllusionDef | null;
  moveSpeedPct: number;
  onToggleAuto: () => void;
  onUsePotion: () => void;
  onBuyPotion: () => void;
  onCastSkill: (index: number) => void;
  onUseDash: () => void;
  onToggleMount: () => void;
  onTogglePkMode: () => void;
  onOpenChest: (tier?: ChestTier) => void;
  onToggleChar: (subTab?: CharacterSubTab) => void;
  onToggleBag: () => void;
  onToggleSkills: () => void;
  onOpenModal: (modal: ActiveModal) => void;
  leftOverlay?: React.ReactNode;
}

type DockIconKind =
  | 'character'
  | 'bag'
  | 'skills'
  | 'enhance'
  | 'dungeon'
  | 'mantle'
  | 'guild'
  | 'siege'
  | 'map'
  | 'system'
  | 'food_bowl'
  | 'mini_mount'
  | 'mini_studio'
  | 'mini_gmaps';

/**
 * Sculpted Kiếm Thế PC 2009 silver-pewter metallic pagoda arch crest
 * framing the raised Left/Right active skill sockets and circular "Nộ" orb.
 */
const CenterArchCrest2009: React.FC = () => (
  <svg
    viewBox="0 0 148 76"
    preserveAspectRatio="none"
    className="pointer-events-none absolute -top-[21px] left-1/2 h-[60px] w-[108px] -translate-x-1/2 sm:-top-[24px] sm:h-[66px] sm:w-[122px]"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="kt_arch_metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#94A4AF" />
        <stop offset="16%" stopColor="#58646D" />
        <stop offset="48%" stopColor="#2E363D" />
        <stop offset="100%" stopColor="#14191D" />
      </linearGradient>
      <linearGradient id="kt_arch_rim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#75848E" />
        <stop offset="25%" stopColor="#DCE8F0" />
        <stop offset="50%" stopColor="#9BAAB5" />
        <stop offset="75%" stopColor="#DCE8F0" />
        <stop offset="100%" stopColor="#75848E" />
      </linearGradient>
      <linearGradient id="kt_arch_well" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1D2328" />
        <stop offset="100%" stopColor="#0C1013" />
      </linearGradient>
    </defs>
    {/* Flared sculpted pagoda wing silhouette */}
    <path
      d="M2,75 L2,46 C6,42 12,34 15,17 C17,8 23,3 33,3 L62,3 C68,3 71,8 74,11 C77,8 80,3 86,3 L115,3 C125,3 131,8 133,17 C136,34 142,42 146,46 L146,75 Z"
      fill="url(#kt_arch_metal)"
      stroke="url(#kt_arch_rim)"
      strokeWidth="2.2"
    />
    {/* Inner dark recessed bevel panel */}
    <path
      d="M11,73 L11,48 C15,44 19,35 21,20 C23,12 27,9 35,9 L61,9 C67,9 71,14 74,17 C77,14 81,9 87,9 L113,9 C121,9 125,12 127,20 C129,35 133,44 137,48 L137,73 Z"
      fill="url(#kt_arch_well)"
      stroke="#5A6872"
      strokeWidth="1"
    />
    {/* Classic Kiếm Thế corner cloud scrollwork filigree */}
    <path
      d="M8,52 C14,50 18,54 16,60 C15,63 11,64 9,62"
      fill="none"
      stroke="#B4C3CD"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M140,52 C134,50 130,54 132,60 C133,63 137,64 139,62"
      fill="none"
      stroke="#B4C3CD"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.7"
    />
    {/* Top center diamond clasp */}
    <polygon
      points="74,2 79,7 74,12 69,7"
      fill="#C9D7E0"
      stroke="#38424A"
      strokeWidth="1"
    />
  </svg>
);

/**
 * Hand-crafted Kiếm Thế PC 2009 richly shaded square toolbar medallions
 * faithfully recreating the classic VNG / Kingsoft 2009 client menu icons
 * (Nhân Vật, Túi Đồ, Kỹ Năng, Cường Hóa, Phó Bản, Phi Phong, Bang Hội,
 * Công Thành, Bản Đồ, Hệ Thống + Bát Hồi Phục).
 */
const DockArt2009: React.FC<{
  kind: DockIconKind;
  size?: number;
  active?: boolean;
  className?: string;
}> = ({ kind, size = 34, active = false, className }) => {
  switch (kind) {
    case 'food_bowl':
      // Classic Kiếm Thế Slot 1: White porcelain bowl brimming with steamed rice/buns
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="kt2009_bowl_bg" cx="50%" cy="45%" r="58%">
              <stop offset="0%" stopColor="#3E3626" />
              <stop offset="100%" stopColor="#0E1114" />
            </radialGradient>
            <linearGradient id="kt2009_bowl_rim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFDF4" />
              <stop offset="65%" stopColor="#DFD8BE" />
              <stop offset="100%" stopColor="#8E866B" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="2" fill="url(#kt2009_bowl_bg)" />
          <ellipse cx="20" cy="23.5" rx="14.5" ry="10.5" fill="url(#kt2009_bowl_rim)" stroke="#706951" strokeWidth="1.2" />
          <ellipse cx="20" cy="20.5" rx="12" ry="7.6" fill="#FFFDF5" stroke="#C4BA9A" strokeWidth="0.8" />
          <circle cx="14.8" cy="19.2" r="3.1" fill="#F5E8B8" stroke="#BEA96E" strokeWidth="0.9" />
          <circle cx="21.5" cy="17.6" r="3.4" fill="#FCF3CF" stroke="#BEA96E" strokeWidth="0.9" />
          <circle cx="25.4" cy="21.2" r="2.9" fill="#EFE0A8" stroke="#BEA96E" strokeWidth="0.9" />
          <circle cx="18.2" cy="22.8" r="2.8" fill="#F9ECC1" stroke="#BEA96E" strokeWidth="0.9" />
          <path d="M15.5 18.2 L17.6 19.6 M23 18.8 L21.4 20.6" stroke="#4D8A47" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M12.5 29 Q20 34 27.5 29" fill="none" stroke="#6B634E" strokeWidth="1.3" />
          <rect x="1.5" y="1.5" width="37" height="37" rx="1.5" fill="none" stroke="#9AA8B2" strokeOpacity="0.4" strokeWidth="1" />
        </svg>
      );

    case 'character':
      // Classic Kiếm Thế Right Icon 1: Martial Hero Bust (F1 — Nhân Vật)
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="kt_ic_char_bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#263A48" />
              <stop offset="100%" stopColor="#101920" />
            </linearGradient>
            <linearGradient id="kt_ic_char_robe" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="60%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="2" fill="url(#kt_ic_char_bg)" />
          <path d="M8 37 C9 26.5 13.5 23 20 23 C26.5 23 31 26.5 32 37 Z" fill="url(#kt_ic_char_robe)" stroke="#93C5FD" strokeWidth="1.1" />
          <path d="M15.5 23.5 L20 33 L24.5 23.5" fill="none" stroke="#F5D061" strokeWidth="1.6" />
          <path d="M16.5 24 L20 30.5 L23.5 24" fill="#DC2626" opacity="0.85" />
          <circle cx="20" cy="14.8" r="6.4" fill="#F5CFA8" stroke="#80502D" strokeWidth="1" />
          <path d="M12.8 14 C12.5 7 27.5 7 27.2 14 C25 10.6 15 10.6 12.8 14 Z" fill="#18202B" />
          <rect x="16" y="6.5" width="8" height="3.2" rx="1" fill="#F5D061" stroke="#78350F" strokeWidth="0.9" />
          <circle cx="20" cy="8.1" r="1" fill="#EF4444" />
          <circle cx="17.8" cy="14.8" r="0.95" fill="#181512" />
          <circle cx="22.2" cy="14.8" r="0.95" fill="#181512" />
          <rect x="1.5" y="1.5" width="37" height="37" rx="1.5" fill="none" stroke="#A7BAC6" strokeOpacity="0.45" strokeWidth="1" />
        </svg>
      );

    case 'bag':
      // Classic Kiếm Thế Right Icon 2: Drawstring Cloth Satchel Pouch (F2 — Túi Đồ)
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="kt_ic_bag_bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2D343A" />
              <stop offset="100%" stopColor="#121619" />
            </linearGradient>
            <radialGradient id="kt_ic_bag_body" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#E6C394" />
              <stop offset="55%" stopColor="#B88754" />
              <stop offset="100%" stopColor="#6E4A26" />
            </radialGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="2" fill="url(#kt_ic_bag_bg)" />
          {/* Bag gathered neck */}
          <path d="M14 8.5 L26 8.5 L23.5 14.2 L16.5 14.2 Z" fill="#CFA26E" stroke="#6B4724" strokeWidth="1.1" />
          <line x1="18" y1="9" x2="18.8" y2="14" stroke="#7A5229" strokeWidth="0.9" />
          <line x1="22" y1="9" x2="21.2" y2="14" stroke="#7A5229" strokeWidth="0.9" />
          {/* Plump pouch body */}
          <path
            d="M16 14 C9.5 18 8.5 29.5 14 33.5 C17.5 35.5 22.5 35.5 26 33.5 C31.5 29.5 30.5 18 24 14 Z"
            fill="url(#kt_ic_bag_body)"
            stroke="#F5DFB8"
            strokeWidth="1.15"
          />
          {/* Crimson silk drawstring cord + gold clasp */}
          <path d="M14.2 14.8 Q20 17.8 25.8 14.8" fill="none" stroke="#DC2626" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M20 16.5 L17.5 21.5 M20 16.5 L22.5 21.5" stroke="#B91C1C" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="20" cy="16.4" r="2" fill="#FDE047" stroke="#854D0E" strokeWidth="0.8" />
          <path d="M14.5 25 Q20 28.5 25.5 25" fill="none" stroke="#5C3A1B" strokeWidth="1.1" opacity="0.6" />
          <rect x="1.5" y="1.5" width="37" height="37" rx="1.5" fill="none" stroke="#A7BAC6" strokeOpacity="0.45" strokeWidth="1" />
        </svg>
      );

    case 'skills':
      // Classic Kiếm Thế Right Icon 3: Upright Jade-Steel Sword (F3 — Kỹ Năng)
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
          <defs>
            <radialGradient id="kt_ic_sk_bg" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#1D4454" />
              <stop offset="100%" stopColor="#0C171E" />
            </radialGradient>
            <linearGradient id="kt_ic_blade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#94D2F2" />
              <stop offset="50%" stopColor="#F8FDFF" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="2" fill="url(#kt_ic_sk_bg)" />
          <ellipse cx="20" cy="18" rx="11" ry="13" fill="#38BDF8" fillOpacity="0.18" />
          <polygon points="20,4.5 23.2,10.5 22.2,26 17.8,26 16.8,10.5" fill="url(#kt_ic_blade)" stroke="#0284C7" strokeWidth="0.9" />
          <line x1="20" y1="6.5" x2="20" y2="25" stroke="#FFFFFF" strokeWidth="1" opacity="0.85" />
          <path d="M12.5 25.8 L27.5 25.8 L25.2 29.2 L14.8 29.2 Z" fill="#F5D061" stroke="#78350F" strokeWidth="1" />
          <rect x="18.3" y="29.2" width="3.4" height="5.6" rx="0.8" fill="#991B1B" stroke="#F5D061" strokeWidth="0.6" />
          <circle cx="20" cy="35.6" r="2.1" fill="#FDE047" stroke="#78350F" strokeWidth="0.8" />
          <rect x="1.5" y="1.5" width="37" height="37" rx="1.5" fill="none" stroke="#A7BAC6" strokeOpacity="0.45" strokeWidth="1" />
        </svg>
      );

    case 'enhance':
      // Classic Kiếm Thế Right Icon 4: Imperial Scroll & Huyền Tinh Crystal (Cường Hóa)
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="kt_ic_enh_bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2F2925" />
              <stop offset="100%" stopColor="#141210" />
            </linearGradient>
            <radialGradient id="kt_ic_xt" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#F5D0FE" />
              <stop offset="55%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#581C87" />
            </radialGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="2" fill="url(#kt_ic_enh_bg)" />
          <rect x="9.5" y="9" width="21" height="22.5" rx="1.5" fill="#E6D2A5" stroke="#8A6A38" strokeWidth="1.2" />
          <rect x="7.5" y="7" width="25" height="3.8" rx="1.6" fill="#A07539" stroke="#FDE68A" strokeWidth="0.6" />
          <rect x="7.5" y="29.8" width="25" height="3.8" rx="1.6" fill="#A07539" stroke="#FDE68A" strokeWidth="0.6" />
          <path d="M13.5 15 H25.5 M13.5 19.2 H23 M13.5 23.4 H20" stroke="#5A3F1B" strokeWidth="1.4" strokeLinecap="round" />
          {/* Glowing Huyền Tinh orb */}
          <circle cx="26.5" cy="25.5" r="5.2" fill="url(#kt_ic_xt)" stroke="#FEF08A" strokeWidth="1.1" />
          <circle cx="24.8" cy="23.8" r="1.4" fill="#FFFFFF" opacity="0.85" />
          <rect x="1.5" y="1.5" width="37" height="37" rx="1.5" fill="none" stroke="#A7BAC6" strokeOpacity="0.45" strokeWidth="1" />
        </svg>
      );

    case 'dungeon':
      // Classic Kiếm Thế Right Icon 5: Crossed Twin Blades / Lôi Đài (F4 — Phó Bản)
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
          <defs>
            <radialGradient id="kt_ic_dng_bg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#3F1E22" />
              <stop offset="100%" stopColor="#140D0E" />
            </radialGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="2" fill="url(#kt_ic_dng_bg)" />
          <circle cx="20" cy="20" r="11.5" fill="none" stroke="#F5D061" strokeOpacity="0.3" strokeWidth="1.2" />
          <line x1="9.5" y1="30.5" x2="30.5" y2="9.5" stroke="#F1F5F9" strokeWidth="3.1" strokeLinecap="round" />
          <line x1="30.5" y1="30.5" x2="9.5" y2="9.5" stroke="#CBD5E1" strokeWidth="3.1" strokeLinecap="round" />
          <line x1="11.5" y1="24" x2="16" y2="28.5" stroke="#F5D061" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="28.5" y1="24" x2="24" y2="28.5" stroke="#F5D061" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="20" cy="20" r="3.4" fill="#DC2626" stroke="#FDE047" strokeWidth="1.1" />
          <rect x="1.5" y="1.5" width="37" height="37" rx="1.5" fill="none" stroke="#A7BAC6" strokeOpacity="0.45" strokeWidth="1" />
        </svg>
      );

    case 'mantle':
      // Classic Kiếm Thế Right Icon 6: Crimson Imperial Pennant Banner (F5 — Phi Phong)
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="kt_ic_mnt_bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#351C20" />
              <stop offset="100%" stopColor="#140D0E" />
            </linearGradient>
            <linearGradient id="kt_ic_mnt_flag" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#7F1D1D" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="2" fill="url(#kt_ic_mnt_bg)" />
          <line x1="9" y1="8" x2="31" y2="8" stroke="#F5D061" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M11 8.5 L29 8.5 L27 25.5 L20 34.5 L13 25.5 Z" fill="url(#kt_ic_mnt_flag)" stroke="#F5D061" strokeWidth="1.4" />
          <path d="M15 13 L25 13 L20 26.5 Z" fill="#FDE047" fillOpacity="0.28" stroke="#FEF08A" strokeWidth="1" />
          <circle cx="20" cy="17.5" r="2.3" fill="#FEF08A" />
          <rect x="1.5" y="1.5" width="37" height="37" rx="1.5" fill="none" stroke="#A7BAC6" strokeOpacity="0.45" strokeWidth="1" />
        </svg>
      );

    case 'guild':
      // Classic Kiếm Thế Right Icon 7: Brotherhood Guild Crest (F6 — Bang Hội)
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="kt_ic_gld_bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D362D" />
              <stop offset="100%" stopColor="#0D1814" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="2" fill="url(#kt_ic_gld_bg)" />
          {/* Left hero */}
          <circle cx="14.5" cy="14.5" r="4.5" fill="#F7D59B" stroke="#78350F" strokeWidth="0.9" />
          <path d="M10.5 13 C11 9.5 18 9.5 18.5 13 Z" fill="#1E293B" />
          <path d="M7 33 C7.5 24.5 10.5 21.5 14.5 21.5 C18.5 21.5 21.5 24.5 22 33 Z" fill="#15803D" stroke="#86EFAC" strokeWidth="1.1" />
          {/* Right hero */}
          <circle cx="25.5" cy="16" r="4.1" fill="#FDE4B8" stroke="#78350F" strokeWidth="0.9" />
          <path d="M21.8 14.5 C22.2 11.2 28.8 11.2 29.2 14.5 Z" fill="#1E293B" />
          <path d="M18.5 33.5 C19 26.5 22 23.2 25.5 23.2 C29 23.2 32 26.5 32.5 33.5 Z" fill="#2563EB" stroke="#93C5FD" strokeWidth="1.1" />
          {/* Golden brotherhood spark */}
          <polygon points="20,6.5 21.6,9.5 20,12.5 18.4,9.5" fill="#FDE047" />
          <rect x="1.5" y="1.5" width="37" height="37" rx="1.5" fill="none" stroke="#A7BAC6" strokeOpacity="0.45" strokeWidth="1" />
        </svg>
      );

    case 'siege':
      // Classic Kiếm Thế Right Icon 8: Fortified Imperial Citadel Gate (F7 — Công Thành)
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="kt_ic_sg_bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#312922" />
              <stop offset="100%" stopColor="#14110E" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="2" fill="url(#kt_ic_sg_bg)" />
          <path d="M6 17.5 L20 7.5 L34 17.5 Z" fill="#B91C1C" stroke="#F5D061" strokeWidth="1.2" />
          <rect x="10" y="17.5" width="20" height="16.5" fill="#475569" stroke="#CBD5E1" strokeWidth="1.1" />
          <path d="M15.5 34 L15.5 24 C15.5 21 24.5 21 24.5 24 L24.5 34 Z" fill="#1A120C" stroke="#F5D061" strokeWidth="1.2" />
          <line x1="20" y1="22" x2="20" y2="34" stroke="#78350F" strokeWidth="1" />
          <line x1="20" y1="4.5" x2="20" y2="8.5" stroke="#FDE047" strokeWidth="1.6" />
          <rect x="1.5" y="1.5" width="37" height="37" rx="1.5" fill="none" stroke="#A7BAC6" strokeOpacity="0.45" strokeWidth="1" />
        </svg>
      );

    case 'map':
      // Classic Kiếm Thế Right Icon 9: Antique Jade Gourd & Map Seal (M — Bản Đồ & Boss)
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="kt_ic_map_bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E332B" />
              <stop offset="100%" stopColor="#0E1814" />
            </linearGradient>
            <radialGradient id="kt_ic_gourd" cx="35%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#EFE3B8" />
              <stop offset="55%" stopColor="#B39E67" />
              <stop offset="100%" stopColor="#6B5B34" />
            </radialGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="2" fill="url(#kt_ic_map_bg)" />
          <rect x="17.8" y="5.8" width="4.4" height="3.8" rx="1" fill="#D97706" stroke="#FEF08A" strokeWidth="0.7" />
          <circle cx="20" cy="14" r="5.2" fill="url(#kt_ic_gourd)" stroke="#F3E6BE" strokeWidth="1.1" />
          <circle cx="20" cy="26.2" r="8.2" fill="url(#kt_ic_gourd)" stroke="#F3E6BE" strokeWidth="1.2" />
          <path d="M15.6 19.3 Q20 21.8 24.4 19.3" fill="none" stroke="#DC2626" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="17.2" cy="24.5" r="2" fill="#FFFBEB" opacity="0.45" />
          <rect x="1.5" y="1.5" width="37" height="37" rx="1.5" fill="none" stroke="#A7BAC6" strokeOpacity="0.45" strokeWidth="1" />
        </svg>
      );

    case 'system':
      // Classic Kiếm Thế Right Icon 10: 3D Metallic Steel Gear (Esc — Hệ Thống)
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="kt_ic_sys_bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2A333B" />
              <stop offset="100%" stopColor="#11161A" />
            </linearGradient>
            <linearGradient id="kt_ic_gear" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="55%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="2" fill="url(#kt_ic_sys_bg)" />
          <circle cx="20" cy="20" r="10.2" fill="none" stroke="url(#kt_ic_gear)" strokeWidth="4.6" strokeDasharray="4.2 3.1" />
          <circle cx="20" cy="20" r="7.2" fill="#334155" stroke="#E2E8F0" strokeWidth="1.4" />
          <circle cx="20" cy="20" r="3.2" fill="#0F172A" stroke="#CBD5E1" strokeWidth="1.2" />
          <rect x="1.5" y="1.5" width="37" height="37" rx="1.5" fill="none" stroke="#A7BAC6" strokeOpacity="0.45" strokeWidth="1" />
        </svg>
      );

    case 'mini_mount':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className} aria-hidden="true">
          <rect x="1" y="1" width="26" height="26" rx="2" fill={active ? '#163425' : '#1A1F24'} />
          <path
            d="M8 22 L10 14 L8 11 L12 7 L16 6 L21 9 L19 13 L16 13 L17 17 L20 22 Z"
            fill={active ? '#4ADE80' : '#D4AF37'}
            stroke="#FEF08A"
            strokeWidth="1"
          />
        </svg>
      );

    case 'mini_studio':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className} aria-hidden="true">
          <rect x="1" y="1" width="26" height="26" rx="2" fill="#1C1A24" />
          <rect x="6" y="6" width="16" height="16" rx="1.5" fill="#2E233D" stroke="#E5C168" strokeWidth="1.2" />
          <path d="M9 18 L13 12 L16 15 L19 11 L21 18 Z" fill="#C084FC" />
          <circle cx="11" cy="10" r="1.5" fill="#FEF08A" />
        </svg>
      );

    case 'mini_gmaps':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" className={className} aria-hidden="true">
          <rect x="1" y="1" width="26" height="26" rx="2" fill="#162229" />
          <path
            d="M14 6 C10.5 6 8 8.5 8 11.8 C8 16 14 22 14 22 C14 22 20 16 20 11.8 C20 8.5 17.5 6 14 6 Z"
            fill="#EF4444"
            stroke="#FEF08A"
            strokeWidth="1.2"
          />
          <circle cx="14" cy="11.5" r="2.2" fill="#FEF3C7" />
        </svg>
      );
  }
};

export const KiemTheBottomBar: React.FC<KiemTheBottomBarProps> = ({
  player,
  sect,
  battleMode,
  isSafeZone,
  autoBattle,
  activeModal,
  isCharOpen,
  charSubTab,
  isBagOpen,
  isSkillsOpen,
  cooldowns,
  dashCooldown,
  expRatio,
  aliveBossCount,
  activeMount,
  activeIllusion,
  moveSpeedPct,
  onToggleAuto,
  onUsePotion,
  onBuyPotion,
  onCastSkill,
  onUseDash,
  onToggleMount,
  onTogglePkMode,
  onOpenChest,
  onToggleChar,
  onToggleBag,
  onToggleSkills,
  onOpenModal,
  leftOverlay,
}) => {
  const totalChests =
    (player.treasureChests.imperial_gold || 0) +
    (player.treasureChests.purple_gold || 0) +
    (player.treasureChests.iron || 0);
  const bestChestTier =
    CHEST_TIER_ORDER.find((t) => (player.treasureChests[t] || 0) > 0) || 'imperial_gold';
  const bestChestMeta = CHEST_TIER_META[bestChestTier];

  const hotbarSkills = getPlayerHotbarSkills(player);
  const leftSkill = hotbarSkills[0] || sect.skills[0];

  // Highest unlocked active skill on hotbar for Right-Click slot
  let rightClickSkillIdx = 0;
  for (let i = hotbarSkills.length - 1; i >= 1; i--) {
    if ((player.skillLevels[hotbarSkills[i].id] || 0) > 0) {
      rightClickSkillIdx = i;
      break;
    }
  }
  const rightSkill = hotbarSkills[rightClickSkillIdx] || leftSkill;

  const rightMenuButtons: {
    key: string;
    label: string;
    fkey: string;
    art: DockIconKind;
    isActive: boolean;
    badge?: number;
    onClick: () => void;
  }[] = [
    {
      key: 'char',
      label: 'Nhân Vật',
      fkey: 'F1',
      art: 'character',
      isActive: isCharOpen && charSubTab === 'equip',
      onClick: () => onToggleChar('equip'),
    },
    {
      key: 'bag',
      label: 'Hành Nang',
      fkey: 'F2',
      art: 'bag',
      isActive: isBagOpen,
      badge: player.inventory.length > 0 ? player.inventory.length : undefined,
      onClick: onToggleBag,
    },
    {
      key: 'skills',
      label: 'Kỹ Năng',
      fkey: 'F3',
      art: 'skills',
      isActive: isSkillsOpen,
      onClick: onToggleSkills,
    },
    {
      key: 'enhance',
      label: 'Cường Hóa',
      fkey: 'CH',
      art: 'enhance',
      isActive: isCharOpen && charSubTab === 'enhance',
      onClick: () => onToggleChar('enhance'),
    },
    {
      key: 'dungeon',
      label: 'Phó Bản',
      fkey: 'F4',
      art: 'dungeon',
      isActive: activeModal === 'DUNGEON_ARENA',
      onClick: () => onOpenModal('DUNGEON_ARENA'),
    },
    {
      key: 'mantle',
      label: 'Phi Phong',
      fkey: 'F5',
      art: 'mantle',
      isActive: activeModal === 'TITLE_MANTLE',
      onClick: () => onOpenModal('TITLE_MANTLE'),
    },
    {
      key: 'guild',
      label: 'Bang Hội',
      fkey: 'F6',
      art: 'guild',
      isActive: activeModal === 'SOCIAL_GUILD',
      onClick: () => onOpenModal('SOCIAL_GUILD'),
    },
    {
      key: 'siege',
      label: 'Công Thành',
      fkey: 'F7',
      art: 'siege',
      isActive: activeModal === 'SIEGE',
      onClick: () => onOpenModal('SIEGE'),
    },
    {
      key: 'map',
      label: 'Bản Đồ',
      fkey: 'M',
      art: 'map',
      isActive: activeModal === 'MAP_BOSS',
      badge: aliveBossCount > 0 ? aliveBossCount : undefined,
      onClick: () => onOpenModal('MAP_BOSS'),
    },
    {
      key: 'system',
      label: 'Hệ Thống',
      fkey: 'Esc',
      art: 'system',
      isActive: activeModal === 'PAUSE',
      onClick: () => onOpenModal('PAUSE'),
    },
  ];

  return (
    <div className="pointer-events-none relative mt-auto w-full select-none">
      {/* ================= UPPER FLUSH ROW: CHAT DOCK (LEFT) | ARCH CLEARANCE | MINI STRIP + LUYỆN CÔNG (RIGHT) ================= */}
      <div className="mb-0.5 flex items-end justify-between gap-2 px-1.5">
        {/* Left: ChatDock seated flush right above the 10-slot quickbar */}
        <div className="hidden sm:block">{leftOverlay}</div>

        {/* Right: Chest chips + Currency + 3 Mini Carved Buttons + Flush [Luyện công] Toggle Switch */}
        <div className="ml-auto flex flex-col items-end gap-1">
          {battleMode === 'WILD' && totalChests > 0 && (
            <div className="pointer-events-auto hidden items-center gap-1 lg:flex">
              {CHEST_TIER_ORDER.map((tier) => {
                const count = player.treasureChests[tier] || 0;
                if (count <= 0) return null;
                const meta = CHEST_TIER_META[tier];
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => onOpenChest(tier)}
                    className="kt-hud-box flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9.5px] font-bold transition-transform hover:scale-105 cursor-pointer tabular-nums whitespace-nowrap"
                    style={{ borderColor: meta.color, color: meta.color }}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>{meta.shortName}</span>
                    <span className="text-[#FEF3C7]">x{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-end gap-1">
            {/* Compact Currency Purse */}
            <div className="pointer-events-auto kt-ink-panel hidden items-center gap-1.5 px-1.5 py-0.5 font-mono text-[8.5px] tabular-nums whitespace-nowrap xl:flex">
              <span className="text-[#C7D2D9]">
                Bạc: <strong className="text-[#F5D061]">{formatNumber(player.silver)}</strong>
              </span>
              <span className="text-[#56636B]" aria-hidden="true">·</span>
              <span className="text-[#C7D2D9]">
                Đồng: <strong className="text-[#FBBF24]">{formatNumber(player.goldIngots)}</strong>
              </span>
              <span className="text-[#56636B]" aria-hidden="true">·</span>
              <span className="text-[#C7D2D9]">
                Đá CH: <strong className="text-[#C084FC]">{formatNumber(player.enhanceStones)}</strong>
              </span>
            </div>

            {/* Classic 3 Mini Carved Utility Buttons + Flush [Luyện công] Toggle Switch */}
            <div className="pointer-events-auto flex items-center gap-1">
              <div className="kt2009-mini-strip flex items-center gap-0.5 p-0.5">
                <button
                  type="button"
                  onClick={onToggleMount}
                  disabled={!activeMount}
                  title={
                    activeMount
                      ? `${player.isMounted ? 'Xuống Ngựa' : 'Lên Ngựa'}: ${
                          activeIllusion ? activeIllusion.name : activeMount.name
                        } (+${moveSpeedPct}% Tốc · Phím R)`
                      : 'Chưa có Thú Cưỡi'
                  }
                  className={`kt2009-mini-btn flex h-5 w-5 items-center justify-center cursor-pointer disabled:opacity-45 ${
                    player.isMounted ? 'border-[#6FD199]' : ''
                  }`}
                >
                  <DockArt2009 kind="mini_mount" size={16} active={player.isMounted} />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenModal('SAGE_STUDIO')}
                  title="Họa Các · Vẽ Chân Dung Hiệp Khách (F8)"
                  className="kt2009-mini-btn flex h-5 w-5 items-center justify-center cursor-pointer"
                >
                  <DockArt2009 kind="mini_studio" size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenModal('GOOGLE_MAPS')}
                  title="Địa Đồ Giang Hồ (Google Maps)"
                  className="kt2009-mini-btn flex h-5 w-5 items-center justify-center cursor-pointer"
                >
                  <DockArt2009 kind="mini_gmaps" size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={onTogglePkMode}
                title={
                  isSafeZone
                    ? 'Khu An Toàn trong thành — ra bản đồ ngoài thành để bật Đồ Sát (P)'
                    : 'Nhấn chuyển chế độ Luyện Công / Đồ Sát (Phím P)'
                }
                className={`kt2009-pk-switch flex h-6 items-center gap-1 px-1.5 text-[9.5px] font-semibold cursor-pointer whitespace-nowrap ${
                  isSafeZone
                    ? 'border-[#64B887] text-[#B9F6CA]'
                    : player.pkMode === 'slaughter'
                    ? 'border-[#F87171] bg-[#3B1012] text-[#FECACA] shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                    : 'text-[#E3ECE8]'
                }`}
              >
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-[#6E7C84] bg-[#121619]">
                  <Skull
                    className={`h-2.5 w-2.5 ${
                      player.pkMode === 'slaughter' && !isSafeZone
                        ? 'text-[#EF4444]'
                        : 'text-[#86EFAC]'
                    }`}
                  />
                </span>
                <span>
                  {isSafeZone
                    ? 'An toàn'
                    : player.pkMode === 'slaughter'
                    ? 'Đồ sát'
                    : 'Luyện công'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= AUTHENTIC KIẾM THẾ PC 2009 FULL-WIDTH SCULPTED BOTTOM BAR ================= */}
      <div className="pointer-events-auto kt2009-bar relative grid h-[38px] w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-1 sm:h-[42px] sm:px-2">
        {/* Top Hairline 10-Segment EXP Track embedded along the top rim */}
        <div
          className="pointer-events-none absolute top-0 right-0 left-0 h-[2.5px] bg-[#07090B]"
          title={`Kinh Nghiệm: ${(expRatio * 100).toFixed(2)}%`}
        >
          <div
            className="kt-bar-exp h-full origin-left transition-transform duration-150"
            style={{ transform: `scaleX(${expRatio})` }}
          />
          <div className="absolute inset-0 grid grid-cols-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={i < 9 ? 'border-r border-[#93A3AD]/60' : ''} />
            ))}
          </div>
        </div>

        {/* ====================================================================
            LEFT HALF: SEAMLESS 10-SLOT HORIZONTAL QUICKBAR (1 2 3 4 5 6 7 8 9 0)
           ==================================================================== */}
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <div className="kt2009-wing-cap hidden h-[28px] flex-1 max-w-[96px] items-center justify-between rounded-sm px-2 2xl:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9AA9B3] shadow-inner" />
            <span className="h-[1px] flex-1 mx-1.5 bg-[#6E7D87]/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#9AA9B3] shadow-inner" />
          </div>

          <div className="kt2009-slot-strip grid h-[30px] w-full max-w-[348px] min-w-0 grid-cols-10 items-stretch overflow-hidden sm:h-[34px]">
            {/* Slot 1: Bát Hồi Phục / Auto Luyện Công (K) */}
            <button
              type="button"
              onClick={onToggleAuto}
              title={`Bát Hồi Phục / Tự Động Luyện Công: ${autoBattle ? 'Đang Bật' : 'Đang Tắt'} (Phím K)`}
              className={`kt2009-slot group relative flex min-w-0 items-center justify-center p-[2px] cursor-pointer ${
                autoBattle ? 'ring-1 ring-inset ring-[#F5D061]/75' : ''
              }`}
            >
              <DockArt2009 kind="food_bowl" size={34} className="h-full w-full max-h-[34px] max-w-[34px]" />
              <span className="kt2009-hotkey">K</span>
              <span
                className={`absolute right-0.5 bottom-0 font-mono text-[7.5px] font-bold leading-none ${
                  autoBattle ? 'text-[#4ADE80]' : 'text-[#94A3B8]'
                }`}
              >
                {autoBattle ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Slot 2: Red Kim Sang Dược Vial (Q — auto-buys +5 for 400 Bạc when empty) */}
            <button
              type="button"
              onClick={player.potions > 0 ? onUsePotion : onBuyPotion}
              title={
                player.potions > 0
                  ? 'Kim Sang Dược hồi 45% Sinh Lực (Phím Q)'
                  : 'Hết thuốc · Nhấn mua tiếp tế +5 Kim Sang Dược (400 Bạc)'
              }
              className="kt2009-slot relative flex min-w-0 items-center justify-center p-[2px] cursor-pointer"
            >
              <SkillIcon
                skillType={player.potions > 0 ? 'potion_hp' : 'potion_mp'}
                size={34}
                className="h-full w-full max-h-[34px] max-w-[34px]"
              />
              <span className="kt2009-hotkey">Q</span>
              <span className="kt2009-count">{player.potions > 0 ? player.potions : '+5'}</span>
            </button>

            {/* Slots 3–8: 6 Equipped Active-Branch Skills (Lv.10–180, customizable in F3 Kỹ Năng) */}
            {hotbarSkills.map((sk, idx) => {
              const lvl = player.skillLevels[sk.id] || 0;
              const maxRank = sk.maxRank || 20;
              const locked = lvl <= 0;
              const cd = cooldowns[idx] || 0;
              const onCd = cd > 0 && !locked;
              return (
                <button
                  key={sk.id}
                  type="button"
                  onClick={() => onCastSkill(idx)}
                  disabled={locked}
                  title={`[${sk.keyBind}] ${sk.name} (${sk.branch} · Hạng ${lvl}/${maxRank} · Lv.${sk.unlockLevel}) · ${sk.effectText}`}
                  className={`kt2009-slot relative flex min-w-0 items-center justify-center p-[2px] cursor-pointer ${
                    locked ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <SkillIcon
                    sectId={player.sect}
                    skillType={sk.type}
                    vfxKind={sk.vfxKind}
                    skillIndex={idx}
                    color={sk.color}
                    accentColor={sk.accentColor}
                    size={34}
                    locked={locked}
                    className="h-full w-full max-h-[34px] max-w-[34px]"
                  />
                  <span className="kt2009-hotkey">{sk.keyBind}</span>
                  {!locked && !onCd && <span className="kt2009-count">{lvl}</span>}
                  {onCd && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/82 font-mono text-[10px] font-bold text-[#FEF3C7] tabular-nums">
                      {cd.toFixed(1)}
                    </div>
                  )}
                  {locked && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/72 font-mono text-[8px] font-bold text-[#CBD5E1]">
                      Lv.{sk.unlockLevel}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Slot 9: Khinh Công (Space) */}
            <button
              type="button"
              onClick={onUseDash}
              title="Khinh Công né đòn (Phím Space)"
              className="kt2009-slot relative flex min-w-0 items-center justify-center p-[2px] cursor-pointer"
            >
              <SkillIcon skillType="dash" size={34} className="h-full w-full max-h-[34px] max-w-[34px]" />
              <span className="kt2009-hotkey">Sp</span>
              {dashCooldown > 0 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/82 font-mono text-[10px] font-bold text-[#E0F2FE] tabular-nums">
                  {dashCooldown.toFixed(1)}
                </div>
              )}
            </button>

            {/* Slot 0: Rương Báu Luyện Công (B) */}
            <button
              type="button"
              onClick={() => onOpenChest()}
              title="Mở Rương Báu Luyện Công (Phím B)"
              className={`kt2009-slot relative flex min-w-0 items-center justify-center p-[2px] cursor-pointer ${
                totalChests > 0 && battleMode === 'WILD' ? 'animate-chest-hud-blink' : ''
              }`}
            >
              <SkillIcon
                skillType="chest"
                size={34}
                locked={totalChests <= 0 || battleMode !== 'WILD'}
                className="h-full w-full max-h-[34px] max-w-[34px]"
              />
              <span className="kt2009-hotkey">B</span>
              <span
                className="kt2009-count"
                style={{ color: totalChests > 0 ? bestChestMeta.color : '#9CA3AF' }}
              >
                {totalChests}
              </span>
            </button>
          </div>
        </div>

        {/* ====================================================================
            CENTER SCULPTED ARCH: RAISED LEFT/RIGHT SKILL SOCKETS + "NỘ" ORB
           ==================================================================== */}
        <div className="relative z-10 mx-0.5 flex h-full w-[102px] shrink-0 items-end justify-center pb-0.5 sm:mx-1 sm:w-[116px]">
          <CenterArchCrest2009 />

          {/* Left-Click Active Skill Box */}
          <button
            type="button"
            onClick={() => onCastSkill(0)}
            title={`Chiêu Chuột Trái: ${leftSkill.name} (Nhấn xuất chiêu)`}
            className="kt2009-active-skill group relative z-10 -translate-y-3 flex h-[30px] w-[30px] items-center justify-center overflow-hidden p-[2px] cursor-pointer sm:-translate-y-3.5 sm:h-[35px] sm:w-[35px]"
          >
            <SkillIcon
              sectId={player.sect}
              skillType={leftSkill.type}
              vfxKind={leftSkill.vfxKind}
              skillIndex={0}
              color={leftSkill.color}
              accentColor={leftSkill.accentColor}
              size={30}
              className="h-full w-full"
            />
          </button>

          <div className="w-2 sm:w-2.5" />

          {/* Right-Click Ultimate Skill Box */}
          <button
            type="button"
            onClick={() => onCastSkill(rightClickSkillIdx)}
            title={`Chiêu Chuột Phải: ${rightSkill.name} (Nhấn xuất chiêu)`}
            className="kt2009-active-skill group relative z-10 -translate-y-3 flex h-[30px] w-[30px] items-center justify-center overflow-hidden p-[2px] cursor-pointer sm:-translate-y-3.5 sm:h-[35px] sm:w-[35px]"
          >
            <SkillIcon
              sectId={player.sect}
              skillType={rightSkill.type}
              vfxKind={rightSkill.vfxKind}
              skillIndex={rightClickSkillIdx}
              color={rightSkill.color}
              accentColor={rightSkill.accentColor}
              size={30}
              className="h-full w-full"
            />
          </button>

          {/* Iconic Circular Sculpted "Nộ" Orb */}
          <button
            type="button"
            onClick={onToggleAuto}
            title={`Nộ Khí / Tự Động Chiến Đấu: ${autoBattle ? 'Đang Kích Hoạt' : 'Đang Chờ'} (Phím K)`}
            className={`group absolute bottom-0.5 left-1/2 z-20 flex h-[28px] w-[28px] -translate-x-1/2 items-center justify-center rounded-full transition-transform hover:scale-105 cursor-pointer sm:h-[33px] sm:w-[33px] ${
              autoBattle ? 'kt2009-no-orb-active' : 'kt2009-no-orb'
            }`}
          >
            <span
              className={`pointer-events-none absolute inset-[2px] rounded-full border ${
                autoBattle ? 'border-[#FEF08A]/70' : 'border-[#8D9DA8]/45'
              }`}
              aria-hidden="true"
            />
            <span className="font-wuxia relative z-10 text-[11px] font-bold tracking-tight text-[#FBF5E6] drop-shadow-[0_1px_2px_rgba(0,0,0,0.98)] sm:text-[13px]">
              Nộ
            </span>
            <span className="kt2009-tooltip pointer-events-none absolute -top-8 left-1/2 z-50 hidden -translate-x-1/2 rounded px-1.5 py-0.5 text-[9px] font-semibold text-[#FEF3C7] whitespace-nowrap group-hover:block">
              Nộ Khí · Tự Đánh ({autoBattle ? 'Bật' : 'Tắt'} · K)
            </span>
          </button>
        </div>

        {/* ====================================================================
            RIGHT HALF: SEAMLESS 10-ICON ILLUSTRATED KIẾM THẾ 2009 SYSTEM MENU
           ==================================================================== */}
        <div className="flex min-w-0 items-center justify-start gap-1.5">
          <nav
            aria-label="Thanh chức năng Kiếm Thế 2009"
            className="kt2009-slot-strip grid h-[30px] w-full max-w-[348px] min-w-0 grid-cols-10 items-stretch sm:h-[34px]"
          >
            {rightMenuButtons.map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={btn.onClick}
                title={`${btn.label} (${btn.fkey})`}
                className={`kt2009-menu-btn group relative flex min-w-0 items-center justify-center p-[2px] cursor-pointer ${
                  btn.isActive ? 'kt2009-menu-btn-active' : ''
                }`}
              >
                <DockArt2009
                  kind={btn.art}
                  size={26}
                  active={btn.isActive}
                  className="h-full w-full max-h-[26px] max-w-[26px]"
                />

                <span className="kt2009-tooltip pointer-events-none absolute -top-7 left-1/2 z-50 hidden -translate-x-1/2 rounded px-1.5 py-0.5 text-[9px] font-semibold text-[#FEF3C7] whitespace-nowrap group-hover:block">
                  {btn.label} <span className="font-mono text-[#93C5FD]">({btn.fkey})</span>
                </span>

                <span className="pointer-events-none absolute bottom-0 left-0.5 font-mono text-[6.5px] font-bold text-[#DCE6EC]/85 drop-shadow-[0_1px_1px_rgba(0,0,0,0.98)]">
                  {btn.fkey}
                </span>

                {btn.badge !== undefined && (
                  <span className="pointer-events-none absolute top-0 right-0 flex h-3 min-w-3 items-center justify-center rounded-sm border border-[#F5D061] bg-[#991B1B] px-0.5 font-mono text-[7px] font-bold text-[#FEF3C7] tabular-nums leading-none">
                    {btn.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="kt2009-wing-cap hidden h-[28px] flex-1 max-w-[96px] items-center justify-between rounded-sm px-2 2xl:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9AA9B3] shadow-inner" />
            <span className="h-[1px] flex-1 mx-1.5 bg-[#6E7D87]/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#9AA9B3] shadow-inner" />
          </div>
        </div>
      </div>
    </div>
  );
};
