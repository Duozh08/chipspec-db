import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { allLaptops } from '../data/laptops';
import { LAPTOP_BRAND_LABELS, cpuPlatform } from '../data/types';
import type { LaptopBrand } from '../data/types';
import { sortByYearThenFavorites, isFavorited } from '../hooks/useFavorites';

const BRAND_OPTIONS: { value: LaptopBrand | ''; label: string }[] = [
  { value: '', label: '全部品牌' },
  ...Object.entries(LAPTOP_BRAND_LABELS).map(([value, label]) => ({
    value: value as LaptopBrand,
    label,
  })),
];

const YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部年份' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
  { value: '2020', label: '2020' },
];

function getYear(release: string | null): string {
  if (!release) return '';
  const y = release.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : '';
}

/** 从 displayName 中提取品牌+子品牌+系列+年份，格式如 "联想-拯救者-Y9000P-2021款" */
function formatCardTitle(laptop: { brand: LaptopBrand; displayName: string; release: string | null }): string {
  const brandLabel = LAPTOP_BRAND_LABELS[laptop.brand]?.split(' ')[0] ?? laptop.brand;
  const year = getYear(laptop.release);
  // displayName 若已含年份（历史数据兜底），不再重复追加
  const nameHasYear = year ? laptop.displayName.includes(year) : false;
  return `${brandLabel}-${laptop.displayName}${year && !nameHasYear ? `-${year}款` : ''}`;
}

/** 获取CPU方案平台标签 */
function getCpuPlatformLabel(cpuOptions: string[]): string {
  const platforms = new Set(cpuOptions.map(cpuPlatform));
  if (platforms.has('intel') && platforms.has('amd')) return 'Intel/AMD';
  if (platforms.has('amd')) return 'AMD';
  return 'Intel';
}

/** GPU 色块：NVIDIA 绿 / AMD 红 / Intel Arc 蓝 */
function gpuColor(gpu: string): string {
  const s = gpu.toUpperCase();
  if (s.includes('RTX') || s.includes('GTX')) return 'bg-lime-500';
  if (s.includes('RX') || s.includes('RADEON')) return 'bg-red-500';
  if (s.includes('ARC') || s.includes('INTEL')) return 'bg-blue-500';
  return 'bg-slate-400';
}

/** CPU 色块：Intel 蓝 / AMD 红 */
function cpuColor(cpu: string): string {
  return cpuPlatform(cpu) === 'amd' ? 'bg-red-500' : 'bg-blue-500';
}

