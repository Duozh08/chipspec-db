import { Link } from 'react-router-dom';
import type { Chip } from '../data/types';
import { BRAND_LABELS, fmtArea, totalDieArea } from '../data/types';
import ChipPhoto from './ChipPhoto';
import { useCompare } from '../context/CompareContext';

const BRAND_STYLES: Record<Chip['brand'], string> = {
  intel: 'bg-blue-50 text-blue-700 border-blue-200',
  amd: 'bg-red-50 text-red-700 border-red-200',
  nvidia: 'bg-lime-50 text-lime-800 border-lime-200',
};

export default function ChipCard({ chip }: { chip: Chip }) {
  const { add, remove, has, isFull } = useCompare();
  const inCompare = has(chip.id);
  const area = totalDieArea(chip);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <Link to={`/chip/${chip.id}`} className="block bg-gradient-to-b from-slate-50 to-white px-4 pt-4">
        <div className="mx-auto flex h-36 items-center justify-center overflow-hidden">
          <ChipPhoto chip={chip} className="h-full w-auto max-w-full" />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-3 pt-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${BRAND_STYLES[chip.brand]}`}>
            {BRAND_LABELS[chip.brand]}
          </span>
          <span className="text-[11px] text-slate-400">{chip.generation}</span>
        </div>
        <Link to={`/chip/${chip.id}`} className="text-[15px] font-semibold leading-6 text-slate-800 group-hover:text-blue-600">
          {chip.model}
        </Link>
        <div className="text-xs text-slate-500">{chip.codename}</div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            Die {chip.dies.length} 个 · {fmtArea(area)}
          </span>
          <button
            type="button"
            onClick={() => (inCompare ? remove(chip.id) : add(chip.id))}
            disabled={!inCompare && isFull}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              inCompare
                ? 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600'
                : 'border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40'
            }`}
            title={!inCompare && isFull ? '最多对比 4 颗' : undefined}
          >
            {inCompare ? '✓ 已加入' : '+ 对比'}
          </button>
        </div>
      </div>
    </div>
  );
}
