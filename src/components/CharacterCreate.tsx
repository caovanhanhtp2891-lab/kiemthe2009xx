import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Dices,
  MapPin,
  Shield,
  Sparkles,
  Sword,
} from 'lucide-react';
import { ASSET_PATHS, ELEMENT_META, RANDOM_WUXIA_NAMES, SECT_ORDER, SECTS } from '../game/data';
import { formatPassiveBonusText, getOrderedSectSkills } from '../game/engine';
import { soundEngine } from '../game/sound';
import { Direction8 } from '../game/spriteAtlas';
import { ElementType, SectId } from '../game/types';
import { getBranchShowcaseProfile } from './branchShowcaseData';
import { PixelHeroPreview } from './PixelItemIcon';
import { SkillIcon } from './SkillIcon';

interface CharacterCreateProps {
  onBack: () => void;
  onConfirm: (name: string, sect: SectId, branchIndex: 0 | 1) => void;
}

type CreateStep = 'sect' | 'branch';

const ELEMENT_FILTERS: Array<{ id: 'all' | ElementType; label: string; color?: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'kim', label: 'Kim', color: ELEMENT_META.kim.color },
  { id: 'moc', label: 'Mộc', color: ELEMENT_META.moc.color },
  { id: 'thuy', label: 'Thủy', color: ELEMENT_META.thuy.color },
  { id: 'hoa', label: 'Hỏa', color: ELEMENT_META.hoa.color },
  { id: 'tho', label: 'Thổ', color: ELEMENT_META.tho.color },
];

const STARTER_TOWNS = [
  { id: 'ba_lang', name: 'Ba Lăng Huyện' },
  { id: 'van_trung', name: 'Vân Trung Trấn' },
  { id: 'dao_huong', name: 'Đạo Hương Thôn' },
  { id: 'giang_tan', name: 'Giang Tân Thôn' },
] as const;

const SERVER_LABELS: Record<string, string> = {
  bach_kiem: 'Bạch Kiếm',
  hoa_kiem: 'Hỏa Kiếm',
  thuy_kiem: 'Thủy Kiếm',
  moc_kiem: 'Mộc Kiếm',
  tho_kiem: 'Thổ Kiếm',
};

