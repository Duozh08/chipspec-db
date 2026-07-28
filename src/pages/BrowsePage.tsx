import { useSearchParams } from 'react-router-dom';
import ChipCard from '../components/ChipCard';
import FilterBar, { parseBrand, parseCategory, parseFormFactor } from '../components/FilterBar';
import { useChipFilters } from '../hooks/useChipFilters';

export default function BrowsePage() {
  const [searchParams] = useSearchParams();
  const chips = useChipFilters({
    brand: parseBrand(searchParams.get('brand')),
    category: parseCategory(searchParams.get('cat')),
    formFactor: parseFormFactor(searchParams.get('ff')),
    generation: searchParams.get('gen'),
    query: searchParams.get('q') ?? '',
  });

  return (
    <div className="space-y-4">
      <FilterBar count={chips.length} />
      {chips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
          没有符合条件的芯片，试试放宽筛选条件
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {chips.map((c) => (
            <ChipCard key={c.id} chip={c} />
          ))}
        </div>
      )}
    </div>
  );
}
