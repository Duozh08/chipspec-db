import { useSearchParams } from 'react-router-dom';
import ChipCard from '../components/ChipCard';
import FilterBar, { parseBrand, parseCategory, parseFormFactor } from '../components/FilterBar';
import ScrollTopButton from '../components/ScrollTopButton';
import NewCatalogSection from '../components/NewCatalogSection';
import { useChipFilters } from '../hooks/useChipFilters';
import { sortByYearThenFavorites } from '../hooks/useFavorites';

export default function BrowsePage() {
  const [searchParams] = useSearchParams();
  const chips = useChipFilters({
    brand: parseBrand(searchParams.get('brand')),
    category: parseCategory(searchParams.get('cat')),
    formFactor: parseFormFactor(searchParams.get('ff')),
    generation: searchParams.get('gen'),
    query: searchParams.get('q') ?? '',
  });

  // 按发布年份由近到远排序，关注项置顶
  const sorted = sortByYearThenFavorites(chips);

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
            <ChipCard key={c.id} chip={c} />
          ))}
        </div>
      )}
      <ScrollTopButton />
    </div>
  );
}
