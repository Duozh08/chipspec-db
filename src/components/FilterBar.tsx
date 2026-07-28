import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generationsFor } from '../data';
import type { Brand, Category, FormFactor } from '../data/types';

const BRAND_OPTIONS: { value: Brand | ''; label: string }[] = [
  { value: '', label: '全部品牌' },
  { value: 'intel', label: 'Intel' },
  { value: 'amd', label: 'AMD' },
  { value: 'nvidia', label: 'NVIDIA' },
];

const CATEGORY_OPTIONS: { value: Category | ''; label: string }[] = [
  { value: '', label: '全部类别' },
  { value: 'cpu', label: '处理器 CPU' },
  { value: 'gpu', label: '显卡 GPU' },
];

const FORM_FACTOR_OPTIONS: { value: FormFactor | ''; label: string }[] = [
  { value: '', label: '全部形态' },
  { value: 'desktop', label: '桌面端' },
  { value: 'mobile', label: '移动端' },
];

export function parseBrand(v: string | null): Brand | null {
  return v === 'intel' || v === 'amd' || v === 'nvidia' ? v : null;
}
export function parseCategory(v: string | null): Category | null {
  return v === 'cpu' || v === 'gpu' ? v : null;
}
export function parseFormFactor(v: string | null): FormFactor | null {
  return v === 'desktop' || v === 'mobile' ? v : null;
}

function SelectArrow() {
  return (
    <svg
      className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const selectCls =
  'w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-2.5 pr-7 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

export default function FilterBar({ count }: { count: number }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial values from URL params
  const initBrand = parseBrand(searchParams.get('brand'));
  const initCat = parseCategory(searchParams.get('cat'));
  const initFF = parseFormFactor(searchParams.get('ff'));
  const initGen = searchParams.get('gen');
  const initQ = searchParams.get('q') ?? '';

  // Local state for inputs (not yet applied)
  const [brand, setBrand] = useState<Brand | ''>(initBrand ?? '');
  const [category, setCategory] = useState<Category | ''>(initCat ?? '');
  const [formFactor, setFormFactor] = useState<FormFactor | ''>(initFF ?? '');
  const [generation, setGeneration] = useState<string>(initGen ?? '');
  const [query, setQuery] = useState(initQ);

  const generations = useMemo(
    () => generationsFor(brand || null, category || null),
    [brand, category],
  );

  /** Commit all filters to URL at once */
  const apply = () => {
    const next = new URLSearchParams();
    if (brand) next.set('brand', brand);
    if (category) next.set('cat', category);
    if (formFactor) next.set('ff', formFactor);
    if (generation) next.set('gen', generation);
    if (query.trim()) next.set('q', query.trim());
    setSearchParams(next, { replace: true });
  };

  /** Reset all filters */
  const reset = () => {
    setBrand('');
    setCategory('');
    setFormFactor('');
    setGeneration('');
    setQuery('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <select
            className={selectCls}
            value={brand}
            onChange={(e) => {
              const v = e.target.value as Brand | '';
              setBrand(v);
              setGeneration('');
            }}
            aria-label="品牌"
          >
            {BRAND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <SelectArrow />
        </div>
        <div className="relative">
          <select
            className={selectCls}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as Category | '');
              setGeneration('');
            }}
            aria-label="类别"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <SelectArrow />
        </div>
        <div className="relative">
          <select
            className={selectCls}
            value={formFactor}
            onChange={(e) => setFormFactor(e.target.value as FormFactor | '')}
            aria-label="形态"
          >
            {FORM_FACTOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <SelectArrow />
        </div>
        <div className="relative">
          <select
            className={selectCls}
            value={generation}
            onChange={(e) => setGeneration(e.target.value)}
            aria-label="代际"
          >
            <option value="">全部代际</option>
            {generations.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <SelectArrow />
        </div>
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
            placeholder="搜索型号 / 核心代号…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索"
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
        <span className="ml-auto text-sm text-slate-400">共 {count} 颗</span>
      </div>
    </div>
  );
}
