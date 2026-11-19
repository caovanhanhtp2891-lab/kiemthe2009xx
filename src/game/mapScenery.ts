import { BattleMode } from './types';

export type SceneryPropKind =
  | 'palm'
  | 'willow'
  | 'maple'
  | 'pine'
  | 'snow_pine'
  | 'pavilion'
  | 'stall'
  | 'gourd_statue'
  | 'stone_lantern'
  | 'crates'
  | 'brazier'
  | 'banner'
  | 'stele'
  | 'rock'
  | 'bamboo';

export interface SceneryProp {
  x: number;
  y: number;
  kind: SceneryPropKind;
  scale: number;
  flip: boolean;
  seed: number;
  variant?: number;
}

export interface PondFeature {
  x: number;
  y: number;
  rx: number;
  ry: number;
  frozen?: boolean;
  hasBridge?: boolean;
  lotusCount: number;
}

export interface PlazaFeature {
  x: number;
  y: number;
  w: number;
  h: number;
  style: 'town_stone' | 'mountain_slate' | 'fortress_flagstone' | 'jade_court';
  hasBagua?: boolean;
}

export interface RoadSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  style: 'cobble' | 'dirt' | 'snow_trail' | 'fortress';
}

export interface GroundPatch {
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: string;
  alpha: number;
  rot: number;
}

export interface MapSceneryData {
  mapId: string;
  mode: BattleMode;
  worldW: number;
  worldH: number;
  baseColor: string;
  tileLineColor: string;
  tileStyle: 'iso_stone' | 'earth_grass' | 'snow_field' | 'fortress_stone' | 'mist_slate';
  plazas: PlazaFeature[];
  roads: RoadSegment[];
  ponds: PondFeature[];
  patches: GroundPatch[];
  props: SceneryProp[]; // pre-sorted ascending by y for O(N) Y-depth interleaving
}