export default function LaptopListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlBrand = (searchParams.get('brand') as LaptopBrand) || '';
  const urlYear = searchParams.get('year') ?? '';
  const urlQuery = searchParams.get('q') ?? '';

  const [pendingBrand, setPendingBrand] = useState<LaptopBrand | ''>(urlBrand);
  const [pendingYear, setPendingYear] = useState(urlYear);
  const [pendingQuery, setPendingQuery] = useState(urlQuery);

  const filtered = useMemo(() => {
    const q = urlQuery.trim().toLowerCase();
    const result = allLaptops.filter((l) => {
      if (urlBrand && l.brand !== urlBrand) return false;
      if (urlYear) {
        const y = getYear(l.release);
        if (y !== urlYear) return false;
      }
      if (q) {
        const haystack = `${l.brand} ${l.displayName} ${l.series} ${l.model} ${l.cpuOptions.join(' ')} ${l.gpuOptions.join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    // 按发布年份由近到远排序，关注项置顶
    return sortByYearThenFavorites(result);
  }, [urlBrand, urlYear, urlQuery]);

  const apply = () => {
    const next = new URLSearchParams();
    if (pendingBrand) next.set('brand', pendingBrand);
    if (pendingYear) next.set('year', pendingYear);
    if (pendingQuery.trim()) next.set('q', pendingQuery.trim());
    setSearchParams(next, { replace: true });
  };

  const reset = () => {
    setPendingBrand('');
    setPendingYear('');
    setPendingQuery('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  return (
    <div className="space-y-4">
      <Link
        to="/"
        className="inline-block text-sm text-slate-500 hover:text-blue-600"
      >
        ← 返回首页
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">游戏本配置查询</h1>
        <p className="mt-1 text-sm text-slate-500">收录联想、华硕、惠普、戴尔、宏碁、微星、雷蛇、七彩虹、机械革命、神舟、技嘉、华为、荣耀、机械师、雷神等品牌游戏本。</p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <select
          className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-2.5 pr-7 text-sm text-slate-700 outline-none focus:border-blue-400"
          value={pendingBrand}
          onChange={(e) => setPendingBrand(e.target.value as LaptopBrand | '')}
        >
          {BRAND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-2.5 pr-7 text-sm text-slate-700 outline-none focus:border-blue-400"
          value={pendingYear}
          onChange={(e) => setPendingYear(e.target.value)}
        >
          {YEAR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <form
          className="flex min-w-44 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <input
            type="search"
            className="w-full min-w-0 flex-1 rounded-l-lg border border-r-0 border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 [&::-webkit-search-cancel-button]:hidden"
            placeholder="搜索型号 / CPU / GPU…"
            value={pendingQuery}
            onChange={(e) => setPendingQuery(e.target.value)}
          />
          <button
            type="submit"
            className="shrink-0 rounded-r-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800"
          >
            搜索
          </button>
        </form>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
        >
          重置
        </button>
        <span className="text-sm text-slate-400">共 {filtered.length} 款</span>
      </div>

      {/* List — 两列卡片 */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
          没有符合条件的游戏本
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((laptop) => {
            const title = formatCardTitle(laptop);
            const cpuLabel = getCpuPlatformLabel(laptop.cpuOptions);
            const inFav = isFavorited(laptop.id);
            return (
              <Link
                key={laptop.id}
                to={`/laptop/${laptop.id}`}
                className="group relative flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                {inFav && (
                  <span
                    className="absolute right-2 top-2 z-10 text-lg leading-none text-yellow-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
                    title="已关注"
                    aria-label="已关注"
                  >
                    ★
                  </span>
                )}
                {/* 左下角：笔记本图片 */}
                <div className="flex w-32 shrink-0 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                  <svg viewBox="0 0 120 100" className="h-20 w-24 text-slate-400 group-hover:text-blue-400" fill="none" stroke="currentColor">
                    {/* 笔记本屏幕 */}
                    <rect x="15" y="10" width="90" height="55" rx="3" strokeWidth="2" />
                    <rect x="20" y="15" width="80" height="45" rx="1" strokeWidth="1" opacity="0.4" />
                    {/* 笔记本底座 */}
                    <path d="M8 72 L112 72 L108 82 L12 82 Z" strokeWidth="2" strokeLinejoin="round" />
                    {/* 触控板 */}
                    <line x1="55" y1="77" x2="65" y2="77" strokeWidth="1.5" />
                  </svg>
                </div>

                {/* 右侧内容区 */}
                <div className="flex min-w-0 flex-1 flex-col p-3">
                  {/* 左上角：名称型号 */}
                  <div className="pr-5">
                    <h3 className="text-sm font-semibold leading-tight text-slate-800 group-hover:text-blue-600">
                      {title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">{laptop.model}</p>
                  </div>

                  {/* 右上角：CPU平台 */}
                  <div className="mt-1 flex items-center justify-end">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      cpuLabel === 'AMD' ? 'bg-red-50 text-red-600' :
                      cpuLabel === 'Intel/AMD' ? 'bg-purple-50 text-purple-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {cpuLabel}
                    </span>
                  </div>

                  {/* 方案明细：全部 CPU / GPU 型号 + 色块 */}
                  <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                    <div className="flex items-start gap-2">
                      <span className="w-10 shrink-0 pt-0.5 text-[11px] text-slate-400">显卡</span>
                      <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-1">
                        {laptop.gpuOptions.map((gpu, i) => (
                          <span
                            key={i}
                            className="inline-flex max-w-full items-center gap-1 rounded border border-slate-100 bg-white px-1.5 py-0.5 text-[11px] text-slate-600"
                          >
                            <span className={`h-2 w-2 shrink-0 rounded-full ${gpuColor(gpu)}`} />
                            <span className="truncate">{gpu}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-10 shrink-0 pt-0.5 text-[11px] text-slate-400">CPU</span>
                      <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-1">
                        {laptop.cpuOptions.map((cpu, i) => (
                          <span
                            key={i}
                            className="inline-flex max-w-full items-center gap-1 rounded border border-slate-100 bg-white px-1.5 py-0.5 text-[11px] text-slate-600"
                          >
                            <span className={`h-2 w-2 shrink-0 rounded-full ${cpuColor(cpu)}`} />
                            <span className="truncate">{cpu}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
