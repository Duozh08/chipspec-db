import type { Chip, DataQuality, DieInfo } from '../data/types';
import { DATA_QUALITY_LABELS, fmtArea, fmtDieDims, fmtTransistors } from '../data/types';
import { ROLE_COLORS } from './ChipDiagram';

const QUALITY_STYLES: Record<DataQuality, string> = {
  official: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  measured: 'bg-amber-100 text-amber-800 border-amber-300',
  estimated: 'bg-slate-100 text-slate-600 border-slate-300',
};

export function DataQualityBadge({ quality }: { quality: DataQuality }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${QUALITY_STYLES[quality]}`}>
      {DATA_QUALITY_LABELS[quality]}
    </span>
  );
}

/** 图例 + 全局声明 */
export function DiagramLegend({ chip }: { chip: Chip }) {
  const roles = [...new Set(chip.dies.map((d) => d.role))] as DieInfo['role'][];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        {roles.map((r) => (
          <span key={r} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm border"
              style={{ backgroundColor: ROLE_COLORS[r].fill, borderColor: ROLE_COLORS[r].stroke }}
            />
            {ROLE_COLORS[r].label}
          </span>
        ))}
      </div>
      <p className="text-xs leading-5 text-slate-400">
        比例示意图，非实物照片；CPU 为移除散热顶盖后的剖视示意，Die 布局为近似拓扑。
        长宽缺失的 Die 按面积折算为正方形近似（标注 ~）。
      </p>
    </div>
  );
}

/** Die 明细列表（编号与示意图角标一致） */
export function DieBreakdown({ chip }: { chip: Chip }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
        Die 明细（编号对应示意图角标）
      </div>
      <ul className="divide-y divide-slate-100">
        {chip.dies.map((d, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium text-slate-800">{d.name}</span>
                <span className="text-xs text-slate-400">{ROLE_COLORS[d.role].label}</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-slate-500 sm:grid-cols-4">
                <span>面积：{fmtArea(d.areaMm2)}</span>
                <span className="font-bold text-red-600">长×宽：{fmtDieDims(d)}</span>
                <span>制程：{d.process ?? '暂无数据'}</span>
                <span>晶体管：{fmtTransistors(d.transistorsMillions)}</span>
              </div>
              {d.note && <div className="mt-1 text-xs text-slate-400">{d.note}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
