import { useId } from 'react';
import type { Chip, DieInfo } from '../data/types';

export const ROLE_COLORS: Record<DieInfo['role'], { fill: string; stroke: string; label: string }> = {
  compute: { fill: '#f97316', stroke: '#c2410c', label: '计算 Die / CCD' },
  graphics: { fill: '#14b8a6', stroke: '#0f766e', label: '图形 / 主 Die' },
  io: { fill: '#64748b', stroke: '#475569', label: 'I/O Die' },
  cache: { fill: '#a855f7', stroke: '#7e22ce', label: '缓存 Die (MCD)' },
  soc: { fill: '#3b82f6', stroke: '#1d4ed8', label: 'SoC 模块' },
  other: { fill: '#78716c', stroke: '#57534e', label: '其他模块' },
};

interface DieRect {
  die: DieInfo;
  index: number;
  x: number; // mm，相对封装左上
  y: number;
  w: number; // mm（水平）
  h: number; // mm（垂直）
  approx: boolean; // 长宽为按面积折算的正方形近似
}

interface LayoutResult {
  pkgL: number; // mm（水平）
  pkgW: number; // mm（垂直）
  pkgKnown: boolean;
  rects: DieRect[];
}

/** 单个 Die 的物理尺寸（mm）。只有面积时按正方形近似。 */
function dieSizeMm(die: DieInfo): { l: number; w: number; approx: boolean } {
  if (die.lengthMm != null && die.widthMm != null) {
    return { l: die.lengthMm, w: die.widthMm, approx: false };
  }
  if (die.areaMm2 != null && die.areaMm2 > 0) {
    const side = Math.sqrt(die.areaMm2);
    return { l: side, w: side, approx: true };
  }
  return { l: 8, w: 8, approx: true };
}

/** 在给定内部区域内摆放所有 Die（有 layout 的按相对坐标，否则自动流式居中排列） */
function placeDies(chip: Chip, sizes: { l: number; w: number }[], innerW: number, innerH: number) {
  const n = chip.dies.length;
  const rects: { x: number; y: number; w: number; h: number }[] = new Array(n);
  const allHaveLayout = chip.dies.every((d) => d.layout != null);

  if (allHaveLayout) {
    chip.dies.forEach((d, i) => {
      const cx = d.layout!.x * innerW;
      const cy = d.layout!.y * innerH;
      rects[i] = { x: cx - sizes[i].l / 2, y: cy - sizes[i].w / 2, w: sizes[i].l, h: sizes[i].w };
    });
    return rects;
  }

  // 自动流式（货架打包，按高度降序，逐行居中）
  const gap = 1.2;
  const order = chip.dies.map((_, i) => ({ i, l: sizes[i].l, w: sizes[i].w })).sort((a, b) => b.w - a.w);
  const rows: { items: { i: number; l: number; w: number }[]; h: number; w: number }[] = [];
  for (const item of order) {
    let row = rows[rows.length - 1];
    if (!row || row.w + (row.items.length > 0 ? gap : 0) + item.l > innerW) {
      row = { items: [], h: 0, w: 0 };
      rows.push(row);
    }
    row.w += (row.items.length > 0 ? gap : 0) + item.l;
    row.h = Math.max(row.h, item.w);
    row.items.push(item);
  }
  const totalH = rows.reduce((s, r) => s + r.h, 0) + gap * (rows.length - 1);
  let y = Math.max(0, (innerH - totalH) / 2);
  for (const row of rows) {
    let x = Math.max(0, (innerW - row.w) / 2);
    for (const item of row.items) {
      rects[item.i] = { x, y, w: item.l, h: item.w };
      x += item.l + gap;
    }
    y += row.h + gap;
  }
  return rects;
}

function layoutChip(chip: Chip): LayoutResult {
  const sizes = chip.dies.map(dieSizeMm);
  const pkg = chip.package;
  const pkgKnown = pkg.lengthMm != null && pkg.widthMm != null;

  if (pkgKnown) {
    const pkgL = pkg.lengthMm!;
    const pkgW = pkg.widthMm!;
    const margin = Math.max(2, Math.min(pkgL, pkgW) * 0.07);
    const rects = placeDies(chip, sizes, pkgL - 2 * margin, pkgW - 2 * margin).map((r) => ({
      x: r.x + margin,
      y: r.y + margin,
      w: r.w,
      h: r.h,
    }));
    return {
      pkgL,
      pkgW,
      pkgKnown: true,
      rects: rects.map((r, i) => ({ ...r, die: chip.dies[i], index: i, approx: sizes[i].approx })),
    };
  }

  // 估算封装模式：先在虚拟方形区域布局，再按 Die 包围盒 + 边距推导封装
  const totalArea = sizes.reduce((s, sz) => s + sz.l * sz.w, 0);
  const side = Math.sqrt(Math.max(totalArea, 16) * 1.5);
  const raw = placeDies(chip, sizes, side, side);
  const x0 = Math.min(...raw.map((r) => r.x));
  const y0 = Math.min(...raw.map((r) => r.y));
  const x1 = Math.max(...raw.map((r) => r.x + r.w));
  const y1 = Math.max(...raw.map((r) => r.y + r.h));
  const margin = 3;
  const pkgL = x1 - x0 + 2 * margin;
  const pkgW = y1 - y0 + 2 * margin;
  return {
    pkgL,
    pkgW,
    pkgKnown: false,
    rects: raw.map((r, i) => ({
      x: r.x - x0 + margin,
      y: r.y - y0 + margin,
      w: r.w,
      h: r.h,
      die: chip.dies[i],
      index: i,
      approx: sizes[i].approx,
    })),
  };
}

