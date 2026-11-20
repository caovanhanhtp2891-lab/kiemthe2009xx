import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MapPin,
  RefreshCw,
  Shield,
  Sparkles,
  Sword,
} from 'lucide-react';
import { ELEMENT_META, RANDOM_WUXIA_NAMES, SECT_ORDER, SECTS } from '../game/data';
import { getOrderedSectSkills } from '../game/engine';
import {
  catalogSkillToSkillDef,
  getBranchActiveSkills,
  getBranchPermanentPassives,
  getBranchTriggerPassives,
  getDefaultHotbarSkillIds,
  CATALOG_BY_ID,
} from '../game/fullSkillCatalog';
import { soundEngine } from '../game/sound';
import { Direction8 } from '../game/spriteAtlas';
import { ElementType, SectId } from '../game/types';
import { getBranchShowcaseProfile } from './branchShowcaseData';
import { PixelHeroPreview } from './PixelItemIcon';
import { SkillIcon } from './SkillIcon';
import cliffCloudsBackdrop from '../assets/images/wuxia_sect_cliff_clouds_1795082343541.jpg';

interface CharacterCreateProps {
  onBack: () => void;
  onConfirm: (name: string, sect: SectId, branchIndex: 0 | 1) => void;
}

type CreateStep = 'sect' | 'branch';

const STARTER_TOWNS = [
  { id: 'ba_lang', name: 'Ba Lăng Huyện' },
  { id: 'van_trung', name: 'Vân Trung Trấn' },
  { id: 'dao_huong', name: 'Đạo Hương Thôn' },
  { id: 'giang_tan', name: 'Giang Tân Thôn' },
] as const;

const DIR_LABELS: Record<Direction8, string> = {
  0: 'Nam',
  1: 'Đông Nam',
  2: 'Đông',
  3: 'Đông Bắc',
  4: 'Bắc',
  5: 'Tây Bắc',
  6: 'Tây',
  7: 'Tây Nam',
};

/** 6-axis combat radar profile matching classic Kiếm Thế hexagon:
 * [Sinh tồn, Quần chiến, Cơ động, Thao tác, Phụ trợ, Đơn chiến] (0..100)
 */
const SECT_RADAR_SCORES: Record<SectId, [number, number, number, number, number, number]> = {
  thieu_lam: [96, 84, 58, 55, 72, 76],
  thien_vuong: [92, 76, 70, 62, 66, 90],
  duong_mon: [54, 82, 95, 92, 58, 88],
  ngu_doc: [76, 90, 72, 78, 82, 80],
  minh_giao: [78, 86, 84, 74, 65, 86],
  nga_mi: [84, 72, 62, 56, 98, 60],
  thuy_yen: [64, 70, 94, 90, 62, 92],
  doan_thi: [74, 80, 82, 80, 76, 86],
  cai_bang: [76, 94, 86, 76, 58, 82],
  thien_nhan: [68, 92, 78, 82, 64, 86],
  vo_dang: [82, 84, 78, 76, 74, 88],
  con_lon: [68, 90, 80, 84, 86, 78],
};

const RADAR_AXES = [
  { label: 'Sinh tồn', angle: -90 },
  { label: 'Quần chiến', angle: -30 },
  { label: 'Cơ động', angle: 30 },
  { label: 'Thao tác', angle: 90 },
  { label: 'Phụ trợ', angle: 150 },
  { label: 'Đơn chiến', angle: 210 },
] as const;

