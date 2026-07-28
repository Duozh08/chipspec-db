import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { allLaptops } from '../data/laptops';
import { LAPTOP_BRAND_LABELS } from '../data/types';
import type { LaptopBrand } from '../data/types';

const BRAND_OPTIONS: { value: LaptopBrand | ''; label: string }[] = [
  { value: '', label: '全部品牌' },
  ...Object.entries(LAPTOP_BRAND_LABELS).map(([value, label]) => ({
    value: value as LaptopBrand,
    label,
  })),
];

const YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部年份' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
];

function getYear(release: string | null): string {
  if (!release) return '';
  const y = release.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : '';
}

export default function LaptopListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read active filters from URL
  const urlBrand = (searchParams.get('brand') as LaptopBrand) || '';
  const urlYear = searchParams.get('year') ?? '';
  const urlQuery = searchParams.get('q') ?? '';

  // Pending filter inputs (initialized from URL)
  const [pendingBrand, setPendingBrand] = useState<LaptopBrand | ''>(urlBrand);
  const [pendingYear, setPendingYear] = useState(urlYear);
  const [pendingQuery, setPendingQuery] = useState(urlQuery);

  const filtered = useMemo(() => {
    const q = urlQuery.trim().toLowerCase();
    return allLaptops.filter((l) => {
      if (urlBrand && l.brand !== urlBrand) return false;
      if (urlYear) {
        const y = getYear(l.release);
        if (y !== urlYear) return false;
      }
      if (q) {
        const haystack = `${l.brand} ${l.displayName ?? ''} ${l.series} ${l.model} ${l.cpu} ${l.gpu}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
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
        <p className="mt-1 text-sm text-slate-500">收录联想、华硕、惠普、外星人、宏碁、微星、雷蛇、七彩虹、机械革命 9 大品牌主流游戏本。</p>
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

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
          没有符合条件的游戏本
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((laptop) => {
            const year = getYear(laptop.release);
            const title = `${laptop.displayName || laptop.series}${year ? ` ${year}款` : ''}`;
            return (
              <Link
                key={laptop.id}
                to={`/laptop/${laptop.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-medium text-blue-600">
                      {LAPTOP_BRAND_LABELS[laptop.brand]}
                    </span>
                    <h3 className="mt-1 font-semibold text-slate-800">{title}</h3>
                  </div>
                  {laptop.priceCny && (
                    <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      ¥{laptop.priceCny.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">{laptop.model}</p>
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <div>🖥 {laptop.cpu}</div>
                  <div>🎮 {laptop.gpu}</div>
                  <div>📺 {laptop.display}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
