import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChipCard from '../components/ChipCard';
import FilterBar, { parseBrand, parseCategory, parseFormFactor } from '../components/FilterBar';
import ScrollTopButton from '../components/ScrollTopButton';
import NewCatalogSection from '../components/NewCatalogSection';
import { useChipFilters } from '../hooks/useChipFilters';
import { sortByYearThenFavorites } from '../hooks/useFavorites';
import { useLocalCatalogItems } from '../hooks/useLocalCatalogItems';
import { localItemToChip, isLocalId } from '../utils/localCatalog';

export default function BrowsePage() {
  const [searchParams] = useSearchParams();
  const chips = useChipFilters({
    brand: parseBrand(searchParams.get('brand')),
    category: parseCategory(searchParams.get('cat')),
    formFactor: parseFormFactor(searchParams.get('ff')),
    generation: searchParams.get('gen'),
    query: searchParams.get('q') ?? '',
  });

  // 本地 AI 收录芯片：同步并入正常列表（新收录的 release=收录日期，排序在最前）
  const localItems = useLocalCatalogItems('chip');
  const localChips = useMemo(() => localItems.map(localItemToChip), [localItems]);

  // 按发布年份由近到远排序，关注项置顶（本地收录按收录时间排最前）
  const sorted = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...localChips, ...chips].filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    return sortByYearThenFavorites(merged);
  }, [chips, localChips]);

  return (
    <div className="space-y-4">
      <NewCatalogSection category="chip" />
      <FilterBar count={sorted.length} />
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
          没有符合条件的芯片，试试放宽筛选条件
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sorted.map((c) => (
            <ChipCard key={c.id} chip={c} isAiCollected={isLocalId(c.id)} />
          ))}
        </div>
      )}
      <ScrollTopButton />
    </div>
  );
}