/** Custom circular sculpted SVG emblem for each of the 12 iconic Kiếm Thế sects */
const SectMedallionIcon: React.FC<{ sectId: SectId }> = ({ sectId }) => {
  switch (sectId) {
    case 'thieu_lam':
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="url(#slBg)" />
          {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <circle
                key={deg}
                cx={24 + Math.cos(rad) * 14.5}
                cy={24 + Math.sin(rad) * 14.5}
                r="3.2"
                fill="url(#slBead)"
                stroke="#78350F"
                strokeWidth="0.9"
              />
            );
          })}
          <text
            x="24"
            y="29"
            textAnchor="middle"
            fill="#FEF08A"
            fontSize="16"
            fontWeight="800"
            fontFamily="serif"
          >
            佛
          </text>
          <defs>
            <radialGradient id="slBg" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#92400E" />
              <stop offset="100%" stopColor="#1C1208" />
            </radialGradient>
            <radialGradient id="slBead" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="100%" stopColor="#B45309" />
            </radialGradient>
          </defs>
        </svg>
      );
    case 'thien_vuong':
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="url(#tvBg)" />
          <path
            d="M11 30c2-8 7-15 16-17-2 4-1 7 2 8-4 2-5 5-4 9 3-2 7-2 10 0-4 5-12 7-20 4l-4-4Z"
            fill="url(#tvGold)"
            stroke="#78350F"
            strokeWidth="1.2"
          />
          <path d="M23 14l10-4-4 8" fill="#FEF08A" stroke="#92400E" strokeWidth="1" />
          <circle cx="24" cy="22" r="2" fill="#451A03" />
          <defs>
            <radialGradient id="tvBg" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#713F12" />
              <stop offset="100%" stopColor="#16110A" />
            </radialGradient>
            <linearGradient id="tvGold" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FEF08A" />
              <stop offset="1" stopColor="#CA8A04" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'duong_mon':
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#091C1A" />
          <path
            d="M24 5l4 10 10-4-4 10 10 4-10 4 4 10-10-4-4 10-4-10-10 4 4-10-10-4 10-4-4-10 10 4 4-10Z"
            fill="url(#dmJade)"
            stroke="#CCFBF1"
            strokeWidth="1"
          />
          <circle cx="24" cy="24" r="6" fill="#062320" stroke="#5EEAD4" strokeWidth="1.6" />
          <circle cx="24" cy="24" r="2.2" fill="#99F6E4" />
          <defs>
            <radialGradient id="dmJade" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#5EEAD4" />
              <stop offset="100%" stopColor="#0F766E" />
            </radialGradient>
          </defs>
        </svg>
      );
    case 'ngu_doc':
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#081C12" />
          <path
            d="M15 34c-4-4-5-11-1-16 3-3 6-2 6 1-2 2-2 5 0 7m13 8c4-4 5-11 1-16-3-3-6-2-6 1 2 2 2 5 0 7"
            stroke="#4ADE80"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M24 12c3 4 4 10 0 18-4-8-3-14 0-18Z"
            fill="#22C55E"
            stroke="#DCFCE7"
            strokeWidth="1.1"
          />
          <path d="M24 30c0 5 4 7 7 5" stroke="#86EFAC" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="21.5" cy="19" r="1.2" fill="#052E16" />
          <circle cx="26.5" cy="19" r="1.2" fill="#052E16" />
        </svg>
      );
    case 'minh_giao':
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#091F16" />
          <path
            d="M24 8c5 7 9 11 9 18a9 9 0 1 1-18 0c0-7 4-11 9-18Z"
            fill="url(#mgFlame)"
            stroke="#BBF7D0"
            strokeWidth="1.1"
          />
          <path d="M24 17c3 4 4 7 4 11a4 4 0 0 1-8 0c0-4 1-7 4-11Z" fill="#FEF08A" />
          <path d="M12 29c3 6 9 9 12 9s9-3 12-9" stroke="#34D399" strokeWidth="1.6" strokeLinecap="round" />
          <defs>
            <linearGradient id="mgFlame" x1="24" y1="8" x2="24" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#86EFAC" />
              <stop offset="1" stopColor="#047857" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'nga_mi':
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#230E1D" />
          <path d="M24 10c4 6 5 12 0 19-5-7-4-13 0-19Z" fill="#F472B6" stroke="#FCE7F3" strokeWidth="1" />
          <path d="M14 16c6 3 10 8 10 15-7-2-11-7-10-15Z" fill="#EC4899" stroke="#FBCFE8" strokeWidth="1" />
          <path d="M34 16c-6 3-10 8-10 15 7-2 11-7 10-15Z" fill="#EC4899" stroke="#FBCFE8" strokeWidth="1" />
          <path d="M10 26c6 0 11 3 14 7-6 2-12 0-14-7Z" fill="#DB2777" />
          <path d="M38 26c-6 0-11 3-14 7 6 2 12 0 14-7Z" fill="#DB2777" />
          <ellipse cx="24" cy="34" rx="11" ry="3.2" fill="#F9A8D4" fillOpacity="0.45" />
        </svg>
      );
    case 'thuy_yen':
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#1E0E24" />
          <path
            d="M24 11c5 1 9 5 9 10 0 6-5 11-9 14-4-3-9-8-9-14 0-5 4-9 9-10Z"
            fill="url(#tyGrad)"
            stroke="#F5D0FE"
            strokeWidth="1.1"
          />
          <path
            d="M14 23c3-4 8-5 10 0 2-5 7-4 10 0-2 5-6 9-10 10-4-1-8-5-10-10Z"
            fill="#E879F9"
            fillOpacity="0.65"
          />
          <circle cx="24" cy="22" r="3" fill="#FDF4FF" />
          <defs>
            <linearGradient id="tyGrad" x1="24" y1="11" x2="24" y2="35" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F0ABFC" />
              <stop offset="1" stopColor="#86198F" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'doan_thi':
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#0A1931" />
          <polygon
            points="24,6 27,18 39,12 30,22 42,24 30,26 39,36 27,30 24,42 21,30 9,36 18,26 6,24 18,22 9,12 21,18"
            fill="url(#dtStar)"
            stroke="#E0F2FE"
            strokeWidth="0.9"
          />
          <circle cx="24" cy="24" r="3.2" fill="#FFFFFF" />
          <defs>
            <radialGradient id="dtStar" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#BAE6FD" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </radialGradient>
          </defs>
        </svg>
      );
    case 'cai_bang':
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#23140A" />
          <path d="M13 36L35 12" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
          <circle cx="22" cy="18" r="5.5" fill="url(#cbGourd)" stroke="#FEF3C7" strokeWidth="1" />
          <circle cx="25" cy="29" r="8" fill="url(#cbGourd)" stroke="#FEF3C7" strokeWidth="1" />
          <path d="M19 22h9" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
          <defs>
            <radialGradient id="cbGourd" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#B45309" />
            </radialGradient>
          </defs>
        </svg>
      );
    case 'thien_nhan':
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#260A0A" />
          <path
            d="M12 15l6 6 6-11 6 11 6-6-2 15-10 9-10-9-2-15Z"
            fill="url(#tnFire)"
            stroke="#FECACA"
            strokeWidth="1.1"
          />
          <path d="M18 25l6 3 6-3" stroke="#450A0A" strokeWidth="2" strokeLinecap="round" />
          <circle cx="19" cy="22" r="1.8" fill="#FEF08A" />
          <circle cx="29" cy="22" r="1.8" fill="#FEF08A" />
          <defs>
            <linearGradient id="tnFire" x1="24" y1="10" x2="24" y2="39" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FB923C" />
              <stop offset="1" stopColor="#991B1B" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'vo_dang':
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#1C1915" />
          <circle cx="24" cy="24" r="15.5" fill="#FDE68A" stroke="#CA8A04" strokeWidth="1.5" />
          <path
            d="M24 8.5A15.5 15.5 0 0 1 24 39.5A7.75 7.75 0 0 1 24 24A7.75 7.75 0 0 0 24 8.5Z"
            fill="#1E293B"
          />
          <circle cx="24" cy="16.25" r="2.7" fill="#1E293B" />
          <circle cx="24" cy="31.75" r="2.7" fill="#FDE68A" />
        </svg>
      );
    case 'con_lon':
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#191026" />
          <path
            d="M24 9c8 0 14 6 12 14-2 6-8 8-12 6 4 0 7-3 7-7 0-5-4-8-9-8-6 0-11 5-11 11 0 7 6 13 14 13"
            stroke="#E879F9"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path d="M26 15l-6 9h6l-4 9" stroke="#FEF08A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
};

