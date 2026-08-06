import { Link, useNavigate, useParams } from 'react-router-dom';
import { getLaptopById } from '../data/laptops';
import { stressTests } from '../data/stress-tests';
import { allChips } from '../data';
import type { Chip } from '../data/types';
import { LAPTOP_BRAND_LABELS, cpuPlatform, fmtDieDims } from '../data/types';
import { useFavorites } from '../hooks/useFavorites';

/** 从显卡方案字符串解析功耗，如 "RTX 4060 (140W)" → "140W" */
function parsePower(s: string): string | null {
  const m = s.match(/\((\d+)\s*W\)/i);
  return m ? `${m[1]} W` : null;
}

function normModel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** 匹配移动端 CPU 芯片（精确 → 直接包含 → 核心编号，命中多个时取最短型号） */
function matchCpu(query: string): Chip | undefined {
  const cpus = allChips.filter((c) => c.category === 'cpu' && c.formFactor === 'mobile');
  const q = normModel(query);
  if (q.length >= 4) {
    const exact = cpus.find((c) => normModel(c.model) === q);
    if (exact) return exact;
    const inc = cpus.find((c) => normModel(c.model).includes(q));
    if (inc) return inc;
  }
  // 提取核心型号标识：如 "i9-14900HX" → "14900hx"、"R7 7745HX" → "7745hx"（要求 ≥4 位数字避免误匹配）
  const core = query.toLowerCase().match(/(\d{4,}[a-z]*\s*hx|\d{4,})/i)?.[0]?.replace(/\s+/g, '');
  if (core) {
    const hits = cpus.filter((c) => normModel(c.model).includes(core));
    if (hits.length > 0) {
      return hits.sort((a, b) => normModel(a.model).length - normModel(b.model).length)[0];
    }
  }
  return undefined;
}

/** 匹配移动端 GPU 芯片（RTX/GTX/RX 编号提取） */
function matchGpu(query: string): Chip | undefined {
  const lower = query.toLowerCase();
  const m = lower.match(/(rtx\s*\d+)/) ?? lower.match(/(gtx\s*\d+)/) ?? lower.match(/(rx\s*\d+)/);
  if (!m) return undefined;
  const key = m[1].replace(/\s+/g, '');
  return allChips.find((c) => c.category === 'gpu' && c.formFactor === 'mobile' && normModel(c.model).includes(key));
}

/** 芯片 Die 长宽摘要（多 Die 显示首 Die + 总数） */
function dieDimsSummary(chip: Chip): string {
  if (chip.dies.length === 0) return '暂无数据';
  const first = fmtDieDims(chip.dies[0]);
  return chip.dies.length > 1 ? `${first}（共${chip.dies.length} Die）` : first;
}

