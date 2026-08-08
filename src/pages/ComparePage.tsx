import { Link, useSearchParams } from 'react-router-dom';
import { getChipById } from '../data';
import type { Chip } from '../data/types';
import ChipDiagram from '../components/ChipDiagram';
import { SPEC_ROWS } from '../components/SpecTable';
import { DataQualityBadge } from '../components/DiagramLegend';
import { useCompare } from '../context/CompareContext';
import { loadLocalChips } from '../utils/localCatalog';

const COMPARE_SCALE = 8; // 所有示意图共享同一比例尺（1mm = 8px）

export default function ComparePage() {
  const [searchParams] = useSearchParams();
  const { remove } = useCompare();
  const ids = (searchParams.get('ids') ?? '').split(',').filter(Boolean);
  // 站内静态库 + 本地 AI 收录库（本地芯片也能加入对比）
  const localChips = loadLocalChips();
  const chips = ids
    .map((id) => getChipById(id) ?? localChips.find((c) => c.id === id))
    .filter((c): c is Chip => c != null);

  if (chips.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-slate-500">对比至少需要 2 颗芯片</p>
        <Link to="/" className="mt-3 inline-block text-blue-600 hover:underline">
          ← 返回列表选择芯片
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">芯片对比（{chips.length}）</h1>
        <span className="text-sm text-slate-400">示意图使用相同比例尺（1 mm = {COMPARE_SCALE} px），大小差异即真实差异</span>
        <Link to="/" className="ml-auto text-sm text-slate-500 hover:text-blue-600">
          ← 返回列表
        </Link>
      </div>

      {/* 示意图对比（同一比例尺，横向可滚动） */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-max items-end gap-8">
          {chips.map((c) => (
            <div key={c.id} className="flex flex-col items-center gap-2">
              <ChipDiagram chip={c} variant="full" scale={COMPARE_SCALE} />
              <Link to={`/chip/${c.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                {c.model}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* 规格对比表 */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-600">规格项</th>
              {chips.map((c) => (
                <th key={c.id} className="min-w-44 border-l border-slate-100 px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <Link to={`/chip/${c.id}`} className="font-semibold text-slate-800 hover:text-blue-600">
                      {c.model}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="text-slate-300 hover:text-slate-500"
                      aria-label={`移除 ${c.model}`}
                      title="从对比中移除"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-1">
                    <DataQualityBadge quality={c.dataQuality} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SPEC_ROWS.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                <td className="sticky left-0 border-t border-slate-100 bg-inherit px-4 py-2.5 font-medium text-slate-500">
                  {row.label}
                </td>
                {chips.map((c) => (
                  <td key={c.id} className="border-l border-t border-slate-100 px-4 py-2.5 align-top text-slate-800">
                    {row.value(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