const DIR_LABELS: Record<Direction8, string> = {
  0: 'Chính Nam',
  1: 'Đông Nam',
  2: 'Chính Đông',
  3: 'Đông Bắc',
  4: 'Chính Bắc',
  5: 'Tây Bắc',
  6: 'Chính Tây',
  7: 'Tây Nam',
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
  const [selectedSect, setSelectedSect] = useState<SectId>('vo_dang');
  const [selectedBranch, setSelectedBranch] = useState<0 | 1>(0);
  const [elemFilter, setElemFilter] = useState<'all' | ElementType>('all');
  const [selectedTown, setSelectedTown] = useState<string>('ba_lang');
  const [heroDir, setHeroDir] = useState<Direction8>(1);
  const [heroPose, setHeroPose] = useState<'idle' | 'walk' | 'attack'>('idle');
  const [sectInfoTab, setSectInfoTab] = useState<'branches' | 'passive'>('branches');
  const [stageBgFailed, setStageBgFailed] = useState(false);

  const visibleSects = useMemo(
    () =>
      elemFilter === 'all'
        ? SECT_ORDER
        : SECT_ORDER.filter((sid) => SECTS[sid].element === elemFilter),
    [elemFilter]
  );

  const serverName = useMemo(() => {
    try {
      const id = localStorage.getItem('vlkt_server_id') || 'bach_kiem';
      return SERVER_LABELS[id] || 'Bạch Kiếm';
    } catch {
      return 'Bạch Kiếm';
    }
  }, []);

  const sect = SECTS[selectedSect];
  const elem = ELEMENT_META[sect.element];
  const countersElem = ELEMENT_META[elem.counters];
  const counteredByElem = ELEMENT_META[elem.counteredBy];
  const activeTown = STARTER_TOWNS.find((t) => t.id === selectedTown) || STARTER_TOWNS[0];
  const selectedBranchName = sect.branches[selectedBranch] ?? sect.branches[0];

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
        const skills = sect.skills
          .filter((sk) => sk.branch === branchName)
          .map((sk, localIdx) => ({
            ...sk,
            displayKey: isSelected ? `${localIdx + 1}` : `${localIdx + 4}`,
          }));
        return {
          idx,
          branchName,
          isSelected,
          profile,
          skills,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'sect') {
      handleGoToBranchStep();
      return;
    }
    const cleaned = name.trim();
    if (!cleaned) return;
    try {
      localStorage.setItem('vlkt_starter_town', activeTown.name);
    } catch {
      // ignore storage quota errors
    }
    onConfirm(cleaned, selectedSect, selectedBranch);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex h-dvh w-screen flex-col overflow-hidden bg-[#090C0E] text-[#F4E8CD] select-none"
    >
      {/* Authentic Kiếm Thế 2009 Scenic Moonlit Bagua Courtyard Backdrop */}
      {!stageBgFailed && (
        <img
          src={ASSET_PATHS.charCreateStage}
          alt="Đài Bát Quái Tạo Nhân Vật Kiếm Thế 2009"
          referrerPolicy="no-referrer"
          onError={() => setStageBgFailed(true)}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-95"
        />
      )}
      {/* Atmospheric vignette keeping center courtyard crisp & cards legible */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_54%,rgba(8,14,16,0.12)_0%,rgba(6,10,12,0.62)_62%,rgba(4,7,9,0.9)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#06090B]/88 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#06090B]/94 via-[#06090B]/58 to-transparent" />

      {/* TOP BAR: Classic Kiếm Thế 2009 Slim Forest-Jade Header with Interactive 2-Step Indicator */}
      <header className="kt-titlebar relative z-20 flex h-11 shrink-0 items-center justify-between gap-3 px-3 sm:px-5">
        <div className="flex items-center gap-2 text-xs text-[#D6E0D9] whitespace-nowrap shrink-0">
          <span className="font-wuxia text-sm font-bold tracking-wide text-[#F7DA85] sm:text-base">
            KIẾM THẾ 2009
          </span>
          <span className="hidden text-[#5D7466] sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden text-[11px] text-[#C6D4CB] md:inline">
            Cụm <strong className="text-[#FDE68A]">{serverName}</strong>
          </span>
        </div>

        {/* 2-Step Guided Navigation Stepper */}
        <nav aria-label="Tiến trình khởi tạo nhân vật" className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleBackToSectStep}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              step === 'sect'
                ? 'kt-tab-active text-[#FEF3C7]'
                : 'kt-slot text-[#9ED6B5] hover:border-[#E6C368] hover:text-[#FEF3C7]'
            }`}
          >
            {step === 'branch' ? (
              <Check className="h-3 w-3 text-[#4ADE80]" />
            ) : (
              <span className="font-mono text-[10px] text-[#F5D061]">1</span>
            )}
            <span>{step === 'branch' ? sect.name : 'Chọn Môn Phái'}</span>
          </button>

          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#7A8D82]" aria-hidden="true" />

          <button
            type="button"
            onClick={() => handleGoToBranchStep()}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              step === 'branch'
                ? 'kt-tab-active text-[#FEF3C7]'
                : 'kt-slot text-[#B8C4BC] hover:border-[#E6C368] hover:text-[#FEF3C7]'
            }`}
          >
            <span className="font-mono text-[10px] text-[#F5D061]">2</span>
            <span>Chọn Hướng</span>
          </button>
        </nav>

        <div className="hidden items-center gap-1.5 text-[11px] text-[#C9D5CD] whitespace-nowrap shrink-0 lg:flex">
          <span style={{ color: ELEMENT_META.kim.color }}>Kim</span>
          <span className="text-[#6F8276]">→</span>
          <span style={{ color: ELEMENT_META.moc.color }}>Mộc</span>
          <span className="text-[#6F8276]">→</span>
          <span style={{ color: ELEMENT_META.tho.color }}>Thổ</span>
          <span className="text-[#6F8276]">→</span>
          <span style={{ color: ELEMENT_META.thuy.color }}>Thủy</span>
          <span className="text-[#6F8276]">→</span>
          <span style={{ color: ELEMENT_META.hoa.color }}>Hỏa</span>
          <span className="text-[#6F8276]">→</span>
          <span style={{ color: ELEMENT_META.kim.color }}>Kim</span>
        </div>
      </header>

      {/* MIDDLE STAGE */}
      {step === 'sect' ? (
        /* ================= STEP 1: CHỌN MÔN PHÁI (Classic 3-Zone Kiếm Thế 2009 Layout) ================= */
        <main className="relative z-10 mx-auto flex w-full max-w-[1380px] flex-1 min-h-0 flex-col gap-2.5 overflow-y-auto px-3 py-2.5 sm:flex-row sm:items-stretch sm:overflow-hidden sm:px-4 sm:py-3">
          {/* LEFT FLOATING PANEL: 12 Ngũ Hành Sects + Tân Thủ Thôn */}
          <aside className="kt-window flex w-full shrink-0 flex-col overflow-hidden sm:w-[225px] md:w-[248px] lg:w-[272px]">
            <div className="kt-titlebar flex shrink-0 items-center justify-between px-3 py-1.5">
              <span className="text-xs font-bold tracking-wide text-[#F7DA85] whitespace-nowrap">
                Thập Nhị Đại Môn Phái
              </span>
              <span className="font-mono text-[10px] text-[#B8CABF] tabular-nums">12 Phái</span>
            </div>

            {/* Compact Ngũ Hành Element Filter Tabs */}
            <div className="grid shrink-0 grid-cols-6 gap-0.5 border-b border-[#3A474E] bg-[#111619] p-1">
              {ELEMENT_FILTERS.map((f) => {
                const isAct = elemFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setElemFilter(f.id)}
                    className={`py-0.5 text-[9.5px] font-bold transition-colors cursor-pointer ${
                      isAct ? 'kt-tab-active' : 'kt-slot text-[#9EB0A6] hover:text-[#FEF3C7]'
                    }`}
                    style={f.color && !isAct ? { color: f.color } : undefined}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Scrollable 12 Sect Plaques */}
            <div className="flex flex-1 min-h-0 flex-col gap-1 overflow-y-auto p-1.5">
              {visibleSects.map((sid) => {
                const s = SECTS[sid];
                const el = ELEMENT_META[s.element];
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
                    className={`flex shrink-0 items-center justify-between gap-2 px-2 py-1.5 text-left transition-colors cursor-pointer ${
                      active ? 'kt-tab-active' : 'kt-slot hover:border-[#E6C368]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border font-wuxia text-[11px] font-bold shadow-inner"
                        style={{
                          borderColor: el.color,
                          backgroundColor: `${el.color}24`,
                          color: el.color,
                        }}
                      >
                        {el.name}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-wuxia truncate text-sm font-bold leading-tight"
                            style={{ color: active ? '#FEF3C7' : s.color }}
                          >
                            {s.name}
                          </span>
                        </div>
                        <div className="truncate text-[9.5px] text-[#BFC9C2]">
                          {s.branches.join(' · ')}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-mono text-[9.5px] leading-tight text-[#D7E0D9] tabular-nums">
                      <div>C:{s.baseStats.atk}</div>
                      <div className="text-[#9CB0A4]">T:{s.baseStats.def}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Starter Town (Tân Thủ Thôn) */}
            <div className="shrink-0 border-t border-[#435056] bg-[#101417]/90 p-2">
              <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-[#D6C294]">
                <MapPin className="h-3 w-3 text-[#7DD3A2]" />
                <span>Tân Thủ Thôn (Nơi Xuất Thân)</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {STARTER_TOWNS.map((town) => {
                  const isSelected = town.id === selectedTown;
                  return (
                    <button
                      key={town.id}
                      type="button"
                      onClick={() => setSelectedTown(town.id)}
                      className={`truncate px-1.5 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'kt-btn-jade text-[#FEF3C7]'
                          : 'kt-slot text-[#B8C4BC] hover:text-[#FEF3C7]'
                      }`}
                    >
                      {town.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* CENTER OPEN SCENIC STAGE: Hero Standing on Moonlit Bagua Stone Pedestal */}
          <section className="relative flex min-h-[250px] flex-1 min-w-0 flex-col items-center justify-between py-1 sm:min-h-0">
            {/* Live Character Overhead Nameplate */}
            <div className="kt-ink-panel flex flex-col items-center px-4 py-1.5 text-center backdrop-blur-[2px]">
              <div className="flex items-center gap-2">
                <span className="font-wuxia text-xs font-bold" style={{ color: elem.color }}>
                  [{elem.name}]
                </span>
                <span className="font-wuxia text-lg font-bold tracking-wide text-[#FEF3C7] drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                  {name.trim() || 'Vô Danh Hiệp Khách'}
                </span>
              </div>
              <div className="text-[11px] text-[#C8D6CE]">
                <span style={{ color: sect.color }} className="font-semibold">
                  {sect.name}
                </span>
                <span className="mx-1.5 text-[#66786D]" aria-hidden="true">
                  ·
                </span>
                <span>{sect.branches.join(' / ')}</span>
                <span className="mx-1.5 text-[#66786D]" aria-hidden="true">
                  ·
                </span>
                <span>{activeTown.name}</span>
              </div>
            </div>

            {/* Center Animated Hero on Illuminated Bagua Ring */}
            <div className="relative flex flex-1 min-h-0 w-full items-center justify-center">
              <div
                className="pointer-events-none absolute top-[62%] h-16 w-48 -translate-y-1/2 rounded-full opacity-55 blur-xl transition-colors duration-300"
                style={{
                  background: `radial-gradient(ellipse at center, ${sect.color}88 0%, transparent 72%)`,
                }}
              />
              <div
                className="pointer-events-none absolute top-[67%] h-12 w-40 -translate-y-1/2 rounded-full border border-dashed opacity-50 transition-colors duration-300"
                style={{
                  borderColor: sect.color,
                  boxShadow: `0 0 18px ${sect.color}55, inset 0 0 12px ${sect.color}33`,
                }}
              />

              <div className="relative z-10 flex items-center justify-center">
                <PixelHeroPreview
                  sectId={selectedSect}
                  width={200}
                  height={185}
                  scale={1.85}
                  transparentBg
                  hideControls
                  interactive
                  dirOverride={heroDir}
                  animOverride={heroPose}
                  onDirChange={setHeroDir}
                />
              </div>
            </div>

            {/* Rotate & Pose Controls directly below pedestal */}
            <div className="kt-ink-panel flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => handleRotate(-1)}
                title="Xoay trái"
                className="kt-btn-bronze flex h-7 w-7 items-center justify-center cursor-pointer"
                aria-label="Xoay nhân vật sang trái"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="w-16 text-center font-mono text-[10px] text-[#D2DDD6] whitespace-nowrap">
                {DIR_LABELS[heroDir]}
              </span>

              <button
                type="button"
                onClick={() => handleRotate(1)}
                title="Xoay phải"
                className="kt-btn-bronze flex h-7 w-7 items-center justify-center cursor-pointer"
                aria-label="Xoay nhân vật sang phải"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <span className="mx-0.5 h-4 w-px bg-[#4A575F]" aria-hidden="true" />

              {(
                [
                  { id: 'idle', label: 'Đứng' },
                  { id: 'walk', label: 'Đi Bộ' },
                  { id: 'attack', label: 'Xuất Chiêu' },
                ] as const
              ).map((pose) => (
                <button
                  key={pose.id}
                  type="button"
                  onClick={() => setHeroPose(pose.id)}
                  className={`h-7 px-2.5 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    heroPose === pose.id ? 'kt-tab-active' : 'kt-tab'
                  }`}
                >
                  {pose.label}
                </button>
              ))}
            </div>
          </section>

          {/* RIGHT FLOATING PANEL: Sect Dossier, Base Stats & Branch Visual Preview */}
          <aside className="kt-window flex w-full shrink-0 flex-col overflow-hidden sm:w-[255px] md:w-[292px] lg:w-[335px]">
            <div className="kt-titlebar flex shrink-0 items-center justify-between gap-2 px-3 py-1.5">
              <span
                className="font-wuxia truncate text-base font-bold"
                style={{ color: sect.color }}
              >
                {sect.name} · Hệ {sect.elementName}
              </span>
              <span className="shrink-0 text-[11px] text-[#E6D5A9] whitespace-nowrap">
                {sect.weaponType}
              </span>
            </div>

            {/* Lore + Counter Matchup + 6 Base Stats */}
            <div className="shrink-0 border-b border-[#404C53] p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#CFD9D2]">
                <span>
                  Khắc{' '}
                  <strong style={{ color: countersElem.color }}>{countersElem.name}</strong>{' '}
                  <span className="font-mono text-[10px] text-[#4ADE80]">+22%</span>
                </span>
                <span>
                  Kỵ{' '}
                  <strong style={{ color: counteredByElem.color }}>{counteredByElem.name}</strong>
                </span>
              </div>

              <p className="mt-1.5 text-[11px] leading-snug text-[#DDD2B8]">{sect.summary}</p>

              {/* 3x2 Recessed Stat Grid */}
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Sinh Lực', val: sect.baseStats.hp },
                  { label: 'Nội Lực', val: sect.baseStats.mp },
                  { label: 'Công Kích', val: sect.baseStats.atk },
                  { label: 'Phòng Thủ', val: sect.baseStats.def },
                  { label: 'Chí Mạng', val: `${sect.baseStats.crit}%` },
                  { label: 'Thân Pháp', val: `${sect.baseStats.dodge}%` },
                ].map((st) => (
                  <div key={st.label} className="kt-slot px-1.5 py-1 text-center">
                    <div className="text-[9.5px] text-[#A9B7AE]">{st.label}</div>
                    <div className="font-mono text-[11px] font-bold text-[#FEF3C7] tabular-nums">
                      {st.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Folder Tabs: Two Branches Preview vs Passive Arts */}
            <div className="flex shrink-0 gap-1 border-b border-[#343E44] bg-[#14191D] px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => setSectInfoTab('branches')}
                className={`flex flex-1 items-center justify-center gap-1 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  sectInfoTab === 'branches' ? 'kt-tab-active' : 'kt-tab'
                }`}
              >
                <Compass className="h-3 w-3 shrink-0" />
                <span>2 Hướng Chiến Đấu</span>
              </button>
              <button
                type="button"
                onClick={() => setSectInfoTab('passive')}
                className={`flex flex-1 items-center justify-center gap-1 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  sectInfoTab === 'passive' ? 'kt-tab-active' : 'kt-tab'
                }`}
              >
                <Shield className="h-3 w-3 shrink-0" />
                <span>Tâm Pháp ({sect.passives.length})</span>
              </button>
            </div>

            {/* Scroll-safe Right Body */}
            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto p-2.5">
              {sectInfoTab === 'branches' ? (
                <>
                  <p className="text-[10.5px] leading-snug text-[#BAC9BF]">
                    Mỗi môn phái có <strong className="text-[#F5D061]">2 hướng võ học</strong> riêng biệt. Nhấn vào hướng bên dưới hoặc bấm{' '}
                    <strong className="text-[#FEF3C7]">Tiếp Tục</strong> để xem chi tiết hình ảnh &amp; tuyệt học.
                  </p>

                  <div className="space-y-2">
                    {branchCardsData.map((card) => (
                      <button
                        key={card.branchName}
                        type="button"
                        onClick={() => handleGoToBranchStep(card.idx)}
                        className="group kt-slot relative flex w-full flex-col overflow-hidden text-left transition-all hover:border-[#F0CA6B] cursor-pointer"
                      >
                        <div className="relative h-24 w-full overflow-hidden border-b border-[#37434B]">
                          <BranchArtwork
                            src={card.profile.image}
                            alt={card.profile.imageAlt}
                            tintColor={card.profile.tintColor}
                            accentColor={sect.color}
                            weaponLabel={card.profile.weaponLabel}
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090D0F] via-[#090D0F]/50 to-transparent" />
                          <div className="absolute inset-x-2 bottom-1.5 flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-wuxia truncate text-sm font-bold text-[#FEF3C7] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                                Hướng {card.branchName}
                              </div>
                              <div className="truncate text-[10px] text-[#D2DDD6]">
                                {card.profile.weaponLabel} · {card.profile.rangeLabel}
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] font-semibold text-[#F5D061] whitespace-nowrap">
                              Xem hướng →
                            </span>
                          </div>
                        </div>
                        <div className="px-2 py-1.5 text-[10px] leading-snug text-[#D6CBB3]">
                          {card.profile.roleLabel}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                sect.passives.map((ps) => (
                  <div
                    key={ps.id}
                    className="kt-slot flex items-center justify-between gap-2 px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-[#F4E8CD]">
                        {ps.name}
                      </div>
                      <div className="truncate font-mono text-[10px] text-[#4ADE80] tabular-nums">
                        {formatPassiveBonusText(ps)}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-[#9FB0A5] tabular-nums">
                      Lv.{ps.unlockLevel}
                    </span>
                  </div>
                ))
              )}
            </div>
          </aside>
        </main>
      ) : (
        /* ================= STEP 2: CHỌN HƯỚNG CHIẾN ĐẤU (Visual Combat-Style Showcase) ================= */
        <main className="relative z-10 mx-auto flex w-full max-w-[1380px] flex-1 min-h-0 flex-col gap-2.5 overflow-hidden px-3 py-2.5 sm:px-4 sm:py-3">
          {/* Compact Top Chosen-Sect Summary Ribbon with Live Miniature Hero Preview */}
          <section className="kt-window flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-1.5 sm:flex-nowrap">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="kt-slot flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden bg-[#0C1215]">
                <PixelHeroPreview
                  sectId={selectedSect}
                  width={54}
                  height={50}
                  scale={0.58}
                  transparentBg
                  hideControls
                  dirOverride={1}
                  animOverride={heroPose}
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span
                    className="font-wuxia text-base font-bold leading-tight sm:text-lg"
                    style={{ color: sect.color }}
                  >
                    {sect.name} · Chọn Hướng Chiến Đấu
                  </span>
                  <span className="text-[11px] text-[#C8D6CE] whitespace-nowrap">
                    Hệ <strong style={{ color: elem.color }}>{elem.name}</strong> · Khắc{' '}
                    <strong style={{ color: countersElem.color }}>{countersElem.name}</strong> ·{' '}
                    {activeTown.name}
                  </span>
                </div>
                <p className="truncate text-[11px] text-[#C8BEB0]">
                  Chọn 1 trong 2 hướng bên dưới để xem phong cách chiến đấu — 3 tuyệt học của hướng chọn sẽ gắn vào phím <strong className="font-mono text-[#F5D061]">1–3</strong>.
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

          {/* Main 2-Column Side-by-Side Branch Showcase (Scroll-safe inside viewport) */}
          <section
            role="radiogroup"
            aria-label={`Chọn hướng chiến đấu cho phái ${sect.name}`}
            className="flex-1 min-h-0 overflow-y-auto pr-0.5"
          >
            <div className="grid min-h-full grid-cols-1 gap-3 md:grid-cols-2 lg:gap-4">
              {branchCardsData.map((card) => {
                const { idx, branchName, isSelected, profile, skills } = card;
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
                    {/* Hero Combat-Style Painted Artwork Frame */}
                    <div className="relative h-44 w-full shrink-0 overflow-hidden border-b border-[#404C53] bg-[#0B1013] sm:h-48 lg:h-52">
                      <BranchArtwork
                        src={profile.image}
                        alt={profile.imageAlt}
                        tintColor={profile.tintColor}
                        accentColor={sect.color}
                        weaponLabel={profile.weaponLabel}
                      />

                      {/* Measured dark contrast scrim for crisp >= 4.5:1 overlaid text */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090D0F] via-[#090D0F]/55 to-[#090D0F]/20" />

                      {/* Top Corner Non-Pill Status Markers */}
                      <div className="absolute inset-x-3 top-2.5 flex items-center justify-between gap-2">
                        <span className="border border-[#5A4D33] bg-[#0B1013]/85 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#E8D5A7]">
                          HƯỚNG {idx + 1} · {branchName.toUpperCase()}
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
                              <span>Đang Chọn · Phím 1–3</span>
                            </>
                          ) : (
                            <span>Nhấn Để Chọn · Phím 4–6</span>
                          )}
                        </span>
                      </div>

                      {/* Bottom Artwork Overlay: Branch Title + Unboxed Combat Profile Metadata */}
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

                    {/* Combat Style Description & 3 Signature Skills */}
                    <div className="flex flex-1 flex-col gap-2.5 bg-[#101518]/96 p-3">
                      <p className="text-[11.5px] leading-relaxed text-[#E3D8BE]">
                        {profile.styleSummary}
                      </p>

                      <div className="flex items-center justify-between border-b border-[#344149] pb-1 text-[10.5px] font-bold">
                        <span
                          className={`flex items-center gap-1.5 ${
                            isSelected ? 'text-[#F5D061]' : 'text-[#A8B8AE]'
                          }`}
                        >
                          <Sparkles className="h-3 w-3 shrink-0" />
                          <span>
                            {isSelected ? '3 Tuyệt Học Chính' : '3 Tuyệt Học Song Tu Phụ'}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] text-[#8FA3AE]">
                          Phím tắt {isSelected ? '1 – 3' : '4 – 6'}
                        </span>
                      </div>

                      <div className="grid flex-1 grid-cols-1 gap-1.5">
                        {skills.map((sk, localIdx) => {
                          const globalIdx = orderedSkills.findIndex((o) => o.id === sk.id);
                          return (
                            <div
                              key={sk.id}
                              className={`kt-slot flex items-start gap-2.5 px-2.5 py-2 transition-colors ${
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
                                size={32}
                                className="mt-0.5 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className="truncate text-xs font-bold"
                                    style={{ color: sk.color }}
                                  >
                                    [{sk.displayKey}] {sk.name}
                                  </span>
                                  <span className="shrink-0 font-mono text-[10px] text-[#9FB0A5] tabular-nums">
                                    Lv.{sk.unlockLevel}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-[10.5px] leading-snug text-[#D3C8AF]">
                                  {sk.effectText}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {/* BOTTOM PINNED BAR: Classic Kiếm Thế 2009 Sculpted Steel Action Dock (Always Visible!) */}
      <footer className="kt2009-bar relative z-20 shrink-0 px-3 py-2 sm:px-5">
        <div className="mx-auto flex w-full max-w-[1380px] flex-wrap items-center justify-between gap-2.5 sm:flex-nowrap">
          {/* Left: Back / Change Sect Button */}
          {step === 'sect' ? (
            <button
              type="button"
              onClick={onBack}
              className="kt-btn-bronze flex h-9 items-center gap-1.5 px-3.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay Lại</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBackToSectStep}
              className="kt-btn-bronze flex h-9 items-center gap-1.5 px-3.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Đổi Môn Phái</span>
            </button>
          )}

          {/* Center: Character Name Input + Random Dice */}
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <label
              htmlFor="hero-name"
              className="hidden text-xs font-semibold text-[#F5D686] whitespace-nowrap shrink-0 md:inline"
            >
              Tên Nhân Vật:
            </label>
            <input
              id="hero-name"
              type="text"
              maxLength={22}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên giang hồ..."
              className="kt-slot h-9 w-full max-w-[240px] px-3 text-sm font-medium text-[#FEF3C7] placeholder-[#7B888F] focus:border-[#F0CA6B] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleRandomName}
              title="Đặt tên giang hồ ngẫu nhiên"
              className="kt-btn-bronze flex h-9 items-center gap-1.5 px-3 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Dices className="h-3.5 w-3.5 text-[#F5D061]" />
              <span className="hidden sm:inline">Ngẫu Nhiên</span>
            </button>
          </div>

          {/* Right: Step-Aware Primary CTA */}
          {step === 'sect' ? (
            <button
              type="button"
              onClick={() => handleGoToBranchStep()}
              className="kt-btn-crimson flex h-9 items-center justify-center gap-2 px-4 text-xs font-bold tracking-wide whitespace-nowrap shrink-0 cursor-pointer sm:px-5 sm:text-sm"
            >
              <span>Tiếp Tục: Chọn Hướng</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!name.trim()}
              className="kt-btn-crimson flex h-9 items-center justify-center gap-2 px-4 text-xs font-bold tracking-wide whitespace-nowrap shrink-0 disabled:opacity-45 cursor-pointer sm:px-5 sm:text-sm"
            >
              <Sword className="h-4 w-4" />
              <span>
                Vào Giang Hồ
                <span className="hidden md:inline font-normal text-[#FDE68A]">
                  {' '}· {sect.name} ({selectedBranchName})
                </span>
              </span>
            </button>
          )}
        </div>
      </footer>
    </form>
  );
};
