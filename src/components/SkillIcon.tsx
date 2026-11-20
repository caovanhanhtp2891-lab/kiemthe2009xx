import React from 'react';
import { SectId, SkillDef, SkillVfxKind } from '../game/types';

interface SkillIconProps {
  sectId?: SectId;
  skillType?: SkillDef['type'] | 'passive' | 'potion_hp' | 'potion_mp' | 'dash' | 'chest' | 'mount';
  vfxKind?: SkillVfxKind;
  skillIndex?: number;
  color?: string;
  accentColor?: string;
  size?: number;
  locked?: boolean;
  className?: string;
}

/**
 * Hand-crafted Kiếm Thế 2009 martial arts & consumable icon medallions.
 * Produces crisp high-contrast wuxia iconography for all 72 skills across 12 sects.
 */
export const SkillIcon: React.FC<SkillIconProps> = ({
  sectId = 'vo_dang',
  skillType = 'melee',
  vfxKind,
  skillIndex = 0,
  color = '#F5D061',
  accentColor = '#FEF08A',
  size = 36,
  locked = false,
  className = '',
}) => {
  const c1 = locked ? '#6B7280' : color;
  const c2 = locked ? '#9CA3AF' : accentColor;
  const bgTop = locked ? '#1A1E22' : '#1E252B';
  const bgBot = locked ? '#0B0D0F' : '#090C0E';
  const uid = `sk_${sectId}_${skillType}_${vfxKind || 'std'}_${skillIndex}_${c1.replace('#', '')}`;

  const renderGlyph = () => {
    if (skillType === 'potion_hp') {
      return (
        <g>
          {/* Classic Kiếm Thế Red Kim Sang Dược Glass Vial */}
          <rect x="19" y="6" width="10" height="4" rx="1" fill="#C9A25B" stroke="#5E4319" strokeWidth="1.2" />
          <path d="M20 10 L28 10 L28 15 L36 25 C39 30 37 40 24 41 C11 40 9 30 12 25 L20 15 Z" fill="#2A0909" stroke="#D7E0E6" strokeWidth="1.6" />
          <path d="M13.5 27 C16 25 32 25 34.5 27 C36.5 31.5 34.5 38.5 24 39 C13.5 38.5 11.5 31.5 13.5 27 Z" fill="url(#hpGrad)" />
          <ellipse cx="19" cy="29" rx="2.2" ry="5" transform="rotate(-18 19 29)" fill="#FCA5A5" opacity="0.65" />
          <circle cx="28" cy="34" r="1.6" fill="#FEE2E2" opacity="0.7" />
        </g>
      );
    }

    if (skillType === 'potion_mp') {
      return (
        <g>
          {/* Classic Kiếm Thế Blue Hồi Nội Đan Vial */}
          <rect x="19" y="6" width="10" height="4" rx="1" fill="#A8B5BF" stroke="#374151" strokeWidth="1.2" />
          <path d="M20 10 L28 10 L28 15 L36 25 C39 30 37 40 24 41 C11 40 9 30 12 25 L20 15 Z" fill="#0A1633" stroke="#D7E0E6" strokeWidth="1.6" />
          <path d="M13.5 27 C16 25 32 25 34.5 27 C36.5 31.5 34.5 38.5 24 39 C13.5 38.5 11.5 31.5 13.5 27 Z" fill="url(#mpGrad)" />
          <ellipse cx="19" cy="29" rx="2.2" ry="5" transform="rotate(-18 19 29)" fill="#BFDBFE" opacity="0.7" />
        </g>
      );
    }

    if (skillType === 'dash') {
      return (
        <g>
          {/* Khinh Công Wind Feather & Cloud Trail */}
          <path d="M8 34 Q18 32 28 22 Q35 15 40 10" fill="none" stroke="#38BDF8" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M9 39 Q20 38 30 29 Q36 24 41 19" fill="none" stroke="#BAE6FD" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
          <path d="M16 24 C20 14 30 10 38 11 C36 20 30 27 21 29 C18 29 15 27 16 24 Z" fill="#0EA5E9" stroke="#E0F2FE" strokeWidth="1.4" />
          <path d="M19 25 L35 13" stroke="#F0F9FF" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      );
    }

    if (skillType === 'chest') {
      return (
        <g>
          {/* Imperial Gold Treasure Chest */}
          <rect x="9" y="18" width="30" height="20" rx="2" fill="#7C2D12" stroke="#F5D061" strokeWidth="1.8" />
          <path d="M9 22 L39 22 L36 13 L12 13 Z" fill="#B45309" stroke="#FDE68A" strokeWidth="1.5" />
          <rect x="21" y="20" width="6" height="8" rx="1" fill="#FDE047" stroke="#78350F" strokeWidth="1.2" />
          <circle cx="24" cy="24" r="1.4" fill="#78350F" />
          <path d="M12 18 L12 38 M36 18 L36 38" stroke="#F5D061" strokeWidth="1.5" />
        </g>
      );
    }

    if (skillType === 'mount') {
      return (
        <g>
          {/* Warhorse Crest */}
          <path
            d="M15 37 L17 25 L13 21 L18 14 L23 11 L26 14 L34 17 L32 22 L27 22 L29 29 L35 37 Z"
            fill={c1}
            stroke={c2}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="16" r="1.4" fill="#0B0D0F" />
          <path d="M15 24 Q10 28 12 35" fill="none" stroke={c2} strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    }

    if (skillType === 'passive') {
      return (
        <g>
          {/* Ancient Martial Arts Tâm Pháp Scroll */}
          <rect x="12" y="10" width="24" height="28" rx="2" fill="#2A2116" stroke={c1} strokeWidth="1.6" />
          <rect x="9" y="8" width="30" height="4.5" rx="2" fill={c1} stroke="#14100B" strokeWidth="1" />
          <rect x="9" y="35.5" width="30" height="4.5" rx="2" fill={c1} stroke="#14100B" strokeWidth="1" />
          <circle cx="24" cy="24" r="7" fill="none" stroke={c2} strokeWidth="1.5" opacity="0.9" />
          <path d="M24 17 L24 31 M17 24 L31 24" stroke={c1} strokeWidth="1.4" opacity="0.85" />
          <circle cx="24" cy="24" r="2.2" fill={c2} />
        </g>
      );
    }

    // Bespoke 72-skill iconography keyed by SkillVfxKind
    if (vfxKind) {
      switch (vfxKind) {
        case 'slash_single':
          return (
            <g>
              <path d="M10 35 C12 16 26 9 39 13" fill="none" stroke={c1} strokeWidth="4.2" strokeLinecap="round" />
              <path d="M13 33 C15 19 26 13 37 15" fill="none" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
              <circle cx="36" cy="14" r="2.6" fill="#FFFFFF" />
            </g>
          );
        case 'blade_arc':
          return (
            <g>
              <path d="M9 32 C12 16 24 10 36 12" fill="none" stroke={c1} strokeWidth="3" strokeLinecap="round" opacity="0.72" />
              <path d="M13 38 C16 20 28 14 40 17" fill="none" stroke={c2} strokeWidth="4.2" strokeLinecap="round" />
              <path d="M15 36 C18 22 29 16 39 18" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="38" cy="18" r="2.4" fill="#FFFFFF" />
            </g>
          );
        case 'sword_triple':
          return (
            <g>
              <path d="M9 30 Q22 14 38 11" fill="none" stroke={c1} strokeWidth="2.8" strokeLinecap="round" />
              <path d="M11 36 Q24 22 39 19" fill="none" stroke={c2} strokeWidth="2.4" strokeLinecap="round" />
              <path d="M15 40 Q27 29 38 28" fill="none" stroke={c1} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            </g>
          );
        case 'sword_dash_triple':
          return (
            <g>
              <line x1="8" y1="38" x2="38" y2="10" stroke={c1} strokeWidth="4.2" strokeLinecap="round" />
              <line x1="8" y1="38" x2="38" y2="10" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M16 24 L22 30 M24 16 L30 22 M31 9 L39 17" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
            </g>
          );
        case 'twin_spirit_swords':
          return (
            <g>
              <line x1="22" y1="37" x2="11" y2="11" stroke="#38BDF8" strokeWidth="3.2" strokeLinecap="round" />
              <line x1="26" y1="37" x2="37" y2="11" stroke="#C084FC" strokeWidth="3.2" strokeLinecap="round" />
              <line x1="22" y1="37" x2="11" y2="11" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="26" y1="37" x2="37" y2="11" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="24" cy="36" r="3" fill={c2} />
            </g>
          );
        case 'taiji_domain':
          return (
            <g>
              <circle cx="24" cy="24" r="15.5" fill="none" stroke={c1} strokeWidth="2" strokeDasharray="5 2.5" />
              <circle cx="24" cy="24" r="11.5" fill="#1E3A8A" stroke={c2} strokeWidth="1.6" />
              <path d="M24 12.5 A11.5 11.5 0 0 1 24 35.5 A5.75 5.75 0 0 1 24 24 A5.75 5.75 0 0 0 24 12.5 Z" fill="#E0F2FE" />
              <circle cx="24" cy="18.25" r="2" fill="#1E3A8A" />
              <circle cx="24" cy="29.75" r="2" fill="#E0F2FE" />
            </g>
          );
        case 'blade_wave_line':
          return (
            <g>
              <path d="M11 17 Q24 10 37 17" fill="none" stroke={c1} strokeWidth="3.2" strokeLinecap="round" />
              <path d="M9 28 Q24 19 39 28" fill="none" stroke={c2} strokeWidth="3.2" strokeLinecap="round" />
              <path d="M15 36 L33 36" stroke={c1} strokeWidth="1.6" strokeDasharray="3 2" opacity="0.7" />
            </g>
          );
        case 'lion_roar':
          return (
            <g>
              <circle cx="24" cy="24" r="15.5" fill="none" stroke={c1} strokeWidth="1.8" strokeDasharray="5 3" />
              <circle cx="24" cy="24" r="10.5" fill="none" stroke={c2} strokeWidth="2.2" />
              <path d="M18 20 L21 15 L24 18 L27 15 L30 20 L29 29 L24 32 L19 29 Z" fill={c1} stroke={c2} strokeWidth="1.2" />
              <circle cx="21.5" cy="22.5" r="1.2" fill="#0B0D0F" />
              <circle cx="26.5" cy="22.5" r="1.2" fill="#0B0D0F" />
            </g>
          );
        case 'tiger_hammer':
          return (
            <g>
              <circle cx="24" cy="24" r="15" fill={c1} fillOpacity="0.24" stroke={c2} strokeWidth="1.8" />
              <path d="M14 14 L19 18 L24 16 L29 18 L34 14 L35 26 L24 34 L13 26 Z" fill={c1} stroke={c2} strokeWidth="1.6" />
              <path d="M20 20 L28 20 M24 17 L24 23" stroke="#FEF08A" strokeWidth="1.5" />
              <circle cx="19.5" cy="25" r="1.5" fill="#FFFFFF" />
              <circle cx="28.5" cy="25" r="1.5" fill="#FFFFFF" />
            </g>
          );
        case 'star_staff_spin':
          return (
            <g>
              <circle cx="24" cy="24" r="14.5" fill="none" stroke={c1} strokeWidth="2.4" strokeDasharray="11 5" />
              <line x1="12" y1="36" x2="36" y2="12" stroke={c2} strokeWidth="3.2" strokeLinecap="round" />
              <circle cx="24" cy="9.5" r="2" fill="#FEF9C3" />
              <circle cx="38.5" cy="24" r="2" fill="#FEF9C3" />
              <circle cx="24" cy="38.5" r="2" fill="#FEF9C3" />
              <circle cx="9.5" cy="24" r="2" fill="#FEF9C3" />
            </g>
          );
        case 'vortex_pull':
        case 'fire_lotus_pull':
          return (
            <g>
              <path d="M24 9 A15 15 0 0 1 39 24 A11 11 0 0 1 24 35 A7 7 0 0 1 17 24 A4 4 0 0 1 24 20" fill="none" stroke={c1} strokeWidth="2.6" strokeLinecap="round" />
              <path d="M24 39 A15 15 0 0 1 9 24" fill="none" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="24" cy="24" r="3.4" fill={c2} />
            </g>
          );
        case 'spear_tether_pull':
          return (
            <g>
              <path d="M10 36 Q22 22 36 12" fill="none" stroke="#9333EA" strokeWidth="3.6" strokeLinecap="round" />
              <path d="M10 36 Q22 22 36 12" fill="none" stroke={c1} strokeWidth="2" strokeDasharray="4 2" strokeLinecap="round" />
              <polygon points="39,9 30,11 36,18" fill={c2} stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="13" cy="33" r="4" fill="none" stroke={c2} strokeWidth="1.6" />
            </g>
          );
        case 'spear_charge':
        case 'crimson_spear_dash':
          return (
            <g>
              <line x1="9" y1="39" x2="33" y2="15" stroke={c1} strokeWidth="2.6" strokeLinecap="round" />
              <polygon points="39,9 27,13 35,21" fill={c2} stroke="#FFFFFF" strokeWidth="1" />
              <path d="M28 11 L37 20 M37 11 L28 20" stroke={c2} strokeWidth="1.2" opacity="0.8" />
            </g>
          );
        case 'spear_flurry':
          return (
            <g>
              <line x1="9" y1="20" x2="34" y2="13" stroke={c1} strokeWidth="2.4" strokeLinecap="round" />
              <line x1="8" y1="28" x2="38" y2="24" stroke={c2} strokeWidth="2.8" strokeLinecap="round" />
              <line x1="11" y1="36" x2="35" y2="34" stroke={c1} strokeWidth="2.4" strokeLinecap="round" />
              <polygon points="40,24 33,20.5 33,27.5" fill="#FFFFFF" />
            </g>
          );
        case 'spear_whirl_shield':
          return (
            <g>
              <circle cx="24" cy="24" r="15.5" fill="none" stroke={c1} strokeWidth="2.4" strokeDasharray="12 4" />
              <circle cx="24" cy="24" r="9.5" fill={c1} fillOpacity="0.22" stroke={c2} strokeWidth="1.8" />
              <line x1="11" y1="24" x2="37" y2="24" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          );
        case 'golden_bell':
          return (
            <g>
              <path d="M24 9 C16 9 13 17 13 26 L10 34 L38 34 L35 26 C35 17 32 9 24 9 Z" fill={c1} fillOpacity="0.3" stroke={c1} strokeWidth="2.2" />
              <path d="M16 34 L32 34 M24 6 L24 10" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="24" cy="23" r="4.2" fill="none" stroke={c2} strokeWidth="1.6" />
            </g>
          );
        case 'compact_buff':
          return (
            <g>
              <circle cx="24" cy="25" r="12" fill={c1} fillOpacity="0.24" stroke={c1} strokeWidth="2" />
              <path d="M24 11 L29 19 L25.8 19 L25.8 34 L22.2 34 L22.2 19 L19 19 Z" fill={c2} stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="14" cy="18" r="1.8" fill="#FFFFFF" />
              <circle cx="34" cy="18" r="1.8" fill="#FFFFFF" />
            </g>
          );
        case 'evasion_ring':
          return (
            <g>
              <circle cx="24" cy="24" r="14.5" fill="none" stroke={c1} strokeWidth="2.4" strokeDasharray="10 4" />
              <circle cx="24" cy="24" r="9" fill="none" stroke={c2} strokeWidth="1.8" strokeDasharray="6 4" />
              <path d="M17 28 Q24 15 31 28" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="24" cy="17" r="3" fill={c2} />
            </g>
          );
        case 'shield':
          return (
            <g>
              <circle cx="24" cy="24" r="14" fill="#111827" stroke={c1} strokeWidth="2" />
              <path d="M24 10 A14 14 0 0 1 24 38 A7 7 0 0 1 24 24 A7 7 0 0 0 24 10 Z" fill={c2} />
              <circle cx="24" cy="17" r="2.2" fill="#111827" />
              <circle cx="24" cy="31" r="2.2" fill={c2} />
            </g>
          );
        case 'north_shield':
        case 'buddha_aegis':
          return (
            <g>
              <circle cx="24" cy="24" r="15" fill={c1} fillOpacity="0.22" stroke={c2} strokeWidth="2" />
              <path d="M24 11 L34 16 L33 27 C32 33 24 38 24 38 C24 38 16 33 15 27 L14 16 Z" fill={c1} fillOpacity="0.35" stroke={c2} strokeWidth="1.5" />
              <circle cx="24" cy="23" r="3.5" fill="#FFFFFF" />
            </g>
          );
        case 'hammer_heavy':
        case 'ground_shatter':
          return (
            <g>
              <line x1="12" y1="36" x2="26" y2="22" stroke="#D4AF37" strokeWidth="3.2" strokeLinecap="round" />
              <rect x="21" y="10" width="16" height="11" rx="2" transform="rotate(42 29 15.5)" fill={c1} stroke={c2} strokeWidth="1.6" />
              <path d="M9 38 L16 35 L22 39 L30 35 L38 38" fill="none" stroke={c2} strokeWidth="1.6" />
            </g>
          );
        case 'meteor_strike':
          return (
            <g>
              <path d="M36 9 L20 25" stroke={c2} strokeWidth="4" strokeLinecap="round" opacity="0.65" />
              <circle cx="19" cy="28" r="9" fill={c1} stroke={c2} strokeWidth="1.8" />
              <circle cx="18" cy="27" r="4" fill="#FEF9C3" />
              <path d="M9 38 L39 38" stroke={c1} strokeWidth="1.8" strokeDasharray="3 2" />
            </g>
          );
        case 'shadow_blink':
        case 'water_steps':
        case 'frost_stealth':
          return (
            <g>
              <path d="M11 33 Q20 14 35 12" fill="none" stroke={c1} strokeWidth="2.4" strokeDasharray="3 2" />
              <circle cx="29" cy="18" r="6" fill={c1} fillOpacity="0.35" stroke={c2} strokeWidth="1.6" />
              <circle cx="18" cy="29" r="5" fill={c1} fillOpacity="0.18" stroke={c1} strokeWidth="1.2" />
              <path d="M29 12 L29 24 M23 18 L35 18" stroke="#FFFFFF" strokeWidth="1.3" />
            </g>
          );
        case 'needle_barrage':
          return (
            <g>
              <path d="M11 12 L21 23 M21 9 L28 22 M33 10 L37 23 M10 24 L19 37 M21 24 L27 38 M31 24 L37 37" stroke={c2} strokeWidth="2.1" strokeLinecap="round" />
              <circle cx="24" cy="24" r="14" fill="none" stroke={c1} strokeWidth="1.3" strokeDasharray="2 3" />
            </g>
          );
        case 'poison_trap':
          return (
            <g>
              <ellipse cx="24" cy="32" rx="14" ry="5.5" fill={c1} fillOpacity="0.28" stroke={c1} strokeWidth="1.6" />
              <polygon points="15,31 18,16 21,31" fill={c2} />
              <polygon points="21,32 24,11 27,32" fill={c1} stroke={c2} strokeWidth="1" />
              <polygon points="27,31 30,17 33,31" fill={c2} />
            </g>
          );
        case 'gear_aura':
          return (
            <g>
              <circle cx="24" cy="24" r="11" fill="none" stroke={c1} strokeWidth="4.5" strokeDasharray="4.5 3" />
              <circle cx="24" cy="24" r="7.5" fill="#182224" stroke={c2} strokeWidth="1.5" />
              <circle cx="24" cy="24" r="2.8" fill={c2} />
            </g>
          );
        case 'knockback_ring':
          return (
            <g>
              <circle cx="24" cy="24" r="14" fill="none" stroke={c1} strokeWidth="2" />
              <path d="M24 14 L24 7 M24 34 L24 41 M14 24 L7 24 M34 24 L41 24" stroke={c2} strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="24" cy="24" r="4.5" fill={c2} />
            </g>
          );
        case 'giant_sword_push':
          return (
            <g>
              <path d="M12 36 C16 18 28 11 39 14" fill="none" stroke={c1} strokeWidth="4.6" strokeLinecap="round" />
              <path d="M15 35 C19 21 29 14 38 16" fill="none" stroke="#FEF08A" strokeWidth="2" strokeLinecap="round" />
              <path d="M27 28 L35 28 L31 24 M35 28 L31 32" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            </g>
          );
        case 'venom_palm':
        case 'venom_curse':
          return (
            <g>
              <circle cx="24" cy="25" r="13.5" fill={c1} fillOpacity="0.22" stroke={c1} strokeWidth="1.8" />
              <path d="M24 10 C28 17 34 21 34 27 C34 33 29.5 37 24 37 C18.5 37 14 33 14 27 C14 21 20 17 24 10 Z" fill={c1} stroke={c2} strokeWidth="1.5" />
              <circle cx="21" cy="28" r="2.2" fill="#ECFCCB" opacity="0.85" />
            </g>
          );
        case 'yin_wind':
          return (
            <g>
              <path d="M10 20 C18 11 32 13 37 22 C31 27 20 26 16 21" fill="none" stroke="#7E22CE" strokeWidth="3.6" strokeLinecap="round" />
              <path d="M11 31 C19 24 32 26 38 34" fill="none" stroke={c2} strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="34" cy="21" r="2.5" fill={c2} />
            </g>
          );
        case 'toad_curse':
          return (
            <g>
              <circle cx="24" cy="24" r="15" fill="none" stroke="#A855F7" strokeWidth="1.8" strokeDasharray="4 2.5" />
              <ellipse cx="24" cy="26" rx="10" ry="7.5" fill={c1} stroke={c2} strokeWidth="1.4" />
              <circle cx="19.5" cy="21" r="2.6" fill={c2} />
              <circle cx="28.5" cy="21" r="2.6" fill={c2} />
              <circle cx="19.5" cy="21" r="1.1" fill="#1E1B4B" />
              <circle cx="28.5" cy="21" r="1.1" fill="#1E1B4B" />
            </g>
          );
        case 'dispel_seal':
          return (
            <g>
              <circle cx="24" cy="24" r="14" fill="none" stroke={c1} strokeWidth="2" />
              <polygon points="24,11 35,31 13,31" fill="none" stroke={c2} strokeWidth="1.6" />
              <line x1="12" y1="12" x2="36" y2="36" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          );
        case 'soul_drain':
          return (
            <g>
              <path d="M10 34 C16 14 32 34 38 14" fill="none" stroke={c1} strokeWidth="3" strokeLinecap="round" />
              <path d="M10 18 C20 26 28 22 38 32" fill="none" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="12" cy="32" r="3.5" fill={c2} />
              <circle cx="36" cy="15" r="3.5" fill={c1} />
            </g>
          );
        case 'sacred_fire_rain':
          return (
            <g>
              <path d="M24 8 C30 16 33 22 31 29 C29.5 34 27 37 24 37 C19.5 37 16 33 17 26 C18 20 21 15 24 8 Z" fill={c1} stroke={c2} strokeWidth="1.5" />
              <path d="M24 19 C27 24 27 29 24 34 C21 30 21 25 24 19 Z" fill="#FFFFFF" />
              <circle cx="13" cy="14" r="2" fill={c2} />
              <circle cx="36" cy="16" r="2" fill={c2} />
            </g>
          );
        case 'lotus':
        case 'lotus_heal':
          return (
            <g>
              <path d="M24 10 C29 17 29 27 24 35 C19 27 19 17 24 10 Z" fill={c2} stroke="#FFFFFF" strokeWidth="1.2" />
              <path d="M12 22 C18 20 22 26 24 35 C17 33 12 28 12 22 Z" fill={c1} stroke={c2} strokeWidth="1.2" />
              <path d="M36 22 C30 20 26 26 24 35 C31 33 36 28 36 22 Z" fill={c1} stroke={c2} strokeWidth="1.2" />
              <circle cx="24" cy="24" r="3" fill="#FEF9C3" />
            </g>
          );
        case 'four_palms':
          return (
            <g>
              <circle cx="24" cy="24" r="15.5" fill={c1} fillOpacity="0.2" stroke={c2} strokeWidth="1.5" />
              <circle cx="24" cy="12" r="3.2" fill={c2} />
              <circle cx="24" cy="36" r="3.2" fill={c2} />
              <circle cx="12" cy="24" r="3.2" fill={c2} />
              <circle cx="36" cy="24" r="3.2" fill={c2} />
              <circle cx="24" cy="24" r="5" fill="#FFFFFF" opacity="0.9" />
            </g>
          );
        case 'frost_shatter':
          return (
            <g>
              <path d="M24 7 L24 41 M7 24 L41 24 M12 12 L36 36 M36 12 L12 36" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
              <polygon points="24,14 34,24 24,34 14,24" fill={c1} fillOpacity="0.48" stroke="#FFFFFF" strokeWidth="1.4" />
            </g>
          );
        case 'ocean_wave':
          return (
            <g>
              <path d="M9 32 C14 14 28 11 38 19 C32 20 28 24 30 30 C23 28 16 32 9 32 Z" fill={c1} stroke="#FFFFFF" strokeWidth="1.4" />
              <path d="M12 29 C18 19 28 17 35 20" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeDasharray="4 2" />
            </g>
          );
        case 'frost_beam':
          return (
            <g>
              <line x1="9" y1="36" x2="39" y2="12" stroke={c1} strokeWidth="4.4" strokeLinecap="round" />
              <line x1="9" y1="36" x2="39" y2="12" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="18" cy="21" r="2" fill="#E0F2FE" />
              <circle cx="31" cy="27" r="2" fill="#E0F2FE" />
            </g>
          );
        case 'ice_pillars':
          return (
            <g>
              <polygon points="14,37 18,16 22,37" fill={c1} stroke="#FFFFFF" strokeWidth="1.1" />
              <polygon points="20,37 24,9 28,37" fill={c2} stroke="#FFFFFF" strokeWidth="1.2" />
              <polygon points="26,37 31,18 35,37" fill={c1} stroke="#FFFFFF" strokeWidth="1.1" />
            </g>
          );
        case 'ice_needles':
          return (
            <g>
              <line x1="9" y1="31" x2="35" y2="11" stroke={c1} strokeWidth="2.2" strokeLinecap="round" />
              <line x1="12" y1="36" x2="39" y2="16" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="16" y1="39" x2="38" y2="24" stroke={c2} strokeWidth="2" strokeLinecap="round" />
            </g>
          );
        case 'six_swords':
          return (
            <g>
              <path d="M10 14 L24 24 M10 24 L24 24 M10 34 L24 24 M38 14 L24 24 M38 24 L24 24 M38 34 L24 24" stroke={c1} strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="24" cy="24" r="4.5" fill="#FFFFFF" stroke={c2} strokeWidth="1.5" />
            </g>
          );
        case 'finger_seal':
          return (
            <g>
              <line x1="9" y1="35" x2="36" y2="12" stroke={c1} strokeWidth="3.6" strokeLinecap="round" />
              <line x1="9" y1="35" x2="36" y2="12" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="36" cy="12" r="4.2" fill={c2} />
            </g>
          );
        case 'dragon':
        case 'dragon_palm':
          return (
            <g>
              <path d="M12 35 C9 22 18 11 30 13 C38 14 39 24 33 28 C27 32 20 27 22 21 C24 17 30 18 30 22" fill="none" stroke={c1} strokeWidth="3.4" strokeLinecap="round" />
              <path d="M12 35 C9 22 18 11 30 13 C38 14 39 24 33 28" fill="none" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />
              <polygon points="37,10 31,12 34,17" fill="#FEF08A" />
            </g>
          );
        case 'fire_wall':
          return (
            <g>
              <path d="M10 38 Q14 20 18 28 Q22 12 26 26 Q30 14 34 26 Q37 20 39 38 Z" fill={c1} stroke={c2} strokeWidth="1.4" />
              <path d="M14 38 Q20 25 24 32 Q28 22 34 38 Z" fill="#FEF08A" opacity="0.85" />
            </g>
          );
        case 'staff_sweep':
        case 'staff_array':
          return (
            <g>
              <circle cx="24" cy="24" r="14" fill="none" stroke={c1} strokeWidth="2" strokeDasharray="10 5" />
              <line x1="11" y1="36" x2="37" y2="12" stroke={c1} strokeWidth="4" strokeLinecap="round" />
              <line x1="11" y1="36" x2="37" y2="12" stroke={c2} strokeWidth="1.3" strokeLinecap="round" />
            </g>
          );
        case 'swords':
        case 'sword_rain':
        case 'sword_converge':
          return (
            <g>
              <line x1="24" y1="7" x2="24" y2="39" stroke="#FEF9C3" strokeWidth="2.6" strokeLinecap="round" />
              <line x1="14" y1="12" x2="14" y2="35" stroke={c1} strokeWidth="2.2" strokeLinecap="round" />
              <line x1="34" y1="12" x2="34" y2="35" stroke={c1} strokeWidth="2.2" strokeLinecap="round" />
              <path d="M19 14 L29 14 M10 18 L18 18 M30 18 L38 18" stroke={c2} strokeWidth="2" strokeLinecap="round" />
            </g>
          );
        case 'thunder_strike':
        case 'thunder_cluster':
          return (
            <g>
              <polygon points="27,7 14,25 23,25 19,41 35,21 25,21" fill={c1} stroke={c2} strokeWidth="1.5" strokeLinejoin="round" />
            </g>
          );
        case 'wind_lightning':
          return (
            <g>
              <path d="M9 17 C16 12 28 12 36 16" fill="none" stroke={c1} strokeWidth="2.6" strokeLinecap="round" />
              <path d="M10 34 C18 30 30 30 38 33" fill="none" stroke={c1} strokeWidth="2.2" strokeLinecap="round" />
              <polygon points="26,11 17,24 24,24 21,38 33,22 25,22" fill={c2} stroke="#FFFFFF" strokeWidth="1" />
            </g>
          );
        case 'buddha_palm_ult':
        case 'staff_mandala_ult':
          return (
            <g>
              <circle cx="24" cy="24" r="16" fill={c1} fillOpacity="0.22" stroke={c2} strokeWidth="1.8" strokeDasharray="6 3" />
              <circle cx="24" cy="24" r="10" fill="none" stroke={c1} strokeWidth="2.2" />
              <path d="M24 7 L24 41 M7 24 L41 24 M12 12 L36 36 M36 12 L12 36" stroke={c2} strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="24" cy="24" r="4.5" fill={c2} stroke="#FFFFFF" strokeWidth="1" />
            </g>
          );
        case 'cavalry_spear_ult':
        case 'blood_dragon_ult':
          return (
            <g>
              <line x1="8" y1="38" x2="36" y2="10" stroke={c1} strokeWidth="3.2" strokeLinecap="round" />
              <line x1="8" y1="26" x2="30" y2="8" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
              <line x1="18" y1="40" x2="40" y2="18" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
              <polygon points="40,7 29,11 36,18" fill="#FFFFFF" stroke={c1} strokeWidth="1" />
            </g>
          );
        case 'nine_palace_trap_ult':
        case 'spider_venom_ult':
          return (
            <g>
              <rect x="10" y="10" width="28" height="28" rx="2" fill={c1} fillOpacity="0.18" stroke={c1} strokeWidth="1.8" />
              <path d="M19 10 L19 38 M29 10 L29 38 M10 19 L38 19 M10 29 L38 29" stroke={c2} strokeWidth="1.4" />
              <circle cx="24" cy="24" r="4" fill={c2} />
            </g>
          );
        case 'sacred_fire_hex_ult':
        case 'hellfire_lotus_ult':
          return (
            <g>
              <polygon points="24,7 38,32 10,32" fill={c1} fillOpacity="0.26" stroke={c2} strokeWidth="1.7" />
              <polygon points="24,41 38,16 10,16" fill="none" stroke={c1} strokeWidth="1.7" />
              <circle cx="24" cy="24" r="4.5" fill="#FFFFFF" />
            </g>
          );
        case 'lotus_sanctuary_ult':
          return (
            <g>
              <circle cx="24" cy="24" r="15.5" fill={c1} fillOpacity="0.2" stroke={c2} strokeWidth="1.8" />
              <path d="M24 9 C29 16 29 26 24 34 C19 26 19 16 24 9 Z" fill={c2} stroke="#FFFFFF" strokeWidth="1.1" />
              <path d="M11 22 C17 19 22 25 24 34 C16 32 11 27 11 22 Z" fill={c1} stroke={c2} strokeWidth="1.1" />
              <path d="M37 22 C31 19 26 25 24 34 C32 32 37 27 37 22 Z" fill={c1} stroke={c2} strokeWidth="1.1" />
            </g>
          );
        case 'glacier_swords_ult':
        case 'six_meridian_ult':
        case 'taiji_sword_array_ult':
          return (
            <g>
              <circle cx="24" cy="24" r="15" fill="none" stroke={c1} strokeWidth="1.8" strokeDasharray="5 2.5" />
              <line x1="24" y1="6" x2="24" y2="42" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="12" y1="12" x2="36" y2="36" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
              <line x1="36" y1="12" x2="12" y2="36" stroke={c1} strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="24" cy="24" r="4.2" fill={c2} />
            </g>
          );
        case 'dragon_storm_ult':
          return (
            <g>
              <path d="M11 36 C7 22 17 9 30 11 C39 13 40 25 32 30 C25 34 18 28 21 21 C23 16 30 17 30 22" fill="none" stroke={c1} strokeWidth="3.8" strokeLinecap="round" />
              <path d="M14 34 C11 22 19 12 30 14 C36 15 37 23 31 27" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="35" cy="12" r="3.2" fill={c2} />
            </g>
          );
        case 'thunder_array_ult':
        case 'wind_thunder_vortex_ult':
          return (
            <g>
              <circle cx="24" cy="24" r="15" fill="none" stroke={c1} strokeWidth="2" strokeDasharray="8 4" />
              <polygon points="27,7 14,24 23,24 19,41 35,21 25,21" fill={c2} stroke="#FFFFFF" strokeWidth="1.3" strokeLinejoin="round" />
            </g>
          );
        case 'guard_shield_140':
          return (
            <g>
              <polygon points="24,7 38,15 38,33 24,41 10,33 10,15" fill={c1} fillOpacity="0.28" stroke={c2} strokeWidth="2.2" />
              <polygon points="24,13 33,18 33,30 24,35 15,30 15,18" fill="none" stroke="#FFFFFF" strokeWidth="1.4" />
              <circle cx="24" cy="24" r="3.4" fill={c2} />
            </g>
          );
        case 'cleanse_dash':
          return (
            <g>
              <circle cx="24" cy="24" r="14" fill="none" stroke={c1} strokeWidth="2" strokeDasharray="4 3" />
              <path d="M10 32 Q22 24 37 13" fill="none" stroke={c2} strokeWidth="3.4" strokeLinecap="round" />
              <polygon points="39,11 29,13 35,20" fill="#FFFFFF" />
            </g>
          );
        default:
          break;
      }
    }

    // Legacy sect-specific fallback (when vfxKind is not provided)
    if (sectId === 'thieu_lam') {
      if (skillIndex === 0) {
        // Golden Staff Sweep
        return (
          <g>
            <path d="M10 36 Q22 14 38 14" fill="none" stroke={c2} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
            <line x1="11" y1="37" x2="37" y2="11" stroke={c1} strokeWidth="4.2" strokeLinecap="round" />
            <line x1="11" y1="37" x2="37" y2="11" stroke="#FEF9C3" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="35" cy="13" r="3.5" fill={c2} />
          </g>
        );
      }
      if (skillIndex === 1) {
        // Kim Chung Trạo (Golden Bell Shield)
        return (
          <g>
            <path d="M24 9 C16 9 13 17 13 26 L10 34 L38 34 L35 26 C35 17 32 9 24 9 Z" fill={c1} fillOpacity="0.28" stroke={c1} strokeWidth="2.2" />
            <path d="M16 34 L32 34 M24 6 L24 10" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="24" cy="23" r="4.5" fill="none" stroke={c2} strokeWidth="1.6" />
          </g>
        );
      }
      if (skillIndex === 2) {
        // Sư Tử Hống (Sonic Wave Rings)
        return (
          <g>
            <circle cx="24" cy="24" r="15" fill="none" stroke={c1} strokeWidth="1.8" strokeDasharray="4 3" />
            <circle cx="24" cy="24" r="10" fill="none" stroke={c2} strokeWidth="2.2" />
            <circle cx="24" cy="24" r="4.5" fill={c1} />
          </g>
        );
      }
      // Như Lai Thần Chưởng (Buddha Palm)
      return (
        <g>
          <circle cx="24" cy="24" r="16" fill={c1} fillOpacity="0.2" stroke={c2} strokeWidth="1.4" />
          <path d="M17 36 L17 20 C17 18 19 18 19 20 L19 15 C19 13 22 13 22 15 L22 13 C22 11 25 11 25 13 L25 15 C25 13 28 13 28 15 L28 21 C30 19 33 21 31 24 L29 36 Z" fill={c1} stroke="#FEF9C3" strokeWidth="1.3" />
          <circle cx="23.5" cy="27" r="2.2" fill="#FEF9C3" />
        </g>
      );
    }

    if (sectId === 'duong_mon') {
      if (skillIndex === 0) {
        // Throwing Daggers
        return (
          <g>
            <polygon points="39,10 27,18 30,21" fill={c2} stroke={c1} strokeWidth="1.2" />
            <polygon points="32,19 14,31 17,34" fill={c1} stroke={c2} strokeWidth="1.2" />
            <polygon points="36,27 20,38 23,40" fill={c1} stroke={c2} strokeWidth="1.1" opacity="0.85" />
          </g>
        );
      }
      if (skillIndex === 1) {
        // Poison Venom Cloud / Trap
        return (
          <g>
            <circle cx="24" cy="25" r="13" fill={c1} fillOpacity="0.22" stroke={c1} strokeWidth="1.8" />
            <path d="M24 10 C28 17 34 21 34 27 C34 33 29.5 37 24 37 C18.5 37 14 33 14 27 C14 21 20 17 24 10 Z" fill={c1} stroke={c2} strokeWidth="1.5" />
            <circle cx="21" cy="28" r="2" fill="#ECFCCB" opacity="0.8" />
          </g>
        );
      }
      if (skillIndex === 2) {
        // Mạn Thiên Hoa Vũ (Rain of Needles)
        return (
          <g>
            <path d="M12 11 L20 23 M22 8 L28 22 M33 10 L37 23 M10 24 L18 37 M21 24 L27 38 M31 24 L37 37" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="24" cy="24" r="14" fill="none" stroke={c1} strokeWidth="1.2" strokeDasharray="2 3" />
          </g>
        );
      }
      // Bạo Vũ Lê Hoa (Explosive Crossbow Lotus)
      return (
        <g>
          <polygon points="24,6 28,18 41,18 31,26 35,39 24,31 13,39 17,26 7,18 20,18" fill={c1} fillOpacity="0.35" stroke={c2} strokeWidth="1.6" />
          <circle cx="24" cy="24" r="5" fill={c2} />
        </g>
      );
    }

    if (sectId === 'nga_mi') {
      if (skillIndex === 0) {
        // Frost Sword Slash
        return (
          <g>
            <path d="M10 34 C14 16 28 10 39 12" fill="none" stroke={c2} strokeWidth="3" strokeLinecap="round" />
            <line x1="13" y1="36" x2="36" y2="12" stroke="#E0F2FE" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M10 30 L18 38" stroke={c1} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
      }
      if (skillIndex === 1) {
        // Phật Quang Phổ Chiếu (Healing Lotus)
        return (
          <g>
            <path d="M24 10 C29 17 29 27 24 35 C19 27 19 17 24 10 Z" fill={c2} stroke="#FFFFFF" strokeWidth="1.2" />
            <path d="M12 22 C18 20 22 26 24 35 C17 33 12 28 12 22 Z" fill={c1} stroke={c2} strokeWidth="1.2" />
            <path d="M36 22 C30 20 26 26 24 35 C31 33 36 28 36 22 Z" fill={c1} stroke={c2} strokeWidth="1.2" />
            <circle cx="24" cy="24" r="3" fill="#FEF9C3" />
          </g>
        );
      }
      if (skillIndex === 2) {
        // Frost Crystal Star
        return (
          <g>
            <path d="M24 7 L24 41 M7 24 L41 24 M12 12 L36 36 M36 12 L12 36" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
            <polygon points="24,14 34,24 24,34 14,24" fill={c1} fillOpacity="0.45" stroke="#E0F2FE" strokeWidth="1.4" />
          </g>
        );
      }
      // Tứ Tượng Đồng Quy (Four Frost Pillars)
      return (
        <g>
          <circle cx="24" cy="24" r="16" fill={c1} fillOpacity="0.22" stroke={c2} strokeWidth="1.8" />
          <circle cx="24" cy="13" r="3.5" fill={c2} />
          <circle cx="24" cy="35" r="3.5" fill={c2} />
          <circle cx="13" cy="24" r="3.5" fill={c2} />
          <circle cx="35" cy="24" r="3.5" fill={c2} />
          <circle cx="24" cy="24" r="5" fill="#FFFFFF" opacity="0.85" />
        </g>
      );
    }

    if (sectId === 'cai_bang') {
      if (skillIndex === 0) {
        // Flame Palm Strike
        return (
          <g>
            <path d="M24 8 C31 16 36 21 34 30 C32 36 28 39 24 39 C18 39 13 34 14 27 C15 21 19 18 19 13 C21 15 22 12 24 8 Z" fill={c1} stroke={c2} strokeWidth="1.6" />
            <path d="M24 19 C28 24 29 29 24 35 C20 31 19 26 24 19 Z" fill="#FEF08A" />
          </g>
        );
      }
      if (skillIndex === 1) {
        // Đả Cẩu Bổng Pháp (Jade Bamboo Staff)
        return (
          <g>
            <circle cx="24" cy="24" r="14" fill="none" stroke={c1} strokeWidth="2" strokeDasharray="10 6" />
            <line x1="11" y1="36" x2="37" y2="12" stroke="#4ADE80" strokeWidth="4" strokeLinecap="round" />
            <line x1="18" y1="29.5" x2="20" y2="27.5" stroke="#14532D" strokeWidth="3.5" />
            <line x1="27" y1="21" x2="29" y2="19" stroke="#14532D" strokeWidth="3.5" />
          </g>
        );
      }
      if (skillIndex === 2) {
        // Phi Long Tại Thiên (Twin Flame Arcs)
        return (
          <g>
            <path d="M9 32 C12 16 24 10 38 14" fill="none" stroke={c1} strokeWidth="3.2" strokeLinecap="round" />
            <path d="M12 38 C18 24 28 19 40 24" fill="none" stroke={c2} strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="36" cy="15" r="4" fill="#FEF08A" />
          </g>
        );
      }
      // Hàng Long Thập Bát Chưởng (Blazing Dragon Coil)
      return (
        <g>
          <path d="M12 35 C9 22 18 11 30 13 C38 14 39 24 33 28 C27 32 20 27 22 21 C24 17 30 18 30 22" fill="none" stroke={c1} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M12 35 C9 22 18 11 30 13 C38 14 39 24 33 28" fill="none" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />
          <polygon points="37,10 31,12 34,17" fill="#FEF08A" />
        </g>
      );
    }

    // Võ Đang (Default / Earth-Lightning / Taiji Swords)
    if (skillIndex === 0) {
      // Kiếm Phi Kinh Thiên
      return (
        <g>
          <line x1="11" y1="37" x2="36" y2="12" stroke="#F8FAFC" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M14 27 L21 34" stroke={c1} strokeWidth="2.8" strokeLinecap="round" />
          <path d="M25 10 L38 10 L38 23" fill="none" stroke={c2} strokeWidth="1.8" opacity="0.8" />
        </g>
      );
    }
    if (skillIndex === 1) {
      // Tọa Vọng Vô Ngã (Taiji Barrier)
      return (
        <g>
          <circle cx="24" cy="24" r="14" fill="#111827" stroke={c1} strokeWidth="2" />
          <path d="M24 10 A14 14 0 0 1 24 38 A7 7 0 0 1 24 24 A7 7 0 0 0 24 10 Z" fill={c2} />
          <circle cx="24" cy="17" r="2.2" fill="#111827" />
          <circle cx="24" cy="31" r="2.2" fill={c2} />
        </g>
      );
    }
    if (skillIndex === 2) {
      // Thiên Địa Vô Cực (Lightning Bolt)
      return (
        <g>
          <polygon points="27,7 14,25 23,25 19,41 35,21 25,21" fill={c1} stroke={c2} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      );
    }
    // Vạn Kiếm Quy Tông (Sword Rain)
    return (
      <g>
        <line x1="24" y1="7" x2="24" y2="39" stroke="#FEF9C3" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="14" y1="12" x2="14" y2="35" stroke={c1} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="34" y1="12" x2="34" y2="35" stroke={c1} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M19 14 L29 14 M10 18 L18 18 M30 18 L38 18" stroke={c2} strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={`block shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${uid}_bg`} cx="50%" cy="40%" r="68%">
          <stop offset="0%" stopColor={c2} stopOpacity={locked ? 0.14 : 0.44} />
          <stop offset="38%" stopColor={c1} stopOpacity={locked ? 0.08 : 0.22} />
          <stop offset="72%" stopColor={bgTop} stopOpacity="0.96" />
          <stop offset="100%" stopColor={bgBot} stopOpacity="1" />
        </radialGradient>
        <linearGradient id={`${uid}_rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={locked ? '#6B7280' : c2} stopOpacity="0.9" />
          <stop offset="50%" stopColor={locked ? '#4B5563' : c1} stopOpacity="0.65" />
          <stop offset="100%" stopColor={locked ? '#374151' : '#8A6D3B'} stopOpacity="0.9" />
        </linearGradient>
        <filter id={`${uid}_glow`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.6" floodColor={c1} floodOpacity={locked ? '0' : '0.75'} />
        </filter>
        <linearGradient id="hpGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="55%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#7F1D1D" />
        </linearGradient>
        <linearGradient id="mpGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="55%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
      {/* Background elemental plate */}
      <rect x="1" y="1" width="46" height="46" rx="2.5" fill={`url(#${uid}_bg)`} />
      {/* Subtle 2009 arcane circle watermark behind active skills */}
      {!locked && (
        <circle
          cx="24"
          cy="24"
          r="17"
          fill="none"
          stroke={c1}
          strokeOpacity="0.22"
          strokeWidth="0.9"
          strokeDasharray="3 2.5"
        />
      )}
      {/* Subtle 2009 glossy upper crystal sheen */}
      <path d="M2 2 L46 2 L46 16 Q24 23 2 16 Z" fill="#FFFFFF" opacity={locked ? 0.03 : 0.11} />
      {/* Luminous martial arts artwork */}
      <g filter={`url(#${uid}_glow)`}>{renderGlyph()}</g>
      {/* Metallic beveled border + 4 bronze corner filigree brackets */}
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="2"
        fill="none"
        stroke={`url(#${uid}_rim)`}
        strokeWidth="1.4"
      />
      <path
        d="M3 8 L3 3 L8 3 M40 3 L45 3 L45 8 M3 40 L3 45 L8 45 M40 45 L45 45 L45 40"
        fill="none"
        stroke={locked ? '#6B7280' : '#FEF08A'}
        strokeOpacity={locked ? 0.35 : 0.72}
        strokeWidth="1.25"
        strokeLinecap="square"
      />
    </svg>
  );
};