export default function LaptopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const laptop = id ? getLaptopById(id) : undefined;
  const navigate = useNavigate();
  const { has: hasFav, toggle: toggleFav } = useFavorites();

  if (!laptop) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-slate-500">未找到该游戏本（id: {id}）</p>
        <Link to="/laptops" className="mt-3 inline-block text-blue-600 hover:underline">
          ← 返回游戏本列表
        </Link>
      </div>
    );
  }

  const inFav = hasFav(laptop.id);
  const year = laptop.release ? laptop.release.slice(0, 4) : '';
  const stress = stressTests[laptop.id];

  // 按平台分组 CPU 方案
  const intelCpus = laptop.cpuOptions.filter((c) => cpuPlatform(c) === 'intel');
  const amdCpus = laptop.cpuOptions.filter((c) => cpuPlatform(c) === 'amd');

  const specs: [string, string][] = [
    ['品牌', LAPTOP_BRAND_LABELS[laptop.brand]],
    ['系列', laptop.series],
    ['中文名称', laptop.displayName],
    ['型号', laptop.model],
    ['发布时间', laptop.release ?? '暂无数据'],
    ['内存', laptop.ram],
    ['硬盘', laptop.storage],
    ['屏幕', laptop.display],
  ];

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="inline-block text-sm text-slate-500 hover:text-blue-600"
      >
        ← 返回游戏本列表
      </button>

      {/* 标题区 */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          {laptop.displayName}
          {year && !laptop.displayName.includes(year) ? ` ${year}款` : ''}
        </h1>
        <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white">
          {LAPTOP_BRAND_LABELS[laptop.brand]}
        </span>
        <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600">
          {laptop.series}
        </span>
        <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600">
          {laptop.model}
        </span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => toggleFav(laptop.id)}
            className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition ${
              inFav
                ? 'border-red-500 bg-red-500 text-white hover:bg-red-600'
                : 'border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-600'
            }`}
          >
            {inFav ? '★ 已关注' : '☆ 关注'}
          </button>
        </div>
      </div>

      {/* 处理器方案 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
          处理器方案（共 {laptop.cpuOptions.length} 种）
        </div>
        <div className="p-4">
          {/* Intel 方案 */}
          {intelCpus.length > 0 && (
            <div className="mb-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">Intel</span>
                <span className="text-xs text-slate-400">{intelCpus.length} 种方案</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {intelCpus.map((cpu, i) => {
                  const chipInfo = matchCpu(cpu);
                  return (
                    <div key={i} className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{cpu}</span>
                        {chipInfo && (
                          <span className="shrink-0 rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-500">
                            Die 长×宽 {dieDimsSummary(chipInfo)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* AMD 方案 */}
          {amdCpus.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">AMD</span>
                <span className="text-xs text-slate-400">{amdCpus.length} 种方案</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {amdCpus.map((cpu, i) => {
                  const chipInfo = matchCpu(cpu);
                  return (
                    <div key={i} className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{cpu}</span>
                        {chipInfo && (
                          <span className="shrink-0 rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-500">
                            Die 长×宽 {dieDimsSummary(chipInfo)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 显卡方案 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
          显卡方案（共 {laptop.gpuOptions.length} 种）
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {laptop.gpuOptions.map((gpu, i) => {
              const power = parsePower(gpu);
              const chipInfo = matchGpu(gpu);
              return (
                <div key={i} className="rounded-lg border border-green-100 bg-green-50/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{gpu}</span>
                    {power && (
                      <span className="shrink-0 rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700">
                        {power}
                      </span>
                    )}
                  </div>
                  {chipInfo && (
                    <div className="mt-1 pl-8 text-[10px] text-slate-500">
                      Die 长×宽 {dieDimsSummary(chipInfo)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 基本规格表 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
          基本规格
        </div>
        <dl className="divide-y divide-slate-100">
          {specs.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[8.5rem_1fr] gap-4 px-4 py-2.5 text-sm">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* 烤机测试（v3 历史实测数据恢复；按型号匹配，部分机型无数据） */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
          烤机测试数据
        </div>
        {stress ? (
          <>
            <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="p-4">
                <div className="mb-2 text-xs font-medium text-slate-500">单烤 CPU</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">功耗</span><span className="text-slate-800">{stress.cpuPowerW != null ? `${stress.cpuPowerW} W` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">温度</span><span className="text-slate-800">{stress.cpuTempC != null ? `${stress.cpuTempC} °C` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">频率</span><span className="text-slate-800">{stress.cpuFreqGHz != null ? `${stress.cpuFreqGHz} GHz` : '暂无'}</span></div>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-2 text-xs font-medium text-slate-500">单烤 GPU</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">功耗</span><span className="text-slate-800">{stress.gpuPowerW != null ? `${stress.gpuPowerW} W` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">温度</span><span className="text-slate-800">{stress.gpuTempC != null ? `${stress.gpuTempC} °C` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">频率</span><span className="text-slate-800">{stress.gpuFreqMHz != null ? `${stress.gpuFreqMHz} MHz` : '暂无'}</span></div>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-2 text-xs font-medium text-slate-500">双烤</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">CPU 功耗</span><span className="text-slate-800">{stress.dualCpuPowerW != null ? `${stress.dualCpuPowerW} W` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">GPU 功耗</span><span className="text-slate-800">{stress.dualGpuPowerW != null ? `${stress.dualGpuPowerW} W` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">CPU 温度</span><span className="text-slate-800">{stress.dualCpuTempC != null ? `${stress.dualCpuTempC} °C` : '暂无'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">GPU 温度</span><span className="text-slate-800">{stress.dualGpuTempC != null ? `${stress.dualGpuTempC} °C` : '暂无'}</span></div>
                </div>
              </div>
            </div>
            {stress.note && (
              <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">{stress.note}</div>
            )}
          </>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            暂无该机型的第三方烤机实测数据（数据来源：笔吧评测室等评测，当前已收录 92 款热门机型的单烤/双烤数据）
          </p>
        )}
      </div>

      {/* 来源 */}
      {laptop.sources.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-slate-700">数据来源 / 购买参考</div>
          <ul className="space-y-1 text-sm">
            {laptop.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