function createRng(seedStr: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMapScenery(
  mapId: string,
  mode: BattleMode,
  worldW: number,
  worldH: number
): MapSceneryData {
  const rng = createRng(`${mapId}_${mode}_${worldW}_${worldH}`);
  const cx = worldW * 0.5;
  const cy = worldH * 0.52;

  const plazas: PlazaFeature[] = [];
  const roads: RoadSegment[] = [];
  const ponds: PondFeature[] = [];
  const patches: GroundPatch[] = [];
  const props: SceneryProp[] = [];

  const addProp = (
    x: number,
    y: number,
    kind: SceneryPropKind,
    scale = 1,
    variant = 0
  ) => {
    if (x < 48 || x > worldW - 48 || y < 56 || y > worldH - 48) return;
    props.push({
      x: Math.round(x),
      y: Math.round(y),
      kind,
      scale,
      flip: rng() < 0.5,
      seed: rng() * 100,
      variant,
    });
  };

  let baseColor = '#8E977E';
  let tileLineColor = 'rgba(62, 70, 54, 0.24)';
  let tileStyle: MapSceneryData['tileStyle'] = 'iso_stone';

  if (mode === 'SIEGE' || mode === 'GUILD_WAR' || mapId === 'tuong_duong') {
    baseColor = '#8E7F6B';
    tileLineColor = 'rgba(58, 46, 34, 0.26)';
    tileStyle = 'fortress_stone';
  } else if (mapId === 'tan_thu_thon') {
    baseColor = '#939C81';
    tileLineColor = 'rgba(64, 72, 56, 0.24)';
    tileStyle = 'iso_stone';
  } else if (mapId === 'hoa_son') {
    baseColor = '#9B8F63';
    tileLineColor = 'rgba(78, 66, 40, 0.2)';
    tileStyle = 'earth_grass';
  } else if (mapId === 'truong_bach') {
    baseColor = '#BFD8EB';
    tileLineColor = 'rgba(255, 255, 255, 0.42)';
    tileStyle = 'snow_field';
  } else if (mapId === 'kiem_cac') {
    baseColor = '#739D8D';
    tileLineColor = 'rgba(38, 66, 58, 0.24)';
    tileStyle = 'mist_slate';
  }

  // Organic sunlit ground patches for fresh tonal richness
  const patchCount = Math.max(18, Math.round((worldW * worldH) / 72000));
  for (let i = 0; i < patchCount; i++) {
    const px = 80 + rng() * (worldW - 160);
    const py = 80 + rng() * (worldH - 160);
    let color = '#6DAA58';
    let alpha = 0.26;
    if (tileStyle === 'snow_field') {
      color = rng() < 0.68 ? '#EFF8FF' : '#96BEDB';
      alpha = rng() < 0.68 ? 0.34 : 0.22;
    } else if (tileStyle === 'fortress_stone') {
      color = rng() < 0.55 ? '#AA9880' : '#7B6C58';
      alpha = 0.26;
    } else if (mapId === 'hoa_son') {
      color = rng() < 0.52 ? '#C98E45' : '#76A652';
      alpha = 0.26;
    } else if (mapId === 'kiem_cac') {
      color = rng() < 0.55 ? '#5BAA7B' : '#91C4AE';
      alpha = 0.26;
    } else {
      color = rng() < 0.58 ? '#69A854' : '#B2AC96';
      alpha = 0.26;
    }
    patches.push({
      x: px,
      y: py,
      rx: 65 + rng() * 140,
      ry: 35 + rng() * 75,
      color,
      alpha,
      rot: (rng() - 0.5) * 0.7,
    });
  }

  // Layout by Mode & Map
  if (mode === 'ARENA') {
    plazas.push({
      x: cx,
      y: cy,
      w: Math.min(worldW - 180, 740),
      h: Math.min(worldH - 160, 440),
      style: 'jade_court',
      hasBagua: true,
    });
    const corners = [
      [cx - 320, cy - 190],
      [cx + 320, cy - 190],
      [cx - 320, cy + 190],
      [cx + 320, cy + 190],
    ];
    for (const [bx, by] of corners) {
      addProp(bx, by, 'brazier', 0.95);
      addProp(bx + (bx < cx ? -46 : 46), by - 20, 'banner', 0.92);
    }
    addProp(cx, cy - 235, 'pavilion', 0.9);
  } else if (mode === 'SIEGE' || mode === 'GUILD_WAR') {
    // Wide fortress road from attacker camp (left) to Gate/Banner (right)
    roads.push({
      x1: 60,
      y1: cy,
      x2: worldW - 80,
      y2: cy,
      width: 170,
      style: 'fortress',
    });
    plazas.push({
      x: worldW - 220,
      y: cy,
      w: 360,
      h: Math.min(worldH - 180, 520),
      style: 'fortress_flagstone',
      hasBagua: false,
    });
    plazas.push({
      x: 220,
      y: cy,
      w: 280,
      h: 340,
      style: 'fortress_flagstone',
    });
    // Perimeter banners, braziers, crates & pines along north & south flanks
    for (let x = 140; x < worldW - 140; x += 210) {
      addProp(x, 120 + (rng() - 0.5) * 30, x % 420 === 0 ? 'brazier' : 'banner', 0.92);
      addProp(x + 40, worldH - 110 + (rng() - 0.5) * 28, x % 420 === 0 ? 'banner' : 'brazier', 0.92);
    }
    addProp(160, 195, 'crates', 0.9);
    addProp(210, worldH - 170, 'crates', 0.85);
    addProp(worldW * 0.45, 145, 'rock', 1.0);
    addProp(worldW * 0.62, worldH - 140, 'rock', 0.95);
  } else if (mode === 'BOSS' || mode === 'DUNGEON') {
    // Imperial ritual courtyard with stone walkways and 4 guardian braziers
    roads.push({
      x1: 80,
      y1: cy,
      x2: worldW - 80,
      y2: cy,
      width: 120,
      style: 'cobble',
    });
    plazas.push({
      x: cx,
      y: cy,
      w: Math.min(worldW - 260, 860),
      h: Math.min(worldH - 220, 500),
      style: 'jade_court',
      hasBagua: true,
    });
    const ringPts = [
      [cx - 340, cy - 210],
      [cx + 340, cy - 210],
      [cx - 340, cy + 210],
      [cx + 340, cy + 210],
    ];
    for (const [px, py] of ringPts) {
      addProp(px, py, 'brazier', 0.95);
      addProp(px + (px < cx ? -58 : 58), py - 14, 'stone_lantern', 0.9);
    }
    addProp(cx - 460, cy - 260, 'pavilion', 0.92);
    addProp(cx + 440, cy - 260, 'stele', 1.0);
    for (let i = 0; i < 10; i++) {
      const sideY = i % 2 === 0 ? 110 + rng() * 75 : worldH - 110 - rng() * 75;
      const sideX = 120 + rng() * (worldW - 240);
      addProp(sideX, sideY, i % 3 === 0 ? 'rock' : 'pine', 0.85 + rng() * 0.25);
    }
  } else {
    // EXPANDED WILD WORLD (2400 x 1600) — Authentic Kiếm Thế 2009 town & wilderness zones!
    const roadStyle: RoadSegment['style'] =
      mapId === 'tan_thu_thon'
        ? 'cobble'
        : mapId === 'truong_bach'
        ? 'snow_trail'
        : mapId === 'tuong_duong'
        ? 'fortress'
        : 'dirt';

    // Grand East-West & North-South crossroads
    roads.push({ x1: 80, y1: cy, x2: worldW - 80, y2: cy, width: 128, style: roadStyle });
    roads.push({ x1: cx, y1: 80, x2: cx, y2: worldH - 80, width: 112, style: roadStyle });
    // Diagonal scenic trail to northeast & southwest quadrants
    roads.push({ x1: cx, y1: cy, x2: worldW - 240, y2: 260, width: 76, style: roadStyle });
    roads.push({ x1: cx, y1: cy, x2: 240, y2: worldH - 220, width: 76, style: roadStyle });

    // Central Town / Landmark Plaza with Bagua Medallion
    plazas.push({
      x: cx,
      y: cy,
      w: 580,
      h: 360,
      style:
        mapId === 'tan_thu_thon'
          ? 'town_stone'
          : mapId === 'tuong_duong'
          ? 'fortress_flagstone'
          : mapId === 'kiem_cac'
          ? 'jade_court'
          : 'mountain_slate',
      hasBagua: true,
    });

    // Secondary outposts / plazas in West & East wings
    plazas.push({
      x: 430,
      y: 390,
      w: 300,
      h: 210,
      style: mapId === 'tuong_duong' ? 'fortress_flagstone' : 'town_stone',
    });
    plazas.push({
      x: worldW - 430,
      y: worldH - 360,
      w: 320,
      h: 220,
      style: mapId === 'kiem_cac' ? 'jade_court' : 'mountain_slate',
    });

    // Scenic Ponds / Lakes with Lotus Pads & Bridges
    if (mapId === 'tan_thu_thon') {
      ponds.push({ x: worldW - 470, y: 390, rx: 190, ry: 105, hasBridge: true, lotusCount: 9 });
      ponds.push({ x: 430, y: worldH - 340, rx: 165, ry: 92, hasBridge: false, lotusCount: 7 });
    } else if (mapId === 'truong_bach') {
      ponds.push({ x: worldW - 480, y: 410, rx: 195, ry: 105, frozen: true, hasBridge: true, lotusCount: 0 });
    } else if (mapId === 'kiem_cac') {
      ponds.push({ x: 470, y: worldH - 350, rx: 185, ry: 95, hasBridge: true, lotusCount: 8 });
      ponds.push({ x: worldW - 490, y: 360, rx: 155, ry: 84, hasBridge: false, lotusCount: 6 });
    } else if (mapId === 'hoa_son') {
      ponds.push({ x: worldW - 500, y: 370, rx: 155, ry: 85, hasBridge: true, lotusCount: 4 });
    }

    // Iconic Kiếm Thế 2009 Central Plaza Landmarks (keep center spawn clear!)
    if (mapId === 'tan_thu_thon') {
      // Directly inspired by Kiếm Thế 2009 Ba Lăng Huyện / Tân Thủ Thôn screenshot:
      // Giant bronze wine gourd monument + stone lanterns + merchant cloth stalls + crates + palms + pavilion
      addProp(cx + 150, cy - 135, 'gourd_statue', 1.0);
      addProp(cx + 95, cy - 148, 'stone_lantern', 0.92);
      addProp(cx - 195, cy - 150, 'stone_lantern', 0.92);
      addProp(cx + 255, cy - 35, 'stall', 1.0);
      addProp(cx + 280, cy + 52, 'crates', 0.92);
      addProp(cx - 255, cy - 175, 'pavilion', 1.02);
      addProp(cx - 265, cy + 125, 'stall', 0.95);
      addProp(cx - 210, cy + 168, 'crates', 0.88);
      addProp(cx + 205, cy + 160, 'palm', 1.05);
      addProp(cx - 155, cy + 180, 'palm', 0.96);
      addProp(cx + 295, cy - 155, 'palm', 0.94);

      // West outpost & East lakeside pavilions
      addProp(380, 310, 'pavilion', 0.98);
      addProp(515, 370, 'stall', 0.95);
      addProp(545, 425, 'crates', 0.86);
      addProp(320, 440, 'stone_lantern', 0.9);
      addProp(worldW - 430, worldH - 445, 'pavilion', 0.96);
      addProp(worldW - 325, worldH - 310, 'gourd_statue', 0.88);
    } else if (mapId === 'hoa_son') {
      addProp(cx - 250, cy - 170, 'pavilion', 1.0);
      addProp(cx + 245, cy - 150, 'stele', 1.05);
      addProp(cx - 220, cy + 160, 'brazier', 0.94);
      addProp(cx + 220, cy + 160, 'brazier', 0.94);
      addProp(420, 330, 'stele', 1.0);
      addProp(worldW - 410, worldH - 410, 'pavilion', 0.96);
    } else if (mapId === 'truong_bach') {
      addProp(cx - 245, cy - 165, 'pavilion', 0.96);
      addProp(cx + 225, cy - 145, 'brazier', 1.0);
      addProp(cx - 215, cy + 155, 'brazier', 0.96);
      addProp(cx + 235, cy + 150, 'stele', 1.0);
      addProp(430, 355, 'brazier', 0.96);
      addProp(worldW - 420, worldH - 360, 'brazier', 0.96);
    } else if (mapId === 'tuong_duong') {
      addProp(cx - 255, cy - 165, 'banner', 1.05);
      addProp(cx + 255, cy - 165, 'banner', 1.05);
      addProp(cx - 240, cy + 155, 'brazier', 1.0);
      addProp(cx + 240, cy + 155, 'brazier', 1.0);
      addProp(cx + 285, cy - 45, 'crates', 0.95);
      addProp(410, 325, 'pavilion', 0.98);
      addProp(495, 415, 'crates', 0.9);
      addProp(worldW - 430, worldH - 390, 'banner', 1.05);
    } else {
      // Kiếm Các Thục Đạo
      addProp(cx - 245, cy - 170, 'pavilion', 1.0);
      addProp(cx + 230, cy - 150, 'stele', 1.05);
      addProp(cx - 215, cy + 155, 'stone_lantern', 0.95);
      addProp(cx + 215, cy + 155, 'stone_lantern', 0.95);
      addProp(425, 340, 'stele', 0.96);
      addProp(worldW - 425, worldH - 385, 'pavilion', 0.95);
    }

    // Lanterns lining the main crossroads
    for (let lx = 260; lx <= worldW - 260; lx += 340) {
      if (Math.abs(lx - cx) < 260) continue;
      addProp(lx, cy - 86, mapId === 'tuong_duong' ? 'brazier' : 'stone_lantern', 0.86);
      addProp(lx + 110, cy + 92, mapId === 'tuong_duong' ? 'banner' : 'stone_lantern', 0.86);
    }

    // Scatter thematic trees, bamboo & mountain rocks across the expanded world (avoiding roads, ponds & central spawn)
    const isBlockedByFeature = (x: number, y: number): boolean => {
      if (Math.hypot(x - cx, y - cy) < 245) return true;
      if (Math.abs(y - cy) < 92) return true;
      if (Math.abs(x - cx) < 84) return true;
      for (const pond of ponds) {
        const dx = (x - pond.x) / (pond.rx + 36);
        const dy = (y - pond.y) / (pond.ry + 32);
        if (dx * dx + dy * dy < 1.05) return true;
      }
      for (const pl of plazas) {
        if (Math.abs(x - pl.x) < pl.w * 0.52 && Math.abs(y - pl.y) < pl.h * 0.52) return true;
      }
      return false;
    };

    const pickNaturalProp = (): SceneryPropKind => {
      const r = rng();
      if (mapId === 'tan_thu_thon') {
        if (r < 0.34) return 'palm';
        if (r < 0.62) return 'willow';
        if (r < 0.80) return 'bamboo';
        if (r < 0.92) return 'rock';
        return 'crates';
      }
      if (mapId === 'hoa_son') {
        if (r < 0.45) return 'maple';
        if (r < 0.72) return 'pine';
        if (r < 0.90) return 'rock';
        return 'stele';
      }
      if (mapId === 'truong_bach') {
        if (r < 0.58) return 'snow_pine';
        if (r < 0.84) return 'rock';
        if (r < 0.94) return 'brazier';
        return 'stele';
      }
      if (mapId === 'tuong_duong') {
        if (r < 0.32) return 'pine';
        if (r < 0.56) return 'rock';
        if (r < 0.74) return 'banner';
        if (r < 0.88) return 'crates';
        return 'brazier';
      }
      // kiem_cac
      if (r < 0.42) return 'bamboo';
      if (r < 0.72) return 'pine';
      if (r < 0.90) return 'rock';
      return 'stone_lantern';
    };

    let attempts = 0;
    let placed = 0;
    while (placed < 84 && attempts < 360) {
      attempts++;
      const px = 85 + rng() * (worldW - 170);
      const py = 90 + rng() * (worldH - 180);
      if (isBlockedByFeature(px, py)) continue;
      // Avoid tight overlaps with existing props
      let tooClose = false;
      for (let i = 0; i < props.length; i++) {
        if (Math.hypot(props[i].x - px, props[i].y - py) < 88) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      addProp(px, py, pickNaturalProp(), 0.82 + rng() * 0.34, Math.floor(rng() * 3));
      placed++;
    }
  }

  // Pre-sort props by Y once so per-frame interleaving with units/player is O(N)
  props.sort((a, b) => a.y - b.y);

  return {
    mapId,
    mode,
    worldW,
    worldH,
    baseColor,
    tileLineColor,
    tileStyle,
    plazas,
    roads,
    ponds,
    patches,
    props,
  };
}

/**
 * Draws the expanded ground terrain, isometric tiles, roads, carved stone plazas,
 * Bagua courtyard medallions, lotus ponds & stone bridges inside world space.
 */
export function drawMapGroundLayer(
  ctx: CanvasRenderingContext2D,
  scenery: MapSceneryData,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  animPhase: number
) {
  const minX = Math.max(0, Math.floor(camX) - 64);
  const minY = Math.max(0, Math.floor(camY) - 64);
  const maxX = Math.min(scenery.worldW, Math.ceil(camX + viewW) + 64);
  const maxY = Math.min(scenery.worldH, Math.ceil(camY + viewH) + 64);

  // 1. Base ground fill for visible viewport area
  ctx.fillStyle = scenery.baseColor;
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

  // 2. Subtle isometric tile diamond grid (authentic Kiếm Thế 2009 town / courtyard masonry)
  if (scenery.tileStyle === 'iso_stone' || scenery.tileStyle === 'fortress_stone' || scenery.tileStyle === 'mist_slate') {
    const stepX = 68;
    const stepY = 34;
    const startCol = Math.floor(minX / stepX) - 1;
    const endCol = Math.ceil(maxX / stepX) + 1;
    const startRow = Math.floor(minY / stepY) - 1;
    const endRow = Math.ceil(maxY / stepY) + 1;

    ctx.save();
    ctx.strokeStyle = scenery.tileLineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let r = startRow; r <= endRow; r++) {
      const y = r * stepY;
      const offset = (r & 1) * (stepX * 0.5);
      for (let c = startCol; c <= endCol; c++) {
        const x = c * stepX + offset;
        ctx.moveTo(x, y - stepY * 0.5);
        ctx.lineTo(x + stepX * 0.5, y);
        ctx.lineTo(x, y + stepY * 0.5);
        ctx.lineTo(x - stepX * 0.5, y);
        ctx.closePath();
      }
    }
    ctx.stroke();

    // Sunlit alternating tone tiles for crisp masonry richness
    ctx.fillStyle =
      scenery.tileStyle === 'iso_stone'
        ? 'rgba(255, 250, 232, 0.15)'
        : scenery.tileStyle === 'fortress_stone'
        ? 'rgba(255, 242, 214, 0.13)'
        : 'rgba(226, 255, 245, 0.14)';
    for (let r = startRow; r <= endRow; r++) {
      const y = r * stepY;
      const offset = (r & 1) * (stepX * 0.5);
      for (let c = startCol; c <= endCol; c++) {
        if (((c * 31 + r * 17) & 5) !== 0) continue;
        const x = c * stepX + offset;
        ctx.beginPath();
        ctx.moveTo(x, y - stepY * 0.5);
        ctx.lineTo(x + stepX * 0.5, y);
        ctx.lineTo(x, y + stepY * 0.5);
        ctx.lineTo(x - stepX * 0.5, y);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  } else if (scenery.tileStyle === 'earth_grass' || scenery.tileStyle === 'snow_field') {
    // Subtle sunlit meadow / snowfield texture flecks
    const cell = 84;
    const startCol = Math.floor(minX / cell);
    const endCol = Math.ceil(maxX / cell);
    const startRow = Math.floor(minY / cell);
    const endRow = Math.ceil(maxY / cell);
    ctx.save();
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const hash = Math.abs((c * 73856093) ^ (r * 19349663));
        if ((hash & 3) !== 0) continue;
        const fx = c * cell + (hash % 56) + 12;
        const fy = r * cell + ((hash >> 4) % 56) + 12;
        if (scenery.tileStyle === 'snow_field') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
          ctx.beginPath();
          ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(92, 148, 56, 0.42)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx - 3, fy - 7);
          ctx.moveTo(fx + 2, fy);
          ctx.lineTo(fx + 5, fy - 6);
          ctx.stroke();
          if ((hash & 15) === 0) {
            ctx.fillStyle = (hash & 16) === 0 ? '#FDE047' : '#FDA4AF';
            ctx.beginPath();
            ctx.arc(fx + 1, fy - 6, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  }

  // 3. Organic ground variation patches (frustum culled)
  for (const gp of scenery.patches) {
    if (gp.x + gp.rx < minX || gp.x - gp.rx > maxX || gp.y + gp.ry < minY || gp.y - gp.ry > maxY) {
      continue;
    }
    ctx.save();
    ctx.globalAlpha = gp.alpha;
    ctx.fillStyle = gp.color;
    ctx.translate(gp.x, gp.y);
    ctx.rotate(gp.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, gp.rx, gp.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Sunlit Roads & Pathways with crisp stone curbs
  for (const road of scenery.roads) {
    ctx.save();
    ctx.lineCap = 'round';
    // Outer stone curb border
    ctx.strokeStyle =
      road.style === 'snow_trail'
        ? 'rgba(148, 178, 206, 0.58)'
        : road.style === 'fortress'
        ? 'rgba(104, 86, 68, 0.62)'
        : 'rgba(96, 88, 72, 0.55)';
    ctx.lineWidth = road.width + 12;
    ctx.beginPath();
    ctx.moveTo(road.x1, road.y1);
    ctx.lineTo(road.x2, road.y2);
    ctx.stroke();

    // Inner road bed
    ctx.strokeStyle =
      road.style === 'cobble'
        ? '#B0AC9B'
        : road.style === 'snow_trail'
        ? '#D8E9F7'
        : road.style === 'fortress'
        ? '#A08F78'
        : '#BE9F74';
    ctx.lineWidth = road.width;
    ctx.beginPath();
    ctx.moveTo(road.x1, road.y1);
    ctx.lineTo(road.x2, road.y2);
    ctx.stroke();

    // Center bright stepping stone highlights
    ctx.strokeStyle =
      road.style === 'snow_trail' ? 'rgba(255, 255, 255, 0.48)' : 'rgba(255, 250, 232, 0.28)';
    ctx.lineWidth = road.width * 0.42;
    ctx.setLineDash([18, 22]);
    ctx.beginPath();
    ctx.moveTo(road.x1, road.y1);
    ctx.lineTo(road.x2, road.y2);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Sunlit Carved Stone Plazas & Central Bagua Courtyard Medallion
  for (const pl of scenery.plazas) {
    const left = pl.x - pl.w / 2;
    const top = pl.y - pl.h / 2;
    if (left + pl.w < minX || left > maxX || top + pl.h < minY || top > maxY) continue;

    ctx.save();
    // Outer beveled stone platform (classic bright Kiếm Thế 2009 courtyard limestone)
    ctx.fillStyle =
      pl.style === 'town_stone'
        ? '#B7B3A4'
        : pl.style === 'fortress_flagstone'
        ? '#A4937E'
        : pl.style === 'jade_court'
        ? '#88B4A7'
        : '#A8A08E';
    ctx.strokeStyle = 'rgba(72, 64, 52, 0.58)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(left, top, pl.w, pl.h, 14);
    ctx.fill();
    ctx.stroke();

    // Inner bright trimmed courtyard highlight
    ctx.strokeStyle =
      pl.style === 'jade_court' ? 'rgba(220, 252, 240, 0.48)' : 'rgba(255, 250, 232, 0.48)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(left + 8, top + 8, pl.w - 16, pl.h - 16, 10);
    ctx.stroke();

    // Fine stone flagstone mortar lines inside plaza
    ctx.strokeStyle = 'rgba(66, 60, 50, 0.22)';
    ctx.lineWidth = 1;
    for (let x = left + 42; x < left + pl.w - 16; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, top + 8);
      ctx.lineTo(x, top + pl.h - 8);
      ctx.stroke();
    }
    for (let y = top + 34; y < top + pl.h - 14; y += 34) {
      ctx.beginPath();
      ctx.moveTo(left + 8, y);
      ctx.lineTo(left + pl.w - 8, y);
      ctx.stroke();
    }

    // Iconic Wuxia Bagua / Taiji carved stone inlay in central plaza
    if (pl.hasBagua) {
      const r = Math.min(pl.w, pl.h) * 0.28;
      ctx.save();
      ctx.translate(pl.x, pl.y);
      ctx.scale(1, 0.62);
      ctx.strokeStyle = 'rgba(176, 134, 48, 0.48)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
      ctx.stroke();

      // Octagonal Bagua trim + trigrams
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        const ox = Math.cos(a) * (r * 1.12);
        const oy = Math.sin(a) * (r * 1.12);
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(198, 152, 42, 0.42)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Subtle Yin-Yang S-curve inside center
      ctx.strokeStyle = 'rgba(255, 248, 214, 0.55)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, -r * 0.39, r * 0.39, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.arc(0, r * 0.39, r * 0.39, -Math.PI * 0.5, Math.PI * 0.5, true);
      ctx.stroke();

      ctx.fillStyle = 'rgba(196, 148, 38, 0.46)';
      ctx.beginPath();
      ctx.arc(0, -r * 0.39, r * 0.08, 0, Math.PI * 2);
      ctx.arc(0, r * 0.39, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // 6. Sunlit Crystal Lotus Ponds / Frozen Lakes + Arched Stone Bridges
  for (const pond of scenery.ponds) {
    if (
      pond.x + pond.rx + 40 < minX ||
      pond.x - pond.rx - 40 > maxX ||
      pond.y + pond.ry + 40 < minY ||
      pond.y - pond.ry - 40 > maxY
    ) {
      continue;
    }
    ctx.save();
    // Stone bank rim
    ctx.fillStyle = pond.frozen ? '#A8C5DB' : '#9B9584';
    ctx.beginPath();
    ctx.ellipse(pond.x, pond.y, pond.rx + 9, pond.ry + 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sparkling sunlit water gradient
    const waterGrad = ctx.createRadialGradient(
      pond.x - pond.rx * 0.2,
      pond.y - pond.ry * 0.2,
      10,
      pond.x,
      pond.y,
      pond.rx
    );
    if (pond.frozen) {
      waterGrad.addColorStop(0, '#F0F9FF');
      waterGrad.addColorStop(0.58, '#BAE6FD');
      waterGrad.addColorStop(1, '#7DD3FC');
    } else {
      waterGrad.addColorStop(0, '#56D4DE');
      waterGrad.addColorStop(0.62, '#2FA4B8');
      waterGrad.addColorStop(1, '#1E7A91');
    }
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Animated shimmer ripples
    if (!pond.frozen) {
      ctx.strokeStyle = 'rgba(240, 253, 255, 0.45)';
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 4; i++) {
        const wave = ((animPhase * 0.32 + i * 0.25) % 1);
        const rx = pond.rx * (0.2 + wave * 0.65);
        const ry = pond.ry * (0.2 + wave * 0.65);
        ctx.globalAlpha = (1 - wave) * 0.55;
        ctx.beginPath();
        ctx.ellipse(pond.x, pond.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Floating fresh green lotus pads & vivid pink blossoms
      for (let i = 0; i < pond.lotusCount; i++) {
        const a = (i / Math.max(1, pond.lotusCount)) * Math.PI * 2 + 0.4;
        const dist = 0.46 + (i % 3) * 0.15;
        const lx = pond.x + Math.cos(a) * pond.rx * dist;
        const ly = pond.y + Math.sin(a) * pond.ry * dist;
        ctx.fillStyle = '#3DA852';
        ctx.beginPath();
        ctx.ellipse(lx, ly, 10, 6.5, 0, 0.25, Math.PI * 2 - 0.15);
        ctx.lineTo(lx, ly);
        ctx.fill();
        ctx.fillStyle = '#6AD675';
        ctx.beginPath();
        ctx.ellipse(lx - 2, ly - 1, 5.5, 3.2, 0, 0.2, Math.PI * 1.6);
        ctx.fill();
        if (i % 2 === 0) {
          ctx.fillStyle = '#F472B6';
          ctx.beginPath();
          ctx.arc(lx, ly - 1.5, 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          ctx.arc(lx, ly - 1.5, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Carved sunlit arched stone footbridge crossing the pond
    if (pond.hasBridge) {
      const bw = 46;
      const bh = pond.ry * 2 + 22;
      ctx.fillStyle = '#BEB7A6';
      ctx.strokeStyle = '#575044';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(pond.x - bw / 2, pond.y - bh / 2, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      // Bridge planks & sunlit stone railings
      ctx.strokeStyle = 'rgba(72, 64, 52, 0.38)';
      ctx.lineWidth = 1;
      for (let py = pond.y - bh / 2 + 12; py < pond.y + bh / 2 - 6; py += 12) {
        ctx.beginPath();
        ctx.moveTo(pond.x - bw / 2 + 4, py);
        ctx.lineTo(pond.x + bw / 2 - 4, py);
        ctx.stroke();
      }
      ctx.fillStyle = '#DBD5C5';
      ctx.fillRect(pond.x - bw / 2 - 2, pond.y - bh / 2, 5, bh);
      ctx.fillRect(pond.x + bw / 2 - 3, pond.y - bh / 2, 5, bh);
    }
    ctx.restore();
  }

  // 7. Subtle World Perimeter Stone Border so map edge feels intentional
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.34)';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, scenery.worldW - 48, scenery.worldH - 48);
  ctx.restore();
}

/**
 * Draws a single 2.5D Y-sorted Kiếm Thế 2009 scenery prop anchored at (prop.x, prop.y).
 */
export function drawSceneryProp(
  ctx: CanvasRenderingContext2D,
  prop: SceneryProp,
  animPhase: number
) {
  ctx.save();
  ctx.translate(prop.x, prop.y);
  const s = prop.scale;
  const flipX = prop.flip ? -1 : 1;
  const sway = Math.sin(animPhase * 1.15 + prop.seed) * 2.2;

  switch (prop.kind) {
    case 'palm': {
      // Sunlit tropical courtyard palm inspired by Kiếm Thế 2009 Ba Lăng Huyện
      ctx.scale(s, s);
      // Soft sunlit ground shadow
      ctx.fillStyle = 'rgba(24, 34, 22, 0.22)';
      ctx.beginPath();
      ctx.ellipse(6, 5, 28, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Curved segmented trunk
      const lean = 10 * flipX;
      ctx.strokeStyle = '#7D5E41';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(lean * 0.5, -32, lean + sway * 0.4, -68);
      ctx.stroke();

      ctx.strokeStyle = '#A6825B';
      ctx.lineWidth = 4;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(lean * 0.5, -32, lean + sway * 0.4, -68);
      ctx.stroke();
      ctx.setLineDash([]);

      // Layered sunlit palm fronds radiating from crown
      const crownX = lean + sway * 0.5;
      const crownY = -70;
      const frondAngles = [-2.55, -2.05, -1.45, -0.75, -0.18, 0.42, 2.75];
      for (let i = 0; i < frondAngles.length; i++) {
        const a = frondAngles[i] + sway * 0.012;
        const len = i % 2 === 0 ? 44 : 36;
        const fx = crownX + Math.cos(a) * len;
        const fy = crownY + Math.sin(a) * len * 0.72 + 12;
        const midX = crownX + Math.cos(a) * len * 0.55;
        const midY = crownY + Math.sin(a) * len * 0.45 - 6;

        ctx.strokeStyle = i % 2 === 0 ? '#3E8E40' : '#58B24E';
        ctx.lineWidth = 7.5;
        ctx.beginPath();
        ctx.moveTo(crownX, crownY);
        ctx.quadraticCurveTo(midX, midY, fx, fy);
        ctx.stroke();

        ctx.strokeStyle = '#92E46E';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(crownX, crownY);
        ctx.quadraticCurveTo(midX, midY - 1.5, fx, fy);
        ctx.stroke();
      }
      break;
    }

    case 'willow': {
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(24, 34, 22, 0.22)';
      ctx.beginPath();
      ctx.ellipse(2, 5, 32, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Trunk
      ctx.strokeStyle = '#6E5037';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(5 * flipX, -28, 0, -54);
      ctx.stroke();

      // Fresh sunlit canopy dome
      ctx.fillStyle = '#409146';
      ctx.beginPath();
      ctx.ellipse(0, -64, 34, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#68C25D';
      ctx.beginPath();
      ctx.ellipse(-6, -70, 24, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draping swaying bright spring tendrils
      ctx.strokeStyle = 'rgba(148, 226, 118, 0.85)';
      ctx.lineWidth = 1.9;
      for (let i = -4; i <= 4; i++) {
        const tx = i * 7;
        const len = 36 + ((Math.abs(i) * 7) % 16);
        ctx.beginPath();
        ctx.moveTo(tx, -54);
        ctx.quadraticCurveTo(tx + sway * 1.1, -54 + len * 0.55, tx + sway * 1.6, -54 + len);
        ctx.stroke();
      }
      break;
    }

    case 'maple': {
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(28, 20, 16, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 5, 30, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#6B4732';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(0, -48);
      ctx.stroke();

      const clusters = [
        [-16, -56, 20, '#C92A2A'],
        [16, -54, 19, '#E03131'],
        [0, -72, 23, '#F03E3E'],
        [-6, -64, 15, '#FD7E14'],
        [10, -68, 13, '#FCC419'],
      ] as const;
      for (const [cx, cy, r, col] of clusters) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx + sway * 0.35, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'pine':
    case 'snow_pine': {
      const isSnow = prop.kind === 'snow_pine';
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(20, 28, 32, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 5, 26, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#6B4933';
      ctx.fillRect(-4, -20, 8, 22);

      const tiers = [
        { y: -16, w: 30, h: 24, col: isSnow ? '#326668' : '#2A6E4D' },
        { y: -34, w: 24, h: 24, col: isSnow ? '#417E80' : '#378B62' },
        { y: -52, w: 18, h: 22, col: isSnow ? '#529A9C' : '#49AB79' },
      ];
      for (const t of tiers) {
        ctx.fillStyle = t.col;
        ctx.beginPath();
        ctx.moveTo(sway * 0.25, t.y - t.h);
        ctx.lineTo(t.w, t.y);
        ctx.lineTo(-t.w, t.y);
        ctx.closePath();
        ctx.fill();
        if (isSnow) {
          ctx.fillStyle = '#F8FAFC';
          ctx.beginPath();
          ctx.moveTo(sway * 0.25, t.y - t.h);
          ctx.lineTo(t.w * 0.6, t.y - t.h * 0.4);
          ctx.lineTo(-t.w * 0.6, t.y - t.h * 0.4);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    }

    case 'bamboo': {
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(24, 34, 22, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      const stalks = [-10, -3, 4, 11];
      for (let i = 0; i < stalks.length; i++) {
        const bx = stalks[i];
        const h = 58 + (i % 2) * 16;
        const lean = (i - 1.5) * 4 + sway * 0.8;
        ctx.strokeStyle = i % 2 === 0 ? '#3E9B65' : '#58BC7F';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(bx, 2);
        ctx.quadraticCurveTo(bx + lean * 0.4, -h * 0.5, bx + lean, -h);
        ctx.stroke();

        // Sunlit bamboo leaves near top
        ctx.fillStyle = '#84E69D';
        ctx.beginPath();
        ctx.ellipse(bx + lean - 5, -h + 6, 8, 2.5, -0.4, 0, Math.PI * 2);
        ctx.ellipse(bx + lean + 6, -h + 12, 8, 2.5, 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'pavilion': {
      // Sunlit Song-dynasty wooden Wuxia pavilion with glazed teal-jade roof & vermilion pillars
      ctx.scale(s, s);
      // Soft ground shadow
      ctx.fillStyle = 'rgba(20, 22, 20, 0.24)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 66, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#B2ADA0';
      ctx.strokeStyle = '#524D42';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-52, -8, 104, 18, 4);
      ctx.fill();
      ctx.stroke();

      // Vibrant vermilion pillars
      const pillarXs = [-40, -14, 14, 40];
      for (const px of pillarXs) {
        ctx.fillStyle = '#A82020';
        ctx.fillRect(px - 3, -54, 6, 48);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(px - 1.5, -54, 2, 48);
      }

      // Crossbeam & wooden balustrade
      ctx.fillStyle = '#8A241C';
      ctx.fillRect(-44, -56, 88, 6);
      ctx.fillStyle = '#B46936';
      ctx.fillRect(-40, -16, 26, 4);
      ctx.fillRect(14, -16, 26, 4);

      // Hanging glowing red lanterns under eaves
      const glow = 0.72 + 0.28 * Math.sin(animPhase * 2.2 + prop.seed);
      for (const lx of [-28, 28]) {
        ctx.fillStyle = `rgba(251, 191, 36, ${(glow * 0.3).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(lx, -42, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.ellipse(lx, -43, 4.5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(lx - 2, -49, 4, 2);
        ctx.fillRect(lx - 2, -37, 4, 2);
      }

      // Lower curved glazed jade-teal tiled roof
      ctx.fillStyle = '#36757A';
      ctx.strokeStyle = '#1D4245';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-64, -52);
      ctx.quadraticCurveTo(-36, -66, 0, -76);
      ctx.quadraticCurveTo(36, -66, 64, -52);
      ctx.quadraticCurveTo(0, -47, -64, -52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Upper roof tier & golden finial spire
      ctx.fillStyle = '#479196';
      ctx.beginPath();
      ctx.moveTo(-40, -72);
      ctx.quadraticCurveTo(-18, -86, 0, -96);
      ctx.quadraticCurveTo(18, -86, 40, -72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -96);
      ctx.lineTo(0, -106);
      ctx.stroke();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(0, -105, 3.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'stall': {
      // Sunlit market cloth-awning booth (inspired by Kiếm Thế 2009 town merchant stall)
      ctx.scale(s * flipX, s);
      ctx.fillStyle = 'rgba(22, 20, 16, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 44, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wooden counter & poles
      ctx.fillStyle = '#8F5E34';
      ctx.strokeStyle = '#422813';
      ctx.lineWidth = 1.6;
      ctx.fillRect(-32, -16, 64, 20);
      ctx.strokeRect(-32, -16, 64, 20);

      // Goods on table (scrolls & porcelain jars)
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-22, -22, 10, 6);
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(-2, -19, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(10, -21, 14, 5);

      // Support poles
      ctx.fillStyle = '#6E4523';
      ctx.fillRect(-34, -52, 4, 56);
      ctx.fillRect(30, -52, 4, 56);

      // Bright sunlit ivory canvas awning with trim
      ctx.fillStyle = '#EDE3D2';
      ctx.strokeStyle = '#78624A';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-42, -46);
      ctx.lineTo(-26, -64);
      ctx.lineTo(36, -60);
      ctx.lineTo(44, -40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Awning stripes
      ctx.strokeStyle = 'rgba(156, 128, 96, 0.42)';
      ctx.lineWidth = 2;
      for (let i = -24; i <= 26; i += 14) {
        ctx.beginPath();
        ctx.moveTo(i, -61);
        ctx.lineTo(i + 5, -43);
        ctx.stroke();
      }
      break;
    }

    case 'gourd_statue': {
      // Iconic Kiếm Thế 2009 giant bronze-lacquer wine gourd statue on bright stone base
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(20, 18, 16, 0.24)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pedestal
      ctx.fillStyle = '#9D988A';
      ctx.strokeStyle = '#47433A';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-18, -6, 36, 10);
      ctx.strokeRect(-18, -6, 36, 10);

      // Lower bulb
      const gGrad = ctx.createRadialGradient(-5, -24, 3, 0, -20, 20);
      gGrad.addColorStop(0, '#B45309');
      gGrad.addColorStop(0.62, '#6E2D10');
      gGrad.addColorStop(1, '#361507');
      ctx.fillStyle = gGrad;
      ctx.strokeStyle = '#261006';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, -19, 17, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Upper bulb
      ctx.beginPath();
      ctx.ellipse(0, -40, 12, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Crimson silk ribbon around waist + bright golden calligraphy plaque
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(-10, -32, 20, 3.5);
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(-6, -24, 12, 10);
      ctx.fillStyle = '#422006';
      ctx.fillRect(-3, -22, 6, 6);
      break;
    }

    case 'stone_lantern': {
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(20, 20, 18, 0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 13, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Warm lantern glow
      const flicker = 0.78 + 0.22 * Math.sin(animPhase * 3.1 + prop.seed);
      const lg = ctx.createRadialGradient(0, -30, 2, 0, -30, 22);
      lg.addColorStop(0, `rgba(254, 240, 138, ${(0.42 * flicker).toFixed(2)})`);
      lg.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(0, -30, 22, 0, Math.PI * 2);
      ctx.fill();

      // Bright carved granite pillar & base
      ctx.fillStyle = '#B2AEA2';
      ctx.strokeStyle = '#524E45';
      ctx.lineWidth = 1.4;
      ctx.fillRect(-9, -4, 18, 6);
      ctx.fillRect(-4, -24, 8, 20);
      ctx.strokeRect(-4, -24, 8, 20);

      // Firebox
      ctx.fillStyle = '#FEF9C3';
      ctx.fillRect(-6, -34, 12, 10);
      ctx.strokeRect(-6, -34, 12, 10);

      // Pagoda cap
      ctx.fillStyle = '#969286';
      ctx.beginPath();
      ctx.moveTo(-12, -34);
      ctx.lineTo(0, -44);
      ctx.lineTo(12, -34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'crates': {
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(22, 18, 14, 0.22)';
      ctx.beginPath();
      ctx.ellipse(2, 4, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main sunlit wooden crate
      ctx.fillStyle = '#AF7E4E';
      ctx.strokeStyle = '#4E3219';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-18, -16, 20, 18);
      ctx.strokeRect(-18, -16, 20, 18);
      ctx.beginPath();
      ctx.moveTo(-18, -16);
      ctx.lineTo(2, 2);
      ctx.moveTo(2, -16);
      ctx.lineTo(-18, 2);
      ctx.stroke();

      // Second smaller crate + ceramic wine jar
      ctx.fillStyle = '#996A3F';
      ctx.fillRect(0, -12, 16, 14);
      ctx.strokeRect(0, -12, 16, 14);

      ctx.fillStyle = '#BF8554';
      ctx.beginPath();
      ctx.ellipse(-9, -22, 6, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(-12, -29, 6, 2.5);
      break;
    }

    case 'brazier': {
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(20, 18, 16, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 5, 16, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Firelight pool
      const flicker = 0.8 + 0.2 * Math.sin(animPhase * 6 + prop.seed);
      const fg = ctx.createRadialGradient(0, -24, 3, 0, -24, 32);
      fg.addColorStop(0, `rgba(251, 146, 60, ${(0.45 * flicker).toFixed(2)})`);
      fg.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(0, -24, 32, 0, Math.PI * 2);
      ctx.fill();

      // Bronze tripod legs & bowl
      ctx.strokeStyle = '#4A433D';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-9, 3);
      ctx.lineTo(-4, -18);
      ctx.moveTo(9, 3);
      ctx.lineTo(4, -18);
      ctx.moveTo(0, 4);
      ctx.lineTo(0, -18);
      ctx.stroke();

      ctx.fillStyle = '#6B625A';
      ctx.strokeStyle = '#332E2A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, -20, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Animated flame tongue
      const fh = 15 + Math.sin(animPhase * 8 + prop.seed) * 3.5;
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(-7, -21);
      ctx.quadraticCurveTo(0, -21 - fh, 7, -21);
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.moveTo(-3.5, -21);
      ctx.quadraticCurveTo(0, -21 - fh * 0.65, 3.5, -21);
      ctx.fill();
      break;
    }

    case 'banner': {
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(20, 18, 16, 0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tall wooden pole + spear tip
      ctx.fillStyle = '#7A4E2D';
      ctx.fillRect(-2, -66, 4, 68);
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(0, -75);
      ctx.lineTo(4, -66);
      ctx.lineTo(-4, -66);
      ctx.closePath();
      ctx.fill();

      // Fluttering vibrant crimson/gold war cloth
      const wave = Math.sin(animPhase * 3.2 + prop.seed) * 4;
      ctx.fillStyle = '#DC2626';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(2, -62);
      ctx.quadraticCurveTo(16, -60 + wave * 0.4, 24, -56 + wave);
      ctx.lineTo(22, -26 + wave);
      ctx.quadraticCurveTo(12, -30 + wave * 0.4, 2, -28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(12, -45 + wave * 0.5, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'stele': {
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(20, 20, 18, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 5, 19, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bright stone pedestal & tall carved martial monolith
      ctx.fillStyle = '#948F84';
      ctx.strokeStyle = '#47443D';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-16, -6, 32, 9);
      ctx.strokeRect(-16, -6, 32, 9);

      ctx.fillStyle = '#AAB0AC';
      ctx.beginPath();
      ctx.roundRect(-11, -54, 22, 49, [8, 8, 0, 0]);
      ctx.fill();
      ctx.stroke();

      // Glowing ancient gold runes
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)';
      ctx.lineWidth = 1.6;
      for (let ry = -44; ry <= -16; ry += 7) {
        ctx.beginPath();
        ctx.moveTo(-4, ry);
        ctx.lineTo(4, ry);
        ctx.stroke();
      }
      break;
    }

    case 'rock': {
      ctx.scale(s * flipX, s);
      ctx.fillStyle = 'rgba(22, 24, 20, 0.2)';
      ctx.beginPath();
      ctx.ellipse(2, 4, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#8A8F86';
      ctx.strokeStyle = '#464A44';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-22, 2);
      ctx.lineTo(-16, -16);
      ctx.lineTo(-3, -24);
      ctx.lineTo(14, -18);
      ctx.lineTo(22, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crisp sunlit facet highlight
      ctx.fillStyle = 'rgba(250, 248, 240, 0.36)';
      ctx.beginPath();
      ctx.moveTo(-16, -16);
      ctx.lineTo(-3, -24);
      ctx.lineTo(4, -10);
      ctx.lineTo(-10, -6);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}
