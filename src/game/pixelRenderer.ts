import { ELEMENT_META, QUALITY_META } from './data';
import {
  ANIM_CLIPS,
  ATLAS_ROW_TO_VIEW,
  AnimState,
  AtlasOrientationRow,
  Direction8,
  MonsterArchetype,
  OrientationView,
  SpriteSheetEntry,
  WeaponVisualKind,
  getDir8Meta,
  inferWeaponKind,
  pxRect,
  resolveMountSpecies,
  spriteAtlas,
} from './spriteAtlas';
import {
  ElementType,
  EquipSlot,
  EquipmentItem,
  ItemQuality,
  MountDef,
  MountIllusionDef,
  MountSpecies,
  MountSkinStyle,
  SectId,
  SkillVfxKind,
} from './types';

// Helper to draw pixel rectangles in local grid coordinates (each unit = ps pixels)
function p(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  gw: number,
  gh: number,
  color: string,
  ps = 2
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(gx * ps), Math.round(gy * ps), Math.round(gw * ps), Math.round(gh * ps));
}

// ---------------------------------------------------------------------------
// 1. DYNAMIC SHADOW & ADDITIVE PIXEL-CRISP LIGHTING
// ---------------------------------------------------------------------------
export function drawDynamicShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  elevation = 0
) {
  const scale = Math.max(0.55, 1 - elevation * 0.012);
  ctx.save();
  ctx.fillStyle = 'rgba(4, 3, 2, 0.52)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), rx * scale, ry * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(
    Math.round(x),
    Math.round(y),
    rx * scale * 1.25,
    ry * scale * 1.25,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

export function drawDynamicLightPool(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 0.24
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(x, y, 2, x, y, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 2. PRE-BAKED 8-DIRECTION MOUNT SPRITE ATLAS & RENDERER
// ---------------------------------------------------------------------------
export interface PixelMountDrawParams {
  x: number;
  y: number;
  dir8: Direction8;
  animPhase: number;
  frameIndex?: number;
  isMoving: boolean;
  mount: MountDef;
  illusion: MountIllusionDef | null;
  illusionStars: number;
}

const MOUNT_LEG_CYCLE_RUN = [3, 2, -1, -3, -2, 1];
const MOUNT_BOB_CYCLE_RUN = [-2, -3, -1, 0, -2, -1];
const MOUNT_BOB_CYCLE_IDLE = [0, -1, -1, 0];

function bakeMountFrame(
  ctx: CanvasRenderingContext2D,
  view: OrientationView,
  frameIdx: number,
  isMoving: boolean,
  species: MountSpecies,
  evolutionLevel: number,
  bodyColor: string,
  accentColor: string,
  auraColor: string,
  illusionStyle?: MountSkinStyle
) {
  const outline = '#120D0A';
  const legSwing = isMoving
    ? MOUNT_LEG_CYCLE_RUN[frameIdx % MOUNT_LEG_CYCLE_RUN.length] * 2.1
    : frameIdx === 1 || frameIdx === 2
    ? 0.9
    : 0;
  const bodyBob = isMoving
    ? MOUNT_BOB_CYCLE_RUN[frameIdx % MOUNT_BOB_CYCLE_RUN.length] * 1.4
    : MOUNT_BOB_CYCLE_IDLE[frameIdx % MOUNT_BOB_CYCLE_IDLE.length] * 1.1;
  const tailWave = Math.sin((frameIdx / (isMoving ? 6 : 4)) * Math.PI * 2) * (isMoving ? 3.5 : 1.6);

  ctx.save();
  ctx.translate(0, bodyBob);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const drawSaddle = (cx: number, cy: number, rx: number, ry: number) => {
    // Ornate Song-dynasty brocade saddlecloth & gold trim
    ctx.fillStyle = '#7F1D1D';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(cx - rx, cy - 2, rx * 2, ry + 5, 3);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#F5D061';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - rx + 1.5, cy - 0.5, rx * 2 - 3, ry + 2);

    // Saddle seat cushion
    ctx.fillStyle = '#451A03';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 1.5, rx * 0.85, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#F5D061';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // Cardinal North/South views (front / back)
  if (view === 'front' || view === 'back') {
    const isBack = view === 'back';

    // Muscular legs with dark hooves / paws
    for (const side of [-1, 1]) {
      const lx = side * 8.5;
      const lyOff = side < 0 ? legSwing * 0.5 : -legSwing * 0.5;
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.roundRect(lx - 3, 2 + lyOff, 6, 15, 2.5);
      ctx.fill();
      ctx.stroke();
      // Hoof / claw tip
      ctx.fillStyle = species === 'qilin' || species === 'divine_beast' ? '#FDE047' : '#292524';
      ctx.fillRect(lx - 2.6, 13.5 + lyOff, 5.2, 3.5);
    }

    // Broad sculpted chest / hindquarters
    const bodyGrad = ctx.createLinearGradient(0, -13, 0, 9);
    bodyGrad.addColorStop(0, bodyColor);
    bodyGrad.addColorStop(1, '#1A1310');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -2, 13.5, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Chest armor barding on evolved mounts
    if (evolutionLevel >= 2) {
      ctx.fillStyle = '#7F1D1D';
      ctx.strokeStyle = '#F5D061';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-9, -6);
      ctx.lineTo(9, -6);
      ctx.lineTo(6, 5);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (isBack) {
      // Flowing tail on back view
      if (species === 'spirit_fox') {
        for (let t = -2; t <= 2; t++) {
          ctx.fillStyle = t % 2 === 0 ? bodyColor : accentColor;
          ctx.strokeStyle = outline;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(t * 5.2 + tailWave * 0.35, -3 + Math.abs(t) * 1.4, 3.4, 9.5, t * 0.28, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = accentColor;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-3, -4);
        ctx.quadraticCurveTo(tailWave, 5, tailWave * 1.3, 14);
        ctx.quadraticCurveTo(4 + tailWave * 0.5, 6, 3, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // Ears / antlers peeking above
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(-6, -24, 2.2, 5, -0.25, 0, Math.PI * 2);
      ctx.ellipse(6, -24, 2.2, 5, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (species === 'qilin' || species === 'divine_beast') {
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -24);
        ctx.lineTo(-9, -34);
        ctx.moveTo(5, -24);
        ctx.lineTo(9, -34);
        ctx.stroke();
      }
    } else {
      // Sculpted neck & head facing camera
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, -17, 7.5, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Mane crest
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.ellipse(0, -25, 4.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Ears
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(-6, -22);
      ctx.lineTo(-9, -30);
      ctx.lineTo(-2.5, -25);
      ctx.moveTo(6, -22);
      ctx.lineTo(9, -30);
      ctx.lineTo(2.5, -25);
      ctx.fill();
      ctx.stroke();
      if (species === 'qilin' || species === 'divine_beast') {
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -26);
        ctx.lineTo(-10, -36);
        ctx.moveTo(5, -26);
        ctx.lineTo(10, -36);
        ctx.stroke();
      }
      // Luminous eyes & snout
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(-3.2, -18, 1.5, 0, Math.PI * 2);
      ctx.arc(3.2, -18, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.ellipse(0, -12, 3.8, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawSaddle(0, -10, 9.5, 7);
    ctx.restore();
    return;
  }

  // Side & 3/4 Diagonal views
  const isDiag = view === 'front_diag' || view === 'back_diag';
  const isBackDiag = view === 'back_diag';
  if (isDiag) {
    ctx.scale(0.92, 1);
  }

  // Helper for muscular articulated mount leg
  const drawLeg = (
    hipX: number,
    hipY: number,
    swing: number,
    color: string,
    hoofColor: string,
    isFeline = false
  ) => {
    ctx.save();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(hipX - 3, hipY);
    ctx.quadraticCurveTo(hipX + swing * 0.45 - 2.5, hipY + 7, hipX + swing - 2.2, hipY + 14.5);
    ctx.lineTo(hipX + swing + 2.4, hipY + 14.5);
    ctx.quadraticCurveTo(hipX + swing * 0.45 + 3, hipY + 6.5, hipX + 3.2, hipY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = hoofColor;
    ctx.beginPath();
    if (isFeline) {
      ctx.ellipse(hipX + swing + 0.8, hipY + 15, 3.4, 2.1, 0, 0, Math.PI * 2);
    } else {
      ctx.roundRect(hipX + swing - 2.5, hipY + 13, 5.2, 3.2, 1);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const isFeline = species === 'white_tiger' || species === 'snow_wolf' || species === 'spirit_fox';
  const hoofCol =
    species === 'qilin' || species === 'divine_beast'
      ? '#FDE047'
      : species === 'white_tiger'
      ? accentColor
      : species === 'snow_wolf'
      ? '#7DD3FC'
      : '#292524';

  // Far-side legs (darker shade for depth)
  drawLeg(-15, 4, -legSwing, '#1C1917', '#0F0D0C', isFeline);
  drawLeg(12, 4, legSwing, '#1C1917', '#0F0D0C', isFeline);

  // Flowing Tail (behind torso)
  if (species === 'spirit_fox') {
    for (let t = -2; t <= 2; t++) {
      ctx.save();
      ctx.translate(-20, -3 + t * 2.5);
      ctx.rotate(-0.45 + t * 0.24 + tailWave * 0.03);
      const tg = ctx.createLinearGradient(0, 0, -18, 0);
      tg.addColorStop(0, bodyColor);
      tg.addColorStop(0.7, accentColor);
      tg.addColorStop(1, '#FFF1F2');
      ctx.fillStyle = tg;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(-9, 0, 10, 3.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else {
    ctx.save();
    ctx.fillStyle = species === 'white_tiger' ? bodyColor : accentColor;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-20, -4);
    ctx.quadraticCurveTo(-30, -8 + tailWave, -35, 3 + tailWave);
    ctx.quadraticCurveTo(-28, 7 + tailWave * 0.6, -21, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (species === 'qilin' || species === 'divine_beast') {
      ctx.fillStyle = auraColor;
      ctx.beginPath();
      ctx.ellipse(-34, 3 + tailWave, 4.5, 2.8, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Pegasus Feathered Wing (far wing behind body)
  if (illusionStyle === 'celestial_pegasus') {
    const flap = Math.sin((frameIdx / (isMoving ? 6 : 4)) * Math.PI * 2) * 5;
    ctx.save();
    ctx.fillStyle = '#E0F2FE';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.quadraticCurveTo(-18, -26 - flap, -30, -18 - flap);
    ctx.quadraticCurveTo(-19, -11 - flap * 0.6, -25, -9 - flap * 0.5);
    ctx.quadraticCurveTo(-12, -5, -2, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Sculpted Anatomical Body Barrel with soft volume gradient
  const barrelGrad = ctx.createLinearGradient(0, -14, 0, 10);
  barrelGrad.addColorStop(0, bodyColor);
  barrelGrad.addColorStop(0.75, bodyColor);
  barrelGrad.addColorStop(1, '#1C1410');
  ctx.fillStyle = barrelGrad;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(-1, -1, 22, 10.5, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Species body markings
  if (species === 'white_tiger') {
    ctx.fillStyle = '#1E293B';
    for (const sx of [-13, -6, 1, 8]) {
      ctx.beginPath();
      ctx.moveTo(sx, -10.5);
      ctx.lineTo(sx + 3.2, -10.5);
      ctx.lineTo(sx + 1.2, 2.5);
      ctx.lineTo(sx - 0.8, -2);
      ctx.closePath();
      ctx.fill();
    }
  } else if (species === 'snow_wolf') {
    // Frosty fur ruff around shoulders
    ctx.fillStyle = '#E0F2FE';
    ctx.beginPath();
    ctx.ellipse(12, -5, 8, 9.5, 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (species === 'qilin' || species === 'divine_beast') {
    // Glowing imperial scales & golden chest plate
    ctx.fillStyle = species === 'divine_beast' ? '#292524' : '#7F1D1D';
    ctx.strokeStyle = '#F5D061';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-12, -9, 24, 10, 4);
    ctx.fill();
    ctx.stroke();
    // Chest barding
    ctx.fillStyle = '#F5D061';
    ctx.beginPath();
    ctx.ellipse(16, -2, 5.5, 7, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.stroke();
  } else if (evolutionLevel >= 2) {
    // Warhorse crimson-gold barding
    ctx.fillStyle = '#7F1D1D';
    ctx.strokeStyle = '#F5D061';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(-12, -9, 24, 9, 3);
    ctx.fill();
    ctx.stroke();
    if (evolutionLevel >= 4) {
      ctx.fillStyle = '#F5D061';
      ctx.beginPath();
      ctx.ellipse(16, -2, 5, 6.5, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sculpted Arched Neck & Head
  if (species === 'white_tiger' || species === 'snow_wolf' || species === 'spirit_fox') {
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(20, -11, 9.5, 7.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Ears
    const earH = species === 'spirit_fox' ? 10 : 6;
    ctx.beginPath();
    ctx.moveTo(15, -16);
    ctx.lineTo(13, -17 - earH);
    ctx.lineTo(19, -17);
    ctx.moveTo(21, -16);
    ctx.lineTo(22, -16 - earH);
    ctx.lineTo(25, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (!isBackDiag) {
      // Snout & luminous eye
      ctx.fillStyle = species === 'white_tiger' ? '#FDA4AF' : '#F8FAFC';
      ctx.beginPath();
      ctx.ellipse(28, -9, 3.8, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = species === 'snow_wolf' ? '#38BDF8' : '#FDE047';
      ctx.beginPath();
      ctx.arc(23.5, -12.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Regal arched Horse / Qilin / Dragon Steed neck
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(11, -3);
    ctx.quadraticCurveTo(15, -18, 20, -25);
    ctx.lineTo(27, -22);
    ctx.quadraticCurveTo(24, -10, 20, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Flowing Mane along neck crest
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(11, -6);
    ctx.quadraticCurveTo(11, -17, 17, -26);
    ctx.lineTo(21, -24);
    ctx.quadraticCurveTo(16, -15, 15, -5);
    ctx.closePath();
    ctx.fill();

    // Sculpted Horse / Qilin Head
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(18, -26);
    ctx.quadraticCurveTo(26, -28, 33, -20);
    ctx.quadraticCurveTo(34, -16, 29, -16);
    ctx.lineTo(20, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ears & Golden Antlers
    ctx.beginPath();
    ctx.moveTo(19, -25);
    ctx.lineTo(18, -32);
    ctx.lineTo(23, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (species === 'qilin' || species === 'divine_beast') {
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(21, -26);
      ctx.lineTo(16, -37);
      ctx.moveTo(18, -32);
      ctx.lineTo(22, -35);
      ctx.stroke();
    }

    if (!isBackDiag) {
      // Bridle gold bit + gleaming eye
      ctx.strokeStyle = '#F5D061';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(29, -18);
      ctx.lineTo(19, -21);
      ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(25.5, -22.5, 1.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Near-side legs (bright foreground shade)
  drawLeg(-12, 4, legSwing, bodyColor, hoofCol, isFeline);
  drawLeg(14, 4, -legSwing, bodyColor, hoofCol, isFeline);

  // Ornate Saddle
  drawSaddle(-1, -10, 9.5, 6);

  ctx.restore();
}

function getMountAtlasSheet(
  mount: MountDef,
  illusion: MountIllusionDef | null,
  illusionStars: number,
  isMoving: boolean
): SpriteSheetEntry {
  const species = resolveMountSpecies(mount.species, illusion?.style);
  const evolutionLevel = illusion ? Math.max(2, illusionStars + 1) : mount.tier;
  const bodyColor = illusion ? illusion.color : mount.color;
  const accentColor = illusion ? illusion.accentColor : mount.accentColor;
  const auraColor = illusion ? illusion.auraColor : accentColor;
  const cols = isMoving ? 6 : 4;
  const key = `mount_hd2_${species}_${evolutionLevel}_${bodyColor}_${accentColor}_${illusion?.style || 'base'}_${isMoving ? 'run' : 'idle'}`;

  return spriteAtlas.getOrBakeSheet(
    key,
    {
      cellW: 96,
      cellH: 84,
      cols,
      rows: 5,
      anchorX: 48,
      anchorY: 54,
      oversample: 2,
    },
    (ctx, row: AtlasOrientationRow, frameIdx: number) => {
      bakeMountFrame(
        ctx,
        ATLAS_ROW_TO_VIEW[row],
        frameIdx,
        isMoving,
        species,
        evolutionLevel,
        bodyColor,
        accentColor,
        auraColor,
        illusion?.style
      );
    }
  );
}

export function drawPixelMount(
  ctx: CanvasRenderingContext2D,
  params: PixelMountDrawParams
): { riderOffsetY: number; riderOffsetX: number } {
  const { x, y, dir8, animPhase, frameIndex, isMoving, mount, illusion, illusionStars } = params;
  const evolutionLevel = illusion ? Math.max(2, illusionStars + 1) : mount.tier;
  const accentColor = illusion ? illusion.accentColor : mount.accentColor;
  const auraColor = illusion ? illusion.auraColor : accentColor;

  const cols = isMoving ? 6 : 4;
  const resolvedFrame =
    frameIndex !== undefined
      ? frameIndex % cols
      : Math.floor(Math.abs(animPhase) * (isMoving ? 1.8 : 0.75)) % cols;

  const bob = isMoving
    ? MOUNT_BOB_CYCLE_RUN[resolvedFrame % MOUNT_BOB_CYCLE_RUN.length] * 1.4
    : MOUNT_BOB_CYCLE_IDLE[resolvedFrame % MOUNT_BOB_CYCLE_IDLE.length];

  // Dynamic Light Pool & Evolving Ground Aura Rune (lightweight runtime overlay)
  if (evolutionLevel >= 3 || illusion) {
    drawDynamicLightPool(ctx, x, y + 10, 40 + evolutionLevel * 4, auraColor, 0.22);
    const pulse = 1 + Math.sin(animPhase * 1.4) * 0.06;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + 16));
    ctx.scale(1, 0.44);
    ctx.strokeStyle = auraColor;
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = 10 + evolutionLevel * 2;
    ctx.lineWidth = evolutionLevel >= 5 ? 2.6 : 1.8;
    ctx.globalAlpha = 0.68;
    ctx.beginPath();
    ctx.arc(0, 0, (34 + evolutionLevel * 2) * pulse, 0, Math.PI * 2);
    ctx.stroke();

    if (evolutionLevel >= 4) {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const a = animPhase * 0.65 + (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.arc(0, 0, 41 + evolutionLevel * 1.5, a, a + 0.55);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // O(1) Sprite Sheet Blit for the 8-dir mount body
  const sheet = getMountAtlasSheet(mount, illusion, illusionStars, isMoving);
  spriteAtlas.blitSheetFrame(ctx, sheet, dir8, resolvedFrame, x, y, 1, 1);

  return { riderOffsetY: -15 + bob, riderOffsetX: 0 };
}

// ---------------------------------------------------------------------------
// 3. PRE-BAKED 8-DIRECTION HERO SPRITE ATLAS & LAYERED EQUIPMENT RENDERER
// ---------------------------------------------------------------------------
export interface PixelHeroDrawParams {
  x: number;
  y: number;
  sectId: SectId;
  dir8: Direction8;
  animState: AnimState;
  animPhase: number;
  frameIndex?: number;
  normalizedTime?: number;
  attackProgress: number; // 0..1 during attack swing
  castProgress: number; // 0..1 during skill cast
  hitFlash: number;
  equipment?: Partial<Record<EquipSlot, EquipmentItem | null>>;
  realmTier: number;
  mantleId: number;
  mantleColor: string;
  isMounted: boolean;
  scale?: number;
}

const SECT_PALETTES: Record<
  SectId,
  {
    robeMain: string;
    robeDark: string;
    sash: string;
    hair: string;
    headgear: string;
    accent: string;
    element: ElementType;
  }
> = {
  thieu_lam: {
    robeMain: '#D97706',
    robeDark: '#92400E',
    sash: '#B91C1C',
    hair: '#F3D0B1',
    headgear: '#FDE047',
    accent: '#F5D061',
    element: 'kim',
  },
  thien_vuong: {
    robeMain: '#92400E',
    robeDark: '#451A03',
    sash: '#DC2626',
    hair: '#1C1917',
    headgear: '#F59E0B',
    accent: '#FEF08A',
    element: 'kim',
  },
  duong_mon: {
    robeMain: '#115E59',
    robeDark: '#0F2928',
    sash: '#4ADE80',
    hair: '#18181B',
    headgear: '#134E4A',
    accent: '#4ADE80',
    element: 'moc',
  },
  ngu_doc: {
    robeMain: '#4C1D95',
    robeDark: '#1E1B4B',
    sash: '#22C55E',
    hair: '#18181B',
    headgear: '#A855F7',
    accent: '#84CC16',
    element: 'moc',
  },
  minh_giao: {
    robeMain: '#0F766E',
    robeDark: '#134E4A',
    sash: '#F8FAFC',
    hair: '#1C1917',
    headgear: '#2DD4BF',
    accent: '#5EEAD4',
    element: 'moc',
  },
  nga_mi: {
    robeMain: '#E0F2FE',
    robeDark: '#0284C7',
    sash: '#38BDF8',
    hair: '#1C1917',
    headgear: '#F472B6',
    accent: '#38BDF8',
    element: 'thuy',
  },
  thuy_yen: {
    robeMain: '#ECFEFF',
    robeDark: '#0E7490',
    sash: '#67E8F9',
    hair: '#18181B',
    headgear: '#A5F3FC',
    accent: '#22D3EE',
    element: 'thuy',
  },
  doan_thi: {
    robeMain: '#1D4ED8',
    robeDark: '#1E3A8A',
    sash: '#F5D061',
    hair: '#18181B',
    headgear: '#38BDF8',
    accent: '#FDE047',
    element: 'thuy',
  },
  cai_bang: {
    robeMain: '#7C2D12',
    robeDark: '#431407',
    sash: '#EF4444',
    hair: '#292524',
    headgear: '#DC2626',
    accent: '#FB923C',
    element: 'hoa',
  },
  thien_nhan: {
    robeMain: '#991B1B',
    robeDark: '#450A0A',
    sash: '#F97316',
    hair: '#18181B',
    headgear: '#EF4444',
    accent: '#FB923C',
    element: 'hoa',
  },
  vo_dang: {
    robeMain: '#1E3A8A',
    robeDark: '#172554',
    sash: '#F8FAFC',
    hair: '#18181B',
    headgear: '#F5D061',
    accent: '#FACC15',
    element: 'tho',
  },
  con_lon: {
    robeMain: '#312E81',
    robeDark: '#1E1B4B',
    sash: '#A78BFA',
    hair: '#27272A',
    headgear: '#C084FC',
    accent: '#93C5FD',
    element: 'tho',
  },
};

interface HeroPoseKeyframe {
  bobY: number;
  stride: number;
  leanX: number;
  armRaise: number;
  weapRot: number;
  capeFlutter: number;
  deathAngle: number;
}

function getHeroPoseKeyframe(
  state: AnimState,
  frameIdx: number,
  totalFrames: number,
  isMounted: boolean
): HeroPoseKeyframe {
  const t = totalFrames > 1 ? frameIdx / (totalFrames - 1) : 0;

  if (state === 'death') {
    const angles = [0.22, 0.68, 1.25, Math.PI / 2];
    const bobs = [0, 3, 6, 8];
    return {
      bobY: bobs[frameIdx % bobs.length],
      stride: 0,
      leanX: -frameIdx,
      armRaise: 2,
      weapRot: 0.4 + frameIdx * 0.35,
      capeFlutter: 0,
      deathAngle: angles[frameIdx % angles.length],
    };
  }

  if (state === 'hit') {
    const leans = [-4, -2, -1];
    const bobs = [-1, 0, 0];
    return {
      bobY: bobs[frameIdx % bobs.length],
      stride: -1,
      leanX: leans[frameIdx % leans.length],
      armRaise: -2,
      weapRot: -0.75 + frameIdx * 0.15,
      capeFlutter: -2,
      deathAngle: 0,
    };
  }

  if (state === 'attack') {
    // 5-frame martial arts strike: windup -> coil -> lunge slash -> follow-through -> recover
    const leans = [-2, -1, 5, 3, 1];
    const bobs = [0, -1, -2, -1, 0];
    const strides = [-1, 0, 2, 1, 0];
    const arms = [-5, -6, 3, 2, -1];
    const rots = [-1.75, -1.95, 1.05, 1.35, -0.15];
    const i = Math.min(4, frameIdx);
    return {
      bobY: bobs[i],
      stride: isMounted ? 0 : strides[i],
      leanX: leans[i],
      armRaise: arms[i],
      weapRot: rots[i],
      capeFlutter: i >= 2 ? 2 : -1,
      deathAngle: 0,
    };
  }

  if (state === 'cast') {
    const bobs = [-1, -3, -4, -2];
    const rots = [-1.15, -1.35, -1.5, -1.2];
    const i = frameIdx % 4;
    return {
      bobY: bobs[i],
      stride: 0,
      leanX: 0,
      armRaise: -5 - (i === 2 ? 1 : 0),
      weapRot: rots[i],
      capeFlutter: i % 2 === 0 ? 2 : 1,
      deathAngle: 0,
    };
  }

  if (state === 'run') {
    const strides = [3, 2, 0, -3, -2, 0];
    const bobs = [-2, -1, 0, -2, -1, 0];
    const flutters = [3, 2, 3, 1, 2, 3];
    const i = frameIdx % 6;
    return {
      bobY: bobs[i],
      stride: isMounted ? 0 : strides[i],
      leanX: 1,
      armRaise: strides[i] > 0 ? 1 : -1,
      weapRot: -0.35 + (strides[i] * 0.08),
      capeFlutter: flutters[i],
      deathAngle: 0,
    };
  }

  if (state === 'walk') {
    const strides = [2, 1, 0, -2, -1, 0];
    const bobs = [-1, 0, 0, -1, 0, 0];
    const flutters = [1, 2, 1, 0, 1, 0];
    const i = frameIdx % 6;
    return {
      bobY: bobs[i],
      stride: isMounted ? 0 : strides[i],
      leanX: 0,
      armRaise: strides[i] > 0 ? 1 : 0,
      weapRot: -0.35 + strides[i] * 0.06,
      capeFlutter: flutters[i],
      deathAngle: 0,
    };
  }

  if (state === 'mount') {
    const bobs = [0, -1, 0, 1];
    const flutters = [1, 2, 1, 2];
    const i = frameIdx % 4;
    return {
      bobY: bobs[i],
      stride: 0,
      leanX: 0,
      armRaise: 0,
      weapRot: -0.4 + t * 0.08,
      capeFlutter: flutters[i],
      deathAngle: 0,
    };
  }

  // Idle (4-frame rhythmic martial breathing)
  const bobs = [0, -1, -1, 0];
  const flutters = [0, 1, 1, 0];
  const i = frameIdx % 4;
  return {
    bobY: bobs[i],
    stride: 0,
    leanX: 0,
    armRaise: i === 1 || i === 2 ? -1 : 0,
    weapRot: -0.35 + (i === 1 || i === 2 ? -0.06 : 0),
    capeFlutter: flutters[i],
    deathAngle: 0,
  };
}

interface HeroSheetFingerprint {
  sectId: SectId;
  animState: AnimState;
  weaponKind: WeaponVisualKind;
  weaponQuality: ItemQuality;
  weaponEnh: number;
  hasWeapon: boolean;
  armorQuality: ItemQuality;
  hasArmor: boolean;
  bootQuality: ItemQuality | 'none';
  bracerQuality: ItemQuality | 'none';
  jadeQuality: ItemQuality | 'none';
  realmTier: number;
  mantleId: number;
  mantleColor: string;
  isMounted: boolean;
  isFlash: boolean;
}

function buildHeroFingerprint(params: PixelHeroDrawParams): HeroSheetFingerprint {
  const weapon = params.equipment?.weapon || null;
  const armor = params.equipment?.armor || null;
  const boots = params.equipment?.boots || null;
  const bracer = params.equipment?.bracer || null;
  const jade = params.equipment?.jade || null;

  // Bucket weapon enhance tiers to keep atlas count compact (0, 5, 8, 10, 12)
  const rawEnh = weapon?.enhance ?? 0;
  const enhBucket = rawEnh >= 12 ? 12 : rawEnh >= 10 ? 10 : rawEnh >= 8 ? 8 : rawEnh >= 5 ? 5 : 0;

  return {
    sectId: params.sectId,
    animState: params.animState,
    weaponKind: inferWeaponKind(weapon?.name, params.sectId),
    weaponQuality: weapon?.quality ?? 'white',
    weaponEnh: enhBucket,
    hasWeapon: !!weapon,
    armorQuality: armor?.quality ?? 'white',
    hasArmor: !!armor,
    bootQuality: boots ? boots.quality : 'none',
    bracerQuality: bracer ? bracer.quality : 'none',
    jadeQuality: jade ? jade.quality : 'none',
    realmTier: Math.min(5, Math.max(0, params.realmTier)),
    mantleId: params.mantleId,
    mantleColor: params.mantleColor,
    isMounted: params.isMounted,
    isFlash: params.hitFlash > 0.04,
  };
}

function heroFingerprintKey(fp: HeroSheetFingerprint): string {
  return `hero_hd2_${fp.sectId}_${fp.animState}_${fp.weaponKind}_${fp.weaponQuality}_${fp.weaponEnh}_${fp.armorQuality}_${fp.hasArmor ? 1 : 0}_${fp.bootQuality}_${fp.bracerQuality}_${fp.jadeQuality}_${fp.realmTier}_${fp.mantleId}_${fp.isMounted ? 1 : 0}_${fp.isFlash ? 'f' : 'n'}`;
}

function bakeHeroFrame(
  ctx: CanvasRenderingContext2D,
  view: OrientationView,
  frameIdx: number,
  totalFrames: number,
  fp: HeroSheetFingerprint
) {
  const pal = SECT_PALETTES[fp.sectId];
  const outline = '#120D0B';
  const pose = getHeroPoseKeyframe(fp.animState, frameIdx, totalFrames, fp.isMounted);

  const isBackView = view === 'back' || view === 'back_diag';
  const isSideView = view === 'side';
  const isFrontDiag = view === 'front_diag';
  const isBackDiag = view === 'back_diag';

  const armorTrim =
    fp.hasArmor && fp.armorQuality !== 'white'
      ? QUALITY_META[fp.armorQuality].color
      : fp.realmTier >= 2
      ? '#F5D061'
      : pal.accent;
  const bootColor =
    fp.bootQuality !== 'none' ? QUALITY_META[fp.bootQuality].color : '#3B281E';
  const bracerColor =
    fp.bracerQuality !== 'none' ? QUALITY_META[fp.bracerQuality].color : pal.sash;

  const flash = fp.isFlash && (fp.animState !== 'hit' || frameIdx === 0);
  const robeCol = flash ? '#FFFFFF' : pal.robeMain;
  const robeDark = flash ? '#FDE68A' : pal.robeDark;
  const skinCol = flash ? '#FFFFFF' : '#F8DAC0';
  const skinShade = flash ? '#FEF3C7' : '#D9AA88';

  const capeColor = fp.mantleId >= 1 ? fp.mantleColor : pal.robeDark;
  const showCape = fp.mantleId >= 1 || fp.realmTier >= 2;
  const flutter = pose.capeFlutter * 2.2;
  const stridePx = pose.stride * 2.3;

  ctx.save();
  ctx.translate(pose.leanX * 2, pose.bobY * 2);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (pose.deathAngle !== 0) {
    ctx.rotate(pose.deathAngle);
  }

  const drawFlowingCape = (inFront: boolean) => {
    ctx.save();
    const topW = isSideView ? 6 : 11;
    const botW = (isSideView ? 12 : 17) + Math.abs(flutter) * 0.45;
    const sway = (isSideView ? -8 : inFront ? 0 : -2) - flutter;

    const cg = ctx.createLinearGradient(0, -19, sway, 14);
    cg.addColorStop(0, capeColor);
    cg.addColorStop(0.7, capeColor);
    cg.addColorStop(1, '#120D0A');

    ctx.fillStyle = cg;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-topW, -18);
    ctx.lineTo(topW, -18);
    ctx.quadraticCurveTo(topW + 4 + sway * 0.25, -2, botW + sway * 0.65, 11 + Math.abs(flutter) * 0.2);
    ctx.quadraticCurveTo(sway * 0.7, 15, -botW + sway * 0.8, 11 + Math.abs(flutter) * 0.2);
    ctx.quadraticCurveTo(-topW - 4 + sway * 0.4, -2, -topW, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Flowing cloth fold shadows
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-3, -15);
    ctx.quadraticCurveTo(-5 + sway * 0.35, -1, -6 + sway * 0.65, 10);
    ctx.moveTo(3, -15);
    ctx.quadraticCurveTo(4 + sway * 0.25, -1, 5 + sway * 0.55, 10);
    ctx.stroke();

    // Embroidered golden mantle hem
    ctx.strokeStyle = fp.mantleId >= 3 ? '#FEF08A' : '#F5D061';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-botW + 2 + sway * 0.78, 9.5 + Math.abs(flutter) * 0.18);
    ctx.quadraticCurveTo(sway * 0.7, 13.5, botW - 2 + sway * 0.62, 9.5 + Math.abs(flutter) * 0.18);
    ctx.stroke();
    ctx.restore();
  };

  // --- LAYER 1: Flowing Phi Phong Cape behind hero ---
  if (showCape && !isBackView) {
    drawFlowingCape(false);
  }

  // --- LAYER 2: Flowing Lower Robe Tails & Sculpted Martial Boots ---
  const drawBoot = (bx: number, by: number, shade: string) => {
    ctx.fillStyle = shade;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.roundRect(bx - 3, by, 6, 10.5, 2);
    ctx.fill();
    ctx.stroke();
    // Cuffed shin guard + boot foot
    ctx.fillStyle = bootColor;
    ctx.beginPath();
    ctx.roundRect(bx - 3.3, by + 6.5, 6.8, 5.2, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F5D061';
    ctx.fillRect(bx - 2.6, by + 6.4, 5.2, 1.3);
  };

  if (fp.isMounted) {
    drawBoot(-6, 5, robeDark);
    drawBoot(6, 5, robeDark);
  } else if (isSideView) {
    drawBoot(-3 - stridePx, 5, robeDark);
    drawBoot(3 + stridePx, 5, robeCol);
  } else if (view === 'front' || view === 'back') {
    const leftLift = pose.stride > 0 ? -2.2 : 0;
    const rightLift = pose.stride < 0 ? -2.2 : 0;
    drawBoot(-5.5, 5 + leftLift, robeDark);
    drawBoot(5.5, 5 + rightLift, robeDark);
  } else {
    drawBoot(-5 - stridePx * 0.85, 5, robeDark);
    drawBoot(5 + stridePx * 0.85, 5, robeDark);
  }

  // --- LAYER 3: Sculpted Song-Dynasty Martial Robe & Armor ---
  const shoulderW = isSideView ? 9 : 11.5;
  const waistW = isSideView ? 7.5 : 9.2;
  const hemW = isSideView ? 11 : 13.5;

  const torsoGrad = ctx.createLinearGradient(-shoulderW, -18, shoulderW, 9);
  torsoGrad.addColorStop(0, robeCol);
  torsoGrad.addColorStop(0.55, robeCol);
  torsoGrad.addColorStop(1, robeDark);

  ctx.fillStyle = torsoGrad;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.45;
  ctx.beginPath();
  ctx.moveTo(-shoulderW, -17);
  ctx.lineTo(shoulderW, -17);
  ctx.lineTo(waistW, -2);
  ctx.lineTo(hemW, 10);
  ctx.quadraticCurveTo(0, 12.5, -hemW, 10);
  ctx.lineTo(-waistW, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Overlapping V-Lapel (Giao Lĩnh) & Inner Silk Undershirt (front/diag/side)
  if (!isBackView) {
    const shift = isSideView ? 2.8 : isFrontDiag ? 1.5 : 0;
    // Inner white/cream collar
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(-4 + shift, -17);
    ctx.lineTo(4 + shift, -17);
    ctx.lineTo(shift, -10.5);
    ctx.closePath();
    ctx.fill();

    // Diagonal robe lapel trim
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4.5 + shift, -17);
    ctx.lineTo(2 + shift, -9);
    ctx.lineTo(2.5 + shift, -2);
    ctx.moveTo(4.5 + shift, -17);
    ctx.lineTo(-1 + shift, -11);
    ctx.stroke();

    // Sect signature chest motifs
    if (fp.sectId === 'vo_dang') {
      // Crisp miniature Tai Chi medallion
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(shift, -8.5, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(shift, -8.5, 3.5, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    } else if (fp.sectId === 'thieu_lam') {
      // Golden Buddhist prayer beads necklace (Tràng Hạt)
      ctx.fillStyle = '#78350F';
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 0.7;
      for (let b = -3; b <= 3; b++) {
        const bx = shift + b * 2.3;
        const by = -14.5 + Math.cos(b * 0.45) * 4.2;
        ctx.beginPath();
        ctx.arc(bx, by, 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (fp.sectId === 'cai_bang') {
      // Diagonal leather sling + bronze wine gourd at hip
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-6 + shift, -16);
      ctx.lineTo(6 + shift, -2);
      ctx.stroke();
      // Hanging wine gourd (Hồ Lô Rượu)
      ctx.fillStyle = '#D97706';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-8.5, 1.5, 3.3, 0, Math.PI * 2);
      ctx.arc(-8.5, -2.2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-10, -1, 3, 1.2);
    } else if (fp.sectId === 'nga_mi') {
      // Flowing celestial cyan silk ribbon (Tiên Đới)
      ctx.strokeStyle = '#7DD3FC';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-9, -12);
      ctx.quadraticCurveTo(-14 - flutter * 0.5, -2, -11 - flutter * 0.7, 9);
      ctx.moveTo(8, -11);
      ctx.quadraticCurveTo(13 + flutter * 0.3, -1, 10 + flutter * 0.4, 8);
      ctx.stroke();
    } else if (fp.sectId === 'duong_mon') {
      // Shadow assassin crossed leather chest straps + emerald kunai buckle
      ctx.strokeStyle = '#064E3B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6 + shift, -16);
      ctx.lineTo(5 + shift, -3);
      ctx.moveTo(6 + shift, -16);
      ctx.lineTo(-5 + shift, -3);
      ctx.stroke();
      ctx.fillStyle = '#4ADE80';
      ctx.beginPath();
      ctx.arc(shift, -9.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (fp.sectId === 'thien_vuong') {
      // Heavy bronze-gold chest breastplate mirror (Hộ Tâm Kính)
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(shift, -9.5, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FEF9C3';
      ctx.beginPath();
      ctx.arc(shift - 0.8, -10.3, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (fp.sectId === 'ngu_doc') {
      // Silver-violet tribal venom clasp
      ctx.strokeStyle = '#84CC16';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(shift, -9.5, 3.2, 0.3, Math.PI - 0.3);
      ctx.stroke();
      ctx.fillStyle = '#C084FC';
      ctx.beginPath();
      ctx.arc(shift, -9.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (fp.sectId === 'minh_giao') {
      // Sacred Flame emblem on chest
      ctx.fillStyle = '#5EEAD4';
      ctx.beginPath();
      ctx.moveTo(shift, -13);
      ctx.lineTo(shift + 2.8, -8);
      ctx.lineTo(shift, -6.2);
      ctx.lineTo(shift - 2.8, -8);
      ctx.closePath();
      ctx.fill();
    } else if (fp.sectId === 'doan_thi') {
      // Royal Dali golden dragon chest seal
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(shift, -9.5, 3.3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (fp.sectId === 'thuy_yen') {
      // Floating frost-cyan silk ribbons
      ctx.strokeStyle = '#A5F3FC';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.quadraticCurveTo(-13 - flutter * 0.5, -2, -10 - flutter * 0.7, 9);
      ctx.stroke();
    } else if (fp.sectId === 'thien_nhan') {
      // Crimson-black flame armor plates
      ctx.fillStyle = '#FB923C';
      ctx.beginPath();
      ctx.moveTo(shift - 3.5, -13);
      ctx.lineTo(shift + 3.5, -13);
      ctx.lineTo(shift, -6.5);
      ctx.closePath();
      ctx.fill();
    } else if (fp.sectId === 'con_lon') {
      // Violet-blue lightning cloud crest
      ctx.strokeStyle = '#93C5FD';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(shift - 2.2, -12.5);
      ctx.lineTo(shift + 1.4, -9.5);
      ctx.lineTo(shift - 1.2, -9.5);
      ctx.lineTo(shift + 2.2, -6.2);
      ctx.stroke();
    }
  }

  // Embroidered Waist Sash Belt + Golden Medallion Buckle + Hanging Jade
  ctx.fillStyle = pal.sash;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(-waistW - 0.5, -4, (waistW + 0.5) * 2, 4.2, 1.2);
  ctx.fill();
  ctx.stroke();

  // Flowing front/side cloth sash tab
  ctx.fillStyle = pal.sash;
  ctx.beginPath();
  ctx.moveTo(-2.6, 0);
  ctx.lineTo(2.6, 0);
  ctx.lineTo(3.5 - flutter * 0.25, 10.5);
  ctx.lineTo(-3.5 - flutter * 0.25, 10.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Golden Belt Clasp
  ctx.fillStyle = '#F5D061';
  ctx.beginPath();
  ctx.roundRect(isSideView ? 0 : -2.4, -3.7, 4.8, 3.6, 1);
  ctx.fill();

  if (fp.jadeQuality !== 'none' && !isBackView) {
    ctx.fillStyle = QUALITY_META[fp.jadeQuality].color;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(isSideView ? 4 : 5.8, 1.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Sculpted Layered Armor Pauldrons with metallic shine
  if (fp.hasArmor || fp.realmTier >= 1) {
    const drawPauldron = (px: number, dir: number) => {
      const pg = ctx.createLinearGradient(px - 4, -19, px + 4, -11);
      pg.addColorStop(0, fp.realmTier >= 3 ? '#FEF08A' : armorTrim);
      pg.addColorStop(0.55, armorTrim);
      pg.addColorStop(1, '#1E1B18');
      ctx.fillStyle = pg;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(px, -15, 4.6, 4.2, dir * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Specular rim highlight
      ctx.strokeStyle = '#FEF9C3';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(px, -15.5, 2.8, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    };
    drawPauldron(isSideView ? -7.5 : -11, -1);
    drawPauldron(isSideView ? 7 : 11, 1);
  }

  // --- LAYER 4: Flowing Phi Phong on Back View (drapes over shoulders) ---
  if (showCape && isBackView) {
    drawFlowingCape(true);
  }

  // --- LAYER 5: Sculpted Wuxia Head, Expressive Face & Iconic Sect Hair/Headgear ---
  // Subtle Zen golden halo for high-tier Thiếu Lâm
  if (fp.sectId === 'thieu_lam' && fp.realmTier >= 2) {
    ctx.save();
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.72)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -28, 12.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Flowing rear hair ponytail / locks (behind head on front view, swaying with motion)
  if (fp.sectId !== 'thieu_lam' && !isBackView) {
    ctx.fillStyle = pal.hair;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-6, -24);
    ctx.quadraticCurveTo(-10 - flutter * 0.4, -17, -7 - flutter * 0.7, -11);
    ctx.lineTo(-2, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Oval sculpted head with warm volumetric skin shading
  const headGrad = ctx.createRadialGradient(-2, -30, 1.5, 0, -27, 10.5);
  headGrad.addColorStop(0, isBackView && fp.sectId !== 'thieu_lam' ? pal.hair : skinCol);
  headGrad.addColorStop(1, isBackView && fp.sectId !== 'thieu_lam' ? '#09090B' : skinShade);

  ctx.fillStyle = headGrad;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.45;
  ctx.beginPath();
  ctx.ellipse(0, -27.5, 8.6, 9.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (isBackView) {
    if (fp.sectId !== 'thieu_lam') {
      // Full flowing hair silhouette on back of head
      ctx.fillStyle = pal.hair;
      ctx.beginPath();
      ctx.ellipse(0, -27, 8.8, 9.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (isBackDiag) {
        ctx.fillStyle = skinCol;
        ctx.beginPath();
        ctx.ellipse(6.5, -26, 2.2, 4.5, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      // Flowing back hair tail
      ctx.fillStyle = pal.hair;
      ctx.beginPath();
      ctx.moveTo(-5, -22);
      ctx.lineTo(5, -22);
      ctx.lineTo(4 - flutter * 0.5, -10);
      ctx.lineTo(-4 - flutter * 0.5, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Sect-specific Hair Crown, Buns, Hood, Headband, Face Mask & Eyes
  if (fp.sectId === 'thieu_lam') {
    if (!isBackView) {
      // 6 classic Shaolin golden incense dots (Giới Ba)
      ctx.fillStyle = '#F59E0B';
      for (const dx of [-3, 0, 3]) {
        ctx.beginPath();
        ctx.arc(dx, -32.2, 0.9, 0, Math.PI * 2);
        ctx.arc(dx, -30.2, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (fp.sectId === 'vo_dang') {
    // Sleek bangs + high Taoist topknot (Đạo Quán) with golden crown & twin white ribbons
    if (!isBackView) {
      ctx.fillStyle = pal.hair;
      ctx.beginPath();
      ctx.arc(0, -28.5, 8.7, Math.PI * 1.05, Math.PI * 1.95);
      ctx.lineTo(7, -28);
      ctx.quadraticCurveTo(0, -32, -7, -28);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = pal.hair;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -38.5, 4.2, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Golden Taoist hairpin crown
    ctx.fillStyle = '#F5D061';
    ctx.beginPath();
    ctx.roundRect(-4.6, -37.2, 9.2, 2.5, 1);
    ctx.fill();
    ctx.stroke();
    // Twin floating silk ribbons
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4, -36);
    ctx.quadraticCurveTo(-10 - flutter * 0.6, -32, -12 - flutter, -24);
    ctx.moveTo(4, -36);
    ctx.quadraticCurveTo(9 - flutter * 0.4, -32, 10 - flutter * 0.8, -25);
    ctx.stroke();
  } else if (fp.sectId === 'nga_mi') {
    // Graceful twin buns + pink lotus hairpin + silky side bangs
    ctx.fillStyle = pal.hair;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-8.5, -33.5, 4, 0, Math.PI * 2);
    ctx.arc(8.5, -33.5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!isBackView) {
      ctx.beginPath();
      ctx.arc(0, -28.5, 8.8, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(0, -31.5, -8.5, -28);
      ctx.closePath();
      ctx.fill();
    }
    // Pink Lotus Hairpin ornaments
    ctx.fillStyle = '#F472B6';
    ctx.beginPath();
    ctx.arc(-7.5, -34, 2.2, 0, Math.PI * 2);
    ctx.arc(7.5, -34, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(7.5, -34, 0.9, 0, Math.PI * 2);
    ctx.fill();
  } else if (fp.sectId === 'duong_mon') {
    // Sleek dark-emerald assassin cowl/hood + lower face mask
    ctx.fillStyle = pal.headgear;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.arc(0, -28.5, 9.6, Math.PI * 0.92, Math.PI * 2.08);
    ctx.lineTo(8, -28);
    ctx.quadraticCurveTo(0, -32, -8, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Emerald forehead gem
    if (!isBackView) {
      ctx.fillStyle = '#4ADE80';
      ctx.beginPath();
      ctx.moveTo(0, -35.5);
      ctx.lineTo(2, -33);
      ctx.lineTo(0, -30.5);
      ctx.lineTo(-2, -33);
      ctx.closePath();
      ctx.fill();
      // Lower shadow face-mask
      ctx.fillStyle = '#0F2928';
      ctx.beginPath();
      ctx.ellipse(0, -22.2, 7.6, 4.3, 0, 0, Math.PI);
      ctx.lineTo(7.4, -24.5);
      ctx.quadraticCurveTo(0, -23.2, -7.4, -24.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (fp.sectId === 'thien_vuong') {
    // Bronze-gold general war helm with crimson plume
    ctx.fillStyle = '#B45309';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, -29, 9.4, Math.PI * 0.96, Math.PI * 2.04);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(-8.8, -30.5, 17.6, 2.2);
    // Flowing crimson war-plume
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.quadraticCurveTo(-7 - flutter * 0.6, -42, -11 - flutter, -31);
    ctx.stroke();
  } else if (fp.sectId === 'ngu_doc') {
    // Dark tribal hair + silver crescent-horned Miao crown
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.arc(0, -28.5, 8.8, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -36, 7, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = '#84CC16';
    ctx.beginPath();
    ctx.arc(0, -34.5, 2.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (fp.sectId === 'minh_giao') {
    // Flowing dark hair + emerald-white sacred flame circlet
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.arc(0, -28.5, 8.8, Math.PI * 1.02, Math.PI * 1.98);
    ctx.fill();
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-8.8, -32.2, 17.6, 2.8, 1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2DD4BF';
    ctx.beginPath();
    ctx.moveTo(0, -36.5);
    ctx.lineTo(2.4, -31.5);
    ctx.lineTo(-2.4, -31.5);
    ctx.closePath();
    ctx.fill();
  } else if (fp.sectId === 'thuy_yen') {
    // Elegant high bun + ice-blue crystal flower hairpin
    ctx.fillStyle = pal.hair;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -37.5, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!isBackView) {
      ctx.beginPath();
      ctx.arc(0, -28.5, 8.7, Math.PI * 1.03, Math.PI * 1.97);
      ctx.fill();
    }
    ctx.fillStyle = '#67E8F9';
    ctx.beginPath();
    ctx.arc(-5, -35.5, 2.4, 0, Math.PI * 2);
    ctx.arc(5, -35.5, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, -37, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (fp.sectId === 'doan_thi') {
    // Imperial Dali royal jade & gold crown
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.arc(0, -28.5, 8.7, Math.PI * 1.03, Math.PI * 1.97);
    ctx.fill();
    ctx.fillStyle = '#F5D061';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(-5.4, -39, 10.8, 5.2, 1.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(0, -36.4, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (fp.sectId === 'thien_nhan') {
    // Fierce horned dark-crimson battle crown
    ctx.fillStyle = '#1C1917';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -29, 9.2, Math.PI * 0.98, Math.PI * 2.02);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-6, -34);
    ctx.lineTo(-10, -40);
    ctx.moveTo(6, -34);
    ctx.lineTo(10, -40);
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, -33.5, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (fp.sectId === 'con_lon') {
    // Kunlun violet-silver Taoist cloud crown & floating ribbon
    ctx.fillStyle = pal.hair;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -38.5, 4.2, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!isBackView) {
      ctx.beginPath();
      ctx.arc(0, -28.5, 8.7, Math.PI * 1.04, Math.PI * 1.96);
      ctx.fill();
    }
    ctx.fillStyle = '#C084FC';
    ctx.beginPath();
    ctx.roundRect(-5, -37.2, 10, 2.6, 1);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#93C5FD';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4.5, -36);
    ctx.quadraticCurveTo(-11 - flutter * 0.5, -32, -13 - flutter, -24);
    ctx.stroke();
  } else {
    // Cái Bang wild windswept hair + vivid crimson headband with fluttering tails
    ctx.fillStyle = pal.hair;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-9.5, -28);
    ctx.lineTo(-10.5, -35);
    ctx.lineTo(-5, -34);
    ctx.lineTo(-2, -38.5);
    ctx.lineTo(2.5, -35);
    ctx.lineTo(7, -37.5);
    ctx.lineTo(10, -32);
    ctx.lineTo(9, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crimson headband + dynamic cloth tails
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.roundRect(-9.2, -32.2, 18.4, 3.2, 1.2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-9, -30.5);
    ctx.quadraticCurveTo(-14 - flutter * 0.5, -28, -16 - flutter, -21);
    ctx.stroke();
  }

  // Expressive Eyes & Sharp Brows (Front / Front-Diag / Side)
  if (!isBackView) {
    if (isSideView) {
      ctx.fillStyle = pal.hair;
      ctx.beginPath();
      ctx.ellipse(-4.5, -27, 4.2, 7, 0.1, 0, Math.PI * 2);
      ctx.fill();
      // Sharp eye + brow
      ctx.fillStyle = '#18181B';
      ctx.beginPath();
      ctx.ellipse(4.2, -26.2, 1.3, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(4.2, -27.2, 0.8, 0.8);
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(2.2, -28.8);
      ctx.lineTo(6.2, -28.2);
      ctx.stroke();
    } else {
      const es = isFrontDiag ? 1.8 : 0;
      for (const ex of [-3.2 + es, 3.2 + es]) {
        ctx.fillStyle = '#18181B';
        ctx.beginPath();
        ctx.ellipse(ex, -26, 1.25, 1.75, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(ex - 0.3, -27, 0.8, 0.8);
      }
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-5.2 + es, -28.6);
      ctx.lineTo(-1.4 + es, -28);
      ctx.moveTo(5.2 + es, -28.6);
      ctx.lineTo(1.4 + es, -28);
      ctx.stroke();
    }
  }

  // --- LAYER 6: Flowing Martial Sleeves, Bracers & Mastercraft Weapon ---
  if (!isSideView) {
    const lArmY = -12 - pose.armRaise * 0.7;
    ctx.fillStyle = robeCol;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-14, lArmY, 5.2, 10, 2.2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = bracerColor;
    ctx.fillRect(-13.6, lArmY + 6.5, 4.4, 3.4);
  }

  ctx.save();
  const handX = (isSideView ? 8.5 : isBackView ? 11.5 : 10.5);
  const handY = (-8 + pose.armRaise * 1.1);
  ctx.translate(handX, handY);
  ctx.rotate(pose.weapRot);

  const wColor = fp.hasWeapon ? QUALITY_META[fp.weaponQuality].color : '#E2E8F0';
  const wEdge = fp.weaponEnh >= 8 ? '#FFFFFF' : '#F8FAFC';

  if (fp.weaponEnh >= 5) {
    ctx.shadowColor = fp.weaponEnh >= 12 ? '#FDE047' : wColor;
    ctx.shadowBlur =
      fp.weaponEnh >= 12 ? 14 : fp.weaponEnh >= 10 ? 10 : fp.weaponEnh >= 8 ? 7 : 4;
  }

  if (fp.weaponKind === 'staff') {
    const isJadeBamboo = fp.sectId === 'cai_bang';
    const sg = ctx.createLinearGradient(-2, 0, 2, 0);
    sg.addColorStop(0, isJadeBamboo ? '#15803D' : '#78350F');
    sg.addColorStop(0.5, isJadeBamboo ? '#4ADE80' : '#D97706');
    sg.addColorStop(1, isJadeBamboo ? '#14532D' : '#451A03');
    ctx.fillStyle = sg;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(-2.2, -29, 4.4, 46, 2);
    ctx.fill();
    ctx.stroke();

    // Ornate golden dragon caps & Shaolin rings / bamboo knots
    ctx.fillStyle = '#F5D061';
    ctx.fillRect(-2.8, -30, 5.6, 5.5);
    ctx.fillRect(-2.6, 13, 5.2, 4.5);
    if (!isJadeBamboo) {
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(-4.2, -26, 2.2, 0, Math.PI * 2);
      ctx.arc(4.2, -26, 2.2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#14532D';
      for (const ky of [-18, -8, 2]) ctx.fillRect(-2.4, ky, 4.8, 1.5);
    }
  } else if (fp.weaponKind === 'blade') {
    // Broad curved Wuxia Sabre (Đao)
    ctx.fillStyle = '#7F1D1D';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.fillRect(-2, 1, 4, 8);
    ctx.strokeRect(-2, 1, 4, 8);

    ctx.fillStyle = '#F5D061';
    ctx.beginPath();
    ctx.ellipse(0, 1, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    const bg = ctx.createLinearGradient(-3, 0, 4, 0);
    bg.addColorStop(0, '#475569');
    bg.addColorStop(0.55, wColor);
    bg.addColorStop(1, wEdge);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(3, 0);
    ctx.quadraticCurveTo(5.5, -14, 2.5, -27);
    ctx.quadraticCurveTo(-2.5, -22, -2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (fp.weaponKind === 'dart') {
    // Sleek Đường Môn Repeater Wrist-Crossbow & Venom Chakram
    ctx.fillStyle = '#0F2928';
    ctx.strokeStyle = '#4ADE80';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(6.5, -5);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6.5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#BBF7D0';
    ctx.beginPath();
    ctx.arc(0, -5, 2.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (fp.weaponKind === 'spear') {
    // Long Imperial War Spear (Thương) with crimson tassel & gleaming blade tip
    ctx.fillStyle = '#78350F';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(-1.7, -22, 3.4, 40, 1.5);
    ctx.fill();
    ctx.stroke();
    // Crimson spear tassel
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.moveTo(-4, -19);
    ctx.lineTo(4, -19);
    ctx.lineTo(5.5, -13);
    ctx.lineTo(-5.5, -13);
    ctx.closePath();
    ctx.fill();
    // Golden collar + sharp lance head
    ctx.fillStyle = '#F5D061';
    ctx.fillRect(-2.6, -22, 5.2, 3);
    const spg = ctx.createLinearGradient(-3, -22, 3, -36);
    spg.addColorStop(0, wColor);
    spg.addColorStop(0.5, wEdge);
    spg.addColorStop(1, '#FFFFFF');
    ctx.fillStyle = spg;
    ctx.beginPath();
    ctx.moveTo(-3.2, -22);
    ctx.lineTo(0, -37);
    ctx.lineTo(3.2, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Elegant Tapered Immortal Sword (Kiếm) with ornate guard & crimson tassel
    ctx.fillStyle = '#7F1D1D';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.fillRect(-1.8, 1.5, 3.6, 8);
    ctx.strokeRect(-1.8, 1.5, 3.6, 8);
    // Flowing red sword tassel
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 9.5);
    ctx.quadraticCurveTo(-3.5, 13.5, -2, 16.5);
    ctx.stroke();

    // Winged golden crossguard
    ctx.fillStyle = '#F5D061';
    ctx.beginPath();
    ctx.moveTo(-6.5, 1.5);
    ctx.lineTo(0, -1.5);
    ctx.lineTo(6.5, 1.5);
    ctx.lineTo(0, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tapered double-edged blade with bright ridge highlight
    const bg = ctx.createLinearGradient(-3, 0, 3, 0);
    bg.addColorStop(0, wColor);
    bg.addColorStop(0.5, wEdge);
    bg.addColorStop(1, wColor);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-2.6, 0);
    ctx.lineTo(2.6, 0);
    ctx.lineTo(1.7, -23);
    ctx.lineTo(0, -29);
    ctx.lineTo(-1.7, -23);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Tapered Crescent Sword-Light Smear on impact frames (2 & 3)
  if (fp.animState === 'attack' && (frameIdx === 2 || frameIdx === 3)) {
    const smearCol = fp.weaponEnh >= 12 ? '#FEF08A' : ELEMENT_META[pal.element].color;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = frameIdx === 2 ? 0.92 : 0.48;
    ctx.fillStyle = smearCol;
    ctx.beginPath();
    ctx.arc(0, 0, 31, -Math.PI * 0.98, -Math.PI * 0.06);
    ctx.arc(0, 0, 21, -Math.PI * 0.06, -Math.PI * 0.98, true);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 28, -Math.PI * 0.92, -Math.PI * 0.14);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}

function getHeroAtlasSheet(params: PixelHeroDrawParams): SpriteSheetEntry {
  const fp = buildHeroFingerprint(params);
  const key = heroFingerprintKey(fp);
  const clip = ANIM_CLIPS[fp.animState] || ANIM_CLIPS.idle;

  return spriteAtlas.getOrBakeSheet(
    key,
    {
      cellW: 96,
      cellH: 100,
      cols: clip.frames,
      rows: 5,
      anchorX: 48,
      anchorY: 64,
      oversample: 2,
    },
    (ctx, row: AtlasOrientationRow, frameIdx: number, totalFrames: number) => {
      bakeHeroFrame(ctx, ATLAS_ROW_TO_VIEW[row], frameIdx, totalFrames, fp);
    }
  );
}

export function drawPixelHero(ctx: CanvasRenderingContext2D, params: PixelHeroDrawParams) {
  const {
    x,
    y,
    sectId,
    dir8,
    animState,
    animPhase,
    frameIndex,
    attackProgress,
    castProgress,
    equipment,
    realmTier,
    mantleId,
    mantleColor,
    scale = 1,
  } = params;

  const pal = SECT_PALETTES[sectId];
  const elemColor = ELEMENT_META[pal.element].color;
  const weapon = equipment?.weapon || null;
  const weaponEnh = weapon?.enhance ?? 0;
  const weaponQuality: ItemQuality = weapon?.quality ?? 'white';

  // Ground Elemental / Phi Phong Halo Ring (visible for Mantle >= 1 or Realm >= 2)
  if ((mantleId >= 1 || realmTier >= 2) && animState !== 'death') {
    const auraCol = mantleId >= 1 ? mantleColor : elemColor;
    ctx.save();
    ctx.translate(x, y + 11 * scale);
    ctx.scale(1, 0.44);
    ctx.globalAlpha = 0.34 + Math.sin(animPhase * 1.6) * 0.1;
    ctx.strokeStyle = auraCol;
    ctx.lineWidth = mantleId >= 4 ? 2.4 : 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, (24 + mantleId * 2.5) * scale, 0, Math.PI * 2);
    ctx.stroke();

    if (mantleId >= 3 || realmTier >= 3) {
      ctx.rotate(animPhase * 0.5);
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.arc(0, 0, (29 + mantleId * 2.2) * scale, a, a + 0.55);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Dynamic Light Pool for high-enhance weapons (+8+) or Mythic Realm
  if (weaponEnh >= 8 || realmTier >= 4) {
    drawDynamicLightPool(
      ctx,
      x,
      y - 6 * scale,
      30 + weaponEnh * 2.2,
      weaponEnh >= 12 ? '#FDE047' : QUALITY_META[weaponQuality].color,
      weaponEnh >= 12 ? 0.32 : 0.22
    );
  }

  // Orbiting Elemental Spirit Wisps with glowing trails for Realm Tier >= 3
  if (realmTier >= 3 && animState !== 'death') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const wispCount = realmTier >= 5 ? 4 : 2;
    for (let i = 0; i < wispCount; i++) {
      const a = animPhase * 0.95 + (i * Math.PI * 2) / wispCount;
      const wx = x + Math.cos(a) * 26 * scale;
      const wy = y - 10 * scale + Math.sin(a) * 9 * scale;
      const tx = x + Math.cos(a - 0.32) * 26 * scale;
      const ty = y - 10 * scale + Math.sin(a - 0.32) * 9 * scale;

      ctx.strokeStyle = i % 2 === 0 ? elemColor : '#FEF08A';
      ctx.lineWidth = 2.4 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(wx, wy);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(wx, wy, 2.2 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Resolve exact state-driven frame index (or fallback for standalone previews)
  const clip = ANIM_CLIPS[animState] || ANIM_CLIPS.idle;
  let resolvedFrame = frameIndex;
  if (resolvedFrame === undefined) {
    if (animState === 'attack') {
      resolvedFrame = Math.min(clip.frames - 1, Math.floor(attackProgress * clip.frames));
    } else if (animState === 'cast') {
      resolvedFrame = Math.min(clip.frames - 1, Math.floor(castProgress * clip.frames));
    } else {
      resolvedFrame = Math.floor(Math.abs(animPhase) * (clip.fps / 5)) % clip.frames;
    }
  }

  // O(1) GPU Blit from 2x oversampled HD 8-direction Sprite Sheet!
  const sheet = getHeroAtlasSheet(params);
  spriteAtlas.blitSheetFrame(ctx, sheet, dir8, resolvedFrame, x, y, scale, 1);

  // Runtime continuous +10/+12 weapon energy orbit & sparks
  if (weaponEnh >= 10 && animState !== 'death') {
    const dirMeta = getDir8Meta(dir8);
    const side = dirMeta.flipX ? -1 : 1;
    const ox = x + side * 12 * scale;
    const oy = y - 18 * scale;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = weaponEnh >= 12 ? '#FEF08A' : QUALITY_META[weaponQuality].color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(ox, oy, 7 * scale, animPhase, animPhase + Math.PI * 1.45);
    ctx.stroke();
    if (weaponEnh >= 12) {
      for (let m = 0; m < 3; m++) {
        const ma = animPhase * 2.4 + (m * Math.PI * 2) / 3;
        ctx.fillStyle = m % 2 === 0 ? '#FFFFFF' : elemColor;
        ctx.beginPath();
        ctx.arc(
          ox + Math.cos(ma) * 9.5 * scale,
          oy + Math.sin(ma) * 9.5 * scale,
          1.8 * scale,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Radiant Cast Qi Mandala around Hero when channeling a skill
  if (animState === 'cast') {
    const dirMeta = getDir8Meta(dir8);
    const side = dirMeta.flipX ? -1 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Rotating ground Qi circle
    ctx.save();
    ctx.translate(x, y + 10 * scale);
    ctx.scale(1, 0.45);
    ctx.rotate(animPhase * 1.4);
    ctx.strokeStyle = elemColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(0, 0, 26 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Glowing Qi Orb in hand
    const ox = x + side * 9 * scale;
    const oy = y - 16 * scale;
    const orbR = (5 + Math.sin(animPhase * 4.5) * 1.8) * scale;
    const g = ctx.createRadialGradient(ox, oy, 0.5, ox, oy, orbR * 2.2);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.4, elemColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ox, oy, orbR * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 4. PRE-BAKED 8-DIRECTION MONSTER & BOSS SPRITE ATLAS & RENDERER
// ---------------------------------------------------------------------------
export interface PixelMonsterDrawParams {
  x: number;
  y: number;
  archetype: MonsterArchetype;
  color: string;
  accentColor: string;
  dir8: Direction8;
  animState: AnimState;
  animPhase: number;
  frameIndex?: number;
  attackProgress: number;
  hitFlash: number;
  deathProgress: number;
  alertTimer: number;
  enraged: boolean;
  roarTimer: number;
  isElite: boolean;
}

function isBossArchetype(archetype: MonsterArchetype): boolean {
  return (
    archetype === 'boss_co_bach' ||
    archetype === 'boss_dieu_nhu' ||
    archetype === 'boss_thien_phong' ||
    archetype === 'boss_huyet_ma' ||
    archetype === 'dungeon_boss'
  );
}

function bakeMonsterFrame(
  ctx: CanvasRenderingContext2D,
  view: OrientationView,
  frameIdx: number,
  totalFrames: number,
  archetype: MonsterArchetype,
  color: string,
  accentColor: string,
  animState: AnimState,
  enraged: boolean,
  isElite: boolean,
  isFlash: boolean
) {
  const isBoss = isBossArchetype(archetype);
  const ps = isBoss ? 2.5 : isElite ? 2.15 : 2;
  const outline = '#120D0A';

  const isBackView = view === 'back' || view === 'back_diag';
  const isSideView = view === 'side';
  const isFront = view === 'front';

  // Keyframed kinematics by AnimState
  let stride = 0;
  let bob = 0;
  let lunge = 0;
  let weapRot = -0.32;
  let deathAngle = 0;

  if (animState === 'death') {
    const angles = [0.25, 0.72, 1.25, Math.PI / 2];
    const bobs = [0, 3, 6, 8];
    deathAngle = angles[frameIdx % angles.length];
    bob = bobs[frameIdx % bobs.length];
  } else if (animState === 'hit') {
    const recoils = [-4, -2, -1];
    lunge = recoils[frameIdx % recoils.length];
    bob = frameIdx === 0 ? -1 : 0;
  } else if (animState === 'attack') {
    const lunges = [-2, 0, 6, 3, 1];
    const rots = [-1.55, -1.75, 1.05, 1.25, -0.15];
    const i = Math.min(4, frameIdx);
    lunge = lunges[i];
    weapRot = rots[i];
    bob = i === 2 ? -2 : 0;
  } else if (animState === 'cast' || animState === 'roar') {
    const i = frameIdx % Math.max(1, totalFrames);
    bob = i === 1 || i === 2 ? -3 : -1;
    weapRot = -1.2 - (i === 2 ? 0.25 : 0);
  } else if (animState === 'walk' || animState === 'run') {
    const strides = [2, 1, 0, -2, -1, 0];
    const bobs = [-2, -1, 0, -2, -1, 0];
    stride = strides[frameIdx % strides.length];
    bob = bobs[frameIdx % bobs.length];
    weapRot = -0.32 + stride * 0.08;
  } else {
    const bobs = [0, -1, -1, 0];
    bob = bobs[frameIdx % bobs.length];
  }

  const f = isFlash && (animState !== 'hit' || frameIdx === 0);
  const mainCol = f ? '#FFFFFF' : color;
  const subCol = f ? '#FEF3C7' : accentColor;

  ctx.save();
  ctx.translate(Math.round(lunge * ps), Math.round(bob * ps));
  if (deathAngle !== 0) {
    ctx.rotate(deathAngle);
  }

  if (archetype === 'boar') {
    if (isFront || view === 'back') {
      p(ctx, -6, -4, 12, 10, outline, ps);
      p(ctx, -5, -3, 10, 8, mainCol, ps);
      p(ctx, -1, -5, 2, 7, '#475569', ps);
      if (isFront) {
        p(ctx, -3, 0, 6, 4, '#CBD5E1', ps);
        p(ctx, -5, 1, 2, 2, '#FFFBEB', ps);
        p(ctx, 3, 1, 2, 2, '#FFFBEB', ps);
        p(ctx, -3, -2, 2, 2, '#EF4444', ps);
        p(ctx, 1, -2, 2, 2, '#EF4444', ps);
      }
      p(ctx, -5, 5 + (stride > 0 ? -1 : 0), 3, 4, '#334155', ps);
      p(ctx, 2, 5 + (stride < 0 ? -1 : 0), 3, 4, '#334155', ps);
    } else {
      p(ctx, -10, -4, 20, 10, outline, ps);
      p(ctx, -9, -3, 18, 8, mainCol, ps);
      p(ctx, -8, -5, 14, 2, '#475569', ps);
      p(ctx, 8, -2, 4, 6, '#CBD5E1', ps);
      p(ctx, 10, 0, 3, 2, '#FFFBEB', ps);
      if (!isBackView) p(ctx, 6, -2, 2, 2, '#EF4444', ps);
      p(ctx, -8 - stride, 5, 3, 4, '#334155', ps);
      p(ctx, 5 + stride, 5, 3, 4, '#334155', ps);
    }
  } else if (archetype === 'frost_wolf') {
    if (isFront || view === 'back') {
      p(ctx, -6, -5, 12, 9, outline, ps);
      p(ctx, -5, -4, 10, 7, mainCol, ps);
      p(ctx, -4, -7, 8, 4, '#E0F2FE', ps);
      if (isFront) {
        p(ctx, -3, -10, 6, 5, mainCol, ps);
        p(ctx, -4, -13, 2, 3, '#E0F2FE', ps);
        p(ctx, 2, -13, 2, 3, '#E0F2FE', ps);
        p(ctx, -2, -8, 1, 1, '#FEF08A', ps);
        p(ctx, 1, -8, 1, 1, '#FEF08A', ps);
      } else {
        p(ctx, -2, -2, 4, 7, '#BAE6FD', ps);
      }
      p(ctx, -4, 3 + (stride > 0 ? -1 : 0), 3, 5, '#475569', ps);
      p(ctx, 1, 3 + (stride < 0 ? -1 : 0), 3, 5, '#475569', ps);
    } else {
      p(ctx, -15, -3 + (frameIdx % 2 === 0 ? 1 : 0), 6, 3, '#BAE6FD', ps);
      p(ctx, -10, -4, 19, 8, outline, ps);
      p(ctx, -9, -3, 17, 6, mainCol, ps);
      p(ctx, 3, -6, 6, 6, '#E0F2FE', ps);
      p(ctx, 8, -9, 7, 5, mainCol, ps);
      p(ctx, 9, -12, 2, 3, '#E0F2FE', ps);
      if (!isBackView) {
        p(ctx, 13, -7, 3, 2, '#7DD3FC', ps);
        p(ctx, 12, -8, 1, 1, '#FEF08A', ps);
      }
      p(ctx, -7 - stride, 3, 3, 5, '#475569', ps);
      p(ctx, 5 + stride, 3, 3, 5, '#475569', ps);
    }
  } else if (archetype === 'sword_golem' || archetype === 'sword_wraith') {
    const hover = frameIdx % 2 === 0 ? -2 : 1;
    p(ctx, -7, -14 + hover, 14, 18, outline, ps);
    p(ctx, -6, -13 + hover, 12, 16, mainCol, ps);
    p(ctx, -4, -19 + hover, 8, 6, archetype === 'sword_wraith' ? '#1E1B4B' : '#78350F', ps);
    if (!isBackView) {
      p(ctx, -2, -17 + hover, 2, 2, '#FEF08A', ps);
      p(ctx, 2, -17 + hover, 2, 2, '#FEF08A', ps);
    }
    p(ctx, -11, -12 - hover, 2, 12, '#FDE047', ps);
    p(ctx, 10, -10 + hover, 2, 12, '#FDE047', ps);
  } else if (isBoss) {
    const capeCol = enraged
      ? '#991B1B'
      : archetype === 'boss_dieu_nhu'
      ? '#0369A1'
      : archetype === 'boss_huyet_ma'
      ? '#581C87'
      : '#451A03';
    const cw = frameIdx % 2 === 0 ? 2 : 0;

    if (!isBackView) {
      p(ctx, -10 - cw, -12, 19, 19, outline, ps);
      p(ctx, -9 - cw, -11, 17, 17, capeCol, ps);
      p(ctx, -9 - cw, 4, 17, 2, '#F5D061', ps);
    }

    p(ctx, -5 - stride, 4, 4, 6, '#1C1917', ps);
    p(ctx, 1 + stride, 4, 4, 6, '#1C1917', ps);
    p(ctx, -5 - stride, 8, 4, 2, '#F5D061', ps);
    p(ctx, 1 + stride, 8, 4, 2, '#F5D061', ps);

    p(ctx, -8, -11, 16, 16, outline, ps);
    p(ctx, -7, -10, 14, 14, mainCol, ps);
    p(ctx, -10, -12, 4, 5, '#F5D061', ps);
    p(ctx, 6, -12, 4, 5, '#F5D061', ps);
    p(ctx, -6, -3, 12, 3, '#1C1917', ps);
    p(ctx, -2, -3, 4, 3, enraged ? '#EF4444' : '#FDE047', ps);

    p(ctx, -5, -21, 10, 10, outline, ps);
    p(
      ctx,
      -4,
      -20,
      8,
      8,
      isBackView ? '#292524' : archetype === 'boss_dieu_nhu' ? '#FCE7F3' : '#E7C6A5',
      ps
    );
    if (archetype === 'boss_dieu_nhu') {
      p(ctx, -6, -22, 12, 4, '#E0F2FE', ps);
      p(ctx, -3, -25, 6, 3, '#38BDF8', ps);
      p(ctx, -1, -26, 2, 2, '#FFFFFF', ps);
    } else if (archetype === 'boss_huyet_ma' || archetype === 'boss_thien_phong') {
      p(ctx, -6, -22, 12, 3, '#1C1917', ps);
      p(ctx, -8, -26, 3, 5, enraged ? '#EF4444' : '#F5D061', ps);
      p(ctx, 5, -26, 3, 5, enraged ? '#EF4444' : '#F5D061', ps);
    } else {
      p(ctx, -5, -23, 10, 4, '#292524', ps);
      p(ctx, -3, -26, 6, 3, '#F5D061', ps);
    }

    if (isBackView) {
      p(ctx, -9, -11, 18, 17 + cw, capeCol, ps);
      p(ctx, -9, 4 + cw, 18, 2, '#F5D061', ps);
    } else {
      const eyeShift = isSideView ? 1 : 0;
      p(ctx, -2 + eyeShift, -17, 2, 2, enraged ? '#EF4444' : '#FEF08A', ps);
      p(ctx, 2 + eyeShift, -17, 2, 2, enraged ? '#EF4444' : '#FEF08A', ps);
    }

    ctx.save();
    ctx.translate(Math.round(8 * ps), Math.round(-4 * ps));
    ctx.rotate(weapRot);
    ctx.shadowColor = enraged ? '#EF4444' : subCol;
    ctx.shadowBlur = 10;
    p(ctx, -1, 1, 3, 5, '#7F1D1D', ps);
    p(ctx, -4, 0, 8, 2, '#F5D061', ps);
    p(ctx, -2, -18, 4, 18, enraged ? '#EF4444' : subCol, ps);
    p(ctx, 0, -18, 1, 17, '#FFFFFF', ps);
    ctx.restore();
  } else {
    // Distinct Humanoid Monsters (8-dir torso, helmet, eyes & weapon)
    const torsoX = isSideView ? -5 : -6;
    const torsoW = isSideView ? 10 : 12;
    p(ctx, -4 - stride, 3, 3, 5, '#1C1917', ps);
    p(ctx, 1 + stride, 3, 3, 5, '#1C1917', ps);
    p(ctx, torsoX, -9, torsoW, 13, outline, ps);
    p(ctx, torsoX + 1, -8, torsoW - 2, 11, mainCol, ps);
    p(ctx, torsoX + 1, -2, torsoW - 2, 2, '#1C1917', ps);

    p(ctx, -4, -17, 8, 8, outline, ps);
    p(ctx, -3, -16, 6, 6, isBackView ? '#292524' : '#E8C5A5', ps);
    if (archetype === 'assassin' || archetype === 'blood_assassin') {
      p(ctx, -4, -18, 8, 4, '#18181B', ps);
      if (!isBackView) {
        p(ctx, -4, -13, 8, 3, '#18181B', ps);
        p(ctx, -2, -14, 1, 1, '#EF4444', ps);
        p(ctx, 2, -14, 1, 1, '#EF4444', ps);
      }
    } else if (
      archetype === 'armored_cavalry' ||
      archetype === 'vanguard_knight' ||
      archetype === 'war_general' ||
      archetype === 'siege_enemy'
    ) {
      p(ctx, -5, -19, 10, 5, '#475569', ps);
      p(ctx, -1, -22, 2, 4, '#DC2626', ps);
      p(ctx, -6, -8, 2, 3, '#94A3B8', ps);
      p(ctx, 4, -8, 2, 3, '#94A3B8', ps);
    } else if (archetype === 'siege_ally') {
      p(ctx, -5, -19, 10, 5, '#1D4ED8', ps);
      p(ctx, -1, -22, 2, 4, '#F5D061', ps);
    } else if (archetype === 'snow_monk' || archetype === 'dark_demon') {
      p(ctx, -4, -17, 8, 3, '#312E81', ps);
      if (!isBackView) {
        p(ctx, -2, -14, 2, 2, '#C084FC', ps);
        p(ctx, 1, -14, 2, 2, '#C084FC', ps);
      }
    } else if (archetype === 'bandit_chief' || archetype === 'elder_blade') {
      p(ctx, -6, -18, 12, 3, '#78350F', ps);
      p(ctx, -3, -20, 6, 2, '#92400E', ps);
    } else {
      p(ctx, -4, -17, 8, 2, '#991B1B', ps);
      if (!isBackView) {
        const es = isSideView ? 1 : 0;
        p(ctx, -2 + es, -14, 1, 1, '#1C1917', ps);
        if (!isSideView) p(ctx, 2, -14, 1, 1, '#1C1917', ps);
      }
    }

    ctx.save();
    ctx.translate(Math.round(5 * ps), Math.round(-4 * ps));
    ctx.rotate(weapRot);
    if (archetype === 'bandit' || archetype === 'bandit_chief') {
      p(ctx, -1, -9, 3, 10, '#CBD5E1', ps);
    } else if (
      archetype === 'vanguard_knight' ||
      archetype === 'armored_cavalry' ||
      archetype === 'war_general'
    ) {
      p(ctx, -1, -14, 2, 20, '#78350F', ps);
      p(ctx, -2, -15, 4, 5, '#E2E8F0', ps);
    } else if (archetype === 'assassin' || archetype === 'blood_assassin') {
      p(ctx, -1, -7, 2, 8, '#F87171', ps);
    } else {
      p(ctx, -1, -11, 2, 12, subCol, ps);
    }
    ctx.restore();
  }

  ctx.restore();
}

function getMonsterAtlasSheet(
  archetype: MonsterArchetype,
  color: string,
  accentColor: string,
  animState: AnimState,
  enraged: boolean,
  isElite: boolean,
  isFlash: boolean
): SpriteSheetEntry {
  const isBoss = isBossArchetype(archetype);
  const clip = ANIM_CLIPS[animState] || ANIM_CLIPS.idle;
  const key = `mob_${archetype}_${color}_${accentColor}_${animState}_${enraged ? 1 : 0}_${isElite ? 1 : 0}_${isFlash ? 'f' : 'n'}`;

  return spriteAtlas.getOrBakeSheet(
    key,
    {
      cellW: isBoss ? 140 : 88,
      cellH: isBoss ? 140 : 88,
      cols: clip.frames,
      rows: 5,
      anchorX: isBoss ? 70 : 44,
      anchorY: isBoss ? 92 : 56,
    },
    (ctx, row: AtlasOrientationRow, frameIdx: number, totalFrames: number) => {
      bakeMonsterFrame(
        ctx,
        ATLAS_ROW_TO_VIEW[row],
        frameIdx,
        totalFrames,
        archetype,
        color,
        accentColor,
        animState,
        enraged,
        isElite,
        isFlash
      );
    }
  );
}

export function drawPixelMonster(ctx: CanvasRenderingContext2D, params: PixelMonsterDrawParams) {
  const {
    x,
    y,
    archetype,
    color,
    accentColor,
    dir8,
    animState,
    animPhase,
    frameIndex,
    attackProgress,
    hitFlash,
    deathProgress,
    alertTimer,
    enraged,
    roarTimer,
    isElite,
  } = params;

  const isBoss = isBossArchetype(archetype);
  const outline = '#120D0A';

  // Static/Structural Siege & Guild War Objectives (Gate, Pillar, Banner)
  if (archetype === 'gate' || archetype === 'pillar' || archetype === 'banner') {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    if (archetype === 'gate') {
      p(ctx, -18, -24, 36, 48, outline, 2);
      p(ctx, -16, -22, 32, 44, hitFlash > 0 ? '#FFFFFF' : '#4A3222', 2);
      p(ctx, -16, -12, 32, 3, '#F59E0B', 2);
      p(ctx, -16, 8, 32, 3, '#F59E0B', 2);
      for (let gx = -12; gx <= 10; gx += 7) {
        p(ctx, gx, -18, 2, 2, '#FDE047', 2);
        p(ctx, gx, 0, 2, 2, '#FDE047', 2);
      }
    } else if (archetype === 'pillar') {
      drawDynamicLightPool(ctx, 0, 0, 62, '#F5D061', 0.28);
      p(ctx, -12, -26, 24, 50, outline, 2);
      p(ctx, -10, -24, 20, 46, hitFlash > 0 ? '#FFFFFF' : '#78350F', 2);
      p(ctx, -12, -24, 24, 4, '#F5D061', 2);
      p(ctx, -12, 18, 24, 5, '#F5D061', 2);
      p(ctx, -7, -14, 14, 4, '#FDE047', 2);
      p(ctx, -5, -4, 12, 4, '#F5D061', 2);
      p(ctx, -8, 6, 15, 4, '#FDE047', 2);
    } else {
      drawDynamicLightPool(ctx, 0, 0, 52, color, 0.25);
      p(ctx, -2, -28, 4, 50, '#F5D061', 2);
      const wave = Math.round(Math.sin(animPhase * 1.4) * 2);
      p(ctx, 2, -24, 16, 18, outline, 2);
      p(ctx, 3, -23, 14 + wave * 0.4, 16, hitFlash > 0 ? '#FFFFFF' : color, 2);
      p(ctx, 6, -18, 8, 6, '#F5D061', 2);
    }
    ctx.restore();
    return;
  }

  // Boss Enrage / Roar / Ground Aura (dynamic runtime layer)
  if (isBoss && deathProgress <= 0) {
    const bossAuraColor = enraged ? '#EF4444' : color;
    drawDynamicLightPool(ctx, x, y + 6, enraged ? 72 : 54, bossAuraColor, enraged ? 0.34 : 0.24);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + 22));
    ctx.scale(1, 0.44);
    ctx.strokeStyle = bossAuraColor;
    ctx.shadowColor = bossAuraColor;
    ctx.shadowBlur = enraged ? 20 : 14;
    ctx.lineWidth = enraged ? 3.5 : 2.5;
    ctx.globalAlpha = 0.8;
    const rad = (enraged ? 46 : 38) + Math.sin(animPhase * 1.6) * 3;
    ctx.beginPath();
    ctx.arc(0, 0, rad, animPhase * 0.5, animPhase * 0.5 + Math.PI * 1.65);
    ctx.stroke();
    if (roarTimer > 0) {
      const rp = 1 - Math.min(1, roarTimer / 0.8);
      ctx.strokeStyle = '#FEF08A';
      ctx.globalAlpha = 1 - rp;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 26 + rp * 85, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  const clip = ANIM_CLIPS[animState] || ANIM_CLIPS.idle;
  let resolvedFrame = frameIndex;
  if (resolvedFrame === undefined) {
    if (animState === 'death') {
      resolvedFrame = Math.min(clip.frames - 1, Math.floor(deathProgress * clip.frames));
    } else if (animState === 'attack') {
      resolvedFrame = Math.min(clip.frames - 1, Math.floor(attackProgress * clip.frames));
    } else {
      resolvedFrame = Math.floor(Math.abs(animPhase) * (clip.fps / 5)) % clip.frames;
    }
  }

  const alpha = deathProgress > 0 ? Math.max(0, 1 - deathProgress) : 1;
  const sheet = getMonsterAtlasSheet(
    archetype,
    color,
    accentColor,
    animState,
    enraged,
    isElite,
    hitFlash > 0.04
  );
  spriteAtlas.blitSheetFrame(ctx, sheet, dir8, resolvedFrame, x, y, 1, alpha);

  // Alert '!' visual behavior indicator
  if (alertTimer > 0 && deathProgress <= 0) {
    ctx.save();
    ctx.font = '900 16px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#991B1B';
    ctx.lineWidth = 3;
    const ay = y - (isBoss ? 68 : 44) - Math.sin(alertTimer * 10) * 3;
    ctx.strokeText('!', x, ay);
    ctx.fillText('!', x, ay);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 5. NON-BLOCKING BATTLE SPRITE ATLAS PRELOADER & WARMUP DESCRIPTORS
// ---------------------------------------------------------------------------
export type HeroWarmupParams = Omit<
  PixelHeroDrawParams,
  'x' | 'y' | 'dir8' | 'animState' | 'animPhase' | 'attackProgress' | 'castProgress' | 'hitFlash'
>;

export function createHeroAtlasWarmup(heroParams: HeroWarmupParams): {
  signature: string;
  tasks: Array<() => void>;
} {
  const fp = buildHeroFingerprint({
    ...heroParams,
    x: 0,
    y: 0,
    dir8: 2,
    animState: 'idle',
    animPhase: 0,
    attackProgress: 0,
    castProgress: 0,
    hitFlash: 0,
  });
  const signature = `warmup_hero_${heroFingerprintKey(fp)}`;
  const states: AnimState[] = heroParams.isMounted
    ? ['mount', 'attack', 'cast', 'hit']
    : ['idle', 'walk', 'run', 'attack', 'cast', 'hit'];
  const tasks = states.map((state) => () => {
    getHeroAtlasSheet({
      ...heroParams,
      x: 0,
      y: 0,
      dir8: 2,
      animState: state,
      animPhase: 0,
      attackProgress: 0,
      castProgress: 0,
      hitFlash: state === 'hit' ? 0.14 : 0,
    });
  });
  return { signature, tasks };
}

export function createMountAtlasWarmup(
  mount: MountDef,
  illusion: MountIllusionDef | null,
  illusionStars: number
): { signature: string; tasks: Array<() => void> } {
  const signature = `warmup_mount_${mount.id}_${illusion?.id || 'none'}_${illusionStars}`;
  return {
    signature,
    tasks: [
      () => getMountAtlasSheet(mount, illusion, illusionStars, false),
      () => getMountAtlasSheet(mount, illusion, illusionStars, true),
    ],
  };
}

export function createMonsterAtlasWarmup(mob: {
  archetype: MonsterArchetype;
  color: string;
  accentColor: string;
  isElite: boolean;
  enraged?: boolean;
}): { signature: string; tasks: Array<() => void> } | null {
  if (mob.archetype === 'gate' || mob.archetype === 'pillar' || mob.archetype === 'banner') {
    return null;
  }
  const enraged = Boolean(mob.enraged);
  const signature = `warmup_mob_${mob.archetype}_${mob.color}_${mob.isElite ? 1 : 0}_${enraged ? 1 : 0}`;
  const states: AnimState[] = isBossArchetype(mob.archetype)
    ? ['idle', 'walk', 'attack', 'cast', 'roar', 'hit', 'death']
    : ['idle', 'walk', 'attack', 'hit', 'death'];
  const tasks = states.map((st) => () => {
    getMonsterAtlasSheet(
      mob.archetype,
      mob.color,
      mob.accentColor,
      st,
      enraged,
      mob.isElite,
      st === 'hit'
    );
  });
  return { signature, tasks };
}

export function preloadBattleSpriteAtlases(opts: {
  heroParams: HeroWarmupParams;
  mount?: MountDef | null;
  illusion?: MountIllusionDef | null;
  illusionStars?: number;
  monsters: Array<{
    archetype: MonsterArchetype;
    color: string;
    accentColor: string;
    isElite: boolean;
  }>;
}) {
  const heroWarmup = createHeroAtlasWarmup(opts.heroParams);
  for (const task of heroWarmup.tasks) {
    spriteAtlas.enqueuePreload(task);
  }

  if (opts.mount) {
    const mountWarmup = createMountAtlasWarmup(
      opts.mount,
      opts.illusion || null,
      opts.illusionStars || 0
    );
    for (const task of mountWarmup.tasks) {
      spriteAtlas.enqueuePreload(task);
    }
  }

  const seenMob = new Set<string>();
  for (const mob of opts.monsters) {
    const mobWarmup = createMonsterAtlasWarmup(mob);
    if (!mobWarmup || seenMob.has(mobWarmup.signature)) continue;
    seenMob.add(mobWarmup.signature);
    for (const task of mobWarmup.tasks) {
      spriteAtlas.enqueuePreload(task);
    }
  }
}

// ---------------------------------------------------------------------------
// 6. 12-SECT / 72-SKILL SIGNATURE MARTIAL ARTS VFX (KIM – MỘC – THỦY – HỎA – THỔ)
// ---------------------------------------------------------------------------
function drawStar4(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.28, cy - r * 0.28);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx + r * 0.28, cy + r * 0.28);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.28, cy + r * 0.28);
  ctx.lineTo(cx - r, cy);
  ctx.lineTo(cx - r * 0.28, cy - r * 0.28);
  ctx.closePath();
}

function drawGroundZoneUnderlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rad: number,
  color: string,
  alpha: number,
  aspectY = 0.54,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.translate(x, y + 4);
  ctx.scale(1, aspectY);
  ctx.globalAlpha = alpha * 0.42;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
  ctx.beginPath();
  ctx.arc(0, 0, rad * 1.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.72;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.restore();
}

export function drawFiveElementSkillVfx(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  curRad: number,
  progress: number,
  element: ElementType,
  color: string,
  accent: string,
  kind: SkillVfxKind,
  angle = 0,
  sourceX = x,
  sourceY = y
) {
  const alpha = Math.max(0, 1 - progress);
  ctx.save();

  drawDynamicLightPool(ctx, x, y, curRad * 1.15, color, alpha * 0.28);

  // 1. SINGLE / DOUBLE / TRIPLE CRESCENT SLASHES
  // slash_single (Phục Ma Đao), blade_arc (Phá Giới Đao 2 nhịp, nhịp 2 sáng hơn), sword_triple (Tam Hoàn Thao Nguyệt 3 nhịp)
  if (kind === 'slash' || kind === 'slash_single' || kind === 'blade_arc' || kind === 'sword_triple') {
    ctx.translate(x, y);
    ctx.rotate(angle);
    const sweepCount = kind === 'sword_triple' ? 3 : kind === 'blade_arc' ? 2 : 1;

    for (let sw = 0; sw < sweepCount; sw++) {
      const localP = Math.max(0, Math.min(1, progress * (sweepCount === 1 ? 1.15 : 1.38) - sw * 0.17));
      if (localP <= 0) continue;
      const isFinalBright = sw === sweepCount - 1;
      const aLocal = (1 - localP) * (isFinalBright ? 0.98 : 0.76);
      const sweep = (kind === 'slash_single' ? 1.06 : 1.16) - sw * 0.06;
      const outerR = curRad * (0.9 + sw * 0.15);
      const innerR = Math.max(8, outerR * (0.58 + localP * 0.24));
      const rotOffset =
        kind === 'sword_triple'
          ? (sw - 1) * 0.42
          : kind === 'blade_arc'
            ? (sw === 0 ? -0.22 : 0.24)
            : 0;

      ctx.save();
      ctx.rotate(rotOffset);
      // Contrast under-arc so pale gold/white pops on sunlit maps
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = aLocal * 0.68;
      ctx.strokeStyle = 'rgba(24, 24, 27, 0.58)';
      ctx.lineWidth = Math.max(3, (isFinalBright ? 9 : 6.5) * aLocal);
      ctx.beginPath();
      ctx.arc(0, 0, outerR * 0.95, -sweep, sweep);
      ctx.stroke();

      ctx.globalAlpha = aLocal * 0.88;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, (isFinalBright ? 6.5 : 4.6) * aLocal);
      ctx.beginPath();
      ctx.arc(0, 0, outerR * 0.94, -sweep, sweep);
      ctx.stroke();

      // Luminous crescent fill
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = aLocal;
      const slashGrad = ctx.createRadialGradient(0, 0, innerR * 0.65, 0, 0, outerR);
      slashGrad.addColorStop(0, 'rgba(255,255,255,0)');
      slashGrad.addColorStop(0.52, color);
      slashGrad.addColorStop(0.84, accent);
      slashGrad.addColorStop(1, '#FFFFFF');
      ctx.fillStyle = slashGrad;
      ctx.beginPath();
      ctx.arc(0, 0, outerR, -sweep, sweep);
      ctx.arc(outerR * 0.14, 0, innerR, sweep, -sweep, true);
      ctx.closePath();
      ctx.fill();

      // Razor white-silver core edge
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1.4, (isFinalBright ? 3.8 : 2.5) * aLocal);
      ctx.beginPath();
      ctx.arc(0, 0, outerR * 0.97, -sweep * 0.88, sweep * 0.88);
      ctx.stroke();

      // Impact sparks at tip
      if (localP < 0.7) {
        const sparkR = outerR * 0.96;
        for (let sp = -1; sp <= 1; sp++) {
          const sa = sp * 0.34;
          const sx = Math.cos(sa) * sparkR;
          const sy = Math.sin(sa) * sparkR;
          ctx.fillStyle = sp === 0 ? '#FFFFFF' : accent;
          drawStar4(ctx, sx, sy, (isFinalBright ? 7 : 5) * aLocal);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  // 2. LINEAR TWIN BLADE WAVE (Thiên Trúc Tuyệt Đao, Huyền Âm Trảm)
  if (kind === 'blade_wave_line') {
    ctx.translate(x, y);
    ctx.rotate(angle);
    for (let i = 0; i < 2; i++) {
      const offset = progress * curRad * 1.4 - i * 32;
      const aL = alpha * (i === 0 ? 0.96 : 0.82);

      // Ground-skimming shadow trail
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = aL * 0.55;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.58)';
      ctx.lineWidth = 12 * alpha + 4;
      ctx.beginPath();
      ctx.moveTo(offset - 28, -26 + i * 3);
      ctx.quadraticCurveTo(offset + 28, 0, offset - 28, 26 - i * 3);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.globalAlpha = aL * 0.92;
      ctx.lineWidth = 9 * alpha + 3;
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = aL;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 5 * alpha + 1.8;
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.6 * alpha + 1;
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // 3. SƯ TỬ HỐNG — BRONZE-GOLD SONIC RINGS + SPECTRAL ROARING LION HEAD IN FRONT
  if (kind === 'lion_roar') {
    drawGroundZoneUnderlay(ctx, x, y, curRad, color, alpha, 0.56);
    ctx.save();
    ctx.translate(x, y + 4);
    ctx.scale(1, 0.56);
    for (let w = 0; w < 3; w++) {
      const wr = curRad * (0.38 + w * 0.3);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * (0.78 - w * 0.18);
      ctx.strokeStyle = w === 0 ? '#B45309' : '#92400E';
      ctx.lineWidth = 6 - w;
      ctx.beginPath();
      ctx.arc(0, 0, wr, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = w === 0 ? '#FEF08A' : color;
      ctx.lineWidth = 3.6 - w * 0.8;
      ctx.stroke();
    }
    ctx.restore();

    // Roaring golden lion head projected slightly forward along angle
    ctx.save();
    const fwdX = Math.cos(angle) * (16 + progress * 22);
    const fwdY = Math.sin(angle) * (10 + progress * 14);
    const lift = progress * 16;
    ctx.translate(x + fwdX, y - 22 + fwdY - lift);
    const sc = 0.9 + progress * 0.45;
    ctx.scale(sc, sc);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.82;
    ctx.fillStyle = 'rgba(120, 53, 15, 0.55)';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const a = (i * Math.PI * 2) / 14;
      const r = i % 2 === 0 ? 27 : 18;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.94;
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fierce glowing lion eyes & roaring jaw with fangs
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(-4, -3);
    ctx.lineTo(-8, -1);
    ctx.closePath();
    ctx.moveTo(10, -6);
    ctx.lineTo(4, -3);
    ctx.lineTo(8, -1);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FEF9C3';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 6, 7.5, 0, Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-5, 6, 2, 4);
    ctx.fillRect(3, 6, 2, 4);
    ctx.restore();
    ctx.restore();
    return;
  }

  // 4. THẤT TINH LA SÁT CÔN — SPINNING ORANGE-GOLD STAFF RING + 7 SHARP 4-POINT STARS
  if (kind === 'star_staff_spin') {
    drawGroundZoneUnderlay(ctx, x, y, curRad * 0.95, color, alpha, 0.56);
    ctx.save();
    ctx.translate(x, y + 2);
    ctx.scale(1, 0.56);
    ctx.rotate(progress * 6.8);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 10 * alpha + 3;
    ctx.beginPath();
    ctx.arc(0, 0, curRad * 0.9, 0, Math.PI * 1.72);
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.96;
    ctx.strokeStyle = color;
    ctx.lineWidth = 6.5 * alpha + 2;
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, curRad * 0.96, 0.25, Math.PI * 1.9);
    ctx.stroke();

    // 7 Big Dipper 4-point glowing stars
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7;
      const sx = Math.cos(a) * curRad * 0.9;
      const sy = Math.sin(a) * curRad * 0.9;
      ctx.fillStyle = '#FFFFFF';
      drawStar4(ctx, sx, sy, 8 * alpha + 3.5);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // 5. TÚY BÁT TIÊN CÔN / HỎA LIÊN PHẦN HOA — INWARD SPIRAL PULL WITH CLEAR INWARD CHEVRONS
  if (kind === 'vortex_pull' || kind === 'fire_lotus_pull') {
    drawGroundZoneUnderlay(ctx, x, y, curRad, color, alpha, 0.56);
    ctx.save();
    ctx.translate(x, y + 4);
    ctx.scale(1, 0.56);
    const armCount = kind === 'fire_lotus_pull' ? 6 : 5;

    for (let i = 0; i < armCount; i++) {
      const baseA = (i * Math.PI * 2) / armCount - progress * 4.4;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = kind === 'fire_lotus_pull' ? '#991B1B' : '#A16207';
      ctx.lineWidth = 5 * alpha + 2;
      ctx.globalAlpha = alpha * 0.72;
      ctx.beginPath();
      for (let s = 0; s <= 10; s++) {
        const frac = s / 10;
        const r = curRad * (1 - frac * (0.5 + progress * 0.45));
        const a = baseA + frac * 1.55;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = i % 2 === 0 ? color : accent;
      ctx.lineWidth = 3 * alpha + 1.2;
      ctx.globalAlpha = alpha * 0.95;
      ctx.stroke();

      // Inward-pointing chevron arrowhead moving from perimeter toward center
      const arrowR = curRad * (0.88 - progress * 0.58);
      const arrowA = baseA + 0.4;
      const ax = Math.cos(arrowA) * arrowR;
      const ay = Math.sin(arrowA) * arrowR;
      const inA = Math.atan2(-ay, -ax);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(inA);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-4, -5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Crimson fire-lotus petals for Hỏa Liên Phần Hoa
      if (kind === 'fire_lotus_pull') {
        ctx.save();
        ctx.rotate(baseA);
        const pR = curRad * (0.72 - progress * 0.25);
        ctx.fillStyle = `${color}77`;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(curRad * 0.12, 0);
        ctx.quadraticCurveTo(pR * 0.55, -pR * 0.34, pR, 0);
        ctx.quadraticCurveTo(pR * 0.55, pR * 0.34, curRad * 0.12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // Center pull core
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = alpha * 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, curRad * 0.15 * (1 - progress * 0.45), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    return;
  }

  // 6. SPEAR CHARGE / CRIMSON SPEAR DASH / FINGER SEAL
  // Đoạn Hồn Thích (vệt lao trắng bạc + mũi thương vàng + chớp chữ X), Phi Hồng Vô Tích (dải hồng đỏ + vòng bảo hộ mỏng), Nhất Dương Chỉ / Càn Dương Thần Chỉ
  if (kind === 'spear_charge' || kind === 'crimson_spear_dash' || kind === 'finger_seal') {
    const dx = x - sourceX;
    const dy = y - sourceY;
    const dist = Math.hypot(dx, dy);

    // Draw dash ribbon from source to target when dashed
    if ((kind === 'spear_charge' || kind === 'crimson_spear_dash') && dist > 20) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.65;
      ctx.strokeStyle = kind === 'crimson_spear_dash' ? '#881337' : '#334155';
      ctx.lineWidth = 12 * alpha + 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY - 8);
      ctx.lineTo(x, y - 8);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.94;
      ctx.strokeStyle = color;
      ctx.lineWidth = 7 * alpha + 2.2;
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.6 * alpha + 1;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Contrast under-stroke
    const len = curRad * 1.3;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.62;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.58)';
    ctx.lineWidth = kind === 'finger_seal' ? 8 : 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-len * (1 - progress * 0.3), 0);
    ctx.lineTo(18, 0);
    ctx.stroke();

    // Piercing lance / finger laser
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.96;
    const grad = ctx.createLinearGradient(-len, 0, 22, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, color);
    grad.addColorStop(0.85, accent);
    grad.addColorStop(1, '#FFFFFF');
    ctx.strokeStyle = grad;
    ctx.lineWidth = kind === 'finger_seal' ? 5.2 : 9.5;
    ctx.stroke();

    // Bright spearhead tip for spear_charge
    if (kind === 'spear_charge') {
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.lineTo(6, -7);
      ctx.lineTo(11, 0);
      ctx.lineTo(6, 7);
      ctx.closePath();
      ctx.fill();
    }

    // Crisp gleaming X-cross flash at impact point (Đoạn Hồn Thích) or acupoint star flash (Nhất Dương Chỉ)
    ctx.save();
    if (kind === 'spear_charge') ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.2 * alpha + 1;
    const cross = (kind === 'spear_charge' ? 24 : 18) * (0.45 + progress * 0.75);
    ctx.beginPath();
    ctx.moveTo(-cross, 0);
    ctx.lineTo(cross, 0);
    ctx.moveTo(0, -cross);
    ctx.lineTo(0, cross);
    ctx.stroke();
    ctx.restore();

    if (kind === 'finger_seal') {
      // Pale-blue acupoint lock ring
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, 14 + progress * 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      drawStar4(ctx, 0, 0, 12 * alpha + 4);
      ctx.fill();
    } else if (kind === 'crimson_spear_dash') {
      // Thin protective halo hugging caster
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(x, y - 10, 26 + progress * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#FFF1F2';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y - 10, 23 + progress * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
      return;
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // 7. TRUY TINH TRỤC NGUYỆT — RAPID LAYERED SILVER-GOLD SPEAR-TIP FLURRY
  if (kind === 'spear_flurry') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    for (let i = -2; i <= 2; i++) {
      const tipX = curRad * (0.42 + progress * 0.62) - Math.abs(i) * 14;
      const tipY = i * 11;
      const aL = alpha * (1 - Math.abs(i) * 0.13);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = aL * 0.62;
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
      ctx.lineWidth = 5.4;
      ctx.beginPath();
      ctx.moveTo(tipX - 48, tipY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = aL;
      ctx.strokeStyle = i % 2 === 0 ? '#FFFFFF' : color;
      ctx.lineWidth = 3.4;
      ctx.stroke();

      // Spearhead triangle + short hit spark
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(tipX + 9, tipY);
      ctx.lineTo(tipX - 3, tipY - 4);
      ctx.lineTo(tipX - 3, tipY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      drawStar4(ctx, tipX + 5, tipY, 5.5 * aL + 1.5);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // 8. BÔN LÔI TOÀN LONG THƯƠNG — WIDE BRONZE SPEAR WHIRLWIND + DISTINCT INNER GUARD RING
  if (kind === 'spear_whirl_shield') {
    drawGroundZoneUnderlay(ctx, x, y, curRad * 0.96, color, alpha, 0.54);
    ctx.save();
    ctx.translate(x, y + 2);
    ctx.scale(1, 0.54);
    ctx.rotate(progress * 5.6);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 9 * alpha + 3;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, curRad * 0.95, a, a + 1.55);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.95;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5.5 * alpha + 2;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, curRad * 0.95, a, a + 1.5);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, curRad * 0.78, a + 0.35, a + 1.25);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 5.5 * alpha + 2;
    }
    ctx.restore();

    // Distinct inner protective dome ring around caster
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.88;
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 10, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(x, y - 10, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    return;
  }

  // 9. SHIELDS & AEGIS (Kim Chung Tráo, Bắc Minh Thần Công, Phật Quang Phổ Chiếu)
  if (kind === 'shield' || kind === 'golden_bell' || kind === 'north_shield' || kind === 'buddha_aegis') {
    const shrink = kind === 'golden_bell' ? 1 - progress * 0.38 : 1;
    const domeR = Math.max(24, curRad * 0.62 * shrink);

    // Contrast tint shell
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.82;
    const domeGrad = ctx.createRadialGradient(x, y - 18, domeR * 0.12, x, y - 8, domeR);
    domeGrad.addColorStop(0, 'rgba(255,255,255,0.16)');
    domeGrad.addColorStop(0.65, `${color}45`);
    domeGrad.addColorStop(1, `${accent}BB`);
    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    if (kind === 'golden_bell') {
      // Classic ornate golden bell dome condensing into halo
      ctx.moveTo(x - domeR * 0.94, y + 6);
      ctx.quadraticCurveTo(x - domeR * 0.78, y - domeR * 1.12, x, y - domeR * 1.24);
      ctx.quadraticCurveTo(x + domeR * 0.78, y - domeR * 1.12, x + domeR * 0.94, y + 6);
      ctx.closePath();
    } else {
      ctx.arc(x, y - 8, domeR, Math.PI, 0);
      ctx.ellipse(x, y - 8, domeR, domeR * 0.34, 0, 0, Math.PI);
      ctx.closePath();
    }
    ctx.fill();
    ctx.strokeStyle = kind === 'north_shield' ? '#0284C7' : '#B45309';
    ctx.lineWidth = 4.2 * alpha + 1.2;
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = kind === 'north_shield' ? '#E0F2FE' : '#FEF9C3';
    ctx.lineWidth = 2.4 * alpha + 0.9;
    ctx.stroke();

    // Bell rim band or Bắc Minh silver water ripples
    if (kind === 'north_shield') {
      for (let rp = 0; rp < 2; rp++) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = alpha * (0.8 - rp * 0.28);
        ctx.beginPath();
        ctx.ellipse(x, y - 12 - rp * 12, domeR * (0.86 - rp * 0.18), domeR * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (kind === 'buddha_aegis') {
      // Orbiting radiant lotus petals for Phật Quang Phổ Chiếu
      for (let p = 0; p < 6; p++) {
        const a = (p * Math.PI * 2) / 6 + progress * 3.4;
        const px = x + Math.cos(a) * (domeR + 8);
        const py = y - 10 + Math.sin(a) * (domeR * 0.45);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = p % 2 === 0 ? '#FEF08A' : '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Ground rune belt
    ctx.save();
    ctx.translate(x, y + 4);
    ctx.scale(1, 0.44);
    ctx.rotate(progress * 2.8);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.2;
    ctx.setLineDash(kind === 'north_shield' ? [12, 5] : [8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, curRad * 0.82 * shrink, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    ctx.restore();
    return;
  }

  // 9B. COMPACT BUFF AURA (Phật Quang Chiến Khí, Trảo Long Công, Lôi Đình Quyết)
  // Per spec: gọn quanh tay/vũ khí & người, dễ phân biệt hỗ trợ tấn công, không rườm rà
  if (kind === 'compact_buff') {
    const auraR = Math.min(44, curRad * 0.34);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.78;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.arc(x, y - 14, auraR * (0.85 + progress * 0.35), 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.95;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Compact orbiting sparks / lightning ticks around hands
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6 + progress * 4.5;
      const sx = x + Math.cos(a) * (auraR * 0.9);
      const sy = y - 14 + Math.sin(a) * (auraR * 0.65);
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : accent;
      drawStar4(ctx, sx, sy, 5.5 * alpha + 2);
      ctx.fill();
    }

    // Small rising power chevrons beside character
    for (let c = -1; c <= 1; c += 2) {
      const cx = x + c * 18;
      const cy = y - 16 - progress * 22;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + 4);
      ctx.lineTo(cx, cy - 2);
      ctx.lineTo(cx + 4, cy + 4);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // 9C. EVASION RING (Vô Nhân Vô Ngã — vòng xanh tím xoay quanh người + bóng né nhẹ)
  if (kind === 'evasion_ring') {
    ctx.save();
    // Subtle translucent evasion silhouette offset
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.42;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x - 16 * (1 - progress), y - 16, 10, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 16 * (1 - progress), y - 16, 10, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, y - 6);
    ctx.scale(1, 0.52);
    ctx.rotate(progress * 5.2);
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = '#4338CA';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 1.45);
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 32, Math.PI * 0.4, Math.PI * 1.85);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    return;
  }

  // 10. HEAVY HAMMER / TIGER HAMMER / GROUND SHATTER / METEOR STRIKE
  // Thừa Long Quyết, Khốn Hổ Vân Tiếu (bóng hổ gầm), Trảm Long Quyết (vệt lao + bụi đất), Phách Địa Thế (nứt xanh lục), Thiên Ngoại Lưu Tinh
  if (
    kind === 'hammer_heavy' ||
    kind === 'tiger_hammer' ||
    kind === 'ground_shatter' ||
    kind === 'meteor_strike'
  ) {
    if (kind === 'meteor_strike' && progress < 0.58) {
      // Descending blazing orange-gold meteor with dark-red tail
      const dropP = progress / 0.58;
      const mx = x + (1 - dropP) * 84;
      const my = y - (1 - dropP) * 165;
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#991B1B';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + 48, my - 88);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 7;
      ctx.stroke();
      const mg = ctx.createRadialGradient(mx, my, 2, mx, my, 26);
      mg.addColorStop(0, '#FFFFFF');
      mg.addColorStop(0.45, accent);
      mg.addColorStop(1, 'rgba(220,38,38,0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawGroundZoneUnderlay(ctx, x, y, curRad, color, alpha, 0.52);

    ctx.save();
    ctx.translate(x, y + 6);
    ctx.scale(1, 0.52);

    // Expanding shock ring
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.82;
    ctx.strokeStyle = 'rgba(24, 24, 27, 0.6)';
    ctx.lineWidth = 6.5 * alpha + 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, curRad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4.2 * alpha + 1.5;
    ctx.stroke();

    // Jagged glowing ground cracks
    const cracks = kind === 'hammer_heavy' || kind === 'tiger_hammer' ? 6 : 9;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.8;
    for (let i = 0; i < cracks; i++) {
      const a = (i * Math.PI * 2) / cracks + 0.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a + 0.14) * curRad * 0.52, Math.sin(a + 0.14) * curRad * 0.52);
      ctx.lineTo(Math.cos(a) * curRad * 0.98, Math.sin(a) * curRad * 0.98);
      ctx.stroke();
    }
    ctx.restore();

    // Outward dust / debris puffs for ground_shatter & meteor_strike
    if (kind === 'ground_shatter' || kind === 'meteor_strike') {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      for (let d = 0; d < 8; d++) {
        const da = (d * Math.PI * 2) / 8 + 0.3;
        const dr = curRad * (0.45 + progress * 0.65);
        const px = x + Math.cos(da) * dr;
        const py = y + Math.sin(da) * dr * 0.5 - progress * 14;
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle = kind === 'meteor_strike' ? '#7F1D1D' : '#A8A29E';
        ctx.beginPath();
        ctx.arc(px, py, 6 + progress * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Roaring Tiger Head silhouette briefly flashing on impact for Khốn Hổ Vân Tiếu
    if (kind === 'tiger_hammer' && progress < 0.78) {
      ctx.save();
      const tAlpha = Math.sin((progress / 0.78) * Math.PI);
      ctx.translate(x + Math.cos(angle) * 14, y - 24 - progress * 12);
      ctx.scale(0.95 + progress * 0.35, 0.95 + progress * 0.35);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = tAlpha * 0.85;
      ctx.fillStyle = 'rgba(15, 118, 110, 0.65)';
      ctx.strokeStyle = '#F5D061';
      ctx.lineWidth = 2.8;
      // Stylized tiger head with pointed ears
      ctx.beginPath();
      ctx.moveTo(-18, -16);
      ctx.lineTo(-9, -11);
      ctx.lineTo(0, -14);
      ctx.lineTo(9, -11);
      ctx.lineTo(18, -16);
      ctx.lineTo(20, 2);
      ctx.lineTo(10, 15);
      ctx.lineTo(0, 18);
      ctx.lineTo(-10, 15);
      ctx.lineTo(-20, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tiger forehead stripes (王) & fierce golden eyes
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(6, -8);
      ctx.moveTo(0, -11);
      ctx.lineTo(0, -3);
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-10, -2, 5, 3);
      ctx.fillRect(5, -2, 5, 3);
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  // 11. SHADOW BLINK / WATER STEPS / FROST STEALTH
  // Mê Ảnh Tung (bóng mờ xanh ngọc + khói điểm đi & đến), Lăng Ba Vi Bộ (gợn nước + bóng xanh nhạt), Ẩn Tuyết / Thập Diện Mai Phục
  if (kind === 'shadow_blink' || kind === 'water_steps' || kind === 'frost_stealth') {
    const drawSmokeAndRipple = (cx: number, cy: number, scaleFactor: number) => {
      ctx.save();
      ctx.translate(cx, cy + 6);
      ctx.scale(1, 0.48);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.62;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, curRad * 0.65 * scaleFactor, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, curRad * 0.92 * scaleFactor, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    // Origin & destination ripples/smoke
    drawSmokeAndRipple(x, y, 1);
    if (Math.hypot(x - sourceX, y - sourceY) > 18) {
      drawSmokeAndRipple(sourceX, sourceY, 0.78);
      // Translucent afterimages along travel vector
      for (let step = 1; step <= 3; step++) {
        const f = step / 4;
        const ax = sourceX + (x - sourceX) * f;
        const ay = sourceY + (y - sourceY) * f;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * (0.24 + f * 0.25);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(ax, ay - 16, 10, 19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Swirling mist veil around caster (frost_stealth)
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y - 16, 13 + progress * 6, 23, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  // 12. NEEDLE BARRAGE / SIX SWORDS (Thiên La Địa Võng, Bạo Vũ Lê Hoa, Lục Mạch Thần Kiếm)
  if (kind === 'needle_barrage' || kind === 'six_swords') {
    const rays = kind === 'six_swords' ? 6 : 16;
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < rays; i++) {
      const a = angle + (i * Math.PI * 2) / rays;
      const r0 = curRad * 0.16;
      const r1 = curRad * (0.68 + progress * 0.38);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.65;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.52)';
      ctx.lineWidth = kind === 'six_swords' ? 6.2 : 3.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 0.65);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.65);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.96;
      const sixPalette = ['#38BDF8', '#E0F2FE', '#FDE047', '#60A5FA', '#FFFFFF', '#93C5FD'];
      ctx.strokeStyle = kind === 'six_swords' ? sixPalette[i % 6] : i % 2 === 0 ? color : accent;
      ctx.lineWidth = kind === 'six_swords' ? 4.2 : 2.3;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r1, Math.sin(a) * r1 * 0.65, kind === 'six_swords' ? 3.2 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // 13. POISON TRAP / VENOM PALM / YIN WIND / VENOM CURSE / TOAD CURSE
  if (
    kind === 'poison_trap' ||
    kind === 'venom_palm' ||
    kind === 'yin_wind' ||
    kind === 'venom_curse' ||
    kind === 'toad_curse'
  ) {
    drawGroundZoneUnderlay(ctx, x, y, curRad * 0.9, color, alpha, 0.54);

    ctx.save();
    ctx.translate(x, y + 4);
    ctx.scale(1, 0.54);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.72;
    ctx.fillStyle = `${color}48`;
    ctx.beginPath();
    ctx.arc(0, 0, curRad * 0.88, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Inner hex or yin-wind spiral
    ctx.rotate(progress * (kind === 'yin_wind' ? -4.8 : 2.1));
    ctx.strokeStyle = kind === 'yin_wind' ? '#581C87' : color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * curRad * 0.25, Math.sin(a) * curRad * 0.25);
      if (kind === 'yin_wind') {
        ctx.quadraticCurveTo(
          Math.cos(a + 0.55) * curRad * 0.65,
          Math.sin(a + 0.55) * curRad * 0.65,
          Math.cos(a + 0.9) * curRad * 0.92,
          Math.sin(a + 0.9) * curRad * 0.92,
        );
      } else {
        ctx.lineTo(Math.cos(a) * curRad * 0.88, Math.sin(a) * curRad * 0.88);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Upward jagged poison spikes (Độc Thích Cốt) or venom miasma bubbles
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8 + progress * (kind === 'yin_wind' ? 3 : 1);
      const px = x + Math.cos(a) * curRad * 0.56;
      const py = y + Math.sin(a) * curRad * 0.28;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.92;
      if (kind === 'poison_trap') {
        // Jagged 4-beat thorny spikes erupting from ground
        const spikeH = 26 * Math.abs(Math.sin((progress * 4 + i * 0.25) * Math.PI)) + 10;
        ctx.fillStyle = '#14532D';
        ctx.strokeStyle = '#BEF264';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px - 4.5, py + 2);
        ctx.lineTo(px, py - spikeH);
        ctx.lineTo(px + 4.5, py + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = i % 2 === 0 ? color : accent;
        ctx.beginPath();
        ctx.arc(px, py - progress * 34, 4.4 * alpha + 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Glowing yellow-green Toad Crest overhead for Chu Cáp Thanh Minh
    if (kind === 'toad_curse') {
      ctx.save();
      ctx.translate(x, y - 34 - progress * 10);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = '#3B0764';
      ctx.strokeStyle = '#A3E635';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 2, 16, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Bulging glowing toad eyes
      ctx.fillStyle = '#D9F99D';
      ctx.beginPath();
      ctx.arc(-7, -7, 4.2, 0, Math.PI * 2);
      ctx.arc(7, -7, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#14532D';
      ctx.beginPath();
      ctx.arc(-7, -7, 1.8, 0, Math.PI * 2);
      ctx.arc(7, -7, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  // 14. CƠ QUAN BÍ THUẬT (INTERLOCKING GEARS) & LOẠN HOÀN KÍCH (OUTWARD PUSH CHEVRONS)
  if (kind === 'gear_aura' || kind === 'knockback_ring') {
    drawGroundZoneUnderlay(ctx, x, y, curRad * 0.9, color, alpha, 0.56);
    ctx.save();
    ctx.translate(x, y + 4);
    ctx.scale(1, 0.56);
    ctx.rotate(progress * (kind === 'gear_aura' ? 2.6 : 0.4));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.92;

    if (kind === 'gear_aura') {
      // Interlocking dark-bronze + jade cogwheel rings
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, curRad * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI * 2) / 10;
        ctx.strokeStyle = i % 2 === 0 ? '#D97706' : accent;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * curRad * 0.72, Math.sin(a) * curRad * 0.72);
        ctx.lineTo(Math.cos(a) * curRad * 0.96, Math.sin(a) * curRad * 0.96);
        ctx.stroke();
      }
      // Inner counter-rotating cog
      ctx.rotate(-progress * 5.2);
      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, curRad * 0.46, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Outward push mechanical ring with crisp outward chevrons
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, curRad * 0.88, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        const rOut = curRad * (0.7 + progress * 0.34);
        ctx.save();
        ctx.translate(Math.cos(a) * rOut, Math.sin(a) * rOut);
        ctx.rotate(a);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(4, 0);
        ctx.lineTo(-6, 6);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // 15. DISPEL SEAL / SOUL DRAIN / SPEAR TETHER PULL
  // Càn Khôn Đại Na Di, Thâu Thiên Hoán Nhật / Vân Long Kích (hút về chủ), Huyễn Ảnh Truy Hồn Thương (dây thương đỏ tím kéo về)
  if (kind === 'dispel_seal' || kind === 'soul_drain' || kind === 'spear_tether_pull') {
    if (kind === 'soul_drain' || kind === 'spear_tether_pull') {
      const threads = kind === 'spear_tether_pull' ? 1 : 3;
      for (let i = 0; i < threads; i++) {
        const spread = threads === 1 ? 0 : (i - 1) * 24;
        const mx = (x + sourceX) * 0.5 + spread;
        const my = (y + sourceY) * 0.5 - (threads === 1 ? 8 : 22) + spread * 0.4;

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * 0.72;
        ctx.strokeStyle = kind === 'spear_tether_pull' ? '#581C87' : '#065F46';
        ctx.lineWidth = kind === 'spear_tether_pull' ? 6.5 : 4.8;
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.quadraticCurveTo(mx, my, sourceX, sourceY - 10);
        ctx.stroke();

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.96;
        ctx.strokeStyle = i === 1 || threads === 1 ? accent : color;
        ctx.lineWidth = kind === 'spear_tether_pull' ? 3.2 : 2.6;
        ctx.stroke();

        // Luminous beads streaming FROM target (x,y) BACK to caster (sourceX,sourceY)
        for (let b = 0; b < 3; b++) {
          const t = (progress * 1.4 + b * 0.3) % 1;
          const inv = 1 - t;
          const bx = inv * inv * x + 2 * inv * t * mx + t * t * sourceX;
          const by = inv * inv * (y - 10) + 2 * inv * t * my + t * t * (sourceY - 10);
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(bx, by, 3.6 * alpha + 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // White-green heal flash on caster for soul_drain
      if (kind === 'soul_drain') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = '#A7F3D0';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(sourceX, sourceY - 12, 18 + progress * 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(x, y - 6);
    ctx.rotate(progress * 3.5);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.88;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.2;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, curRad * 0.58, 0, Math.PI * 2);
    ctx.stroke();

    // Shattering buff shards for Càn Khôn Đại Na Di
    if (kind === 'dispel_seal') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + progress * 2.2;
        const d = curRad * (0.28 + progress * 0.72);
        ctx.save();
        ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
        ctx.rotate(a + progress * 4);
        ctx.fillStyle = i % 2 === 0 ? accent : '#FFFFFF';
        ctx.fillRect(-3.5, -2, 7, 4);
        ctx.restore();
      }
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // 16. THÁNH HỎA LIÊU NGUYÊN — EMERALD-WHITE SACRED FIRE RAIN + LIGHT-ORANGE GROUND IMPACTS
  if (kind === 'sacred_fire_rain') {
    drawGroundZoneUnderlay(ctx, x, y, curRad, color, alpha, 0.5);
    for (let i = 0; i < 12; i++) {
      const seedA = i * 2.399;
      const dist = (0.14 + ((i * 0.31) % 0.82)) * curRad;
      const tx = x + Math.cos(seedA) * dist;
      const ty = y + Math.sin(seedA) * dist * 0.5;
      const drop = Math.max(0, 1 - progress * 1.65 + (i % 3) * 0.12) * 118;

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.82;
      ctx.strokeStyle = '#065F46';
      ctx.lineWidth = 7.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty - drop);
      ctx.lineTo(tx + 5, ty - drop - 30);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.95;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4.6;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(tx, ty - drop, 4.8, 0, Math.PI * 2);
      ctx.fill();

      // Light-orange flame flare on ground impact
      if (drop < 16) {
        ctx.fillStyle = '#FDBA74';
        ctx.beginPath();
        ctx.arc(tx, ty, 9.5 * alpha + 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  // 17. LOTUS HEAL & FOUR PALMS
  // Từ Hàng Phổ Độ (sen trắng xanh nở rộng + hạt hồi phục), Tứ Tượng Đồng Quy (4 cánh chưởng khép VÀO TRONG điểm đánh)
  if (kind === 'lotus' || kind === 'lotus_heal' || kind === 'four_palms') {
    drawGroundZoneUnderlay(ctx, x, y, curRad * 0.92, color, alpha, 0.52);
    ctx.save();
    ctx.translate(x, y + 6);
    ctx.scale(1, 0.52);

    const petals = kind === 'four_palms' ? 4 : 8;
    const isInward = kind === 'four_palms';
    ctx.rotate(progress * (isInward ? -1.8 : 1.15));

    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / petals);
      // For four_palms, petals start wide and converge inward onto impact point!
      const startOffset = isInward ? curRad * (0.48 * (1 - progress)) : curRad * 0.1;
      const pLen = isInward ? curRad * (0.98 - progress * 0.48) : curRad * (0.52 + Math.min(1, progress * 1.6) * 0.46);
      const pWid = curRad * (isInward ? 0.34 : 0.22);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.72;
      ctx.fillStyle = `${color}70`;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(startOffset, 0);
      ctx.quadraticCurveTo((startOffset + pLen) * 0.55, -pWid, pLen, 0);
      ctx.quadraticCurveTo((startOffset + pLen) * 0.55, pWid, startOffset, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // Rising pale-jade healing motes
    ctx.globalCompositeOperation = 'lighter';
    for (let pt = 0; pt < 10; pt++) {
      const a = (pt * Math.PI * 2) / 10 + progress * 2.2;
      const px = x + Math.cos(a) * curRad * 0.65;
      const py = y - progress * (52 + (pt % 3) * 16) + Math.sin(a) * curRad * 0.22;
      ctx.globalAlpha = alpha * 0.92;
      ctx.fillStyle = pt % 2 === 0 ? '#FFFFFF' : accent;
      ctx.beginPath();
      ctx.arc(px, py, 2.8 * alpha + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // 18. FROST SHATTER / OCEAN WAVE / FROST BEAM / ICE PILLARS / ICE NEEDLES
  if (
    kind === 'frost_shatter' ||
    kind === 'ocean_wave' ||
    kind === 'frost_beam' ||
    kind === 'ice_pillars' ||
    kind === 'ice_needles'
  ) {
    if (kind === 'ocean_wave') {
      // Bích Hải Triều Sinh — sweeping ocean-blue & jade tidal wave with white foam crest
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = '#0369A1';
      ctx.lineWidth = 12 * alpha + 4;
      ctx.beginPath();
      ctx.arc(0, 0, curRad * 0.92, -0.95, 0.95);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 7.5 * alpha + 2.5;
      ctx.stroke();
      // Frothy white wave crest
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3.2 * alpha + 1.2;
      ctx.setLineDash([10, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, curRad * 0.99, -0.88, 0.88);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
      return;
    }

    if (kind === 'frost_beam') {
      // Băng Tâm Tiên Tử — straight pale-blue white-core frost ribbon + trailing ice crystals
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      const len = curRad * 1.45;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.72;
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 10 * alpha + 3;
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4 * alpha + 1.2;
      ctx.stroke();

      for (let i = 0; i < 6; i++) {
        const cx = -len + (i / 5) * len;
        const cy = (i % 2 === 0 ? -1 : 1) * (8 + (i % 3) * 4);
        ctx.fillStyle = '#E0F2FE';
        drawStar4(ctx, cx, cy, 5.5 * alpha + 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.restore();
      return;
    }

    drawGroundZoneUnderlay(ctx, x, y, curRad * 0.88, color, alpha, 0.52);

    const count = kind === 'ice_pillars' ? 3 : kind === 'ice_needles' ? 3 : 9;
    for (let i = 0; i < count; i++) {
      const a = kind === 'ice_pillars' || kind === 'ice_needles'
        ? angle + (i - 1) * 0.32
        : (i * Math.PI * 2) / count + angle;
      const d =
        kind === 'ice_pillars'
          ? curRad * 0.45
          : kind === 'ice_needles'
            ? curRad * (0.35 + progress * 0.65)
            : curRad * (0.32 + progress * 0.62);
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d * 0.55;

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.94;
      if (kind === 'ice_pillars') {
        // Thick faceted ice pillar
        ctx.fillStyle = '#0284C7';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(px, py - 44);
        ctx.lineTo(px + 9, py - 8);
        ctx.lineTo(px + 6, py + 4);
        ctx.lineTo(px - 6, py + 4);
        ctx.lineTo(px - 9, py - 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (kind === 'ice_needles') {
        // Razor-slim long frost needle
        ctx.translate(px, py);
        ctx.rotate(a);
        ctx.fillStyle = '#E0F2FE';
        ctx.strokeStyle = '#0369A1';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-14, -2.6);
        ctx.lineTo(-18, 0);
        ctx.lineTo(-14, 2.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Shattering silver-blue ice crystals
        ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : color;
        ctx.strokeStyle = '#0369A1';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, py - 14);
        ctx.lineTo(px + 5.5, py);
        ctx.lineTo(px, py + 7);
        ctx.lineTo(px - 5.5, py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  // 18B. KINH THIÊN NHẤT KIẾM — MASSIVE WHITE-BLUE GOLD-TIPPED SWORD WAVE + OUTWARD PUSH WAVE
  if (kind === 'giant_sword_push') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.86;
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 14 * alpha + 4;
    ctx.beginPath();
    ctx.arc(0, 0, curRad * 0.96, -0.82, 0.82);
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 8 * alpha + 2.5;
    ctx.stroke();
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 3 * alpha + 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, curRad * 1.02, -0.45, 0.45);
    ctx.stroke();

    // Directional outward knockback chevrons
    for (let k = -1; k <= 1; k++) {
      const ka = k * 0.36;
      const kr = curRad * (0.72 + progress * 0.36);
      ctx.save();
      ctx.translate(Math.cos(ka) * kr, Math.sin(ka) * kr);
      ctx.rotate(ka);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(-7, -7);
      ctx.lineTo(6, 0);
      ctx.lineTo(-7, 7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // 19. SWORD RAIN / SWORD CONVERGE / TAIJI DOMAIN (Võ Đang Khí)
  if (
    kind === 'swords' ||
    kind === 'sword_rain' ||
    kind === 'sword_converge' ||
    kind === 'taiji_domain'
  ) {
    drawGroundZoneUnderlay(ctx, x, y, curRad, color, alpha, 0.48);

    ctx.save();
    ctx.translate(x, y + 6);
    ctx.scale(1, 0.48);
    ctx.rotate(progress * (kind === 'taiji_domain' ? 1.8 : 1.2));

    if (kind === 'taiji_domain') {
      // Unmistakable white-blue Taiji (Yin-Yang) diagram + 2-pulse expanding ring
      const tr = curRad * 0.72;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.88;
      // Outer Yin (deep indigo-blue) & Yang (bright white-blue) halves
      ctx.fillStyle = 'rgba(30, 58, 138, 0.58)';
      ctx.beginPath();
      ctx.arc(0, 0, tr, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(224, 242, 254, 0.82)';
      ctx.beginPath();
      ctx.arc(0, 0, tr, -Math.PI / 2, Math.PI / 2);
      ctx.arc(0, tr * 0.5, tr * 0.5, Math.PI / 2, -Math.PI / 2, true);
      ctx.arc(0, -tr * 0.5, tr * 0.5, Math.PI / 2, -Math.PI / 2, false);
      ctx.closePath();
      ctx.fill();

      // Yin & Yang eyes
      ctx.fillStyle = 'rgba(30, 58, 138, 0.85)';
      ctx.beginPath();
      ctx.arc(0, -tr * 0.5, tr * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, tr * 0.5, tr * 0.14, 0, Math.PI * 2);
      ctx.fill();

      // 2-beat outer pulse rings
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#C7D2FE';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, curRad * (0.72 + ((progress * 2) % 1) * 0.34), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
      return;
    }

    // Bagua octagon for Vạn Kiếm Quy Tông & Vô Ngã Vô Kiếm
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i * Math.PI) / 4;
      const px = Math.cos(a) * curRad * 0.82;
      const py = Math.sin(a) * curRad * 0.82;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    const swordCount = kind === 'sword_converge' ? 8 : 13;
    for (let i = 0; i < swordCount; i++) {
      const seedA = kind === 'sword_converge' ? (i * Math.PI * 2) / swordCount : i * 2.39996;
      const dist =
        kind === 'sword_converge'
          ? curRad * (1 - progress * 0.88)
          : (0.16 + ((i * 0.37) % 0.8)) * curRad;
      const tx = x + Math.cos(seedA) * dist;
      const ty = y + Math.sin(seedA) * dist * 0.52;
      const localP = Math.max(0, Math.min(1, progress * 1.45 - (i % 4) * 0.08));
      const dropY = kind === 'sword_converge' ? 10 : (1 - Math.min(1, localP * 1.65)) * 130;
      const sx = tx + dropY * 0.16;
      const sy = ty - dropY;

      ctx.save();
      ctx.globalAlpha = Math.min(1, localP * 3) * alpha;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#1D4ED8';
      ctx.lineWidth = 4.6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 8, sy - 50);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      const beam = ctx.createLinearGradient(sx, sy, sx + 12, sy - 56);
      beam.addColorStop(0, '#FFFFFF');
      beam.addColorStop(0.45, color);
      beam.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = beam;
      ctx.lineWidth = 2.8;
      ctx.stroke();

      ctx.translate(sx, sy);
      ctx.rotate(kind === 'sword_converge' ? seedA + Math.PI : -0.16);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(2.8, -20);
      ctx.lineTo(0, -27);
      ctx.lineTo(-2.8, -20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(-5.5, -22, 11, 2.2);
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  // 19B. NHÂN KIẾM HỢP NHẤT (STREAK + 3 RHYTHMIC FLASHES) & LƯỠNG NGHI KIẾM PHÁP (2 SPLITTING SPIRIT SWORDS)
  if (kind === 'sword_dash_triple' || kind === 'twin_spirit_swords') {
    if (kind === 'sword_dash_triple') {
      // Merged hero + sword blue-white light streak with 3 crisp rhythmic impact cross-flashes
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.72;
      ctx.strokeStyle = '#1D4ED8';
      ctx.lineWidth = 14 * alpha + 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY - 10);
      ctx.lineTo(x, y - 10);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5 * alpha + 1.8;
      ctx.stroke();

      // 3 crisp rhythmic slashes/cross-flashes at target
      for (let h = 0; h < 3; h++) {
        const hp = Math.max(0, Math.min(1, progress * 1.6 - h * 0.22));
        if (hp <= 0) continue;
        const ha = (1 - hp) * 0.96;
        const hx = x + (h - 1) * 14;
        const hy = y - 12 + (h === 1 ? -8 : 4);
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate((h - 1) * 0.65);
        ctx.globalAlpha = ha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(-26, 0);
        ctx.lineTo(26, 0);
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      ctx.restore();
      return;
    }

    // Lưỡng Nghi Kiếm Pháp — stealth mist + 2 distinct blue & pale-violet spirit swords splitting cleanly
    ctx.save();
    for (let s = 0; s < 2; s++) {
      const splitAngle = angle + (s === 0 ? -0.46 : 0.46);
      const reach = curRad * (0.35 + progress * 0.75);
      const sx = x + Math.cos(splitAngle) * reach;
      const sy = y + Math.sin(splitAngle) * reach * 0.65;
      const swColor = s === 0 ? '#38BDF8' : '#C084FC';

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.75;
      ctx.strokeStyle = s === 0 ? '#1E3A8A' : '#581C87';
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(sx, sy - 10);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = swColor;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Spirit sword phantom at tip
      ctx.save();
      ctx.translate(sx, sy - 10);
      ctx.rotate(splitAngle);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-10, -4);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = swColor;
      ctx.fillRect(-10, -8, 3, 16);
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // 20. DRAGON PALM (Cái Bang orange-gold dragon & Minh Giáo Long Thôn Thức dark-green/gold dragon!)
  if (kind === 'dragon' || kind === 'dragon_palm') {
    drawGroundZoneUnderlay(ctx, x, y, curRad, color, alpha, 0.5);

    for (let d = 0; d < 2; d++) {
      const baseAngle = d * Math.PI + progress * 4.4;
      const segs = 14;
      ctx.save();
      let headX = x;
      let headY = y;
      let prevX = x;
      let prevY = y;
      ctx.beginPath();
      for (let s = 0; s <= segs; s++) {
        const frac = s / segs;
        const a = baseAngle - (1 - frac) * 2.1;
        const r = curRad * (0.28 + frac * 0.68);
        const lift = frac * 34 * Math.sin(progress * Math.PI);
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r * 0.52 - lift;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        if (s === segs - 1) {
          prevX = px;
          prevY = py;
        }
        if (s === segs) {
          headX = px;
          headY = py;
        }
      }
      // Contrast dark outer body + skill-colored dragon scales + bright core
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = element === 'moc' ? '#064E3B' : '#7C2D12';
      ctx.lineWidth = 11 * alpha + 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = 7.5 * alpha + 2.6;
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.96;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3.6 * alpha + 1.2;
      ctx.stroke();

      // Dragon head with horns & whiskers
      const hAng = Math.atan2(headY - prevY, headX - prevX);
      ctx.translate(headX, headY);
      ctx.rotate(hAng);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = color;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-4, -8.5);
      ctx.lineTo(-10, -4);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-10, 4);
      ctx.lineTo(-4, 8.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(3, -2.5, 2, 0, Math.PI * 2);
      ctx.arc(3, 2.5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  // 20B. THÔI SƠN ĐIỀN HẢI — WIDE FLAME WALL WITH DARK-RED BASE & CLEAR BURN BOUNDARY
  if (kind === 'fire_wall') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Clear burn boundary rectangle on ground
    const wallHalfW = curRad * 0.88;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.78;
    ctx.fillStyle = 'rgba(127, 29, 29, 0.45)';
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.6;
    ctx.fillRect(-18, -wallHalfW, 38, wallHalfW * 2);
    ctx.strokeRect(-18, -wallHalfW, 38, wallHalfW * 2);

    // Blazing flame pillars along the wall
    for (let i = -3; i <= 3; i++) {
      const fy = i * (curRad * 0.25);
      const fh = 34 + ((i + 4) % 2) * 14;
      const fg = ctx.createLinearGradient(0, fy + 10, 0, fy - fh);
      fg.addColorStop(0, '#991B1B');
      fg.addColorStop(0.5, color);
      fg.addColorStop(1, '#FEF08A');
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = fg;
      ctx.globalAlpha = alpha * 0.92;
      ctx.beginPath();
      ctx.ellipse(progress * 12, fy - fh * 0.22, 12, fh * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // 20C. STAFF SWEEP (Bổng Đả Ác Cẩu / Thiên Hạ Vô Cẩu) & STAFF ARRAY (Đả Cẩu Trận Pháp)
  if (kind === 'staff_sweep' || kind === 'staff_array') {
    drawGroundZoneUnderlay(ctx, x, y, curRad * 0.9, color, alpha, 0.54);
    ctx.save();
    ctx.translate(x, y + 4);
    ctx.scale(1, 0.54);
    ctx.rotate(progress * (kind === 'staff_array' ? 2.4 : 5.2));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.88;
    ctx.strokeStyle = '#9A3412';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, curRad * 0.88, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.restore();

    if (kind === 'staff_array') {
      // 6 vertical spectral golden-orange staves planted upright around the AoE perimeter
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6 + progress * 0.4;
        const sx = x + Math.cos(a) * curRad * 0.84;
        const sy = y + Math.sin(a) * curRad * 0.45;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * 0.92;
        ctx.strokeStyle = '#7C2D12';
        ctx.lineWidth = 6.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy + 6);
        ctx.lineTo(sx, sy - 46);
        ctx.stroke();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        drawStar4(ctx, sx, sy - 48, 6 * alpha + 2);
        ctx.fill();
        ctx.restore();
      }
    } else {
      // Sweeping staff arcs + crisp hit sparks
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      for (let s = 0; s < 3; s++) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * (0.9 - s * 0.2);
        ctx.strokeStyle = s === 0 ? color : accent;
        ctx.lineWidth = 6 - s * 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, curRad * (0.82 + s * 0.1), -0.95 + s * 0.14, 0.95 - s * 0.14);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  // 21. CÔN LÔN THUNDER & WIND-LIGHTNING (Thiên Tế Tấn Lôi, Lôi Động Cửu Thiên, Cuồng Phong Sầu Điện, Ngạo Tuyết Tiêu Phong)
  if (kind === 'thunder_strike' || kind === 'thunder_cluster' || kind === 'wind_lightning') {
    drawGroundZoneUnderlay(ctx, x, y, curRad * 0.92, color, alpha, 0.52);

    ctx.save();
    ctx.translate(x, y + 4);
    ctx.scale(1, 0.52);
    ctx.rotate(progress * 4.2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.92;
    if (kind === 'wind_lightning') {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4.5 * alpha + 1.4;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(0, 0, curRad * 0.72, a, a + 1.4);
        ctx.stroke();
      }
    }
    ctx.restore();

    const bolts = kind === 'thunder_cluster' ? 5 : kind === 'wind_lightning' ? 2 : 1;
    for (let b = 0; b < bolts; b++) {
      const bx = x + (b === 0 ? 0 : Math.cos(b * 2.1 + progress) * curRad * 0.56);
      const by = y + (b === 0 ? 0 : Math.sin(b * 2.1 + progress) * curRad * 0.3);
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = '#4C1D95';
      ctx.lineWidth = 8.5;
      ctx.lineJoin = 'bevel';
      ctx.beginPath();
      ctx.moveTo(bx + 14, by - 148);
      ctx.lineTo(bx - 12, by - 102);
      ctx.lineTo(bx + 12, by - 60);
      ctx.lineTo(bx - 8, by - 24);
      ctx.lineTo(bx, by + 4);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = color;
      ctx.lineWidth = 4.8;
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.1;
      ctx.stroke();

      // Branching lightning fork for thunder_cluster
      if (kind === 'thunder_cluster') {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + 12, by - 60);
        ctx.lineTo(bx + 28, by - 36);
        ctx.lineTo(bx + 22, by - 14);
        ctx.stroke();
      }

      // Ground electric flash
      ctx.fillStyle = '#FFFFFF';
      drawStar4(ctx, bx, by + 2, 11 * alpha + 4);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  // 22. DEFAULT ELEMENTAL MARTIAL FORMATIONS ('ring' — KIM / MỘC / THỦY / HỎA / THỔ)
  drawGroundZoneUnderlay(ctx, x, y, curRad, color, alpha, 0.54);
  ctx.globalCompositeOperation = 'lighter';
  ctx.save();
  ctx.translate(x, y + 4);
  ctx.scale(1, 0.54);
  ctx.globalAlpha = alpha * 0.92;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(0, 0, curRad, 0, Math.PI * 2);
  ctx.stroke();

  if (element === 'kim') {
    ctx.rotate(progress * 2.2);
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, curRad * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * curRad * 0.24, Math.sin(a) * curRad * 0.24);
      ctx.lineTo(Math.cos(a) * curRad * 1.08, Math.sin(a) * curRad * 1.08);
      ctx.stroke();
    }
  } else if (element === 'moc') {
    ctx.fillStyle = `${color}30`;
    ctx.beginPath();
    ctx.arc(0, 0, curRad * 0.85, 0, Math.PI * 2);
    ctx.fill();
  } else if (element === 'thuy') {
    ctx.rotate(progress * 1.4);
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * curRad * 0.96, Math.sin(a) * curRad * 0.96);
      ctx.stroke();
    }
  } else if (element === 'hoa') {
    ctx.rotate(progress * 3.4);
    ctx.strokeStyle = '#FB923C';
    ctx.lineWidth = 4.5 * alpha + 1;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, curRad * 0.72, a, a + 1.25);
      ctx.stroke();
    }
  } else {
    ctx.rotate(-progress * 1.3);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i * Math.PI) / 4;
      const px = Math.cos(a) * curRad * 0.92;
      const py = Math.sin(a) * curRad * 0.92;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

