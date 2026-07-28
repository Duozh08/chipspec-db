import { Link, useParams } from 'react-router-dom';
import { getChipById } from '../data';
import { BRAND_LABELS, CATEGORY_LABELS, FORM_FACTOR_LABELS } from '../data/types';
import ChipDiagram from '../components/ChipDiagram';
import SpecTable from '../components/SpecTable';
import { DataQualityBadge, DiagramLegend, DieBreakdown } from '../components/DiagramLegend';
import { useCompare } from '../context/CompareContext';

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const chip = id ? getChipById(id) : undefined;
  const { add, remove, has, isFull } = useCompare();

  if (!chip) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-slate-500">未找到该芯片（id: {id}）</p>
        <Link to="/browse" className="mt-3 inline-block text-blue-600 hover:underline">
          ← 返回芯片列表
        </Link>
      </div>
    );
  }

  const inCompare = has(chip.id);

  return (
    <div className="space-y-5">
      <Link to="/browse" className="inline-block text-sm text-slate-500 hover:text-blue-600">
        ← 返回芯片列表
      </Link>

      {/* 标题区 */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{chip.model}</h1>
        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-white">
          {BRAND_LABELS[chip.brand]}
        </span>
        <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600">
          {CATEGORY_LABELS[chip.category]}
        </span>
        <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600">{chip.generation}</span>
        <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600">
          {FORM_FACTOR_LABELS[chip.formFactor]}
        </span>
        {chip.tdp != null && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            TDP {chip.tdp}W
          </span>
        )}
        {chip.loadTempRange && (
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
            {chip.loadTempRange}
          </span>
        )}
        <DataQualityBadge quality={chip.dataQuality} />
        <button
          type="button"
          onClick={() => (inCompare ? remove(chip.id) : add(chip.id))}
          disabled={!inCompare && isFull}
          className={`ml-auto rounded-lg border px-3.5 py-1.5 text-sm font-medium transition ${
            inCompare
              ? 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600'
              : 'border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40'
          }`}
        >
          {inCompare ? '✓ 已加入对比' : '+ 加入对比'}
        </button>
      </div>

      {/* 示意图 + 规格表 */}
      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <ChipDiagram chip={chip} variant="full" />
          </div>
          <DiagramLegend chip={chip} />
        </div>
        <div className="min-w-0">
          <SpecTable chip={chip} />
        </div>
      </div>

      {/* Die 明细 */}
      <DieBreakdown chip={chip} />

      {/* 数据来源 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">数据来源</div>
        <ul className="space-y-1 text-sm">
          {chip.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                {s.label} ↗
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-5 text-slate-400">
          说明：芯片封装/Die 尺寸部分来自第三方开盖实测或估算，可能与官方数据存在出入；标注"暂无数据"的字段表示暂无可靠公开来源。
        </p>
      </div>
    </div>
  );
}