/** Authentic 6-Axis Hexagonal Radar Chart matching Image 1 */
const SectHexRadar: React.FC<{
  scores: [number, number, number, number, number, number];
  accentColor: string;
}> = ({ scores, accentColor }) => {
  const cx = 112;
  const cy = 94;
  const maxR = 62;
  const rings = [0.33, 0.66, 1];

  const pt = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
  };

  const hexPoints = (scale: number) =>
    RADAR_AXES.map((a) => {
      const p = pt(a.angle, maxR * scale);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ');

  const valuePoints = scores
    .map((val, idx) => {
      const p = pt(RADAR_AXES[idx].angle, (maxR * Math.max(22, val)) / 100);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 224 188" className="mx-auto h-[166px] w-[206px] sm:h-[180px] sm:w-[220px]" role="img" aria-label="Biểu đồ năng lực môn phái">
      <defs>
        <radialGradient id="ktRadarFill" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#A3E635" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#BEF264" stopOpacity="0.72" />
        </radialGradient>
        <filter id="ktRadarGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Concentric Hex Rings */}
      {rings.map((s) => (
        <polygon
          key={s}
          points={hexPoints(s)}
          fill={s === 1 ? 'rgba(9, 18, 22, 0.56)' : 'none'}
          stroke="rgba(167, 224, 210, 0.28)"
          strokeWidth={s === 1 ? 1.2 : 0.8}
        />
      ))}

      {/* Spokes */}
      {RADAR_AXES.map((a) => {
        const end = pt(a.angle, maxR);
        return (
          <line
            key={a.label}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke="rgba(167, 224, 210, 0.22)"
            strokeWidth="0.9"
          />
        );
      })}

      {/* Luminous Value Polygon */}
      <polygon
        points={valuePoints}
        fill="url(#ktRadarFill)"
        stroke="#ECFCCB"
        strokeWidth="1.9"
        filter="url(#ktRadarGlow)"
      />

      {/* Vertex Dots */}
      {scores.map((val, idx) => {
        const p = pt(RADAR_AXES[idx].angle, (maxR * Math.max(22, val)) / 100);
        return (
          <circle
            key={RADAR_AXES[idx].label}
            cx={p.x}
            cy={p.y}
            r="2.6"
            fill="#FEF9C3"
            stroke={accentColor}
            strokeWidth="1"
          />
        );
      })}

      {/* 6 Vietnamese Axis Labels */}
      {RADAR_AXES.map((a) => {
        const labelR = a.angle === -90 || a.angle === 90 ? maxR + 16 : maxR + 24;
        const p = pt(a.angle, labelR);
        return (
          <text
            key={a.label}
            x={p.x}
            y={p.y + 3.5}
            textAnchor="middle"
            fill="#F1F7F4"
            fontSize="11.5"
            fontWeight="600"
            className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
};

interface BranchArtworkProps {
  src: string;
  alt: string;
  tintColor: string;
  accentColor: string;
  weaponLabel: string;
  className?: string;
}

const BranchArtwork: React.FC<BranchArtworkProps> = ({
  src,
  alt,
  tintColor,
  accentColor,
  weaponLabel,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-1.5 ${className}`}
        style={{
          background: `radial-gradient(circle at 50% 35%, ${accentColor}33 0%, #0D1418 75%)`,
        }}
      >
        <Sword className="h-8 w-8 opacity-80" style={{ color: accentColor }} />
        <span className="font-wuxia text-xs font-bold text-[#F4E8CD]">{weaponLabel}</span>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div
        className="pointer-events-none absolute inset-0 mix-blend-screen opacity-70"
        style={{
          background: `radial-gradient(ellipse at 50% 42%, ${tintColor} 0%, transparent 72%)`,
        }}
      />
    </div>
  );
};

export const CharacterCreate: React.FC<CharacterCreateProps> = ({ onBack, onConfirm }) => {
  const [step, setStep] = useState<CreateStep>('sect');
  const [name, setName] = useState(
    () => RANDOM_WUXIA_NAMES[Math.floor(Math.random() * RANDOM_WUXIA_NAMES.length)]
  );
  const [selectedSect, setSelectedSect] = useState<SectId>('ngu_doc');
  const [selectedBranch, setSelectedBranch] = useState<0 | 1>(0);
  const [sectListExpanded, setSectListExpanded] = useState(true);
  const [selectedTown, setSelectedTown] = useState<string>('ba_lang');
  const [heroDir, setHeroDir] = useState<Direction8>(1);
  const [heroPose, setHeroPose] = useState<'idle' | 'walk' | 'attack'>('idle');
  const [bgFailed, setBgFailed] = useState(false);

  const sect = SECTS[selectedSect];
  const elem = ELEMENT_META[sect.element];
  const countersElem = ELEMENT_META[elem.counters];
  const counteredByElem = ELEMENT_META[elem.counteredBy];
  const activeTown = STARTER_TOWNS.find((t) => t.id === selectedTown) || STARTER_TOWNS[0];
  const selectedBranchName = sect.branches[selectedBranch] ?? sect.branches[0];
  const radarScores = SECT_RADAR_SCORES[selectedSect];

  const orderedSkills = useMemo(
    () => getOrderedSectSkills(selectedSect, selectedBranch),
    [selectedSect, selectedBranch]
  );

  const branchCardsData = useMemo(
    () =>
      sect.branches.map((branchName, bIdx) => {
        const idx = (bIdx === 0 ? 0 : 1) as 0 | 1;
        const isSelected = selectedBranch === idx;
        const profile = getBranchShowcaseProfile(selectedSect, branchName);
        const allActive = getBranchActiveSkills(selectedSect, idx);
        const permPassives = getBranchPermanentPassives(selectedSect, idx);
        const trigPassives = getBranchTriggerPassives(selectedSect, idx);
        const defaultIds = getDefaultHotbarSkillIds(selectedSect, idx);
        // Showcase 4 iconic milestones per branch: Starter Lv.10, Core Lv.90, Tuyệt Kỹ 150, Chân Truyền 180
        const pickedIds = [
          defaultIds[0],
          defaultIds[2],
          defaultIds[4],
          defaultIds[5],
        ].filter(Boolean);
        const keySlots = ['1', '2', '3', '4', '5', '6'] as const;
        const skills = pickedIds.map((sid, localIdx) => {
          const cat = CATALOG_BY_ID[sid] || allActive[localIdx] || allActive[0];
          const def = catalogSkillToSkillDef(cat, keySlots[localIdx] ?? '1');
          const tierTag =
            cat.unlockLevel === 180
              ? 'Chân Truyền 180'
              : cat.unlockLevel === 150
              ? 'Tuyệt Kỹ 150'
              : cat.unlockLevel === 125
              ? 'Trấn Phái 125'
              : `Lv.${cat.unlockLevel}`;
          return {
            ...def,
            tierTag,
            vfxMotif: cat.vfxMotif,
          };
        });
        return {
          idx,
          branchName,
          isSelected,
          profile,
          skills,
          totalActive: allActive.length,
          totalPerm: permPassives.length,
          totalTrig: trigPassives.length,
          signaturePassive: permPassives[permPassives.length - 1] || permPassives[0],
        };
      }),
    [sect, selectedSect, selectedBranch]
  );

  const handleSelectSect = (sid: SectId) => {
    setSelectedSect(sid);
    setSelectedBranch(0);
    setHeroPose('idle');
    soundEngine.playSlash();
  };

  const handleGoToBranchStep = (preselectBranch?: 0 | 1) => {
    if (typeof preselectBranch === 'number') {
      setSelectedBranch(preselectBranch);
    }
    setStep('branch');
    setHeroPose('attack');
    soundEngine.playSlash();
  };

  const handleBackToSectStep = () => {
    setStep('sect');
    setHeroPose('idle');
    soundEngine.playLoot();
  };

  const handleSelectBranch = (bIdx: 0 | 1) => {
    setSelectedBranch(bIdx);
    setHeroPose('attack');
    soundEngine.playLoot();
  };

  const handleRandomName = () => {
    const others = RANDOM_WUXIA_NAMES.filter((n) => n !== name);
    setName(others[Math.floor(Math.random() * others.length)]);
    soundEngine.playLoot();
  };

  const handleRotate = (delta: number) => {
    setHeroDir((prev) => (((prev + delta) % 8 + 8) % 8) as Direction8);
  };

  const finalizeCreate = () => {
    const cleaned = name.trim();
    if (!cleaned) return;
    try {
      localStorage.setItem('vlkt_starter_town', activeTown.name);
    } catch {
      // ignore storage quota errors
    }
    onConfirm(cleaned, selectedSect, selectedBranch);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    finalizeCreate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex h-dvh w-screen flex-col overflow-hidden bg-[#102638] text-[#F4F8F6] select-none"
    >
      {/* Panoramic Daytime Wuxia Mountain Cliff & Sea of Clouds Backdrop */}
      {!bgFailed ? (
        <img
          src={cliffCloudsBackdrop}
          alt="Đỉnh núi mây trời chọn môn phái Kiếm Thế"
          referrerPolicy="no-referrer"
          onError={() => setBgFailed(true)}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#2474B5_0%,#7BC3E8_48%,#1B2F2C_100%)]" />
      )}

      {/* Measured Right-Side Ink Scrim for Crisp Dossier Legibility + Subtle Bottom Scrim */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[44%] bg-gradient-to-l from-[#070E12]/92 via-[#09141A]/78 to-transparent sm:w-[370px] lg:w-[410px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#060D11]/92 via-[#060D11]/45 to-transparent" />
      {step === 'branch' && (
        <div className="pointer-events-none absolute inset-0 bg-[#071117]/62 backdrop-blur-[2px]" />
      )}

      {/* ================= STEP 1: CHỌN MÔN PHÁI (Panoramic Cliff + 12 Circular Medallions + Hex Radar) ================= */}
      {step === 'sect' ? (
        <main className="relative z-10 flex flex-1 min-h-0 w-full items-stretch justify-between px-3 pt-3 pb-1 sm:px-5 sm:pt-4">
          {/* LEFT FLOATING MEDALLION GRID: "Môn Phái" + 3x4 Circular Sect Insignias */}
          <aside className="flex w-[198px] sm:w-[228px] shrink-0 flex-col gap-2.5">
            {/* Sleek Jade Môn Phái Header Ribbon */}
            <button
              type="button"
              onClick={() => setSectListExpanded((v) => !v)}
              className="flex w-[176px] items-center gap-2.5 rounded-full border border-[#7ED8C2]/65 bg-gradient-to-r from-[#0E2B2A]/90 via-[#15423E]/85 to-[#0E2B2A]/25 px-1.5 py-1 text-left shadow-[0_4px_14px_rgba(0,0,0,0.45)] cursor-pointer"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#8AE8D1]/80 bg-[#1B534B] text-[#E6FFFA]">
                {sectListExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
              <span className="font-wuxia text-[16px] font-bold tracking-wide text-[#F2FFFB] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                Môn Phái
              </span>
            </button>

            {/* 12 Circular Medallion Emblems (3 Columns × 4 Rows) */}
            {sectListExpanded && (
              <div className="grid grid-cols-3 gap-x-2.5 gap-y-2.5 pr-1 overflow-y-auto">
                {SECT_ORDER.map((sid) => {
                  const s = SECTS[sid];
                  const active = sid === selectedSect;
                  return (
                    <button
                      key={sid}
                      type="button"
                      onClick={() => handleSelectSect(sid)}
                      onDoubleClick={() => {
                        handleSelectSect(sid);
                        setStep('branch');
                        setHeroPose('attack');
                      }}
                      title={`${s.name} · Hệ ${s.elementName} (${s.branches.join(' / ')})`}
                      className="group flex flex-col items-center gap-0.5 cursor-pointer"
                    >
                      <div
                        className={`relative h-[52px] w-[52px] sm:h-[58px] sm:w-[58px] rounded-full p-[2.5px] transition-transform duration-150 group-hover:scale-105 ${
                          active
                            ? 'bg-gradient-to-b from-[#FEF08A] via-[#F59E0B] to-[#FFFBEB] shadow-[0_0_18px_rgba(253,224,71,0.92),0_0_6px_rgba(255,255,255,0.8)] scale-105'
                            : 'bg-gradient-to-b from-[#A8C4C2]/80 via-[#4A6364]/80 to-[#1F2D2F]/90 shadow-[0_4px_10px_rgba(0,0,0,0.6)]'
                        }`}
                      >
                        <div className="h-full w-full overflow-hidden rounded-full border border-[#0B1416]">
                          <SectMedallionIcon sectId={sid} />
                        </div>
                      </div>
                      <span
                        className={`max-w-[66px] truncate text-[10px] font-semibold tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] ${
                          active ? 'text-[#FEF08A]' : 'text-[#ECF6F3]/92 group-hover:text-white'
                        }`}
                      >
                        {s.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* CENTER OPEN MOUNTAIN CLIFF STAGE: Hero on Luminous Golden Pedestal Ring */}
          <section className="relative hidden flex-1 min-w-0 flex-col items-center justify-end pb-4 md:flex">
            {/* Authentic Kiếm Thế 3-Line Overhead Preview directly above Hero */}
            <div className="mb-1 flex flex-col items-center text-center leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              <span className="text-[11.5px] font-bold tracking-wide text-[#FB923C]">
                Tân Thủ Giang Hồ
              </span>
              <span className="text-[10.5px] font-semibold text-[#E2F5EC]">
                [Môn phái]{sect.name}.Đệ tử
              </span>
              <div className="flex items-center gap-1 text-[11.5px] font-bold">
                <span className="text-[#93C5FD]">&lt;Sơ Nhập&gt;</span>
                <span className="text-[#86EFAC]">
                  {name.trim() || 'Vô Danh Hiệp Khách'}
                </span>
                <span className="text-[#E2F5EC]">[{sect.name}.1]</span>
              </div>
            </div>

            {/* Hero Character Standing on Luminous Golden Crescent Cliff Pedestal */}
            <div className="relative flex items-center justify-center">
              {/* Outer Golden Halo Ring on Cliff Rock */}
              <div
                className="pointer-events-none absolute bottom-3 h-14 w-56 rounded-full border-2 opacity-90"
                style={{
                  borderColor: '#FDE68A',
                  background:
                    'radial-gradient(ellipse at center, rgba(254,240,138,0.28) 0%, rgba(245,158,11,0.14) 52%, transparent 78%)',
                  boxShadow:
                    '0 0 24px rgba(251, 191, 36, 0.6), inset 0 0 14px rgba(254, 240, 138, 0.4)',
                }}
              />
              {/* Soft Sect Element Floor Glow */}
              <div
                className="pointer-events-none absolute bottom-5 h-10 w-40 rounded-full blur-lg opacity-55"
                style={{ backgroundColor: sect.color }}
              />

              <div className="relative z-10 pb-3">
                <PixelHeroPreview
                  sectId={selectedSect}
                  width={230}
                  height={210}
                  scale={2.05}
                  transparentBg
                  hideControls
                  interactive
                  dirOverride={heroDir}
                  animOverride={heroPose}
                  onDirChange={setHeroDir}
                />
              </div>
            </div>

            {/* Minimal Translucent Rotate & Stance Controls */}
            <div className="mt-1 flex items-center gap-1.5 rounded border border-[#7AB5AE]/45 bg-[#08151A]/75 px-2 py-1 backdrop-blur-[2px]">
              <button
                type="button"
                onClick={() => handleRotate(-1)}
                title="Xoay trái"
                className="flex h-6 w-6 items-center justify-center rounded border border-[#5B8782]/60 bg-[#11262A]/85 text-[#D8F3EC] hover:border-[#FDE047] hover:text-[#FEF08A] cursor-pointer"
                aria-label="Xoay trái"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="w-14 text-center font-mono text-[10px] text-[#DCEEE8]">
                {DIR_LABELS[heroDir]}
              </span>
              <button
                type="button"
                onClick={() => handleRotate(1)}
                title="Xoay phải"
                className="flex h-6 w-6 items-center justify-center rounded border border-[#5B8782]/60 bg-[#11262A]/85 text-[#D8F3EC] hover:border-[#FDE047] hover:text-[#FEF08A] cursor-pointer"
                aria-label="Xoay phải"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <span className="mx-0.5 h-4 w-px bg-[#4E7470]/60" aria-hidden="true" />
              {(
                [
                  { id: 'idle', label: 'Đứng' },
                  { id: 'walk', label: 'Đi' },
                  { id: 'attack', label: 'Chiêu' },
                ] as const
              ).map((pose) => (
                <button
                  key={pose.id}
                  type="button"
                  onClick={() => setHeroPose(pose.id)}
                  className={`h-6 px-2 text-[10px] font-semibold rounded border transition-colors cursor-pointer whitespace-nowrap ${
                    heroPose === pose.id
                      ? 'border-[#FDE047] bg-[#2D453E] text-[#FEF08A]'
                      : 'border-transparent bg-transparent text-[#C2DCD5] hover:text-white'
                  }`}
                >
                  {pose.label}
                </button>
              ))}
            </div>
          </section>

          {/* RIGHT TRANSLUCENT SECT DOSSIER: Element Diamond + Glowing Title + Lore + 6-Axis Hex Radar + 2 Branch Diamonds */}
          <aside className="flex w-full max-w-[330px] shrink-0 flex-col justify-between overflow-y-auto pl-2 pr-1 pb-2 sm:w-[310px] lg:w-[345px]">
            <div>
              {/* Top Row: Element Diamond Crest + Quick Switch to Step 2 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 rotate-45 items-center justify-center border-2 bg-[#0B1B1D]/90 shadow-[0_0_12px_rgba(0,0,0,0.6)]"
                    style={{ borderColor: elem.color }}
                  >
                    <span
                      className="-rotate-45 text-[11px] font-bold leading-none"
                      style={{ color: elem.color }}
                    >
                      {elem.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#C8DDD6]">
                    Khắc <strong style={{ color: countersElem.color }}>{countersElem.name}</strong> · Kỵ{' '}
                    <strong style={{ color: counteredByElem.color }}>{counteredByElem.name}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGoToBranchStep()}
                  className="flex items-center gap-1 rounded border border-[#7ED8C2]/55 bg-[#0F2A2A]/80 px-2 py-1 text-[10.5px] font-semibold text-[#B9F6E8] hover:border-[#FDE047] hover:text-[#FEF08A] cursor-pointer whitespace-nowrap"
                >
                  <span>Xem 2 Hướng</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Large Glowing Sect Name */}
              <h1
                className="mt-1.5 text-center font-wuxia text-[34px] sm:text-[40px] font-extrabold leading-none tracking-wide"
                style={{
                  color: sect.color,
                  textShadow: `0 0 22px ${sect.color}88, 0 2px 6px rgba(0,0,0,0.95)`,
                }}
              >
                {sect.name}
              </h1>

              {/* Lore Summary */}
              <p className="mt-2.5 text-[12px] leading-[1.52] text-[#E6F1ED] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {sect.summary} Sử dụng{' '}
                <strong className="text-[#FEF08A]">{sect.weaponType}</strong>, gồm hai nhánh võ học{' '}
                <strong className="text-[#A7F3D0]">{sect.branches[0]}</strong> và{' '}
                <strong className="text-[#A7F3D0]">{sect.branches[1]}</strong>.
              </p>

              {/* Authentic 6-Axis Hexagonal Radar Chart */}
              <div className="mt-1.5">
                <SectHexRadar scores={radarScores} accentColor={sect.color} />
              </div>
            </div>

            {/* Bottom of Right Column: Dual Diamond Branch Selectors (echoing Image 1's dual diamonds) + Starter Town */}
            <div className="space-y-2.5">
              {/* 2 Ornate Diamond Branch Selectors */}
              <div className="flex items-center justify-center gap-7 pt-1">
                {branchCardsData.map((card) => {
                  const isSel = card.isSelected;
                  return (
                    <button
                      key={card.branchName}
                      type="button"
                      onClick={() => handleSelectBranch(card.idx)}
                      onDoubleClick={() => handleGoToBranchStep(card.idx)}
                      title={`Chọn nhánh ${card.branchName} (${card.profile.weaponLabel}) — Nhấn đúp xem chi tiết`}
                      className="group flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <div
                        className={`flex h-10 w-10 rotate-45 items-center justify-center border-2 transition-all ${
                          isSel
                            ? 'border-[#D9F99D] bg-gradient-to-br from-[#6EE7B7] to-[#2B8A78] text-[#07261E] shadow-[0_0_16px_rgba(110,231,183,0.75)] scale-105'
                            : 'border-[#5E8682]/80 bg-[#0F2426]/80 text-[#9AD2C6] hover:border-[#A7F3D0]'
                        }`}
                      >
                        <span className="-rotate-45 font-wuxia text-[12px] font-extrabold leading-none">
                          {card.branchName.slice(0, 4)}
                        </span>
                      </div>
                      <span
                        className={`text-[10.5px] font-semibold whitespace-nowrap ${
                          isSel ? 'text-[#FEF08A]' : 'text-[#C6DDD6]'
                        }`}
                      >
                        Hướng {card.branchName}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Compact Starter Town Selector */}
              <div className="border-t border-[#4B7572]/45 pt-2">
                <div className="mb-1 flex items-center justify-between text-[10px] text-[#B8D8CE]">
                  <span className="flex items-center gap-1 font-semibold">
                    <MapPin className="h-3 w-3 text-[#6EE7B7]" />
                    Tân Thủ Thôn
                  </span>
                  <span className="text-[#FDE68A]">{activeTown.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {STARTER_TOWNS.map((town) => {
                    const active = town.id === selectedTown;
                    return (
                      <button
                        key={town.id}
                        type="button"
                        onClick={() => setSelectedTown(town.id)}
                        className={`truncate rounded-[2px] border px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                          active
                            ? 'border-[#86EFAC] bg-[#164A3E]/90 text-[#FEF3C7]'
                            : 'border-[#3C5C5B]/75 bg-[#0A181B]/75 text-[#B4CEC6] hover:border-[#86EFAC]/70 hover:text-white'
                        }`}
                      >
                        {town.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </main>
      ) : (
        /* ================= STEP 2: CHỌN HƯỚNG CHIẾN ĐẤU (Visual Combat-Style Artwork Showcase) ================= */
        <main className="relative z-10 mx-auto flex w-full max-w-[1380px] flex-1 min-h-0 flex-col gap-2.5 overflow-hidden px-3 py-3 sm:px-5">
          {/* Compact Top Chosen-Sect Summary Ribbon */}
          <section className="kt-window flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-1.5 sm:flex-nowrap">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[#F5D061]">
                <SectMedallionIcon sectId={selectedSect} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span
                    className="font-wuxia text-base font-bold leading-tight sm:text-lg"
                    style={{ color: sect.color }}
                  >
                    {sect.name} · Chọn Hướng Võ Học
                  </span>
                  <span className="text-[11px] text-[#C8D6CE] whitespace-nowrap">
                    Hệ <strong style={{ color: elem.color }}>{elem.name}</strong> · Khắc{' '}
                    <strong style={{ color: countersElem.color }}>{countersElem.name}</strong> ·{' '}
                    {activeTown.name}
                  </span>
                </div>
                <p className="truncate text-[11px] text-[#D1C9B8]">
                  Mỗi nhánh sở hữu trọn bộ võ học <strong className="font-mono text-[#F5D061]">Lv.10 – 180</strong> (Chủ động, Tâm pháp &amp; Kích hoạt) — có thể đổi nhánh miễn phí ngoài giao tranh.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden text-[11px] text-[#B8CABF] lg:inline whitespace-nowrap">
                Đang chọn:{' '}
                <strong className="font-wuxia text-sm text-[#FEF3C7]">
                  Hướng {selectedBranchName}
                </strong>
              </span>
              <button
                type="button"
                onClick={handleBackToSectStep}
                className="kt-btn-bronze flex h-8 items-center gap-1.5 px-2.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Đổi Môn Phái</span>
              </button>
            </div>
          </section>

          {/* 2-Column Side-by-Side Branch Artwork Cards */}
          <section
            role="radiogroup"
            aria-label={`Chọn hướng chiến đấu cho phái ${sect.name}`}
            className="flex-1 min-h-0 overflow-y-auto pr-0.5"
          >
            <div className="grid min-h-full grid-cols-1 gap-3 md:grid-cols-2 lg:gap-4">
              {branchCardsData.map((card) => {
                const {
                  idx,
                  branchName,
                  isSelected,
                  profile,
                  skills,
                  totalActive,
                  totalPerm,
                  totalTrig,
                  signaturePassive,
                } = card;
                return (
                  <button
                    key={branchName}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectBranch(idx)}
                    className={`group kt-window flex flex-col overflow-hidden text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#F5D061] ring-1 ring-[#F5D061]/85 shadow-[0_0_26px_rgba(245,208,97,0.22)]'
                        : 'opacity-90 hover:border-[#C9A85C] hover:opacity-100'
                    }`}
                  >
                    <div className="relative h-40 w-full shrink-0 overflow-hidden border-b border-[#404C53] bg-[#0B1013] sm:h-44 lg:h-48">
                      <BranchArtwork
                        src={profile.image}
                        alt={profile.imageAlt}
                        tintColor={profile.tintColor}
                        accentColor={sect.color}
                        weaponLabel={profile.weaponLabel}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090D0F] via-[#090D0F]/55 to-[#090D0F]/20" />

                      <div className="absolute inset-x-3 top-2.5 flex items-center justify-between gap-2">
                        <span className="border border-[#5A4D33] bg-[#0B1013]/85 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#E8D5A7]">
                          NHÁNH {idx + 1} · {branchName.toUpperCase()}
                        </span>

                        <span
                          className={`flex items-center gap-1 border px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap ${
                            isSelected
                              ? 'border-[#F5D061] bg-[#2D240E]/92 text-[#FEF3C7]'
                              : 'border-[#48565E] bg-[#0B1013]/80 text-[#B8C4BC]'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#4ADE80]" />
                              <span>Đang Chọn · Nhánh Chính</span>
                            </>
                          ) : (
                            <span>Nhấn Để Chọn Nhánh Này</span>
                          )}
                        </span>
                      </div>

                      <div className="absolute inset-x-3 bottom-2.5">
                        <h2 className="font-wuxia text-xl font-bold tracking-wide text-[#FEF3C7] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] lg:text-2xl">
                          {sect.name} · Hướng {branchName}
                        </h2>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] font-medium text-[#DBE5DF]">
                          <span style={{ color: isSelected ? '#F5D061' : sect.color }}>
                            {profile.weaponLabel}
                          </span>
                          <span className="text-[#788C81]" aria-hidden="true">
                            ·
                          </span>
                          <span>{profile.rangeLabel}</span>
                          <span className="text-[#788C81]" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-[#D4CAB2]">{profile.roleLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-2 bg-[#101518]/96 p-3">
                      <p className="text-[11px] leading-relaxed text-[#E3D8BE]">
                        {profile.styleSummary}
                      </p>

                      <div className="flex items-center justify-between border-b border-[#344149] pb-1 text-[10.5px] font-bold">
                        <span
                          className={`flex items-center gap-1.5 ${
                            isSelected ? 'text-[#F5D061]' : 'text-[#A8B8AE]'
                          }`}
                        >
                          <Sparkles className="h-3 w-3 shrink-0" />
                          <span>Tuyệt Học Tiêu Biểu (10 – 180)</span>
                        </span>
                        <span className="font-mono text-[9.5px] text-[#8FA3AE] tabular-nums">
                          {totalActive} Chủ động · {totalPerm} Tâm pháp · {totalTrig} Kích hoạt
                        </span>
                      </div>

                      <div className="grid flex-1 grid-cols-1 gap-1.5">
                        {skills.map((sk, localIdx) => {
                          const globalIdx = orderedSkills.findIndex((o) => o.id === sk.id);
                          return (
                            <div
                              key={sk.id}
                              className={`kt-slot flex items-start gap-2.5 px-2.5 py-1.5 transition-colors ${
                                isSelected ? 'border-[#6E5C30] bg-[#141A1D]' : 'bg-[#101518]/80'
                              }`}
                            >
                              <SkillIcon
                                sectId={selectedSect}
                                skillType={sk.type}
                                vfxKind={sk.vfxKind}
                                skillIndex={globalIdx >= 0 ? globalIdx : idx * 3 + localIdx}
                                color={sk.color}
                                accentColor={sk.accentColor}
                                size={30}
                                className="mt-0.5 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className="truncate text-xs font-bold"
                                    style={{ color: sk.color }}
                                  >
                                    {sk.name}
                                  </span>
                                  <span className="shrink-0 font-mono text-[9.5px] text-[#F5D061] tabular-nums">
                                    {sk.tierTag}
                                  </span>
                                </div>
                                <div className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-[#D3C8AF]">
                                  {sk.vfxMotif || sk.effectText}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Passive summary footer inside card */}
                      {signaturePassive && (
                        <div className="flex items-center gap-1.5 border-t border-[#2E3940] pt-1.5 text-[10px] text-[#9BC4B1]">
                          <Shield className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            Tâm pháp nổi bật: {signaturePassive.name} (Lv.{signaturePassive.unlockLevel}) — {signaturePassive.mechanicText}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {/* ================= BOTTOM FLOATING ACTION DOCK (Authentic Image 1 Layout) ================= */}
      <footer className="relative z-20 shrink-0 px-4 py-3 sm:px-7">
        <div className="mx-auto flex w-full max-w-[1380px] flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
          {/* Bottom-Left: Jade-Mint "Trở lại" Button */}
          <button
            type="button"
            onClick={step === 'sect' ? onBack : handleBackToSectStep}
            className="flex h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-[3px] border border-[#C5F5E4] bg-gradient-to-b from-[#A3E4CC] via-[#71C2A6] to-[#4A9179] px-5 text-sm font-bold text-[#0F2B23] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_4px_14px_rgba(0,0,0,0.55)] transition-all hover:brightness-110 active:translate-y-px cursor-pointer whitespace-nowrap shrink-0"
          >
            {step === 'branch' && <ArrowLeft className="h-4 w-4" />}
            <span>{step === 'sect' ? 'Trở lại' : 'Đổi phái'}</span>
          </button>

          {/* Bottom-Center: Dark Translucent Name Input + Attached Jade Random Refresh Button */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <div className="flex h-10 w-full max-w-[320px] items-stretch overflow-hidden rounded-[2px] border border-[#6EA89C]/75 bg-[#071316]/82 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),0_4px_16px_rgba(0,0,0,0.55)] backdrop-blur-[2px]">
              <input
                id="hero-name"
                type="text"
                maxLength={22}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên nhân vật"
                className="w-full min-w-0 bg-transparent px-3.5 text-center text-sm font-medium italic text-[#F4FBF8] placeholder-[#89ACA4] focus:not-italic focus:outline-none"
              />
              <button
                type="button"
                onClick={handleRandomName}
                title="Đặt tên giang hồ ngẫu nhiên"
                className="flex w-10 shrink-0 items-center justify-center border-l border-[#8ADCC6]/70 bg-gradient-to-b from-[#9FE2C9] via-[#68BB9E] to-[#458B73] text-[#0D2A22] hover:brightness-110 cursor-pointer"
                aria-label="Tên ngẫu nhiên"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bottom-Right: Step Toggle + Golden Pointed-Lozenge "Tạo nhân vật" Button */}
          <div className="flex shrink-0 items-center gap-2">
            {step === 'sect' && (
              <button
                type="button"
                onClick={() => handleGoToBranchStep()}
                className="hidden h-10 items-center gap-1 rounded-[3px] border border-[#7ED8C2]/70 bg-[#0D2728]/85 px-3 text-xs font-semibold text-[#C9FAF0] hover:border-[#FDE047] hover:text-[#FEF08A] cursor-pointer whitespace-nowrap sm:flex"
              >
                <Check className="h-3.5 w-3.5 text-[#4ADE80]" />
                <span>Chọn Hướng ({selectedBranchName})</span>
              </button>
            )}

            <button
              type="submit"
              disabled={!name.trim()}
              className="relative flex h-11 min-w-[168px] items-center justify-center gap-1.5 rounded-full border-2 border-[#FEF3C7] bg-gradient-to-b from-[#FDE68A] via-[#EBB746] to-[#C88A1E] px-7 text-[15px] font-extrabold tracking-wide text-[#3D2206] shadow-[inset_0_2px_0_rgba(255,255,255,0.72),0_0_20px_rgba(245,180,45,0.6),0_4px_14px_rgba(0,0,0,0.65)] transition-all hover:brightness-108 active:translate-y-px disabled:opacity-45 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Tạo nhân vật</span>
            </button>
          </div>
        </div>
      </footer>
    </form>
  );
};
