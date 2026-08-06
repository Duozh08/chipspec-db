import { Link, useNavigate, useParams } from 'react-router-dom';
import { getChipById, allChips } from '../data';
import { BRAND_LABELS, CATEGORY_LABELS, FORM_FACTOR_LABELS, fmtArea, totalDieArea, fmtTdp } from '../data/types';
import ChipDiagram from '../components/ChipDiagram';
import SpecTable from '../components/SpecTable';
import { DataQualityBadge, DiagramLegend, DieBreakdown } from '../components/DiagramLegend';
import { useCompare } from '../context/CompareContext';
import { useFavorites } from '../hooks/useFavorites';

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const chip = id ? getChipById(id) : undefined;
  const { add, remove, has, isFull } = useCompare();
  const { has: hasFav, toggle: toggleFav } = useFavorites();
  const navigate = useNavigate();

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
  const inFav = hasFav(chip.id);
  const dieArea = totalDieArea(chip);
  const pkgArea = chip.package.lengthMm && chip.package.widthMm
    ? Math.round(chip.package.lengthMm * chip.package.widthMm * 10) / 10
    : null;

  // 同代际芯片；若无，则取同品牌芯片作为兜底
  const siblings = allChips
    .filter((c) => c.generation === chip.generation && c.id !== chip.id)
    .slice(0, 5);
  const related = siblings.length > 0
    ? siblings
    : allChips.filter((c) => c.brand === chip.brand && c.id !== chip.id).slice(0, 5);
  const relatedTitle = siblings.length > 0 ? '同代际芯片' : '同品牌芯片';

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="inline-block text-sm text-slate-500 hover:text-blue-600"
      >
        ← 返回芯片列表
      </button>

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
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleFav(chip.id)}
            className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition ${
              inFav
                ? 'border-red-500 bg-red-500 text-white hover:bg-red-600'
                : 'border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-600'
            }`}
          >
            {inFav ? '★ 已关注' : '☆ 关注'}
          </button>
          <button
            type="button"
            onClick={() => (inCompare ? remove(chip.id) : add(chip.id))}
            disabled={!inCompare && isFull}
            className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition ${
              inCompare
                ? 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600'
                : 'border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40'
            }`}
          >
            {inCompare ? '✓ 已加入对比' : '+ 加入对比'}
          </button>
        </div>
      </div>

      {/* 示意图 + 规格表（两列底部对齐） */}
      <div className="grid items-stretch gap-5 lg:grid-cols-[auto_1fr]">
        {/* 左列：示意图 + 图例 + 速览 */}
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <ChipDiagram chip={chip} variant="full" unified />
          </div>
          <DiagramLegend chip={chip} />

          {/* 关键参数速览（flex-1 撑满左列，与右列底部对齐） */}
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-slate-700">关键参数速览</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">制程工艺</div>
                <div className="mt-0.5 text-sm font-medium text-slate-800">{chip.process}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">TDP 功耗</div>
                <div className="mt-0.5 text-sm font-medium text-slate-800">{fmtTdp(chip.tdp)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Die 数量</div>
                <div className="mt-0.5 text-sm font-medium text-slate-800">{chip.dies.length} 个</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Die 总面积</div>
                <div className="mt-0.5 text-sm font-medium text-slate-800">{fmtArea(dieArea)}</div>
              </div>
              {pkgArea != null && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">封装面积</div>
                  <div className="mt-0.5 text-sm font-medium text-slate-800">{pkgArea} mm²</div>
                </div>
              )}
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">满载温度</div>
                <div className="mt-0.5 text-sm font-medium text-slate-800">{chip.loadTempRange ?? '暂无数据'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 右列：规格表 + 解读 */}
        <div className="flex min-w-0 flex-col gap-5">
          <SpecTable chip={chip} />

          {/* 规格解读：条形速览 + 标签（flex-1 撑满右列） */}
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-slate-700">规格解读</div>
            <div className="space-y-2.5">
              {(() => {
                // 温度范围解析："70-85°C" → 显示原文，条宽取中间值
                const parseTemp = (s: string): { display: string; mid: number | null } => {
                  const nums = s.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
                  if (nums.length === 0) return { display: s, mid: null };
                  return { display: s, mid: (Math.min(...nums) + Math.max(...nums)) / 2 };
                };
                const temp = chip.loadTempRange ? parseTemp(chip.loadTempRange) : null;
                const transB = chip.transistorsMillions != null ? chip.transistorsMillions / 1000 : null;

                const bars: { label: string; display: string; barValue: number | null; max: number; color: string }[] = [
                  { label: 'TDP 功耗', display: chip.tdp != null ? `${chip.tdp} W` : '暂无数据', barValue: chip.tdp, max: 250, color: 'bg-amber-500' },
                  { label: 'Die 总面积', display: dieArea != null ? `${dieArea} mm²` : '暂无数据', barValue: dieArea, max: 800, color: 'bg-blue-500' },
                  { label: '晶体管总数', display: transB != null ? `${Math.round(transB * 10) / 10} B` : '暂无数据', barValue: transB, max: 100, color: 'bg-indigo-500' },
                  { label: '满载温度', display: temp?.display ?? '暂无数据', barValue: temp?.mid ?? null, max: 110, color: 'bg-red-500' },
                ];
                return bars.map((b) => {
                  const pct = b.barValue == null ? 0 : Math.min(100, Math.max(2, (b.barValue / b.max) * 100));
                  return (
                    <div key={b.label}>
                      <div className="mb-1 flex items-baseline justify-between text-xs">
                        <span className="text-slate-500">{b.label}</span>
                        <span className="font-medium text-slate-700">{b.display}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${b.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {[chip.codename, chip.process, chip.package.type, chip.generation, chip.dataQuality].filter(Boolean).map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Die 明细 + 同代际/同品牌芯片（与上方同列宽，左右边界对齐） */}
      <div className="grid items-stretch gap-5 lg:grid-cols-[auto_1fr]">
        <DieBreakdown chip={chip} />
        {related.length > 0 && (
          <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
              {relatedTitle}
            </div>
            <div className="flex-1 space-y-2 p-4">
              {related.map((s) => (
                <Link
                  key={s.id}
                  to={`/chip/${s.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="truncate font-medium text-slate-700">{s.model}</span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {s.formFactor === 'desktop' ? '桌面' : '移动'} · {s.dies.length} Die
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 数据来源 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">数据来源</div>
        {chip.sources.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {chip.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">数据整理自公开来源（Intel ARK / AMD 官方 / WikiChip 等）</p>
        )}
        <p className="mt-3 text-xs leading-5 text-slate-400">
          说明：芯片封装/Die 尺寸部分来自第三方开盖实测或估算，可能与官方数据存在出入；标注"暂无数据"的字段表示暂无可靠公开来源。
        </p>
      </div>
    </div>
  );
}
