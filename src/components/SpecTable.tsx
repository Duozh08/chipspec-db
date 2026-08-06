import type { ReactNode } from 'react';
import type { Chip } from '../data/types';
import {
  BRAND_LABELS,
  CATEGORY_LABELS,
  FORM_FACTOR_LABELS,
  fmtArea,
  fmtDieDims,
  fmtDims,
  fmtTdp,
  fmtTransistors,
  totalDieArea,
} from '../data/types';

export interface SpecRow {
  label: string;
  value: (chip: Chip) => ReactNode;
}

/** 详情页与对比页共用的规格行定义 */
export const SPEC_ROWS: SpecRow[] = [
  { label: '品牌', value: (c) => BRAND_LABELS[c.brand] },
  { label: '类别', value: (c) => CATEGORY_LABELS[c.category] },
  { label: '形态', value: (c) => FORM_FACTOR_LABELS[c.formFactor] },
  { label: '型号', value: (c) => c.model },
  { label: '核心代号', value: (c) => c.codename },
  { label: '代际', value: (c) => c.generation },
  { label: '制程工艺', value: (c) => c.process },
  { label: '发布时间', value: (c) => c.release ?? '暂无数据' },
  { label: '封装型号', value: (c) => c.package.type },
  {
    label: '封装尺寸（长×宽）',
    value: (c) => fmtDims(c.package.lengthMm, c.package.widthMm),
  },
  {
    label: '封装面积',
    value: (c) =>
      c.package.lengthMm != null && c.package.widthMm != null
        ? fmtArea(Math.round(c.package.lengthMm * c.package.widthMm * 10) / 10)
        : '暂无数据',
  },
  { label: 'Die 数量', value: (c) => `${c.dies.length} 个` },
  { label: 'Die 总面积', value: (c) => fmtArea(totalDieArea(c)) },
  {
    label: 'Die 长×宽',
    value: (c) => (c.dies.length === 1 ? fmtDieDims(c.dies[0]) : '各 Die 不同 · 见下方明细'),
  },
  { label: '晶体管总数', value: (c) => fmtTransistors(c.transistorsMillions) },
  {
    label: 'TDP（功耗）',
    value: (c) => fmtTdp(c.tdp),
  },
  {
    label: '满载温度',
    value: (c) => c.loadTempRange ?? '暂无数据',
  },
  { label: '备注', value: (c) => c.notes ?? '—' },
];

/** 详情页两列规格表 */
export default function SpecTable({ chip }: { chip: Chip }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
        规格参数
      </div>
      <dl className="divide-y divide-slate-100">
        {SPEC_ROWS.map((row) => {
          const isDieDims = row.label === 'Die 长×宽';
          return (
            <div
              key={row.label}
              className={`grid grid-cols-[8.5rem_1fr] gap-4 px-4 py-2.5 text-sm ${
                isDieDims ? 'bg-red-50/70' : ''
              }`}
            >
              <dt className={`text-slate-500 ${isDieDims ? 'font-bold text-red-600' : ''}`}>{row.label}</dt>
              <dd className={`text-slate-800 ${isDieDims ? 'font-bold text-red-600' : ''}`}>{row.value(chip)}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