function truncate(text: string, maxChars: number): string {
  if (maxChars < 2) return '';
  return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
}

export interface ChipDiagramProps {
  chip: Chip;
  /** full=完整标注版（详情/对比页）；mini=缩略版（卡片） */
  variant?: 'full' | 'mini';
  /** 每毫米像素数。full 默认 10，mini 默认 3.2。对比页请显式传相同值以保证真实比例 */
  scale?: number;
  className?: string;
}

export default function ChipDiagram({ chip, variant = 'full', scale, className }: ChipDiagramProps) {
  const rawId = useId().replace(/[:]/g, '');
  const S = scale ?? (variant === 'full' ? 10 : 3.2);
  const { pkgL, pkgW, pkgKnown, rects } = layoutChip(chip);
  /** 保留 1 位小数（整数不带小数点），用于尺寸标注 */
  const t1 = (v: number): string => {
    const r = Math.round(v * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  };

  const isMini = variant === 'mini';
  const padL = isMini ? 4 : 56;
  const padT = isMini ? 4 : 56;
  const padR = isMini ? 4 : 20;
  const padB = isMini ? 4 : 42;

  const px = padL;
  const py = padT;
  const pw = pkgL * S;
  const ph = pkgW * S;
  const vbW = padL + pw + padR;
  const vbH = padT + ph + padB;

  const style = chip.package.style;
  const substrateFill = style === 'bga' ? '#1e4634' : style === 'pga' ? '#e3d9c2' : '#e9e2d0';
  const substrateStroke = style === 'bga' ? '#122b1f' : '#b5a98a';
  const patternId = `pat-${rawId}`;

  const barY = py + ph + 18;
  const numCirc = (v: number) => Math.round(v * 100) / 100;

  return (
    <svg
      viewBox={`0 0 ${numCirc(vbW)} ${numCirc(vbH)}`}
      width={isMini ? '100%' : numCirc(vbW)}
      height={isMini ? undefined : numCirc(vbH)}
      className={className}
      role="img"
      aria-label={`${chip.model} 封装与 Die 比例示意图`}
    >
      <defs>
        <pattern id={patternId} width={6} height={6} patternUnits="userSpaceOnUse">
          <circle cx={3} cy={3} r={1.1} fill={style === 'pga' ? '#a08d5f' : '#c8b98a'} />
        </pattern>
      </defs>

      {/* ===== 封装层 ===== */}
      <rect
        x={px}
        y={py}
        width={pw}
        height={ph}
        rx={style === 'bga' ? 3 : 6}
        fill={pkgKnown ? substrateFill : '#eef2f7'}
        stroke={pkgKnown ? substrateStroke : '#94a3b8'}
        strokeWidth={pkgKnown ? 1.5 : 1.5}
        strokeDasharray={pkgKnown ? undefined : '7 5'}
      />
      {/* LGA/PGA：触点/针脚纹理 + 防呆缺口 */}
      {pkgKnown && style !== 'bga' && (
        <>
          <rect x={px + 3} y={py + 3} width={pw - 6} height={ph - 6} rx={4} fill={`url(#${patternId})`} opacity={0.45} />
          {[0.35, 0.65].map((f) => (
            <g key={f}>
              <circle cx={px} cy={py + ph * f} r={Math.max(3, 0.5 * S)} fill="#f6f7f9" stroke={substrateStroke} strokeWidth={1} />
              <circle cx={px + pw} cy={py + ph * f} r={Math.max(3, 0.5 * S)} fill="#f6f7f9" stroke={substrateStroke} strokeWidth={1} />
            </g>
          ))}
        </>
      )}
      {/* BGA：内圈焊球阵列示意 */}
      {style === 'bga' && pkgKnown && (
        <rect x={px + 5} y={py + 5} width={pw - 10} height={ph - 10} fill="none" stroke="#2c5d47" strokeWidth={2} strokeDasharray="3 4" />
      )}

      {/* ===== Die 层 ===== */}
      {rects.map((r) => {
        const c = ROLE_COLORS[r.die.role];
        const dx = px + r.x * S;
        const dy = py + r.y * S;
        const dw = r.w * S;
        const dh = r.h * S;
        const showLabel = !isMini && dw >= 58 && dh >= 24;
        const showDimsLine = showLabel && dh >= 38;
        const maxChars = Math.floor(dw / 10);
        const areaText = r.die.areaMm2 != null ? `${r.die.areaMm2} mm²${r.approx ? ' ~' : ''}` : '暂无数据';
        const dimsText = `${t1(r.w)} × ${t1(r.h)} mm${r.approx ? ' ~' : ''}`;
        return (
          <g key={r.index}>
            <rect x={dx} y={dy} width={dw} height={dh} rx={2} fill={c.fill} stroke={c.stroke} strokeWidth={1.2} opacity={0.92} />
            {!isMini && (
              <g>
                <circle cx={dx + 9} cy={dy + 9} r={7} fill="#0f172a" opacity={0.8} />
                <text x={dx + 9} y={dy + 12} textAnchor="middle" fontSize={9} fill="#fff" fontWeight={600}>
                  {r.index + 1}
                </text>
              </g>
            )}
            {showLabel && (
              <>
                <text x={dx + dw / 2} y={dy + dh / 2 + (showDimsLine ? -10 : -2)} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600}>
                  {truncate(r.die.name, maxChars)}
                </text>
                <text x={dx + dw / 2} y={dy + dh / 2 + (showDimsLine ? 1 : 11)} textAnchor="middle" fontSize={9} fill="#fff" opacity={0.9}>
                  {areaText}
                </text>
                {showDimsLine && (
                  <text x={dx + dw / 2} y={dy + dh / 2 + 12} textAnchor="middle" fontSize={8.5} fill="#fff" opacity={0.85}>
                    {dimsText}
                  </text>
                )}
              </>
            )}
            {/* 单 Die 芯片：在 Die 外侧直接画长宽尺寸标注线 */}
            {!isMini && rects.length === 1 && (
              <>
                <g stroke="#475569" strokeWidth={0.8} opacity={0.85}>
                  <line x1={dx} y1={dy - 8} x2={dx + dw} y2={dy - 8} />
                  <line x1={dx} y1={dy - 11} x2={dx} y2={dy - 5} />
                  <line x1={dx + dw} y1={dy - 11} x2={dx + dw} y2={dy - 5} />
                </g>
                <text x={dx + dw / 2} y={dy - 12} textAnchor="middle" fontSize={9} fill="#475569">
                  {t1(r.w)} mm{r.approx ? ' ~' : ''}
                </text>
                <g stroke="#475569" strokeWidth={0.8} opacity={0.85}>
                  <line x1={dx - 8} y1={dy} x2={dx - 8} y2={dy + dh} />
                  <line x1={dx - 11} y1={dy} x2={dx - 5} y2={dy} />
                  <line x1={dx - 11} y1={dy + dh} x2={dx - 5} y2={dy + dh} />
                </g>
                <text
                  x={dx - 14}
                  y={dy + dh / 2}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#475569"
                  transform={`rotate(-90 ${dx - 14} ${dy + dh / 2})`}
                >
                  {t1(r.h)} mm{r.approx ? ' ~' : ''}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* ===== 标注层 ===== */}
      {!isMini && pkgKnown && (
        <>
          {/* 顶部水平尺寸标注（lengthMm） */}
          <g stroke="#64748b" strokeWidth={1}>
            <line x1={px} y1={py - 14} x2={px + pw} y2={py - 14} />
            <line x1={px} y1={py - 19} x2={px} y2={py - 9} />
            <line x1={px + pw} y1={py - 19} x2={px + pw} y2={py - 9} />
          </g>
          <text x={px + pw / 2} y={py - 22} textAnchor="middle" fontSize={11} fill="#475569" fontWeight={500}>
            {chip.package.lengthMm} mm
          </text>
          {/* 左侧垂直尺寸标注（widthMm） */}
          <g stroke="#64748b" strokeWidth={1}>
            <line x1={px - 14} y1={py} x2={px - 14} y2={py + ph} />
            <line x1={px - 19} y1={py} x2={px - 9} y2={py} />
            <line x1={px - 19} y1={py + ph} x2={px - 9} y2={py + ph} />
          </g>
          <text
            x={px - 26}
            y={py + ph / 2}
            textAnchor="middle"
            fontSize={11}
            fill="#475569"
            fontWeight={500}
            transform={`rotate(-90 ${px - 26} ${py + ph / 2})`}
          >
            {chip.package.widthMm} mm
          </text>
        </>
      )}

      {!isMini && (
        <>
          {/* 比例尺（10mm） */}
          <g stroke="#64748b" strokeWidth={2}>
            <line x1={px} y1={barY} x2={px + 10 * S} y2={barY} />
            <line x1={px} y1={barY - 4} x2={px} y2={barY + 4} strokeWidth={1.2} />
            <line x1={px + 10 * S} y1={barY - 4} x2={px + 10 * S} y2={barY + 4} strokeWidth={1.2} />
          </g>
          <text x={px + 5 * S} y={barY + 15} textAnchor="middle" fontSize={10} fill="#64748b">
            10 mm
          </text>
          {/* 估算封装声明 */}
          {!pkgKnown && (
            <text x={px + pw} y={barY + 12} textAnchor="end" fontSize={10} fill="#94a3b8">
              封装尺寸暂无公开数据 · 外框为估算示意
            </text>
          )}
        </>
      )}
    </svg>
  );
}
